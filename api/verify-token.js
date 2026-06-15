import { tokens } from './send-magic-link.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token ausente' });
  const record = tokens.get(token);
  if (!record) return res.status(401).json({ error: 'token inválido' });
  if (Date.now() > record.exp) {
    tokens.delete(token);
    return res.status(401).json({ error: 'token expirado — solicite um novo link' });
  }
  tokens.delete(token); // uso único
  return res.status(200).json({
    ok: true,
    email: record.email,
    // Sessão de 30 dias no browser
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
}
