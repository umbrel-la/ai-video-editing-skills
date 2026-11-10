import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const home=path.resolve(process.env.AI_VIDEO_HOME||path.join(os.homedir(),'.ai-video-editing'));
const config=path.join(home,'runtime-info.json');
if(!fs.existsSync(config)){console.error('Сначала выполните node scripts/setup.mjs из репозитория ai-video-editing-skills.');process.exit(1);}
const state=JSON.parse(fs.readFileSync(config,'utf8'));
const env={...process.env,HYPERFRAMES_FFMPEG_PATH:state.ffmpeg,HYPERFRAMES_FFPROBE_PATH:state.ffprobe};
env.PATH=[path.dirname(state.ffmpeg),path.dirname(state.ffprobe),env.PATH].join(path.delimiter);
const r=spawnSync(state.hyperframes.command,[...state.hyperframes.prefix,...process.argv.slice(2)],{stdio:'inherit',env,windowsHide:true});
if(r.error)console.error(r.error.message);
process.exit(r.status??1);
