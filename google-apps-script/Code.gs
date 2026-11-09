const PEOPLE = ['rhian','amanda'];
const EXPENSE_CATEGORIES = ['Mercado','Moradia','Delivery','Transporte','Saúde','Lazer','Educação','Assinaturas','Outros'];
const INCOME_CATEGORIES = ['Salário','Freelance','Extra','Outros'];
function parseMoney(raw) {
 let s=String(raw??'').trim().replace(/^R\$\s*/,'').replace(/\s/g,'');
 if(!s||!/^[\d.,]+$/.test(s))throw Error('Informe um valor válido, como 12,50.');
 if(s.includes(',')) {if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s))throw Error('Use até duas casas de centavos.');s=s.replace(/\./g,'').replace(',','.');}
 else if(s.includes('.')) {if(!/^\d+\.\d{1,2}$/.test(s))throw Error('Use vírgula para centavos; exemplo: 1.234,56.');}
 else if(!/^\d+$/.test(s))throw Error('Valor inválido.');
 const cents=Math.round(Number(s)*100);if(!Number.isSafeInteger(cents)||cents<=0||cents>100000000000)throw Error('Informe um valor entre R$ 0,01 e R$ 1 bilhão.');return cents;
}
function localDate(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s&&s>='2000-01-01'&&s<='2100-12-31';}
function monthShift(date,n){const [y,m,d]=date.split('-').map(Number),t=new Date(Date.UTC(y,m-1+n,1));const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
function shares(cents){const rhian=Math.ceil(cents/2);return {rhian,amanda:cents-rhian};}
function expandEntry(e,repeat='none',count=1){if(!['none','monthly','installments'].includes(repeat)||!Number.isInteger(count)||count<1||count>36)throw Error('Confira a repetição (até 36 meses).');if(repeat==='none')count=1;if(repeat==='installments'&&e.amount<count)throw Error('O total precisa ter ao menos um centavo por parcela.');return Array.from({length:count},(_,i)=>({...e,id:count===1?e.id:`${e.id}_${i+1}`,date:monthShift(e.date,i),amount:repeat==='installments'?Math.floor(e.amount/count)+(i<e.amount%count?1:0):e.amount,status:i===0?e.status:'planned',description:count>1?`${e.description||e.category} · ${i+1}/${count}`:e.description,series:count>1?e.id:null}));}
function attributed(e,person){if(e.scope==='house')return shares(e.amount)[person];return e.owner===person?e.amount:0;}
function summarize(entries,person,month){const current=entries.filter(e=>!e.deleted&&e.date.startsWith(month));const paid=current.filter(e=>e.status==='paid');const income=paid.filter(e=>e.type==='income'&&e.owner===person).reduce((s,e)=>s+e.amount,0);const expense=paid.filter(e=>e.type==='expense').reduce((s,e)=>s+attributed(e,person),0);const personal=paid.filter(e=>e.type==='expense'&&e.scope==='personal'&&e.owner===person).reduce((s,e)=>s+e.amount,0);const house=paid.filter(e=>e.type==='expense'&&e.scope==='house').reduce((s,e)=>s+e.amount,0);const upcoming=current.filter(e=>e.type==='expense'&&e.status==='planned').reduce((s,e)=>s+attributed(e,person),0);return {income,expense,personal,house,houseShare:expense-personal,upcoming,result:income-expense};}
function settlement(entries){let balance=0,paid={rhian:0,amanda:0},owed={rhian:0,amanda:0};for(const e of entries.filter(e=>!e.deleted&&e.status==='paid')){if(e.type==='expense'&&e.scope==='house'){paid[e.payer]+=e.amount;const s=shares(e.amount);owed.rhian+=s.rhian;owed.amanda+=s.amanda;balance+=(e.payer==='rhian'?e.amount:0)-s.rhian;}if(e.type==='settlement')balance+=e.payer==='rhian'?e.amount:-e.amount;}return {balance,paid,owed,from:balance>0?'amanda':'rhian',to:balance>0?'rhian':'amanda',amount:Math.abs(balance)};}
function csv(rows){const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';return '\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n');}

const BOOK_ID='1nnhZSYvQNXTbVSOoOY_h6C49RFqtdXc70zo7jXuuRU0';
const TABLES=['entries','goals','contributions','budgets','reviews','preferences'];
function doGet(){return output_({ok:true,message:'Lar em dia · conexão com a planilha disponível'});}
function doPost(e){try{const b=JSON.parse(e.postData.contents||'{}');return output_(dispatch_(b));}catch(err){return output_({error:err.message||'Não foi possível concluir.'});}}
function output_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function storage_(){const book=SpreadsheetApp.openById(BOOK_ID);let sheet=book.getSheetByName('LarDados');if(!sheet){sheet=book.insertSheet('LarDados');sheet.appendRow(['Tipo','ID','Pessoa','Data','Categoria','Descrição','Valor (centavos)','Situação','Dados do aplicativo']);sheet.setFrozenRows(1);}return sheet;}
function load_(sheet){const db={};TABLES.forEach(k=>db[k]=[]);if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,9).getValues().forEach(r=>{if(TABLES.includes(r[0])&&r[8])db[r[0]].push(JSON.parse(r[8]));});return db;}
function save_(sheet,db){const rows=[];TABLES.forEach(t=>db[t].forEach(r=>rows.push([t,r.id||r.member||r.owner+'_'+r.month+'_'+r.category,r.owner||r.member||'',r.date||r.week||r.deadline||'',r.category||'',safe_(r.description||r.name||''),r.amount||r.target||'',r.deleted?'excluído':r.status||'',JSON.stringify(r)])));const n=Math.max(rows.length,sheet.getLastRow()-1);if(n){while(rows.length<n)rows.push(Array(9).fill(''));sheet.getRange(2,1,n,9).setNumberFormat('@').setValues(rows);}}
function safe_(v){return /^[=+@\-]/.test(String(v))?"'"+v:v;}
function require_(ok,message){if(!ok)throw Error(message);}
function amount_(n,zero){require_(Number.isSafeInteger(n)&&n>=(zero?0:1)&&n<=100000000000,'Confira o valor.');return n;}
function id_(v){require_(/^[a-zA-Z0-9_-]{8,90}$/.test(v||''),'Identificador inválido.');return v;}
function date_(v){require_(validDate(v),'Confira a data.');return v;}
function visible_(r,p){return r&&(r.scope==='house'||r.owner==='house'||r.owner===p);}
function state_(db,p){const es=db.entries.filter(e=>visible_(e,p));const goals=db.goals.filter(g=>!g.deleted&&visible_(g,p));const both=PEOPLE.every(p=>db.preferences.some(r=>r.member===p&&r.shareIncome));const totals={};if(both)db.entries.filter(e=>!e.deleted&&e.type==='income'&&e.status==='paid').forEach(e=>{const m=e.date.slice(0,7);totals[m]=(totals[m]||0)+e.amount;});return {person:p,entries:es.filter(e=>!e.deleted),trash:es.filter(e=>e.deleted),goals,contributions:db.contributions.filter(c=>goals.some(g=>g.id===c.goal_id)),budgets:db.budgets.filter(r=>visible_(r,p)),reviews:db.reviews,shareIncome:!!db.preferences.find(r=>r.member===p&&r.shareIncome),combinedIncome:both?Object.keys(totals).map(month=>({month,amount:totals[month]})):null,today:localDate()};}
function dispatch_(b){require_(PEOPLE.includes(b.person),'Escolha Rhian ou Amanda.');const lock=LockService.getScriptLock();lock.waitLock(20000);try{const sheet=storage_(),db=load_(sheet);if(b.path!=='/api/state'){mutate_(db,b.person,b.path,b.payload||{});save_(sheet,db);}return state_(db,b.person);}finally{lock.releaseLock();}}
function mutate_(db,p,path,b){
 if(path==='/api/entries'){
  const id=id_(b.id),existing=db.entries.find(e=>e.id===id);
  if(b.action==='create'){
   require_(['expense','income','settlement'].includes(b.type),'Tipo inválido.');const scope=b.type==='income'?'personal':b.type==='settlement'?'house':b.scope;
   require_(['house','personal'].includes(scope),'Escolha Casa ou Pessoal.');const payer=scope==='personal'?p:b.payer;require_(PEOPLE.includes(payer),'Escolha quem pagou.');
   const category=b.type==='settlement'?'Acerto':b.category;require_(b.type==='settlement'||(b.type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).includes(category),'Categoria inválida.');
   const e={id,owner:scope==='personal'?p:'house',scope,type:b.type,payer,category,amount:amount_(b.amount),date:date_(b.date),status:b.type==='settlement'?'paid':b.status,description:String(b.description||'').trim().slice(0,120),created_by:p,version:1,deleted:false,updated_at:new Date().toISOString()};
   require_(['paid','planned'].includes(e.status),'Situação inválida.');require_(e.status!=='paid'||e.date<=localDate(),'Use Previsto para uma data futura.');const list=expandEntry(e,b.type==='settlement'?'none':b.repeat||'none',Number(b.count||1));
   const found=db.entries.filter(e=>list.some(x=>x.id===e.id));require_(found.every(e=>visible_(e,p)),'Registro indisponível.');if(found.length===list.length)return;require_(!found.length,'Parte da série já existe. Atualize.');db.entries.push(...list);return;
  }
  require_(visible_(existing,p),'Registro indisponível.');require_(b.version===existing.version,'Este registro mudou. Atualize antes de editar.');
  if(b.action==='delete'||b.action==='restore'){existing.deleted=b.action==='delete';}
  else{require_(b.action==='update'&&!existing.deleted,'Ação inválida.');const d=date_(b.date),status=b.status;require_(['paid','planned'].includes(status)&&(existing.type!=='settlement'||status==='paid'),'Situação inválida.');require_(status!=='paid'||d<=localDate(),'Use Previsto para uma data futura.');const category=existing.type==='settlement'?'Acerto':b.category;require_(existing.type==='settlement'||(existing.type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).includes(category),'Categoria inválida.');const payer=existing.scope==='personal'?p:b.payer;require_(PEOPLE.includes(payer),'Escolha quem pagou.');Object.assign(existing,{date:d,status,category,payer,amount:amount_(b.amount),description:String(b.description||'').trim().slice(0,120)});}
  existing.version++;existing.updated_at=new Date().toISOString();return;
 }
 if(path==='/api/goals'){
  const id=id_(b.id),goal=db.goals.find(g=>g.id===id);
  if(b.action==='create'){if(goal){require_(visible_(goal,p),'Meta indisponível.');return;}const name=String(b.name||'').trim().slice(0,70);require_(name,'Dê um nome à meta.');db.goals.push({id,owner:b.owner==='house'?'house':p,name,target:amount_(b.target),deadline:date_(b.deadline),deleted:false});return;}
  require_(b.action==='contribute'&&goal&&!goal.deleted&&visible_(goal,p),'Meta indisponível.');const cid=id_(b.contributionId),old=db.contributions.find(c=>c.id===cid);if(old){require_(old.owner===p&&old.goal_id===id,'Reserva indisponível.');return;}db.contributions.push({id:cid,goal_id:id,owner:p,amount:amount_(b.amount),date:date_(b.date)});return;
 }
 if(path==='/api/budget'){const owner=b.owner==='house'?'house':p;require_(/^20\d{2}-(0[1-9]|1[0-2])$/.test(b.month),'Mês inválido.');require_(b.category==='Total'||EXPENSE_CATEGORIES.includes(b.category),'Categoria inválida.');const row={owner,month:b.month,category:b.category,amount:amount_(b.amount,true)},i=db.budgets.findIndex(r=>r.owner===owner&&r.month===b.month&&r.category===b.category);if(i<0)db.budgets.push(row);else db.budgets[i]=row;return;}
 if(path==='/api/review'){const d=date_(b.week);require_(new Date(d+'T12:00:00Z').getUTCDay()===1&&d<=localDate(),'Semana inválida.');if(!db.reviews.some(r=>r.member===p&&r.week===d))db.reviews.push({member:p,week:d});return;}
 if(path==='/api/preferences'){require_(typeof b.shareIncome==='boolean','Escolha inválida.');const i=db.preferences.findIndex(r=>r.member===p),row={member:p,shareIncome:b.shareIncome};if(i<0)db.preferences.push(row);else db.preferences[i]=row;return;}
 throw Error('Operação indisponível.');
}
