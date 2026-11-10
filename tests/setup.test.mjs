import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installSkills,probe} from '../scripts/setup.mjs';
test('installation preserves a pre-existing skill and installs a missing one',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-video-skills-Тест '));
 try {
  const src=path.join(temp,'source'),dst=path.join(temp,'destination');
  for(const n of ['existing','new-skill']){fs.mkdirSync(path.join(src,n),{recursive:true});fs.writeFileSync(path.join(src,n,'SKILL.md'),'source');}
  fs.mkdirSync(path.join(dst,'existing'),{recursive:true});fs.writeFileSync(path.join(dst,'existing','SKILL.md'),'user-edited');
  const a=installSkills(src,dst);assert.deepEqual(a.installed,['new-skill']);assert.deepEqual(a.preserved,['existing']);
  assert.equal(fs.readFileSync(path.join(dst,'existing','SKILL.md'),'utf8'),'user-edited');
  assert.equal(installSkills(src,dst).installed.length,0);
 }finally{assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(temp).startsWith('ai-video-skills-'));fs.rmSync(temp,{recursive:true,force:true});}
});
test('a missing executable does not report success',()=>assert.equal(probe('this-executable-does-not-exist-ai-video'),null));
