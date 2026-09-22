import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('User Password Toggle Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="users-list-container"></div>
          <div id="users-count-badge"></div>
          <div id="admin-count-badge"></div>
          <div id="coordinator-count-badge"></div>
          <div id="active-count-badge"></div>
          
          <button id="open-user-modal-btn">Novo Usuário</button>

          <div id="user-modal" class="hidden">
            <h3 id="user-modal-title"></h3>
            <button id="close-user-modal-btn">X</button>
            <button id="cancel-user-modal-btn">Cancelar</button>
            <form id="user-form">
              <input type="hidden" id="user-form-id" />
              <input id="user-form-name" />
              <input id="user-form-username" />
              <input id="user-form-email" />
              <select id="user-form-role"><option value="coordinator">Coordenador</option></select>
              <select id="user-form-status"><option value="ativo">Ativo</option></select>
              <div id="user-form-churches-container"></div>

              <div class="relative flex items-center">
                <input id="user-form-password" type="password" />
                <button id="toggle-user-password-btn" type="button">
                  <span id="toggle-user-password-icon">visibility</span>
                </button>
              </div>

              <button type="submit">Salvar</button>
            </form>
          </div>
        </body>
      </html>
    `, { runScripts: 'dangerously' });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  it('toggles password input type between password and text and updates icon', () => {
    window.appStore = {
      getSystemUsers: () => [],
      getChurches: () => [{ id: 1, name: 'Capela Divino' }],
      subscribe: () => {}
    };

    const usersScript = readFileSync(resolve(__dirname, '../js/components/users.js'), 'utf-8');
    window.eval(usersScript);

    const passInput = document.getElementById('user-form-password');
    const toggleBtn = document.getElementById('toggle-user-password-btn');
    const toggleIcon = document.getElementById('toggle-user-password-icon');

    passInput.value = 'minhasenha123';
    expect(passInput.type).toBe('password');
    expect(toggleIcon.textContent).toBe('visibility');

    // Click to show password
    toggleBtn.click();
    expect(passInput.type).toBe('text');
    expect(toggleIcon.textContent).toBe('visibility_off');

    // Click again to hide password
    toggleBtn.click();
    expect(passInput.type).toBe('password');
    expect(toggleIcon.textContent).toBe('visibility');
  });

  it('resets password visibility to password when closing and reopening modal', () => {
    window.appStore = {
      getSystemUsers: () => [],
      getChurches: () => [{ id: 1, name: 'Capela Divino' }],
      subscribe: () => {}
    };

    const usersScript = readFileSync(resolve(__dirname, '../js/components/users.js'), 'utf-8');
    window.eval(usersScript);

    const openBtn = document.getElementById('open-user-modal-btn');
    const closeBtn = document.getElementById('close-user-modal-btn');
    const passInput = document.getElementById('user-form-password');
    const toggleBtn = document.getElementById('toggle-user-password-btn');
    const toggleIcon = document.getElementById('toggle-user-password-icon');

    // Open modal and toggle to visible
    openBtn.click();
    passInput.value = 'segredo';
    toggleBtn.click();
    expect(passInput.type).toBe('text');
    expect(toggleIcon.textContent).toBe('visibility_off');

    // Close modal
    closeBtn.click();
    expect(passInput.type).toBe('password');
    expect(toggleIcon.textContent).toBe('visibility');

    // Reopen modal
    openBtn.click();
    expect(passInput.type).toBe('password');
    expect(toggleIcon.textContent).toBe('visibility');
    expect(passInput.value).toBe('');
  });
});
