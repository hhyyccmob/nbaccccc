import {AUCTION_PLAYERS} from './auction-data.js';

export const AUCTION_CONFIG=Object.freeze({budget:20,rosterSize:5,lotCount:10,startPrice:1,modes:['full','height','team']});

export function rng(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const one=v=>Math.round(v*10)/10;
const other=id=>id==='A'?'B':'A';
const emptyTeam=(id,name,budget=AUCTION_CONFIG.budget)=>({id,name,budget,roster:[],assignment:null});
function normal(random){return Math.sqrt(-2*Math.log(Math.max(random(),1e-8)))*Math.cos(2*Math.PI*random());}
function slotName(i){return ['PG','SG','SF','PF','C'][i];}

export function createLobby(infoMode,hostName,settings={}){
 if(!AUCTION_CONFIG.modes.includes(infoMode))throw Error('未知盲拍模式');
 const budget=[20,30,50].includes(Number(settings.budget))?Number(settings.budget):AUCTION_CONFIG.budget;
 const config={budget,rosterSize:AUCTION_CONFIG.rosterSize,lotCount:AUCTION_CONFIG.lotCount};
 return {version:0,infoMode,config,phase:'lobby',seed:null,round:0,lotNo:0,current:null,currentBid:0,highBidder:null,turn:null,queue:[],unsold:[],freePick:null,log:[],series:null,winner:null,teams:{A:emptyTeam('A',hostName||'房主',budget),B:null}};
}
export function joinLobby(state,name){
 if(state.phase!=='lobby')throw Error('房间已经开始');
 if(state.teams.B)throw Error('房间已满');
 state.teams.B=emptyTeam('B',name||'客队',state.config?.budget||AUCTION_CONFIG.budget);
 state.version++;
}
export function startAuction(state,seed){
 if(state.phase!=='lobby')throw Error('当前不能开始');
 if(!state.teams.B)throw Error('等待另一名玩家加入');
 const random=rng(seed>>>0);
 state.seed=seed>>>0;
 state.phase='auction';
 state.round=1;
 state.roundSaleCount=0;
 state.queue=shuffle(AUCTION_PLAYERS,random).slice(0,state.config?.lotCount||AUCTION_CONFIG.lotCount);
 state.unsold=[];
 state.log=[];
 state.current=null;
 state.currentBid=0;
 state.highBidder=null;
 state.turn=null;
 state.version++;
 nextLot(state);
}
function record(state,text){state.log.push({id:state.log.length+1,text});if(state.log.length>60)state.log.shift();}
function lotDescription(state,player){return state.infoMode==='full'?`${player.name}（${player.pos} · ${player.ovr} OVR）`:'一名盲拍球员';}
function nextLot(state){
 if(state.phase!=='auction')return;
 if(!state.queue.length){
   if(state.unsold.length){
     if(state.roundSaleCount===0){freeFillBoth(state,'连续一轮无人出价');return;}
     state.queue=shuffle(state.unsold,rng((state.seed+state.round*7919)>>>0));
     state.unsold=[];
     state.round++;
     state.roundSaleCount=0;
   }else{freeFillBoth(state,'剩余球员不足，免费补齐');return;}
 }
 state.current=state.queue.shift();
 state.lotNo++;
 state.currentBid=0;
 state.highBidder=null;
 state.turn=rng((state.seed+state.lotNo*104729+state.version)>>>0)()<.5?'A':'B';
 record(state,`第 ${state.lotNo} 号拍品上拍：${lotDescription(state,state.current)}。先手 ${state.teams[state.turn].name}。`);
 state.version++;
}
function sellCurrent(state,buyer,price){
 const team=state.teams[buyer];
 team.budget-=price;
 team.roster.push(state.current);
 record(state,`${team.name} 以 ${price} 元获得${state.infoMode==='full'?state.current.name:'第 '+state.lotNo+' 号球员'}，剩余 ${team.budget} 元。`);
 state.roundSaleCount++;
 state.current=null;state.currentBid=0;state.highBidder=null;state.turn=null;
 state.version++;
 settleAfterPurchase(state);
}
function settleAfterPurchase(state){
 const A=state.teams.A,B=state.teams.B;
 const aFull=A.roster.length>=5,bFull=B.roster.length>=5,aBroke=A.budget<=0,bBroke=B.budget<=0;
 if(aFull&&bFull)return finishAuction(state);
 if(aFull||bFull){
   const full=aFull?A:B,needer=aFull?B:A;
   const rest=[...state.queue,...state.unsold];state.queue=[];state.unsold=[];
   while(needer.roster.length<5&&rest.length)needer.roster.push(rest.shift());
   record(state,`${full.name} 已满 5 人，剩余球员免费归 ${needer.name}。`);
   return finishAuction(state);
 }
 if(aBroke&&bBroke)return freeFillBoth(state,'双方预算耗尽');
 if(aBroke||bBroke){
   const broke=aBroke?A:B,chooser=aBroke?B:A;
   return startFreePick(state,chooser,broke);
 }
 nextLot(state);
}
function startFreePick(state,chooser,target){
 const pool=[...state.queue,...state.unsold];state.queue=[];state.unsold=[];
 const picksNeeded=5-chooser.roster.length;
 if(picksNeeded<=0){while(target.roster.length<5&&pool.length)target.roster.push(pool.shift());finishAuction(state);return;}
 state.phase='freePick';
 state.current=null;state.currentBid=0;state.highBidder=null;state.turn=null;
 state.freePick={chooser:chooser.id,target:target.id,pool,picksNeeded};
 record(state,`${target.name} 预算耗尽，${chooser.name} 可从剩余球员中免费挑选 ${picksNeeded} 人。`);
 state.version++;
}
function finishAuction(state){
 state.phase='assign';
 state.current=null;state.currentBid=0;state.highBidder=null;state.turn=null;state.freePick=null;
 state.queue=[];state.unsold=[];
 record(state,'竞拍结束，双方阵容已完整。');
 state.version++;
}
function freeFillBoth(state,reason){
 const needA=5-state.teams.A.roster.length,needB=5-state.teams.B.roster.length;
 const pool=shuffle([...state.queue,...state.unsold],rng((state.seed+state.version*31337)>>>0));
 state.queue=[];state.unsold=[];
 let start=pool.length? (rng((state.seed+state.version)>>>0)()<.5?'A':'B'):'A';
 let turn=start;
 while(pool.length&&(state.teams.A.roster.length<5||state.teams.B.roster.length<5)){
   const team=state.teams[turn];
   if(team.roster.length<5)team.roster.push(pool.shift());
   turn=other(turn);
   if(state.teams.A.roster.length>=5&&state.teams.B.roster.length>=5)break;
 }
 record(state,`${reason}，剩余球员免费补齐双方阵容。`);
 finishAuction(state);
}

export function bid(state,teamId,amount){
 if(state.phase!=='auction'||!state.current)throw Error('当前没有可出价球员');
 if(state.turn!==teamId)throw Error('还没轮到你');
 const team=state.teams[teamId];
 if(team.roster.length>=5)throw Error('阵容已满');
 const value=Math.floor(Number(amount));
 if(!Number.isFinite(value))throw Error('出价无效');
 const minimum=state.currentBid>0?state.currentBid+1:AUCTION_CONFIG.startPrice;
 if(value<minimum)throw Error(`至少出价 ${minimum} 元`);
 if(value>team.budget)throw Error('出价不能超过剩余预算');
 state.currentBid=value;
 state.highBidder=teamId;
 state.turn=other(teamId);
 record(state,`${team.name} 出价 ${value} 元。`);
 state.version++;
}
export function pass(state,teamId){
 if(state.phase!=='auction'||!state.current)throw Error('当前没有可放弃球员');
 if(state.turn!==teamId)throw Error('还没轮到你');
 const buyer=state.highBidder;
 if(buyer){sellCurrent(state,buyer,state.currentBid);}
 else{
   state.unsold.push(state.current);
   record(state,`第 ${state.lotNo} 号球员无人出价，进入流拍池。`);
   state.current=null;state.currentBid=0;state.highBidder=null;state.turn=null;
   state.version++;
   nextLot(state);
 }
}
export function pickFreeAgent(state,teamId,poolIndex){
 if(state.phase!=='freePick'||!state.freePick)throw Error('当前不是补员阶段');
 if(state.freePick.chooser!==teamId)throw Error('还没轮到你挑选');
 const fp=state.freePick;
 const player=fp.pool.splice(poolIndex,1)[0];
 if(!player)throw Error('球员不存在');
 state.teams[teamId].roster.push(player);
 fp.picksNeeded--;
 record(state,`${state.teams[teamId].name} 免费选择${state.infoMode==='full'?player.name:'一名盲拍球员'}。`);
 if(fp.picksNeeded<=0){
   const target=state.teams[fp.target];
   while(target.roster.length<5&&fp.pool.length)target.roster.push(fp.pool.shift());
   record(state,`剩余球员免费归 ${target.name}。`);
   finishAuction(state);
 }
 state.version++;
}
export function assignSlots(state,teamId,slots){
 if(state.phase!=='assign')throw Error('当前不能排阵');
 const team=state.teams[teamId];
 if(!team)throw Error('球队不存在');
 if(!Array.isArray(slots)||slots.length!==5||new Set(slots).size!==5)throw Error('必须安排 5 个不同球员');
 const ids=new Set(team.roster.map(p=>p.id));
 if(!slots.every(id=>ids.has(id)))throw Error('排阵包含不属于该队的球员');
 team.assignment=slots.slice();
 team.version=(team.version||0)+1;
 state.version++;
 if(state.teams.A.assignment&&state.teams.B.assignment)simulateSeries(state);
}
function lineupProfile(roster){
 const avg=k=>roster.reduce((s,p)=>s+p[k],0)/roster.length;
 const shooters=roster.filter(p=>p.shoot>=85).length,creators=roster.filter(p=>p.pass>=85).length;
 const rim=roster.filter(p=>['PF','C'].includes(p.pos)).reduce((v,p)=>Math.max(v,p.def),0);
 const fit=(shooters>=3?2:shooters===2?0:shooters===1?-2:-4)+(creators>=2?1.5:creators===1?0:-3)+(rim>=90?1.5:rim>=80?0:-2);
 const starRating=avg('ovr');
 return {off:avg('off'),def:avg('def'),shoot:avg('shoot'),pass:avg('pass'),reb:avg('reb'),starRating,fit,rating:Math.min(99,starRating+fit),shooters,creators,rim};
}
function gameScore(a,b,home,random){
 const edge=(a-b)*1.45+(home?2.6:-2.6);
 let diff=Math.round(edge+normal(random)*12);if(diff===0)diff=random()<.5?-1:1;
 const pace=112+normal(random)*7;
 let sa=Math.round(pace+diff/2),sb=sa-diff;const shift=Math.max(0,65-Math.min(sa,sb));
 return [sa+shift,sb+shift];
}
function simulateSeries(state){
 const A=lineupProfile(state.teams.A.roster),B=lineupProfile(state.teams.B.roster);
 const random=rng((state.seed^0x9e3779b9)>>>0),games=[],homePattern=['A','A','B','B','A','B','A'];
 let aw=0,bw=0;
 for(const home of homePattern){
   if(aw===4||bw===4)break;
   const [sa,sb]=gameScore(A.rating,B.rating,home==='A',random);
   const winner=sa>sb?'A':'B';if(winner==='A')aw++;else bw++;
   games.push({no:games.length+1,home,sa,sb,winner,score:`${sa}-${sb}`});
 }
 state.series={games,aw,bw,winner:aw===4?'A':'B',profiles:{A,B}};
 state.phase='done';
 state.winner=state.series.winner;
 record(state,`七场四胜结束：${state.teams[state.winner].name} 以 ${Math.max(aw,bw)}-${Math.min(aw,bw)} 获胜。`);
 state.version++;
}
function playerView(p,mode){
 if(!p)return null;
 if(mode==='full')return {kind:'full',id:p.id,name:p.name,en:p.en,pos:p.pos,height:p.height,heightCm:p.heightCm,peakTeam:p.peakTeam,year:p.year,ovr:p.ovr,off:p.off,def:p.def,shoot:p.shoot,pass:p.pass,reb:p.reb,photo:p.photo};
 if(mode==='height')return {kind:'height',heightCm:p.heightCm};
 return {kind:'team',peakTeam:p.peakTeam,year:p.year};
}
export function viewState(state,viewerId){
 const revealed=state.phase==='assign'||state.phase==='done';
 const teamView=(t)=>{
   if(!t)return null;
   return {id:t.id,name:t.name,budget:t.budget,rosterCount:t.roster.length,complete:t.roster.length>=5,assignment:t.assignment,roster:t.roster.map(p=>playerView(p,revealed?'full':state.infoMode))};
 };
 const result={version:state.version,phase:state.phase,infoMode:state.infoMode,config:state.config||{budget:AUCTION_CONFIG.budget,rosterSize:AUCTION_CONFIG.rosterSize,lotCount:AUCTION_CONFIG.lotCount},round:state.round,lotNo:state.lotNo,viewerId,teams:{A:teamView(state.teams.A),B:teamView(state.teams.B)},currentBid:state.currentBid,highBidder:state.highBidder,turn:state.turn,log:state.log.slice(-30),unsoldCount:state.unsold.length,queueCount:state.queue.length,current:state.current?playerView(state.current,revealed?'full':state.infoMode):null,freePick:null,series:state.series,winner:state.winner};
 if(state.phase==='freePick'&&state.freePick){result.freePick={chooser:state.freePick.chooser,target:state.freePick.target,picksNeeded:state.freePick.picksNeeded,pool:state.freePick.pool.map(p=>playerView(p,state.infoMode))};}
 if(revealed){result.teams.A.roster=state.teams.A.roster.map(p=>playerView(p,'full'));result.teams.B.roster=state.teams.B.roster.map(p=>playerView(p,'full'));}
 result.canBid=state.phase==='auction'&&state.turn===viewerId;
 result.canPass=result.canBid;
 result.canPick=state.phase==='freePick'&&state.freePick?.chooser===viewerId;
 result.canAssign=state.phase==='assign'&&viewerId&&state.teams[viewerId]&&!state.teams[viewerId].assignment;
 return result;
}
export function aiBidValue(player,budget){
 const base=2+(player.ovr-70)*.55;
 return Math.max(1,Math.min(budget,Math.round(base+(player.ovr>=96?3:0))));
}
