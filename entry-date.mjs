import {localDate,validDate} from './domain.mjs';
export function previousDay(date=localDate()){
 const day=new Date(date+'T12:00:00Z');day.setUTCDate(day.getUTCDate()-1);return day.toISOString().slice(0,10);
}
export function monthName(date){
 if(!validDate(date))return '';
 return new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
}
export function resolveDateStatus(date,status,autoPlanned,today=localDate()){
 if(!validDate(date))return {status,autoPlanned};
 if(date>today&&status==='paid')return {status:'planned',autoPlanned:true};
 if(date<=today&&autoPlanned)return {status:'paid',autoPlanned:false};
 return {status,autoPlanned};
}
