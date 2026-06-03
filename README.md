# Brandformance Score Dashboard · Gupy Mídia

Dashboard de performance de mídia com atualização automática diária.

## Estrutura

```
/
├── index.html        ← Dashboard completo (HTML + CSS + JS)
├── data.json         ← Dados processados (gerado automaticamente)
├── apps-script.gs    ← Script de atualização (Google Apps Script)
└── README.md
```

## Setup — passo a passo

### 1. GitHub Pages

1. Crie um repositório no GitHub: `brandformance-dashboard`
2. Faça upload dos arquivos `index.html`, `data.json` e `README.md`
3. Vá em **Settings → Pages → Branch: main → Save**
4. Acesse: `https://SEU_USUARIO.github.io/brandformance-dashboard`

### 2. Cloudflare Access (proteção por e-mail @gupy.io)

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → crie conta gratuita
2. Vá em **Zero Trust → Access → Applications → Add an application**
3. Escolha **Self-hosted**, configure:
   - Application name: `Brandformance Dashboard`
   - Session duration: `24 hours`
   - Application domain: `SEU_USUARIO.github.io/brandformance-dashboard`
4. Em **Policies**, crie uma regra:
   - Action: `Allow`
   - Include: **Emails ending in** → `@gupy.io`
5. Salve. Agora só e-mails `@gupy.io` conseguem acessar.

### 3. Apps Script (atualização automática às 08h30)

1. Abra a planilha no Google Sheets
2. **Extensões → Apps Script**
3. Cole o conteúdo de `apps-script.gs`
4. Preencha as constantes no topo:
   ```js
   const GITHUB_OWNER = 'seu-usuario-github';
   const GITHUB_REPO  = 'brandformance-dashboard';
   const GITHUB_TOKEN = 'ghp_...';  // Personal Access Token
   ```
5. Para gerar o GitHub Token:
   - GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
   - Escopo necessário: `repo` (acesso de escrita)
6. Execute `createTrigger()` uma vez manualmente para criar o gatilho diário
7. Teste executando `updateDashboard()` — verifique o log

### Fluxo automático

```
07h–08h  Supermetrics atualiza o Google Sheets
08h30    Apps Script lê base_consolidada → calcula scores → gera data.json
08h30    data.json é enviado ao GitHub via API
         Dashboard na URL pública carrega os dados atualizados
```

## Atualização manual

Para forçar uma atualização imediata, execute `updateDashboard()` no Apps Script.

---

Drive folder: `1eM0Mp7EwdTrpyba0N3-ivX7gpcbY_9hX`
Sheet ID: `1GyDGcHimpNX7lksj6CLcMC7GJKUJB2PKZURLFcIN3Y8`
