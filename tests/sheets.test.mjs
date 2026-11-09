import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
test('planilha sincroniza perfis e casa, preserva data e evita reenvio duplicado',()=>{
 const rows=[];const sheet={appendRow(r){rows.push(r);},setFrozenRows(){},getLastRow(){return rows.length;},getRange(start,col,n,w){return {getValues(){return rows.slice(start-1,start-1+n).map(r=>r.slice());},setNumberFormat(){return this;},setValues(values){values.forEach((r,i)=>rows[start-1+i]=r.slice());return this;}};}};
 const context=vm.createContext({console,Intl,Date,SpreadsheetApp:{openById(){return {getSheetByName(){return rows.length?sheet:null;},insertSheet(){return sheet;}};}},LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}};}}});vm.runInContext(fs.readFileSync(new URL('../google-apps-script/Code.gs',import.meta.url),'utf8'),context);
 const call=(person,path,payload)=>JSON.parse(JSON.stringify(context.dispatch_({person,path,payload})));
 const e={action:'create',id:'oldpurchase01',scope:'house',type:'expense',payer:'rhian',amount:10001,category:'Mercado',date:'2026-01-31',status:'paid'};
 call('rhian','/api/entries',e);call('rhian','/api/entries',e);
 let a=call('amanda','/api/state');assert.equal(a.entries.length,1);assert.equal(a.entries[0].date,'2026-01-31');
 const row=a.entries[0];call('amanda','/api/entries',{...row,action:'update',date:'2026-02-01'});assert.equal(call('rhian','/api/state').entries[0].date,'2026-02-01');assert.throws(()=>call('rhian','/api/entries',{...row,action:'update'}),/mudou/);
 call('rhian','/api/entries',{...e,id:'personal0001',scope:'personal'});assert.equal(call('rhian','/api/state').entries.length,2);assert.equal(call('amanda','/api/state').entries.length,1);
 call('amanda','/api/entries',{...e,id:'series000001',repeat:'installments',count:3});assert.equal(call('rhian','/api/state').entries.filter(e=>e.series==='series000001').reduce((s,e)=>s+e.amount,0),10001);
 assert.throws(()=>call('other','/api/state'),/Escolha/);
});
