import {validPublicConfig} from './config-validation.mjs';
document.querySelector('#copySql').onclick=async()=>{
 const status=document.querySelector('#sqlMessage');
 try{const r=await fetch('./supabase/instalar.sql');if(!r.ok)throw Error();await navigator.clipboard.writeText(await r.text());status.textContent='Copiado. Cole no SQL Editor do Supabase e clique em Run.';}
 catch{status.textContent='Use “Baixar arquivo SQL” e copie o conteúdo do arquivo.';}
};
document.querySelector('#configForm').onsubmit=e=>{
 e.preventDefault();const error=document.querySelector('#configError');error.textContent='';
 const config={supabaseUrl:document.querySelector('#projectUrl').value.trim().replace(/\/$/,''),supabaseKey:document.querySelector('#publicKey').value.trim()};
 if(!validPublicConfig(config)){error.textContent='Confira a URL do projeto e use apenas a Publishable key (ou anon key).';return;}
 const text='// Configuração pública. Senhas e chaves secretas ficam fora deste arquivo.\nwindow.LAR_CONFIG = '+JSON.stringify(config,null,2)+';\n';
 const url=URL.createObjectURL(new Blob([text],{type:'text/javascript;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='config.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 document.querySelector('#configMessage').textContent='Arquivo gerado. Envie o config.js ao GitHub para substituir o anterior.';
};
