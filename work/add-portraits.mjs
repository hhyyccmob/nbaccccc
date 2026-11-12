import fs from 'node:fs';
const base=new URL('../outputs/nba-draft-lab/',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,base),'utf8');
const write=(p,v)=>fs.writeFileSync(new URL(p,base),v);
function replace(p,a,b){const s=read(p);if(!s.includes(a))throw Error('Missing replacement in '+p);write(p,s.replace(a,b));}
replace('dist/players.js','// Editorial game ratings',"import {PLAYER_PHOTOS} from './photos.js';\n// Editorial game ratings");
replace('dist/players.js','return {id:pos+i,pos,name,en,num,year:+year','return {id:pos+i,photo:PLAYER_PHOTOS[pos+i],pos,name,en,num,year:+year');
replace('dist/app.js','const players=()=>',`function portrait(p,kind){return \`<span class="portrait \${kind}" aria-hidden="true"><span class="portrait-fallback">\${p.num}</span><img src="\${esc(p.photo)}" alt="" width="260" height="190" loading="\${kind==='card-portrait'?'lazy':'eager'}" decoding="async"></span>\`;}
document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement&&img.closest('.portrait')){img.hidden=true;img.closest('.portrait').classList.add('missing-photo');}},true);
const players=()=>`);
replace('dist/app.js','<div class="jersey">${v?v.num:\'+\'}</div>','${v?portrait(v,\'court-portrait\'):\'<div class="jersey">+</div>\'}');
replace('dist/app.js','</span></div><h3>${p.name}</h3>','</span></div>${portrait(p,\'card-portrait\')}<h3>${p.name}</h3>');
replace('dist/index.html','所有能力值均为游戏评分。','所有能力值均为游戏评分。头像用于辨认球员，不一定摄于卡片年份。');
replace('dist/index.html','<p class="rules-source">赛制参考：','<p class="rules-source">球员头像来源：NBA 官方球员图片服务，仅用于本地球迷游戏展示；不代表卡片年份或当年效力球队。每张图片的来源见源码中的 assets/players/sources.json。</p><p class="rules-source">赛制参考：');
replace('server.mjs',"'.css':'text/css; charset=utf-8'","'.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'");
write('dist/style.css',read('dist/style.css')+`
/* Player portraits: local assets also embedded into the standalone edition. */
.portrait{position:relative;display:block;overflow:hidden;isolation:isolate}
.portrait img{position:relative;z-index:1;display:block;max-width:100%;height:100%;object-fit:contain;object-position:center bottom}
.portrait-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 40px var(--mono);color:#8fa58e;opacity:0}
.missing-photo .portrait-fallback{opacity:1}
.card-portrait{height:115px;margin:0 -4px 10px;background:radial-gradient(ellipse at 50% 100%,#dce6d5 0%,#ecf0e4 55%,transparent 56%);border-bottom:1px solid #e0e5d8}
.card-portrait img{margin:0 auto;width:100%;transition:transform .2s}
.player-card:hover .card-portrait img{transform:scale(1.035)}
.player-card.selected .card-portrait{background:radial-gradient(ellipse at 50% 100%,#b7cfae 0%,#d0e1c5 55%,transparent 56%)}
.player-card .selection-dot{top:14px;right:auto;left:50%;transform:translateX(-50%);width:17px;height:17px;line-height:15px}
.player-card .card-top{margin-bottom:4px}
.court-portrait{width:66px;height:66px;margin:0 auto;border:2px solid #adc5a0;border-radius:50%;background:radial-gradient(circle at center,#66866b,#345044);box-shadow:0 4px 12px #081b1640}
.court-portrait img{max-width:none;width:90px;height:66px;position:absolute;left:50%;bottom:0;transform:translateX(-50%);object-fit:contain}
.court-portrait .portrait-fallback{color:#d9e6cf;font-size:28px}
.court-player .player-label{margin-top:4px}
@media(max-width:780px){.card-portrait{height:110px}.court-portrait{width:60px;height:60px}.court-portrait img{height:60px;width:82px}}
@media(prefers-reduced-motion:reduce){.player-card:hover .card-portrait img{transform:none}}
`);
console.log('Player cards and court portraits wired.');
