import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
export const tokens = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo nao permitido' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'e-mail invalido' });
  if (!email.toLowerCase().endsWith('@gupy.com.br')) return res.status(403).json({ error: 'acesso restrito a e-mails @gupy.com.br' });

  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { email: email.toLowerCase(), exp: Date.now() + 30 * 60 * 1000 });

  const link = 'https://brandformance-dashboard.vercel.app/verify.html?token=' + token;

  try {
    await resend.emails.send({
      from: 'Brandformance <onboarding@resend.dev>',
      to: email,
      subject: 'Seu acesso ao Brandformance Dashboard',
      html: '<div style="font-family:Arial,sans-serif;background:#0a0a0b;padding:40px 20px"><div style="max-width:420px;margin:0 auto;background:#111114;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:40px"><h2 style="color:#f0f0ef;font-size:18px;margin-bottom:8px">Acesso ao Dashboard</h2><p style="color:#6b6b72;font-size:13px;margin-bottom:28px;line-height:1.6">Clique no botao abaixo para acessar o Brandformance Score. O link expira em <strong style="color:#f0f0ef">30 minutos</strong>.</p><a href="' + link + '" style="display:inline-block;background:#2dcc8f;color:#0a0a0b;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Acessar Dashboard</a></div></div>',
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: err.message });
  }
}
