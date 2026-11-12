import {PLAYERS,POSITIONS} from './players.js';
import {LEAGUE_TEAMS,weakestTeam} from './teams.js';
import {LEAGUE_PLAYERS} from './league-players.js';
export function rng(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function shuffle(items,r){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function draft(mode,seed){if(!['active','history'].includes(mode))throw Error('未知球员池');const r=rng(seed);return Object.fromEntries(POSITIONS.map(p=>[p.id,shuffle(PLAYERS.filter(v=>v.pos===p.id&&v.pool===mode),r).slice(0,5)]));}
export function evaluate(players){if(!players.length)return null;const avg=k=>players.reduce((s,p)=>s+p[k],0)/players.length;const shooters=players.filter(p=>p.shoot>=85).length;const creators=players.filter(p=>p.pass>=85).length;const rim=players.filter(p=>['PF','C'].includes(p.pos)).reduce((v,p)=>Math.max(v,p.def),0);const fit=(shooters>=3?2:shooters===2?0:shooters===1?-2:-4)+(creators>=2?1.5:creators===1?0:-3)+(rim>=90?1.5:rim>=80?0:-2);const starRating=avg('ovr'),rating=Math.min(99,starRating+fit);
return {off:avg('off'),def:avg('def'),shoot:avg('shoot'),pass:avg('pass'),reb:avg('reb'),starRating,rating,fit,shooters,creators,rim};}

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const one=v=>Math.round(v*10)/10;
const REB_POS={PG:.70,SG:.85,SF:1.05,PF:1.25,C:1.45};
const AST_POS={PG:1.25,SG:1,SF:.95,PF:.82,C:.78};
const STL_POS={PG:1.15,SG:1.1,SF:1,PF:.82,C:.68};
const BLK_POS={PG:.16,SG:.22,SF:.45,PF:1.15,C:1.72};
function rotationForTeam(team,userPlayers){
  if(team.isUser)return userPlayers.map(p=>({id:'U-'+p.id,name:p.name,pos:p.pos,ovr:p.ovr,off:p.off,def:p.def,shoot:p.shoot,pass:p.pass,reb:p.reb,mpg:clamp(34+(p.ovr-80)*.22,32,40)}));
  const roster=LEAGUE_PLAYERS.filter(p=>p.abbr===team.abbr).sort((a,b)=>b.ovr-a.ovr||b.minutes-a.minutes).slice(0,9);
  const raw=roster.map(p=>Math.max(8,p.minutes||20));
  const total=raw.reduce((a,b)=>a+b,0)||1;
  return roster.map((p,i)=>({...p,mpg:clamp(240*raw[i]/total,15,40)}));
}
function buildSeasonAwards({userPlayers,teams,userId,championId,finals,r}){
  const teamById=Object.fromEntries(teams.map(t=>[t.id,t]));
  const all=[];
  for(const team of teams){
    const roster=rotationForTeam(team,userPlayers);
    if(!roster.length)continue;
    const scoreNoise=roster.map(()=>.9+r()*.2);
    const boardNoise=roster.map(()=>.94+r()*.12);
    const assistNoise=roster.map(()=>.94+r()*.12);
    const stealNoise=roster.map(()=>.9+r()*.2);
    const blockNoise=roster.map(()=>.9+r()*.2);
    const scoreW=roster.map((p,i)=>team.isUser?Math.pow(Math.max(1,p.ovr-45),2.5)*(.6+p.off/180)*Math.pow(p.mpg,.35)*scoreNoise[i]:Math.pow(Math.max(2,p.ppg||10),.95)*(.65+p.off/220)*Math.pow(p.mpg,.15)*scoreNoise[i]);
    const boardW=roster.map((p,i)=>team.isUser?Math.pow(Math.max(1,p.reb-30),1.0)*(REB_POS[p.pos]||1)*Math.pow(p.mpg,.15)*boardNoise[i]:Math.max(.5,p.rpg||0)*boardNoise[i]);
    const assistW=roster.map((p,i)=>team.isUser?Math.pow(Math.max(1,p.pass-25),1.5)*(AST_POS[p.pos]||1)*Math.pow(p.mpg,.15)*assistNoise[i]:Math.max(.2,p.apg||0)*assistNoise[i]);
    const stealW=roster.map((p,i)=>team.isUser?Math.pow(Math.max(1,p.def-50),1.2)*(STL_POS[p.pos]||1)*Math.pow(p.mpg,.12)*stealNoise[i]:Math.max(.1,p.spg||0)*stealNoise[i]);
    const blockW=roster.map((p,i)=>team.isUser?Math.pow(Math.max(1,p.def-50),1.25)*(BLK_POS[p.pos]||1)*Math.pow(p.mpg,.12)*blockNoise[i]:Math.max(.05,p.bpg||0)*blockNoise[i]);
    const sum=arr=>arr.reduce((a,b)=>a+b,0)||1;
    const ss=sum(scoreW),sr=sum(boardW),sa=sum(assistW),st=sum(stealW),sb=sum(blockW);
    const teamPPG=team.pf/82;
    const teamRPG=clamp(42+(team.pace-100)*.18,38,50);
    const teamAPG=clamp(23+(team.pace-100)*.12,20,28);
    const teamSPG=clamp(7.2+(team.pace-100)*.03,6.4,8.6);
    const teamBPG=clamp(4.8+(team.pace-100)*.02,4,6);
    roster.forEach((p,i)=>{
      const ppg=one(clamp(teamPPG*scoreW[i]/ss,1,40));
      const rpg=one(clamp(teamRPG*boardW[i]/sr,.5,18));
      const apg=one(clamp(teamAPG*assistW[i]/sa,.2,15));
      const spg=one(clamp(teamSPG*stealW[i]/st,.1,3.5));
      const bpg=one(clamp(teamBPG*blockW[i]/sb,0,4.5));
      const fgPct=one(clamp(43+(p.off-70)*.15+(p.ovr-80)*.08+(p.pos==='C'?6:p.pos==='PF'?3:p.pos==='SG'?-1:-2)+(r()-.5)*3,38,64));
      all.push({...p,teamId:team.id,teamName:team.name,teamAbbr:team.abbr,wins:team.w,losses:team.l,games:82,mpg:one(p.mpg),ppg,rpg,apg,spg,bpg,fgPct});
    });
  }
  const teamInfo=p=>({teamName:teamById[p.teamId].name,teamAbbr:teamById[p.teamId].abbr,teamWins:teamById[p.teamId].w,teamLosses:teamById[p.teamId].l,teamRecord:teamById[p.teamId].w+'-'+teamById[p.teamId].l});
  const mvpScore=p=>p.ppg*1+p.rpg*.68+p.apg*1.2+p.spg*2+p.bpg*1.8+p.wins*.62+(p.ovr-75)*.3;
  const dpoyScore=p=>p.def*.10+p.spg*9+p.bpg*10+p.rpg*.7+p.wins*.12+p.ovr*.15+(p.pos==='C'?2:p.pos==='PF'?1:0);
  const mvp=all.slice().sort((a,b)=>mvpScore(b)-mvpScore(a))[0];
  const scoring=all.slice().sort((a,b)=>b.ppg-a.ppg||mvpScore(b)-mvpScore(a))[0];
  const dpoy=all.slice().sort((a,b)=>dpoyScore(b)-dpoyScore(a))[0];
  const championPlayers=all.filter(p=>p.teamId===championId);
  const finalsGames=finals?.games?.length||4;
  const finalsCandidates=championPlayers.map(p=>{
    const fppg=one(clamp(p.ppg*(.9+r()*.28),5,45));
    const frpg=one(clamp(p.rpg*(.9+r()*.25),.5,20));
    const fapg=one(clamp(p.apg*(.9+r()*.25),.2,18));
    const score=fppg*1.25+frpg*.65+fapg*1.1+p.ovr*.22+(r()-.5)*5;
    return {player:p,fppg,frpg,fapg,score};
  }).sort((a,b)=>b.score-a.score);
  const fm=finalsCandidates[0];
  const decorate=p=>({...p,...teamInfo(p)});
  return {
    starterStats:all.filter(p=>p.teamId===userId),
    awards:{
      mvp:decorate(mvp),
      scoring:decorate(scoring),
      dpoy:decorate(dpoy),
      fmvp:{...decorate(fm.player),finalsGames,finalsPpg:fm.fppg,finalsRpg:fm.frpg,finalsApg:fm.fapg}
    }
  };
}
export function schedule(random){const games=[];for(let a=0;a<30;a++)for(let b=a+1;b<30;b++){games.push([a,b],[b,a]);if(Math.floor(a/15)===Math.floor(b/15)){const d=Math.min(b-a,15-(b-a));if(d<=6)games.push([a,b],[b,a]);}}return shuffle(games,random);}
function normal(r){return Math.sqrt(-2*Math.log(Math.max(r(),1e-8)))*Math.cos(2*Math.PI*r());}
function game(a,b,home,r){const edge=(a.power-b.power)*1.45+(home===a.id?2.6:home===b.id?-2.6:0);let diff=Math.round(edge+normal(r)*12);if(diff===0)diff=r()<.5?-1:1;const pace=(a.pace+b.pace)/2+normal(r)*7;let sa=Math.round(pace+diff/2),sb=sa-diff;const shift=Math.max(0,65-Math.min(sa,sb));sa+=shift;sb+=shift;return {a:a.id,b:b.id,sa,sb,winner:sa>sb?a.id:b.id,home};}
export function simulate(players,seed,conference='East'){
  if(!['East','West'].includes(conference))throw Error('未知分区');
  if(players.length!==5||new Set(players.map(p=>p.pos)).size!==5||!POSITIONS.every(pos=>players.some(p=>p.pos===pos.id&&PLAYERS.some(q=>q.id===p.id))))throw Error('请在每个位置选择一名球员');
  const r=rng(seed),profile=evaluate(players),dropped=weakestTeam(conference);
  const user={name:'首发实验室',abbr:'LAB',en:'Starting Five Lab',conference,power:profile.rating,pace:112,w:0,l:0,pf:0,pa:0,isUser:true};
  const make=t=>({...t,realW:t.w,realL:t.l,w:0,l:0,pf:0,pa:0});
  const eastTeams=LEAGUE_TEAMS.filter(t=>t.conference==='East'&&t.abbr!==dropped.abbr).map(make);
  const westTeams=LEAGUE_TEAMS.filter(t=>t.conference==='West'&&t.abbr!==dropped.abbr).map(make);
  if(conference==='East')eastTeams.push(user);else westTeams.push(user);
  const teams=[...eastTeams,...westTeams];
  teams.forEach((t,id)=>{t.id=id;});
  const uid=user.id,logs=[];
  for(const [a,b] of schedule(r)){
    const g=game(teams[a],teams[b],a,r);
    for(const id of [a,b]){const t=teams[id];t.w+=g.winner===id?1:0;t.l+=g.winner!==id?1:0;t.pf+=id===a?g.sa:g.sb;t.pa+=id===a?g.sb:g.sa;}
    if(a===uid||b===uid)logs.push({no:logs.length+1,opponent:teams[a===uid?b:a].name,home:a===uid,win:g.winner===uid,scored:a===uid?g.sa:g.sb,allowed:a===uid?g.sb:g.sa});
  }
  const compare=(a,b)=>b.w-a.w||(b.pf-b.pa)-(a.pf-a.pa)||a.id-b.id;
  const eastTable=teams.slice(0,15).sort(compare),westTable=teams.slice(15).sort(compare),rounds=[],playins=[];
  const playIn=(a,b,label)=>{const g=game(a,b,a.id,r);playins.push({...g,label});return [teams[g.winner],teams[g.winner===a.id?b.id:a.id]];};
  const qualify=table=>{const [seventh,loser]=playIn(table[6],table[7],'附加赛 · 7 / 8');const [ninth]=playIn(table[8],table[9],'附加赛 · 9 / 10');const [eighth]=playIn(loser,ninth,'附加赛 · 最后席位');return [...table.slice(0,6),seventh,eighth];};
  const series=(a,b,label)=>{let aw=0,bw=0;const games=[];const better=compare(a,b)<=0?a:b,other=better===a?b:a;while(aw<4&&bw<4){const h=[0,1,4,6].includes(games.length)?better.id:other.id;const g=game(a,b,h,r);games.push(g);if(g.winner===a.id)aw++;else bw++;}const result={a:a.id,b:b.id,aw,bw,label,games,winner:aw===4?a.id:b.id};rounds.push(result);return teams[result.winner];};
  const runConference=table=>{const p=qualify(table),q=[[0,7],[3,4],[1,6],[2,5]].map(([a,b])=>series(p[a],p[b],'首轮'));const s=[series(q[0],q[1],'分区半决赛'),series(q[2],q[3],'分区半决赛')];return series(s[0],s[1],'分区决赛');};
  const ec=runConference(eastTable),wc=runConference(westTable),champion=series(ec,wc,'总决赛');
  const myRounds=rounds.filter(s=>s.a===uid||s.b===uid),myPlayins=playins.filter(s=>s.a===uid||s.b===uid);
  let finish='无缘季后赛';
  if(myRounds.length){const last=myRounds.at(-1);finish=champion.id===uid?'总冠军':last.label+'止步';}else if(myPlayins.length)finish='附加赛出局';
  let streak=0,best=0;for(const g of logs){streak=g.win?streak+1:0;best=Math.max(best,streak);}
  const userTable=conference==='East'?eastTable:westTable;
  const awardData=buildSeasonAwards({userPlayers:players,teams,userId:uid,championId:champion.id,finals:rounds.at(-1),r});
  return {seed,profile,conference,replaced:dropped,userId:uid,teams,east:eastTable,west:westTable,logs,rounds,playins,myRounds,myPlayins,champion:champion.name,championId:champion.id,finish,rank:userTable.findIndex(t=>t.id===uid)+1,best,team:teams[uid],starterStats:awardData.starterStats,awards:awardData.awards};
}
