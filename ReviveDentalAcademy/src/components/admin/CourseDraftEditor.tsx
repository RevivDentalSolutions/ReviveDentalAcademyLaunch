import { useState } from 'react';
import type { AIGeneratedCourse } from '../../lib/aiCourseBuilder';
import { renderMarkdown, sanitizeMemberLessonContent } from '../../pages/courses/CoursePlayer';
import { LessonQuiz } from '../courses/LessonQuiz';
export function CourseDraftEditor({ course, onChange }: {course:AIGeneratedCourse;onChange:(course:AIGeneratedCourse)=>void}) {
  const [preview, setPreview] = useState(false);
  const field = 'w-full bg-black/20 rounded-lg p-3 text-white border border-white/10';
  function lessonChange(mi:number, li:number, key:string, value:string) {
    onChange({...course, modules:course.modules.map((m,i)=>i===mi?{...m,lessons:m.lessons.map((l,j)=>j===li?{...l,[key]:value}:l)}:m)});
  }
  return <section className="space-y-5">
    <div className="flex gap-4 items-center"><button className="bg-secondary text-primary px-5 py-3 rounded-lg" onClick={()=>setPreview(!preview)}>{preview?'Back to editing':'Preview as student'}</button><span className="text-gray-400">Draft autosaves in this browser. Video is optional.</span></div>
    {preview && <p className="text-secondary">Preview only: answers and progress here do not change student records.</p>}
    <label className="block text-gray-300">Course title<input aria-label="Course title" className={field} value={course.title} disabled={preview} onChange={e=>onChange({...course,title:e.target.value})}/></label>
    <label className="block text-gray-300">Description<textarea className={field} value={course.description} disabled={preview} onChange={e=>onChange({...course,description:e.target.value})}/></label>
    {course.modules.map((m,mi)=><section key={mi} className="border border-secondary/20 rounded-xl p-5 space-y-4">
      <label className="block text-gray-300">Module {mi+1}<input aria-label={`Module ${mi+1} title`} className={field} disabled={preview} value={m.title} onChange={e=>onChange({...course,modules:course.modules.map((item,i)=>i===mi?{...item,title:e.target.value}:item)})}/></label>
      {m.lessons.map((l,li)=><details key={li} open={li===0} className="p-4 bg-white/5 rounded-xl"><summary className="text-white cursor-pointer">{l.title}</summary><div className="space-y-3 mt-4">
        {preview ? <article>{renderMarkdown(sanitizeMemberLessonContent(l.content))}</article> : <>
          <label className="block text-gray-300">Lesson title<input className={field} value={l.title} onChange={e=>lessonChange(mi,li,'title',e.target.value)}/></label>
          <label className="block text-gray-300">Lesson content<textarea className={field+' min-h-64'} value={l.content} onChange={e=>lessonChange(mi,li,'content',e.target.value)}/></label>
          <p className="text-gray-400">Use # for a heading, - for a list, and **bold** for emphasis. Preview shows the student view.</p>
          <label className="block text-gray-300">Optional video URL<input className={field} value={l.video_url || ''} onChange={e=>lessonChange(mi,li,'video_url',e.target.value)}/></label>
        </>}
      </div></details>)}
      {m.quiz && (preview ? <LessonQuiz key={`preview-${mi}`} quiz={m.quiz} onPass={async()=>{}}/> : <details><summary className="text-secondary cursor-pointer">Edit knowledge check</summary>{m.quiz.questions.map((q,qi)=><div key={qi} className="space-y-2 py-4"><input aria-label={`Question ${qi+1}`} className={field} value={q.question} onChange={e=>onChange({...course,modules:course.modules.map((item,i)=>i===mi?{...item,quiz:{...m.quiz!,questions:m.quiz!.questions.map((item,j)=>j===qi?{...item,question:e.target.value}:item)}}:item)})}/>{q.options.map((o,oi)=><label key={oi} className="flex gap-2 text-gray-300"><input type="radio" aria-label={`Correct answer ${oi+1}`} name={`answer-${mi}-${qi}`} checked={q.correctIndex===oi} onChange={()=>onChange({...course,modules:course.modules.map((item,i)=>i===mi?{...item,quiz:{...m.quiz!,questions:m.quiz!.questions.map((item,j)=>j===qi?{...item,correctIndex:oi}:item)}}:item)})}/><input aria-label={`Answer ${oi+1}`} className={field} value={o} onChange={e=>onChange({...course,modules:course.modules.map((item,i)=>i===mi?{...item,quiz:{...m.quiz!,questions:m.quiz!.questions.map((item,j)=>j===qi?{...item,options:item.options.map((v,k)=>k===oi?e.target.value:v)}:item)}}:item)})}/></label>)}</div>)}</details>)}
    </section>)}
  </section>;
}
