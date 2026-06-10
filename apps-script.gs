// ============================================================
// Brandformance Dashboard — Apps Script
// Roda todo dia às 08h30, após o Supermetrics atualizar
// Envia data.json para o GitHub (lido pelo dashboard via Vercel)
// ============================================================

const SHEET_ID     = '1GyDGcHimpNX7lksj6CLcMC7GJKUJB2PKZURLFcIN3Y8';
const GITHUB_OWNER = 'SEU_USUARIO_GITHUB';   // ex: gupy-marketing
const GITHUB_REPO  = 'brandformance-dashboard';
const GITHUB_TOKEN = 'SEU_GITHUB_TOKEN';     // Personal Access Token (escopo: repo)
const DATA_FILE    = 'data.json';

// ── Ponto de entrada ────────────────────────────────────────
function updateDashboard() {
  try {
    const data = buildDashboardData();
    pushToGitHub(JSON.stringify(data, null, 2));
    Logger.log('✅ data.json atualizado com sucesso');
  } catch (e) {
    Logger.log('❌ Erro: ' + e.message);
    MailApp.sendEmail(Session.getActiveUser().getEmail(),
      '[Dashboard] Erro na atualização', e.message);
  }
}

// ── Lê e processa base_consolidada ──────────────────────────
function buildDashboardData() {
  const ss   = SpreadsheetApp.openById(SHEET_ID);
  const base = ss.getSheetByName('base_consolidada');
  const raw  = base.getDataRange().getValues();

  const headers = raw[0];
  const col = k => headers.indexOf(k);

  const iP  = col('Plataforma'),    iT  = col('Tipo de Campanha');
  const iN  = col('Nome'),          iM  = col('Mês');
  const iC  = col('Cost'),          iI  = col('Impressions');
  const iSF = col('Score Final'),   iTx = col('Tx Engajamento');
  const iAd = col('Ad name'),       iV  = col('Video');
  const iO  = col('Objetivo');

  const fileMap = buildFileMap(ss);

  const rows = raw.slice(1)
    .filter(r => r[iT] === 'Brandformance' && r[iM])
    .map(r => ({
      plat:  r[iP] || '',
      nome:  r[iN] || '',
      mes:   monthKey(r[iM]),
      cost:  toNum(r[iC]),
      imp:   toNum(r[iI]),
      sf:    toNum(r[iSF]),
      txEng: toNum(r[iTx]),
      ad:    r[iAd] || '',
      video: r[iV] === 'Sim',
      obj:   r[iO] || ''
    }));

  const months   = [...new Set(rows.map(r => r.mes))].sort();
  const latest   = months[months.length - 1];
  const prev     = months[months.length - 2] || null;
  const Q2_START = '2026-04';
  const YR_START = '2026-01';

  const dM = rows.filter(r => r.mes === latest);
  const dQ = rows.filter(r => r.mes >= Q2_START);
  const dY = rows.filter(r => r.mes >= YR_START);
  const dP = prev ? rows.filter(r => r.mes === prev) : [];

  const monthly = months.map(m => {
    const d  = rows.filter(r => r.mes === m);
    const li = d.filter(r => r.plat === 'Linkedin');
    const me = d.filter(r => r.plat === 'Meta');
    return {
      mes:      mLabel(m),
      total:    r1(ws(d)),
      Linkedin: li.length ? r1(ws(li)) : null,
      Meta:     me.length ? r1(ws(me)) : null
    };
  });

  const initMap = {};
  rows.forEach(r => {
    if (!initMap[r.nome]) initMap[r.nome] = { rows: [], plat: r.plat };
    initMap[r.nome].rows.push(r);
  });
  const totalInvest = rows.reduce((s, r) => s + r.cost, 0);
  const inits = Object.entries(initMap).map(([nome, g]) => ({
    nome,
    score:        r1(ws(g.rows)),
    investimento: Math.round(g.rows.reduce((s, r) => s + r.cost, 0)),
    impressoes:   Math.round(g.rows.reduce((s, r) => s + r.imp,  0)),
    engajamento:  r2(g.rows.reduce((s, r) => s + r.txEng, 0) / g.rows.length * 100),
    plat:         g.plat,
    share:        r1(g.rows.reduce((s, r) => s + r.cost, 0) / totalInvest * 100),
    monthly:      months.map(m => {
      const dm = g.rows.filter(r => r.mes === m);
      return { mes: mLabel(m), score: (dm.length && dm.reduce((s,r)=>s+r.cost,0)>0) ? r1(ws(dm)) : null };
    })
  })).sort((a, b) => b.score - a.score);

  const adMap = {};
  rows.forEach(r => {
    if (!r.ad) return;
    if (!adMap[r.ad]) adMap[r.ad] = { ad: r.ad, rows: [], plat: r.plat, video: r.video, nome: r.nome, obj: r.obj };
    adMap[r.ad].rows.push(r);
  });
  const creatives = Object.values(adMap)
    .filter(g => g.rows.reduce((s, r) => s + r.cost, 0) >= 5)
    .map(g => {
      const cost = g.rows.reduce((s, r) => s + r.cost, 0);
      const m    = g.ad.match(/_(\d{3,4})_/);
      const code = m ? m[1] : null;
      return {
        ad:           g.ad,
        code,
        score:        r1(ws(g.rows)),
        investimento: Math.round(cost),
        impressoes:   Math.round(g.rows.reduce((s, r) => s + r.imp, 0)),
        plat:         g.plat,
        video:        g.video,
        nome:         g.nome,
        obj:          g.obj,
        drive_file:   code ? (fileMap[code] || '') : ''
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  return {
    generated_at: new Date().toISOString(),
    kpis: {
      sMes:        r1(ws(dM)),
      sQ2:         r1(ws(dQ)),
      sYear:       r1(ws(dY)),
      sPrev:       r1(ws(dP)),
      investTotal: Math.round(totalInvest),
      investMes:   Math.round(dM.reduce((s, r) => s + r.cost, 0)),
      impMes:      Math.round(dM.reduce((s, r) => s + r.imp,  0)),
      mesLabel:    mLabel(latest),
      prevLabel:   prev ? mLabel(prev) : ''
    },
    plat: {
      Linkedin: r1(ws(dM.filter(r => r.plat === 'Linkedin'))),
      Meta:     r1(ws(dM.filter(r => r.plat === 'Meta')))
    },
    monthly,
    inits,
    creatives,
    months: months.map(mLabel)
  };
}

// ── Lê Arquivo de Criativos → { código: 'arquivo.png' } ─────
function buildFileMap(ss) {
  const ws2 = ss.getSheetByName('Arquivo de Criativos');
  const map  = {};
  ws2.getDataRange().getValues().forEach(row => {
    const code  = row[3];
    const fname = row[5];
    if (!code || !fname) return;
    try {
      const c = String(Math.round(parseFloat(String(code))));
      const f = String(fname).trim();
      if (f && f !== 'não encontrado' && !isNaN(c)) map[c] = f;
    } catch(_) {}
  });
  return map;
}

// ── Faz push do data.json para o GitHub ─────────────────────
function pushToGitHub(content) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE}`;

  const getResp = UrlFetchApp.fetch(apiUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
    muteHttpExceptions: true
  });
  const existing = JSON.parse(getResp.getContentText());
  const sha = existing.sha || null;

  const body = {
    message: `chore: atualiza dados ${new Date().toISOString().slice(0,10)}`,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8)
  };
  if (sha) body.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  if (putResp.getResponseCode() >= 400)
    throw new Error('GitHub API: ' + putResp.getContentText());
}

// ── Cria o trigger automático (rode UMA vez manualmente) ─────
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('updateDashboard')
    .timeBased().atHour(8).nearMinute(30).everyDays(1).create();
  Logger.log('✅ Trigger criado: todo dia às 08h30');
}

// ── Helpers ─────────────────────────────────────────────────
function ws(arr) {
  const cost = arr.reduce((s, r) => s + r.cost, 0);
  return cost ? arr.reduce((s, r) => s + r.sf * r.cost, 0) / cost : 0;
}
function toNum(v)  { return parseFloat(String(v || '').replace(',', '.')) || 0; }
function r1(n)     { return Math.round(n * 10) / 10; }
function r2(n)     { return Math.round(n * 100) / 100; }
function monthKey(v) {
  if (!v) return '';
  if (v instanceof Date) return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2,'0');
  const d = new Date(v); return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function mLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(m)-1]+'/'+y.slice(2);
}
