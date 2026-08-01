/**
 * Video Generation Server
 *
 * Backend-only HeyGen integration. Run with:
 * node server/video-server.js
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import { createHeyGenVideo, getHeyGenVideoStatus } from './heygenService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.VIDEO_API_PORT || 3003;
const VIDEO_LESSON_FPS = 30;
const defaultAcademyVideoSettings = {
  introVideoUrl: '',
  introDurationInSeconds: 5,
  outroVideoUrl: '',
  outroDurationInSeconds: 5,
};
const videoLessonLayoutIds = new Set([
  'title',
  'section-divider',
  'definition',
  'comparison',
  'process',
  'timeline',
  'example',
  'patient-scenario',
  'quiz',
  'recap',
  'avatar-intro',
  'avatar-outro',
]);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ACADEMY_MEDIA_BUCKET = process.env.SUPABASE_ACADEMY_MEDIA_BUCKET || process.env.VITE_SUPABASE_VIDEO_BUCKET || 'academy-media';
const RENDER_BUCKET = process.env.SUPABASE_RENDER_BUCKET || process.env.VITE_SUPABASE_RENDER_BUCKET || 'lesson-videos';
const SIGNED_PLAYBACK_URL_TTL_SECONDS = Number(process.env.SIGNED_PLAYBACK_URL_TTL_SECONDS || 60 * 60);

app.use(express.json({ limit: process.env.VIDEO_API_JSON_LIMIT || '200mb' }));
app.use(cors());

function normalizeHeyGenStatus(status) {
  if (['completed', 'complete', 'success', 'done'].includes(status)) return 'completed';
  if (['failed', 'error'].includes(status)) return 'failed';
  if (['pending', 'queued', 'waiting'].includes(status)) return 'queued';
  return 'rendering';
}

function toReadableString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getErrorPayload(err, fallbackMessage) {
  const status = Number(err.statusCode || err.status || 500);
  return {
    status,
    error: toReadableString(err.message || err.error, fallbackMessage),
    details: toReadableString(err.details || err.responseBody, ''),
  };
}

function createStorageRef(bucket, objectPath) {
  return `supabase-storage://${bucket}/${objectPath}`;
}

function parseStorageRef(value) {
  if (!value || typeof value !== 'string') return null;

  if (value.startsWith('supabase-storage://')) {
    const withoutProtocol = value.replace('supabase-storage://', '');
    const [bucket, ...pathParts] = withoutProtocol.split('/');
    const objectPath = pathParts.join('/');
    return bucket && objectPath ? { bucket, objectPath } : null;
  }

  try {
    const url = new URL(value);
    const publicMarker = '/storage/v1/object/public/';
    const signedMarker = '/storage/v1/object/sign/';
    const marker = url.pathname.includes(publicMarker) ? publicMarker : url.pathname.includes(signedMarker) ? signedMarker : '';
    if (!marker) return null;

    const afterMarker = decodeURIComponent(url.pathname.split(marker)[1] || '');
    const [bucket, ...pathParts] = afterMarker.split('/');
    const objectPath = pathParts.join('/');
    return bucket && objectPath ? { bucket, objectPath } : null;
  } catch {
    return null;
  }
}

async function createPlayableVideoUrl(supabase, source, requestedTtl = SIGNED_PLAYBACK_URL_TTL_SECONDS) {
  const storageRef = parseStorageRef(source);
  if (!storageRef) {
    return {
      playbackUrl: source,
      accessMode: 'direct',
      storageRef: null,
    };
  }

  if (storageRef.bucket !== RENDER_BUCKET) {
    const error = new Error(`Playback signing is only allowed for the ${RENDER_BUCKET} bucket.`);
    error.statusCode = 403;
    throw error;
  }

  const expiresIn = Math.max(60, Math.min(Number(requestedTtl) || SIGNED_PLAYBACK_URL_TTL_SECONDS, 60 * 60 * 24));
  const { data, error } = await supabase.storage
    .from(storageRef.bucket)
    .createSignedUrl(storageRef.objectPath, expiresIn);

  if (error) throw error;

  return {
    playbackUrl: data.signedUrl,
    accessMode: 'signed',
    storageRef,
    expiresIn,
  };
}

function createStepLogger(scope) {
  const steps = [];

  return {
    steps,
    log(step, details = {}) {
      const entry = {
        at: new Date().toISOString(),
        step,
        details,
      };
      steps.push(entry);
      console.log(`[${scope}] ${step}`, details);
      return entry;
    },
  };
}

function normalizeVideoLessonScene(scene = {}, index) {
  return {
    ...scene,
    id: scene.id || `scene_${index + 1}`,
    layoutId: videoLessonLayoutIds.has(scene.layoutId) ? scene.layoutId : (index === 0 ? 'title' : 'definition'),
    title: scene.title || `Scene ${index + 1}`,
    body: scene.body || '',
    bullets: Array.isArray(scene.bullets) ? scene.bullets.filter(Boolean) : [],
    imageUrl: scene.imageUrl || '',
    mediaType: scene.mediaType || (scene.mediaUrl || scene.imageUrl ? 'image' : 'none'),
    mediaUrl: scene.mediaUrl || scene.imageUrl || '',
    mediaStoragePath: scene.mediaStoragePath || '',
    mediaFileName: scene.mediaFileName || '',
    mediaPosition: scene.mediaPosition || 'right',
    mediaFit: scene.mediaFit || 'cover',
    mediaOpacity: Math.min(1, Math.max(0, Number(scene.mediaOpacity ?? 1))),
    textOverlayStrength: Math.min(1, Math.max(0, Number(scene.textOverlayStrength ?? 0.58))),
    backgroundImageUrl: scene.backgroundImageUrl || '',
    backgroundVideoUrl: scene.backgroundVideoUrl || '',
    loopMedia: scene.loopMedia ?? true,
    heygenJobId: scene.heygenJobId || '',
    heygenStatus: scene.heygenStatus || 'idle',
    heygenAvatarId: scene.heygenAvatarId || '',
    heygenVoiceId: scene.heygenVoiceId || '',
    heygenSourceUrl: scene.heygenSourceUrl || '',
    heygenCompletedMediaUrl: scene.heygenCompletedMediaUrl || '',
    heygenCompletedStoragePath: scene.heygenCompletedStoragePath || '',
    heygenError: scene.heygenError || '',
    narrationScript: scene.narrationScript || scene.narration || '',
    durationInSeconds: Math.max(4, Number(scene.durationInSeconds ?? scene.duration ?? 8)),
  };
}

function normalizeAcademyVideoSettings(settings = {}) {
  return {
    introVideoUrl: settings.introVideoUrl || '',
    introStoragePath: settings.introStoragePath || '',
    introFileName: settings.introFileName || '',
    introDetectedDurationInSeconds: settings.introDetectedDurationInSeconds ? Math.max(1, Number(settings.introDetectedDurationInSeconds)) : undefined,
    introDurationInSeconds: Math.max(1, Number(settings.introDurationInSeconds ?? defaultAcademyVideoSettings.introDurationInSeconds)),
    outroVideoUrl: settings.outroVideoUrl || '',
    outroStoragePath: settings.outroStoragePath || '',
    outroFileName: settings.outroFileName || '',
    outroDetectedDurationInSeconds: settings.outroDetectedDurationInSeconds ? Math.max(1, Number(settings.outroDetectedDurationInSeconds)) : undefined,
    outroDurationInSeconds: Math.max(1, Number(settings.outroDurationInSeconds ?? defaultAcademyVideoSettings.outroDurationInSeconds)),
    updatedAt: settings.updatedAt,
  };
}

async function loadAcademySettingsFromStorage(supabase) {
  const settingsPath = 'video-lesson-builder/settings.json';
  const { data, error } = await supabase.storage.from(ACADEMY_MEDIA_BUCKET).download(settingsPath);
  if (!error && data) {
    return normalizeAcademyVideoSettings(JSON.parse(await data.text()));
  }

  const { data: rootFiles, error: listError } = await supabase.storage.from(ACADEMY_MEDIA_BUCKET).list('', { limit: 100 });
  if (listError) throw listError;
  const introFile = rootFiles?.find((file) => /intro/i.test(file.name) && /\.mp4$/i.test(file.name));
  const outroFile = rootFiles?.find((file) => /outro/i.test(file.name) && /\.mp4$/i.test(file.name));
  const introVideoUrl = introFile ? supabase.storage.from(ACADEMY_MEDIA_BUCKET).getPublicUrl(introFile.name).data.publicUrl : '';
  const outroVideoUrl = outroFile ? supabase.storage.from(ACADEMY_MEDIA_BUCKET).getPublicUrl(outroFile.name).data.publicUrl : '';
  return normalizeAcademyVideoSettings({
    introVideoUrl,
    introStoragePath: introFile?.name || '',
    introFileName: introFile?.name || '',
    outroVideoUrl,
    outroStoragePath: outroFile?.name || '',
    outroFileName: outroFile?.name || '',
  });
}

function assertMediaUploadAllowed({ fileName = '', contentType = '', acceptedKinds = ['image', 'video'] }) {
  const isVideo = contentType.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(fileName);
  const isImage = contentType.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName);
  if (acceptedKinds.includes('video') && isVideo) return;
  if (acceptedKinds.includes('image') && isImage) return;
  const error = new Error(`Unsupported media upload type: ${contentType || fileName}`);
  error.statusCode = 400;
  throw error;
}

function safeStoragePath(pathPrefix, fileName) {
  const safePrefix = String(pathPrefix || 'uploads').replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '-');
  const safeName = String(fileName || 'media.bin').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${safePrefix}/${Date.now()}-${safeName}`;
}

function normalizeVideoLesson(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || `video_lesson_${Date.now()}`,
    title: input.title || 'Untitled Video Lesson',
    description: input.description || '',
    templateId: input.templateId || 'revive-clean',
    scenes: Array.isArray(input.scenes) ? input.scenes.map(normalizeVideoLessonScene) : [],
    courseId: input.courseId,
    lessonId: input.lessonId,
    renderUrl: input.renderUrl,
    renderStorageBucket: input.renderStorageBucket,
    renderStoragePath: input.renderStoragePath,
    renderStorageRef: input.renderStorageRef,
    renderStatus: input.renderStatus === 'rendered' ? 'completed' : input.renderStatus || 'draft',
    academySettings: normalizeAcademyVideoSettings(input.academySettings),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

function getVideoLessonDurationInFrames(lesson) {
  const settings = normalizeAcademyVideoSettings(lesson.academySettings);
  const introFrames = settings.introVideoUrl ? settings.introDurationInSeconds * VIDEO_LESSON_FPS : 0;
  const outroFrames = settings.outroVideoUrl ? settings.outroDurationInSeconds * VIDEO_LESSON_FPS : 0;
  const sceneFrames = lesson.scenes.reduce((total, scene) => (
    total + Math.max(4, scene.durationInSeconds || 8) * VIDEO_LESSON_FPS
  ), 0);

  return introFrames + sceneFrames + outroFrames;
}

function requireSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    const error = new Error('Missing Supabase env vars: SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    error.statusCode = 503;
    throw error;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

app.get('/api/video/health', (_req, res) => {
  res.json({
    status: 'ok',
    heygen: process.env.HEYGEN_API_KEY ? 'configured' : 'not configured',
    supabase: supabaseUrl && supabaseServiceKey ? 'configured' : 'not configured',
  });
});

app.get('/api/admin/video-lessons/academy-settings', async (_req, res) => {
  try {
    const supabase = requireSupabaseClient();
    const settings = await loadAcademySettingsFromStorage(supabase);
    res.json({ settings });
  } catch (err) {
    console.error('Academy video settings load error:', err);
    const payload = getErrorPayload(err, 'Failed to load Academy video settings.');
    res.status(payload.status).json(payload);
  }
});

app.post('/api/admin/video-lessons/academy-settings', async (req, res) => {
  try {
    const supabase = requireSupabaseClient();
    const settings = normalizeAcademyVideoSettings(req.body?.settings);
    const body = JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }, null, 2);
    const { error } = await supabase.storage.from(ACADEMY_MEDIA_BUCKET).upload('video-lesson-builder/settings.json', body, {
      cacheControl: '60',
      contentType: 'application/json',
      upsert: true,
    });
    if (error) throw error;
    const savedSettings = await loadAcademySettingsFromStorage(supabase);
    res.json({ settings: savedSettings });
  } catch (err) {
    console.error('Academy video settings save error:', err);
    const payload = getErrorPayload(err, 'Failed to save Academy video settings.');
    res.status(payload.status).json(payload);
  }
});

app.post('/api/admin/video-lessons/academy-media/upload', async (req, res) => {
  try {
    const supabase = requireSupabaseClient();
    const { pathPrefix, fileName, contentType = 'application/octet-stream', base64, acceptedKinds } = req.body || {};
    if (!base64 || !fileName) {
      return res.status(400).json({
        status: 400,
        error: 'fileName and base64 are required for media uploads.',
        details: 'The builder sends selected media files as base64 to the video server for Supabase upload.',
      });
    }
    assertMediaUploadAllowed({ fileName, contentType, acceptedKinds: acceptedKinds || ['image', 'video'] });
    const storagePath = safeStoragePath(pathPrefix, fileName);
    const buffer = Buffer.from(base64, 'base64');
    const { error } = await supabase.storage.from(ACADEMY_MEDIA_BUCKET).upload(storagePath, buffer, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    });
    if (error) throw error;

    const publicUrl = supabase.storage.from(ACADEMY_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    res.json({
      bucket: ACADEMY_MEDIA_BUCKET,
      storagePath,
      fileName,
      publicUrl,
    });
  } catch (err) {
    console.error('Academy media upload error:', err);
    const payload = getErrorPayload(err, 'Failed to upload Academy media.');
    res.status(payload.status).json(payload);
  }
});

app.post('/api/admin/video-lessons/academy-media/upload-remote', async (req, res) => {
  try {
    const supabase = requireSupabaseClient();
    const { pathPrefix, fileName = 'heygen-avatar-clip.mp4', sourceUrl, acceptedKinds } = req.body || {};
    if (!sourceUrl) {
      return res.status(400).json({
        status: 400,
        error: 'sourceUrl is required for remote media uploads.',
        details: 'The builder imports a completed HeyGen MP4 URL, then the video server uploads it to academy-media.',
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return res.status(400).json({
        status: 400,
        error: 'sourceUrl must be a valid URL.',
        details: sourceUrl,
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        status: 400,
        error: 'Only HTTP or HTTPS media URLs can be imported.',
        details: sourceUrl,
      });
    }

    const remoteResponse = await fetch(sourceUrl);
    if (!remoteResponse.ok) {
      return res.status(remoteResponse.status).json({
        status: remoteResponse.status,
        error: 'Unable to download the completed HeyGen media URL.',
        details: await remoteResponse.text(),
      });
    }

    const contentType = remoteResponse.headers.get('content-type') || 'video/mp4';
    assertMediaUploadAllowed({ fileName, contentType, acceptedKinds: acceptedKinds || ['video'] });
    const storagePath = safeStoragePath(pathPrefix, fileName);
    const buffer = Buffer.from(await remoteResponse.arrayBuffer());
    const { error } = await supabase.storage.from(ACADEMY_MEDIA_BUCKET).upload(storagePath, buffer, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    });
    if (error) throw error;

    const publicUrl = supabase.storage.from(ACADEMY_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    res.json({
      bucket: ACADEMY_MEDIA_BUCKET,
      storagePath,
      fileName,
      publicUrl,
    });
  } catch (err) {
    console.error('Academy remote media upload error:', err);
    const payload = getErrorPayload(err, 'Failed to upload remote Academy media.');
    res.status(payload.status).json(payload);
  }
});

app.post('/api/admin/video-lessons/render', async (req, res) => {
  const renderLog = createStepLogger('VideoLessonBuilder Render');
  try {
    renderLog.log('Video server received request', {
      hasLesson: Boolean(req.body?.lesson),
    });
    const lesson = normalizeVideoLesson(req.body?.lesson);
    renderLog.log('Render request normalized', {
      lessonId: lesson.lessonId,
      videoLessonId: lesson.id,
      sceneCount: lesson.scenes.length,
      introLoaded: Boolean(lesson.academySettings.introVideoUrl),
      outroLoaded: Boolean(lesson.academySettings.outroVideoUrl),
    });
    if (lesson.scenes.length === 0) {
      return res.status(400).json({
        status: 400,
        error: 'Add at least one scene before rendering.',
        details: 'Video Lesson Builder render requests require lesson.scenes.',
        renderLog: renderLog.steps,
      });
    }

    const supabase = requireSupabaseClient();
    const compositionId = 'ReviveVideoLesson';
    const safeId = lesson.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const outName = `${safeId}.mp4`;
    const exportsDir = path.resolve(__dirname, '..', 'public', 'exports');
    const outPath = path.join(exportsDir, outName);
    fs.mkdirSync(exportsDir, { recursive: true });

    renderLog.log('Remotion bundle started', {
      entryPoint: path.resolve(__dirname, '..', 'src', 'remotion', 'index.ts'),
    });
    const bundled = await bundle({
      entryPoint: path.resolve(__dirname, '..', 'src', 'remotion', 'index.ts'),
    });

    renderLog.log('Remotion composition selected', {
      compositionId,
      durationInFrames: getVideoLessonDurationInFrames(lesson),
    });
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps: { lesson },
    });

    renderLog.log('Remotion render started', {
      outputLocation: outPath,
    });
    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: getVideoLessonDurationInFrames(lesson),
      },
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outPath,
      inputProps: { lesson },
    });
    renderLog.log('Render completed', {
      outputLocation: outPath,
    });

    if (!fs.existsSync(outPath)) {
      const error = new Error(`Remotion completed but no MP4 was written at ${outPath}`);
      error.statusCode = 500;
      throw error;
    }

    const mp4Buffer = fs.readFileSync(outPath);
    const mp4Stats = fs.statSync(outPath);
    renderLog.log('MP4 written', {
      outputLocation: outPath,
      bytes: mp4Stats.size,
    });

    const bucketPath = `${lesson.courseId || 'unassigned-course'}/${lesson.lessonId || safeId}/${Date.now()}-${outName}`;
    const storageRef = createStorageRef(RENDER_BUCKET, bucketPath);
    renderLog.log('MP4 upload to Supabase started', {
      bucket: RENDER_BUCKET,
      path: bucketPath,
    });
    const { error: uploadError } = await supabase.storage.from(RENDER_BUCKET).upload(bucketPath, mp4Buffer, {
      cacheControl: '31536000',
      contentType: 'video/mp4',
      upsert: true,
    });

    if (uploadError) throw uploadError;
    renderLog.log('MP4 uploaded to Supabase', {
      bucket: RENDER_BUCKET,
      path: bucketPath,
    });

    const parentPath = bucketPath.split('/').slice(0, -1).join('/');
    const fileName = bucketPath.split('/').pop();
    const { data: listedFiles, error: listError } = await supabase.storage.from(RENDER_BUCKET).list(parentPath, {
      search: fileName,
      limit: 20,
    });
    if (listError) throw listError;
    const uploadedFile = listedFiles?.find((file) => file.name === fileName);
    if (!uploadedFile) {
      const error = new Error(`Supabase upload did not appear in ${RENDER_BUCKET}/${parentPath}.`);
      error.statusCode = 502;
      error.details = { bucket: RENDER_BUCKET, path: bucketPath, listedFiles };
      throw error;
    }
    renderLog.log('Uploaded MP4 verified in lesson-videos bucket', {
      bucket: RENDER_BUCKET,
      path: bucketPath,
      size: uploadedFile.metadata?.size || uploadedFile.metadata?.contentLength || mp4Stats.size,
    });

    const { data: publicUrlData } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(bucketPath);
    let renderUrl = publicUrlData.publicUrl;
    let accessMode = 'public';
    try {
      const publicCheck = await fetch(renderUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      if (!publicCheck.ok) {
        accessMode = 'signed';
        const publicError = await publicCheck.text();
        renderLog.log('Public URL check failed; creating signed URL', {
          status: publicCheck.status,
          body: publicError,
        });
        const { data: signedData, error: signedError } = await supabase.storage
          .from(RENDER_BUCKET)
          .createSignedUrl(bucketPath, 60 * 60 * 24 * 365);
        if (signedError) throw signedError;
        renderUrl = signedData.signedUrl;
      }
    } catch (urlError) {
      if (accessMode !== 'signed') {
        accessMode = 'signed';
        renderLog.log('Public URL check errored; creating signed URL', {
          error: toReadableString(urlError.message || urlError),
        });
        const { data: signedData, error: signedError } = await supabase.storage
          .from(RENDER_BUCKET)
          .createSignedUrl(bucketPath, 60 * 60 * 24 * 365);
        if (signedError) throw signedError;
        renderUrl = signedData.signedUrl;
      } else {
        throw urlError;
      }
    }
    renderLog.log('Public URL generated', {
      lessonId: lesson.lessonId,
      renderUrl,
      accessMode,
    });
    res.json({
      renderUrl,
      renderStorageBucket: RENDER_BUCKET,
      renderStoragePath: bucketPath,
      renderStorageRef: storageRef,
      renderLog: renderLog.steps,
      lesson: {
        ...lesson,
        renderUrl,
        renderStorageBucket: RENDER_BUCKET,
        renderStoragePath: bucketPath,
        renderStorageRef: storageRef,
        renderStatus: 'completed',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Video Lesson Builder render error:', err);
    const payload = getErrorPayload(err, 'Failed to render video lesson.');
    res.status(payload.status).json({
      ...payload,
      renderLog: renderLog.steps,
      rawError: {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      },
    });
  }
});

app.post('/api/admin/video-lessons/attach', async (req, res) => {
  const attachLog = createStepLogger('VideoLessonBuilder Attach');
  try {
    attachLog.log('Lesson update request received', {
      hasLesson: Boolean(req.body?.lesson),
    });
    const lesson = normalizeVideoLesson(req.body?.lesson);
    if (!lesson.courseId || !lesson.lessonId) {
      return res.status(400).json({
        status: 400,
        error: 'courseId and lessonId are required.',
        details: 'Choose a course lesson before attaching the exported video.',
      });
    }

    if (!lesson.renderUrl) {
      return res.status(400).json({
        status: 400,
        error: 'No final MP4 URL exists. Export MP4 before attaching it to a lesson.',
        details: 'The attach route writes lesson.renderUrl into lessons.video_url.',
      });
    }

    const supabase = requireSupabaseClient();
    const storageRef = lesson.renderStorageRef || (
      lesson.renderStorageBucket && lesson.renderStoragePath
        ? createStorageRef(lesson.renderStorageBucket, lesson.renderStoragePath)
        : null
    );
    const videoUrlForLesson = storageRef || lesson.renderUrl;
    attachLog.log('Lesson update started', {
      lessonId: lesson.lessonId,
      renderUrl: lesson.renderUrl,
      storedVideoValue: videoUrlForLesson,
    });
    const { data, error } = await supabase
      .from('lessons')
      .update({
        video_url: videoUrlForLesson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.lessonId)
      .select('*')
      .single();

    if (error) throw error;

    attachLog.log('Lesson updated', {
      lessonId: lesson.lessonId,
      videoUrl: data.video_url,
    });
    res.json({ ok: true, lesson, updatedLesson: data, renderLog: attachLog.steps });
  } catch (err) {
    console.error('Video Lesson Builder attach error:', err);
    const payload = getErrorPayload(err, 'Failed to attach video lesson.');
    res.status(payload.status).json({ ...payload, renderLog: attachLog.steps });
  }
});

app.post('/api/video/lesson-playback-url', async (req, res) => {
  const playbackLog = createStepLogger('VideoLesson Playback');
  try {
    const source = req.body?.videoUrl || req.body?.storageRef || '';
    playbackLog.log('Playback URL request received', {
      hasSource: Boolean(source),
    });

    if (!source) {
      return res.status(400).json({
        status: 400,
        error: 'No lesson video source was provided.',
        details: 'CoursePlayer must send the lesson video_url or storage reference.',
        playbackLog: playbackLog.steps,
      });
    }

    const storageRef = parseStorageRef(source);
    if (!storageRef) {
      playbackLog.log('Direct video URL returned', {
        source,
      });
      return res.json({
        playbackUrl: source,
        accessMode: 'direct',
        playbackLog: playbackLog.steps,
      });
    }

    const supabase = requireSupabaseClient();
    const result = await createPlayableVideoUrl(supabase, source, req.body?.expiresIn);
    playbackLog.log('Fresh signed playback URL generated', {
      bucket: result.storageRef.bucket,
      objectPath: result.storageRef.objectPath,
      expiresIn: result.expiresIn,
    });

    res.json({
      ...result,
      playbackLog: playbackLog.steps,
    });
  } catch (err) {
    console.error('Video Lesson playback URL error:', err);
    const payload = getErrorPayload(err, 'Failed to generate a signed lesson video URL.');
    res.status(payload.status).json({ ...payload, playbackLog: playbackLog.steps });
  }
});

app.post('/api/video/generate-heygen-video', async (req, res) => {
  const { lessonId, title, narration, storyboard, brandStyle } = req.body;

  if (!lessonId || !title || !narration) {
    return res.status(400).json({
      status: 400,
      error: 'Missing required fields: lessonId, title, narration',
      details: 'The admin client must send lessonId, title, and narration to queue a HeyGen video.',
    });
  }

  if (!process.env.HEYGEN_API_KEY) {
    return res.status(503).json({
      status: 503,
      error: 'Missing HEYGEN_API_KEY in .env',
      details: 'Add HEYGEN_API_KEY to the project .env file, then restart node server/video-server.js.',
    });
  }

  try {
    const created = await createHeyGenVideo({ title, narration, storyboard, brandStyle });
    res.json({
      status: 'queued',
      lessonId,
      videoId: created.videoId,
    });
  } catch (err) {
    console.error('HeyGen video generation error:', err);
    const payload = getErrorPayload(err, 'Failed to queue HeyGen video.');
    console.log('[VideoServer] HeyGen generation error response:', {
      rawError: err,
      payload,
    });
    res.status(payload.status).json(payload);
  }
});

app.get('/api/video/heygen-status/:videoId', async (req, res) => {
  if (!process.env.HEYGEN_API_KEY) {
    return res.status(503).json({
      status: 503,
      error: 'Missing HEYGEN_API_KEY in .env',
      details: 'Add HEYGEN_API_KEY to the project .env file, then restart node server/video-server.js.',
    });
  }

  try {
    const status = await getHeyGenVideoStatus(req.params.videoId);
    res.json({
      status: normalizeHeyGenStatus(status.status),
      videoUrl: status.videoUrl,
      error: status.error ? toReadableString(status.error) : null,
    });
  } catch (err) {
    console.error('HeyGen status error:', err);
    const payload = getErrorPayload(err, 'Failed to fetch HeyGen status.');
    console.log('[VideoServer] HeyGen status error response:', {
      rawError: err,
      payload,
    });
    res.status(payload.status).json(payload);
  }
});

app.listen(PORT, () => {
  console.log(`\n  Video server running on http://localhost:${PORT}`);
  console.log('  Endpoints:');
  console.log('     GET  /api/video/health');
  console.log('     GET  /api/admin/video-lessons/academy-settings');
  console.log('     POST /api/admin/video-lessons/academy-settings');
  console.log('     POST /api/admin/video-lessons/academy-media/upload');
  console.log('     POST /api/admin/video-lessons/academy-media/upload-remote');
  console.log('     POST /api/admin/video-lessons/render');
  console.log('     POST /api/admin/video-lessons/attach');
  console.log('     POST /api/video/lesson-playback-url');
  console.log('     POST /api/video/generate-heygen-video');
  console.log('     GET  /api/video/heygen-status/:videoId');
  console.log(`  HeyGen: ${process.env.HEYGEN_API_KEY ? 'Configured' : 'Not configured'}\n`);
});
