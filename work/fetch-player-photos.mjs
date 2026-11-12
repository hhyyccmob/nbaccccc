import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PLAYERS} from '../outputs/nba-draft-lab/dist/players.js';
const directory=await fs.readFile(new URL('./nba-player-directory.py',import.meta.url),'utf8');
const entries=directory.split('\n').filter(l=>/^\s*\[\d+,/.test(l)).flatMap(l=>{try{return [JSON.parse(l.trim().replace(/,$/,'').replace(/\bTrue\b/g,'true').replace(/\bFalse\b/g,'false'))];}catch{return [];}});
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
const out=new URL('../outputs/nba-draft-lab/dist/assets/players/',import.meta.url);await fs.mkdir(out,{recursive:true});
const aliases={'Jimmy Butler':'Jimmy Butler III'};
const roster=PLAYERS.map(p=>{const row=entries.find(x=>typeof x[3]==='string'&&norm(x[3])===norm(aliases[p.en]||p.en));if(!row)throw Error('Missing ID: '+p.en);return {...p,nbaId:row[0]};});
const sourceFile=new URL('../outputs/nba-draft-lab/dist/assets/players/sources.json',import.meta.url);
const results=JSON.parse(await fs.readFile(sourceFile,'utf8').catch(()=>'[]')),pending=roster.filter(p=>!results.some(r=>r.id===p.id));
async function worker(){while(pending.length){const p=pending.shift();let success=false;for(let attempt=0;attempt<3;attempt++){const host=attempt===1?'https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest':'https://cdn.nba.com/headshots/nba/latest';const url=`${host}/260x190/${p.nbaId}.png`;try{const res=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('HTTP '+res.status);const bytes=Buffer.from(await res.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');if(bytes.length<1000)throw Error('Image too small');await fs.writeFile(new URL(`${p.id}.png`,out),bytes);results.push({id:p.id,name:p.name,en:p.en,nbaId:p.nbaId,source:url,profile:`https://www.nba.com/stats/player/${p.nbaId}`,file:`assets/players/${p.id}.png`,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')});success=true;break;}catch(e){if(attempt===2)console.log('FAILED',p.id,p.en,e.message);}}if(success&&results.length%10===0)console.log('Downloaded',results.length,'/ 80');}}
await Promise.all(Array.from({length:4},worker));results.sort((a,b)=>roster.findIndex(p=>p.id===a.id)-roster.findIndex(p=>p.id===b.id));
await fs.writeFile(new URL('../outputs/nba-draft-lab/dist/assets/players/sources.json',import.meta.url),JSON.stringify(results,null,2));
const hashes=new Map;for(const p of results){if(!hashes.has(p.sha256))hashes.set(p.sha256,[]);hashes.get(p.sha256).push(p.en);}console.log(JSON.stringify({downloaded:results.length,missing:roster.filter(p=>!results.some(r=>r.id===p.id)).map(p=>p.en),duplicateImages:[...hashes.values()].filter(v=>v.length>1),totalBytes:results.reduce((sum,p)=>sum+p.bytes,0)}));
if(results.length!==80)process.exitCode=1;
