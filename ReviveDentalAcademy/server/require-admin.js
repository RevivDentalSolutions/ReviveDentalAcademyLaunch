/** Fail closed before any privileged AI/video work. Never trust user-supplied roles. */
export function requireAdmin(getClient) {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ error: 'Sign in as an administrator.' });
    try {
      const client = getClient();
      const { data, error } = await client.auth.getUser(match[1]);
      if (error || !data.user) return res.status(401).json({ error: 'Session expired. Sign in again.' });
      const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', data.user.id).single();
      if (profileError || profile?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
      req.user = data.user;
      next();
    } catch { res.status(503).json({ error: 'Authorization service unavailable.' }); }
  };
}
