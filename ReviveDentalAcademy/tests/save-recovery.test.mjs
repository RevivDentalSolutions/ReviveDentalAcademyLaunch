import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
function moduleUrl(code){return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64')}
async function loadService(db) {
 const key='testDb'+Math.random().toString().slice(2);globalThis[key]=db;
 let code=ts.transpileModule(fs.readFileSync('src/lib/adminService.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 code=code.replace(/from '.\/supabase'/g,`from '${moduleUrl(`export const supabase=globalThis.${key}; export async function getCourseWithContent(){throw Error('not used')}`)}'`);
 for(const name of ['courseContent','courseLevel']) code=code.replaceAll(`'./${name}'`,`'${pathToFileURL(process.cwd()+'/src/lib/'+name+'.ts')}'`);
 return import(moduleUrl(code));
}
test('failed course save resumes without duplicate rows or deletes',async()=>{
 const tables={courses:new Map(),modules:new Map(),lessons:new Map()};let failures=1;
 const db={from(table){return {
 select(){return {eq(_,id){return {maybeSingle:async()=>({data:tables[table].get(id)||null,error:null})}}}},
 async upsert(row){if(table==='lessons' && row.order===2 && failures-- >0)return {error:{message:'network interrupted'}};tables[table].set(row.id,{...tables[table].get(row.id),...row});return {error:null};},
 delete(){assert.fail('recovery must not delete data')}
 }}};
 const {adminSaveFullCourse}=await loadService(db);
 const draft={draftId:'259ccfa0-e03c-46da-8d2d-231a236b7c21',title:'Recoverable',description:'',level:'beginner',modules:[{title:'One',lessons:[{title:'A',content:'Read A'},{title:'B',content:'Read B'}]}]};
 await assert.rejects(()=>adminSaveFullCourse(draft),/Retry Save/);
 assert.equal(tables.courses.size,1);assert.equal(tables.lessons.size,1);
 assert.equal(await adminSaveFullCourse(draft),draft.draftId);
 assert.equal(tables.courses.size,1);assert.equal(tables.modules.size,1);assert.equal(tables.lessons.size,2);
 await adminSaveFullCourse(draft);assert.equal(tables.lessons.size,2);
 tables.courses.get(draft.draftId).published=true;
 await assert.rejects(()=>adminSaveFullCourse(draft),/already published/);
});
