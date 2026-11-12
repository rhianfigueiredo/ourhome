import {parseMoney,localDate,validDate} from './domain.mjs';
import {cardInstallments,suggestedInvoice} from './cards-domain.mjs';
const $=s=>document.querySelector(s),money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api,lastSuggestion='',payment=null,cardId=crypto.randomUUID();
export function rememberCardDate(){lastSuggestion=$('#purchaseCard').value+'|'+$('#date').value;}
export function isCardPurchase(){return $('#paymentMethod').value==='card';}
export function updatePaymentUI(data,type,edit){
 $('#paymentSection').classList.toggle('hidden',type!=='expense'||!!edit);
 $('#cardPurchaseFields').classList.toggle('hidden',type!=='expense'||!isCardPurchase()||!!edit);
 if(!data)return;
 const card=data.cards?.find(c=>c.id===$('#purchaseCard').value),purchaseDate=$('#date').value;
 const key=card?.id+'|'+purchaseDate;
 if(card&&validDate(purchaseDate)&&key!==lastSuggestion){$('#firstInvoice').value=suggestedInvoice(card,purchaseDate);lastSuggestion=key;}
 const cardMode=type==='expense'&&isCardPurchase()&&!edit;
 $('#status').closest('label').classList.toggle('hidden',cardMode);
 if(cardMode){$('#repeatFields').classList.add('hidden');$('#payer').value=data.person;$('#payer').disabled=true;$('#entryDateLabel').textContent='Data da compra';$('#entryDateHint').textContent='A fatura organiza o pagamento. Você pode registrar uma compra de dias atrás.';}
 $('.amount-label').textContent=cardMode?'Valor total da compra':'Quanto foi?';
 $('#cardBackendNotice').classList.toggle('hidden',data.schemaVersion===2);
 $('#paymentMethod option[value="card"]').disabled=data.schemaVersion!==2;
 for(const id of ['amount','date','status','payer'])$('#'+id).disabled=!!edit?.card_id||(id==='payer'&&cardMode);
 $('#cardEditNotice').classList.toggle('hidden',!edit?.card_id);
 $('#cardPreview').textContent='';
 if(cardMode&&card){try{const list=cardInstallments({id:'preview_0001',amount:parseMoney($('#amount').value),purchased_at:purchaseDate,description:''},card,$('#firstInvoice').value,Number($('#cardCount').value));const varying=list.some(e=>e.amount!==list[0].amount);$('#cardPreview').textContent=list.length+' parcela'+(list.length>1?'s':'')+' · '+money(list[0].amount)+(varying?' (ajuste de centavos nas demais)':' cada')+' · primeiro vencimento '+list[0].date.split('-').reverse().join('/')+'. Total: '+money(list.reduce((s,e)=>s+e.amount,0))+'.';}catch{} }
}
export function cardPayload(data){
 if(!isCardPurchase())return null;
 if(data.schemaVersion!==2)throw Error('Atualize primeiro o Apps Script com a versão de cartões.');
 const card=data.cards?.find(c=>c.id===$('#purchaseCard').value&&c.owner===data.person);if(!card)throw Error('Cadastre e escolha um cartão do seu perfil.');
 const count=Number($('#cardCount').value),firstMonth=$('#firstInvoice').value;
 cardInstallments({id:'validate_001',amount:parseMoney($('#amount').value),purchased_at:$('#date').value,description:''},card,firstMonth,count);
 return {cardId:card.id,count,firstMonth};
}
export function renderCards(data){
 const own=(data.cards||[]).filter(c=>c.owner===data.person),selected=$('#purchaseCard').value;
 $('#purchaseCard').innerHTML='<option value="">Escolha o cartão</option>'+own.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 $('#purchaseCard').value=own.some(c=>c.id===selected)?selected:own.length===1?own[0].id:'';
 $('#cardList').innerHTML=own.length?own.map(c=>{
  const entries=data.entries.filter(e=>e.card_id===c.id),months=[...new Set(entries.map(e=>e.invoice_month))].sort();
  const invoices=months.map(month=>{const rows=entries.filter(e=>e.invoice_month===month),pending=rows.filter(e=>e.status==='planned'),paid=rows.filter(e=>e.status==='paid'),total=pending.reduce((s,e)=>s+e.amount,0),paidTotal=paid.reduce((s,e)=>s+e.amount,0);return `<section class="invoice"><div class="section-head"><h3>Fatura ${month.split('-').reverse().join('/')}</h3><strong>${money(total)}</strong></div><p class="muted small">${pending.length} parcela(s) pendente(s)${paid.length?' · '+money(paidTotal)+' já pagos':''} · vence dia ${c.dueDay}</p><details><summary>Ver compras e parcelas</summary>${rows.map(e=>`<div class="invoice-row"><span>${esc(e.description||e.category)}<small>${esc(e.category)} · ${e.scope==='house'?'Casa · 50/50':'Pessoal'} · compra ${e.purchased_at.split('-').reverse().join('/')} · ${e.status==='paid'?'Pago':'Previsto'}</small></span><strong>${money(e.amount)}</strong></div>`).join('')}</details>${pending.length?`<button class="primary full-width" data-pay-invoice="${esc(c.id)}" data-invoice-month="${month}">Confirmar pagamento · ${money(total)}</button>`:'<p class="green">Fatura paga. Tudo certo por aqui.</p>'}</section>`;}).join('');
  return `<article class="panel"><div class="section-head"><h2>${esc(c.name)}</h2><span class="small">${data.person==='rhian'?'Rhian':'Amanda'}</span></div><p class="muted small">Fecha dia ${c.closingDay} · vence dia ${c.dueDay}</p>${invoices||'<p class="empty">Anote a primeira compra para formar sua fatura.</p>'}</article>`;
 }).join(''):'<div class="empty"><p>Cadastre seu cartão uma vez. Depois, escolha-o ao anotar uma compra.</p></div>';
 $('#cardSetupWarning').classList.toggle('hidden',data.schemaVersion===2);
}
export function initCards(context){api=context;
 $('#paymentMethod').onchange=()=>{if(isCardPurchase()){$('#repeat').value='none';$('#countLabel').classList.add('hidden');}api.update();api.draft();};
 for(const id of ['purchaseCard','cardCount','firstInvoice'])$('#'+id).addEventListener('change',()=>{if(id==='firstInvoice')lastSuggestion=$('#purchaseCard').value+'|'+$('#date').value;api.update();api.draft();});
 $('#addCard').onclick=()=>{$('#cardCreate').classList.toggle('hidden');if(!$('#cardCreate').classList.contains('hidden'))$('#cardName').focus();};
 $('#registerCardFirst').onclick=()=>{api.navigate('cards');$('#cardCreate').classList.remove('hidden');$('#cardName').focus();};
 $('#newCardPurchase').onclick=()=>{api.openNew();$('#paymentMethod').value='card';api.update();};
 $('#cardForm').onsubmit=async e=>{e.preventDefault();$('#cardError').textContent='';const data=api.data();if(data.schemaVersion!==2){$('#cardError').textContent='Atualize o Apps Script antes de cadastrar cartões.';return;}const name=$('#cardName').value.trim(),closingDay=Number($('#closingDay').value),dueDay=Number($('#dueDay').value);if(!name||![closingDay,dueDay].every(d=>Number.isInteger(d)&&d>=1&&d<=31)){$('#cardError').textContent='Preencha o nome e os dias de fechamento e vencimento (1 a 31).';return;}const b=$('#saveCard');b.disabled=true;try{if(await api.mutate('/api/cards',{id:cardId,name,closingDay,dueDay},'#cardError')){cardId=crypto.randomUUID();$('#cardForm').reset();$('#cardCreate').classList.add('hidden');}}finally{b.disabled=false;}};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-pay-invoice]');if(!b)return;const data=api.data(),card=data.cards.find(c=>c.id===b.dataset.payInvoice),rows=data.entries.filter(e=>e.card_id===card.id&&e.invoice_month===b.dataset.invoiceMonth&&e.status==='planned');payment={id:crypto.randomUUID(),cardId:card.id,month:b.dataset.invoiceMonth,entryIds:rows.map(e=>e.id),total:rows.reduce((s,e)=>s+e.amount,0)};$('#payInvoiceContext').textContent=card.name+' · '+payment.month.split('-').reverse().join('/')+' · '+money(payment.total);$('#invoicePaidDate').value=localDate();$('#payInvoiceError').textContent='';api.dialog('#cardPayDialog');});
 $('#payInvoiceForm').onsubmit=async e=>{e.preventDefault();$('#payInvoiceError').textContent='';if(!payment)return;const date=$('#invoicePaidDate').value;if(!validDate(date)||date>localDate()){$('#payInvoiceError').textContent='Escolha a data em que a fatura foi paga.';return;}if(await api.mutate('/api/pay-invoice',{...payment,date},'#payInvoiceError')){$('#cardPayDialog').close();payment=null;$('#cardSuccess').textContent='Pagamento confirmado. As parcelas foram atualizadas, sem criar outro gasto.';}};
}
