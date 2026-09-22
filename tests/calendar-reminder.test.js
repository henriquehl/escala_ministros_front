import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Calendar Scale Reminder Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="calendar-day-detail-content"></div>
          <div id="calendar-day-detail-empty"></div>
          <div id="calendar-day-detail-title"></div>
          <div id="calendar-mass-subtitle"></div>
          <div id="calendar-ministers-count-ratio"></div>
          <div id="calendar-day-ministers-list"></div>
          <div id="calendar-title-month"></div>
          <div id="calendar-days-grid"></div>
        </body>
      </html>
    `, { runScripts: 'dangerously' });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  it('copies ONLY the specific celebration when copyScaleReminderByEvent is called with a specific scaleId', () => {
    const dayScales = [
      {
        id: 'scale-2026-09-22-0700',
        dateString: '2026-09-22',
        time: '07:00',
        celebrationName: 'Santa Missa de Domingo',
        ministers: [{ id: 1, name: 'Ana Maria Rodrigues' }, { id: 2, name: 'Cicero Machado' }]
      },
      {
        id: 'scale-2026-09-22-1000',
        dateString: '2026-09-22',
        time: '10:00',
        celebrationName: 'Evento TESTE',
        ministers: [{ id: 3, name: 'Henrique Teste' }, { id: 4, name: 'Jose Roberto' }]
      }
    ];

    window.appStore = {
      getScalesForDay: (date) => dayScales,
      fetchScales: async () => dayScales,
      subscribe: () => {}
    };

    let copiedScalePayload = null;
    window.copyScaleReminder = vi.fn((data) => {
      copiedScalePayload = data;
    });

    const calendarScript = readFileSync(resolve(__dirname, '../js/components/calendar.js'), 'utf-8');
    window.eval(calendarScript);

    // Call copyScaleReminderByEvent for the second event (10:00h)
    window.copyScaleReminderByEvent('2026-09-22', '10:00', 'scale-2026-09-22-1000');

    expect(window.copyScaleReminder).toHaveBeenCalledTimes(1);
    expect(copiedScalePayload).not.toBeNull();
    // It should be a single object (the 10:00 scale), NOT the whole array of 2 scales!
    expect(Array.isArray(copiedScalePayload)).toBe(false);
    expect(copiedScalePayload.id).toBe('scale-2026-09-22-1000');
    expect(copiedScalePayload.celebrationName).toBe('Evento TESTE');
    expect(copiedScalePayload.ministers.map(m => m.name)).toEqual(['Henrique Teste', 'Jose Roberto']);
  });

  it('copies the 07:00 celebration when copyScaleReminderByEvent is called for 07:00', () => {
    const dayScales = [
      {
        id: 'scale-2026-09-22-0700',
        dateString: '2026-09-22',
        time: '07:00',
        celebrationName: 'Santa Missa de Domingo',
        ministers: [{ id: 1, name: 'Ana Maria Rodrigues' }, { id: 2, name: 'Cicero Machado' }]
      },
      {
        id: 'scale-2026-09-22-1000',
        dateString: '2026-09-22',
        time: '10:00',
        celebrationName: 'Evento TESTE',
        ministers: [{ id: 3, name: 'Henrique Teste' }, { id: 4, name: 'Jose Roberto' }]
      }
    ];

    window.appStore = {
      getScalesForDay: (date) => dayScales,
      fetchScales: async () => dayScales,
      subscribe: () => {}
    };

    let copiedScalePayload = null;
    window.copyScaleReminder = vi.fn((data) => {
      copiedScalePayload = data;
    });

    const calendarScript = readFileSync(resolve(__dirname, '../js/components/calendar.js'), 'utf-8');
    window.eval(calendarScript);

    // Call copyScaleReminderByEvent for the first event (07:00h)
    window.copyScaleReminderByEvent('2026-09-22', '07:00', 'scale-2026-09-22-0700');

    expect(window.copyScaleReminder).toHaveBeenCalledTimes(1);
    expect(copiedScalePayload).not.toBeNull();
    expect(Array.isArray(copiedScalePayload)).toBe(false);
    expect(copiedScalePayload.id).toBe('scale-2026-09-22-0700');
    expect(copiedScalePayload.celebrationName).toBe('Santa Missa de Domingo');
  });

  it('formats reminder text accurately for single vs multiple scales in export.js', () => {
    const exportScript = readFileSync(resolve(__dirname, '../js/export.js'), 'utf-8');
    window.eval(exportScript);

    const singleScale = {
      id: 'scale-1',
      dateString: '2026-09-22',
      time: '07:00',
      celebrationName: 'Santa Missa de Domingo',
      ministers: [{ name: 'Ana Maria' }, { name: 'Cicero' }]
    };

    const multiScales = [
      singleScale,
      {
        id: 'scale-2',
        dateString: '2026-09-22',
        time: '10:00',
        celebrationName: 'Evento TESTE',
        ministers: [{ name: 'Henrique' }]
      }
    ];

    // Mock clipboard
    let clipboardText = '';
    window.navigator.clipboard = {
      writeText: async (text) => {
        clipboardText = text;
      }
    };

    // Test copying single scale
    window.copyScaleReminder(singleScale);
    expect(clipboardText).toContain('ESCALA:\nAna Maria;\nCicero;');
    expect(clipboardText).toContain('06:45');
    expect(clipboardText).not.toContain('Evento TESTE');

    // Test copying multi scales (day level)
    window.copyScaleReminder(multiScales);
    expect(clipboardText).toContain('07:00h - Santa Missa de Domingo');
    expect(clipboardText).toContain('10:00h - Evento TESTE');
    expect(clipboardText).toContain('Henrique;');
  });
});
