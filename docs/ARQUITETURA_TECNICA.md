# 🏗️ Arquitetura Técnica - Capela Divino Espírito Santo (Escala Virtual)

Este documento descreve a arquitetura de software, padrões de projeto, estrutura de estado, roteamento e convenções adotadas no front-end do projeto migrado para **Astro (Modo Estático / SSG)**.

---

## 🏛️ 1. Visão Geral da Arquitetura

A aplicação é estruturada sobre o framework **Astro** configurado para geração estática (`output: 'static'`), unindo a modularidade de componentes `.astro` com a reatividade no navegador (Client-Side) no formato **Single Page Application (SPA)**.

### Principais Pilares:
1. **Geração Estática sem SSR (`output: 'static'`)**: O Astro compila a estrutura HTML e CSS estaticamente no build (`dist/`), sem necessidade de servidor Node rodando em produção.
2. **Componentização Modular**: A interface é dividida em componentes reutilizáveis (`src/components/views/`, `src/components/modals/`, `src/components/Header.astro`).
3. **Reatividade Baseada em Eventos (Observer Pattern / Pub-Sub)**: O `store.js` atua como Single Source of Truth no cliente, emitindo eventos que sincronizam os componentes na tela.
4. **Persistência Local Transparente (`localStorage`)**: Todas as alterações feitas pelos usuários persistem entre sessões no navegador.
5. **Design System Litúrgico**: Cores primárias em vinho nobre (`#63031d`), dourado litúrgico, verde pastoral e tipografia elegante (*Plus Jakarta Sans* e *Source Serif 4*) configuradas nativamente via `@astrojs/tailwind`.

---

## 📦 2. Gerenciamento de Estado Central (`public/js/store.js`)

O `Store` é a única fonte da verdade (*Single Source of Truth*) da aplicação.

### 🔑 Chaves de Armazenamento Local:
- `STORAGE_KEY_MEMBERS`: Array de ministros cadastrados.
- `STORAGE_KEY_SCALES`: Array de escalas montadas para cada data e horário.
- `STORAGE_KEY_CELEBRATIONS`: Catálogo estruturado de celebrações litúrgicas.
- `STORAGE_KEY_USER`: Sessão do usuário atual (`{ isAdmin, roleName, name }`).

### 📡 Sistema de Inscrição (Pub/Sub):
```javascript
// Exemplo de inscrição em componente:
window.appStore.subscribe((event) => {
  if (event === 'members' || event === 'user') {
    renderMembersStats();
    renderMembersList();
  }
});
```

---

## 🧭 3. Roteamento SPA e Permissões (`public/js/router.js`)

A navegação ocorre por meio de rotas baseadas em hash fragment (`#/`).

### Rotas Registradas:
- `#/inicio-login`: Tela de autenticação e boas-vindas.
- `#/calendario-missas`: Visão geral do calendário mensal.
- `#/membros-mesc`: Gestão do corpo ministerial.
- `#/celebracoes`: Catálogo de celebrações litúrgicas.
- `#/montar-escala`: Construtor de escalas (restrito a administradores).

---

## 📂 4. Organização do Código

```text
├── astro.config.mjs             # Configuração estática do Astro
├── tailwind.config.mjs          # Tokens Tailwind CSS
├── package.json                 # Scripts e dependências Astro
├── public/                      # Scripts e assets client-side
│   ├── favicon.svg
│   └── js/
│       ├── store.js             # Estado reativo Pub/Sub
│       ├── router.js            # Roteador SPA
│       ├── export.js            # Exportação PDF e WhatsApp
│       ├── app.js               # Toast e inicializador
│       └── components/          # Controladores JS dos componentes
├── src/
│   ├── layouts/
│   │   └── Layout.astro         # Layout base global
│   ├── components/
│   │   ├── Header.astro         # Navegação
│   │   ├── Toast.astro          # Notificação
│   │   ├── views/               # Views da aplicação
│   │   └── modals/              # Janelas modais
│   ├── styles/
│   │   └── styles.css           # CSS com Tailwind e regras @media print
│   └── pages/
│       └── index.astro          # Ponto de entrada SPA
```
