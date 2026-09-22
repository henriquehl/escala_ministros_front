# Arquitetura e Padrões de Código

## Modelo Geral

O projeto é uma **SPA com shell estático gerado pelo Astro**. Todas as views são renderizadas no DOM simultaneamente como HTML estático. A visibilidade é controlada por CSS via `.view-container` / `.view-container.active`. Nenhuma view é criada ou destruída dinamicamente — apenas mostrada ou ocultada.

A arquitetura client-side se apoia em três globals que devem sempre existir na `window`:

```
window.api        → instância de ApiClient  (public/js/api.js)
window.appStore   → instância de Store      (public/js/store.js)
window.appRouter  → instância de Router     (public/js/router.js)
```

Os scripts são carregados em ordem no `Layout.astro` via `<script is:inline src="...">`. A ordem importa:
`api.js → store.js → router.js → components/* → export.js → app.js`

## Componentes Astro

- Usados **apenas para estrutura** — são templates HTML estáticos.
- Sem lógica de estado. Sem JavaScript no frontmatter além de tipagem de props.
- Views ficam em `src/components/views/` com a classe `view-container` e `id="view-{rota}"`.
- Modais ficam em `src/components/modals/` — sempre presentes no DOM, toggled por JS via `hidden`.
- Toda interação dinâmica é delegada ao JS client-side.

**Padrão de view:**
```astro
<section id="view-membros-mesc" class="view-container pt-28 px-4 ...">
  <!-- HTML estático com IDs semânticos para o JS manipular -->
</section>
```

## Componentes JS Client-side

Cada arquivo em `public/js/components/` segue este padrão obrigatório:

1. **Variáveis de estado local** no topo do arquivo (módulo-scoped, não globais).
2. **Função `init{Componente}()`** que registra event listeners e inscrições no store.
3. **Funções `render{Algo}()`** que fazem `innerHTML` direto no DOM via template strings.
4. **Funções globais** (`window.fn = function()`) apenas quando precisam ser chamadas de `onclick` inline no HTML gerado dinamicamente.
5. **Inicialização segura** no final do arquivo:

```js
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMeuComponente);
} else {
  initMeuComponente();
}
```

6. **Ciclo de vida** — o componente escuta o evento `routeChanged` para recarregar dados quando a view é ativada:

```js
window.addEventListener('routeChanged', async (e) => {
  if (e.detail && e.detail.path === 'minha-rota') {
    await window.appStore.fetchAlgo();
    renderAlgo();
  }
});
```

7. **Reatividade** via subscribe no store:

```js
window.appStore.subscribe((event) => {
  if (event === 'members') renderMembersList();
});
```

## Store (Gerenciamento de Estado)

- **Padrão Observer / Pub-Sub** implementado manualmente na classe `Store`.
- É o **Single Source of Truth** — todo dado compartilhado entre componentes vive no store.
- Não criar estado global avulso fora do store.
- Eventos notificados: `'members'`, `'scales'`, `'celebrations'`, `'categories'`, `'churches'`, `'systemUsers'`, `'user'`.
- Sessão do usuário persiste em `localStorage` (`mesc_portal_user_v2`).
- Token de auth em `localStorage` (`mesc_portal_auth_token`).

```js
// Ler dados
window.appStore.members
window.appStore.currentUser

// Escutar mudanças
window.appStore.subscribe((event) => { ... });

// Disparar mudanças (dentro do Store)
this.notify('members');
```

## Roteamento

- Hash-based: `window.location.hash` → `#/rota`.
- **Auth guard** em `navigate()`: redireciona para `inicio-login` se não autenticado (sem token válido + `currentUser`).
- **Guards de papel**: `montar-escala` exige `admin` ou `coordinator`; `gerenciar-usuarios` exige `admin`.
- Após cada navegação, o Router dispara `routeChanged` para que os componentes recarreguem dados.
- Navegação programática: `window.appRouter.navigate('rota')`.
- Navegação via HTML: `<a data-path="rota">` ou `<button data-path="rota">`.

## Renderização Imperativa

Componentes JS usam `element.innerHTML = templateString`. Não usar virtual DOM, não usar frameworks de template.

Padrão preferido para listas:
```js
container.innerHTML = items.map(item => `
  <div class="...tailwind classes...">
    ${item.name}
  </div>
`).join('');
```

Para estado vazio:
```js
container.innerHTML = `
  <div class="flex flex-col items-center py-12 text-on-surface-variant">
    <span class="material-symbols-outlined text-4xl mb-2">inbox</span>
    <p class="text-body-md">Nenhum item encontrado.</p>
  </div>
`;
```

## Toast / Notificações

Sempre usar as funções globais — nunca `alert()` ou `console.log()` visível ao usuário:

```js
window.showToast('Mensagem informativa');
window.showToast('Erro ao salvar.', 'error');
window.showToast('Sucesso!', 'success');
window.showErrorToast(err, 'Mensagem de fallback se err não tiver message.');
```

## Diretórios JS Espelhados

`/js/` e `/public/js/` contêm os **mesmos arquivos**. O Tailwind lê ambos no `content[]`. O browser consome apenas `/public/js/`. Ao editar qualquer script, manter os dois diretórios sincronizados.

## Zero Dependências JS Novas

Não introduzir React, Vue, Alpine.js, jQuery, ou qualquer outra biblioteca JS client-side. O projeto é Vanilla JS intencional. Novas funcionalidades seguem os mesmos padrões já estabelecidos.
