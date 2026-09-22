# Convenções de Nomenclatura e Linguagem

## Idioma

**Todo o projeto é em português brasileiro.** Isso inclui:
- Comentários e documentação no código
- Nomes de variáveis de negócio (ex: `escala`, `celebrante`, `missa`)
- Textos de UI, labels, mensagens de erro e confirmação
- Nomes de rotas hash

Exceções aceitáveis em inglês: nomes de classes de arquitetura (`Store`, `Router`, `ApiClient`), nomes de métodos HTTP (`request`, `fetch`), termos técnicos sem equivalente natural em pt-BR.

## Convenções JavaScript

### Variáveis e Funções
```js
// camelCase para variáveis e funções locais
let activeMembersFilter = 'todos';
let currentSearchTerm = '';
let editingMemberId = null;

function renderMembersList() { ... }
async function saveMemberForm() { ... }
```

### Constantes
```js
// SCREAMING_SNAKE_CASE para constantes de módulo
const STORAGE_KEY_USER = 'mesc_portal_user_v2';
const ROSTER_MONTH_NAMES = ['Janeiro', 'Fevereiro', ...];
```

### Classes
```js
// PascalCase para classes
class Store { ... }
class Router { ... }
class ApiClient { ... }
```

### Funções Globais (window)
```js
// Somente quando necessário para chamadas inline em HTML gerado dinamicamente
window.openEditMemberModal = function(id) { ... };
window.deleteMemberAction = function(id, name) { ... };
window.clearMembersSearch = function() { ... };
```

## Convenções HTML / IDs

### Views e Containers
```
id="view-{rota}"           → view-membros-mesc, view-calendario-missas, view-montar-escala
class="view-container"     → classe obrigatória em toda section de view
class="view-container active" → view visível
```

### Elementos de Tela
```
id="stat-{nome}-count"     → stat-active-count, stat-leave-count
id="{entidade}-list-container" → members-list-container, events-list-container
id="search-{entidade}"     → search-ministers, search-celebrations
id="{nome}-filter-chips"   → members-filter-chips
```

### Botões e Ações
```
id="open-modal-btn"        → botão de abrir modal de criação
id="btn-cancel-modal"      → botão de cancelar modal
id="btn-save-{ação}"       → btn-save-roster, btn-save-member
```

### Inputs de Formulário
```
id="input-{campo}"         → input-name, input-phone, input-profile, input-start-date
id="input-{campo}-hidden"  → input-status-hidden
```

### Cabeçalho
```
id="app-header"
id="header-church-name"
id="header-sub-title"
id="header-user-role"
id="dropdown-church-name"
```

## Atributos de Dados

```html
data-path="rota"           → usado em links/botões para navegação SPA
data-filter="valor"        → usado em chips de filtro (todos, ativo, licenca)
data-status="valor"        → botões de toggle de status no modal
data-id="123"              → referência a entidade em elementos dinâmicos
```

## Classes CSS Semânticas (não-Tailwind)

```css
.view-container            → container de view (display: none por padrão)
.view-container.active     → view visível (display: block/flex)
.nav-tab-link              → link de navegação no header
.date-chip                 → chip de data no calendário
.active-date               → data selecionada no calendário
.no-print                  → elemento ocultado na impressão PDF
.no-scrollbar              → scroll sem barra visível
```

## Valores de Domínio (Enums)

### Papéis de Usuário (`currentUser.role`)
```
'admin'        → Administrador
'coordinator'  → Coordenador
'guest'        → Visitante / Convidado
```

### Status de Membro
```
'ativo'        → Membro em atividade plena
'licenca'      → Membro temporariamente afastado
```

### Perfil de Membro
```
'minister'     → Ministro Extraordinário da Sagrada Comunhão
'celebrant'    → Padre / Sacerdote (também: 'padre', 'celebrante')
```

### Categorias de Celebração
```
'dominical'    → Missa Dominical
'semanal'      → Missa Semanal
'solenidade'   → Solenidade / Festa
'sacramento'   → Sacramento (Batismo, Crisma, Matrimônio…)
'especial'     → Celebração Especial
```

### Rotas da SPA
```
'inicio-login'
'calendario-missas'
'membros-mesc'
'celebracoes'
'montar-escala'
'gerenciar-usuarios'
```

## Mensagens ao Usuário

- Sempre em português claro e cordial. Nunca jargão técnico.
- Erros de validação: objetivos (ex: "Informe o nome do ministro.").
- Erros de servidor: amigáveis com fallback (ex: "Erro ao salvar. Verifique sua conexão.").
- Confirmações de ação: positivas (ex: "Ministro cadastrado com sucesso!").
- Restrições de acesso: claras sem ser rudes (ex: "Acesso restrito: apenas administradores podem realizar esta ação.").

## Comentários no Código

Usar comentários de bloco descritivos para:
- Cabeçalho de arquivo: propósito e responsabilidades do módulo
- Separadores de seções lógicas dentro de classes longas
- Lógica não-óbvia ou decisões de design

```js
/**
 * Componente: Gestão de Membros MESC
 * Dashboard, listagem com busca e filtros, modal de cadastro e edição, remoção
 * Status suportados: 'ativo' e 'licenca'
 */

// ==========================================
// ESCALAS & EVENTOS LITÚRGICOS
// ==========================================
```

Evitar comentários redundantes que apenas repetem o que o código já diz.
