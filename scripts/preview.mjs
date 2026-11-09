import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),port=4372;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.ttf':'font/ttf','.sql':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/ourhome/')){res.writeHead(302,{Location:'/ourhome/'});res.end();return;}
 const relative=decodeURIComponent(url.pathname.slice('/ourhome/'.length))||'index.html';const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end('Não encontrado');return;}
 const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404);res.end('Não encontrado');}
}).listen(port,'127.0.0.1',()=>console.log(`Prévia estática local: http://127.0.0.1:${port}/ourhome/`));
