import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import {createLobby,joinLobby,startAuction,bid,pass,pickFreeAgent,assignSlots,viewState} from './dist/auction-core.js';
import {validateUsername,validatePassword,normalizePhone,maskPhone,hashPassword,verifyPassword,createToken,verifyToken,parseCookies,sessionCookie,SESSION_COOKIE} from './auth-core.js';

const root=fileURLToPath(new URL('./dist/',import.meta.url));
const dataDir=process.env.DATA_DIR?path.resolve(process.env.DATA_DIR):fileURLToPath(new URL('./data/',import.meta.url));
if(!fs.existsSync(dataDir))fs.mkdirSync(dataDir,{recursive:true});
const usersFile=path.join(dataDir,'users.json');
const roomsFile=path.join(dataDir,'rooms.json');
const secretFile=path.join(dataDir,'auth-secret');
if(!fs.existsSync(secretFile))fs.writeFileSync(secretFile,randomBytes(32).toString('hex'),{encoding:'utf8',mode:0o600});
const authSecret=fs.readFileSync(secretFile,'utf8').trim();
function loadUsers(){try{const data=JSON.parse(fs.readFileSync(usersFile,'utf8'));if(Array.isArray(data.users))return {nextId:Number(data.nextId)||1,users:data.users};}catch{}return {nextId:1,users:[]};}
let userStore=loadUsers();
function saveUsers(){const tmp=usersFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(userStore,null,2));fs.renameSync(tmp,usersFile);}
const publicUser=user=>user?{id:user.id,username:user.username,phoneMasked:maskPhone(user.phone),createdAt:user.createdAt,lastLoginAt:user.lastLoginAt}:null;
const findUserByLower=lower=>userStore.users.find(u=>u.usernameLower===lower);
const findUserById=id=>userStore.users.find(u=>String(u.id)===String(id));
const findUserByPhone=phone=>phone?userStore.users.find(u=>u.phone===phone):null;
function currentUser(req){
 const token=parseCookies(req.headers.cookie||'')[SESSION_COOKIE];
 const data=verifyToken(token,authSecret);
 if(!data)return null;
 return findUserById(data.sub)||null;
}
function registerUser(username,password,phone){
 const display=validateUsername(username),pw=validatePassword(password),lower=display.toLowerCase(),normalizedPhone=normalizePhone(phone);
 if(findUserByLower(lower))throw Error('用户名已存在');
 if(normalizedPhone&&findUserByPhone(normalizedPhone))throw Error('手机号已注册');
 const {salt,passwordHash}=hashPassword(pw);
 const user={id:userStore.nextId++,username:display,usernameLower:lower,phone:normalizedPhone,salt,passwordHash,createdAt:new Date().toISOString(),lastLoginAt:new Date().toISOString()};
 userStore.users.push(user);saveUsers();return user;
}
function loginUser(identifier,password){
 const value=String(identifier||'').trim(),lower=value.toLowerCase();let user=findUserByLower(lower);
 if(!user){try{user=findUserByPhone(normalizePhone(value));}catch{}}
 if(!user||!verifyPassword(password,user))throw Error('用户名或密码错误');
 user.lastLoginAt=new Date().toISOString();saveUsers();return user;
}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json; charset=utf-8'};
const rooms=new Map();
const eventClients=new Map();
function loadRooms(){try{const data=JSON.parse(fs.readFileSync(roomsFile,'utf8'));const cutoff=Date.now()-2*60*60*1000;for(const room of data.rooms||[]){if(room.last>=cutoff&&room.code&&room.state){room.state.config=room.state.config||{budget:20,rosterSize:5,lotCount:10};rooms.set(room.code,room);}}}catch{}}function saveRooms(){const tmp=roomsFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify({rooms:[...rooms.values()]},null,2));fs.renameSync(tmp,roomsFile);}loadRooms();
function sendEvent(res,payload){res.write('data: '+JSON.stringify(payload)+'\n\n');}
function broadcastRoom(code,room){const set=eventClients.get(code);if(!set)return;for(const client of set){try{sendEvent(client.res,{type:'state',state:viewState(room.state,client.playerId)});}catch{}}}
const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode=()=>{let c='';for(let i=0;i<5;i++)c+=codeChars[randomBytes(1)[0]%codeChars.length];return c;};
const send=(res,status,body,type='application/json; charset=utf-8',headers={})=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store',...headers});res.end(type.startsWith('application/json')?JSON.stringify(body):body);};
const fail=(res,status,message)=>send(res,status,{error:message});
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>65536){reject(Error('请求过大'));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(Error('JSON 格式错误'));}});req.on('error',reject);});}
function pruneRooms(){const cutoff=Date.now()-2*60*60*1000;let changed=false;for(const [code,room] of rooms)if(room.last<cutoff){rooms.delete(code);changed=true;}if(changed)saveRooms();}
function roomByCode(code){const room=rooms.get(String(code||'').toUpperCase());if(!room)throw Error('房间不存在或已过期');return room;}
function roomPlayer(room,token){for(const id of ['A','B'])if(room.tokens[id]===token)return id;throw Error('房间登录状态失效');}
function requireRoomUser(room,playerId,user){if(room.users?.[playerId]!==user.id)throw Error('当前账号不属于这个房间');}
async function handleApi(req,res,pathname,url){
 try{
  if(pathname==='/api/auth/register'&&req.method==='POST'){
   const body=await readBody(req),user=registerUser(body.username,body.password,body.phone),token=createToken(user,authSecret);
   return send(res,200,{user:publicUser(user)},'application/json; charset=utf-8',{'Set-Cookie':sessionCookie(token)});
  }
  if(pathname==='/api/auth/login'&&req.method==='POST'){
   const body=await readBody(req),user=loginUser(body.identifier||body.username,body.password),token=createToken(user,authSecret);
   return send(res,200,{user:publicUser(user)},'application/json; charset=utf-8',{'Set-Cookie':sessionCookie(token)});
  }
  if(pathname==='/api/auth/me'&&req.method==='GET'){
   const user=currentUser(req);if(!user)return fail(res,401,'未登录');return send(res,200,{user:publicUser(user)});
  }
  if(pathname==='/api/auth/logout'&&req.method==='POST')return send(res,200,{ok:true},'application/json; charset=utf-8',{'Set-Cookie':sessionCookie('',0)});
  if(pathname==='/api/auction/rooms'&&req.method==='POST'){
   const user=currentUser(req);if(!user)return fail(res,401,'请先登录再创建房间');
   pruneRooms();const body=await readBody(req);const code=makeCode();const state=createLobby(body.mode||'full',user.username,{budget:body.budget});const token=randomUUID();
   rooms.set(code,{code,state,tokens:{A:token,B:null},users:{A:user.id,B:null},last:Date.now()});saveRooms();
   return send(res,200,{code,token,playerId:'A',state:viewState(state,'A')});
  }
  const join=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/join$/);
  if(join&&req.method==='POST'){
   const user=currentUser(req);if(!user)return fail(res,401,'请先登录再加入房间');
   const room=roomByCode(join[1]);const token=randomUUID();joinLobby(room.state,user.username);room.tokens.B=token;room.users.B=user.id;room.last=Date.now();
   saveRooms();broadcastRoom(join[1].toUpperCase(),room);return send(res,200,{code:join[1].toUpperCase(),token,playerId:'B',state:viewState(room.state,'B')});
  }
  const eventsMatch=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/events$/);
  if(eventsMatch&&req.method==='GET'){
   const user=currentUser(req);if(!user)return fail(res,401,'登录状态失效');
   const room=roomByCode(eventsMatch[1]),token=url.searchParams.get('token')||'',playerId=roomPlayer(room,token);
   requireRoomUser(room,playerId,user);room.last=Date.now();saveRooms();
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});
   res.write(': connected\n\n');sendEvent(res,{type:'state',state:viewState(room.state,playerId)});
   const client={res,playerId};const code=eventsMatch[1].toUpperCase();if(!eventClients.has(code))eventClients.set(code,new Set());eventClients.get(code).add(client);
   const heartbeat=setInterval(()=>{try{res.write(': ping\n\n');}catch{}},20000);
   req.on('close',()=>{clearInterval(heartbeat);const set=eventClients.get(code);if(set){set.delete(client);if(!set.size)eventClients.delete(code);}});
   return;
  }
  const stateMatch=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/state$/);
  if(stateMatch&&req.method==='GET'){
   const user=currentUser(req);if(!user)return fail(res,401,'登录状态失效');
   const room=roomByCode(stateMatch[1]),token=url.searchParams.get('token')||'',playerId=roomPlayer(room,token);
   requireRoomUser(room,playerId,user);const eventRoom=room;eventRoom.last=Date.now();saveRooms();broadcastRoom(stateMatch[1].toUpperCase(),eventRoom);return send(res,200,{state:viewState(room.state,playerId)});
  }
  const actionMatch=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/action$/);
  if(actionMatch&&req.method==='POST'){
   const user=currentUser(req);if(!user)return fail(res,401,'登录状态失效');
   const room=roomByCode(actionMatch[1]),body=await readBody(req),playerId=roomPlayer(room,body.token||'');
   requireRoomUser(room,playerId,user);
   const {type}=body;
   if(type==='start'){if(playerId!=='A')throw Error('只有房主可以开始');startAuction(room.state,randomBytes(4).readUInt32LE(0));}
   else if(type==='bid')bid(room.state,playerId,body.amount);
   else if(type==='pass')pass(room.state,playerId);
   else if(type==='pick')pickFreeAgent(room.state,playerId,Number(body.poolIndex));
   else if(type==='assign')assignSlots(room.state,playerId,body.slots);
   else throw Error('未知操作');
   room.last=Date.now();saveRooms();broadcastRoom(actionMatch[1].toUpperCase(),room);return send(res,200,{state:viewState(room.state,playerId)});
  }
  return fail(res,404,'接口不存在');
 }catch(e){const status=/登录/.test(e.message||'')?401:400;return fail(res,status,e.message||'请求失败');}
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
  if(pathname.startsWith('/api/'))return handleApi(req,res,pathname,url);
  if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('ok');return;}
  if(pathname==='/auction'){res.writeHead(302,{Location:'/auction.html'+url.search});res.end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end('Bad request');}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'0.0.0.0',()=>{
 const nets=os.networkInterfaces();const lan=Object.values(nets).flat().find(n=>n&&n.family==='IPv4'&&!n.internal)?.address;
 console.log(`Local: http://127.0.0.1:${port}`);if(lan)console.log(`LAN:   http://${lan}:${port}`);
});
