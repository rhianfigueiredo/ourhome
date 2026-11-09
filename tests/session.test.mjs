import test from 'node:test';import assert from 'node:assert/strict';
test('login depende do provedor e registros exigem sessão autenticada',async()=>{
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false,type:'password',validity:{valid:true},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},reset(){}});return nodes.get(id);};
 const people=[node('rhian'),node('amanda')];people[0].dataset.loginPerson='rhian';people[1].dataset.loginPerson='amanda';
 const original={window:globalThis.window,document:globalThis.document,location:globalThis.location};
 let session=null,rejectPassword=true,rpcCalls=0,entered=0;
 const client={auth:{async getSession(){return {data:{session}};},async signInWithPassword(){return rejectPassword?{error:{status:400,code:'invalid_credentials'}}:{data:{session:{user:{id:'fake-id'}}}};},onAuthStateChange(){},async signOut(){return {};},async updateUser(){return {};}},async rpc(){rpcCalls++;return {data:{person:'rhian',entries:[]},status:200};}};
 globalThis.window={LAR_CONFIG:{supabaseUrl:'https://test-example.supabase.co',supabaseKey:'sb_publishable_test'},supabase:{createClient:()=>client}};
 globalThis.document={body:{classList:{add(){},remove(){}},dataset:{}},querySelector:node,querySelectorAll:()=>people};
 globalThis.location={reload(){}};
 try{
  const auth=await import('../session.mjs?unit-auth');
  assert.equal(await auth.initAuth(async()=>{entered++;}),false);
  await assert.rejects(auth.request('/api/state'),e=>e.status===401);assert.equal(rpcCalls,0);
  node('#loginEmail').value='rhianfigueiredo@gmail.com';node('#loginPassword').value='fake-wrong-test-password';
  await node('#loginForm').onsubmit({preventDefault(){}});assert.equal(entered,0);assert.match(node('#loginError').textContent,/E-mail ou senha incorretos/);assert.equal(node('#loginSubmit').disabled,false);
  rejectPassword=false;await node('#loginForm').onsubmit({preventDefault(){}});assert.equal(entered,1);
  session={user:{id:'fake-id'}};assert.equal((await auth.request('/api/state')).person,'rhian');assert.equal(rpcCalls,1);
  client.rpc=async()=>({error:{code:'42501',message:'Esta conta não tem acesso.'},status:403});await assert.rejects(auth.request('/api/state'),e=>e.status===403);
  client.rpc=async()=>({error:{message:'Network failure'},status:0});await assert.rejects(auth.request('/api/entries',{action:'create'}),e=>e.uncertain===true);
 }finally{for(const [key,v]of Object.entries(original))if(v===undefined)delete globalThis[key];else globalThis[key]=v;}
});
