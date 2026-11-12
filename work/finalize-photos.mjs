import fs from 'node:fs';
const base=new URL('../outputs/nba-draft-lab/',import.meta.url);
const sources=JSON.parse(fs.readFileSync(new URL('dist/assets/players/sources.json',base),'utf8'));
if(sources.length!==80)throw Error('Missing portraits');
const mapping=Object.fromEntries(sources.map(p=>[p.id,p.file]));
fs.writeFileSync(new URL('dist/photos.js',base),'// NBA portrait assets. Source and player ID mapping: assets/players/sources.json\nexport const PLAYER_PHOTOS = '+JSON.stringify(mapping,null,2)+';\n');
fs.writeFileSync(new URL('PHOTO-SOURCES.md',base),'# 球员头像来源\n\n80 张头像来自 NBA 官方球员图片服务，按 NBA 球员 ID 对应。图片用于辨认球员，不保证摄于卡片的巅峰年份。球员 ID 通过 nba_api 球员目录匹配，巴特勒使用目录中的 Jimmy Butler III。\n\n[球员目录来源](https://github.com/swar/nba_api/blob/master/src/nba_api/stats/library/data.py)。每张 PNG 的源地址、大小、尺寸和 SHA-256 记录于 `dist/assets/players/sources.json`。\n\n| 球员 | NBA 档案 | 原图 |\n|---|---|---|\n'+sources.map(p=>`| ${p.name} | [${p.nbaId}](${p.profile}) | [头像](${p.source}) |`).join('\n')+'\n');
console.log('Portrait map and source documentation ready.');
