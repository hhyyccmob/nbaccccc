import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const outDir=new URL('../outputs/nba-draft-lab/dist/',root);
const roster=JSON.parse(await fs.readFile(new URL('active-rosters-2026-27.json',root),'utf8'));
const statCache=JSON.parse(await fs.readFile(new URL('all-player-stats-2026-27.json',root),'utf8'));
const active=JSON.parse(await fs.readFile(new URL('active-player-stats-2026-27.json',root),'utf8'));
const standings=JSON.parse(await fs.readFile(new URL('team-standings-2026-27.json',root),'utf8'));
const n=v=>parseFloat(v)||0;
const threeOf=s=>n(s['avgThreePointFieldGoalsMade-avgThreePointFieldGoalsAttempted']?.split('-')[0]);
const posBaseline={PG:0,SG:0,SF:2,PF:4,C:5};
const rebFactor={PG:5.5,SG:5.5,SF:5.8,PF:5.8,C:6};
const specs={off:[93,6],def:[84,7],shoot:[73,14],pass:[81,9],reb:[79,10]};

function rawRatings(stats,pos){
  const s=stats,t=threeOf(s);
  return {
    off:n(s.avgPoints)*1.02+(n(s.fieldGoalPct)-45)*.65+t*1.4+(n(s.freeThrowPct)-70)*.12,
    def:n(s.avgSteals)*(pos==='C'?6:11)+n(s.avgBlocks)*12+(n(s.avgRebounds)-(posBaseline[pos]??0))*2.2+(n(s.avgRebounds)>=10?5:0)+(n(s.avgBlocks)>=1.8?6:0)+(pos==='C'?4:0)+(pos==='PF'?2:0),
    shoot:(n(s.threePointFieldGoalPct)-33)*1.5+t*5+(n(s.freeThrowPct)-75)*.25+(n(s.avgPoints)-15)*.35,
    pass:n(s.avgAssists)*4.3,
    reb:n(s.avgRebounds)*(rebFactor[pos]||5.8)
  };
}

// Use the existing 80-player pool as the calibration sample, so derived ratings stay on the same scale.
const sampleRaw={off:[],def:[],shoot:[],pass:[],reb:[]};
for(const e of active.entries){const r=rawRatings(e.stats,e.pos);for(const k of Object.keys(sampleRaw))sampleRaw[k].push(r[k]);}
const calibration={};
for(const [k,arr] of Object.entries(sampleRaw)){
  const mean=arr.reduce((a,b)=>a+b,0)/arr.length;
  const sd=Math.sqrt(arr.reduce((s,x)=>s+(x-mean)**2,0)/arr.length);
  const [targetMean,targetSd]=specs[k];
  calibration[k]={mean,sd,targetMean,targetSd};
}
function derivedRatings(stats,pos){
  const raw=rawRatings(stats,pos),r={};
  for(const k of Object.keys(specs)){
    const c=calibration[k];
    r[k]=Math.max(20,Math.min(99,Math.round(c.targetMean+c.targetSd*(raw[k]-c.mean)/c.sd)));
  }
  r.ovr=Math.round(r.off*.42+r.def*.29+Math.max(r.shoot,r.pass,r.reb)*.29);
  return r;
}
const inches=h=>{const m=/^(\d+)'\s*(\d+)"/.exec(h||'');return m?+m[1]*12+ +m[2]:0;};
function splitPosition(p){if(p.pos==='C')return 'C';if(p.pos==='G')return 'PG';return inches(p.height)>=81?'PF':'SF';}
const activeBy=new Map(active.entries.map(e=>[e.nbaId,e]));
const players=[],missing=[];
for(const p of roster.players){
  const existing=activeBy.get(p.id);
  if(existing){
    const r=existing.rating;
    players.push({id:p.id,name:p.name,abbr:p.abbr,team:p.team,pos:existing.pos,games:n(existing.stats.gamesPlayed),minutes:n(existing.stats.avgMinutes),ratings:{off:r.off,def:r.def,shoot:r.shoot,pass:r.pass,reb:r.reb,ovr:r.ovr},source:'draft-pool'});
    continue;
  }
  const cur=statCache.players[p.id];
  if(!cur?.found){missing.push({id:p.id,name:p.name,abbr:p.abbr,reason:cur?.error||'no-2026-27-stats'});continue;}
  const games=n(cur.stats.gamesPlayed);
  if(!(games>0)){missing.push({id:p.id,name:p.name,abbr:p.abbr,reason:'no-games'});continue;}
  players.push({id:p.id,name:p.name,abbr:p.abbr,team:p.team,pos:splitPosition(p),games,minutes:n(cur.stats.avgMinutes),ratings:derivedRatings(cur.stats,splitPosition(p)),source:'derived'});
}

// Verify that the derived model reproduces every existing active-player rating exactly.
const playerById=new Map(players.map(p=>[p.id,p]));
for(const e of active.entries){
  const p=playerById.get(e.nbaId);
  if(!p)throw Error('Missing active player '+e.name);
  for(const k of ['off','def','shoot','pass','reb','ovr'])if(p.ratings[k]!==e.rating[k])throw Error('Rating drift '+e.name+' '+k);
}

const ROTATION_WEIGHTS=[1,1,1,1,1,.62,.52,.44,.36];
const AVAILABILITY_GAMES=9;
const byTeam={};
for(const p of players)(byTeam[p.abbr]??=[]).push(p);
const scores={};
for(const [abbr,list] of Object.entries(byTeam)){
  const sorted=[...list].sort((a,b)=>b.ratings.ovr-a.ratings.ovr||b.games-a.games||b.minutes-a.minutes);
  const rotation=sorted.slice(0,ROTATION_WEIGHTS.length);
  const availability=p=>Math.min(1,p.games/AVAILABILITY_GAMES);
  const denominator=rotation.reduce((s,p,i)=>s+ROTATION_WEIGHTS[i]*availability(p),0);
  const score=rotation.reduce((s,p,i)=>s+p.ratings.ovr*ROTATION_WEIGHTS[i]*availability(p),0)/denominator;
  const avgTop=count=>sorted.slice(0,count).reduce((s,p)=>s+p.ratings.ovr,0)/Math.min(count,sorted.length);
  scores[abbr]={playerScore:score,top3:avgTop(3),top5:avgTop(5),top9:avgTop(9),ratedPlayers:sorted.length,topPlayers:sorted.slice(0,5).map(p=>({name:p.name,ovr:p.ratings.ovr,games:p.games}))};
}
const allScores=Object.values(scores).map(s=>s.playerScore);
const leagueMean=allScores.reduce((a,b)=>a+b,0)/allScores.length;
const leagueSd=Math.sqrt(allScores.reduce((s,x)=>s+(x-leagueMean)**2,0)/allScores.length);
const round1=v=>Math.round(v*10)/10;
const teams=standings.teams.map(t=>{
  const s=scores[t.abbr];
  const power=round1(Math.max(68,Math.min(99,87+(s.playerScore-leagueMean)/leagueSd*5)));
  return {...t,power,playerScore:s.playerScore,top3:round1(s.top3),top5:round1(s.top5),top9:round1(s.top9),ratedPlayers:s.ratedPlayers,topPlayers:s.topPlayers};
}).sort((a,b)=>a.conference.localeCompare(b.conference)||b.power-a.power||a.abbr.localeCompare(b.abbr));

const generatedAt=new Date().toISOString();
const summary={
  season:'2026-27',snapshot:'2026-11-09',generatedAt,
  sources:{rosters:'ESPN NBA 2026-27 rosters',stats:'ESPN athlete statistics, 2026-27 regular-season averages',teamRecords:'ESPN NBA 2026-27 standings'},
  model:{calibration,rotationWeights:ROTATION_WEIGHTS,availabilityGames:AVAILABILITY_GAMES,leagueMean,leagueSd,powerMapping:'clamp(87 + (playerScore - leagueMean) / leagueSd * 5, 68, 99)'},
  counts:{rosterPlayers:roster.players.length,ratedPlayers:players.length,missing:missing.length,teams:teams.length},
  teams
};
await fs.writeFile(new URL('team-strength-2026-27.json',root),JSON.stringify(summary,null,2));
await fs.writeFile(new URL('all-player-ratings-2026-27.json',root),JSON.stringify({season:'2026-27',snapshot:'2026-11-09',generatedAt,model:summary.model,players,missing},null,2));

const body=teams.map(t=>'{abbr:'+JSON.stringify(t.abbr)+',name:'+JSON.stringify(t.name)+',en:'+JSON.stringify(t.en)+',conference:'+JSON.stringify(t.conference)+',w:'+t.w+',l:'+t.l+',ppg:'+t.ppg+',oppPpg:'+t.oppPpg+',diff:'+t.diff+',power:'+t.power+',pace:'+t.pace+',playerScore:'+t.playerScore+',top3:'+t.top3+',top5:'+t.top5+',top9:'+t.top9+',ratedPlayers:'+t.ratedPlayers+',topPlayers:'+JSON.stringify(t.topPlayers)+'}').join(',\n');
const js='// Team strength derived from 2026-27 player ratings, not team standings.\n// Snapshot: 2026-11-09. Source: ESPN 2026-27 rosters + athlete regular-season averages.\nexport const TEAM_DATA_SNAPSHOT=\'2026-11-09\';\nexport const TEAM_DATA_SOURCE=\'ESPN 2026-27 rosters + athlete stats\';\nexport const TEAM_STRENGTH_SOURCE=\'2026-27 player-rating rotation model\';\nexport const TEAM_STRENGTH_FORMULA=\'playerScore = availability-weighted top-9 OVR; power = clamp(87 + z * 5, 68, 99)\';\nexport const TEAM_STRENGTH_META='+JSON.stringify({leagueMean,leagueSd,calibration,rotationWeights:ROTATION_WEIGHTS,availabilityGames:AVAILABILITY_GAMES,ratedPlayers:players.length,missingPlayers:missing.length})+' ;\nexport const LEAGUE_TEAMS=[\n'+body+'\n];\nexport function weakestTeam(conference){return LEAGUE_TEAMS.filter(t=>t.conference===conference).sort((a,b)=>a.power-b.power||a.playerScore-b.playerScore||a.abbr.localeCompare(b.abbr))[0];}\n';
// remove accidental space before semicolon
await fs.writeFile(new URL('teams.js',outDir),js.replace("} ;", "};"));
console.log(JSON.stringify({counts:summary.counts,leagueMean:round1(leagueMean),leagueSd:round1(leagueSd),weakEast:teams.filter(t=>t.conference==='East').sort((a,b)=>a.power-b.power)[0],weakWest:teams.filter(t=>t.conference==='West').sort((a,b)=>a.power-b.power)[0],top:teams.slice().sort((a,b)=>b.power-a.power).slice(0,5).map(t=>[t.abbr,t.power])},null,2));
