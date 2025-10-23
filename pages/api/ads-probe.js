export default function handler(req, res) {
  // Minimal response. Some blockers may block any path containing "ads".
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
}
