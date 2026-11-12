import {POSITIONS,MODES} from './players.js';
import {draft,evaluate,simulate} from './engine.js';
import {weakestTeam} from './teams.js';
const $=s=>document.querySelector(s),seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='active',conference='East',draftSeed=seed(),pool=draft(mode,draftSeed),selected={},result=null,busy=false,tab='east',toastTimer,started=false,positionIndex=0,opened=blankOpened(),draftLock=false;
const confName=c=>c==='East'?'东部':'西部';
function portrait(p,kind){const framed=['PG6','PG7','SG7','PF7','C5'].includes(p.id);return `<span class="portrait ${kind} ${p.pool==='active'?'active-photo':''} ${framed?'photo-framed':''}" data-photo-id="${p.id}" aria-hidden="true"><span class="portrait-fallback">${p.num}</span><img src="${esc(p.photo)}" alt="" width="260" height="190" loading="${kind==='card-portrait'?'lazy':'eager'}" decoding="async"></span>`;}
document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement&&img.closest('.portrait')){img.hidden=true;img.closest('.portrait').classList.add('missing-photo');}},true);
const players=()=>POSITIONS.map(p=>selected[p.id]).filter(Boolean);
function editionLabel(p){return p.pool==='active'?p.season:p.ratingEdition;}
function ratingTitle(p){if(p.pool==='active')return p.team+' · '+p.season+' · 游戏总评 '+p.ovr;if(p.ovr2k==null)return '人工回退评分（可用 2K 数据未覆盖） · 游戏总评 '+p.ovr+' · NBA 巅峰 '+p.year;const source=p.ratingSource.startsWith(p.ratingEdition)?p.ratingSource:p.ratingEdition+' · '+p.ratingSource;return source+' · '+p.ratingTeam+' · 2K 总评 '+p.ovr+' · NBA 巅峰 '+p.year+(p.attributeEdition!==p.ratingEdition?' · 攻防属性映射自 '+p.attributeEdition:'');}
function cardAria(p){const rating=p.pool==='active'?'2026–27赛季，总评'+p.ovr:(p.ovr2k==null?'人工回退评分'+p.ovr+'，NBA巅峰'+p.year:p.ratingEdition+'历史最高总评'+p.ovr+'，NBA巅峰'+p.year);return '选择'+p.name+'，'+rating+'，进攻'+p.off+'，防守'+p.def+'，投射'+p.shoot+'，组织'+p.pass+'，篮板'+p.reb;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function fitText(p){if(!p)return '选满五人，看看你的阵容有什么化学反应。';const s=[];s.push(p.shooters>=3?'多点投射：空间拉满':p.shooters===2?'双射手配置：空间均衡':'外线空间不足：内线更容易被夹击');s.push(p.creators>=2?'多核组织：进攻更流畅':p.creators===1?'单核组织：持球核心明确':'组织偏弱：得分可能依赖单打');if(p.rim>=90)s.push('护筐可靠：内线有保障');return s.join(' / ')+'。';}
function blankOpened(){return Object.fromEntries(POSITIONS.map(p=>[p.id,Array(5).fill(false)]));}
function stageSetup(){
 const replaced=weakestTeam(conference);
 return `<div class="stage-panel stage-setup"><span class="stage-watermark" aria-hidden="true">DRAFT</span><span class="stage-kicker">DRAFT ROOM / READY</span><h3>五个位置，五次选择。</h3><p>每个位置会出现 5 个盲盒。你可以一个一个打开，看到球员后再做决定；选中后自动进入下一个位置。</p><div class="stage-pills"><span>${MODES[mode]}</span><span>${confName(conference)} · 替代 ${replaced.name}</span><span>25 名候选</span></div><button type="button" class="stage-cta" id="stage-start">开始抽选 <span>→</span></button></div>`;
}
function stageProgress(){
 return `<div class="draft-progress" aria-label="抽选进度">${POSITIONS.map((p,i)=>{const chosen=selected[p.id],status=chosen?'done':i===positionIndex?'current':'',disabled=!chosen&&i>positionIndex?'disabled':'';return `<button type="button" class="progress-step ${status}" data-jump="${i}" ${disabled}><span>0${i+1}</span><b>${p.id}</b><small>${chosen?esc(chosen.name):p.name}</small></button>`;}).join('')}</div>`;
}
function stageBox(p,pos,index,isOpen,isPicked){
 if(!isOpen)return `<button type="button" class="blind-box" data-box="${index}" aria-label="开启${pos.name}第${index+1}个盲盒"><span class="box-code">BOX 0${index+1}</span><span class="box-orb" aria-hidden="true">?</span><b>${pos.id}</b><small>点击开启</small></button>`;
 return `<article class="reveal-card ${isPicked?'picked':''}"><div class="reveal-top"><span>#0${index+1}</span><span class="rating">${p.ovr}<small>OVR</small></span></div>${portrait(p,'card-portrait')}<h4>${esc(p.name)}</h4><div class="player-en">${esc(p.en.toUpperCase())}</div><div class="card-stats"><span>攻<b>${p.off}</b></span><span>防<b>${p.def}</b></span><span>投<b>${p.shoot}</b></span></div><button type="button" class="pick-button ${isPicked?'is-picked':''}" data-pick="${index}">${isPicked?'✓ 已选择':'选择此人 →'}</button></article>`;
}
function stagePosition(){
 const pos=POSITIONS[positionIndex],options=pool[pos.id],reveals=opened[pos.id]||[],picked=selected[pos.id],openCount=options.filter((p,i)=>reveals[i]||picked?.id===p.id).length;
 return `<div class="stage-panel draft-live">${stageProgress()}<div class="stage-heading"><div><span class="stage-kicker">ROUND 0${positionIndex+1} / 05 · ${pos.id}</span><h3>${pos.name}<small>五选一</small></h3><p>逐个开启盲盒，选中你的${pos.name}。</p></div><div class="open-count">${openCount}<small>/ 5 OPENED</small></div></div><div class="blind-grid">${options.map((p,i)=>stageBox(p,pos,i,reveals[i]||picked?.id===p.id,picked?.id===p.id)).join('')}</div><div class="stage-nav"><button type="button" class="stage-nav-btn" data-prev ${positionIndex===0?'disabled':''}>← 上一位置</button><span class="stage-hint">${picked?`已选择 ${esc(picked.name)}${draftLock?'，正在进入下一位置…':'，可继续更换或前往下一位。'}`:'打开盲盒，看看谁在等你。'}</span><button type="button" class="stage-nav-btn" data-next ${picked?'':'disabled'}>下一位 →</button></div></div>`;
}
function stageComplete(){
 return `<div class="stage-panel stage-complete"><span class="stage-kicker">STARTING FIVE / LOCKED</span><div class="stage-heading"><div><h3>首发五人已就位。</h3><p>确认阵容后，在下方开始模拟赛季。</p></div></div><div class="complete-lineup">${POSITIONS.map((pos,i)=>{const p=selected[pos.id];return `<button type="button" class="complete-player" data-jump="${i}"><span class="complete-pos">${pos.id}</span>${portrait(p,'court-portrait')}<strong>${esc(p.name)}</strong><small>${p.ovr} OVR</small></button>`;}).join('')}</div><div class="complete-actions"><button type="button" class="outline-button" id="reset-lineup">↻ 重新抽卡</button><span class="stage-hint">下方按钮开始模拟</span></div></div>`;
}
function renderDraft(){
 const list=players(),profile=evaluate(list);
 $('#round-code').textContent='#'+draftSeed.toString(16).slice(0,6).toUpperCase();
 $('#picked-count').textContent=`${list.length} / 5 已就位`;
 $('#court-players').innerHTML=POSITIONS.map(p=>{const v=selected[p.id];return `<div class="court-player ${v?'':'empty'}">${v?portrait(v,'court-portrait'):'<div class="jersey">+</div>'}<div class="player-label">${v?v.name:p.name+'待选'}</div><small>${p.id}</small></div>`;}).join('');
 $('#court-rating').innerHTML=(list.length===5?Math.round(profile.rating):'—')+'<small> 阵容评分</small>';
 $('#court-caption').textContent=!started?'点击“开始抽选”，一次只看一个位置。':list.length===5?'首发已集结。让赛场给出答案。':`已选择 ${list.length} 人，继续寻找下一块拼图。`;
 $('#hero-mode-note').textContent=`${MODES[mode]} · ${confName(conference)}`;
 $('#hero-start').innerHTML=!started?'开始抽选 <span>↗</span>':list.length===5?'阵容已就位 <span>↗</span>':'继续抽选 <span>↗</span>';
 $('#draft-stage').innerHTML=!started?stageSetup():list.length===5&&positionIndex>=POSITIONS.length?stageComplete():stagePosition();
 $('#analysis-panel').hidden=!started;
 $('#launch-bar').hidden=list.length!==5;
 $('#profile-bars').innerHTML=[['off','进攻'],['def','防守'],['shoot','投射'],['pass','组织'],['reb','篮板']].map(([key,label])=>`<div><div class="bar-label"><span>${label}</span><span>${profile?Math.round(profile[key]):'—'}</span></div><div class="bar-track"><div class="bar-fill" style="width:${profile?profile[key]:0}%"></div></div></div>`).join('');
 $('#fit-note').textContent=list.length===5?fitText(profile):`当前为 ${list.length} 人能力均值，集齐五人后计算阵容搭配加成。`;
 const replaced=weakestTeam(conference);
 $('#conference-note').textContent=`加入${confName(conference)} · 替代现役评分最弱队 ${replaced.name}（强度 ${replaced.power.toFixed(1)}）`;
 $('#launch-title').textContent=list.length===5?`五人就位，开启你的${confName(conference)}赛季。`:`还差 ${5-list.length} 人，就能开赛。`;
 $('#simulate').disabled=list.length!==5||busy;
}
function nextOpenPosition(from){const after=POSITIONS.findIndex((p,i)=>i>from&&!selected[p.id]);const any=POSITIONS.findIndex(p=>!selected[p.id]);return after>=0?after:any>=0?any:POSITIONS.length;}
function startDraft(){if(busy)return;if(!started){started=true;positionIndex=0;opened=blankOpened();}renderDraft();$('#draft-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});toast('抽选开始：先从控球后卫的 5 个盲盒中选出 1 人。');}
function goToPosition(index){if(busy||index<0||index>=POSITIONS.length)return;if(index>positionIndex&&!selected[POSITIONS[index].id])return;positionIndex=index;renderDraft();}
function choosePlayer(index){
 if(busy||draftLock)return;
 const pos=POSITIONS[positionIndex],p=pool[pos.id][index];
 if(!p)return;
 if(selected[pos.id]?.id===p.id){toast('这名球员已经在你阵中。');return;}
 opened[pos.id][index]=true;
 selected[pos.id]=p;
 result=null;$('#results').hidden=true;
 draftLock=true;renderDraft();toast(`已选择 ${p.name}。`);
 const from=positionIndex;
 setTimeout(()=>{positionIndex=nextOpenPosition(from);draftLock=false;renderDraft();},520);
}
function redraft(keepStarted=true){
 if(busy)return;
 draftSeed=seed();pool=draft(mode,draftSeed);selected={};opened=blankOpened();positionIndex=0;started=keepStarted;result=null;$('#results').hidden=true;
 renderDraft();toast(`新一轮 25 名${mode==='active'?'现役':'历史'}球员已到场。`);
}
$('#draft-stage').addEventListener('click',event=>{
 if(busy)return;
 const box=event.target.closest('[data-box]');
 if(box){const pos=POSITIONS[positionIndex];opened[pos.id][+box.dataset.box]=true;renderDraft();return;}
 const pick=event.target.closest('[data-pick]');
 if(pick){choosePlayer(+pick.dataset.pick);return;}
 if(event.target.closest('#stage-start')){startDraft();return;}
 if(event.target.closest('#reset-lineup')){redraft(true);return;}
 const jump=event.target.closest('[data-jump]');
 if(jump){goToPosition(+jump.dataset.jump);return;}
 if(event.target.closest('[data-prev]')){goToPosition(positionIndex-1);return;}
 if(event.target.closest('[data-next]')){positionIndex=nextOpenPosition(positionIndex);renderDraft();return;}
});
$('#hero-start').addEventListener('click',startDraft);
$('#mode').addEventListener('change',e=>{mode=e.target.value;redraft(false);});
$('#conference').addEventListener('change',e=>{conference=e.target.value;tab=conference==='East'?'east':'west';if(result){result=null;$('#results').hidden=true;}renderDraft();toast(`已选择${confName(conference)}：将替代现役评分最弱队${weakestTeam(conference).name}。`);});
$('#redraft').addEventListener('click',()=>redraft(started));
function setBusy(value){busy=value;$('#simulate').disabled=value||players().length!==5;$('#mode').disabled=value;$('#conference').disabled=value;$('#redraft').disabled=value;$('#hero-start').disabled=value;document.querySelectorAll('#draft-stage button').forEach(b=>{if(value)b.disabled=true;});if(!value)renderDraft();$('#simulate').innerHTML=value?'正在模拟赛季…':'开始模拟赛季 <span>↗</span>';}
function readHistory(){try{const h=JSON.parse(localStorage.getItem('starting-five-history-v1')||'[]');return Array.isArray(h)?h.slice(0,5).filter(x=>typeof x.w==='number'&&typeof x.l==='number'&&typeof x.finish==='string'&&typeof x.names==='string'):[];}catch{return [];}}
function saveHistory(r){try{const h=readHistory();h.unshift({w:r.team.w,l:r.team.l,finish:r.finish,names:players().map(p=>p.name).join(' / '),mode:MODES[mode],conference:r.conference,replaced:r.replaced.name,seed:r.seed});localStorage.setItem('starting-five-history-v1',JSON.stringify(h.slice(0,5)));}catch{toast('浏览器未允许保存记录，本次赛季仍可正常查看。');}renderHistory();}
function renderHistory(){const h=readHistory();$('#history-section').hidden=!h.length;$('#history').innerHTML=h.map(x=>`<div class="history-card"><span>${esc(x.finish)}</span><strong>${x.w} — ${x.l}</strong><small>${esc(x.mode||'旧版记录')}${x.conference?' · '+(x.conference==='East'?'东部':'西部'):''}${x.replaced?' · 替代'+esc(x.replaced):''}</small><small>${esc(x.names)}</small></div>`).join('');}
async function run(){if(busy||players().length!==5)return;setBusy(true);await new Promise(resolve=>setTimeout(resolve,700));try{result=simulate(players(),seed(),conference);tab=conference==='East'?'east':'west';renderResults();saveHistory(result);$('#results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}catch(e){toast('模拟未完成，请重试：'+e.message);}finally{setBusy(false);}}
$('#simulate').addEventListener('click',run);
function renderTable(){const r=result;$('#standings-body').innerHTML=r[tab].map((t,i)=>`<tr class="${t.id===r.userId?'mine':''}"><td>${String(i+1).padStart(2,'0')}</td><td>${t.name}${t.id===r.userId?' · 你':''}</td><td>${t.w}</td><td>${t.l}</td><td>${(t.w/82*100).toFixed(1)}%</td><td>${((t.pf-t.pa)/82).toFixed(1)}</td><td title="${esc((t.topPlayers||[]).slice(0,3).map(p=>p.name+' '+p.ovr).join(' / '))}">${t.power.toFixed(1)}</td></tr>`).join('');document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-pressed',b.dataset.tab===tab);});}
function awardCard(kind,label,sub,p,line){return `<article class="award-card ${kind}"><div class="award-label"><span>${label}</span><small>${sub}</small></div><strong>${esc(p.name)}</strong><p>${esc(p.teamName)} · ${p.teamRecord}</p><span class="award-line">${line}</span></article>`;}
function renderResults(){
 const r=result,t=r.team,won=r.finish==='总冠军',uid=r.userId,conf=confName(r.conference);
 const positionOrder=Object.fromEntries(POSITIONS.map((p,i)=>[p.id,i]));
 const starters=[...r.starterStats].sort((a,b)=>positionOrder[a.pos]-positionOrder[b.pos]);
 const awardMarkup=r.awards?[[awardCard('mvp','MVP','常规赛最有价值',r.awards.mvp,r.awards.mvp.ppg.toFixed(1)+' PPG · '+r.awards.mvp.rpg.toFixed(1)+' RPG · '+r.awards.mvp.apg.toFixed(1)+' APG'),awardCard('scoring','SCORING','得分王',r.awards.scoring,r.awards.scoring.ppg.toFixed(1)+' PPG · '+r.awards.scoring.fgPct.toFixed(1)+'% FG'),awardCard('dpoy','DPOY','最佳防守球员',r.awards.dpoy,r.awards.dpoy.spg.toFixed(1)+' SPG · '+r.awards.dpoy.bpg.toFixed(1)+' BPG · '+r.awards.dpoy.rpg.toFixed(1)+' RPG'),awardCard('fmvp','FMVP','总决赛最有价值',r.awards.fmvp,'总决赛 '+r.awards.fmvp.finalsPpg.toFixed(1)+' 分 · '+r.awards.fmvp.finalsRpg.toFixed(1)+' 板 · '+r.awards.fmvp.finalsApg.toFixed(1)+' 助')].join('')]:'';
 const starterMarkup=r.starterStats?`<section class="report-panel starter-stats-panel"><div class="table-heading"><h3>首发个人数据</h3><span class="eyebrow">82 GAMES</span></div><div class="table-scroll"><table class="standings starter-stats"><thead><tr><th>球员</th><th>位置</th><th>时间</th><th>得分</th><th>篮板</th><th>助攻</th><th>抢断</th><th>盖帽</th><th>命中率</th></tr></thead><tbody>${starters.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${p.pos}</td><td>${p.mpg.toFixed(1)}</td><td>${p.ppg.toFixed(1)}</td><td>${p.rpg.toFixed(1)}</td><td>${p.apg.toFixed(1)}</td><td>${p.spg.toFixed(1)}</td><td>${p.bpg.toFixed(1)}</td><td>${p.fgPct.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div><p class="result-footnote">以上为本次模拟生成的常规赛个人数据，不等同于真实统计；82 场、场均时间按轮换模型分配。</p></section>`:'';

 $('#results').hidden=false;
 $('#results').innerHTML=`<div class="section-top"><div><div class="eyebrow">02 — SEASON REPORT</div><h2>这一季，你的答案。</h2></div><span class="eyebrow">SEED ${r.seed.toString(16).toUpperCase()}</span></div><div class="result-hero"><div><div class="eyebrow">${won?'CHAMPIONS ARE MADE.':'EVERY SEASON TELLS A STORY.'}</div><div class="record">${t.w} — ${t.l}<small>常规赛 胜 / 负</small></div><h3>${r.finish}</h3><p>${conf}第 ${r.rank} 名 · ${MODES[mode]}<br>替代 2026–27 现役评分最弱队：${r.replaced.name}（强度 ${r.replaced.power.toFixed(1)}）<br>${won?'你的五人组把想象变成了冠军。':`本届总冠军：${r.champion}。调整搭配，下一季再来。`}</p></div><div class="result-trophy" aria-hidden="true">${won?'♜':'◈'}</div></div><div class="result-metrics"><div class="metric"><strong>${(t.w/82*100).toFixed(1)}<small>%</small></strong><span>赛季胜率</span></div><div class="metric"><strong>${(t.pf/82).toFixed(1)}</strong><span>场均得分</span></div><div class="metric"><strong>${(t.pa/82).toFixed(1)}</strong><span>场均失分</span></div><div class="metric"><strong>${r.best}</strong><span>最长连胜</span></div></div><div class="award-strip" aria-label="赛季奖项">${awardMarkup}</div>${starterMarkup}<div class="result-panels"><section class="report-panel"><h3>82 场，走过的每一步。</h3><div class="timeline" aria-label="常规赛胜负走势">${r.logs.map(g=>`<span tabindex="0" class="game-tile ${g.win?'':'loss'}" title="G${g.no} ${g.home?'主场':'客场'}对阵${g.opponent} ${g.scored}:${g.allowed}" aria-label="第${g.no}场，${g.home?'主场':'客场'}对阵${g.opponent}，${g.scored}比${g.allowed}，${g.win?'胜':'负'}">${g.no}</span>`).join('')}</div><div class="legend"><span><b>■ 胜</b>　<i>■ 负</i></span><span>按比赛顺序 · 完整比分见下方</span></div><p class="result-footnote">${fitText(r.profile)} 阵容评分 ${r.profile.rating.toFixed(1)}（五人总评均值 ${r.profile.starRating.toFixed(1)} + 搭配修正 ${r.profile.fit>=0?'+':''}${r.profile.fit.toFixed(1)}）。</p></section><section class="report-panel"><h3>季后赛之路</h3>${r.myPlayins.map(g=>`<div class="series-row"><span>${g.label}<small>对阵 ${r.teams[g.a===uid?g.b:g.a].name}</small></span><strong class="${g.winner===uid?'won':'lost'}">${g.a===uid?g.sa:g.sb} : ${g.a===uid?g.sb:g.sa}</strong></div>`).join('')}${r.myRounds.map(s=>`<div class="series-row"><span>${s.label}<small>对阵 ${r.teams[s.a===uid?s.b:s.a].name} · ${s.winner===uid?'晋级 / 获胜':'淘汰'}</small></span><strong class="${s.winner===uid?'won':'lost'}">${s.a===uid?s.aw:s.bw} — ${s.a===uid?s.bw:s.aw}</strong></div>`).join('')}${!r.myPlayins.length&&!r.myRounds.length?'<p class="result-footnote">未能进入分区前十，本赛季止步常规赛。试试增加射手、组织点或护筐球员。</p>':''}<p class="result-footnote">总冠军：${r.champion} · 所有轮次均由实际模拟比赛决定。</p></section></div><section class="report-panel standings-wrap"><div class="table-heading"><h3>常规赛积分榜</h3><div class="tabs"><button data-tab="east" class="${tab==='east'?'active':''}" aria-pressed="${tab==='east'}">东部</button><button data-tab="west" class="${tab==='west'?'active':''}" aria-pressed="${tab==='west'}">西部</button></div></div><div class="table-scroll"><table class="standings"><thead><tr><th>排名</th><th>球队</th><th>胜</th><th>负</th><th>胜率</th><th>场均净胜分</th><th>球队强度</th></tr></thead><tbody id="standings-body"></tbody></table></div><p class="result-footnote">前 6 名直通季后赛 · 7–10 名进入附加赛。对手强度由 2026–27 现役球员能力值加权换算，不是实时数据。</p></section><details class="log-details"><summary>查看全部比赛比分（常规赛 + 我的附加赛 / 季后赛）</summary><div class="table-scroll"><table class="standings"><thead><tr><th>场次</th><th>对手</th><th>主客场</th><th>比分</th><th>结果</th></tr></thead><tbody>${r.logs.map(g=>`<tr><td>G${g.no}</td><td>${g.opponent}</td><td>${g.home?'主':'客'}</td><td>${g.scored} : ${g.allowed}</td><td class="${g.win?'win-text':'loss-text'}">${g.win?'W':'L'}</td></tr>`).join('')}${[...r.myPlayins.map(g=>({...g,stage:g.label})),...r.myRounds.flatMap(s=>s.games.map((g,i)=>({...g,stage:s.label+' G'+(i+1)})))].map(g=>`<tr><td>${g.stage}</td><td>${r.teams[g.a===uid?g.b:g.a].name}</td><td>${g.home===uid?'主':'客'}</td><td>${g.a===uid?g.sa:g.sb} : ${g.a===uid?g.sb:g.sa}</td><td class="${g.winner===uid?'win-text':'loss-text'}">${g.winner===uid?'W':'L'}</td></tr>`).join('')}</tbody></table></div></details><div class="result-actions"><button class="outline-button" id="edit-team">↑ 调整首发阵容</button><button class="primary-button" id="rerun">同阵容，再战一季 ↗</button></div><p class="result-footnote">独立随机模拟，仅供娱乐；不对应任何真实 NBA 赛季。对手强度来自 2026-11-09 现役球员评分快照，比赛按球队层面对抗；首发数据与奖项为赛后模拟结果。</p>`;
 renderTable();
}

$('#results').addEventListener('click',e=>{if(busy)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.tab){tab=b.dataset.tab;renderTable();}if(b.id==='edit-team')$('#draft-section').scrollIntoView({behavior:'smooth'});if(b.id==='rerun'){b.disabled=true;b.textContent='正在模拟赛季…';run();}});
for(const id of ['#rules-button','#footer-rules'])$(id).addEventListener('click',()=>$('#rules').showModal());$('#close-rules').addEventListener('click',()=>$('#rules').close());$('#rules').addEventListener('click',e=>{if(e.target===$('#rules')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
renderDraft();renderHistory();
