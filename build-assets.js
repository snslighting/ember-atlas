import {createHash} from 'node:crypto';
// One release token keeps HTML styles and module dependencies on the same build.
export function releaseVersion(sources){return createHash('sha256').update(sources.map(source=>source.replace(/\r\n/g,'\n')).join('\n')).digest('hex').slice(0,12);}
export function versionHTML(html,version){return html.replace(/(href=")([.][/][^"?#]+[.]html)(#[^"]*)?(")/g,(_,prefix,path,hash='',end)=>`${prefix}${path}?v=${version}${hash}${end}`).replace(/((?:src|href)=")([.][/][^"]+[.](?:css|js))("\s*)/g,(_,prefix,path,end)=>`${prefix}${path}?v=${version}${end}`);}
export function versionModules(js,version){return js.replace(/((?:from\s*|new URL\(\s*|import\s*(?:\(\s*)?)['"])([.][/][^'"]+[.](?:m?js))(['"])/g,(_,prefix,path,end)=>`${prefix}${path}?v=${version}${end}`);}
