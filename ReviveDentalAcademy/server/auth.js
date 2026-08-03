import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function configuredAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Server authentication is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    error.statusCode = 503;
    throw error;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

export async function authenticateRequest(request, response, next) {
  const token = getBearerToken(request);
  if (!token) return response.status(401).json({ error: 'Sign in is required.' });

  try {
    const supabase = configuredAdminClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return response.status(401).json({ error: 'Your session is invalid or has expired.' });

    request.auth = { token, user: data.user, supabase };
    return next();
  } catch (error) {
    console.error('Authentication setup error:', error.message);
    return response.status(error.statusCode || 500).json({ error: error.message || 'Unable to authenticate request.' });
  }
}

export async function requireAdmin(request, response, next) {
  await authenticateRequest(request, response, async () => {
    try {
      const { data: profile, error } = await request.auth.supabase
        .from('profiles')
        .select('role')
        .eq('id', request.auth.user.id)
        .maybeSingle();

      if (error) throw error;
      if (profile?.role !== 'admin') return response.status(403).json({ error: 'Administrator access is required.' });

      request.auth.profile = profile;
      return next();
    } catch (error) {
      console.error('Administrator authorization error:', error.message);
      return response.status(500).json({ error: 'Unable to verify administrator access.' });
    }
  });
}

export function createCorsOptions() {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  function isRevivePreviewOrigin(origin) {
    try {
      const url = new URL(origin);
      return (
        url.protocol === 'https:' &&
        /^revive-dental-academy-launc(?:h)?(?:-[a-z0-9-]+)?-reviverds-4389s-projects\.vercel\.app$/i.test(url.hostname)
      );
    } catch {
      return false;
    }
  }

  return {
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin) || isRevivePreviewOrigin(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by this API.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
