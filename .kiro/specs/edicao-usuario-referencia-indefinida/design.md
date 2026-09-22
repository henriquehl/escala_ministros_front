# Edição de Usuário — Referência Indefinida: Bugfix Design

## Overview

O submit handler do formulário de edição/cadastro de usuário em `js/components/users.js` (e sua cópia em `public/js/components/users.js`) referencia a variável `modalForm` que nunca foi declarada no escopo da função `initUsersComponent`. A variável correta, disponível no escopo, é `userForm` — obtida via `document.getElementById('user-form')`. Essa referência incorreta lança um `ReferenceError` antes de qualquer chamada à API, impedindo que alterações de usuário sejam persistidas.

A correção é cirúrgica: substituir `modalForm` por `userForm` na única linha afetada dentro do submit handler.

## Glossary

- **Bug_Condition (C)**: A condição que aciona o bug — quando o formulário de edição ou cadastro de usuário é submetido, a linha `const saveBtn = modalForm.querySelector(...)` é executada.
- **Property (P)**: O comportamento desejado — o botão de submit deve ser localizado corretamente, a requisição HTTP deve ser disparada e o feedback ao usuário deve ser exibido.
- **Preservation**: O comportamento de cadastro de novos usuários, validações, pré-preenchimento do modal e tratamento de erros de rede que devem permanecer inalterados.
- **userForm**: Variável declarada em `initUsersComponent` via `document.getElementById('user-form')`, referência válida ao elemento `<form>` do modal.
- **modalForm**: Variável **inexistente** no escopo — nome incorreto usado erroneamente no submit handler.
- **saveUserToList(payload)**: Método de `window.appStore` que dispara a requisição HTTP POST (cadastro) ou PUT (edição) ao backend.

## Bug Details

### Bug Condition

O bug se manifesta sempre que o submit handler do formulário é executado — seja para cadastro ou edição. A linha `const saveBtn = modalForm.querySelector('button[type="submit"]')` tenta acessar uma variável inexistente no escopo, lançando `ReferenceError: modalForm is not defined` imediatamente. Isso ocorre **antes** do bloco `try/catch`, portanto a exceção não é capturada e nenhuma requisição à API é realizada.

**Especificação Formal:**
```
FUNCTION isBugCondition(event)
  INPUT: event de tipo SubmitEvent disparado no #user-form
  OUTPUT: boolean

  RETURN event.type === 'submit'
         AND event.target.id === 'user-form'
         AND variável 'modalForm' NÃO está definida no escopo de execução
END FUNCTION
```

### Examples

- **Edição de usuário existente**: Admin clica em "Editar", preenche o formulário e clica em "Salvar" → `ReferenceError: modalForm is not defined` → nenhum dado é atualizado.
- **Cadastro de novo usuário**: Admin clica em "Cadastrar Novo Usuário", preenche o formulário e clica em "Salvar" → mesmo `ReferenceError` → nenhum usuário é criado.
- **Formulário com campo de senha em branco (edição)**: Mesmo fluxo → mesmo erro.
- **Formulário sem nenhuma comunidade selecionada**: O guard de validação é executado **antes** da linha bugada — este caso específico **não** aciona o bug (retorna cedo).

## Expected Behavior

### Preservation Requirements

**Comportamentos que devem permanecer inalterados:**
- Validação de comunidade (ao menos uma selecionada) deve continuar funcionando e impedindo o envio.
- Pré-preenchimento do modal ao editar um usuário (nome, username, email, perfil, status, igrejas) deve continuar funcionando.
- Abertura e fechamento do modal via botões e clique fora devem continuar funcionando.
- Toast de erro de rede deve continuar sendo exibido quando a API retornar falha.
- Re-renderização da lista após salvar com sucesso deve continuar funcionando.

**Escopo:**
Todos os inputs que **não** passam pela linha `const saveBtn = modalForm.querySelector(...)` devem ser completamente não afetados por esta correção. Isso inclui:
- Filtragem e busca na lista de usuários.
- Ativação/inativação de usuário.
- Exclusão de usuário.
- Navegação entre views.

## Hypothesized Root Cause

Com base na análise do código, a causa é direta e única:

1. **Typo no nome da variável**: Ao escrever o submit handler, foi usado `modalForm` em vez de `userForm`. A variável `userForm` é declarada no topo de `initUsersComponent` via `const userForm = document.getElementById('user-form')` e está disponível no escopo do handler via closure. Não há ambiguidade — é um simples erro de digitação.

2. **Posição fora do bloco try/catch**: A linha bugada fica **antes** do `try`, portanto o erro não é capturado pelo `catch` existente, resultando em falha silenciosa para o usuário (sem toast de erro) e propagação da exceção para o console.

## Correctness Properties

Property 1: Bug Condition — Submit Handler Localiza o Botão Corretamente

_For any_ submissão do formulário `#user-form` (com ou sem `id` preenchido, desde que ao menos uma comunidade esteja selecionada), a função `saveUserToList` corrigida SHALL localizar o botão de submit usando `userForm.querySelector('button[type="submit"]')` sem lançar exceção, prosseguindo para desabilitar o botão e disparar a requisição à API.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Comportamento de Não-Submissão Inalterado

_For any_ interação com o componente de usuários que **não** seja a submissão do formulário (filtragem, busca, toggle de status, exclusão, abertura/fechamento do modal, validação de comunidade), o código corrigido SHALL produzir exatamente o mesmo resultado que o código original, preservando todos os comportamentos existentes.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**Arquivos**: `js/components/users.js` e `public/js/components/users.js` (cópias idênticas)

**Função**: submit handler dentro de `initUsersComponent`, no listener `userForm.addEventListener('submit', ...)`

**Alteração Específica**:

1. **Substituição do nome de variável**: Na linha
   ```js
   const saveBtn = modalForm.querySelector('button[type="submit"]');
   ```
   substituir `modalForm` por `userForm`:
   ```js
   const saveBtn = userForm.querySelector('button[type="submit"]');
   ```

Esta é a única alteração necessária. A variável `userForm` está corretamente declarada no escopo externo da função e referencia o mesmo elemento `<form>` que o handler já está processando via `e.target`.

## Testing Strategy

### Validation Approach

A estratégia segue duas fases: primeiro reproduzir o bug no código não corrigido para confirmar a causa raiz; depois verificar que a correção resolve o problema e não quebra nenhum comportamento preservado.

### Exploratory Bug Condition Checking

**Goal**: Demonstrar o `ReferenceError` no código original antes de aplicar a correção.

**Test Plan**: Simular a submissão do formulário de edição de usuário em um ambiente de teste com o DOM mockado, verificando que `modalForm` lança `ReferenceError`.

**Test Cases**:
1. **Submissão de edição**: Disparar `submit` no `#user-form` com `id` preenchido e comunidade selecionada → espera-se `ReferenceError: modalForm is not defined` (falha no código original).
2. **Submissão de cadastro**: Disparar `submit` no `#user-form` sem `id` e com comunidade selecionada → mesmo `ReferenceError` (falha no código original).
3. **Submissão sem comunidade**: Disparar `submit` sem comunidade selecionada → espera-se retorno antecipado via toast de validação **sem** lançar `ReferenceError` (passa no código original — não atinge a linha bugada).

**Expected Counterexamples**:
- `ReferenceError: modalForm is not defined` nas linhas de submissão com comunidade selecionada.
- A chamada `window.appStore.saveUserToList` nunca é executada.

### Fix Checking

**Goal**: Verificar que, após a correção, todas as submissões com bug condition ativa produzem o comportamento correto.

**Pseudocode:**
```
FOR ALL event WHERE isBugCondition(event) DO
  result := submitHandler_fixed(event)
  ASSERT nenhum ReferenceError lançado
  ASSERT saveUserToList foi chamado com payload correto
  ASSERT botão de submit foi desabilitado durante a requisição
  ASSERT toast de sucesso exibido após conclusão
END FOR
```

### Preservation Checking

**Goal**: Verificar que inputs onde o bug condition NÃO vale produzem o mesmo resultado antes e depois da correção.

**Pseudocode:**
```
FOR ALL event WHERE NOT isBugCondition(event) DO
  ASSERT submitHandler_original(event) = submitHandler_fixed(event)
END FOR
```

**Testing Approach**: Testes unitários são suficientes aqui, dado que a alteração é uma única linha e não afeta lógica de filtragem, validação ou outros handlers.

**Test Cases**:
1. **Validação de comunidade**: Submissão sem comunidade selecionada → toast de aviso exibido, `saveUserToList` não chamado — deve ser idêntico antes e após a correção.
2. **Toggle de status**: Clicar em toggle de ativo/inativo → `toggleUserStatusInList` chamado normalmente — inalterado pela correção.
3. **Exclusão de usuário**: Clicar em deletar → `deleteUserFromList` chamado normalmente — inalterado pela correção.

### Unit Tests

- Testar que `submitHandler` com comunidade selecionada e `id` preenchido chama `saveUserToList` com payload contendo `id`.
- Testar que `submitHandler` com comunidade selecionada e sem `id` chama `saveUserToList` sem campo `id` no payload.
- Testar que `submitHandler` sem comunidade selecionada exibe toast de aviso e não chama `saveUserToList`.
- Testar que o botão de submit é desabilitado durante a chamada e reabilitado após conclusão.

### Property-Based Tests

- Gerar payloads aleatórios de usuário (nome, username, email, role, status, igrejas) e verificar que `saveUserToList` é sempre chamado com os campos corretos quando ao menos uma comunidade é selecionada.
- Verificar que a presença ou ausência do campo `password` no payload segue estritamente o preenchimento do campo no formulário.

### Integration Tests

- Fluxo completo de edição: abrir modal → preencher campos → salvar → verificar toast de sucesso e re-renderização da lista.
- Fluxo completo de cadastro: abrir modal → preencher campos (novo usuário) → salvar → verificar toast de sucesso e novo usuário na lista.
- Fluxo de erro de rede: simular falha na API → verificar toast de erro e botão reabilitado.
