# Bugfix Requirements Document

## Introduction

Ao tentar salvar a edição de um usuário pelo modal de cadastro/edição, a submissão do formulário lança um `ReferenceError: modalForm is not defined`. Isso impede a execução do bloco `try/catch` que chama `window.appStore.saveUserToList(payload)`, fazendo com que a requisição HTTP PUT ao endpoint `/api/users/:id` nunca seja disparada. O resultado prático é que nenhuma alteração de dados do usuário é persistida.

## Bug Analysis

### Current Behavior (Defect)

1.1 QUANDO o usuário preenche o formulário de edição e clica em "Salvar", ENTÃO o sistema lança `ReferenceError: modalForm is not defined` antes de chegar à chamada da API.

1.2 QUANDO o `ReferenceError` é lançado na linha `const saveBtn = modalForm.querySelector(...)`, ENTÃO o sistema interrompe a execução do submit handler sem salvar nenhum dado nem exibir feedback de erro ao usuário.

1.3 QUANDO a edição falha silenciosamente por essa exceção não capturada, ENTÃO o sistema fecha o modal (ou permanece aberto, dependendo do fluxo de erro), sem realizar a requisição PUT ao backend.

### Expected Behavior (Correct)

2.1 QUANDO o usuário preenche o formulário de edição e clica em "Salvar", ENTÃO o sistema SHALL localizar o botão de submit corretamente usando a variável `userForm` já disponível no escopo da função.

2.2 QUANDO o botão de submit é localizado corretamente, ENTÃO o sistema SHALL desabilitá-lo, disparar a requisição HTTP PUT via `window.appStore.saveUserToList(payload)` e reabilitá-lo ao concluir.

2.3 QUANDO a requisição PUT é bem-sucedida, ENTÃO o sistema SHALL exibir o toast de sucesso "Usuário atualizado com sucesso!", fechar o modal e re-renderizar a lista de usuários.

### Unchanged Behavior (Regression Prevention)

3.1 QUANDO um novo usuário é cadastrado (formulário sem `id` preenchido), ENTÃO o sistema SHALL CONTINUE TO disparar a requisição HTTP POST via `window.appStore.saveUserToList(payload)` normalmente.

3.2 QUANDO nenhuma comunidade está selecionada ao submeter o formulário, ENTÃO o sistema SHALL CONTINUE TO exibir o aviso de validação e impedir o envio.

3.3 QUANDO o modal de usuário é aberto para edição, ENTÃO o sistema SHALL CONTINUE TO pré-preencher todos os campos (nome, username, email, perfil, status, igrejas) com os dados do usuário selecionado.

3.4 QUANDO a requisição ao backend falha (erro de rede ou erro HTTP), ENTÃO o sistema SHALL CONTINUE TO capturar o erro no bloco `catch`, exibir o toast de erro e reabilitar o botão de submit.
