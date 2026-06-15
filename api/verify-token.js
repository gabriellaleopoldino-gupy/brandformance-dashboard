import crypto from 'crypto';

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('token invalido');

  const [header, payload, sig] = parts;
  const secret = process.env.JWT_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');
  if (sig !== expected) throw new Error('token invalido');

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (Math.floor(Date.now() / 1000) > data.exp) throw new Error('token expirado — solicite um novo link');

  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token ausente' });

  try {
    const data = verifyToken(token);
    return res.status(200).json({
      ok: true,
      email: data.email,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
