import fs from 'node:fs/promises';
const root=new URL('.',import.meta.url);
const roster=JSON.parse(await fs.readFile(new URL('active-rosters-2026-27.json',root),'utf8'));
const cacheFile=new URL('all-player-stats-2026-27.json',root);
let cache={season:'2026-27',source:'ESPN athlete statistics, regular season averages, season=2027',fetchedAt:null,players:{}};
try{cache={...cache,...JSON.parse(await fs.readFile(cacheFile,'utf8'))};}catch{}
const ids=[...new Set(roster.players.map(p=>p.id))].filter(id=>!cache.players[id]);
console.log('Roster players',roster.players.length,'unique',Object.keys(cache.players).length+ids.length,'pending',ids.length);
const queue=[...ids];
async function getOne(id){
  for(let attempt=0;attempt<4;attempt++){
    try{
      const url='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/'+encodeURIComponent(id)+'/stats?region=us&lang=en&contentorigin=espn&season=2027&seasontype=2';
      const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
      if(!res.ok)throw Error('HTTP '+res.status);
      const json=await res.json();
      const cat=(json.categories||[]).find(c=>c.name==='averages');
      const row=(cat?.statistics||[]).find(r=>r.season?.year===2027);
      if(!row)return {found:false};
      const stats={};cat.names.forEach((name,i)=>stats[name]=row.stats[i]??null);
      return {found:true,team:row.teamSlug,position:row.position,stats};
    }catch(e){if(attempt===3)return {found:false,error:e.message};await new Promise(r=>setTimeout(r,250*(attempt+1)));}
  }
}
let done=0;
async function worker(){while(queue.length){const id=queue.shift();cache.players[id]=await getOne(id);done++;if(done%40===0)console.log('Fetched',done,'/',ids.length);}}
await Promise.all(Array.from({length:10},worker));
cache.fetchedAt=new Date().toISOString();
await fs.writeFile(cacheFile,JSON.stringify(cache,null,2));
const vals=Object.values(cache.players);
console.log(JSON.stringify({total:vals.length,found:vals.filter(x=>x.found).length,missing:vals.filter(x=>!x.found).length,errors:vals.filter(x=>x.error).length},null,2));
