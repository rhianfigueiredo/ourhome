import {validPublicConfig} from './config-validation.mjs';
const $=s=>document.querySelector(s);
const config=window.LAR_CONFIG||{};
let client=null;
if(validPublicConfig(config)&&window.supabase?.createClient){
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'ourhome.auth'},
  global:{headers:{'X-Client-Info':'ourhome-github-pages'}}
 });
}
export function showLogin(message=''){
 document.body.classList.add('auth-required');
 $('#loginView').classList.remove('hidden');
 $('#app').classList.add('hidden');$('#navigation').classList.add('hidden');$('#accessError').classList.add('hidden');
 $('#loginError').textContent=message;$('#loginSubmit').disabled=!client;
}
export function showAuthenticated(){
 document.body.classList.remove('auth-required');$('#loginView').classList.add('hidden');$('#loginPassword').value='';
 $('#loginError').textContent='';$('#loginStatus').textContent='';
}
function loginError(error){
 if(error?.message?.includes('fetch')||error?.name==='AuthRetryableFetchError')return 'Sem conexão. Confira a internet e tente novamente.';
 if(error?.status===429)return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
 if(error?.code==='email_not_confirmed')return 'O acesso ainda precisa ser confirmado na configuração inicial.';
 if(error?.status===400||error?.code==='invalid_credentials')return 'E-mail ou senha incorretos. Confira e tente novamente.';
 return 'Não foi possível entrar. Tente novamente em instantes.';
}
export async function request(path,body){
 if(!client)throw Object.assign(Error('A configuração inicial do aplicativo ainda não foi concluída.'),{status:503});
 const {data:{session},error:sessionError}=await client.auth.getSession();
 if(sessionError||!session)throw Object.assign(Error('Entre para abrir seu espaço.'),{status:401});
 let result;
 try{result=await client.rpc(body?'lar_mutate':'lar_state',body?{p_path:path,payload:body}:{});}
 catch{throw Object.assign(Error('Sem conexão. Seu rascunho está preservado; atualize antes de reenviar.'),{uncertain:!!body});}
 if(result.error){
  const e=result.error;
  const status=e.code==='42501'?403:e.code==='28000'||result.status===401?401:e.code==='40001'?409:result.status||500;
  const schemaMissing=['PGRST202','PGRST205','42883'].includes(e.code);
  const message=schemaMissing?'O banco ainda precisa da configuração inicial. Consulte o guia de instalação.':e.code==='42501'||e.code==='28000'||e.code==='40001'||e.code==='P0001'?e.message:status===0?'Sem conexão. Atualize antes de reenviar.':status>=500?'Não foi possível confirmar o salvamento. Atualize antes de repetir.':'Não foi possível concluir. Confira os campos e tente novamente.';
  throw Object.assign(Error(message),{status,uncertain:!!body&&(status===0||status>=500)});
 }
 if(!result.data||!['rhian','amanda'].includes(result.data.person))throw Object.assign(Error('A resposta do banco não pôde ser confirmada. Atualize antes de repetir.'),{uncertain:!!body});
 return result.data;
}
export async function initAuth(onChange){
 $('#setupNotice').classList.toggle('hidden',!!client);
 $('#loginSubmit').disabled=!client;
 const choosePerson=person=>{
  const emails={rhian:'rhianfigueiredo@gmail.com',amanda:'uchoaamanda42@gmail.com'};
  $('#loginEmail').value=emails[person];
  document.querySelectorAll('[data-login-person]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.loginPerson===person)));
  $('#loginError').textContent='';$('#loginPassword').focus();
 };
 document.querySelectorAll('[data-login-person]').forEach(b=>b.onclick=()=>choosePerson(b.dataset.loginPerson));
 $('#togglePassword').onclick=()=>{const input=$('#loginPassword'),show=input.type==='password';input.type=show?'text':'password';$('#togglePassword').textContent=show?'Ocultar':'Mostrar';$('#togglePassword').setAttribute('aria-pressed',String(show));};
 $('#loginEmail').oninput=()=>{document.querySelectorAll('[data-login-person]').forEach(b=>b.setAttribute('aria-pressed','false'));$('#loginError').textContent='';};
 $('#loginPassword').oninput=()=>$('#loginError').textContent='';
 $('#loginForm').onsubmit=async e=>{
  e.preventDefault();if(!client)return;
  const email=$('#loginEmail').value.trim().toLowerCase(),password=$('#loginPassword').value;
  $('#loginError').textContent='';
  if(!email||!$('#loginEmail').validity.valid){$('#loginError').textContent='Preencha um e-mail válido.';$('#loginEmail').focus();return;}
  if(!password){$('#loginError').textContent='Preencha sua senha.';$('#loginPassword').focus();return;}
  $('#loginSubmit').disabled=true;$('#loginSubmit').setAttribute('aria-busy','true');$('#loginSubmit').textContent='Entrando…';$('#loginStatus').textContent='Conferindo seu acesso…';
  try{
   const {error}=await client.auth.signInWithPassword({email,password});
   if(error)throw error;
   await onChange();
  }catch(err){$('#loginError').textContent=loginError(err);$('#loginStatus').textContent='';}
  finally{$('#loginSubmit').disabled=false;$('#loginSubmit').setAttribute('aria-busy','false');$('#loginSubmit').textContent='Entrar no meu espaço';}
 };
 $('#signout').onclick=async e=>{
  e.preventDefault();if(!client)return;
  try{for(const key of Object.keys(sessionStorage))if(key.startsWith('lar.v2.draft.'))sessionStorage.removeItem(key);}catch{}
  await client.auth.signOut({scope:'local'});location.reload();
 };
 $('#passwordForm').onsubmit=async e=>{
  e.preventDefault();$('#passwordError').textContent='';$('#passwordSuccess').textContent='';
  const password=$('#newPassword').value;
  if(password.length<6){$('#passwordError').textContent='Use pelo menos 6 caracteres.';$('#newPassword').focus();return;}
  if(password!==$('#confirmPassword').value){$('#passwordError').textContent='As senhas precisam ser iguais.';$('#confirmPassword').focus();return;}
  const b=$('#passwordSubmit');b.disabled=true;b.textContent='Alterando…';
  const {error}=await client.auth.updateUser({password});
  if(error)$('#passwordError').textContent='Não foi possível alterar a senha. Tente novamente.';
  else{$('#passwordForm').reset();$('#passwordSuccess').textContent='Senha atualizada. Use a nova senha no próximo acesso.';}
  b.disabled=false;b.textContent='Salvar nova senha';
 };
 if(!client){showLogin();return false;}
 // A sessão é administrada pelo SDK oficial. Eventos de outra aba limpam a página.
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT')setTimeout(()=>location.reload(),0);
  if(event==='SIGNED_IN'&&session?.user?.id&&document.body.dataset.authUser&&document.body.dataset.authUser!==session.user.id)setTimeout(()=>location.reload(),0);
  if(session?.user?.id)document.body.dataset.authUser=session.user.id;
 });
 const {data:{session}}=await client.auth.getSession();
 if(!session){showLogin();return false;}
 return true;
}
