// api/generate-link.js
// Endpoint admin para gerar magic links sem enviar email
import crypto from 'crypto';

function makeToken(email) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 30 dias
  })).toString('base64url');
  const secret = process.env.JWT_SECRET;
  const sig = crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sig;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo nao permitido' });

  const { email, admin_key } = req.body || {};

  // Chave de admin simples — troque por algo mais seguro se precisar
  if (admin_key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'não autorizado' });
  }

  if (!email || !email.toLowerCase().endsWith('@gupy.com.br')) {
    return res.status(400).json({ error: 'email inválido' });
  }

  const token = makeToken(email.toLowerCase());
  const link  = 'https://brandformance-dashboard.vercel.app/verify.html?token=' + token;

  return res.status(200).json({ link });
}
