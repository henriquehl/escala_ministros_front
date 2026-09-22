/**
 * Teste de Exploração da Condição de Bug — Task 1
 * Spec: edicao-usuario-referencia-indefinida
 *
 * Property 1: Bug Condition — ReferenceError ao submeter formulário com comunidade selecionada
 *
 * OBJETIVO: Evidenciar o `ReferenceError: modalForm is not defined` no código NÃO CORRIGIDO.
 *
 * Metodologia:
 *  - O código original (snapshot do commit HEAD) contém `modalForm.querySelector(...)`.
 *  - O ReferenceError é lançado ANTES do bloco try/catch, dentro de uma async function.
 *  - A exceção escapa como rejected promise → Vitest a intercepta como "unhandled error".
 *  - O efeito observável é: `saveUserToList` NUNCA é chamado.
 *  - O teste verifica AMBOS: (a) pre-condição estática (código contém o bug) e
 *    (b) comportamento em runtime (saveUserToList não chamado = bug ativo).
 *
 * EXPECTED OUTCOME (código não corrigido):
 *  - Testes de edição e cadastro FALHAM → prova o bug.
 *  - Teste de controle (sem comunidade) PASSA → baseline correto.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Monta um DOM mínimo para inicializar initUsersComponent.
 */
function buildMinimalDOM(opts = {}) {
  const { userId = '', checkedChurch = true } = opts;

  const churchCheckbox = checkedChurch
    ? `<label>
         <input type="checkbox" class="church-checkbox" value="1" checked />
         <span class="church-label-text">Comunidade 1</span>
       </label>`
    : `<label>
         <input type="checkbox" class="church-checkbox" value="1" />
         <span class="church-label-text">Comunidade 1</span>
       </label>`;

  const html = `
    <html><body>
      <div id="user-modal">
        <h2 id="user-modal-title">Modal</h2>
        <button id="close-user-modal-btn">X</button>
        <button id="cancel-user-modal-btn">Cancelar</button>
        <form id="user-form">
          <input id="user-form-id"       value="${userId}" />
          <input id="user-form-name"     value="João" />
          <input id="user-form-username" value="joao" />
          <input id="user-form-email"    value="joao@teste.com" />
          <select id="user-form-role"><option value="coordinator" selected>Coordenador</option></select>
          <select id="user-form-status"><option value="ativo" selected>Ativo</option></select>
          <input id="user-form-password" value="" />
          <div id="user-church-checkboxes">
            ${churchCheckbox}
          </div>
          <button type="submit">Salvar</button>
        </form>
      </div>
      <div  id="users-list-container"></div>
      <input id="search-users" value="" />
      <div  id="users-filter-chips"></div>
      <button id="open-user-modal-btn">Novo</button>
    </body></html>
  `;

  return new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });
}

/**
 * Injeta mocks globais no window do JSDOM e executa o código do componente.
 */
function loadComponentInDOM(dom, componentSource) {
  const { window } = dom;

  window.appStore = {
    saveUserToList: vi.fn().mockResolvedValue({ id: '1', name: 'João' }),
    getChurches: vi.fn().mockReturnValue([{ id: '1', name: 'Comunidade 1' }]),
    getUserById: vi.fn().mockReturnValue({
      id: '42',
      name: 'João',
      username: 'joao',
      email: 'joao@teste.com',
      role: 'coordinator',
      status: 'ativo',
      churches: ['1'],
    }),
    getUsersList: vi.fn().mockReturnValue([]),
    getUserStats: vi.fn().mockReturnValue({ total: 0, admins: 0, coordinators: 0, active: 0 }),
    toggleUserStatusInList: vi.fn(),
    deleteUserFromList: vi.fn(),
    fetchSystemUsers: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn(),
    currentUser: { id: '1', role: 'admin', isAdmin: true },
  };

  window.showToast = vi.fn();
  window.getInitials = vi.fn().mockReturnValue('JO');

  const script = dom.window.document.createElement('script');
  script.textContent = componentSource;
  dom.window.document.body.appendChild(script);
}

/**
 * Dispara submit e aguarda a conclusão das micro-tasks.
 * O handler async com o bug lança ReferenceError como rejected promise.
 * Usamos `onRejectedPromise` para capturar antes que Vitest a intercepte.
 */
async function submitForm(dom) {
  const { window } = dom;
  const form = window.document.getElementById('user-form');

  let thrownError = null;

  // Hook de captura de erro a nível do window do jsdom
  // (alternativa ao process.on que Vitest pode sobrescrever)
  const origAddEL = window.EventTarget.prototype.addEventListener;
  const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);

  // Dar tempo ao handler async de ser executado e à rejected promise de se propagar
  await new Promise(r => setTimeout(r, 200));

  return thrownError;
}

// ─── Código fonte original (com o bug) ────────────────────────────────────────

// Snapshot do código NÃO CORRIGIDO, gravado via:
//   git show HEAD:js/components/users.js > /tmp/users-original.js
const ORIGINAL_SOURCE_PATH = resolve('/tmp/users-original.js');
const ORIGINAL_SOURCE = readFileSync(ORIGINAL_SOURCE_PATH, 'utf8');

// Confirmar estaticamente que o snapshot contém a linha bugada
const HAS_BUG = ORIGINAL_SOURCE.includes('const saveBtn = modalForm.querySelector');

// ─── Código fonte corrigido ────────────────────────────────────────────────
// Carrega o arquivo corrigido em js/components/users.js para verificar o fix (Task 3.3)
const FIXED_SOURCE_PATH = resolve('/home/henrique/git/virtual_scale/js/components/users.js');
const FIXED_SOURCE = readFileSync(FIXED_SOURCE_PATH, 'utf8');

// Confirmar estaticamente que o código corrigido NÃO contém mais a linha bugada
const IS_FIXED = !FIXED_SOURCE.includes('const saveBtn = modalForm.querySelector') &&
                  FIXED_SOURCE.includes('const saveBtn = userForm.querySelector');

// ─── Testes ─────────────────────────────────────────────────────────────────

describe('Property 1: Bug Condition — modalForm is not defined (código original)', () => {

  /**
   * Asserção estática — confirma que o snapshot testado contém o bug.
   * Esta asserção DEVE PASSAR sempre (é o ponto de partida do spec).
   */
  it('pré-condição: snapshot do código original contém "modalForm.querySelector" (a linha bugada)', () => {
    expect(HAS_BUG).toBe(true);
  });

  describe('caso de edição (userId preenchido, comunidade selecionada)', () => {
    let dom;
    let saveUserToListMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '42', checkedChurch: true });
      loadComponentInDOM(dom, ORIGINAL_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
    });

    /**
     * Validates: Requirements 1.1, 1.2
     *
     * Contraexemplo documentado:
     *   submitHandler({ type:'submit', target:#user-form, id:'42', church-checkbox:checked })
     *   → ReferenceError: modalForm is not defined
     *   → saveUserToList NUNCA chamado
     *
     * O bug: `const saveBtn = modalForm.querySelector('button[type="submit"]')`
     * lança ReferenceError porque `modalForm` não existe no escopo — é `userForm`.
     * A exceção ocorre ANTES do bloco try/catch, escapando como rejected promise.
     *
     * Comportamento esperado APÓS correção: saveUserToList é chamado com payload.id='42'
     *
     * ESTE TESTE DEVE FALHAR NO CÓDIGO ORIGINAL (confirma que o bug existe).
     * ESTE TESTE DEVE PASSAR APÓS A CORREÇÃO (valida o fix).
     */
    it('saveUserToList é chamado com payload.id após submissão de edição (FALHA no código bugado)', async () => {
      await submitForm(dom);

      // No código bugado: saveUserToList NUNCA é chamado → este expect FALHA
      // No código corrigido: saveUserToList É chamado → este expect PASSA
      expect(saveUserToListMock).toHaveBeenCalled();

      // Verificar que o payload inclui o id (caso de edição)
      const callArgs = saveUserToListMock.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.id).toBe('42');
    });
  });

  describe('caso de cadastro (userId vazio, comunidade selecionada)', () => {
    let dom;
    let saveUserToListMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '', checkedChurch: true });
      loadComponentInDOM(dom, ORIGINAL_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
    });

    /**
     * Validates: Requirements 1.1, 1.2
     *
     * Contraexemplo documentado:
     *   submitHandler({ type:'submit', target:#user-form, id:'', church-checkbox:checked })
     *   → ReferenceError: modalForm is not defined
     *   → saveUserToList NUNCA chamado
     *
     * ESTE TESTE DEVE FALHAR NO CÓDIGO ORIGINAL (confirma que o bug existe).
     * ESTE TESTE DEVE PASSAR APÓS A CORREÇÃO (valida o fix).
     */
    it('saveUserToList é chamado sem id após submissão de cadastro (FALHA no código bugado)', async () => {
      await submitForm(dom);

      // No código bugado: saveUserToList NUNCA é chamado → este expect FALHA
      // No código corrigido: saveUserToList É chamado → este expect PASSA
      expect(saveUserToListMock).toHaveBeenCalled();

      // Verificar que o payload NÃO inclui id (caso de cadastro)
      const callArgs = saveUserToListMock.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.id).toBeUndefined();
    });
  });

  describe('caso controle: submissão SEM comunidade (não aciona o bug — deve passar antes e depois)', () => {
    let dom;
    let saveUserToListMock;
    let showToastMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '42', checkedChurch: false });
      loadComponentInDOM(dom, ORIGINAL_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
      showToastMock = dom.window.showToast;
    });

    /**
     * Validates: Requirements 1.1, 1.2 (caminho de não-acionamento do bug)
     *
     * O guard de validação retorna cedo ANTES da linha bugada.
     * Portanto este teste passa tanto no código original quanto no corrigido.
     */
    it('retorna cedo com toast de aviso — saveUserToList não chamado, sem ReferenceError', async () => {
      await submitForm(dom);

      expect(saveUserToListMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/comunidade/i),
        'warning'
      );
    });
  });
});

// ─── Task 3.3: Property 1 verificado no código CORRIGIDO ─────────────────────
//
// Re-executa os MESMOS casos de teste da tarefa 1, agora contra o código corrigido.
// EXPECTED OUTCOME: Testes PASSAM — confirma que o bug foi corrigido.
//
// Validates: Requirements 2.1, 2.2, 2.3

describe('Property 1: Expected Behavior — Submit Handler Localiza o Botão Corretamente (código corrigido)', () => {

  /**
   * Asserção estática — confirma que o código corrigido contém `userForm.querySelector`
   * e não mais `modalForm.querySelector`.
   */
  it('pré-condição: código corrigido contém "userForm.querySelector" (fix aplicado)', () => {
    expect(IS_FIXED).toBe(true);
  });

  describe('caso de edição (userId preenchido, comunidade selecionada)', () => {
    let dom;
    let saveUserToListMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '42', checkedChurch: true });
      loadComponentInDOM(dom, FIXED_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
    });

    /**
     * Validates: Requirements 2.1, 2.2, 2.3
     *
     * Após correção: `userForm.querySelector(...)` localiza o botão corretamente,
     * nenhum ReferenceError é lançado, saveUserToList é chamado com payload.id='42'.
     */
    it('saveUserToList é chamado com payload.id após submissão de edição (código corrigido)', async () => {
      await submitForm(dom);

      expect(saveUserToListMock).toHaveBeenCalled();

      const callArgs = saveUserToListMock.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.id).toBe('42');
    });
  });

  describe('caso de cadastro (userId vazio, comunidade selecionada)', () => {
    let dom;
    let saveUserToListMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '', checkedChurch: true });
      loadComponentInDOM(dom, FIXED_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
    });

    /**
     * Validates: Requirements 2.1, 2.2, 2.3
     *
     * Após correção: sem ReferenceError, saveUserToList é chamado sem campo id (cadastro).
     */
    it('saveUserToList é chamado sem id após submissão de cadastro (código corrigido)', async () => {
      await submitForm(dom);

      expect(saveUserToListMock).toHaveBeenCalled();

      const callArgs = saveUserToListMock.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.id).toBeUndefined();
    });
  });

  describe('caso controle: submissão SEM comunidade — comportamento preservado após correção', () => {
    let dom;
    let saveUserToListMock;
    let showToastMock;

    beforeEach(() => {
      dom = buildMinimalDOM({ userId: '42', checkedChurch: false });
      loadComponentInDOM(dom, FIXED_SOURCE);
      saveUserToListMock = dom.window.appStore.saveUserToList;
      showToastMock = dom.window.showToast;
    });

    /**
     * Validates: Requirements 2.1, 2.3 — preservação do guard de validação
     */
    it('retorna cedo com toast de aviso — saveUserToList não chamado (código corrigido)', async () => {
      await submitForm(dom);

      expect(saveUserToListMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/comunidade/i),
        'warning'
      );
    });
  });
});
