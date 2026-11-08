import test from 'node:test';
import assert from 'node:assert/strict';
import { withQuiz, readQuiz, courseProgress, validateCourseDraft, draftRecordId } from '../src/lib/courseContent.ts';
import { requireAdmin } from '../server/require-admin.js';
const quiz={title:'Knowledge check', questions:[{question:'Active means?',options:['Eligible for checked date','Every service paid'],correctIndex:0}]};
test('quiz save preserves lesson and video metadata, and replaces only its own previous quiz',()=>{
 const content='# Lesson\nActual teaching.\n<!-- revive-video-lesson-builder\n{"id":"keep"}\nrevive-video-lesson-builder -->';
 const once=withQuiz(content,quiz); const twice=withQuiz(once,{...quiz,title:'Revised'});
 assert.ok(twice.startsWith(content)); assert.equal((twice.match(/<!-- revive-quiz/g)||[]).length,1);
 assert.equal(readQuiz(twice).title,'Revised');
});
test('empty and malformed quizzes cannot be saved',()=>{
 assert.throws(()=>withQuiz('keep',{title:'empty',questions:[]}));
 assert.throws(()=>withQuiz('keep',{...quiz,questions:[{...quiz.questions[0],correctIndex:4}]}));
 assert.equal(readQuiz('<!-- revive-quiz\nnot json\nrevive-quiz -->'),null);
});
test('progress is course-specific, unique, and bounded',()=>{
 assert.deepEqual(courseProgress(['a','b'],['a','a','other']),{count:1,percent:50});
 assert.deepEqual(courseProgress([],['other']),{count:0,percent:0});
});
test('text-only course validates and an empty lesson cannot publish',()=>{
 const course={title:'Training',modules:[{title:'Start',lessons:[{title:'Read',content:'Substantive lesson'}],quiz}]};
 assert.doesNotThrow(()=>validateCourseDraft(course));
 assert.throws(()=>validateCourseDraft({...course,modules:[{title:'Empty',lessons:[]}]}));
});
test('retry IDs are deterministic, distinct, valid UUIDs',async()=>{
 const first=await draftRecordId('draft-1','module:0:lesson:0');
 assert.equal(first,await draftRecordId('draft-1','module:0:lesson:0'));
 assert.notEqual(first,await draftRecordId('draft-1','module:0:lesson:1'));
 assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
for (const [role,status] of [['student',403],['admin',200]]) test(`AI authorization ${role}`,async()=>{
 let actual=200,called=false;
 const client={auth:{getUser:async()=>({data:{user:{id:'verified'}},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role},error:null})})})})};
 await requireAdmin(()=>client)({headers:{authorization:'Bearer token'}},{status:s=>{actual=s;return {json:()=>{}}}},()=>{called=true});
 assert.equal(actual,status);assert.equal(called,role==='admin');
});
test('AI rejects missing credentials before contacting backend',async()=>{
 let actual=0;await requireAdmin(()=>{throw Error('must not run')})({headers:{}},{status:s=>{actual=s;return {json:()=>{}}}},()=>assert.fail());assert.equal(actual,401);
});
