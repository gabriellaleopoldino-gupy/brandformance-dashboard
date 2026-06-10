/**
 * /api/data
 * Lê o data.json público do GitHub e serve para o dashboard.
 * Cache de 10 minutos para evitar rate limit do GitHub.
 *
 * Variável de ambiente necessária no Vercel:
 *   GITHUB_OWNER  → seu usuário/org no GitHub (ex: gupy-marketing)
 *   GITHUB_REPO   → nome do repositório (ex: brandformance-dashboard)
 */

let cache = { data: null, ts: 0 };
const CACHE_TTL = 10 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache.data);
  }

  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    return res.status(500).json({ error: 'GITHUB_OWNER ou GITHUB_REPO não configurados' });
  }

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/data.json?v=${Date.now()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`GitHub raw: ${resp.status}`);

    const data = await resp.json();
    cache = { data, ts: Date.now() };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (e) {
    console.error('Erro ao ler GitHub:', e);
    return res.status(500).json({ error: e.message });
  }
}
