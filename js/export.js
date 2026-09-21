/**
 * Módulo de Exportação, Impressão de PDF e Copiar Lembrete
 * Suporte aos 2 modelos de PDF (Dia Único e Mês Completo em Folha Única A4) e Lembrete de Escala
 */

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calcula o horário de chegada prévia (15 minutos antes da missa)
 */
function calculateArrivalTime(timeStr) {
  if (!timeStr) return '18:45';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const totalMin = (h * 60 + m) - 15;
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Formata o lembrete no padrão solicitado.
 * Suporta 1 única escala ou array com múltiplas escalas do mesmo dia:
 */
function formatScaleReminderText(scaleOrScales) {
  const churchName = (window.appStore && window.appStore.currentUser && window.appStore.currentUser.churchName) || 'Capela Divino Espírito Santo';

  if (Array.isArray(scaleOrScales)) {
    const scales = scaleOrScales.filter(Boolean);
    if (scales.length === 0) return '';
    if (scales.length === 1) {
      return formatSingleScaleReminder(scales[0], churchName);
    }

    // Ordenar cronologicamente por horário
    scales.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    let text = `ESCALA:\n\n`;
    scales.forEach((s, index) => {
      const arrivalTime = calculateArrivalTime(s.time);
      const celName = s.celebrationName || 'Santa Missa';
      text += `${s.time}h - ${celName} (Chegada às ${arrivalTime})\n`;
      if (s.ministers && s.ministers.length > 0) {
        s.ministers.forEach((m) => {
          text += `${m.name};\n`;
        });
      } else {
        text += `(Nenhum ministro escalado);\n`;
      }
      if (index < scales.length - 1) {
        text += `\n`;
      }
    });

    text += `\nNão se esqueçam do nosso compromisso de hoje, ${churchName}`;
    return text;
  }

  return formatSingleScaleReminder(scaleOrScales, churchName);
}

function formatSingleScaleReminder(scale, churchName) {
  if (!scale) return '';
  const arrivalTime = calculateArrivalTime(scale.time);
  const church = churchName || (window.appStore && window.appStore.currentUser && window.appStore.currentUser.churchName) || 'Capela Divino Espírito Santo';

  let text = `ESCALA:\n`;

  if (scale.ministers && scale.ministers.length > 0) {
    scale.ministers.forEach((m) => {
      text += `${m.name};\n`;
    });
  } else {
    text += `(Nenhum ministro escalado);\n`;
  }

  text += `\nNão se esqueçam do nosso compromisso de hoje, às ${arrivalTime}, ${church}`;
  return text;
}

/**
 * Copia o Lembrete para a área de transferência
 */
window.copyScaleReminder = function(scaleData) {
  let targetData = scaleData;
  if (!targetData && window.getSelectedDayScales) {
    const dayScales = window.getSelectedDayScales();
    if (dayScales && dayScales.length > 0) {
      targetData = dayScales.length === 1 ? dayScales[0] : dayScales;
    }
  }
  if (!targetData && window.getSelectedScale) {
    targetData = window.getSelectedScale();
  }

  if (!targetData) {
    if (window.showToast) window.showToast('Nenhuma celebração selecionada para copiar o lembrete.', 'warning');
    return;
  }

  const message = formatScaleReminderText(targetData);
  const isMultiple = Array.isArray(targetData) && targetData.length > 1;
  const timeInfo = isMultiple ? ` (${targetData.length} celebrações)` : (targetData.time ? ` (${targetData.time}h)` : '');

  // Copiar para a área de transferência
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).then(() => {
      if (window.showToast) {
        window.showToast(`Lembrete${timeInfo} copiado com sucesso! Pronto para colar no WhatsApp.`, 'success');
      }
    }).catch(() => {
      fallbackCopyText(message, timeInfo);
    });
  } else {
    fallbackCopyText(message, timeInfo);
  }
};

/**
 * Fallback de cópia para navegadores antigos
 */
function fallbackCopyText(text, timeInfo = '') {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    if (window.showToast) window.showToast(`Lembrete da celebração${timeInfo} copiado com sucesso! Pronto para colar.`, 'success');
  } catch (err) {
    if (window.showToast) window.showToast('Lembrete pronto! Copie a mensagem.', 'info');
  }
}

/**
 * MODELO 1 DE IMPRESSÃO: Escala do Dia Selecionado (Suporta 1 ou múltiplas celebrações no mesmo dia)
 */
window.exportSingleDayPdf = function(scaleData) {
  const printContainer = document.getElementById('print-container');
  if (!printContainer) return;

  let dayScales = [];
  if (Array.isArray(scaleData)) {
    dayScales = scaleData;
  } else if (scaleData && typeof scaleData === 'object') {
    dayScales = [scaleData];
  } else if (window.getSelectedDayScales) {
    dayScales = window.getSelectedDayScales();
  } else if (window.getSelectedScale) {
    const single = window.getSelectedScale();
    if (single) dayScales = [single];
  }

  // Filtrar apenas escalas válidas com ministros
  dayScales = (dayScales || []).filter(s => s && s.ministers && s.ministers.length > 0);

  if (dayScales.length === 0) {
    if (window.showToast) window.showToast('Selecione um dia com escala cadastrada para imprimir.');
    return;
  }

  // Ordenar celebrações do dia por horário cronológico
  dayScales.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const firstScale = dayScales[0];
  const dayPad = String(firstScale.day || 1).padStart(2, '0');
  const monthPad = String(firstScale.month || 1).padStart(2, '0');
  const calMonthYear = (window.getCurrentCalendarMonthAndYear && window.getCurrentCalendarMonthAndYear()) || {};
  const yearVal = firstScale.year || calMonthYear.year || 2026;
  const formattedDateDDMMAAAA = `${dayPad}/${monthPad}/${yearVal}`;
  const dayOfWeekName = (firstScale.dayOfWeek || 'Domingo').toUpperCase();
  const displayTitleDate = `${dayOfWeekName}, ${formattedDateDDMMAAAA}`;

  const userChurch = (window.appStore && window.appStore.currentUser && window.appStore.currentUser.churchName) || 'Capela Divino Espírito Santo';

  let contentHtml = '';

  if (dayScales.length === 1) {
    const scale = dayScales[0];
    const ministersRows = scale.ministers.map((m) => `
      <tr>
        <td style="font-weight: 600; padding: 8px 10px;">${m.name} ${m.isLeader ? '<span style="color:#b3093f; font-size: 9.5pt;">(Coordenador)</span>' : ''}</td>
        <td style="padding: 8px 10px;">${m.role || 'Ministro'}</td>
        <td style="text-align: center; padding: 8px 10px;">${m.phone || '-'}</td>
      </tr>
    `).join('');

    contentHtml = `
      <!-- Dados da Celebração Única -->
      <div style="background-color: #faf9f7; border: 1px solid #e3e2e0; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div>
            <p style="margin: 0; font-size: 10pt; color: #564243; font-weight: 600; text-transform: uppercase;">Celebração</p>
            <h2 style="margin: 3px 0 0 0; font-size: 15pt; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold;">${scale.celebrationName || 'Santa Missa'}</h2>
            ${scale.celebrant ? `<p style="margin: 5px 0 0 0; font-size: 11pt; color: #1a1c1b;"><strong>Celebrante:</strong> ${scale.celebrant}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 10pt; color: #564243; font-weight: 600; text-transform: uppercase;">Data & Horário</p>
            <p style="margin: 3px 0 0 0; font-size: 13pt; color: #1a1c1b; font-weight: bold;">${displayTitleDate}</p>
            <p style="margin: 3px 0 0 0; font-size: 12pt; color: #b3093f; font-weight: bold;">${scale.time} horas</p>
          </div>
        </div>
      </div>

      <!-- Tabela dos Ministros Escalados -->
      <h3 style="font-size: 12pt; color: #b3093f; margin: 0 0 10px 0; text-transform: uppercase; font-weight: bold; border-bottom: 1.5px solid #b3093f; padding-bottom: 5px;">Ministros Escalados (${scale.ministers.length} Ministros)</h3>
      <table class="monthly-print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11pt;">
        <thead>
          <tr style="background-color: #efeeec;">
            <th style="border: 1px solid #dadad8; padding: 8px 10px; text-align: left;">Ministro(a)</th>
            <th style="border: 1px solid #dadad8; padding: 8px 10px; text-align: left;">Função Litúrgica</th>
            <th style="border: 1px solid #dadad8; padding: 8px 10px; text-align: center; width: 150px;">Contato</th>
          </tr>
        </thead>
        <tbody>
          ${ministersRows}
        </tbody>
      </table>
    `;
  } else {
    // Múltiplas celebrações no mesmo dia
    const celebrationsHtml = dayScales.map((scale) => {
      const ministersRows = scale.ministers.map((m) => `
        <tr>
          <td style="font-weight: 600; padding: 6px 8px;">${m.name} ${m.isLeader ? '<span style="color:#b3093f; font-size: 9pt;">(Coordenador)</span>' : ''}</td>
          <td style="padding: 6px 8px;">${m.role || 'Ministro'}</td>
          <td style="text-align: center; padding: 6px 8px;">${m.phone || '-'}</td>
        </tr>
      `).join('');

      return `
        <div class="print-page-break-inside-avoid" style="margin-bottom: 14px; border: 1px solid #e3e2e0; border-radius: 6px; padding: 10px 14px; background-color: #ffffff;">
          <!-- Cabeçalho do Evento Específico -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #b3093f; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background-color: #b3093f; color: #ffffff; font-size: 11pt; font-weight: bold; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.02em;">${scale.time}h</span>
              <div>
                <h3 style="margin: 0; font-size: 13pt; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold;">${scale.celebrationName || 'Santa Missa'}</h3>
                ${scale.celebrant ? `<p style="margin: 2px 0 0 0; font-size: 10pt; color: #1a1c1b;"><strong>Celebrante:</strong> ${scale.celebrant}</p>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background-color: #ffd9e2; color: #b3093f; font-size: 9pt; font-weight: bold; padding: 3px 9px; border-radius: 4px;">${scale.ministers.length} Ministros</span>
            </div>
          </div>

          <!-- Tabela de Ministros desta Missa -->
          <table class="monthly-print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; font-size: 10.5pt;">
            <thead>
              <tr style="background-color: #efeeec;">
                <th style="border: 1px solid #dadad8; padding: 6px 8px; text-align: left;">Ministro(a)</th>
                <th style="border: 1px solid #dadad8; padding: 6px 8px; text-align: left;">Função Litúrgica</th>
                <th style="border: 1px solid #dadad8; padding: 6px 8px; text-align: center; width: 140px;">Contato</th>
              </tr>
            </thead>
            <tbody>
              ${ministersRows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    contentHtml = `
      <!-- Banner Informativo do Dia com Múltiplas Celebrações -->
      <div style="display: flex; justify-content: space-between; align-items: center; background-color: #faf9f7; border: 1px solid #e3e2e0; border-left: 4px solid #b3093f; border-radius: 6px; padding: 10px 16px; margin-bottom: 14px;">
        <div>
          <span style="font-size: 9pt; color: #564243; text-transform: uppercase; font-weight: 600;">Data da Escala</span>
          <h2 style="margin: 0; font-size: 13pt; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold;">${displayTitleDate}</h2>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #ffd9e2; color: #b3093f; font-size: 9.5pt; font-weight: bold; padding: 4px 12px; border-radius: 4px;">${dayScales.length} Celebrações neste dia</span>
        </div>
      </div>

      <!-- Lista de Celebrações -->
      ${celebrationsHtml}
    `;
  }

  printContainer.innerHTML = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1a1c1b; padding: 4px 0;">
      <!-- Cabeçalho Paroquial Oficial -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #b3093f; padding-bottom: 10px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="/logo-paroquia.jpg" style="height: 52px; width: auto;" alt="Logo Paróquia">
          <div>
            <h1 style="font-size: 17pt; margin: 0; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold;">${userChurch.toUpperCase()}</h1>
            <p style="margin: 3px 0 0 0; font-size: 9.5pt; color: #564243; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">ESCALA DE MINISTROS PARA O DIA ${formattedDateDDMMAAAA}</p>
          </div>
        </div>
      </div>

      <!-- Conteúdo do Dia -->
      ${contentHtml}

      <!-- Aviso Fraterno de Rodapé -->
      <div style="border-top: 1px solid #c2b5b6; padding-top: 8px; margin-top: 12px; font-size: 9pt; color: #564243; line-height: 1.35;">
        <strong>Aviso:</strong> Chegar com 15 min de antecedência e em caso de impossibilidade de comparecimento, favor comunicar a coordenação para substituição prévia.
      </div>
    </div>
  `;

  if (window.showToast) window.showToast('Preparando impressão da Escala...');
  setTimeout(() => {
    window.print();
  }, 250);
};

/**
 * MODELO 2 DE IMPRESSÃO: Escala Geral do Mês Completo em Folha Única A4 (Mural / Sacristia)
 */
window.exportMonthlySheetPdf = function(year, month) {
  const printContainer = document.getElementById('print-container');
  if (!printContainer || !window.appStore) return;

  const current = window.getCurrentCalendarMonthAndYear ? window.getCurrentCalendarMonthAndYear() : { year: 2026, month: 9 };
  const targetYear = year || current.year;
  const targetMonth = month || current.month;

  const monthScales = window.appStore.getScalesForMonth(targetYear, targetMonth);
  const monthName = MONTH_NAMES_FULL[targetMonth - 1] || 'Mês';

  if (!monthScales || monthScales.length === 0) {
    if (window.showToast) window.showToast('Nenhuma escala cadastrada neste mês para gerar a folha única.');
    return;
  }

  // Ordenar por dia e horário
  monthScales.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.time.localeCompare(b.time);
  });

  const tableRows = monthScales.map((scale) => {
    const ministersFormatted = (scale.ministers && scale.ministers.length > 0)
      ? scale.ministers.map((m, i) => `<div style="display:block; margin-bottom: 2px; font-size: 9.5pt; line-height: 1.3;"><strong>${i + 1}.</strong> ${m.name}</div>`).join('')
      : '<em style="color:#897173; font-size: 9.5pt;">Sem ministros</em>';

    const dayPad = String(scale.day).padStart(2, '0');
    const monthPad = String(targetMonth).padStart(2, '0');
    const dateFormatted = `${dayPad}/${monthPad}/${targetYear} (${scale.dayOfWeek || 'DOM'})`;

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; white-space: nowrap; color: #b3093f; font-size: 10pt; padding: 7px 8px;">
          ${dateFormatted}
        </td>
        <td style="text-align: center; font-weight: bold; white-space: nowrap; font-size: 10.5pt; padding: 7px 8px;">
          ${scale.time}h
        </td>
        <td style="font-size: 10pt; padding: 7px 10px;">
          <strong style="font-size: 10.5pt;">${scale.celebrationName || 'Missa'}</strong>${scale.celebrant ? `<br><span style="color: #564243; font-size: 9.5pt;">${scale.celebrant}</span>` : ''}
        </td>
        <td style="font-size: 10pt; line-height: 1.4; padding: 7px 10px;">
          ${ministersFormatted}
        </td>
      </tr>
    `;
  }).join('');

  const userChurch = (window.appStore && window.appStore.currentUser && window.appStore.currentUser.churchName) || 'Capela Divino Espírito Santo';

  printContainer.innerHTML = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1a1c1b; padding: 4px 0;">
      <!-- Cabeçalho do Painel Mensal A4 -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #b3093f; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="/logo-paroquia.jpg" style="height: 44px; width: auto;" alt="Logo Paróquia">
          <div>
            <h1 style="font-size: 15pt; margin: 0; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold; line-height: 1.15;">${userChurch.toUpperCase()}</h1>
            <p style="margin: 2px 0 0 0; font-size: 9.5pt; color: #564243; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Escala Geral Mensal de Ministros</p>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #b3093f; color: #ffffff; font-size: 10.5pt; font-weight: bold; padding: 3px 12px; border-radius: 4px; text-transform: uppercase;">${monthName.toUpperCase()} / ${targetYear}</span>
        </div>
      </div>

      <!-- Tabela Mensal Condensada em Folha Única -->
      <table class="monthly-print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt;">
        <thead>
          <tr>
            <th style="width: 85px; text-align: center; font-size: 10pt; padding: 7px 8px;">DATA / DIA</th>
            <th style="width: 60px; text-align: center; font-size: 10pt; padding: 7px 8px;">HORA</th>
            <th style="width: 190px; font-size: 10pt; padding: 7px 10px;">CELEBRAÇÃO</th>
            <th style="font-size: 10pt; padding: 7px 10px;">MINISTROS ESCALADOS</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Aviso Fraterno Compacto de Rodapé -->
      <div style="border-top: 1px solid #c2b5b6; padding-top: 8px; margin-top: 8px; font-size: 9pt; color: #564243; line-height: 1.35;">
        <strong>Aviso:</strong> Chegar com 15 min de antecedência e em caso de impossibilidade de comparecimento, favor comunicar a coordenação para substituição prévia.
      </div>
    </div>
  `;

  if (window.showToast) window.showToast('Preparando Escala Mensal Completa em Folha Única A4...');
  setTimeout(() => {
    window.print();
  }, 250);
};

/**
 * Modal de Seleção de Modelo de Exportação
 */
window.openPdfExportModal = function() {
  const modal = document.getElementById('export-pdf-modal');
  if (modal) modal.classList.remove('hidden');
};

window.closePdfExportModal = function() {
  const modal = document.getElementById('export-pdf-modal');
  if (modal) modal.classList.add('hidden');
};

function initExportBindings() {
  // Botões de Exportação rápida
  const shareSheetBtn = document.getElementById('shareSheetBtn');
  const printPdfBtn = document.getElementById('printPdfBtn');
  const btnExportPdfRoster = document.getElementById('btn-export-pdf');
  const copyWhatsappBtn = document.getElementById('copyWhatsappBtn');

  // Abrir Modal de Escolha de PDF
  if (shareSheetBtn) {
    shareSheetBtn.addEventListener('click', () => {
      window.openPdfExportModal();
    });
  }

  if (printPdfBtn) {
    printPdfBtn.addEventListener('click', () => {
      window.openPdfExportModal();
    });
  }

  if (btnExportPdfRoster) {
    btnExportPdfRoster.addEventListener('click', () => {
      window.openPdfExportModal();
    });
  }

  // Ação direta do botão "Copiar lembrete" no card
  if (copyWhatsappBtn) {
    copyWhatsappBtn.addEventListener('click', () => {
      window.copyScaleReminder();
    });
  }

  // Ações dentro do Modal de Exportação
  const btnPrintDay = document.getElementById('btn-export-model-day');
  const btnPrintMonth = document.getElementById('btn-export-model-month');
  const btnExportWhatsappModal = document.getElementById('btn-export-model-whatsapp');
  const btnCloseExportModal = document.getElementById('btn-close-export-modal');

  if (btnPrintDay) {
    btnPrintDay.addEventListener('click', () => {
      window.closePdfExportModal();
      window.exportSingleDayPdf();
    });
  }

  if (btnPrintMonth) {
    btnPrintMonth.addEventListener('click', () => {
      window.closePdfExportModal();
      const current = window.getCurrentCalendarMonthAndYear ? window.getCurrentCalendarMonthAndYear() : { year: 2026, month: 9 };
      window.exportMonthlySheetPdf(current.year, current.month);
    });
  }

  if (btnExportWhatsappModal) {
    btnExportWhatsappModal.addEventListener('click', () => {
      window.closePdfExportModal();
      window.copyScaleReminder();
    });
  }

  if (btnCloseExportModal) {
    btnCloseExportModal.addEventListener('click', () => {
      window.closePdfExportModal();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExportBindings);
} else {
  initExportBindings();
}
