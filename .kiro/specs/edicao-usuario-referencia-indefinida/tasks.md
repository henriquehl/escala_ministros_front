# Implementation Plan

- [x] 1. Escrever teste de exploração da condição de bug (Bug Condition)
  - **Property 1: Bug Condition** - ReferenceError ao submeter formulário com comunidade selecionada
  - **CRITICAL**: Este teste DEVE FALHAR no código não corrigido — a falha confirma que o bug existe
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: O teste codifica o comportamento esperado — ele validará o fix quando passar após a implementação
  - **GOAL**: Evidenciar o `ReferenceError: modalForm is not defined` por meio de um contraexemplo concreto
  - **Scoped PBT Approach**: Escopo determinístico — qualquer submissão do `#user-form` com ao menos uma comunidade selecionada e `id` preenchido (edição) ou sem `id` (cadastro) aciona o bug
  - Criar um mock do DOM com `#user-form`, `#user-form-id`, `#user-form-name`, `#user-form-username`, `#user-form-email`, `#user-form-role`, `#user-form-status`, `#user-form-password`, `.church-checkbox` (checked), e `button[type="submit"]`
  - Mockar `window.appStore.saveUserToList`, `window.appStore.getChurches`, `window.appStore.getUserById` e `window.showToast`
  - Disparar evento `submit` no formulário com ao menos uma comunidade marcada
  - Verificar que `ReferenceError: modalForm is not defined` é lançado (caso de edição e caso de cadastro)
  - Verificar que `saveUserToList` NÃO foi chamado
  - Executar o teste no código NÃO CORRIGIDO
  - **EXPECTED OUTCOME**: Teste FALHA — isso prova que o bug existe
  - Documentar o contraexemplo encontrado: `submitHandler(event_com_comunidade_selecionada)` → `ReferenceError: modalForm is not defined`
  - Marcar a tarefa como concluída quando o teste estiver escrito, executado e a falha documentada
  - _Requirements: 1.1, 1.2_

- [x] 2. Escrever testes de preservação (ANTES de implementar o fix)
  - **Property 2: Preservation** - Comportamentos existentes não afetados pela linha corrigida
  - **IMPORTANT**: Seguir a metodologia observation-first — observar o comportamento atual no código não corrigido antes de escrever as asserções
  - Observar: submissão sem comunidade selecionada → toast de aviso exibido, `saveUserToList` não chamado (retorno antecipado antes da linha bugada)
  - Observar: pré-preenchimento do modal com `getUserById` → campos preenchidos corretamente, sem envolver a linha bugada
  - Observar: ativação/inativação via `.btn-toggle-status` → `toggleUserStatusInList` chamado, inalterado pelo bug
  - Observar: exclusão via `.btn-delete-user` → `deleteUserFromList` chamado, inalterado pelo bug
  - Escrever teste de propriedade: para todo formulário submetido sem comunidade selecionada, `saveUserToList` nunca é chamado e o toast de aviso é exibido
  - Escrever teste de propriedade: para qualquer `userId` válido passado a `openModal`, todos os campos do formulário são pré-preenchidos com os dados do usuário
  - Escrever testes unitários para toggle de status e exclusão de usuário
  - Executar todos os testes no código NÃO CORRIGIDO
  - **EXPECTED OUTCOME**: Testes PASSAM — confirma o comportamento baseline a preservar
  - Marcar a tarefa como concluída quando os testes estiverem escritos, executados e passando no código não corrigido
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Corrigir ReferenceError no submit handler de usuários

  - [x] 3.1 Aplicar o fix em `js/components/users.js`
    - Localizar a linha `const saveBtn = modalForm.querySelector('button[type="submit"]');` dentro do listener `userForm.addEventListener('submit', ...)`
    - Substituir `modalForm` por `userForm`
    - Resultado esperado: `const saveBtn = userForm.querySelector('button[type="submit"]');`
    - Verificar que nenhuma outra ocorrência de `modalForm` existe no arquivo
    - _Bug_Condition: isBugCondition(event) onde event.type === 'submit' AND event.target.id === 'user-form' AND 'modalForm' não está definida no escopo_
    - _Expected_Behavior: saveBtn localizado via `userForm.querySelector(...)`, botão desabilitado, `saveUserToList(payload)` disparado, toast de sucesso exibido_
    - _Preservation: validação de comunidade, pré-preenchimento do modal, toggle de status, exclusão, tratamento de erro de rede permanecem inalterados_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Aplicar o mesmo fix em `public/js/components/users.js`
    - Arquivo é cópia idêntica de `js/components/users.js` — aplicar a mesma substituição de `modalForm` → `userForm`
    - Verificar que nenhuma outra ocorrência de `modalForm` existe no arquivo
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verificar que o teste de condição de bug (Property 1) agora passa
    - **Property 1: Expected Behavior** - Submit Handler Localiza o Botão Corretamente
    - **IMPORTANT**: Re-executar o MESMO teste da tarefa 1 — NÃO escrever um novo teste
    - O teste da tarefa 1 codifica o comportamento esperado após a correção
    - Executar o teste de exploração do passo 1 no código JÁ CORRIGIDO
    - **EXPECTED OUTCOME**: Teste PASSA — confirma que o bug foi corrigido
    - Verificar que `saveUserToList` foi chamado com payload contendo `id` (edição) ou sem `id` (cadastro)
    - Verificar que nenhum `ReferenceError` é lançado
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verificar que os testes de preservação (Property 2) ainda passam
    - **Property 2: Preservation** - Comportamentos existentes não regridem
    - **IMPORTANT**: Re-executar os MESMOS testes da tarefa 2 — NÃO escrever novos testes
    - Executar todos os testes de preservação do passo 2 no código JÁ CORRIGIDO
    - **EXPECTED OUTCOME**: Testes PASSAM — confirma ausência de regressões
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Checkpoint — Garantir que todos os testes passam
  - Executar a suite completa de testes (exploração + preservação)
  - Confirmar: Property 1 passa (bug corrigido), Property 2 passa (sem regressões)
  - Verificar manualmente no browser: fluxo de edição de usuário e fluxo de cadastro de novo usuário funcionam sem erros no console
  - Garantir que ambos os arquivos (`js/components/users.js` e `public/js/components/users.js`) estão sincronizados
  - Perguntar ao usuário caso surjam dúvidas durante a validação
