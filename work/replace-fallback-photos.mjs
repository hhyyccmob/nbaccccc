import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('../outputs/nba-draft-lab/dist/',import.meta.url);
const replacements=[
['PG6','https://nbcsports.brightspotcdn.com/dims4/default/0535286/2147483647/strip/true/crop/1920x1080%2B0%2B0/resize/1440x810%21/quality/90/?url=https%3A%2F%2Fnbc-sports-production-nbc-sports.s3.us-east-1.amazonaws.com%2Fbrightspot%2F08%2F5e%2Fc6a0e1d5546d268dd03384144417%2F204230.png','https://www.nbcsports.com/nba/news/pistons-assistant-coach-tim-hardaway-charged-with-drunk-driving'],
['PG7','https://cdn.nba.com/teams/legacy/www.nba.com/cavaliers/sites/cavaliers/files/23_88.jpg?im=Resize%3D%28640%29','https://www.nba.com/cavaliers/photogallery/classic-jersey-throwback-190829'],
['SG7','https://images.24ur.com/media/images/598x440/Jul2019/4987733444_62284729.jpg?fop=fp%3A0.49%3A0.52&v=4dc6','https://www.moskisvet.com/sport/sporti-z-zogo/drazen-petrovic-kosarkarski-mozart-ki-ni-do-konca-spisal-svoje-simfonije.html'],
['PF7','https://img.asmedia.epimg.net/resizer/v2/NHJRNZSYPZPLBJF6CWTILTROB4.jpg?auth=5706bbd7578026c38e0114b4bb6da4d771e80d32bfe425a3feadc3f41ba5d859&height=675&smart=true&width=1200','https://en.as.com/nba/larry-johnsons-iconic-four-point-play-that-crushed-pacers-the-worst-i-ever-shot-in-my-life-n/'],
['C5','https://cdn.nba.com/teams/legacy/i.cdn.turner.com/drp/nba/hornets/sites/default/files/patrick_ewing.jpg?imwidth=512','https://www.nba.com/hornets/2014-15-coaching-staff']
];
const updates=JSON.parse(await fs.readFile(new URL('./portrait-replacements.json',import.meta.url),'utf8').catch(()=>'[]'));
await Promise.all(replacements.filter(([id])=>!updates.some(p=>p.id===id)).map(async([id,url,context])=>{for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());const png=b.subarray(0,8).toString('hex')==='89504e470d0a1a0a',jpg=b[0]===255&&b[1]===216;if(!png&&!jpg)throw Error('Unsupported image bytes');const file=`assets/players/${id}.${png?'png':'jpg'}`;await fs.writeFile(new URL(file,base),b);updates.push({id,source:url,context,file,mime:png?'image/png':'image/jpeg',bytes:b.length,width:png?b.readUInt32BE(16):null,height:png?b.readUInt32BE(20):null,sha256:createHash('sha256').update(b).digest('hex')});console.log('Replaced',id,b.length);return;}catch(e){if(i===2)console.log('FAILED',id,e.message);}}}));
await fs.writeFile(new URL('./portrait-replacements.json',import.meta.url),JSON.stringify(updates,null,2));
console.log('Replacement photos downloaded:',updates.length);
