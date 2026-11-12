import fs from 'node:fs';
const base=new URL('../outputs/nba-draft-lab/',import.meta.url);
function change(file,oldText,newText){const p=new URL(file,base),s=fs.readFileSync(p,'utf8');if(!s.includes(oldText))throw Error('Missing text in '+file);fs.writeFileSync(p,s.replace(oldText,newText));}
change('dist/index.html','球员头像来源：NBA 官方球员图片服务，仅用于本地球迷游戏展示；不代表卡片年份或当年效力球队。','球员头像主要来自 NBA 官方图片服务，少量历史球员使用公开照片补齐；不代表卡片年份或当年效力球队。');
change('server.mjs',"'.png':'image/png'","'.png':'image/png','.jpg':'image/jpeg'");
change('PHOTO-SOURCES.md','80 张头像来自 NBA 官方球员图片服务，按 NBA 球员 ID 对应。','共 80 张真实球员图片，按球员身份逐一对应。77 张来自 NBA 官方图片服务，蒂姆·哈达威、德拉任·彼得洛维奇、拉里·约翰逊的图片来自下表所列公开图片来源。');
change('PHOTO-SOURCES.md','每张 PNG 的源地址','每张图片的源地址');
fs.appendFileSync(new URL('dist/style.css',base),`
.player-card .selection-dot{top:58px;right:16px;left:auto;transform:none;z-index:2}
.card-portrait.photo-framed{border-radius:5px;background:#e3e7dd}
.photo-framed img{object-fit:cover;object-position:50% 12%}
.court-portrait.photo-framed img{width:100%;height:100%;object-fit:cover}
.photo-framed[data-photo-id="PG7"] img{object-position:center top}
.photo-framed[data-photo-id="PG6"] img{object-position:42% 15%}
`);
fs.appendFileSync(new URL('README.md',base),'\n## 球员图片\n\n80 名球员均配有真实照片，显示在选人卡片和球场首发阵容上。图片保存在 `dist/assets/players/`，照片路径表在 `dist/photos.js`。来源清单见 `PHOTO-SOURCES.md` 和 `dist/assets/players/sources.json`。头像不一定摄于卡片标注的巅峰年份。单文件试玩版已内嵌全部图片，离线也可显示。\n');
console.log('Portrait layout and documentation finalized.');
