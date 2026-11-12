import fs from 'node:fs';
const base=new URL('../outputs/nba-draft-lab/dist/',import.meta.url);
let html=fs.readFileSync(new URL('index.html',base),'utf8');
const css=fs.readFileSync(new URL('style.css',base),'utf8').replace(/^@import[^\n]*\n?/gm,'');
const sources=JSON.parse(fs.readFileSync(new URL('assets/players/sources.json',base),'utf8'));
if(sources.length!==160||new Set(sources.map(p=>p.id)).size!==160||sources.filter(p=>p.pool==='active').length!==80||sources.filter(p=>p.pool==='history').length!==80||sources.some(p=>!p.mime||!p.file))throw Error('All 160 player photos and MIME types (80 active + 80 history) must be present before bundling.');
const embedded=Object.fromEntries(sources.map(p=>[p.id,'data:'+p.mime+';base64,'+fs.readFileSync(new URL(p.file,base)).toString('base64')]));
const js='const PLAYER_PHOTOS='+JSON.stringify(embedded)+';\n'+['players.js','teams.js','league-players.js','engine.js','app.js'].map(name=>fs.readFileSync(new URL(name,base),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/\bexport /g,'')).join('\n');
// Syntax is validated by importing the source modules and by the test suite.
html=html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',()=>`<script>(()=>{${js}})();</script>`).replace('href="./"','href="#"').replace('href="./auction.html"','href="./竞拍模式.html"');
fs.writeFileSync(new URL('../outputs/首发实验室.html',import.meta.url),html);
console.log('Standalone HTML created.');

