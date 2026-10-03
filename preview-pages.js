import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('docs');
http.createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/ember-atlas/')){res.writeHead(404);return res.end();}path=decodeURIComponent(path.slice('/ember-atlas/'.length))||'index.html';const file=resolve(root,path);if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')){res.writeHead(403);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}}).listen(3001,'127.0.0.1',()=>console.log('Pages preview: http://localhost:3001/ember-atlas/'));
