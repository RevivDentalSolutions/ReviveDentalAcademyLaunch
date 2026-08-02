/**
 * AI Course Generator Server
 *
 * Integrates with OpenAI to generate full dental course structures,
 * quizzes, and checklists, then inserts them into Supabase.
 *
 * Run with: node server/ai-server.js
 * Requires: OPENAI_API_KEY env var
 */
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCorsOptions, requireAdmin } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.AI_API_PORT || 3002;

const openai = new OpenAI({
  // Keep the health endpoint available in Preview before the paid AI key is configured.
  // Admin-only generation routes will receive an OpenAI authentication error until
  // OPENAI_API_KEY is intentionally added to the deployment environment.
  apiKey: process.env.OPENAI_API_KEY || 'not-configured',
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REVIVE_VIDEO_BRAND_PROMPT = 'Revive Dental Solutions video brand: dark charcoal background, soft aqua and teal accents, clean modern sans-serif typography, luxury healthcare SaaS aesthetic, realistic dental office visuals, professional calm high-trust tone, soft lighting, elegant minimal composition, no cartoon style, no cheesy stock footage feel. Visual direction: modern dental office, clean front desk, confident administrative team, practical training platform, cinematic but grounded.';

const COURSE_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

function normalizeCourseLevel(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('advanced')) return 'advanced';
  if (normalized.includes('intermediate')) return 'intermediate';
  return 'beginner';
}

function readableCourseSaveError(error) {
  if (error?.code === '23514' || error?.message?.includes('courses_level_check')) {
    return new Error('The generated course level was not recognized. Choose Beginner, Intermediate, or Advanced and try again.');
  }
  return error instanceof Error ? error : new Error(error?.message || 'The course could not be saved. Please try again.');
}

app.use(express.json({ limit: '10mb' }));
app.use(cors(createCorsOptions()));

// ============================================================
// Health Check
// ============================================================
app.get('/api/ai/health', (req, res) => {
  res.json({
    status: 'ok',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    supabase: supabaseUrl ? 'configured' : 'not configured',
  });
});

// Course generation can spend money and write with the service role. It is admin-only.
app.use('/api/ai', requireAdmin);

// ============================================================
// Generate Full Course (with quizzes & checklists)
// ============================================================
app.post('/api/ai/generate-course', async (req, res) => {
  const { topic, audience, objectives, prompt, preview } = req.body;

  if (!prompt && (!topic || !audience)) {
    return res.status(400).json({ error: 'Missing required fields: prompt or topic and audience' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a dental education curriculum designer. You create structured, practical course content for dental office professionals.

You ALWAYS respond with valid JSON only, using this exact schema:
{
  "title": "Course title",
  "description": "2-3 sentence course description",
  "level": "beginner|intermediate|advanced",
  "duration": "X modules · Y lessons · Z hours",
  "image_url": "",
  "checklist": ["Item 1", "Item 2", "Item 3"],
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "order": 1,
      "quiz": {
        "title": "Module 1 Knowledge Check",
        "questions": [
          {
            "question": "Question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0
          }
        ]
      },
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Lesson content with markdown formatting",
          "script": "A practical presenter script or chairside training talk track for this lesson",
          "duration": "X min",
          "order": 1
        }
      ]
    }
  ]
}

Guidelines:
- Generate 2-4 modules with 2-4 lessons each
- Each module gets a quiz with 3-4 multiple choice questions
- Each lesson should have substantive, practical content with markdown
- Each lesson should include a practical training script
- Include a course-level checklist (3-5 key action items)
- Focus on real dental office workflows and skills`,
        },
        {
          role: 'user',
          content: prompt || `Create a dental course with:
Topic: ${topic}
Audience: ${audience}
${objectives ? `Objectives: ${objectives}` : ''}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 12000,
      response_format: { type: 'json_object' },
    });

    const generatedText = completion.choices[0]?.message?.content;
    if (!generatedText) {
      return res.status(500).json({ error: 'AI generated no content' });
    }

    let courseData;
    try {
      courseData = JSON.parse(generatedText);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', generatedText);
      return res.status(500).json({ error: 'AI returned invalid JSON format' });
    }

    if (!courseData.title || !courseData.modules || !Array.isArray(courseData.modules)) {
      return res.status(500).json({ error: 'AI response missing required course structure' });
    }

    if (preview) {
      return res.json({
        success: true,
        course: courseData,
        hasQuiz: courseData.modules.some((m) => m.quiz),
        hasChecklist: !!courseData.checklist,
      });
    }

    const courseId = await insertCourseIntoDatabase(courseData);

    res.json({
      success: true,
      courseId,
      course: courseData,
      hasQuiz: courseData.modules.some((m) => m.quiz),
      hasChecklist: !!courseData.checklist,
    });
  } catch (err) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

app.post('/api/ai/generate-video-scene-plan', async (req, res) => {
  const { lessonTitle, narration, targetSceneCount = 6, includeQuiz = false, includeAvatarIntro = false, includeAvatarOutro = false } = req.body || {};
  if (!narration || typeof narration !== 'string') return res.status(400).json({ error: 'Paste lesson narration before generating scenes.' });
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.45, max_tokens: 9000, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You plan editable Revive Dental Academy video scenes for dental-office education. Return valid JSON only with {"title":"...","scenes":[...]}. Each scene must include id, layoutId, title, body, bullets, narrationScript, durationInSeconds, icon, animationStyle, avatarEnabled. Allowed layoutId values: title, section-divider, definition, comparison, process, timeline, example, patient-scenario, quiz, recap, avatar-intro, avatar-outro. Keep the full spoken passage in narrationScript, but make title/body/bullets concise on-screen copy. Estimate duration at roughly 145 spoken words per minute with a minimum of 4 seconds. Make every 5–8 seconds feel like a visual teaching beat: favor 6–8 short scenes, large on-screen focal content, a practical workflow, and a quick knowledge check. Avoid generic icon-only slides; icons are supporting accents, never the main lesson visual. For EOB, insurance payment, billing, or collections topics, favor process, example, comparison, patient-scenario, quiz, and recap layouts; use definition sparingly. An example MUST include exampleRows (2–4 realistic labelled values) and exampleResult (the exact posting takeaway). For comparison include comparisonLeftTitle/comparisonLeftPoints/comparisonRightTitle/comparisonRightPoints. For process include processSteps. For timeline include timelineMilestones. A quiz is a pause-and-reveal practice moment inside the video, not an interactive discussion: include quizQuestion, quizChoices (2–4), correctAnswerIndex, quizExplanation, and answerRevealInSeconds (usually 7). Tell the learner to pause and choose before continuing. For recap include recapItems (up to 4). Avoid repeating layouts unless the content genuinely requires it. Avatar scenes belong only at openings, major transitions, discussion prompts, or closings; most scenes must be voiceover-only.` },
        { role: 'user', content: `Lesson title: ${lessonTitle || 'Untitled Lesson'}\nTarget approximately ${Math.max(2, Math.min(16, Number(targetSceneCount) || 6))} scenes.\nInclude quiz: ${Boolean(includeQuiz)}\nInclude avatar intro: ${Boolean(includeAvatarIntro)}\nInclude avatar outro: ${Boolean(includeAvatarOutro)}\n\nNarration:\n${narration.slice(0, 18000)}` },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    const plan = JSON.parse(text || '{}');
    if (!Array.isArray(plan.scenes) || !plan.scenes.length) throw new Error('AI returned no scenes.');
    const allowed = new Set(['title','section-divider','definition','comparison','process','timeline','example','patient-scenario','quiz','recap','avatar-intro','avatar-outro']);
    const scenes = plan.scenes.map((scene, index) => ({ ...scene, id: scene.id || `ai_scene_${Date.now()}_${index + 1}`, layoutId: allowed.has(scene.layoutId) ? scene.layoutId : (index === 0 ? 'title' : 'definition'), title: scene.title || `Scene ${index + 1}`, body: scene.body || '', bullets: Array.isArray(scene.bullets) ? scene.bullets : [], narrationScript: scene.narrationScript || '', durationInSeconds: Math.max(4, Number(scene.durationInSeconds || 8)), avatarEnabled: Boolean(scene.avatarEnabled), animationStyle: scene.animationStyle || 'rise' }));
    res.json({ success: true, lesson: { id: `video_lesson_${Date.now()}`, title: plan.title || lessonTitle || 'Untitled Lesson', templateId: 'revive-academy', scenes, renderStatus: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
  } catch (err) {
    console.error('Scene plan generation error:', err);
    res.status(500).json({ error: err.message || 'Scene plan generation failed.' });
  }
});

// ============================================================
// Generate Quiz Only (for existing lessons)
// ============================================================
app.post('/api/ai/generate-quiz', async (req, res) => {
  const { lessonTitle, lessonContent, moduleTitle } = req.body;

  if (!lessonTitle) {
    return res.status(400).json({ error: 'Missing required field: lessonTitle' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You generate multiple-choice quiz questions for dental education lessons.
Always respond with valid JSON:
{
  "title": "Knowledge Check: {lesson title}",
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    }
  ]
}
Generate 3-5 questions. Make them practical and relevant.`,
        },
        {
          role: 'user',
          content: `Generate a quiz for:\nTitle: ${lessonTitle}\n${moduleTitle ? `Module: ${moduleTitle}\n` : ''}${lessonContent ? `Content: ${lessonContent.substring(0, 1000)}` : ''}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return res.status(500).json({ error: 'No content generated' });

    const quizData = JSON.parse(text);
    res.json({ success: true, quiz: quizData });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Generate Lesson Video Script + Prompt
// ============================================================
async function handleGenerateLessonVideoScript(req, res) {
  const {
    courseTitle,
    moduleTitle,
    lessonTitle,
    lessonContent,
    brandPrompt = REVIVE_VIDEO_BRAND_PROMPT,
  } = req.body;

  if (!lessonTitle) {
    return res.status(400).json({ error: 'Missing required field: lessonTitle' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You create premium healthcare SaaS training video scripts for Revive Dental Solutions.
Always respond with valid JSON only:
{
  "narrationScript": "60-90 second narration script, approximately 140-210 words",
  "storyboard": [
    {
      "scene": "Scene 1 title",
      "narration": "Narration for this scene",
      "onScreenText": "Short on-screen text",
      "suggestedVisuals": "Specific realistic visuals"
    }
  ],
  "onScreenText": ["Text card 1", "Text card 2"],
  "suggestedVisuals": ["Visual 1", "Visual 2"],
  "videoPrompt": "Canva/HeyGen/Pika-style prompt"
}

Requirements:
- Narration must fit 60-90 seconds.
- Include 4-6 storyboard scenes.
- Keep tone professional, calm, high-trust, practical, and educational.
- Use realistic dental office visuals and administrative workflow moments.
- Avoid cartoons, gimmicks, exaggerated stock footage, and hype.
- The video prompt must match this brand direction: ${brandPrompt}`,
        },
        {
          role: 'user',
          content: `Create a branded lesson video package.
Course: ${courseTitle || 'Revive Dental Academy'}
Module: ${moduleTitle || 'Training Module'}
Lesson: ${lessonTitle}
Lesson content:
${(lessonContent || '').substring(0, 3500)}`,
        },
      ],
      temperature: 0.65,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return res.status(500).json({ error: 'No video script generated' });

    const video = JSON.parse(text);
    if (!video.narrationScript || !video.videoPrompt) {
      return res.status(500).json({ error: 'AI response missing required video script fields' });
    }

    res.json({ success: true, video });
  } catch (err) {
    console.error('Lesson video script generation error:', err);
    res.status(500).json({ error: err.message || 'Video script generation failed' });
  }
}

app.post('/api/ai/generate-lesson-video-script', handleGenerateLessonVideoScript);
app.post('/generate-lesson-video-script', requireAdmin, handleGenerateLessonVideoScript);
app.post('/api/ai/generate-video-script', handleGenerateLessonVideoScript);
app.post('/generate-video-script', requireAdmin, handleGenerateLessonVideoScript);

// ============================================================
// Generate AI Video Factory Package
// ============================================================
async function handleGenerateVideoPackage(req, res) {
  const { lessonTitle, lessonContent, courseTitle } = req.body;

  if (!lessonTitle) {
    return res.status(400).json({ error: 'Missing required field: lessonTitle' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You create structured AI media packages for Revive Dental Academy lessons.
Always respond with valid JSON only using this exact schema:
{
  "thumbnailPrompt": "Prompt for a premium course video thumbnail",
  "brandStyle": "Reusable brand style direction",
  "scenes": [
    {
      "title": "Scene title",
      "duration": "8-12 sec",
      "narration": "Narration for this scene",
      "visualDescription": "Detailed visual description",
      "stockKeywords": ["keyword 1", "keyword 2"],
      "onScreenText": "Short text overlay",
      "canvaPrompt": "Scene-level Canva video generation prompt"
    }
  ]
}

Brand requirements:
- ${REVIVE_VIDEO_BRAND_PROMPT}
- Modern luxury healthcare SaaS, professional dental office training, practical and calm.
- Use 5-7 scenes totaling roughly 60-90 seconds.
- Stock keywords should be realistic search terms for dental office/admin workflow visuals.
- Canva prompts should be paste-ready and avoid any cartoon, gimmicky, or cheesy stock footage direction.`,
        },
        {
          role: 'user',
          content: `Generate a complete video package.
Course: ${courseTitle || 'Revive Dental Academy'}
Lesson: ${lessonTitle}
Lesson content:
${(lessonContent || '').substring(0, 4500)}`,
        },
      ],
      temperature: 0.65,
      max_tokens: 7000,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return res.status(500).json({ error: 'No video package generated' });

    const videoPackage = JSON.parse(text);
    if (!videoPackage.thumbnailPrompt || !videoPackage.brandStyle || !Array.isArray(videoPackage.scenes)) {
      return res.status(500).json({ error: 'AI response missing required video package fields' });
    }

    res.json({ success: true, package: videoPackage });
  } catch (err) {
    console.error('Video package generation error:', err);
    res.status(500).json({ error: err.message || 'Video package generation failed' });
  }
}

app.post('/api/ai/generate-video-package', handleGenerateVideoPackage);
app.post('/generate-video-package', requireAdmin, handleGenerateVideoPackage);

// ============================================================
// Database Inserter (with quizzes & checklists)
// ============================================================
async function insertCourseIntoDatabase(courseData) {
  const checklistText = courseData.checklist?.length
    ? `\n\n## Course Checklist\n${courseData.checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    : '';

  const normalizedLevel = normalizeCourseLevel(courseData.level);
  if (!COURSE_LEVELS.has(normalizedLevel)) throw new Error('Select a valid course level before saving.');

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      title: courseData.title,
      description: (courseData.description || '') + checklistText,
      image_url: courseData.image_url || '',
      price: 0,
      level: normalizedLevel,
      duration: courseData.duration || `${courseData.modules.length} modules`,
      published: false,
    })
    .select('id')
    .single();

  if (courseError) {
    console.error('Course insert error:', courseError);
    throw readableCourseSaveError(courseError);
  }

  const courseId = course.id;

  try {
    for (const mod of courseData.modules) {
      const { data: module, error: moduleError } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: mod.title,
        description: mod.description || '',
        order: mod.order,
      })
      .select('id')
      .single();

      if (moduleError) throw moduleError;

      if (mod.lessons?.length) {
        const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(mod.lessons.map((l) => ({
          module_id: module.id,
          title: l.title,
          content: formatLessonContent(l),
          video_url: l.video_url || '',
          duration: l.duration || '15 min',
          order: l.order,
        })));

        if (lessonsError) throw lessonsError;
      }

      // Append quiz to the last lesson in the module.
      if (mod.quiz?.questions?.length && mod.lessons?.length) {
        const lastLessonTitle = mod.lessons[mod.lessons.length - 1].title;
        const { data: lastLesson, error: lessonLookupError } = await supabase
        .from('lessons')
        .select('id, content')
        .eq('module_id', module.id)
        .eq('title', lastLessonTitle)
        .single();

        if (lessonLookupError) throw lessonLookupError;
        if (lastLesson) {
          const quizContent = formatQuizContent(mod.quiz);
          const { error: quizError } = await supabase
          .from('lessons')
          .update({ content: (lastLesson.content || '') + '\n\n---\n\n' + quizContent })
          .eq('id', lastLesson.id);
          if (quizError) throw quizError;
        }
      }
    }
  } catch (error) {
    // Cascading deletion prevents a partially generated hierarchy from remaining.
    await supabase.from('courses').delete().eq('id', courseId);
    throw readableCourseSaveError(error);
  }

  console.log(`[AI] Course created: ${courseData.title} (${courseId})`);
  return courseId;
}

function formatLessonContent(lesson) {
  const content = lesson.content || 'Content coming soon.';
  if (!lesson.script) return content;
  return `${content}\n\n## Training Script\n\n${lesson.script}`;
}

function formatQuizContent(quiz) {
  if (!quiz?.questions?.length) return '';
  let content = `## 📝 ${quiz.title || 'Knowledge Check'}\n\n`;
  quiz.questions.forEach((q, i) => {
    content += `**Q${i + 1}:** ${q.question}\n\n`;
    q.options?.forEach((opt, j) => {
      content += `${j === q.correctIndex ? '✅' : '○'} ${opt}\n`;
    });
    content += '\n';
  });
  return content;
}

// ============================================================
// Start Server
// ============================================================
if (!process.env.VERCEL) app.listen(PORT, () => {
  console.log(`\n  🤖 AI Course Generator running on http://localhost:${PORT}`);
  console.log(`  📋 Endpoints:`);
  console.log(`     POST /api/ai/generate-course    (course + quizzes + checklists)`);
  console.log(`     POST /api/ai/generate-video-scene-plan  (narration to visual scenes)`);
  console.log(`     POST /api/ai/generate-quiz      (quiz for existing lesson)`);
  console.log(`     POST /api/ai/generate-lesson-video-script  (lesson video script + prompt)`);
  console.log(`     POST /api/ai/generate-video-package        (AI Video Factory package)`);
  console.log(`     POST /api/ai/generate-checklist  (checklist for course)`);
  console.log(`     GET  /api/ai/health`);
  console.log(`\n  ⚙️  OpenAI: ${process.env.OPENAI_API_KEY ? '✅' : '❌'} ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`  ⚙️  Supabase: ${supabaseUrl ? '✅' : '❌'} ${supabaseUrl ? 'Configured' : 'Not configured'}\n`);
});

export default app;
