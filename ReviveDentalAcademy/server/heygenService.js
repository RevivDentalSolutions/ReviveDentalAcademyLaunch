const HEYGEN_API_BASE = 'https://api.heygen.com';

function toReadableString(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class HeyGenApiError extends Error {
  constructor(message, { statusCode, details, responseBody } = {}) {
    super(toReadableString(message, 'HeyGen API error'));
    this.name = 'HeyGenApiError';
    this.statusCode = statusCode;
    this.details = toReadableString(details, '');
    this.responseBody = responseBody;
  }
}

function requireHeyGenApiKey() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new HeyGenApiError('Missing HEYGEN_API_KEY in .env', {
      statusCode: 503,
      details: 'Add HEYGEN_API_KEY to the project .env file, then restart node server/video-server.js.',
    });
  }
  return apiKey;
}

async function heygenRequest(path, options = {}) {
  const apiKey = requireHeyGenApiKey();
  try {
    const response = await fetch(`${HEYGEN_API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        ...(options.headers || {}),
      },
    });

    const bodyText = await response.text();
    let body = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = { raw: bodyText };
    }

    if (!response.ok) {
      const message = body?.message
        ? toReadableString(body.message)
        : body?.error
          ? toReadableString(body.error)
          : `HeyGen API error ${response.status}`;
      throw new HeyGenApiError(message, {
        statusCode: response.status,
        details: bodyText || toReadableString(body),
        responseBody: body,
      });
    }

    return body;
  } catch (err) {
    console.log('[HeyGenService] HeyGen error response:', {
      path,
      message: toReadableString(err?.message),
      statusCode: err?.statusCode,
      details: toReadableString(err?.details),
      responseBody: err?.responseBody,
    });
    throw err;
  }
}

export async function createHeyGenVideo({ title, narration, storyboard, brandStyle }) {
  if (!narration?.trim()) {
    throw new Error('Narration is required to generate a HeyGen video.');
  }

  // TODO: Replace avatar_id and voice_id with Revive-approved HeyGen assets.
  // HeyGen account setups vary. This payload follows the current v2 generation
  // shape, but the isolated service lets us adjust avatar, voice, template, or
  // presentation settings without touching admin UI or course code.
  const payload = {
    title: title || 'Revive Dental Academy Lesson Video',
    caption: true,
    dimension: { width: 1280, height: 720 },
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: process.env.HEYGEN_AVATAR_ID || 'default',
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: narration,
          voice_id: process.env.HEYGEN_VOICE_ID || undefined,
        },
        background: {
          type: 'color',
          value: '#1F252D',
        },
      },
    ],
    metadata: {
      brandStyle,
      storyboard,
    },
  };

  const result = await heygenRequest('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const videoId = result?.data?.video_id || result?.video_id || result?.data?.id;
  if (!videoId) {
    throw new Error('HeyGen did not return a video id.');
  }

  return { videoId, raw: result };
}

export async function getHeyGenVideoStatus(videoId) {
  if (!videoId) throw new Error('videoId is required.');

  const result = await heygenRequest(`/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    method: 'GET',
  });

  const data = result?.data || result;
  const status = data?.status || 'processing';
  const videoUrl = data?.video_url || data?.url || null;
  const error = data?.error || data?.error_msg ? toReadableString(data?.error || data?.error_msg) : null;

  return {
    status,
    videoUrl,
    error,
    raw: result,
  };
}
