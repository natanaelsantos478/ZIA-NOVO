# ZIA Careers Site

Portal público de vagas — projeto standalone para deploy no Vercel como subdomínio.

## Deploy no Vercel

### 1. Criar novo projeto no Vercel

No dashboard do Vercel, clique em **Add New Project** e importe este repositório.
- **Root Directory:** `careers-site`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 2. Configurar domínio / subdomínio

Após o deploy, vá em **Settings → Domains** e adicione:
```
vagas.suaempresa.com.br
```
ou use o domínio gerado automaticamente pelo Vercel.

### 3. Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | URL da API da plataforma ZIA | `https://api.ziamind.com.br` |
| `VITE_PLATFORM_URL` | URL da plataforma interna | `https://app.ziamind.com.br` |

> Sem `VITE_API_URL`, o site funciona com dados mock (modo demonstração).

## Integração com a plataforma ZIA

### Hoje (modo mock)
- As vagas exibidas são hardcoded em `src/services/vacanciesService.ts`
- As candidaturas são simuladas localmente

### Quando o backend estiver pronto
Configure `VITE_API_URL` apontando para a API REST da plataforma ZIA.

A API deve expor:
```
GET  /api/vacancies        → lista vagas públicas ativas
GET  /api/vacancies/:slug  → detalhe de uma vaga
POST /api/candidates       → registra candidatura
```

Quando uma vaga é criada na plataforma ZIA (módulo RH → Vagas), ela aparece
automaticamente neste portal. Quando um candidato se inscreve aqui, aparece
automaticamente no ATS da plataforma.

## Desenvolvimento local

```bash
cd careers-site
npm install
npm run dev          # http://localhost:5174
```
