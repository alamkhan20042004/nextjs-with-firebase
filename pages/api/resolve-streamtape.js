// Serverless function to resolve a Streamtape watch URL to a direct MP4 stream URL.
// NOTE: Streamtape frequently obfuscates the final URL using JS; this simplified approach
// attempts to parse the page for a "robotlink" variable or a direct get_video link pattern.
// This may break if Streamtape changes markup. For production you may need a headless
// browser or a maintained extractor service.

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || !/^https?:\/\/[^\s]+streamtape\.com\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid or missing Streamtape URL' });
  }
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) {
      return res.status(500).json({ error: 'Failed to fetch page' });
    }
    const html = await r.text();

    // Look for something like document.getElementById('robotlink').innerHTML = "//abcdef/..." + ("..." + "...")
    // Simplified regex to capture concatenated pieces.
    let direct = null;
    const robotMatch = html.match(/id=\"robotlink\"[^>]*>\s*([^<]+)</i);
    if (robotMatch) {
      // Sometimes the link is built with +'s; remove whitespace
      let raw = robotMatch[1].trim();
      // If it contains concatenations like "+" remove quotes and pluses
      raw = raw.replace(/['"+]/g, '');
      if (raw.startsWith('//')) raw = 'https:' + raw;
      direct = raw;
    }

    if (!direct) {
      // Fallback: look for get_video URL pattern (escaped slashes because inside JS regex literal in source code)
      const gv = html.match(/(https?:\/\/[^"']+get_video\?[^"']+)/i);
      if (gv) direct = gv[1].replace(/\u0026/g, '&');
    }

    if (!direct) {
      return res.status(404).json({ error: 'Could not resolve direct video link' });
    }
    return res.status(200).json({ url: direct });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
