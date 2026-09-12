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
 * Formata o lembrete no padrão solicitado:
 * ESCALA:
 * Antônio Carlos Silveira / @(11) 99999-0001;
 * 
 * Não se esqueçam do nosso compromisso de hoje, às 18:45, Capela Divino Espírito Santo
 */
function formatScaleReminderText(scale) {
  if (!scale) return '';

  const arrivalTime = calculateArrivalTime(scale.time);
  const churchName = 'Capela Divino Espírito Santo';

  let text = `ESCALA:\n`;

  if (scale.ministers && scale.ministers.length > 0) {
    const allMembers = window.appStore ? window.appStore.getMembers() : [];

    scale.ministers.forEach((m) => {
      let phone = m.phone;
      if (!phone && allMembers.length > 0) {
        const found = allMembers.find((mem) => mem.id === m.id || mem.name.toLowerCase() === m.name.toLowerCase());
        if (found && found.phone) {
          phone = found.phone;
        }
      }

      if (phone) {
        text += `${m.name} / @${phone};\n`;
      } else {
        text += `${m.name};\n`;
      }
    });
  } else {
    text += `(Nenhum ministro escalado);\n`;
  }

  text += `\nNão se esqueçam do nosso compromisso de hoje, às ${arrivalTime}, ${churchName}`;

  return text;
}

/**
 * Copia o Lembrete para a área de transferência
 */
window.copyScaleReminder = function(scaleData) {
  const scale = scaleData || (window.getSelectedScale ? window.getSelectedScale() : null);
  if (!scale) {
    if (window.showToast) window.showToast('Nenhuma celebração selecionada para copiar o lembrete.');
    return;
  }

  const message = formatScaleReminderText(scale);

  // Copiar para a área de transferência
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).then(() => {
      if (window.showToast) {
        window.showToast('Lembrete copiado com sucesso! Pronto para colar.');
      }
    }).catch(() => {
      fallbackCopyText(message);
    });
  } else {
    fallbackCopyText(message);
  }
};

/**
 * Fallback de cópia para navegadores antigos
 */
function fallbackCopyText(text) {
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
    if (window.showToast) window.showToast('Lembrete copiado com sucesso! Pronto para colar.');
  } catch (err) {
    if (window.showToast) window.showToast('Lembrete pronto! Copie a mensagem.');
  }
}

/**
 * MODELO 1 DE IMPRESSÃO: Escala Individual do Dia Selecionado
 */
window.exportSingleDayPdf = function(scaleData) {
  const scale = scaleData || (window.getSelectedScale ? window.getSelectedScale() : null);
  const printContainer = document.getElementById('print-container');
  if (!printContainer) return;

  if (!scale || !scale.ministers || scale.ministers.length === 0) {
    if (window.showToast) window.showToast('Selecione um dia com escala cadastrada para imprimir.');
    return;
  }

  const ministersRows = scale.ministers.map((m, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold; width: 36px;">${idx + 1}</td>
      <td style="font-weight: 600;">${m.name} ${m.isLeader ? '<span style="color:#b3093f; font-size: 8.5pt;">(Coordenador)</span>' : ''}</td>
      <td>${m.role || 'Ministro'}</td>
      <td style="text-align: center;">${m.phone || '-'}</td>
    </tr>
  `).join('');

  const dayPad = String(scale.day || 1).padStart(2, '0');
  const monthPad = String(scale.month || 1).padStart(2, '0');
  const yearVal = scale.year || 2025;
  const formattedDateDDMMAAAA = `${dayPad}/${monthPad}/${yearVal}`;
  const displayTitleDate = (scale.title && scale.title.includes('/')) ? scale.title : `${scale.dayOfWeek || 'Domingo'}, ${formattedDateDDMMAAAA}`;

  printContainer.innerHTML = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1a1c1b; padding: 8px 0;">
      <!-- Cabeçalho Paroquial Oficial -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #b3093f; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIgSu4l2yDG1jT_7SwkOJJqFNaW2p_4HqqVnHCztIoLyqUYDPmoSGWYlYdkUc-1yWYm_JOr9NmY3lq_A-ZQddP4x4tS9u05k13J4a9O-yNFaKsUxGHTjy03OnqVp6ljUawhwHZrufK-bLI8Jsw_If_pirzKyW79ZrY_N8pBzfsYjOBN1N8pfD6vQCEQfT8MKv7RTPUUi4574MReICVACO_1wS4kDxI3rf_rviObVKnYChRfYyQT9tbBg" style="height: 50px; width: auto;" alt="Logo Paróquia">
          <div>
            <h1 style="font-size: 16pt; margin: 0; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold;">CAPELA DIVINO ESPÍRITO SANTO</h1>
            <p style="margin: 2px 0 0 0; font-size: 9pt; color: #564243; text-transform: uppercase; letter-spacing: 0.05em;">Pastoral dos Ministros Extraordinários da Sagrada Comunhão</p>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #ffd9e2; color: #b3093f; font-size: 8.5pt; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">Modelo Individual</span>
          <p style="margin: 4px 0 0 0; font-size: 8pt; color: #897173;">Emitido em: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <!-- Dados da Celebração -->
      <div style="background-color: #faf9f7; border: 1px solid #e3e2e0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
          <div>
            <p style="margin: 0; font-size: 9pt; color: #564243; font-weight: 600; text-transform: uppercase;">Celebração Litúrgica</p>
            <h2 style="margin: 2px 0 0 0; font-size: 13pt; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif;">${scale.celebrationName || 'Santa Missa'}</h2>
            <p style="margin: 4px 0 0 0; font-size: 9.5pt; color: #1a1c1b;"><strong>Celebrante:</strong> ${scale.celebrant || 'Pároco'}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 9pt; color: #564243; font-weight: 600; text-transform: uppercase;">Data & Horário</p>
            <p style="margin: 2px 0 0 0; font-size: 12pt; color: #1a1c1b; font-weight: bold;">${displayTitleDate}</p>
            <p style="margin: 2px 0 0 0; font-size: 11pt; color: #b3093f; font-weight: bold;">${scale.time} horas</p>
          </div>
        </div>
      </div>

      <!-- Tabela dos Ministros Escalados -->
      <h3 style="font-size: 11pt; color: #b3093f; margin: 0 0 8px 0; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #b3093f; padding-bottom: 4px;">Corpo Ministerial Escalado (${scale.ministers.length} Ministros)</h3>
      <table class="monthly-print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #efeeec;">
            <th style="border: 1px solid #dadad8; padding: 6px; width: 36px; text-align: center;">#</th>
            <th style="border: 1px solid #dadad8; padding: 6px; text-align: left;">Ministro(a)</th>
            <th style="border: 1px solid #dadad8; padding: 6px; text-align: left;">Função Litúrgica</th>
            <th style="border: 1px solid #dadad8; padding: 6px; text-align: center;">Contato</th>
          </tr>
        </thead>
        <tbody>
          ${ministersRows}
        </tbody>
      </table>

      <!-- Orientações Paroquiais -->
      <div style="border: 1px dashed #897173; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 8.5pt; color: #564243; background-color: #faf9f7;">
        <strong style="color: #b3093f;">Lembretes Litúrgicos:</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 18px; line-height: 1.4;">
          <li>Apresentar-se na Sacristia com no mínimo <strong>20 minutos de antecedência</strong> da celebração.</li>
          <li>Portar veste litúrgica oficial limpa e bem cuidada.</li>
          <li>Em caso de imprevisto urgente, providenciar a substituição antecipada comunicando a Coordenação Pastoral.</li>
        </ul>
      </div>

      <!-- Assinaturas -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 40px; padding-top: 10px;">
        <div>
          <div style="border-top: 1px solid #1a1c1b; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-size: 9pt; font-weight: bold;">Pe. Marcelo Rossi</p>
          <p style="margin: 0; font-size: 8pt; color: #564243;">Pároco</p>
        </div>
        <div>
          <div style="border-top: 1px solid #1a1c1b; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-size: 9pt; font-weight: bold;">Coordenação Pastoral Capela Divino</p>
          <p style="margin: 0; font-size: 8pt; color: #564243;">Capela Divino Espírito Santo</p>
        </div>
      </div>
    </div>
  `;

  if (window.showToast) window.showToast('Preparando impressão da Escala Individual...');
  setTimeout(() => {
    window.print();
  }, 250);
};

/**
 * MODELO 2 DE IMPRESSÃO: Escala Geral do Mês Completo em Folha Única A4 (Mural / Sacristia)
 */
window.exportMonthlySheetPdf = function(year = 2025, month = 10) {
  const printContainer = document.getElementById('print-container');
  if (!printContainer || !window.appStore) return;

  const monthScales = window.appStore.getScalesForMonth(year, month);
  const monthName = MONTH_NAMES_FULL[month - 1];

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
      ? scale.ministers.map((m, i) => `<span style="display:inline-block; margin-right: 8px;"><strong>${i + 1}.</strong> ${m.name} <em style="color:#564243; font-size: 8pt;">(${m.role || 'Altar'})</em></span>`).join(' ')
      : '<em style="color:#897173;">Sem ministros</em>';

    const dayPad = String(scale.day).padStart(2, '0');
    const monthPad = String(month).padStart(2, '0');
    const dateFormatted = `${dayPad}/${monthPad}/${year} (${scale.dayOfWeek || 'DOM'})`;

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; white-space: nowrap; color: #b3093f;">
          ${dateFormatted}
        </td>
        <td style="text-align: center; font-weight: 600; white-space: nowrap;">
          ${scale.time}h
        </td>
        <td style="font-size: 8.5pt;">
          <strong>${scale.celebrationName || 'Missa'}</strong><br>
          <span style="color: #564243;">${scale.celebrant || 'Pe. Marcelo'}</span>
        </td>
        <td style="font-size: 8.5pt; line-height: 1.35;">
          ${ministersFormatted}
        </td>
      </tr>
    `;
  }).join('');

  printContainer.innerHTML = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1a1c1b; padding: 4px 0;">
      <!-- Cabeçalho do Painel Mensal A4 -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #b3093f; padding-bottom: 6px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIgSu4l2yDG1jT_7SwkOJJqFNaW2p_4HqqVnHCztIoLyqUYDPmoSGWYlYdkUc-1yWYm_JOr9NmY3lq_A-ZQddP4x4tS9u05k13J4a9O-yNFaKsUxGHTjy03OnqVp6ljUawhwHZrufK-bLI8Jsw_If_pirzKyW79ZrY_N8pBzfsYjOBN1N8pfD6vQCEQfT8MKv7RTPUUi4574MReICVACO_1wS4kDxI3rf_rviObVKnYChRfYyQT9tbBg" style="height: 38px; width: auto;" alt="Logo Paróquia">
          <div>
            <h1 style="font-size: 13pt; margin: 0; color: #b3093f; font-family: 'Source Serif 4', Georgia, serif; font-weight: bold; line-height: 1.1;">CAPELA DIVINO ESPÍRITO SANTO</h1>
            <p style="margin: 1px 0 0 0; font-size: 8pt; color: #564243; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Escala Geral Mensal dos Ministros da Eucaristia</p>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #b3093f; color: #ffffff; font-size: 9pt; font-weight: bold; padding: 2px 10px; border-radius: 4px; text-transform: uppercase;">${monthName.toUpperCase()} / ${year}</span>
          <p style="margin: 2px 0 0 0; font-size: 7.5pt; color: #897173;">Quadro Oficial para Mural e Sacristia</p>
        </div>
      </div>

      <!-- Tabela Mensal Condensada em Folha Única -->
      <table class="monthly-print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8.5pt;">
        <thead>
          <tr>
            <th style="width: 75px; text-align: center;">DATA / DIA</th>
            <th style="width: 55px; text-align: center;">HORA</th>
            <th style="width: 175px;">CELEBRAÇÃO & CELEBRANTE</th>
            <th>MINISTROS ESCALADOS & FUNÇÕES</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Aviso Fraterno Compacto de Rodapé -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #c2b5b6; padding-top: 6px; margin-top: 6px; font-size: 7.5pt; color: #564243;">
        <div>
          <strong>Aviso Pastoral:</strong> Chegar com 20 min de antecedência. Em caso de impedimento, comunique a coordenação para substituição prévia.
        </div>
        <div style="text-align: right; font-weight: 600;">
          "Servir com amor e prontidão ao altar do Senhor"
        </div>
      </div>

      <!-- Assinaturas Compactas -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; text-align: center; margin-top: 24px; padding-top: 6px;">
        <div>
          <div style="border-top: 1px solid #1a1c1b; margin-bottom: 2px;"></div>
          <p style="margin: 0; font-size: 8pt; font-weight: bold;">Pe. Marcelo Rossi</p>
          <p style="margin: 0; font-size: 7pt; color: #564243;">Pároco</p>
        </div>
        <div>
          <div style="border-top: 1px solid #1a1c1b; margin-bottom: 2px;"></div>
          <p style="margin: 0; font-size: 8pt; font-weight: bold;">Coordenação Pastoral Capela Divino</p>
          <p style="margin: 0; font-size: 7pt; color: #564243;">Capela Divino Espírito Santo</p>
        </div>
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
      window.exportMonthlySheetPdf(2025, 10);
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

window.addEventListener('DOMContentLoaded', initExportBindings);
