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
