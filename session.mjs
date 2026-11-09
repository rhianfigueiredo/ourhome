import {validPublicConfig} from './config-validation.mjs';
const $=s=>document.querySelector(s),config=window.LAR_CONFIG||{};
let person='';try{person=localStorage.getItem('ourhome.person')||'';}catch{}
export function showLogin(message=''){document.body.classList.add('auth-required');$('#loginView').classList.remove('hidden');$('#app').classList.add('hidden');$('#navigation').classList.add('hidden');$('#loginStatus').textContent=message;}
export function showAuthenticated(){document.body.classList.remove('auth-required');$('#loginView').classList.add('hidden');}
export async function request(path,payload){
 if(!['rhian','amanda'].includes(person))throw Object.assign(Error('Escolha quem vai usar.'),{status:401});
 if(!validPublicConfig(config))throw Object.assign(Error('Falta conectar a planilha. Siga o guia de instalação.'),{status:503});
 let result;try{const r=await fetch(config.sheetsUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({person,path,payload}),redirect:'follow',credentials:'omit'});result=await r.json();}catch{throw Object.assign(Error('Não foi possível sincronizar com a planilha. Confira a conexão e a publicação do Apps Script. Atualize antes de reenviar.'),{uncertain:!!payload});}
 if(result.error)throw Object.assign(Error(result.error),{status:400});if(result.person!==person)throw Object.assign(Error('Resposta não confirmada. Atualize antes de repetir.'),{uncertain:!!payload});return result;
}
export async function initAuth(onChange){
 $('#setupNotice').classList.toggle('hidden',validPublicConfig(config));
 document.querySelectorAll('[data-login-person]').forEach(b=>b.onclick=async()=>{person=b.dataset.loginPerson;try{localStorage.setItem('ourhome.person',person);}catch{}$('#loginStatus').textContent='Sincronizando…';b.disabled=true;try{await onChange();}finally{b.disabled=false;}});
 $('#signout').onclick=e=>{e.preventDefault();try{localStorage.removeItem('ourhome.person');for(const k of Object.keys(sessionStorage))if(k.startsWith('lar.v2.draft.'))sessionStorage.removeItem(k);}catch{}location.reload();};
 if(!['rhian','amanda'].includes(person)){showLogin();return false;}return true;
}
