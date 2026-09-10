/**
 * Componente: Montar e Gerir Escala (Assistente em 3 Passos)
 * Permite selecionar qualquer dia do calendário (Segunda a Domingo)
 * Passo 2: Escolha e cadastro do nome da celebração a partir de lista pré-definida
 */

let selectedRosterDate = '2025-10-19';
let selectedRosterHour = '10:00';
let assignedMinisters = [];
const MAX_SLOTS = 6;

const ROSTER_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function initRosterComponent() {
  const datePicker = document.getElementById('roster-date-picker');
  const searchInput = document.getElementById('minister-search');
  const btnSave = document.getElementById('btn-save-roster');
  const btnSaveNotify = document.getElementById('btn-save-notify');
  const btnExportPdf = document.getElementById('btn-export-pdf');

  // 1. Sincronização com Seletor Nativo de Data
  if (datePicker) {
    datePicker.value = selectedRosterDate;
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        setSelectedRosterDate(e.target.value);
      }
    });
  }

  // 2. Configurar Seletor de Horário Suspenso
  initRosterHourSelect();

  // 3. Configurar Controles do Passo 2 (Celebrações)
  initCelebrationControls();

  // 4. Busca de Ministros Candidatos
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      renderCandidateMinisters(term);
    });
  }

  // 5. Salvar Escala
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveCurrentRoster(false);
    });
  }

  // 6. Salvar e Notificar via WhatsApp
  if (btnSaveNotify) {
    btnSaveNotify.addEventListener('click', () => {
      saveCurrentRoster(true);
    });
  }

  // 7. Exportar PDF
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      if (window.openPdfExportModal) {
        window.openPdfExportModal();
      } else {
        window.print();
      }
    });
  }

  // Reagir a mudanças no Store ou Navegação
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'members' || event === 'scales') {
        renderRosterDateChips();
        renderCandidateMinisters();
      } else if (event === 'celebrations') {
        renderCelebrationSelect();
      }
    });
  }

  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'montar-escala') {
      const hourSelect = document.getElementById('roster-hour-select');
      if (hourSelect) hourSelect.value = selectedRosterHour;
      renderRosterDateChips();
      renderCelebrationSelect();
      loadExistingScaleForSelectedDate();
      renderCandidateMinisters();
    }
  });

  // Render inicial
  renderRosterDateChips();
  renderCelebrationSelect();
  loadExistingScaleForSelectedDate();
  renderCandidateMinisters();
}

/**
 * Renderiza o <select> com todas as celebrações cadastradas
 */
function renderCelebrationSelect(selectedCelebrationName = '') {
  const selectEl = document.getElementById('celebration-select');
  if (!selectEl || !window.appStore) return;

  const celebrations = window.appStore.getCelebrations();
  const currentVal = selectedCelebrationName || selectEl.value;

  selectEl.innerHTML = celebrations.map((c) => {
    const isSelected = c === currentVal || (selectedCelebrationName && c.toLowerCase().includes(selectedCelebrationName.toLowerCase()));
    return `<option value="${c}" ${isSelected ? 'selected' : ''}>${c}</option>`;
  }).join('');
}

/**
 * Inicializa os controles de cadastro de novo nome de celebração
 */
function initCelebrationControls() {
  const toggleBtn = document.getElementById('btn-toggle-new-celebration');
  const container = document.getElementById('new-celebration-container');
  const inputName = document.getElementById('new-celebration-name');
  const btnSaveNew = document.getElementById('btn-save-new-celebration');
  const btnCancelNew = document.getElementById('btn-cancel-new-celebration');

  if (toggleBtn && container) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = container.classList.contains('hidden');
      if (isHidden) {
        container.classList.remove('hidden');
        if (inputName) {
          inputName.value = '';
          inputName.focus();
        }
      } else {
        container.classList.add('hidden');
      }
    });
  }

  if (btnCancelNew && container) {
    btnCancelNew.addEventListener('click', () => {
      container.classList.add('hidden');
    });
  }

  if (btnSaveNew && inputName) {
    btnSaveNew.addEventListener('click', () => {
      const name = inputName.value.trim();
      if (!name) {
        if (window.showToast) window.showToast('Informe o nome da celebração.');
        return;
      }

      if (window.appStore) {
        window.appStore.addCelebration(name);
        renderCelebrationSelect(name);
      }

      if (container) container.classList.add('hidden');
      inputName.value = '';

      if (window.showToast) {
        window.showToast(`Celebração "${name}" cadastrada com sucesso!`);
      }
    });
  }
}

/**
 * Renderiza o badge do mês e atualiza controles de data
 */
function renderRosterDateChips() {
  const monthBadge = document.getElementById('roster-month-badge');
  const parts = selectedRosterDate.split('-');
  const year = parseInt(parts[0], 10) || 2025;
  const month = parseInt(parts[1], 10) || 10;

  if (monthBadge) {
    monthBadge.innerHTML = `
      <span class="material-symbols-outlined text-[14px]">event</span>
      ${ROSTER_MONTH_NAMES[month - 1]} ${year}
    `;
  }

  const container = document.getElementById('roster-date-chips');
  if (!container) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  let chipsHtml = '';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = WEEKDAY_NAMES_SHORT[dateObj.getDay()];
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isSelected = dateStr === selectedRosterDate;

    // Verificar se já possui escala cadastrada no Store
    const hasScale = window.appStore ? window.appStore.getScalesForMonth(year, month).some((s) => s.day === d) : false;

    let tagLabel = 'Semanal';
    if (isSunday) tagLabel = 'Domingo';
    else if (isSaturday) tagLabel = 'Sábado';
    else if (hasScale) tagLabel = 'Escala';

    const baseClass = isSelected
      ? 'date-chip active-date flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-primary text-on-primary shadow-sm transition-all focus:outline-none flex-shrink-0 cursor-pointer'
      : hasScale
        ? 'date-chip flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-primary-fixed/30 text-on-surface hover:bg-primary-fixed/50 transition-all focus:outline-none flex-shrink-0 cursor-pointer border border-primary/20'
        : isSunday
          ? 'date-chip flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface font-semibold hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer'
          : 'date-chip flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer';

    chipsHtml += `
      <button class="${baseClass}" data-date="${dateStr}" id="chip-date-${dateStr}" type="button">
        <span class="font-label-sm text-[11px] ${isSelected ? 'text-primary-fixed font-bold' : isSunday ? 'text-primary font-bold' : ''}">${dayOfWeek}</span>
        <span class="font-title-md text-title-md mt-0.5 ${isSelected ? 'font-bold' : ''}">${String(d).padStart(2, '0')}</span>
        <span class="font-label-sm text-[10px] ${isSelected ? 'text-primary-fixed' : hasScale ? 'text-primary font-semibold' : 'opacity-70'}">${tagLabel}</span>
      </button>
    `;
  }

  container.innerHTML = chipsHtml;

  // Adicionar ouvintes de clique aos chips
  container.querySelectorAll('.date-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const date = chip.getAttribute('data-date');
      if (date) {
        setSelectedRosterDate(date);
      }
    });
  });

  // Auto-scroll para o dia selecionado
  setTimeout(() => {
    const activeChip = document.getElementById(`chip-date-${selectedRosterDate}`);
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 100);
}

/**
 * Atualiza a data selecionada globalmente no componente
 */
function setSelectedRosterDate(dateStr) {
  selectedRosterDate = dateStr;

  const datePicker = document.getElementById('roster-date-picker');
  if (datePicker && datePicker.value !== dateStr) {
    datePicker.value = dateStr;
  }

  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10) || 2025;
  const month = parseInt(parts[1], 10) || 10;
  const monthBadge = document.getElementById('roster-month-badge');
  if (monthBadge) {
    monthBadge.innerHTML = `
      <span class="material-symbols-outlined text-[14px]">event</span>
      ${ROSTER_MONTH_NAMES[month - 1]} ${year}
    `;
  }

  const container = document.getElementById('roster-date-chips');
  if (container) {
    const currentChipMonth = container.querySelector('.date-chip')?.getAttribute('data-date')?.split('-')[1];
    if (currentChipMonth && parseInt(currentChipMonth, 10) !== month) {
      renderRosterDateChips();
    } else {
      container.querySelectorAll('.date-chip').forEach((c) => {
        const chipDate = c.getAttribute('data-date');
        const isSelected = chipDate === dateStr;
        const isSunday = c.querySelector('span:first-child')?.textContent === 'DOM';

        if (isSelected) {
          c.className = 'date-chip active-date flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-primary text-on-primary shadow-sm transition-all focus:outline-none flex-shrink-0 cursor-pointer';
          const sub = c.querySelector('span:last-child');
          if (sub) sub.className = 'font-label-sm text-[10px] text-primary-fixed';
          const top = c.querySelector('span:first-child');
          if (top) top.className = 'font-label-sm text-[11px] text-primary-fixed font-bold';
        } else {
          c.className = isSunday
            ? 'date-chip flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface font-semibold hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer'
            : 'date-chip flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer';
          const sub = c.querySelector('span:last-child');
          if (sub) sub.className = 'font-label-sm text-[10px] opacity-70';
          const top = c.querySelector('span:first-child');
          if (top) top.className = `font-label-sm text-[11px] ${isSunday ? 'text-primary font-bold' : ''}`;
        }
      });
    }
  }

  loadExistingScaleForSelectedDate();
}

/**
 * Inicializa a seleção suspensa de horário da missa
 */
function initRosterHourSelect() {
  const hourSelect = document.getElementById('roster-hour-select');
  if (hourSelect) {
    hourSelect.value = selectedRosterHour;
    hourSelect.addEventListener('change', (e) => {
      selectedRosterHour = e.target.value || '10:00';
      loadExistingScaleForSelectedDate();
    });
  }
}

/**
 * Carrega a escala existente para a data e hora selecionadas ou prepara uma nova
 */
function loadExistingScaleForSelectedDate() {
  if (!window.appStore) return;

  const existingScale = window.appStore.getScaleByDateAndHour(selectedRosterDate, selectedRosterHour);

  if (existingScale) {
    assignedMinisters = [...(existingScale.ministers || [])];
    renderCelebrationSelect(existingScale.celebrationName || 'Santa Missa Dominical');
  } else {
    // Sugestão de celebração com base no dia da semana
    const dateParts = selectedRosterDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    const dt = new Date(year, month - 1, day);
    const dayOfWeek = dt.getDay();

    let defaultCelebration = 'Santa Missa Dominical';
    if (dayOfWeek === 0) defaultCelebration = 'Santa Missa Dominical';
    else if (dayOfWeek === 6) defaultCelebration = 'Missa Vespertina de Sábado';
    else if (dayOfWeek === 5) defaultCelebration = 'Missa da Primeira Sexta-feira (Sagrado Coração)';
    else defaultCelebration = 'Santa Missa Semanal';

    renderCelebrationSelect(defaultCelebration);

    // Inicializar escala limpa pronta para adição ou sugestão de ministros disponíveis
    const activeMembers = window.appStore.getMembers().filter((m) => m.status === 'ativo');
    assignedMinisters = activeMembers.slice(0, 3).map((m, idx) => ({
      id: m.id,
      name: m.name,
      role: idx === 0 ? 'Coordenação' : idx === 1 ? 'Cálice 1' : 'Altar',
      isLeader: idx === 0,
      confirmed: true,
      phone: m.phone || '',
      avatar: m.avatar || null
    }));
  }

  renderAssignedMinisters();
  renderCandidateMinisters();
}

/**
 * Renderiza a lista de ministros já escalados no Passo 3
 */
function renderAssignedMinisters() {
  const container = document.getElementById('escalados-list');
  const counterBadge = document.getElementById('slot-counter');

  if (counterBadge) {
    counterBadge.textContent = `${assignedMinisters.length} de ${MAX_SLOTS} Vagas Preenchidas`;
    if (assignedMinisters.length >= MAX_SLOTS) {
      counterBadge.className = 'font-label-sm text-label-sm bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold';
    } else {
      counterBadge.className = 'font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-bold';
    }
  }

  if (!container) return;

  if (assignedMinisters.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center bg-surface-container-low rounded-lg text-on-surface-variant font-body-sm text-body-sm">
        Nenhum ministro escalado ainda. Adicione ministros pela lista abaixo.
      </div>
    `;
    return;
  }

  container.innerHTML = assignedMinisters.map((minister, idx) => {
    const initials = minister.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
    const roleTagClass = idx === 0 ? 'bg-primary-fixed text-on-primary-fixed' : idx <= 2 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant';

    return `
      <div class="minister-assigned flex items-center justify-between p-spacing-xs rounded-lg bg-surface-container-low animate-fade-in" data-id="${minister.id}">
        <div class="flex items-center gap-spacing-xs min-w-0">
          ${
            minister.avatar
              ? `<img class="w-10 h-10 rounded-full object-cover flex-shrink-0" src="${minister.avatar}" alt="${minister.name}">`
              : `<div class="w-10 h-10 rounded-full bg-surface-container-high text-primary font-title-md text-title-md flex items-center justify-center flex-shrink-0 font-bold">${initials}</div>`
          }
          <div class="min-w-0">
            <h4 class="font-label-lg text-label-lg text-on-surface truncate">${minister.name}</h4>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="font-label-sm text-label-sm ${roleTagClass} px-1.5 py-0.5 rounded font-medium">${minister.role || 'Ministro'}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant text-[11px]">${idx + 1}ª atribuição</span>
            </div>
          </div>
        </div>
        <button type="button" class="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" onclick="removeAssignedMinister('${minister.id}')" aria-label="Remover ${minister.name}">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Remove ministro da escala ativa
 */
window.removeAssignedMinister = function(id) {
  assignedMinisters = assignedMinisters.filter((m) => m.id !== id);
  renderAssignedMinisters();
  renderCandidateMinisters();
  if (window.showToast) window.showToast('Ministro desmarcado da escala.');
};

/**
 * Adiciona ministro candidato à escala
 */
window.assignCandidateMinister = function(id) {
  if (assignedMinisters.length >= MAX_SLOTS) {
    if (window.showToast) window.showToast(`Limite máximo de ${MAX_SLOTS} ministros atingido!`);
    return;
  }

  const member = window.appStore ? window.appStore.getMemberById(id) : null;
  if (!member) return;

  const defaultRoles = ['Coordenação', 'Cálice 1', 'Cálice 2', 'Nave Central', 'Nave Lateral', 'Enfermos & Apoio'];
  const assignedRole = defaultRoles[assignedMinisters.length] || 'Nave';

  assignedMinisters.push({
    id: member.id,
    name: member.name,
    role: assignedRole,
    isLeader: assignedMinisters.length === 0,
    confirmed: true,
    phone: member.phone || '',
    avatar: member.avatar || null
  });

  renderAssignedMinisters();
  renderCandidateMinisters();
  if (window.showToast) window.showToast(`${member.name} escalado(a) com sucesso!`);
};

/**
 * Renderiza a lista de candidatos disponíveis para escala
 */
function renderCandidateMinisters(searchTerm = '') {
  const container = document.getElementById('candidate-ministers-list');
  const baseCountEl = document.getElementById('active-base-count');
  if (!container || !window.appStore) return;

  const allMembers = window.appStore.getMembers().filter((m) => m.status !== 'licenca');
  const assignedIds = new Set(assignedMinisters.map((m) => m.id));

  if (baseCountEl) {
    baseCountEl.textContent = `Base Ativa (${allMembers.length})`;
  }

  const available = allMembers.filter((m) => {
    if (assignedIds.has(m.id)) return false;
    if (searchTerm) {
      return m.name.toLowerCase().includes(searchTerm) || (m.phone && m.phone.toLowerCase().includes(searchTerm));
    }
    return true;
  });

  if (available.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center bg-surface-container-lowest rounded-lg text-on-surface-variant font-body-sm text-body-sm">
        Nenhum outro ministro disponível no momento.
      </div>
    `;
    return;
  }

  container.innerHTML = available.map((member) => {
    const initials = member.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
    const scalesCount = member.scalesThisMonth || 0;
    const isOverloaded = scalesCount >= 3;

    return `
      <div class="candidate-row flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest ${isOverloaded ? 'opacity-85' : ''}">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full ${isOverloaded ? 'bg-surface-container-high text-on-surface-variant' : 'bg-tertiary-fixed text-on-tertiary-fixed'} font-label-md text-label-md flex items-center justify-center flex-shrink-0 font-bold">
            ${initials}
          </div>
          <div class="min-w-0">
            <div class="font-label-md text-label-md text-on-surface truncate">${member.name}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              ${
                isOverloaded
                  ? `<span class="font-label-sm text-[10px] text-on-secondary-container bg-secondary-container px-1.5 py-0.2 rounded font-semibold">${scalesCount} escalas no mês</span>
                     <span class="font-body-sm text-[11px] text-on-surface-variant truncate">Atenção equilíbrio</span>`
                  : `<span class="font-label-sm text-[10px] text-tertiary-container bg-tertiary-fixed px-1.5 py-0.2 rounded font-semibold">Disponível</span>
                     <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${scalesCount} escala(s)</span>`
              }
            </div>
          </div>
        </div>
        <button type="button" class="add-minister-btn px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1 flex-shrink-0 active:scale-95" onclick="assignCandidateMinister('${member.id}')">
          <span class="material-symbols-outlined text-[16px]">add</span>
          Escalar
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Salva a escala atual no Store
 */
function saveCurrentRoster(notifyWhatsApp = false) {
  if (assignedMinisters.length === 0) {
    if (window.showToast) window.showToast('Adicione pelo menos um ministro à celebração antes de salvar.');
    return;
  }

  const celebrationSelect = document.getElementById('celebration-select');
  const celebrationName = celebrationSelect ? (celebrationSelect.value || celebrationSelect.options[celebrationSelect.selectedIndex]?.text) : 'Santa Missa';

  const celebranteSelect = document.getElementById('celebrante');
  const celebranteText = celebranteSelect ? celebranteSelect.options[celebranteSelect.selectedIndex].text : 'Pe. Marcelo Rossi (Pároco)';

  const dateParts = selectedRosterDate.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const dt = new Date(year, month - 1, day);
  const dayOfWeek = WEEKDAY_NAMES_SHORT[dt.getDay()];
  const dayOfWeekFullName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dt.getDay()];
  const formattedDateDDMMAAAA = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  const scaleData = {
    id: `scale-${selectedRosterDate}-${selectedRosterHour.replace(':', '')}`,
    year,
    month,
    day,
    dayOfWeek,
    dateString: selectedRosterDate,
    title: `${dayOfWeekFullName}, ${formattedDateDDMMAAAA}`,
    time: selectedRosterHour,
    celebrationName,
    celebrant: celebranteText,
    isSolemnity: celebrationName.toLowerCase().includes('solenidade') || celebrationName.toLowerCase().includes('padroeira'),
    maxSlots: MAX_SLOTS,
    ministers: assignedMinisters
  };

  if (window.appStore) {
    window.appStore.saveScale(scaleData);
  }

  if (notifyWhatsApp && window.copyScaleReminder) {
    window.copyScaleReminder(scaleData);
  } else {
    if (window.showToast) window.showToast(`Escala da "${celebrationName}" salva com sucesso!`);
  }
}

window.addEventListener('DOMContentLoaded', initRosterComponent);
