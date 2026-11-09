import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validPublicConfig} from '../config-validation.mjs';
test('configuração só aceita URL HTTPS do projeto e chaves públicas',()=>{
 const base={supabaseUrl:'https://project-example.supabase.co',supabaseKey:'sb_publishable_example'};
 assert(validPublicConfig(base));
 for(const supabaseUrl of ['http://project-example.supabase.co','https://supabase.co.attacker.test','https://project-example.supabase.co.evil.test','https://project-example.supabase.co/path','https://user:pass@project-example.supabase.co'])assert(!validPublicConfig({...base,supabaseUrl}));
 const token=role=>'header.'+btoa(JSON.stringify({role}))+'.signature';
 assert(validPublicConfig({...base,supabaseKey:token('anon')}));
 for(const supabaseKey of ['sb_secret_example',token('service_role'),token('authenticated'),''])assert(!validPublicConfig({...base,supabaseKey}));
});
test('todos os recursos do HTML e módulos usam caminhos relativos válidos em /ourhome/',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert(!/signin-with-chatgpt|signout-with-chatgpt/.test(html));
 assert(!/(?:src|href)="\/(?!\/)/.test(html));
 for(const [,resource] of html.matchAll(/(?:src|href)="\.\/([^"?#]*)"/g))if(resource)assert(fs.existsSync(new URL('../'+resource,import.meta.url)),resource);
 for(const name of ['app.mjs','presentation.mjs','session.mjs']){const code=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');assert(!/from ['"]\//.test(code));}
 const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.icons[0].src,'./icon.svg');
});
test('o pacote inicia com autenticação real pendente, sem senha ou usuário simulado',()=>{
 const config=fs.readFileSync(new URL('../config.js',import.meta.url),'utf8');assert.match(config,/supabaseUrl: ''/);assert.match(config,/supabaseKey: ''/);
 const session=fs.readFileSync(new URL('../session.mjs',import.meta.url),'utf8');assert.match(session,/auth\.signInWithPassword/);assert.match(session,/client\.rpc/);assert(!/password\s*===|password\s*==|localStorage\.setItem\([^)]*password/.test(session));
 const sql=fs.readFileSync(new URL('../supabase/instalar.sql',import.meta.url),'utf8');assert.match(sql,/revoke all on all tables/);assert.match(sql,/enable row level security/);assert.match(sql,/email_confirmed_at is not null/);
});
