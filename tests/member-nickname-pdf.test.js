import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Member Nickname and PDF Export Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="print-container"></div>
          <div id="minister-modal" class="hidden">
            <h3 id="modal-title"></h3>
            <input id="input-name" />
            <input id="input-nickname" />
            <input id="input-phone" />
            <select id="input-profile">
              <option value="minister">Ministro</option>
              <option value="celebrant">Padre</option>
            </select>
            <input id="input-start-date" />
            <input id="input-status-hidden" value="ativo" />
            <div id="modal-status-buttons">
              <button data-status="ativo"></button>
              <button data-status="licenca"></button>
            </div>
            <button id="btn-save-member"></button>
          </div>
        </body>
      </html>
    `, { runScripts: 'dangerously' });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  it('PDF export uses nickname instead of full name when available', () => {
    const exportScript = readFileSync(resolve(__dirname, '../js/export.js'), 'utf-8');
    window.eval(exportScript);

    const mockScale = {
      day: 15,
      month: 10,
      year: 2026,
      dayOfWeek: 'Domingo',
      time: '19:00',
      celebrationName: 'Santa Missa',
      ministers: [
        { id: 1, name: 'João Carlos da Silva', nickname: 'Beto', role: 'Ministro' },
        { id: 2, name: 'Maria Aparecida Santos', nickname: '', role: 'Ministro' }
      ]
    };

    window.exportSingleDayPdf(mockScale);

    const printContainer = document.getElementById('print-container');
    expect(printContainer).not.toBeNull();
    const html = printContainer.innerHTML;

    // Should contain nickname "Beto"
    expect(html).toContain('Beto');
    // For member 2 without nickname, fallback to full name
    expect(html).toContain('Maria Aparecida Santos');
  });

  it('PDF export resolves nickname by name lookup in appStore when not directly on minister object', () => {
    const exportScript = readFileSync(resolve(__dirname, '../js/export.js'), 'utf-8');
    window.eval(exportScript);

    window.appStore = {
      getMemberById: () => null,
      getMembers: () => [
        { id: 50, name: 'Henrique Leite', nickname: 'Rick' }
      ]
    };

    const mockScale = {
      day: 20,
      month: 10,
      year: 2026,
      dayOfWeek: 'Domingo',
      time: '08:00',
      celebrationName: 'Santa Missa',
      ministers: [
        { name: 'Henrique Leite' } // No id, no direct nickname
      ]
    };

    window.exportSingleDayPdf(mockScale);

    const printContainer = document.getElementById('print-container');
    expect(printContainer).not.toBeNull();
    expect(printContainer.innerHTML).toContain('Rick');
  });

  it('Monthly PDF export uses nickname in table rows', () => {
    const exportScript = readFileSync(resolve(__dirname, '../js/export.js'), 'utf-8');
    window.eval(exportScript);

    window.appStore = {
      getScalesForMonth: () => [
        {
          day: 10,
          time: '18:00',
          celebrationName: 'Missa',
          ministers: [
            { id: 10, name: 'Antônio Ferreira', nickname: 'Tonho' }
          ]
        }
      ]
    };

    window.exportMonthlySheetPdf(2026, 10);

    const printContainer = document.getElementById('print-container');
    expect(printContainer).not.toBeNull();
    expect(printContainer.innerHTML).toContain('Tonho');
  });

  it('reminder message uses nickname instead of full name when available', () => {
    const exportScript = readFileSync(resolve(__dirname, '../js/export.js'), 'utf-8');
    window.eval(exportScript);

    let clipboardText = '';
    window.navigator.clipboard = {
      writeText: async (text) => {
        clipboardText = text;
      }
    };

    const mockScale = {
      time: '19:00',
      celebrationName: 'Santa Missa',
      ministers: [
        { name: 'João Carlos da Silva', nickname: 'Beto' },
        { name: 'Maria Aparecida', nickname: '' }
      ]
    };

    window.copyScaleReminder(mockScale);
    expect(clipboardText).toContain('Beto;\n');
    expect(clipboardText).toContain('Maria Aparecida;\n');
  });

  it('store preserves nickname on addMember and updateMember', async () => {
    const storeScript = readFileSync(resolve(__dirname, '../js/store.js'), 'utf-8');
    window.eval(storeScript);

    const store = window.appStore;
    let createPayload = null;
    let updatePayload = null;

    window.api = {
      members: {
        create: async (data) => {
          createPayload = data;
          return { id: 101, ...data };
        },
        update: async (id, data) => {
          updatePayload = data;
          return { id, ...data };
        }
      }
    };

    const added = await store.addMember({
      name: 'Francisco Silva',
      nickname: 'Chiquinho',
      phone: '11999999999',
      profile: 'minister'
    });

    expect(createPayload.nickname).toBe('Chiquinho');
    expect(createPayload.apelido).toBe('Chiquinho');
    expect(added.nickname).toBe('Chiquinho');

    await store.updateMember(101, {
      name: 'Francisco Silva',
      nickname: 'Chico',
      phone: '11999999999',
      profile: 'minister',
      status: 'ativo'
    });

    expect(updatePayload.nickname).toBe('Chico');
    expect(updatePayload.apelido).toBe('Chico');
  });

  it('store maps nickname/apelido on fetchMembers and fetchScales', async () => {
    const storeScript = readFileSync(resolve(__dirname, '../js/store.js'), 'utf-8');
    window.eval(storeScript);

    const store = window.appStore;

    window.api = {
      members: {
        list: async () => [
          { id: 1, name: 'João Carlos', apelido: 'Beto' }
        ]
      },
      events: {
        list: async () => [
          {
            id: 1,
            date: '2026-10-15',
            time: '19:00',
            celebration_id: 1,
            ministers: [
              { id: 1, name: 'João Carlos' }
            ]
          }
        ]
      }
    };

    const members = await store.fetchMembers(1);
    expect(members[0].nickname).toBe('Beto');
    expect(members[0].apelido).toBe('Beto');

    const scales = await store.fetchScales(2026, 10, 1);
    expect(scales[0].ministers[0].nickname).toBe('Beto');
  });
});
