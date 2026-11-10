import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'smoke-output');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0}html,body{width:360px;height:640px;background:#161b24}#root{width:360px;height:640px;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 38px Arial;color:#ffe600;text-align:center}p{font-size:22px;color:white;margin-top:24px}</style></head><body><div id="root" data-composition-id="main" data-duration="2" data-width="360" data-height="640" data-fps="30"><div>ИИ-МОНТАЖ</div><p>HyperFrames готов</p></div><script>window.__timelines={};</script></body></html>`);
for(const args of [['check','--json'],['render','--quality','looks','-o','ready.mp4']]) {
  const r=spawnSync(process.execPath,[path.join(root,'scripts/hf.mjs'),...args],{cwd:out,stdio:'inherit',windowsHide:true});
  if(r.status!==0)process.exit(r.status??1);
}
if(!fs.existsSync(path.join(out,'ready.mp4'))||fs.statSync(path.join(out,'ready.mp4')).size<1000)throw new Error('MP4 не создан');
console.log('Готово: '+path.join(out,'ready.mp4'));
