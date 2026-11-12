import {createLobby,joinLobby,startAuction,bid,pass,pickFreeAgent,assignSlots,viewState,aiBidValue,AUCTION_CONFIG} from './auction-core.js';

const app=document.querySelector('#app');
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOAST_TIME=2500;
const MODE_LABELS={full:'全公开',height:'身高盲拍',team:'球队盲拍'};
const MODE_DESC={full:'姓名、头像、总评和全部能力公开。',height:'只显示身高（cm），姓名、球队、位置、评分与头像隐藏。',team:'只显示巅峰球队和年代，姓名、身高、位置、评分与头像隐藏。'};
const POS_ORDER=['PG','SG','SF','PF','C'];
const POS_LABEL={PG:'控球后卫',SG:'得分后卫',SF:'小前锋',PF:'大前锋',C:'中锋'};
let view=null,game=null,online=null,localAI=false,aiTimer=null,pending=false,toastTimer=null;
const initialParams=new URLSearchParams(location.search);
let infoMode='full',playerName=localStorage.getItem('auction-name')||'',joinCode=(initialParams.get('room')||'').toUpperCase(),assignmentDraft=null,lastScreen='',eventSource=null,reconnectTimer=null,roomBudget=20,aiDifficulty='normal',account=null,authOpen=false,authMode='login',authUsername='',authPhone='',authPassword='',authError='',pendingOnlineAction=null;

function toast(text){const node=$('#toast');if(!node)return;node.textContent=text;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),TOAST_TIME);}
function modeLabel(m){return MODE_LABELS[m]||m;}
function viewerId(){return online?.playerId||'A';}
function myView(){return view;}
function otherId(id){return id==='A'?'B':'A';}
function teamName(id){return view?.teams?.[id]?.name||id;}
function money(n){return `${n} 元`;}
function randomSeed(){return crypto.getRandomValues(new Uint32Array(1))[0];}

async function resumeOnlineFromParams(){
 let code=(initialParams.get('room')||'').toUpperCase(),token=initialParams.get('token')||'';
 if(!code||!token){try{const saved=JSON.parse(localStorage.getItem('auction-session-v1')||'null');if(saved?.code&&saved?.token){code=saved.code;token=saved.token;}}catch{}}
 if(!code||!token)return false;
 try{
  const res=await fetch(`/api/auction/rooms/${encodeURIComponent(code)}/state?token=${encodeURIComponent(token)}`);
  const data=await res.json();if(!res.ok)throw Error(data.error||'恢复房间失败');
  online={code,token,playerId:data.state.viewerId};view=data.state;saveSession();startEvents();render();return true;
 }catch(e){clearSession();toast(e.message||'恢复房间失败');return false;}
}
function startLocalAI(){
 const name=playerName.trim()||'你',aiName=aiDifficulty==='easy'?'简单 AI':aiDifficulty==='hard'?'困难 AI':'普通 AI';
 game=createLobby(infoMode,name,{budget:roomBudget});
 joinLobby(game,aiName);
 startAuction(game,randomSeed());
 online=null;localAI=true;view=viewState(game,'A');assignmentDraft=null;render();scheduleAI();
}
function openAuth(action=null,auth='login'){
 pendingOnlineAction=action;
 authOpen=true;authMode=auth||'login';authError='';authPassword='';authPhone='';render();
}
async function loadAccount(){
 try{
  const res=await fetch('/api/auth/me',{credentials:'same-origin'});
  if(!res.ok){account=null;return;}
  const data=await res.json();account=data.user||null;render();
 }catch{account=null;}
}
async function submitAuth(){
 if(pending)return;pending=true;
 try{
  const endpoint=authMode==='login'?'/api/auth/login':'/api/auth/register';
  const payload=authMode==='login'
   ?{identifier:authUsername,password:authPassword}
   :{username:authUsername,phone:authPhone,password:authPassword};
  const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'登录失败');
  const wasLogin=authMode==='login';
  account=data.user;authOpen=false;authError='';authPassword='';authPhone='';pending=false;render();
  toast((wasLogin?'已登录：':'账号已创建：')+account.username);
  const action=pendingOnlineAction;pendingOnlineAction=null;
  if(action==='create')await createRoom();else if(action==='join')await joinRoom();
 }catch(e){authError=e.message||'登录失败';pending=false;render();}
}
async function logoutAccount(){
 try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});}catch{}
 if(online){stopEvents();clearSession();online=null;view=null;game=null;assignmentDraft=null;}account=null;pendingOnlineAction=null;render();toast('已退出登录');
}
async function createRoom(){
 if(!account){openAuth('create');toast('请先登录再创建房间');return;}
 if(pending)return;pending=true;
 try{
  const res=await fetch('/api/auction/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:playerName.trim()||'房主',mode:infoMode,budget:roomBudget})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'创建房间失败');
  online={code:data.code,token:data.token,playerId:'A'};view=data.state;localAI=false;game=null;saveSession();startEvents();render();
 }catch(e){toast('联机需要启动 node server.mjs。'+e.message);}
 finally{pending=false;}
}
async function joinRoom(){
 if(!account){openAuth('join');toast('请先登录再加入房间');return;}
 if(pending)return;const code=joinCode.trim().toUpperCase();if(code.length<4){toast('请输入房间码');return;}
 pending=true;
 try{
  const res=await fetch(`/api/auction/rooms/${encodeURIComponent(code)}/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:playerName.trim()||'挑战者'})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'加入房间失败');
  online={code:data.code,token:data.token,playerId:'B'};view=data.state;localAI=false;game=null;saveSession();startEvents();render();
 }catch(e){toast('加入失败：'+e.message);}
 finally{pending=false;}
}
async function roomAction(body){
 if(!online)return;const res=await fetch(`/api/auction/rooms/${online.code}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,token:online.token})});
 const data=await res.json();if(!res.ok)throw Error(data.error||'操作失败');view=data.state;render();
}
function saveSession(){
 if(online)localStorage.setItem('auction-session-v1',JSON.stringify({code:online.code,token:online.token,playerId:online.playerId}));
}
function clearSession(){localStorage.removeItem('auction-session-v1');}
function stopEvents(){
 if(eventSource){eventSource.close();eventSource=null;}
 clearTimeout(reconnectTimer);reconnectTimer=null;
}
function startEvents(){
 stopEvents();if(!online)return;
 const url='/api/auction/rooms/'+encodeURIComponent(online.code)+'/events?token='+encodeURIComponent(online.token);
 const source=new EventSource(url,{withCredentials:true});eventSource=source;
 source.onmessage=event=>{
  try{const message=JSON.parse(event.data);if(message.type==='state'){view=message.state;online.playerId=view.viewerId||online.playerId;saveSession();render();}else if(message.type==='error')toast(message.error);}
  catch{toast('联机数据格式错误');}
 };
 source.onerror=()=>{if(eventSource===source){toast('联机连接中断，正在重连…');}};
}

function syncLocal(){if(!game)return;view=viewState(game,'A');render();scheduleAI();}
function scheduleAI(){
 if(!localAI||!game)return;clearTimeout(aiTimer);
 if(game.phase==='auction'&&game.turn==='B')aiTimer=setTimeout(aiTurn,650);
 else if(game.phase==='freePick'&&game.freePick?.chooser==='B')aiTimer=setTimeout(aiPick,650);
 else if(game.phase==='assign'&&!game.teams.B.assignment)aiTimer=setTimeout(aiAssign,500);
}
function aiVisibleValue(p,team){
 const mult=aiDifficulty==='easy'?.75:aiDifficulty==='hard'?1.18:1;
 if(game?.infoMode==='full')return Math.max(2,Math.min(team.budget,Math.round(aiBidValue(p,team.budget)*mult)));
 if(game?.infoMode==='height'){
  let base=3+Math.round((p.heightIn-72)*.8);if(p.heightIn>=82)base+=3;
  return Math.max(2,Math.min(team.budget,Math.round((base+Math.floor(Math.random()*3))*mult)));
 }
 let hash=0;for(const ch of String(p.peakTeam||''))hash=(hash*31+ch.charCodeAt(0))%997;
 return Math.max(2,Math.min(team.budget,Math.round((4+(hash%10)+Math.floor(Math.random()*3))*mult)));
}
function aiTurn(){
 if(!game||game.phase!=='auction'||game.turn!=='B')return;
 const team=game.teams.B,p=game.current;if(!team||!p)return;
 const value=aiVisibleValue(p,team);const min=game.currentBid>0?game.currentBid+1:1;
 if(team.roster.length<5&&value>=min){const amount=Math.min(team.budget,Math.max(min,min+Math.floor(Math.random()*3)));bid(game,'B',amount);}else pass(game,'B');
 syncLocal();
}
function aiPick(){
 if(!game||game.phase!=='freePick'||game.freePick?.chooser!=='B')return;
 const pool=game.freePick.pool;let best=0;
 if(game.infoMode==='full'){for(let i=1;i<pool.length;i++)if(pool[i].ovr>pool[best].ovr)best=i;}
 else if(game.infoMode==='height'){for(let i=1;i<pool.length;i++)if(pool[i].heightIn>pool[best].heightIn)best=i;}
 else best=Math.floor(Math.random()*pool.length);
 pickFreeAgent(game,'B',best);syncLocal();
}
function defaultSlots(roster){
 const slots=Array(5).fill(null),used=new Set();
 for(const p of roster){const i=POS_ORDER.indexOf(p.pos);if(i>=0&&!slots[i]){slots[i]=p.id;used.add(p.id);}}
 for(let i=0;i<5;i++){if(!slots[i]){const p=roster.find(x=>!used.has(x.id));if(p){slots[i]=p.id;used.add(p.id);}}}
 return slots;
}
function aiAssign(){
 if(!game||game.phase!=='assign'||game.teams.B.assignment)return;
 assignSlots(game,'B',defaultSlots(game.teams.B.roster));syncLocal();
}

async function submitBid(){
 const input=$('#bid-amount');if(!input)return;const amount=Number(input.value);
 try{if(online)await roomAction({type:'bid',amount});else{bid(game,'A',amount);syncLocal();}}catch(e){toast(e.message);}
}
async function submitPass(){
 try{if(online)await roomAction({type:'pass'});else{pass(game,'A');syncLocal();}}catch(e){toast(e.message);}
}
async function chooseFree(index){
 try{if(online)await roomAction({type:'pick',poolIndex:index});else{pickFreeAgent(game,'A',index);syncLocal();}}catch(e){toast(e.message);}
}
async function submitLineup(){
 if(!assignmentDraft)return;
 if(new Set(assignmentDraft).size!==5){toast('五个位置不能重复使用同一名球员');return;}
 try{if(online)await roomAction({type:'assign',slots:assignmentDraft});else{assignSlots(game,'A',assignmentDraft);syncLocal();}}catch(e){toast(e.message);}
}
function ensureDraft(){
 const roster=view?.teams?.[viewerId()]?.roster;
 if(!roster||roster.length!==5){assignmentDraft=null;return;}
 const ids=roster.map(p=>p.id);
 if(!assignmentDraft||assignmentDraft.length!==5||assignmentDraft.some(id=>!ids.includes(id)))assignmentDraft=defaultSlots(roster);
}

function render(){
 const phase=online||localAI?view?.phase:null;
 let next='landing';
 if(!view){app.innerHTML=renderLanding();next='landing';}
 else if(phase==='lobby'){app.innerHTML=renderRoom();next='room';}
 else if(phase==='auction'||phase==='freePick'){app.innerHTML=renderAuction();next='auction';}
 else if(phase==='assign'){ensureDraft();app.innerHTML=renderAssign();next='assign';}
 else if(phase==='done'){app.innerHTML=renderSeries();next='series';}
 else{app.innerHTML=renderLanding();next='landing';}
 if(authOpen)app.insertAdjacentHTML('beforeend',renderAuthModal());
 if(next!==lastScreen){lastScreen=next;window.scrollTo({top:0,behavior:'smooth'});}
}

function renderLanding(){
 const phoneLine=account?.phoneMasked?`<small>${esc(account.phoneMasked)}</small>`:'';
 const accountMarkup=account?`<div class="account-strip logged"><div><span>联机账号</span><strong>${esc(account.username)}</strong>${phoneLine}</div><button type="button" class="button account-logout" data-auth-logout>退出登录</button></div>`:`<div class="account-strip"><div><span>联机需要账号</span><strong>登录后创建或加入房间</strong></div><button type="button" class="button account-login" data-auth-open>登录 / 注册</button></div>`;
 return `<section class="landing">
  <div class="landing-hero"><div class="eyebrow"><span></span> AUCTION ROOM / 2 PLAYERS</div><h1>历史球星<br><em>竞拍室</em></h1><p>每人默认 20 元，预算可设置；10 名历史球星随机上拍。公开加价、盲拍博弈，最后把阵容排进五个位置，打一轮七场四胜。</p><div class="landing-stats"><span><b>20</b> 初始预算</span><span><b>10</b> 名拍品</span><span><b>5</b> 人阵容</span><span><b>BO7</b> 系列赛</span></div></div>
  <div class="landing-grid">
   <section class="setup-card"><div class="eyebrow">CREATE / JOIN</div><h2>进入竞拍室</h2>
    ${accountMarkup}
    <label class="field-label">单机昵称<input id="player-name" maxlength="16" value="${esc(playerName)}" placeholder="仅单机 AI 使用"></label>
    <div class="field-label">信息模式</div>
    <div class="mode-grid">${Object.entries(MODE_LABELS).map(([key,label])=>`<button type="button" class="mode-card ${infoMode===key?'selected':''}" data-info-mode="${key}"><b>${label}</b><small>${MODE_DESC[key]}</small></button>`).join('')}</div>
    <label class="field-label">房间预算<select id="room-budget"><option value="20" ${roomBudget===20?'selected':''}>20 元</option><option value="30" ${roomBudget===30?'selected':''}>30 元</option><option value="50" ${roomBudget===50?'selected':''}>50 元</option></select></label>
    <div class="action-row"><button class="button primary" id="create-room">创建房间 →</button><div class="join-row"><input id="join-code" maxlength="5" value="${esc(joinCode)}" placeholder="房间码"><button class="button secondary" id="join-room">加入</button></div></div>
    <div class="divider"><span>或者</span></div>
    <label class="field-label">AI 难度<select id="ai-difficulty"><option value="easy" ${aiDifficulty==='easy'?'selected':''}>简单</option><option value="normal" ${aiDifficulty==='normal'?'selected':''}>普通</option><option value="hard" ${aiDifficulty==='hard'?'selected':''}>困难</option></select></label>
    <button class="button ai-button" id="play-ai">单机对战 AI <span>↗</span></button>
    <p class="hint">房间码联机会使用账号昵称，需要先运行 <code>node server.mjs</code>。单机模式无需登录和联网。</p>
   </section>
   <aside class="landing-rules"><div class="eyebrow">THE RULES</div><h3>20 元，五个人。</h3><ul><li>公开轮流加价，起拍 1 元，可以一次加多档。</li><li>每队最多 5 人，可以花光预算。</li><li>一队满 5 人，剩余球员免费归另一队。</li><li>一队花光钱，另一队先从剩余池免费挑选。</li><li>盲拍模式只在双方阵容完整后揭晓完整资料。</li><li>竞拍后自由排阵，模拟七场四胜。</li></ul></aside>
  </div>
 </section>`;
}
function renderAuthModal(){
 const phoneField=authMode==='register'?`<label class="field-label">手机号（选填，用于登录）<input id="auth-phone" type="tel" maxlength="16" autocomplete="tel" value="${esc(authPhone)}" placeholder="11 位手机号，可不填"></label>`:'';
 const identifierLabel=authMode==='login'?'用户名或手机号':'昵称';
 const identifierPlaceholder=authMode==='login'?'输入用户名或 11 位手机号':'3–20 位中文、字母、数字或下划线';
 return `<div class="auth-overlay" data-auth-overlay><section class="auth-modal" role="dialog" aria-modal="true" aria-label="账号登录"><button type="button" class="auth-close" data-auth-close aria-label="关闭">×</button><div class="eyebrow">ACCOUNT / ONLINE PLAY</div><h2>${authMode==='login'?'登录账号':'创建账号'}</h2><div class="auth-tabs"><button type="button" class="${authMode==='login'?'active':''}" data-auth-mode="login">登录</button><button type="button" class="${authMode==='register'?'active':''}" data-auth-mode="register">注册</button></div><label class="field-label">${identifierLabel}<input id="auth-username" maxlength="20" autocomplete="username" value="${esc(authUsername)}" placeholder="${identifierPlaceholder}"></label>${phoneField}<label class="field-label">密码<input id="auth-password" type="password" maxlength="72" autocomplete="${authMode==='login'?'current-password':'new-password'}" placeholder="至少 6 位"></label>${authError?`<p class="auth-error">${esc(authError)}</p>`:''}<button type="button" class="button primary auth-submit" id="auth-submit">${authMode==='login'?'登录':'创建账号'} →</button><p class="auth-note">账号保存在当前服务器的 <code>data/users.json</code>，密码使用 scrypt 哈希，不保存明文。手机号只作为登录标识，当前不发送短信验证码。</p></section></div>`;
}
function renderRoom(){
 const host=view.teams.A,guest=view.teams.B;
 return `<section class="room-screen"><div class="room-heading"><div><div class="eyebrow">PRIVATE AUCTION ROOM</div><h1>等待开拍</h1><p>${modeLabel(view.infoMode)} · ${guest?'两名玩家已到场':'等待另一位玩家加入'}</p></div><a class="button secondary back-link" href="./index.html">← 返回赛季模式</a></div>
  <div class="room-code-card"><span>房间码</span><strong>${view.code||online?.code||''}</strong><button class="button secondary" data-copy="${online?.code||''}">复制房间码</button><small>把房间码发给朋友，让 TA 在首页输入加入。</small></div>
  <div class="room-players"><div class="room-player you"><span>房主</span><strong>${esc(host.name)}</strong><small>${view.config?.budget||20} 元 · 0 / 5 人</small></div><div class="room-player ${guest?'':'waiting'}"><span>${guest?'挑战者':'等待加入'}</span><strong>${guest?esc(guest.name):'—'}</strong><small>${guest?(view.config?.budget||20)+' 元 · 0 / 5 人':'输入房间码后进入'}</small></div></div>
  <div class="room-actions">${online?.playerId==='A'?`<button class="button primary" id="start-room" ${guest?'':'disabled'}>开始竞拍 <span>→</span></button>`:`<div class="waiting-pill">等待房主开始竞拍…</div>`}</div>
 </section>`;
}
function renderTeamPanel(team,side){
 if(!team)return '';
 const isYou=team.id===viewerId();
 return `<aside class="team-panel ${side} ${isYou?'you':''}"><div class="team-panel-top"><span>${isYou?'你的球队':'对手'}</span><strong>${esc(team.name)}</strong><b>${team.budget}<small> 元</small></b></div><div class="budget-track"><i style="width:${Math.max(0,Math.min(100,team.budget/(view.config?.budget||20)*100))}%"></i></div><div class="roster-count">${team.rosterCount} / 5 人${team.complete?' ✓ 已满':''}</div><div class="roster-list">${(team.roster||[]).map(p=>miniPlayer(p)).join('')||'<span class="empty-roster">还没有球员</span>'}</div></aside>`;
}
function miniPlayer(p){
 if(!p)return '';
 if(p.kind==='full')return `<div class="mini-player full"><img src="${esc(p.photo)}" alt=""><span><b>${esc(p.name)}</b><small>${p.pos} · ${p.ovr} OVR</small></span></div>`;
 if(p.kind==='height')return `<div class="mini-player blind"><span class="mystery">?</span><span><b>身高 ${p.heightCm} cm</b><small>资料保密</small></span></div>`;
 return `<div class="mini-player blind"><span class="mystery">?</span><span><b>${esc(p.peakTeam)}</b><small>${p.year} · 资料保密</small></span></div>`;
}
function lotCard(card,mode){
 if(!card)return '<article class="lot-card empty-lot"><span>等待下一件拍品</span></article>';
 if(card.kind==='full')return `<article class="lot-card lot-full"><div class="lot-photo"><img src="${esc(card.photo)}" alt=""><span class="lot-ovr">${card.ovr}<small>OVR</small></span></div><div class="lot-copy"><div class="lot-meta">${card.pos} · ${esc(card.peakTeam)} · ${card.year}</div><h2>${esc(card.name)}</h2><div class="lot-en">${esc(card.en.toUpperCase())}</div><div class="lot-stats"><span>进攻<b>${card.off}</b></span><span>防守<b>${card.def}</b></span><span>投射<b>${card.shoot}</b></span><span>组织<b>${card.pass}</b></span><span>篮板<b>${card.reb}</b></span></div><small>身高 ${card.heightCm} cm</small></div></article>`;
 if(card.kind==='height')return `<article class="lot-card lot-blind"><div class="mystery-orb">?</div><div class="blind-tag">HEIGHT ONLY</div><strong>${card.heightCm} cm</strong><p>仅公开身高（cm）<br>姓名、球队、位置、能力全部保密</p></article>`;
 return `<article class="lot-card lot-blind"><div class="mystery-orb">?</div><div class="blind-tag">TEAM ONLY</div><strong>${esc(card.peakTeam)}</strong><p>${card.year} · 巅峰球队<br>姓名、身高、位置、能力全部保密</p></article>`;
}
function renderAuction(){
 const current=view.current;
 return `<section class="auction-screen"><div class="auction-topbar"><div><div class="eyebrow">LIVE AUCTION / ${modeLabel(view.infoMode)}</div><h2>第 ${view.round} 轮 <span>· 第 ${view.lotNo} 号拍品</span></h2></div><div class="auction-status"><span class="live-dot"></span>${view.phase==='freePick'?'免费补员':(view.turn?`${teamName(view.turn)} 行动`:'结算中')}</div></div>
  <div class="auction-layout">${renderTeamPanel(view.teams.A,'team-left')}<section class="auction-center">${view.phase==='freePick'?renderFreePick():`${lotCard(current,view.infoMode)}${renderBidPanel()}`}<div class="auction-log"><div class="eyebrow">AUCTION LOG</div>${view.log.slice().reverse().slice(0,8).map(x=>`<p>${esc(x.text)}</p>`).join('')}</div></section>${renderTeamPanel(view.teams.B,'team-right')}</div>
  <div class="auction-note">预算和已买球员公开可见。${view.infoMode==='full'?'本局为全公开模式。':'盲拍资料将在双方阵容完整后统一揭晓。'}</div>
 </section>`;
}
function renderBidPanel(){
 const team=view.teams[viewerId()],min=view.currentBid>0?view.currentBid+1:1,high=view.highBidder?view.teams[view.highBidder].name:'无人',canRaise=view.canBid&&team.budget>=min;
 const summary=`<div class="bid-summary"><div><span>当前最高</span><strong>${view.currentBid||'—'}<small> 元</small></strong></div><div><span>最高出价者</span><b>${esc(high)}</b></div><div><span>起拍价</span><b>1 元</b></div></div>`;
 if(canRaise)return `<div class="bid-box">${summary}<div class="bid-controls"><label class="bid-input"><span>你的出价</span><input id="bid-amount" type="number" min="${min}" max="${team.budget}" value="${min}"></label><div class="quick-bids">${[1,3,5].map(n=>`<button type="button" class="quick-bid" data-bid-add="${n}">+${n}</button>`).join('')}</div><button class="button primary" id="submit-bid">出价 <span>→</span></button><button class="button ghost" id="pass-bid">放弃</button></div></div>`;
 const message=view.canBid?'预算不足，只能放弃。':`等待 ${view.turn?esc(teamName(view.turn)):'结算'} 出价或放弃…`;
 return `<div class="bid-box">${summary}<div class="waiting-bid">${message}</div>${view.canBid?'<div class="pass-only"><button class="button ghost" id="pass-bid">放弃</button></div>':''}</div>`;
}
function renderFreePick(){
 const fp=view.freePick;if(!fp)return '';
 return `<div class="free-pick-panel"><div class="free-pick-head"><div><div class="eyebrow">FREE PICK</div><h2>免费补员</h2><p>${esc(teamName(fp.chooser))} 还可以从剩余池挑选 <b>${fp.picksNeeded}</b> 人；挑剩下的球员将免费归 ${esc(teamName(fp.target))}。</p></div><span class="pick-counter">${fp.picksNeeded}<small> PICKS LEFT</small></span></div><div class="free-pool">${fp.pool.map((p,i)=>`<button type="button" class="free-player ${view.canPick?'clickable':''}" data-free-pick="${i}" ${view.canPick?'':'disabled'}>${miniPlayer(p)}</button>`).join('')}</div>${view.canPick?'<p class="hint">点击一名球员免费加入你的阵容。</p>':`<div class="waiting-pill">等待 ${esc(teamName(fp.chooser))} 选择…</div>`}</div>`;
}
function renderAssign(){
 const my=view.teams[viewerId()],op=view.teams[otherId(viewerId())];ensureDraft();
 return `<section class="assign-screen"><div class="room-heading"><div><div class="eyebrow">LINEUP SETUP</div><h1>安排你的位置</h1><p>球员自然位置与攻防属性不变，放置只影响站位。双方都提交后开始七场四胜。</p></div><span class="mode-pill">${modeLabel(view.infoMode)}</span></div><div class="assign-layout"><div class="assignment-card"><div class="assignment-head"><h3>你的阵容</h3>${my.assignment?'<span class="done-pill">已提交</span>':'<span class="hint">每名球员只能放一个位置</span>'}</div>${my.assignment?renderAssigned(my):`<div class="slot-form">${POS_ORDER.map((slot,i)=>`<label class="slot-row"><span>${slot}<small>${POS_LABEL[slot]}</small></span><select data-slot="${slot}">${my.roster.map(p=>`<option value="${p.id}" ${assignmentDraft[i]===p.id?'selected':''}>${esc(p.name)} · ${p.pos} · ${p.ovr} OVR</option>`).join('')}</select></label>`).join('')}<button class="button primary" id="submit-lineup">确认阵容 →</button></div>`}</div><div class="assignment-card"><div class="assignment-head"><h3>${esc(op.name)} 的阵容</h3>${op.assignment?'<span class="done-pill">已提交</span>':'<span class="hint">等待对手排阵</span>'}</div>${op.assignment?renderAssigned(op):`<div class="op-roster">${op.roster.map(p=>miniPlayer(p)).join('')}</div>`}</div></div></section>`;
}
function renderAssigned(team){
 return `<div class="assigned-list">${POS_ORDER.map((slot,i)=>{const p=team.roster.find(x=>x.id===team.assignment[i]);return `<div class="assigned-row"><span>${slot}</span><b>${esc(p?.name||'—')}</b><small>${p?.pos||''} · ${p?.ovr||''} OVR</small></div>`;}).join('')}</div>`;
}
function renderSeries(){
 const s=view.series;if(!s)return '<div class="loading">正在生成系列赛…</div>';
 const winner=view.teams[s.winner];
 return `<section class="series-screen"><div class="eyebrow">BEST OF SEVEN / FINAL</div><h1>${esc(winner.name)} 赢得系列赛</h1><div class="series-hero"><div><span>冠军</span><strong>${esc(winner.name)}</strong></div><div class="series-score">${Math.max(s.aw,s.bw)} <i>—</i> ${Math.min(s.aw,s.bw)}</div><div><span>系列赛</span><small>${s.games.length} 场 · 七场四胜</small></div></div><div class="series-team-ratings"><div><span>${esc(view.teams.A.name)}</span><b>${s.profiles.A.rating.toFixed(1)}</b><small>阵容强度</small></div><div><span>${esc(view.teams.B.name)}</span><b>${s.profiles.B.rating.toFixed(1)}</b><small>阵容强度</small></div></div><div class="game-list">${s.games.map(g=>`<div class="game-row"><span>G${g.no}</span><span>${teamName(g.home)} 主场</span><strong>${g.sa} : ${g.sb}</strong><b>${teamName(g.winner)}</b></div>`).join('')}</div><div class="series-actions"><button class="button primary" data-new-match>再来一局 →</button><a class="button secondary" href="./index.html">返回赛季模式</a></div></section>`;
}
function renderRules(){
 $('#rules-body').innerHTML=`<ol><li>两名玩家各 20 元，10 名历史球员随机顺序上拍，每队最多 5 人。</li><li>公开轮流加价，起拍 1 元，可以一次加多档；放弃后失去当前球员，下一件拍品可以重新出价。</li><li>不强制留钱。一队买满 5 人后，剩余球员免费归另一队。</li><li>一队花光预算但未满 5 人时，另一队先从剩余池免费挑选；剩下的免费补给花光预算的一方。</li><li>双方都没钱时免费补齐；10 件拍品后两队都没满 5 人，则继续轮流拍流拍球员，一整轮无人出价后免费补齐。</li><li>全公开 / 身高盲拍 / 球队盲拍。盲拍期间只显示对应信息，双方阵容完整后统一揭晓。</li><li>竞拍后自由安排 PG/SG/SF/PF/C，球员自然位置和属性不变。随后模拟七场四胜。</li><li>房间码联机由服务器保存状态；单机模式为普通 AI。</li></ol>`;
}

document.addEventListener('click',async e=>{
 const t=e.target;
 if(t.closest('[data-auth-open]')){openAuth();return;}
 if(t.closest('[data-auth-close]')||t.matches('[data-auth-overlay]')){authOpen=false;pendingOnlineAction=null;authError='';authPassword='';authPhone='';render();return;}
 if(t.closest('[data-auth-logout]')){await logoutAccount();return;}
 const authTab=t.closest('[data-auth-mode]');if(authTab){authMode=authTab.dataset.authMode;authError='';render();return;}
 if(t.closest('#auth-submit')){await submitAuth();return;}
 const mode=t.closest('[data-info-mode]');if(mode){infoMode=mode.dataset.infoMode;render();return;}
 if(t.closest('#create-room')){await createRoom();return;}
 if(t.closest('#join-room')){await joinRoom();return;}
 if(t.closest('#play-ai')){startLocalAI();return;}
 if(t.closest('[data-copy]')){try{await navigator.clipboard.writeText(t.closest('[data-copy]').dataset.copy);toast('房间码已复制');}catch{toast('复制失败，请手动选择房间码');}return;}
 if(t.closest('#start-room')){try{await roomAction({type:'start'});}catch(e){toast(e.message);}return;}
 const add=t.closest('[data-bid-add]');if(add){const input=$('#bid-amount');if(input){input.value=Math.min(Number(input.max),Number(input.value)+Number(add.dataset.bidAdd));}return;}
 if(t.closest('#submit-bid')){await submitBid();return;}
 if(t.closest('#pass-bid')){await submitPass();return;}
 const free=t.closest('[data-free-pick]');if(free){await chooseFree(Number(free.dataset.freePick));return;}
 if(t.closest('#submit-lineup')){await submitLineup();return;}
 if(t.closest('[data-new-match]')){stopEvents();clearSession();view=null;game=null;online=null;localAI=false;assignmentDraft=null;render();return;}
});
document.addEventListener('input',e=>{
 if(e.target.id==='player-name'){playerName=e.target.value;localStorage.setItem('auction-name',playerName);}
 if(e.target.id==='join-code')joinCode=e.target.value.toUpperCase();
 if(e.target.id==='auth-username')authUsername=e.target.value;
 if(e.target.id==='auth-phone')authPhone=e.target.value;
 if(e.target.id==='auth-password')authPassword=e.target.value;
 if(e.target.id==='room-budget')roomBudget=Number(e.target.value)||20;
 if(e.target.id==='ai-difficulty')aiDifficulty=e.target.value;
});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-slot]')){const i=POS_ORDER.indexOf(e.target.dataset.slot);if(i>=0){if(!assignmentDraft)ensureDraft();assignmentDraft[i]=e.target.value;}}
 if(e.target.id==='room-budget')roomBudget=Number(e.target.value)||20;
 if(e.target.id==='ai-difficulty')aiDifficulty=e.target.value;
});
$('#rules-open').addEventListener('click',()=>{$('#rules-dialog').showModal();});
$('#rules-close').addEventListener('click',()=>$('#rules-dialog').close());
$('#rules-dialog').addEventListener('click',e=>{if(e.target===$('#rules-dialog'))e.target.close();});
renderRules();
render();
loadAccount();
resumeOnlineFromParams();
