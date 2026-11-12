import crypto from 'node:crypto';

export const SESSION_COOKIE='nba_session';
export const SESSION_TTL_MS=7*24*60*60*1000;

export function validateUsername(value){
 const username=String(value||'').trim();
 if(!/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/.test(username))throw Error('用户名需为 3–20 位中文、字母、数字或下划线');
 return username;
}
export function normalizePhone(value){
 const raw=String(value||'').trim();
 if(!raw)return '';
 const digits=raw.replace(/[^\d+]/g,'').replace(/^\+?86/,'');
 if(!/^1[3-9]\d{9}$/.test(digits))throw Error('请输入有效的 11 位手机号');
 return digits;
}
export function maskPhone(phone){
 const value=String(phone||'');
 return value.length===11?value.slice(0,3)+'****'+value.slice(7):'';
}
export function validatePassword(value){
 const password=String(value||'');
 if(password.length<6||password.length>72)throw Error('密码长度需为 6–72 位');
 return password;
}
export function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
 return {salt,passwordHash:crypto.scryptSync(password,salt,64).toString('hex')};
}
export function verifyPassword(password,user){
 if(!user?.salt||!user?.passwordHash)return false;
 const hash=Buffer.from(crypto.scryptSync(String(password||''),user.salt,64).toString('hex'),'hex');
 const expected=Buffer.from(user.passwordHash,'hex');
 return hash.length===expected.length&&crypto.timingSafeEqual(hash,expected);
}
export function createToken(user,secret,ttlMs=SESSION_TTL_MS){
 const payload=Buffer.from(JSON.stringify({sub:String(user.id),username:user.username,exp:Date.now()+ttlMs})).toString('base64url');
 const signature=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
 return payload+'.'+signature;
}
export function verifyToken(token,secret){
 try{
  const [payload,signature]=String(token||'').split('.');
  if(!payload||!signature)return null;
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!data.exp||data.exp<Date.now())return null;
  return data;
 }catch{return null;}
}
export function parseCookies(header){
 const out={};
 for(const part of String(header||'').split(';')){
  const i=part.indexOf('=');if(i<0)continue;
  const key=part.slice(0,i).trim(),value=part.slice(i+1).trim();
  if(key)out[key]=decodeURIComponent(value);
 }
 return out;
}
export function sessionCookie(token,maxAge=Math.floor(SESSION_TTL_MS/1000)){
 return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
