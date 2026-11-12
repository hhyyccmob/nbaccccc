import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../outputs/nba-draft-lab/',import.meta.url);
const manifest=new URL('dist/assets/players/sources.json',base);
const sources=JSON.parse(fs.readFileSync(manifest,'utf8'));
const placeholderHash=sources.find(p=>p.id==='PG6').sha256;
const updates=JSON.parse(fs.readFileSync(new URL('./portrait-replacements.json',import.meta.url),'utf8'));
fs.copyFileSync(new URL('./tim-hardaway-heat.jpg',import.meta.url),new URL('dist/assets/players/PG6.jpg',base));
updates.push({id:'PG6',file:'assets/players/PG6.jpg',mime:'image/jpeg',source:'https://www.basketballnetwork.net/.image/c_fill%2Cw_1200%2Ch_1200%2Cg_faces%3Acenter/MTkzODMzMjU1NDM3MzQ2Mjg4/tim-hardaway-heat.jpg',context:'https://www.basketballnetwork.net/old-school/tim-hardaway-described-the-greatest-moment-of-his-nba-career'});
function dimensions(b){if(b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return [b.readUInt32BE(16),b.readUInt32BE(20)];if(b[0]!==255||b[1]!==216)throw Error('Unknown image');let i=2;while(i<b.length){if(b[i]!==255){i++;continue;}const marker=b[i+1],length=b.readUInt16BE(i+2);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [b.readUInt16BE(i+7),b.readUInt16BE(i+5)];i+=2+length;}throw Error('No JPEG dimensions');}
for(const p of sources){const update=updates.find(u=>u.id===p.id);if(update)Object.assign(p,update);const b=fs.readFileSync(new URL('dist/'+p.file,base));[p.width,p.height]=dimensions(b);p.bytes=b.length;p.mime=p.file.endsWith('.jpg')?'image/jpeg':'image/png';p.sha256=createHash('sha256').update(b).digest('hex');if(p.sha256===placeholderHash)throw Error('Still a placeholder: '+p.id);}
if(sources.length!==80||new Set(sources.map(p=>p.sha256)).size!==80)throw Error('Expected 80 distinct photos');
fs.writeFileSync(manifest,JSON.stringify(sources,null,2));
for(const id of ['PG6','PG7','SG7','PF7','C5'])fs.unlinkSync(new URL('dist/assets/players/'+id+'.png',base));
console.log('Verified 80 distinct real image files; removed five unused silhouette files.');
