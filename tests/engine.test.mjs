import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {draft,rng,schedule,simulate,evaluate} from '../dist/engine.js';
import {PLAYERS,POSITIONS} from '../dist/players.js';
import {LEAGUE_TEAMS,weakestTeam,TEAM_DATA_SNAPSHOT,TEAM_DATA_SOURCE,TEAM_STRENGTH_SOURCE,TEAM_STRENGTH_META} from '../dist/teams.js';
import {PLAYER_PHOTOS} from '../dist/photos.js';
import {LEAGUE_PLAYERS} from '../dist/league-players.js';
test('both pools give 25 unique players in correct positions',()=>{assert.equal(PLAYERS.length,160);assert.equal(new Set(PLAYERS.map(p=>p.id)).size,160);for(const mode of ['active','history']){const members=PLAYERS.filter(p=>p.pool===mode);assert.equal(members.length,80);for(const pos of POSITIONS)assert.equal(members.filter(p=>p.pos===pos.id).length,16);for(let i=0;i<80;i++){const d=draft(mode,i),all=Object.values(d).flat();assert.equal(all.length,25);assert.equal(new Set(all.map(p=>p.id)).size,25);for(const pos of POSITIONS){assert.equal(d[pos.id].length,5);assert.ok(d[pos.id].every(p=>p.pos===pos.id&&p.pool===mode));}if(mode==='active')assert.ok(all.every(p=>p.season==='2026-27'&&p.team&&p.id.startsWith('A-')));else assert.ok(all.every(p=>p.year<2027&&!p.team));}}});
test('history ratings use each player highest available 2K overall',()=>{
  const history=PLAYERS.filter(p=>p.pool==='history');
  const twoK=history.filter(p=>p.ratingBasis==='2k-highest-overall');
  const manual=history.filter(p=>p.ratingBasis==='manual-fallback');
  assert.equal(history.length,80);
  assert.equal(twoK.length,78);
  assert.equal(manual.length,2);
  assert.ok(history.every(p=>p.peak===true&&p.year>=1957&&p.year<=2024));
  assert.ok(history.every(p=>p.ratingSource&&p.ratingEdition&&p.attributeEdition));
  assert.ok(history.every(p=>['off','def','shoot','pass','reb'].every(k=>p[k]>=20&&p[k]<=99)));
  assert.ok(twoK.every(p=>p.ovr2k===p.ovr&&p.ovr>=80&&p.ovr<=99&&p.ratingEdition!=='MANUAL'&&p.ovr2k!==null));
  assert.ok(manual.every(p=>p.ovr2k===null&&p.ratingEdition==='MANUAL'&&p.ovr===p.gameOvr));
  assert.equal(history.find(p=>p.en==='Michael Jordan').ovr,99);
  assert.equal(history.find(p=>p.en==='Kawhi Leonard').ratingEdition,'2K20');
  assert.equal(history.find(p=>p.en==='Reggie Miller').ratingBasis,'manual-fallback');
  assert.equal(history.find(p=>p.en==='Charles Barkley').ratingBasis,'manual-fallback');
});
const photoSources=JSON.parse(fs.readFileSync(new URL('../dist/assets/players/sources.json',import.meta.url),'utf8'));
test('active photos match player identity and source records',()=>{const byId=new Map(photoSources.map(s=>[s.id,s]));for(const p of PLAYERS.filter(p=>p.pool==='active')){const s=byId.get(p.id);assert.ok(s,p.id+' source missing');assert.equal(s.pool,'active');assert.equal(s.en,p.en);assert.equal(s.team,p.team);assert.equal(p.photo,PLAYER_PHOTOS[p.id]);assert.equal(p.photo,s.file);}});
test('active pool is a 2026-27 snapshot with complete ratings',()=>{const active=PLAYERS.filter(p=>p.pool==='active');assert.equal(active.length,80);assert.ok(active.every(p=>p.season==='2026-27'&&/^[A-Z]{2,4}$/.test(p.team)&&p.num&&p.photo&&p.peak===false&&p.ratingBasis==='2026-27'&&p.ovr>=60));assert.ok(active.every(p=>['off','def','shoot','pass','reb'].every(k=>p[k]>=20&&p[k]<=99)));assert.ok(active.every(p=>p.ovr===Math.round(p.off*.42+p.def*.29+Math.max(p.shoot,p.pass,p.reb)*.29)));});
test('league schedule gives every team 82 games and 41 at home',()=>{const g=schedule(rng(123)),counts=Array(30).fill(0),home=Array(30).fill(0);assert.equal(g.length,1230);for(const [a,b]of g){assert.notEqual(a,b);counts[a]++;counts[b]++;home[a]++;}assert.ok(counts.every(n=>n===82));assert.ok(home.every(n=>n===41));});
test('2026-27 opponent strength is derived from player ratings',()=>{
  assert.equal(TEAM_DATA_SNAPSHOT,'2026-11-09');
  assert.match(TEAM_DATA_SOURCE,/rosters/i);
  assert.match(TEAM_STRENGTH_SOURCE,/player/i);
  assert.equal(TEAM_STRENGTH_META.rotationWeights.length,9);
  assert.equal(TEAM_STRENGTH_META.availabilityGames,9);
  assert.ok(TEAM_STRENGTH_META.ratedPlayers>=400);
  assert.ok(TEAM_STRENGTH_META.missingPlayers>=0);
  assert.equal(LEAGUE_TEAMS.length,30);
  assert.equal(new Set(LEAGUE_TEAMS.map(t=>t.abbr)).size,30);
  assert.equal(LEAGUE_TEAMS.filter(t=>t.conference==='East').length,15);
  assert.equal(LEAGUE_TEAMS.filter(t=>t.conference==='West').length,15);
  for(const conference of ['East','West']){
    const teams=LEAGUE_TEAMS.filter(t=>t.conference===conference);
    const lowest=Math.min(...teams.map(t=>t.power));
    const dropped=weakestTeam(conference);
    assert.equal(dropped.conference,conference);
    assert.equal(dropped.power,lowest);
    assert.ok(teams.every(t=>Number.isFinite(t.power)&&Number.isFinite(t.pace)&&Number.isFinite(t.playerScore)&&Number.isFinite(t.top5)&&t.ratedPlayers>0&&Array.isArray(t.topPlayers)&&t.topPlayers.length>0));
    assert.ok(teams.every(t=>t.power>=68&&t.power<=99));
    for(const t of teams){
      const mapped=Math.max(68,Math.min(99,87+(t.playerScore-TEAM_STRENGTH_META.leagueMean)/TEAM_STRENGTH_META.leagueSd*5));
      assert.equal(t.power,Math.round(mapped*10)/10);
      assert.ok(t.topPlayers.every((p,i,a)=>i===0||a[i-1].ovr>=p.ovr));
    }
  }
});
test('opponent player stats use actual 2026-27 averages instead of inflated overalls',()=>{const kessler=LEAGUE_PLAYERS.find(p=>p.name==='Walker Kessler');assert.ok(kessler);assert.equal(kessler.ppg,14.6);assert.equal(kessler.bpg,2.4);assert.equal(kessler.rpg,10.4);assert.ok(LEAGUE_PLAYERS.every(p=>Number.isFinite(p.ppg)&&Number.isFinite(p.rpg)&&Number.isFinite(p.apg)&&Number.isFinite(p.spg)&&Number.isFinite(p.bpg)));const five=Object.values(draft('active',0)).map(p=>p[0]);let kesslerDpoy=0,wembyDpoy=0;for(let seed=0;seed<100;seed++){const a=simulate(five,seed,seed%2?'East':'West').awards.dpoy;if(a.name==='Walker Kessler')kesslerDpoy++;if(a.name==='Victor Wembanyama')wembyDpoy++;}assert.ok(kesslerDpoy<=10,'Kessler DPOY share too high: '+kesslerDpoy+'/100');assert.ok(wembyDpoy>kesslerDpoy);});
test('season and playoff bookkeeping across both pools and conferences',()=>{for(const mode of ['active','history'])for(let i=0;i<20;i++){const five=Object.values(draft(mode,i)).map(p=>p[0]);for(const conference of ['East','West']){const s=simulate(five,i,conference);assert.equal(s.conference,conference);assert.equal(s.replaced.conference,conference);assert.equal(s.replaced.abbr,weakestTeam(conference).abbr);assert.equal(s.teams.length,30);assert.equal(s.east.length,15);assert.equal(s.west.length,15);assert.ok(s.east.every(t=>t.conference==='East'));assert.ok(s.west.every(t=>t.conference==='West'));assert.ok(s.teams.some(t=>t.id===s.userId&&t.isUser&&t.abbr==='LAB'));assert.ok(!s.teams.some(t=>t.abbr===s.replaced.abbr));assert.equal(s.logs.length,82);assert.equal(s.logs.filter(g=>g.win).length,s.team.w);assert.equal(s.logs.filter(g=>g.home).length,41);assert.ok(s.teams.every(t=>t.w+t.l===82));assert.equal(s.teams.reduce((v,t)=>v+t.w,0),1230);assert.equal(s.teams.reduce((v,t)=>v+t.pf,0),s.teams.reduce((v,t)=>v+t.pa,0));assert.equal(s.rounds.length,15);assert.equal(s.playins.length,6);assert.ok(s.myRounds.every(x=>x.a===s.userId||x.b===s.userId));assert.ok(s.myPlayins.every(x=>x.a===s.userId||x.b===s.userId));for(const series of s.rounds){assert.equal(Math.max(series.aw,series.bw),4);assert.ok(Math.min(series.aw,series.bw)<4);assert.equal(series.games.length,series.aw+series.bw);assert.ok(series.games.every(g=>g.sa!==g.sb));assert.ok(series.winner===series.a||series.winner===series.b);}assert.ok(s.rank>=1&&s.rank<=15);assert.equal(s.starterStats.length,5);assert.ok(s.starterStats.every(p=>p.teamId===s.userId&&p.games===82&&Number.isFinite(p.ppg)&&Number.isFinite(p.rpg)&&Number.isFinite(p.apg)&&Number.isFinite(p.spg)&&Number.isFinite(p.bpg)&&p.fgPct>0));for(const key of ['mvp','scoring','dpoy','fmvp']){const a=s.awards[key];assert.ok(a&&a.name&&a.teamName&&a.teamRecord&&Number.isFinite(a.ppg)&&Number.isFinite(a.rpg)&&Number.isFinite(a.apg));}assert.equal(s.awards.fmvp.teamId,s.championId);assert.ok(s.awards.fmvp.finalsGames>=4&&s.awards.fmvp.finalsGames<=7);assert.ok(Number.isFinite(s.awards.fmvp.finalsPpg));}}});
test('east and west choices change the replaced team and standings membership',()=>{const five=Object.values(draft('active',3)).map(p=>p[0]),east=simulate(five,7,'East'),west=simulate(five,7,'West');assert.equal(east.replaced.conference,'East');assert.equal(west.replaced.conference,'West');assert.notEqual(east.replaced.abbr,west.replaced.abbr);assert.ok(east.east.some(t=>t.id===east.userId));assert.ok(west.west.some(t=>t.id===west.userId));assert.ok(east.teams[east.userId].id===east.userId);assert.ok(west.teams[west.userId].id===west.userId);});

test('seed is reproducible and invalid lineups or conferences rejected',()=>{const p=Object.values(draft('active',9)).map(p=>p[0]);assert.deepEqual(simulate(p,100,'East'),simulate(p,100,'East'));assert.deepEqual(simulate(p,100,'West'),simulate(p,100,'West'));assert.notDeepEqual(simulate(p,100,'East').logs,simulate(p,101,'East').logs);assert.throws(()=>simulate(p.slice(1),1));assert.throws(()=>simulate([p[0],p[0],p[2],p[3],p[4]],1));assert.throws(()=>simulate(p,1,'North'));});
test('all-time superteam is rated and simulated as an elite team',()=>{const names=['Tim Duncan',"Shaquille O'Neal",'Kobe Bryant','Kawhi Leonard','Russell Westbrook'];const five=names.map(en=>PLAYERS.find(p=>p.en===en));assert.ok(five.every(Boolean));const profile=evaluate(five);assert.ok(Math.abs(profile.starRating-97.4)<1e-9);assert.ok(Math.abs(profile.rating-96.4)<1e-9);assert.equal(profile.shooters,0);let wins=0,firstRound=0,n=60;for(const conference of ['East','West'])for(let seed=0;seed<n;seed++){const s=simulate(five,seed,conference);wins+=s.team.w;if(s.finish==='首轮止步')firstRound++;}const avgWins=wins/(n*2),firstRate=firstRound/(n*2);assert.ok(avgWins>62,'superteam averaged only '+avgWins.toFixed(1)+' wins');assert.ok(firstRate<0.15,'superteam first-round exit rate '+firstRate.toFixed(3));});
test('lineup composition affects rating and stronger teams win more on average',()=>{const strong=POSITIONS.map(pos=>PLAYERS.filter(p=>p.pos===pos.id).sort((a,b)=>evaluate([b]).rating-evaluate([a]).rating)[0]),weak=POSITIONS.map(pos=>PLAYERS.filter(p=>p.pos===pos.id).sort((a,b)=>evaluate([a]).rating-evaluate([b]).rating)[0]);let a=0,b=0;for(let i=0;i<100;i++){a+=simulate(strong,i).team.w;b+=simulate(weak,i).team.w;}assert.ok(a>b+500);});
