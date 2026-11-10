import {validPublicConfig} from './config-validation.mjs';
const $=s=>document.querySelector(s),config=window.LAR_CONFIG||{};
let person='',pendingRead=null;try{person=localStorage.getItem('ourhome.person')||'';}catch{}
export function showLogin(message=''){document.body.classList.add('auth-required');$('#loginView').classList.remove('hidden');$('#app').classList.add('hidden');$('#navigation').classList.add('hidden');$('#loginStatus').textContent=message;}
export function showAuthenticated(){document.body.classList.remove('auth-required');$('#loginView').classList.add('hidden');}
export async function request(path,payload){
 if(!['rhian','amanda'].includes(person))throw Object.assign(Error('Escolha quem vai usar.'),{status:401});
 if(!validPublicConfig(config))throw Object.assign(Error('Falta conectar a planilha. Siga o guia de instalação.'),{status:503});
 if(!payload&&pendingRead)return pendingRead;
 const selected=person;
 const operation=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),payload?65000:45000);
  let result;try{const r=await fetch(config.sheetsUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({person:selected,path,payload}),redirect:'follow',credentials:'omit',signal:controller.signal});result=await r.json();}catch(e){throw Object.assign(Error(e.name==='AbortError'?'A planilha demorou para responder. Tente novamente. Se estava salvando, atualize antes de reenviar.':'Não foi possível sincronizar com a planilha. Confira a conexão e a publicação do Apps Script. Atualize antes de reenviar.'),{uncertain:!!payload});}finally{clearTimeout(timer);}
  if(result.error)throw Object.assign(Error(result.error),{status:400});if(result.person!==selected||person!==selected)throw Object.assign(Error('Resposta não confirmada. Atualize antes de repetir.'),{uncertain:!!payload});return result;
 })();
 if(payload)return operation;
 pendingRead=operation;try{return await operation;}finally{if(pendingRead===operation)pendingRead=null;}
}
export async function initAuth(onChange){
 $('#setupNotice').classList.toggle('hidden',validPublicConfig(config));
 const buttons=[...document.querySelectorAll('[data-login-person]')];
 buttons.forEach(b=>b.onclick=async()=>{if(buttons.some(x=>x.disabled))return;person=b.dataset.loginPerson;try{localStorage.setItem('ourhome.person',person);}catch{}$('#loginStatus').textContent='Sincronizando…';buttons.forEach(x=>x.disabled=true);try{await onChange();}catch(e){showLogin(e.message||'Não foi possível sincronizar. Tente novamente.');}finally{buttons.forEach(x=>x.disabled=false);}});
 $('#signout').onclick=e=>{e.preventDefault();try{localStorage.removeItem('ourhome.person');for(const k of Object.keys(sessionStorage))if(k.startsWith('lar.v2.draft.'))sessionStorage.removeItem(k);}catch{}location.reload();};
 if(!['rhian','amanda'].includes(person)){showLogin();return false;}return true;
}
