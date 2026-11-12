import {validDate,monthShift,expandEntry} from './domain.mjs';
export function invoiceDate(month,day){if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(day)||day<1||day>31)throw Error('Confira o mês e o vencimento.');const first=month+'-01',last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();return first.slice(0,8)+String(Math.min(day,last)).padStart(2,'0');}
export function suggestedInvoice(card,purchased){if(!validDate(purchased))throw Error('Confira a data da compra.');const offset=(Number(purchased.slice(8))>=card.closingDay?1:0)+(card.dueDay<=card.closingDay?1:0);return monthShift(purchased.slice(0,7)+'-01',offset).slice(0,7);}
export function cardInstallments(entry,card,firstMonth,count){
 if(!Number.isInteger(count)||count<1||count>36)throw Error('Escolha de 1 a 36 parcelas.');
 if(!validDate(entry.purchased_at))throw Error('Confira a data da compra.');
 const list=expandEntry({...entry,date:invoiceDate(firstMonth,card.dueDay),status:'planned'},count>1?'installments':'none',count);
 return list.map((e,i)=>{const month=monthShift(firstMonth+'-01',i).slice(0,7),date=invoiceDate(month,card.dueDay);if(!validDate(date)||date<entry.purchased_at)throw Error('A primeira fatura deve vencer a partir da compra.');return {...e,date,invoice_month:month,card_id:card.id,installment:i+1,installments:count};});
}
