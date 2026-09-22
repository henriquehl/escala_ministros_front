# Design System e Convenções de UI

## Princípios

O design system é baseado em **Material Design 3 adaptado para contexto litúrgico**. Tokens de cor, tipografia e espaçamento são definidos no `tailwind.config.mjs` e devem ser usados consistentemente. Nunca usar cores hexadecimais hardcoded em novos elementos — usar sempre os tokens.

## Paleta de Cores

### Cores Primárias (Carmesim litúrgico)
```
bg-primary              → #b3093f  (ações principais, botões CTA, abas ativas)
text-on-primary         → #ffffff  (texto sobre fundo primary)
bg-primary-container    → #8f002f  (variante mais escura)
bg-primary-fixed        → #ffd9e2  (fundo suave de avatares, badges)
text-primary            → #b3093f  (textos com destaque primário)
```

### Superfícies e Neutros
```
bg-surface                   → #faf9f7  (fundo principal da página)
bg-surface-container         → #efeeec  (cards, containers neutros)
bg-surface-container-low     → #f4f3f1  (backgrounds levemente elevados)
bg-surface-container-high    → #e9e8e6  (chips inativos, hover states)
bg-surface-container-highest → #e3e2e0  (elementos de maior contraste)
bg-surface-container-lowest  → #ffffff  (cards brancos)
text-on-surface              → #1a1c1b  (texto principal)
text-on-surface-variant      → #564243  (texto secundário, labels, metadados)
```

### Secundárias (Dourado pastoral)
```
bg-secondary-container       → #fcedc4  (badges de coordenador, destaques suaves)
text-on-secondary-container  → #634b00
```

### Terciárias (Verde pastoral)
```
bg-tertiary-container        → #1b4e34  (destaques especiais, sacramentos)
text-on-tertiary-container   → #8abe9d
```

### Semânticas
```
bg-error-container     → #ffdad6
text-on-error-container→ #93000a
text-error             → #ba1a1a
bg-outline-variant     → #f4d8de  (bordas suaves)
text-outline           → #897173  (bordas, ícones secundários)
```

## Tipografia

A tipografia usa classes utilitárias que combinam `font-{escala}` e `text-{escala}` juntas:

| Escala | Uso | Fonte | Tamanho |
|---|---|---|---|
| `font-headline-lg text-headline-lg` | Títulos grandes de página | Source Serif 4 | 32px |
| `font-headline-md text-headline-md` | Títulos de seção | Source Serif 4 | 22px |
| `font-headline-sm text-headline-sm` | Subtítulos | Source Serif 4 | 19px |
| `font-title-md text-title-md` | Títulos de card | Plus Jakarta Sans | 17px |
| `font-body-lg text-body-lg` | Corpo grande | Plus Jakarta Sans | 17px |
| `font-body-md text-body-md` | Corpo padrão | Plus Jakarta Sans | 15px |
| `font-body-sm text-body-sm` | Corpo pequeno | Plus Jakarta Sans | 13px |
| `font-label-lg text-label-lg` | Labels grandes | Plus Jakarta Sans | 15px semibold |
| `font-label-md text-label-md` | Labels padrão, botões | Plus Jakarta Sans | 13px semibold |
| `font-label-sm text-label-sm` | Labels pequenos, chips | Plus Jakarta Sans | 11px bold |

## Espaçamento

Usar os tokens de espaçamento ao invés de valores arbitrários:

```
spacing-xxs  → 0.25rem  (4px)
spacing-xs   → 0.5rem   (8px)
spacing-sm   → 0.75rem  (12px)
spacing-md   → 1rem     (16px)
spacing-lg   → 1.5rem   (24px)
spacing-xl   → 2rem     (32px)
spacing-2xl  → 3rem     (48px)
gutter-mobile  → 1rem   (padding lateral mobile)
gutter-tablet  → 1.5rem (padding lateral tablet)
margin-screen  → 1.25rem
```

## Componentes Recorrentes

### Botão Primário
```html
<button class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary/90 active:scale-95 transition-all">
  <span class="material-symbols-outlined text-[18px]">add</span>
  Ação Principal
</button>
```

### Botão Secundário / Ghost
```html
<button class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-label-md text-label-md transition-all">
  Cancelar
</button>
```

### Chip de Filtro (Inativo / Ativo)
```html
<!-- Inativo -->
<button class="px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all">
  Filtro
</button>
<!-- Ativo -->
<button class="px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all">
  Filtro
</button>
```

### Card de Conteúdo
```html
<div class="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 shadow-xs">
  <!-- conteúdo -->
</div>
```

### Avatar com Iniciais
```html
<div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shadow-xs border border-primary/20">
  FA
</div>
```

### Badge de Status Ativo
```html
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-[11px] font-bold text-on-tertiary-container">
  <span class="w-1.5 h-1.5 rounded-full bg-tertiary inline-block"></span>
  Ativo
</span>
```

### Input de Formulário
```html
<input type="text"
  class="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
  placeholder="..."
/>
```

## Ícones

Usar **Material Symbols Outlined** do Google. Classe base: `material-symbols-outlined`.

Tamanhos recorrentes: `text-[13px]`, `text-[15px]`, `text-[16px]`, `text-[18px]`, `text-[20px]`.

Ícone preenchido (estado ativo): `style="font-variation-settings: 'FILL' 1"`.
Ícone outline (estado inativo): `style="font-variation-settings: 'FILL' 0"`.

## Responsividade

- Mobile-first. Breakpoints Tailwind padrão (`sm:`, `md:`, `lg:`).
- Padding lateral: `px-gutter-mobile` no mobile, `px-gutter-tablet sm:` ou superior.
- Grids de cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Textos que podem ser truncados em mobile: usar `truncate` e `min-w-0` no container pai.

## Acessibilidade

- Botões de ação sem texto visível devem ter `title="..."`.
- Links de navegação ativos devem ter `aria-current="page"`.
- Modais devem fechar com a tecla `Escape`.
- Inputs de formulário devem ter `<label>` associado ou `aria-label`.
- Usar `sr-only` para texto acessível invisível quando necessário.
