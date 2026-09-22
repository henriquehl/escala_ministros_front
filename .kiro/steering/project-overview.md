# Visão Geral do Projeto

## O que é este projeto

O **Portal de Gestão Litúrgica & Escala Virtual** é uma aplicação web para gestão pastoral da **Capela Divino Espírito Santo**. Ele é usado pela comunidade MESC (Ministros Extraordinários da Sagrada Comunhão) para:

- Montar e gerir escalas mensais de ministros para celebrações litúrgicas
- Gerenciar o cadastro de membros/ministros (ativos e em licença)
- Catalogar tipos de celebrações (missas dominicais, semanais, solenidades, sacramentos)
- Visualizar o calendário litúrgico mensal com todas as escalas
- Exportar lembretes para WhatsApp e relatórios em PDF (diário e mensal A4)
- Controlar acesso por papel: Administrador, Coordenador e Visitante

## Stack

| Camada | Tecnologia |
|---|---|
| Build / SSG | **Astro 5.4** — output `static`, sem SSR |
| Estilização | **Tailwind CSS 3.4** com design system próprio |
| Lógica interativa | **Vanilla JS puro** (sem frameworks reativos) |
| Backend (externo) | REST API separada, padrão `http://localhost:8000` |
| Autenticação | Bearer Token JWT via `localStorage` |
| Fontes | Plus Jakarta Sans (UI) + Source Serif 4 (títulos) via Google Fonts |
| Ícones | Material Symbols Outlined (Google CDN) |

## Estrutura de Alto Nível

```
src/           → Componentes Astro (templates HTML estáticos, compilados no build)
public/js/     → Scripts client-side (servidos diretamente ao browser)
js/            → Espelho de desenvolvimento de public/js/ — MANTER SINCRONIZADO
src/styles/    → styles.css com @tailwind directives + animações de view
docs/          → Documentação técnica e de negócio do projeto
.env           → PUBLIC_API_URL (URL base da API backend)
```

## Rotas da SPA

A navegação é hash-based (`#/rota`). As rotas existentes são:

| Hash | Tela | Acesso |
|---|---|---|
| `#/inicio-login` | Tela de Login | Público |
| `#/calendario-missas` | Calendário Litúrgico | Todos autenticados |
| `#/membros-mesc` | Gestão de Membros | Todos autenticados |
| `#/celebracoes` | Catálogo de Celebrações | Todos autenticados |
| `#/montar-escala` | Gerir Escalas | Admin + Coordenador |
| `#/gerenciar-usuarios` | Gerenciar Usuários | Admin apenas |

## Papéis de Usuário

- `admin` — acesso total, incluindo gestão de usuários do sistema
- `coordinator` — pode montar e editar escalas e membros
- `guest` / `visitor` — leitura apenas

## Idioma e Domínio

**Todo o projeto é em português brasileiro.** Nomes de variáveis de negócio, comentários, textos de UI, mensagens de erro e documentação devem estar em pt-BR. Terminologia litúrgica é usada nos nomes (celebrante, ministro, missa, escala, escala dominical, etc.).
