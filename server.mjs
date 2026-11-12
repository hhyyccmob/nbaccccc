import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import {createLobby,joinLobby,startAuction,bid,pass,pickFreeAgent,assignSlots,viewState} from './dist/auction-core.js';

const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json; charset=utf-8'};
const rooms=new Map();
const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode=()=>{let c='';for(let i=0;i<5;i++)c+=codeChars[randomBytes(1)[0]%codeChars.length];return c;};
const send=(res,status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);};
const fail=(res,status,message)=>send(res,status,{error:message});
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>65536){reject(Error('请求过大'));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(Error('JSON 格式错误'));}});req.on('error',reject);});}
function pruneRooms(){const cutoff=Date.now()-2*60*60*1000;for(const [code,room] of rooms)if(room.last<cutoff)rooms.delete(code);}
function roomByCode(code){const room=rooms.get(String(code||'').toUpperCase());if(!room)throw Error('房间不存在或已过期');return room;}
function auth(room,token){for(const id of ['A','B'])if(room.tokens[id]===token)return id;throw Error('登录状态失效');}
async function handleApi(req,res,pathname,url){
 try{
  if(pathname==='/api/auction/rooms'&&req.method==='POST'){
   pruneRooms();const body=await readBody(req);const code=makeCode();const state=createLobby(body.mode||'full',String(body.name||'房主').slice(0,16));const token=randomUUID();rooms.set(code,{state,tokens:{A:token,B:null},last:Date.now()});return send(res,200,{code,token,playerId:'A',state:viewState(state,'A')});
  }
  const join=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/join$/);
  if(join&&req.method==='POST'){
   const room=roomByCode(join[1]);const body=await readBody(req);const token=randomUUID();joinLobby(room.state,String(body.name||'挑战者').slice(0,16));room.tokens.B=token;room.last=Date.now();return send(res,200,{code:join[1].toUpperCase(),token,playerId:'B',state:viewState(room.state,'B')});
  }
  const stateMatch=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/state$/);
  if(stateMatch&&req.method==='GET'){
   const room=roomByCode(stateMatch[1]);const token=url.searchParams.get('token')||'';const playerId=auth(room,token);room.last=Date.now();return send(res,200,{state:viewState(room.state,playerId)});
  }
  const actionMatch=pathname.match(/^\/api\/auction\/rooms\/([A-Z0-9]{5})\/action$/);
  if(actionMatch&&req.method==='POST'){
   const room=roomByCode(actionMatch[1]);const body=await readBody(req);const playerId=auth(room,body.token||'');const {type}=body;
   if(type==='start'){if(playerId!=='A')throw Error('只有房主可以开始');startAuction(room.state,randomBytes(4).readUInt32LE(0));}
   else if(type==='bid')bid(room.state,playerId,body.amount);
   else if(type==='pass')pass(room.state,playerId);
   else if(type==='pick')pickFreeAgent(room.state,playerId,Number(body.poolIndex));
   else if(type==='assign')assignSlots(room.state,playerId,body.slots);
   else throw Error('未知操作');
   room.last=Date.now();return send(res,200,{state:viewState(room.state,playerId)});
  }
  return fail(res,404,'接口不存在');
 }catch(e){return fail(res,400,e.message||'请求失败');}
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);
  if(pathname.startsWith('/api/auction/'))return handleApi(req,res,pathname,url);
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
