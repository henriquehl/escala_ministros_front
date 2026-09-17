# ⛪ Capela Divino Espírito Santo - Portal de Gestão Litúrgica & Escala Virtual

Uma aplicação web moderna, responsiva e completa construída com **Astro** (em modo estático / SSG) no formato **Single Page Application (SPA)**, desenvolvida para simplificar e organizar o gerenciamento pastoral de ministros, celebrações litúrgicas, escalas mensais e geração de relatórios de impressão e lembretes para a **Capela Divino Espírito Santo**.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18+) e **npm**

### Comandos Disponíveis

```bash
# 1. Instalar dependências (caso ainda não tenha instalado)
npm install

# 2. Iniciar o servidor de desenvolvimento local
npm run dev

# 3. Gerar o build estático de produção
npm run build

# 4. Pré-visualizar o build de produção localmente
npm run preview
```

Acesse no navegador: 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📱 Telas e Módulos da Aplicação

O sistema conta com 5 telas SPA integradas na barra superior de navegação:

| Aba | Rota | Descrição |
| :--- | :--- | :--- |
| **Início** | `#/inicio-login` | Tela de autenticação com opção de login para **Administrador** e **Visitante**. |
| **Calendário** | `#/calendario-missas` | Calendário litúrgico interativo mensal, card detalhado do dia, botão de cópia de lembrete e opções de impressão. |
| **Membros** | `#/membros-mesc` | Painel de ministros com estatísticas, busca em tempo real, filtros de categoria e modal de cadastro/edição (Admin). |
| **Celebrações** | `#/celebracoes` | Catálogo de celebrações com filtros (*Dominicais, Semanais, Solenidades, Sacramentos, Especiais*) e cadastro dinâmico. |
| **Gerir Escalas** | `#/montar-escala` | Construtor de escalas em 3 passos com seletor de qualquer data do mês, escolha de celebração e alocação equilibrada de ministros. |

---

## 🔒 Controle de Acesso por Perfil

- **Administrador**:
  - Acesso irrestrito a todas as ferramentas.
  - Acesso exclusivo para gerenciamento de usuários do sistema.
  - Permissão para cadastrar, editar e excluir membros e celebrações.
  - Acesso à aba **"Gerir Escalas"** e ao painel de coordenação no Calendário.
- **Coordenador**:
  - Permissão para cadastrar, editar e excluir membros e celebrações.
  - Acesso à aba **"Gerir Escalas"** e ao painel de coordenação no Calendário.
  - Sem permissão para gerenciar usuários do sistema.
- **Visitante**:
  - Modo somente leitura para consulta comunitária das escalas, celebrações e membros.
  - Ações de alteração/exclusão, a aba **"Gerir Escalas"** e o gerenciamento de usuários ficam ocultos.

---

## ✨ Recursos e Padrões Litúrgicos

1. **Padrão Oficial de Datas**: Todas as datas são exibidas no formato brasileiro **`DD/MM/AAAA`** em todas as telas, cards e relatórios.
2. **Cópia de Lembrete Rápido (WhatsApp)**:
   - Gera automaticamente o texto padronizado com o cálculo de chegada com 15 minutos de antecedência:
     ```text
     ESCALA:
     Joãozinho;
     Mariazinha;
     Zezinho;

     Não se esqueçam do nosso compromisso de hoje, às 18:45, Capela Divino Espírito Santo
     ```
3. **Modelos Oficiais de Impressão em PDF**:
   - **Modelo 1 (Individual do Dia)**: Ficha litúrgica detalhada com nomes, celebrante, funções específicas e orientações paroquiais.
   - **Modelo 2 (Escala Geral Mensal A4)**: Quadro condensado em folha única A4 para afixação no mural da sacristia.
4. **Persistência Local**: Todos os dados são salvos no `localStorage` do navegador e sincronizados reativamente entre todos os componentes.

---

## 📂 Estrutura de Diretórios Astro

```text
├── astro.config.mjs             # Configuração do Astro (output: 'static' + Tailwind)
├── tailwind.config.mjs          # Tokens de cores litúrgicas, tipografia e espaçamentos
├── package.json                 # Scripts e dependências do projeto
├── public/                      # Arquivos estáticos públicos e scripts client-side
│   ├── favicon.svg              # Ícone litúrgico do Espírito Santo
│   └── js/                      # Módulos JS client-side (store, router, export, components)
├── src/
│   ├── layouts/
│   │   └── Layout.astro         # Layout base com meta tags, fontes, toast e modais
│   ├── components/
│   │   ├── Header.astro         # Cabeçalho com navegação desktop e mobile
│   │   ├── Toast.astro          # Componente de notificação flutuante
│   │   ├── views/               # Componentes visuais das telas SPA
│   │   │   ├── LoginView.astro
│   │   │   ├── CalendarView.astro
│   │   │   ├── MembersView.astro
│   │   │   ├── CelebrationsView.astro
│   │   │   └── RosterView.astro
│   │   └── modals/              # Janelas modais da aplicação
│   │       ├── MemberModal.astro
│   │       ├── CelebrationModal.astro
│   │       └── ExportModal.astro
│   ├── styles/
│   │   └── styles.css           # Estilos globais Tailwind e regras de impressão A4
│   └── pages/
│       └── index.astro          # Página principal estática que orquestra os componentes
└── docs/
    ├── MANUAL_DO_USUARIO.md     # Guia pastoral passo a passo de utilização
    └── ARQUITETURA_TECNICA.md   # Especificação técnica da arquitetura e fluxo de dados
```

---

## 📖 Documentação Detalhada

- Consulte o **[Manual do Usuário](docs/MANUAL_DO_USUARIO.md)** para instruções pastorais detalhadas.
- Consulte a **[Arquitetura Técnica](docs/ARQUITETURA_TECNICA.md)** para entender a engenharia de software do projeto.
