# Fluxo de Dados e Integração com API

## Arquitetura de Dados

```
Browser
  ├── window.api      (ApiClient)   → Faz requests HTTP para a REST API
  ├── window.appStore (Store)       → Caches locais + Pub-Sub + localStorage
  └── Componentes JS               → Leem do Store, renderizam no DOM
```

O fluxo padrão é sempre: **Componente → Store → API → Store → notify → Componente re-renderiza**.

## Configuração da API

A URL base é injetada no build via variável de ambiente:

```
PUBLIC_API_URL=https://api.exemplo.com
```

No `Layout.astro`, ela é exposta ao browser via:
```html
<script is:inline define:vars={{ apiBaseUrl }}>
  window.__API_URL__ = apiBaseUrl;
</script>
```

Padrão: `http://localhost:8000` quando a variável não está definida.

## Autenticação

- Token JWT armazenado em `localStorage` com chave `mesc_portal_auth_token`.
- O `ApiClient` injeta `Authorization: Bearer {token}` em **todos** os requests automaticamente.
- Para verificar autenticação: `Boolean(window.api.getToken() && window.appStore.currentUser)`.
- Ao fazer login: o Store chama `window.api.auth.login()`, recebe o token, chama `this.setToken()` + `this.setUser()`.
- Ao fazer logout: chamar `window.api.auth.logout()` (limpa o token) e `window.appStore.setUser(null)`.

## Endpoints da API

### Autenticação
```
POST /api/sessions           → login (fallback: /api/auth/login)
POST /api/v1/auth/guest      → acesso visitante (com fallbacks em cascata)
GET  /api/users/profile      → perfil do usuário autenticado
```

### Igrejas / Comunidades
```
GET  /api/churches           → lista todas as igrejas (público)
GET  /api/churches/:id       → detalhes de uma igreja
POST /api/churches           → criar igreja (admin)
PUT  /api/churches/:id       → atualizar igreja (admin)
```

### Membros / Ministros
```
GET    /api/members          → lista membros (filtros: church_id, status, search, profile)
POST   /api/members          → criar membro
PUT    /api/members/:id      → atualizar membro
DELETE /api/members/:id      → excluir membro
```

### Celebrações e Categorias
```
GET  /api/celebrations            → lista celebrações
POST /api/celebrations            → criar celebração
PUT  /api/celebrations/:id        → atualizar celebração
GET  /api/celebrations/categories → lista categorias litúrgicas
POST /api/celebrations/categories → criar categoria
```

### Eventos / Escalas
```
GET  /api/events   → lista eventos (filtros: year, month, church_id)
POST /api/events   → criar evento/escala
PUT  /api/events/:id → atualizar evento
DELETE /api/events/:id → excluir evento
```

### Usuários do Sistema
```
GET  /api/users        → lista usuários (admin)
POST /api/users        → criar usuário (admin)
PUT  /api/users/:id    → atualizar usuário (admin)
DELETE /api/users/:id  → excluir usuário (admin)
```

## Padrão de Chamada no Store

Toda operação de dados passa pelo Store:

```js
// Leitura (com normalização de resposta)
async fetchMembers(churchId) {
  const cid = churchId || (this.currentUser && this.currentUser.churchId);
  const data = await window.api.members.list({ church_id: cid });
  this.members = Array.isArray(data) ? data : (data && data.members) || [];
  this.notify('members');
  return this.members;
}

// Escrita (com atualização local otimista opcional)
async addMember(payload) {
  const created = await window.api.members.create(payload);
  this.members.push(created);
  this.notify('members');
  return created;
}

// Erro (sempre repassar ao componente via throw)
async deleteMember(id) {
  try {
    await window.api.members.delete(id);
    this.members = this.members.filter(m => String(m.id) !== String(id));
    this.notify('members');
  } catch (err) {
    window.showErrorToast(err, 'Erro ao excluir membro no servidor.');
    throw err;
  }
}
```

## Tratamento de Erros

A classe `ApiClient` lança `Error` com propriedades extras:
- `error.status` → código HTTP (401, 404, 422, 500…)
- `error.data` → corpo da resposta do servidor
- `error.message` → mensagem legível, extraída de `data.error`, `data.message` ou `data.errors[]`

Nos componentes, sempre envolver operações em try/catch e exibir via toast:

```js
try {
  await window.appStore.saveSomething(payload);
  window.showToast('Salvo com sucesso!', 'success');
} catch (err) {
  // showErrorToast já pode ter sido chamado pelo Store
  // mas se não, fazer aqui:
  window.showErrorToast(err, 'Erro ao salvar. Tente novamente.');
}
```

## Normalização de Datas

- **Internamente**: sempre `YYYY-MM-DD` (string ISO parcial).
- **Exibição na UI**: sempre `DD/MM/AAAA`.
- **Extração de ano**: `dateString.split('-')[0]`.

```js
// Normalização ao receber da API (padrão usado no Store)
const rawDate = String(evt.date_string || evt.date || '');
let dateString = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
```

## Normalização de Respostas da API

A API pode retornar dados de formas variadas. Sempre normalizar com fallback seguro:

```js
// Array direto ou envelope com chave
const members = Array.isArray(data) ? data : (data && data.members) || [];
const events  = Array.isArray(data) ? data : (data && data.events)  || [];
```

## IDs

Sempre comparar IDs como strings para evitar problemas de tipo int/string:

```js
this.members.find(m => String(m.id) === String(id))
this.members.filter(m => String(m.id) !== String(id))
```

## Inicialização do Store

O `Store.init()` é chamado em `app.js` após o DOM estar pronto. Ele:
1. Carrega igrejas públicas (sem auth).
2. Se houver token + usuário, carrega categorias, celebrações, membros e (se admin) usuários do sistema.
3. Carrega as escalas do mês atual.

Componentes individuais **não** devem chamar `store.init()` novamente. Devem usar `store.fetchX()` para atualizar dados específicos quando necessário (ex: ao entrar em uma view via `routeChanged`).
