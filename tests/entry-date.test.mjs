import test from 'node:test';import assert from 'node:assert/strict';
import {previousDay,monthName,resolveDateStatus} from '../entry-date.mjs';
import {summarize} from '../domain.mjs';
test('Ontem respeita viradas de mês, ano e ano bissexto',()=>{
 assert.equal(previousDay('2026-11-01'),'2026-10-31');assert.equal(previousDay('2026-01-01'),'2025-12-31');assert.equal(previousDay('2028-03-01'),'2028-02-29');assert.equal(previousDay('2026-03-01'),'2026-02-28');
 assert.equal(monthName('2026-10-31'),'outubro de 2026');assert.equal(monthName('2026-02-31'),'');
});
test('voltar de data futura para passada desfaz só o previsto automático',()=>{
 assert.deepEqual(resolveDateStatus('2026-11-10','paid',false,'2026-11-09'),{status:'planned',autoPlanned:true});
 assert.deepEqual(resolveDateStatus('2026-10-31','planned',true,'2026-11-09'),{status:'paid',autoPlanned:false});
 assert.deepEqual(resolveDateStatus('2026-10-31','planned',false,'2026-11-09'),{status:'planned',autoPlanned:false});
});
test('lançamento atrasado e correção de data entram no mês da compra',()=>{
 const e={id:'late_entry_01',type:'expense',scope:'personal',owner:'rhian',payer:'rhian',amount:12000,status:'paid',date:'2026-10-31',updated_at:'2026-11-09T12:00:00Z'};
 assert.equal(summarize([e],'rhian','2026-10').expense,12000);assert.equal(summarize([e],'rhian','2026-11').expense,0);
 e.date='2026-11-01';assert.equal(summarize([e],'rhian','2026-10').expense,0);assert.equal(summarize([e],'rhian','2026-11').expense,12000);
});
