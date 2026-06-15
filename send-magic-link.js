import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Token store em memória (válido dentro do mesmo processo)
// Para maior robustez, substitua por Vercel KV: https://vercel.com/docs/storage/vercel-kv
const tokens = new Map();
export { tokens };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'método não permitido' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'e-mail inválido' });
if (!email.toLowerCase().endsWith('@gupy.com.br')) return res.status(403).json({ error: 'acesso restrito a e-mails @gupy.com.br' });
  
  const token = crypto.randomBytes(32).toString('hex');
  // Token do link: expira em 30 minutos
  tokens.set(token, { email: email.toLowerCase(), exp: Date.now() + 30 * 60 * 1000 });

  const link = `https://brandformance-dashboard.vercel.app/verify.html?token=${token}`;

  try {
    await resend.emails.send({
      from: 'Brandformance <noreply@gupy.com.br>',   // troque para onboarding@resend.dev durante testes
      to: email,
      subject: 'Seu acesso ao Brandformance Dashboard',
      html: `
        <div style="font-family:'Syne',Arial,sans-serif;background:#0a0a0b;padding:40px 20px;min-height:100vh">
          <div style="max-width:420px;margin:0 auto;background:#111114;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:40px">
            <div style="width:36px;height:36px;background:#2dcc8f;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:13px;font-weight:500;color:#0a0a0b;margin-bottom:28px">bf</div>
            <h2 style="color:#f0f0ef;font-size:18px;margin-bottom:8px">Acesso ao Dashboard</h2>
            <p style="color:#6b6b72;font-size:13px;margin-bottom:28px;line-height:1.6">Clique no botão abaixo para acessar o Brandformance Score. O link expira em <strong style="color:#f0f0ef">30 minutos</strong>. Após o primeiro acesso, a sessão fica ativa por <strong style="color:#f0f0ef">30 dias</strong>.</p>
            <a href="${link}" style="display:inline-block;background:#2dcc8f;color:#0a0a0b;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Acessar Dashboard →</a>
            <p style="color:#3a3a42;font-size:11px;margin-top:28px;font-family:monospace">Se você não solicitou este acesso, ignore este e-mail.</p>
          </div>
        </div>`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'erro ao enviar e-mail' });
  }
}
