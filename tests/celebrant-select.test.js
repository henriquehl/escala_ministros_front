import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Celebrante Principal Selection Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <select id="celebrante">
            <option value="" selected>Selecione o celebrante (opcional)...</option>
          </select>
        </body>
      </html>
    `, { runScripts: 'dangerously' });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  it('renders both active priests and active ministers in separate optgroups', () => {
    const mockMembers = [
      { id: 1, name: 'Pe. Anderson', profile: 'padre', status: 'ativo' },
      { id: 2, name: 'Pe. Roberto', profile: 'celebrant', status: 'ativo' },
      { id: 3, name: 'Carlos MESC (Licença)', profile: 'minister', status: 'licenca' },
      { id: 4, name: 'Ana Souza', profile: 'minister', status: 'ativo' },
      { id: 5, name: 'Bruno Lima', profile: 'minister', status: 'ativo' },
      { id: 6, name: 'Padre Inativo', profile: 'padre', status: 'inativo' }
    ];

    window.appStore = {
      getMembers: () => mockMembers,
      getCelebrants: () => mockMembers.filter(m => m.profile === 'padre' || m.profile === 'celebrant'),
      subscribe: () => {}
    };

    // Load roster.js script logic
    const rosterScript = readFileSync(resolve(__dirname, '../js/components/roster.js'), 'utf-8');
    window.eval(rosterScript);

    // Call renderCelebrantSelect
    window.renderCelebrantSelect();

    const select = document.getElementById('celebrante');
    expect(select).not.toBeNull();

    const optgroups = select.querySelectorAll('optgroup');
    expect(optgroups.length).toBe(2);

    const celebrantsGroup = Array.from(optgroups).find(g => g.label === 'Padres / Celebrantes');
    const ministersGroup = Array.from(optgroups).find(g => g.label === 'Ministros (MESC)');

    expect(celebrantsGroup).toBeDefined();
    expect(ministersGroup).toBeDefined();

    // Check celebrants: active only (Pe. Anderson, Pe. Roberto)
    const celebrantOptions = Array.from(celebrantsGroup.querySelectorAll('option'));
    expect(celebrantOptions.map(o => o.text)).toEqual(['Pe. Anderson', 'Pe. Roberto']);

    // Check ministers: active only (Ana Souza, Bruno Lima) - Carlos (licenca) excluded
    const ministerOptions = Array.from(ministersGroup.querySelectorAll('option'));
    expect(ministerOptions.map(o => o.text)).toEqual(['Ana Souza', 'Bruno Lima']);
  });

  it('preserves pre-selected value even if member is on leave when editing', () => {
    const mockMembers = [
      { id: 1, name: 'Pe. Anderson', profile: 'padre', status: 'ativo' },
      { id: 3, name: 'Carlos MESC (Licença)', profile: 'minister', status: 'licenca' },
      { id: 4, name: 'Ana Souza', profile: 'minister', status: 'ativo' }
    ];

    window.appStore = {
      getMembers: () => mockMembers,
      getCelebrants: () => mockMembers.filter(m => m.profile === 'padre'),
      subscribe: () => {}
    };

    const rosterScript = readFileSync(resolve(__dirname, '../js/components/roster.js'), 'utf-8');
    window.eval(rosterScript);

    // Pre-select Carlos (id 3)
    window.renderCelebrantSelect('3');

    const select = document.getElementById('celebrante');
    const selectedOption = select.querySelector('option:checked');
    expect(selectedOption).not.toBeNull();
    expect(selectedOption.value).toBe('3');
    expect(selectedOption.textContent).toBe('Carlos MESC (Licença)');
  });

  it('resolves celebrant_id correctly for ministers in store.js', async () => {
    const storeScript = readFileSync(resolve(__dirname, '../js/store.js'), 'utf-8');
    window.eval(storeScript);

    const store = window.appStore;
    store.members = [
      { id: 10, name: 'Pe. Anderson', profile: 'padre', status: 'ativo' },
      { id: 25, name: 'Marcos Vinicius', profile: 'minister', status: 'ativo' }
    ];

    let savedPayload = null;
    window.api = {
      events: {
        create: async (payload) => {
          savedPayload = payload;
          return { id: 99, ...payload };
        }
      }
    };

    await store.saveScale({
      dateString: '2026-09-25',
      time: '19:00',
      celebration_id: 1,
      celebrationName: 'Missa',
      celebrant: 'Marcos Vinicius',
      ministers: [{ id: 10, name: 'Pe. Anderson' }]
    });

    expect(savedPayload).not.toBeNull();
    expect(savedPayload.celebrant_id).toBe(25);
  });
});
