/**
 * Persistent Remotion worker for private Academy staging.
 * It never accepts browser traffic: it claims queued rows from video_render_jobs.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function resolveRemotionEntryPoint() {
  const candidates = [
    path.resolve(process.cwd(), 'src', 'remotion', 'index.ts'),
    path.resolve(process.cwd(), 'ReviveDentalAcademy', 'src', 'remotion', 'index.ts'),
    path.resolve(__dirname, '..', 'src', 'remotion', 'index.ts'),
    path.resolve(__dirname, '..', '..', 'src', 'remotion', 'index.ts'),
  ];
  const entryPoint = candidates.find((candidate) => fs.existsSync(candidate));
  if (!entryPoint) throw new Error(`Remotion entry point was not included in this deployment. Checked: ${candidates.join(', ')}`);
  return entryPoint;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const renderBucket = process.env.SUPABASE_RENDER_BUCKET || 'lesson-videos';
const pollMilliseconds = Math.max(1000, Number(process.env.VIDEO_WORKER_POLL_MS || 5000));
const workerId = process.env.VIDEO_WORKER_ID || `worker-${process.pid}`;
const fps = 30;
let bundlePromise;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('VIDEO WORKER: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function storageRef(bucket, objectPath) {
  return `supabase-storage://${bucket}/${objectPath}`;
}

function durationInFrames(lesson) {
  const settings = lesson.academySettings || {};
  const intro = settings.introVideoUrl ? Math.max(1, Number(settings.introDurationInSeconds || 5)) * fps : 0;
  const outro = settings.outroVideoUrl ? Math.max(1, Number(settings.outroDurationInSeconds || 5)) * fps : 0;
  const scenes = Array.isArray(lesson.scenes) ? lesson.scenes : [];
  return intro + outro + scenes.reduce((total, scene) => total + Math.max(4, Number(scene.durationInSeconds || scene.duration || 8)) * fps, 0);
}

async function getBundle() {
  bundlePromise ||= bundle({ entryPoint: resolveRemotionEntryPoint() });
  return bundlePromise;
}

async function claimNextJob() {
  const { data: candidates, error } = await supabase
    .from('video_render_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const candidate = candidates?.[0];
  if (!candidate) return null;

  const { data: claimed, error: claimError } = await supabase
    .from('video_render_jobs')
    .update({ status: 'running', attempts: (candidate.attempts || 0) + 1, started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null })
    .eq('id', candidate.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed || null;
}

async function renderJob(job) {
  const lesson = job.lesson_payload;
  if (!lesson?.id || !Array.isArray(lesson.scenes) || lesson.scenes.length === 0) {
    throw new Error('The queued lesson is missing a valid video lesson payload.');
  }

  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: 'ReviveVideoLesson',
    inputProps: { lesson },
  });
  const safeId = String(lesson.id).replace(/[^a-zA-Z0-9_-]/g, '-');
  const outputPath = path.join(os.tmpdir(), `revive-${job.id}-${safeId}.mp4`);

  try {
    await renderMedia({
      composition: { ...composition, durationInFrames: durationInFrames(lesson) },
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { lesson },
    });
    const video = fs.readFileSync(outputPath);
    const objectPath = `${lesson.courseId || job.course_id || 'unassigned-course'}/${lesson.lessonId || job.lesson_id || safeId}/${Date.now()}-${safeId}.mp4`;
    const { error: uploadError } = await supabase.storage.from(renderBucket).upload(objectPath, video, {
      contentType: 'video/mp4', cacheControl: '31536000', upsert: false,
    });
    if (uploadError) throw uploadError;

    const ref = storageRef(renderBucket, objectPath);
    if (job.lesson_id) {
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ video_url: ref, updated_at: new Date().toISOString() })
        .eq('id', job.lesson_id);
      if (lessonError) throw lessonError;
    }
    const { error: completeError } = await supabase
      .from('video_render_jobs')
      .update({ status: 'completed', storage_bucket: renderBucket, storage_path: objectPath, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', job.id);
    if (completeError) throw completeError;
    console.log(`[${workerId}] completed ${job.id}: ${objectPath}`);
  } finally {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

async function failJob(job, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${workerId}] failed ${job.id}:`, message);
  const { error: updateError } = await supabase
    .from('video_render_jobs')
    .update({ status: 'failed', error_message: message.slice(0, 4000), updated_at: new Date().toISOString() })
    .eq('id', job.id);
  if (updateError) console.error(`[${workerId}] could not record failed job ${job.id}:`, updateError.message);
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return;
  try { await renderJob(job); } catch (error) { await failJob(job, error); }
}

console.log(`[${workerId}] Revive video worker started; polling every ${pollMilliseconds}ms.`);
setInterval(() => void tick().catch((error) => console.error(`[${workerId}] poll error:`, error.message)), pollMilliseconds);
void tick().catch((error) => console.error(`[${workerId}] startup error:`, error.message));
