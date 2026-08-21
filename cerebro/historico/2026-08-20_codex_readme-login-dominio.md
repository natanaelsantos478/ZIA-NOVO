---
agente: Codex
data: 2026-08-20
tema: README e domínio de login
branch: work
---

# README e correção do domínio de login

## O que foi feito

- Substituído o README padrão do Vite por documentação do ZIA Omnisystem.
- Documentados arquitetura, módulos, configuração, autenticação, multi-tenancy, banco, deploy e solução de problemas.
- Corrigidos os dois links de login do site público, removendo o domínio desativado `hatsuit.com.br`.
- Os links agora usam `/app`, mantendo a navegação no mesmo domínio que serviu o site.
- Versão elevada de `2.1.5-beta` para `2.1.6-beta`.

## Arquivos modificados

- `README.md`
- `public/home.html`
- `package.json`
- `package-lock.json`
- `src/lib/version.ts`

## Decisões

- Links do site público para a plataforma devem ser relativos ao domínio (`/app`), sem domínio de produção fixado no HTML.
- A URL relativa funciona em produção, homologação e desenvolvimento e evita nova dependência de domínios antigos.

## Pendências

- Publicar o novo build no Cloudflare.
- Se o endereço antigo persistir após o deploy, invalidar o cache do domínio/site no Cloudflare.
