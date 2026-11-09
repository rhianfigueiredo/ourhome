export function validPublicConfig(c){
 try {
  const u=new URL(c.supabaseUrl);
  if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.username||u.password||u.pathname!=='/'||u.search||u.hash)return false;
  if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(c.supabaseKey))return true;
  const payload=JSON.parse(atob(c.supabaseKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  return payload.role==='anon';
 }catch{return false;}
}
