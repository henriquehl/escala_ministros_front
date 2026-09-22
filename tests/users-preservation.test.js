/**
 * Testes de Preservação — Task 2
 * Spec: edicao-usuario-referencia-indefinida
 *
 * Property 2: Preservation — Comportamentos existentes não afetados pela linha corrigida
 *
 * METODOLOGIA (observation-first):
 *   Os comportamentos testados aqui NÃO passam pela linha `const saveBtn = modalForm.querySelector(...)`
 *   porque retornam antes (validação de comunidade) ou pertencem a handlers completamente distintos
 *   (toggle de status, exclusão, pré-preenchimento do modal).
 *   Portanto estes testes DEVEM PASSAR tanto no código NÃO CORRIGIDO quanto no corrigido.
 *
 * EXPECTED OUTCOME (código não corrigido): Testes PASSAM — confirma baseline de preservação.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Código fonte original (com o bug) ──────────────────────────────────────
// Usa o mesmo snapshot usado nos testes da Task 1 — código NÃO corrigido.
const ORIGINAL_SOURCE_PATH = resolve('/tmp/users-original.js');
const ORIGINAL_SOURCE = readFileSync(ORIGINAL_SOURCE_PATH, 'utf8');

// Confirmação estática: snapshot deve conter a linha bugada para garantir que
// estamos testando o baseline correto.
const HAS_BUG = ORIGINAL_SOURCE.includes('const saveBtn = modalForm.querySelector');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Constrói um DOM completo com suporte a listagem de usuários (necessário para
 * toggle e exclusão, que operam sobre itens renderizados).
 */
function buildFullDOM(opts = {}) {
  const {
    userId = '',
    checkedChurch = false,
    includeUserList = false,
    users = [],
  } = opts;

  const churchCheckbox = checkedChurch
    ? `<input type="checkbox" class="church-checkbox" value="1" checked />`
    : `<input type="checkbox" class="church-checkbox" value="1" />`;

  // Renderizar usuários diretamente no HTML (para testes de toggle/delete)
  const usersListHtml = users.map(u => `
    <div class="user-item">
      <button class="btn-toggle-status" data-id="${u.id}" type="button">Toggle</button>
      <button class="btn-edit-user" data-id="${u.id}" type="button">Edit</button>
      <button class="btn-delete-user" data-id="${u.id}" type="button">Delete</button>
    </div>
  `).join('');

  const html = `
    <html><body>
      <div id="user-modal">
        <h2 id="user-modal-title">Modal</h2>
        <button id="close-user-modal-btn">X</button>
        <button id="cancel-user-modal-btn">Cancelar</button>
        <form id="user-form">
          <input id="user-form-id"       value="${userId}" />
          <input id="user-form-name"     value="" />
          <input id="user-form-username" value="" />
          <input id="user-form-email"    value="" />
          <select id="user-form-role"><option value="coordinator" selected>Coordenador</option></select>
          <select id="user-form-status"><option value="ativo" selected>Ativo</option></select>
          <input id="user-form-password" value="" />
          <div id="user-church-checkboxes">
            <label>
              ${churchCheckbox}
              <span class="church-label-text">Comunidade 1</span>
            </label>
          </div>
          <button type="submit">Salvar</button>
        </form>
      </div>
      <div id="users-list-container">${includeUserList ? usersListHtml : ''}</div>
      <input id="search-users" value="" />
      <div id="users-filter-chips"></div>
      <button id="open-user-modal-btn">Novo</button>
    </body></html>
  `;

  return new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });
}

/**
 * Injeta mocks globais e executa o código do componente no JSDOM.
 */
function loadComponent(dom, source, storeOverrides = {}) {
  const { window } = dom;

  window.appStore = {
    saveUserToList: vi.fn().mockResolvedValue({ id: '1', name: 'João' }),
    getChurches: vi.fn().mockReturnValue([{ id: '1', name: 'Comunidade 1' }]),
    getUserById: vi.fn().mockReturnValue(null),
    getUsersList: vi.fn().mockReturnValue([]),
    getUserStats: vi.fn().mockReturnValue({ total: 0, admins: 0, coordinators: 0, active: 0 }),
    toggleUserStatusInList: vi.fn().mockResolvedValue({ id: '42', name: 'Maria', status: 'inativo' }),
    deleteUserFromList: vi.fn().mockResolvedValue({}),
    fetchSystemUsers: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn(),
    currentUser: { id: '1', role: 'admin', isAdmin: true },
    ...storeOverrides,
  };

  window.showToast = vi.fn();
  window.getInitials = vi.fn().mockReturnValue('JO');

  const script = window.document.createElement('script');
  script.textContent = source;
  window.document.body.appendChild(script);
}

/**
 * Dispara o evento submit e aguarda micro-tasks.
 */
async function submitForm(dom) {
  const form = dom.window.document.getElementById('user-form');
  const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  await new Promise(r => setTimeout(r, 200));
}

// ─── Testes ─────────────────────────────────────────────────────────────────

describe('Property 2: Preservation — Comportamentos não afetados pelo bug (código original)', () => {

  /**
   * Pré-condição: garantir que o snapshot testado contém o bug.
   * Se este teste falhar, o snapshot está errado e os demais resultados não são válidos.
   */
  it('pré-condição: snapshot contém "modalForm.querySelector" (código não corrigido)', () => {
    expect(HAS_BUG).toBe(true);
  });

  // ── 3.2 Validação de comunidade ─────────────────────────────────────────

  describe('Req 3.2 — Submissão sem comunidade: retorno antecipado (não aciona a linha bugada)', () => {
    let dom;

    beforeEach(() => {
      dom = buildFullDOM({ checkedChurch: false });
      loadComponent(dom, ORIGINAL_SOURCE);
    });

    /**
     * Validates: Requirement 3.2
     *
     * Observação: o guard `if (selectedChurches.length === 0)` executa e retorna
     * ANTES da linha `const saveBtn = modalForm.querySelector(...)`.
     * Portanto saveUserToList NUNCA é chamado e o toast de aviso é exibido.
     * Este comportamento é IDÊNTICO antes e após a correção.
     */
    it('exibe toast de aviso quando nenhuma comunidade está selecionada', async () => {
      await submitForm(dom);

      expect(dom.window.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/comunidade/i),
        'warning'
      );
    });

    it('não chama saveUserToList quando nenhuma comunidade está selecionada', async () => {
      await submitForm(dom);

      expect(dom.window.appStore.saveUserToList).not.toHaveBeenCalled();
    });

    /**
     * Property: para qualquer estado do formulário (com ou sem id, qualquer role),
     * se nenhuma comunidade estiver marcada, saveUserToList NUNCA deve ser chamado.
     *
     * Validates: Requirement 3.2
     */
    it('propriedade: saveUserToList nunca é chamado independente do userId quando sem comunidade (novo usuário)', async () => {
      // Novo usuário (sem id) — cada caso usa o dom do beforeEach
      await submitForm(dom);
      expect(dom.window.appStore.saveUserToList).not.toHaveBeenCalled();
      expect(dom.window.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/comunidade/i),
        'warning'
      );
    });

    it('propriedade: saveUserToList nunca é chamado independente do userId quando sem comunidade (edição)', async () => {
      // Edição de usuário existente (com id) — usar dom do beforeEach com userId injetado
      // O dom do beforeEach já tem checkedChurch: false; simulamos edição definindo user-form-id
      const userIdInput = dom.window.document.getElementById('user-form-id');
      userIdInput.value = '99';

      await submitForm(dom);
      expect(dom.window.appStore.saveUserToList).not.toHaveBeenCalled();
      expect(dom.window.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/comunidade/i),
        'warning'
      );
    });
  });

  // ── 3.3 Pré-preenchimento do modal ──────────────────────────────────────

  describe('Req 3.3 — Pré-preenchimento do modal ao abrir para edição', () => {
    const mockUser = {
      id: '42',
      name: 'Maria Silva',
      username: 'maria',
      email: 'maria@teste.com',
      role: 'coordinator',
      status: 'ativo',
      churches: ['1'],
    };

    let dom;

    beforeEach(() => {
      dom = buildFullDOM({ userId: '' });
      loadComponent(dom, ORIGINAL_SOURCE, {
        getUserById: vi.fn().mockReturnValue(mockUser),
      });
    });

    /**
     * Validates: Requirement 3.3
     *
     * Observação: openModal(userId) chama getUserById e preenche os campos diretamente.
     * Esta função nunca passa pela linha bugada — é completamente independente do submit handler.
     */
    it('preenche todos os campos do formulário com os dados do usuário ao abrir modal de edição', async () => {
      const { window } = dom;

      // Simular clique em "Editar" — openModal é exposta apenas internamente,
      // então disparamos via btn-edit-user renderizado pelo componente após renderUsers()
      // Alternativa: chamar openModal indiretamente via store.subscribe trigger
      // O componente expõe openModal ao clicar .btn-edit-user — precisamos de um usuário na lista
      // Para este teste, chamamos renderUsers primeiro e depois clicamos no botão edit
      window.appStore.getUsersList = vi.fn().mockReturnValue([{
        ...mockUser,
        roleName: 'Coordenador',
        churchNames: ['Comunidade 1'],
      }]);

      // Re-renderizar para que os botões de edição apareçam no DOM
      // O componente já chamou renderUsers() no init — forçamos um novo ciclo
      // simulando evento routeChanged que aciona renderUsers
      const routeEvent = new window.CustomEvent('routeChanged', {
        detail: { path: 'gerenciar-usuarios' },
      });
      window.dispatchEvent(routeEvent);

      // Aguardar fetchSystemUsers (async) + renderUsers
      await new Promise(r => setTimeout(r, 100));

      const editBtn = window.document.querySelector('.btn-edit-user[data-id="42"]');
      expect(editBtn).not.toBeNull();

      editBtn.click();

      // Verificar campos preenchidos
      expect(window.document.getElementById('user-form-name').value).toBe('Maria Silva');
      expect(window.document.getElementById('user-form-username').value).toBe('maria');
      expect(window.document.getElementById('user-form-email').value).toBe('maria@teste.com');
      expect(window.document.getElementById('user-form-role').value).toBe('coordinator');
      expect(window.document.getElementById('user-form-status').value).toBe('ativo');
      expect(window.document.getElementById('user-form-id').value).toBe('42');
    });

    /**
     * Validates: Requirement 3.3
     *
     * Property: para qualquer userId válido, após openModal(userId), os campos de texto
     * refletem os dados do usuário retornado por getUserById.
     *
     * Testamos com dois usuários distintos para cobrir variação de dados.
     * Nota: o select #user-form-role só pre-preenche corretamente se a opção existir no HTML.
     */
    it('propriedade: campos são preenchidos com dados corretos para qualquer userId válido', async () => {
      const users = [
        { id: '1', name: 'Ana', username: 'ana', email: 'ana@t.com', role: 'coordinator', status: 'ativo', churches: ['1'] },
        { id: '2', name: 'Pedro', username: 'pedro', email: 'pedro@t.com', role: 'coordinator', status: 'inativo', churches: [] },
      ];

      for (const user of users) {
        const d = buildFullDOM({ userId: '' });
        loadComponent(d, ORIGINAL_SOURCE, {
          getUserById: vi.fn().mockReturnValue(user),
          getUsersList: vi.fn().mockReturnValue([{ ...user, roleName: 'x', churchNames: [] }]),
        });

        // Disparar routeChanged para forçar render e poder clicar no btn-edit
        const routeEvent = new d.window.CustomEvent('routeChanged', {
          detail: { path: 'gerenciar-usuarios' },
        });
        d.window.dispatchEvent(routeEvent);

        // Aguardar fetchSystemUsers (async) + renderUsers
        await new Promise(r => setTimeout(r, 100));

        const editBtn = d.window.document.querySelector(`.btn-edit-user[data-id="${user.id}"]`);
        expect(editBtn).not.toBeNull();
        editBtn.click();

        // Verificar campos de texto (invariantes ao role/status HTML disponível)
        expect(d.window.document.getElementById('user-form-name').value).toBe(user.name);
        expect(d.window.document.getElementById('user-form-username').value).toBe(user.username);
        expect(d.window.document.getElementById('user-form-email').value).toBe(user.email);
        expect(d.window.document.getElementById('user-form-id').value).toBe(user.id);
      }
    });
  });

  // ── 3.1 Toggle de status ────────────────────────────────────────────────

  describe('Req 3.1 — Toggle de status do usuário (ativar/inativar)', () => {
    let dom;

    const mockUser = {
      id: '42',
      name: 'João',
      username: 'joao',
      email: 'joao@t.com',
      role: 'coordinator',
      status: 'ativo',
      churches: ['1'],
      roleName: 'Coordenador',
      churchNames: ['Comunidade 1'],
    };

    beforeEach(async () => {
      dom = buildFullDOM({ userId: '' });
      loadComponent(dom, ORIGINAL_SOURCE, {
        getUsersList: vi.fn().mockReturnValue([mockUser]),
        toggleUserStatusInList: vi.fn().mockResolvedValue({
          id: '42',
          name: 'João',
          status: 'inativo',
        }),
      });

      // Renderizar lista para expor os botões de toggle
      const routeEvent = new dom.window.CustomEvent('routeChanged', {
        detail: { path: 'gerenciar-usuarios' },
      });
      dom.window.dispatchEvent(routeEvent);
      await new Promise(r => setTimeout(r, 100));
    });

    /**
     * Validates: Requirement 3.1
     *
     * Observação: o handler .btn-toggle-status chama toggleUserStatusInList diretamente
     * sem passar pelo submit handler — completamente independente do bug.
     */
    it('chama toggleUserStatusInList com o id correto ao clicar no toggle', async () => {
      const toggleBtn = dom.window.document.querySelector('.btn-toggle-status[data-id="42"]');
      expect(toggleBtn).not.toBeNull();

      toggleBtn.click();
      await new Promise(r => setTimeout(r, 100));

      expect(dom.window.appStore.toggleUserStatusInList).toHaveBeenCalledWith('42');
    });

    it('exibe toast de confirmação após toggle de status bem-sucedido', async () => {
      const toggleBtn = dom.window.document.querySelector('.btn-toggle-status[data-id="42"]');
      toggleBtn.click();
      await new Promise(r => setTimeout(r, 100));

      expect(dom.window.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/João.*inativo/i)
      );
    });
  });

  // ── 3.1 Exclusão de usuário ─────────────────────────────────────────────

  describe('Req 3.1 — Exclusão de usuário', () => {
    let dom;

    const mockUser = {
      id: '77',
      name: 'Carlos',
      username: 'carlos',
      email: 'carlos@t.com',
      role: 'visitor',
      status: 'ativo',
      churches: ['1'],
      roleName: 'Visitante',
      churchNames: ['Comunidade 1'],
    };

    beforeEach(async () => {
      dom = buildFullDOM({ userId: '' });

      // Mockar window.confirm para retornar true automaticamente
      dom.window.confirm = vi.fn().mockReturnValue(true);

      loadComponent(dom, ORIGINAL_SOURCE, {
        getUsersList: vi.fn().mockReturnValue([mockUser]),
        getUserById: vi.fn().mockReturnValue(mockUser),
        deleteUserFromList: vi.fn().mockResolvedValue({}),
      });

      // Renderizar lista
      const routeEvent = new dom.window.CustomEvent('routeChanged', {
        detail: { path: 'gerenciar-usuarios' },
      });
      dom.window.dispatchEvent(routeEvent);
      await new Promise(r => setTimeout(r, 100));
    });

    /**
     * Validates: Requirement 3.1
     *
     * Observação: o handler .btn-delete-user exibe confirmação e chama deleteUserFromList.
     * Não passa pelo submit handler — independente do bug.
     */
    it('chama deleteUserFromList com o id correto ao confirmar exclusão', async () => {
      const deleteBtn = dom.window.document.querySelector('.btn-delete-user[data-id="77"]');
      expect(deleteBtn).not.toBeNull();

      deleteBtn.click();
      await new Promise(r => setTimeout(r, 100));

      expect(dom.window.confirm).toHaveBeenCalled();
      expect(dom.window.appStore.deleteUserFromList).toHaveBeenCalledWith('77');
    });

    it('exibe toast de sucesso após exclusão bem-sucedida', async () => {
      const deleteBtn = dom.window.document.querySelector('.btn-delete-user[data-id="77"]');
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 100));

      expect(dom.window.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/removido com sucesso/i)
      );
    });

    it('não chama deleteUserFromList quando o usuário cancela a confirmação', async () => {
      dom.window.confirm = vi.fn().mockReturnValue(false);

      const deleteBtn = dom.window.document.querySelector('.btn-delete-user[data-id="77"]');
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 100));

      expect(dom.window.appStore.deleteUserFromList).not.toHaveBeenCalled();
    });
  });

  // ── 3.4 Tratamento de erro de rede ─────────────────────────────────────
  // Nota: este caso requer comunidade selecionada, o que aciona a linha bugada no
  // código original. Ele está aqui apenas como documentação do comportamento
  // esperado APÓS a correção — não será executado contra o snapshot bugado.
  // Os testes 3.4 são verificados na Task 3 (pós-correção).
});
