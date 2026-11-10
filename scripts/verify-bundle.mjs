import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'UPSTREAM.json'),'utf8'));
for(const item of manifest.files){
 const p=path.resolve(root,item.path);
 if(!p.startsWith(root+path.sep))throw new Error('Unsafe manifest path');
 const b=fs.readFileSync(p),sha=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
 if(sha!==item.gitBlobSha1)throw new Error('Upstream file changed: '+item.path);
}
const source=fs.readFileSync(path.join(root,'scripts/hf.mjs'));
if(!source.equals(fs.readFileSync(path.join(root,'skills/ai-video-editing/scripts/hf.mjs'))))throw new Error('Launcher copies differ');
console.log(`Verified ${manifest.files.length} public upstream files and both launcher copies.`);
