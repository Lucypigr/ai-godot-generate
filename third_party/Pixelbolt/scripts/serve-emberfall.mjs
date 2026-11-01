import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../demo/',import.meta.url)),port=Number(process.env.EMBERFALL_PORT||4173);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.zip':'application/zip','.txt':'text/plain'};
const allowed=new Set();
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.name.startsWith('.'))continue;if(entry.isDirectory())await collect(file);else if(entry.isFile()&&types[path.extname(file)])allowed.add(file);}}
await collect(root);
createServer(async(req,res)=>{
 try{const hosts=[`127.0.0.1:${port}`,`localhost:${port}`];if(!hosts.includes(req.headers.host)){res.writeHead(403).end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root)||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
  if(!allowed.has(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Emberfall: http://127.0.0.1:${port}`));
