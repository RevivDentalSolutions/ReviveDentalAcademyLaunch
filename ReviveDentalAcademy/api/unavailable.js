export default function handler(_req, res) {
  res.status(503).json({ error: 'This service is paused while Academy repairs are completed. Your saved courses are unaffected.' });
}
