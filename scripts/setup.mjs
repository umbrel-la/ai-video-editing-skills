import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const home=path.resolve(process.env.AI_VIDEO_HOME||path.join(os.homedir(),'.ai-video-editing'));
export function probe(command,args=['-version']) {
  const r=spawnSync(command,args,{encoding:'utf8',windowsHide:true,timeout:30000});
  return r.status===0 ? (r.stdout||r.stderr||'OK').trim().split(/\r?\n/)[0] : null;
}
export function findExecutable(name) {
  const extensions=process.platform==='win32'?['.exe','.cmd','.bat','']:[''];
  for(const dir of (process.env.PATH||'').split(path.delimiter))
    for(const ext of extensions) {const p=path.join(dir,name+ext);if(fs.existsSync(p)&&!fs.statSync(p).isDirectory())return p;}
  return null;
}
function installPackage(runtime,spec) {
  fs.mkdirSync(runtime,{recursive:true});
  if(!fs.existsSync(path.join(runtime,'package.json')))fs.writeFileSync(path.join(runtime,'package.json'),'{"private":true}');
  // Use npm's JS entrypoint, not shell interpolation, also on Windows.
  let npmCli=process.env.npm_execpath;
  if(!npmCli||!fs.existsSync(npmCli)) {
    const npm=findExecutable('npm');
    const candidates=[path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),npm&&path.join(path.dirname(npm),'node_modules/npm/bin/npm-cli.js')].filter(Boolean);
    npmCli=candidates.find(p=>fs.existsSync(p));
  }
  if(!npmCli)throw new Error('npm не найден. Установите Node.js LTS вместе с npm с https://nodejs.org/');
  const r=spawnSync(process.execPath,[npmCli,'install','--prefix',runtime,'--save-exact','--no-audit','--no-fund',spec],{stdio:'inherit',windowsHide:true});
  if(r.status!==0)throw new Error(`Не удалось установить ${spec}. Проверьте сеть и вывод npm.`);
}
export function installSkills(source,destination) {
  // Explicit traversal also supports Windows workspaces with Cyrillic paths.
  function copyDirectory(from,to) {
    fs.mkdirSync(to,{recursive:true});
    for(const e of fs.readdirSync(from,{withFileTypes:true})) {
      const input=path.join(from,e.name),output=path.join(to,e.name);
      if(e.isDirectory())copyDirectory(input,output);
      else if(e.isFile()){fs.writeFileSync(output,fs.readFileSync(input),{flag:'wx'});if(process.platform!=='win32')fs.chmodSync(output,fs.statSync(input).mode);}
      else throw new Error(`Неподдерживаемый тип файла: ${input}`);
    }
  }
  fs.mkdirSync(destination,{recursive:true});
  const installed=[],preserved=[];
  for(const d of fs.readdirSync(source,{withFileTypes:true})) {
    if(!d.isDirectory()||!fs.existsSync(path.join(source,d.name,'SKILL.md')))continue;
    const target=path.join(destination,d.name);
    if(fs.existsSync(target)){preserved.push(d.name);continue;}
    console.log(`Установка скилла: ${d.name}`);
    const staging=fs.mkdtempSync(path.join(destination,`.install-${d.name}-`));
    copyDirectory(path.join(source,d.name),staging);
    fs.renameSync(staging,target);installed.push(d.name);
  }
  return {installed,preserved};
}
export function resolveTools(runtime,allowInstall=false,previous={}) {
  let hyperframes=null;
  const cli=process.env.HYPERFRAMES_CLI_PATH||previous.hyperframes?.cli||path.join(runtime,'node_modules/hyperframes/bin/hyperframes.mjs');
  if(fs.existsSync(cli)&&probe(process.execPath,[cli,'--version']))hyperframes={command:process.execPath,prefix:[cli],cli};
  if(!hyperframes) {
    // On Windows resolve a global npm shim to its JS file, avoiding a shell.
    const onPath=findExecutable('hyperframes');
    const globalCli=onPath&&path.join(path.dirname(onPath),'node_modules/hyperframes/bin/hyperframes.mjs');
    if(globalCli&&fs.existsSync(globalCli)&&probe(process.execPath,[globalCli,'--version']))hyperframes={command:process.execPath,prefix:[globalCli],cli:globalCli};
    else if(onPath&&!/\.(cmd|bat)$/i.test(onPath)&&probe(onPath,['--version']))hyperframes={command:onPath,prefix:[]};
  }
  if(!hyperframes&&allowInstall){
    installPackage(runtime,'hyperframes@0.9.30');
    const installedCli=path.join(runtime,'node_modules/hyperframes/bin/hyperframes.mjs');
    if(!fs.existsSync(installedCli)||!probe(process.execPath,[installedCli,'--version']))throw new Error('HyperFrames установлен, но не запускается. Проверьте Node.js и вывод npm.');
    hyperframes={command:process.execPath,prefix:[installedCli],cli:installedCli};
  }
  const req=createRequire(path.join(runtime,'package.json'));
  function binary(name,envKey,packageName,spec) {
    const candidates=[process.env[envKey],previous[name],findExecutable(name)].filter(Boolean);
    for(const c of candidates)if(probe(c))return c;
    try {const value=req(packageName);const p=typeof value==='string'?value:value.path;if(p&&probe(p))return p;}catch{}
    if(allowInstall){installPackage(runtime,spec);const value=req(packageName);const p=typeof value==='string'?value:value.path;if(p&&probe(p))return p;throw new Error(`${name} установлен, но не запускается на ${process.platform}/${process.arch}. Установите FFmpeg для вашей ОС: https://ffmpeg.org/download.html`);}
    return null;
  }
  const ffmpeg=binary('ffmpeg','HYPERFRAMES_FFMPEG_PATH','ffmpeg-static','ffmpeg-static@5.3.0');
  const ffprobe=binary('ffprobe','HYPERFRAMES_FFPROBE_PATH','ffprobe-static','ffprobe-static@3.1.0');
  return {hyperframes,ffmpeg,ffprobe};
}
export function setup(args=process.argv.slice(2)) {
  console.log('Проверка и установка набора ИИ-монтажа...');
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('Нужен Node.js >=22: https://nodejs.org/');
  const allowed=new Set(['--check','--skip-tools','--skills-dir']);
  for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw new Error(`Неизвестный аргумент: ${args[i]}`);if(args[i]==='--skills-dir'){if(!args[++i])throw new Error('После --skills-dir нужен путь');}}
  const check=args.includes('--check'),skip=args.includes('--skip-tools');
  const index=args.indexOf('--skills-dir');
  const skillsDir=path.resolve(index<0?path.join(os.homedir(),'.agents/skills'):args[index+1]);
  const runtime=path.join(home,'runtime'),config=path.join(home,'runtime-info.json');
  const previous=fs.existsSync(config)?JSON.parse(fs.readFileSync(config,'utf8')):{};
  const skills=check?{installed:[],preserved:[]} : installSkills(path.join(root,'skills'),skillsDir);
  const required=fs.readdirSync(path.join(root,'skills')).filter(n=>fs.existsSync(path.join(root,'skills',n,'SKILL.md')));
  const available=required.filter(n=>fs.existsSync(path.join(skillsDir,n,'SKILL.md')));
  const missingSkills=required.filter(n=>!available.includes(n));
  const tools=skip?{hyperframes:null,ffmpeg:null,ffprobe:null}:resolveTools(runtime,!check,previous);
  const ready=!skip&&missingSkills.length===0&&Boolean(tools.hyperframes&&tools.ffmpeg&&tools.ffprobe);
  const report={node:process.version,platform:process.platform,architecture:process.arch,skillsDir,...skills,available,missingSkills,...tools,ready,toolsSkipped:skip};
  if(!check){fs.mkdirSync(home,{recursive:true});if(!skip)fs.writeFileSync(config,JSON.stringify({...tools,runtime},null,2));fs.writeFileSync(path.join(root,'setup-report.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2));
  if(!ready&&!skip)process.exitCode=1;
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{setup();}catch(e){console.error(e.message);process.exitCode=1;}
