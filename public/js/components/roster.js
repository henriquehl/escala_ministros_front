/**
 * Componente: Montar e Gerir Escala (Assistente em 3 Passos)
 * Permite selecionar qualquer dia do calendário (Segunda a Domingo)
 * Passo 2: Escolha da celebração, subtítulo opcional e celebrante principal
 * Passo 3: Adição de ministros para a equipe
 */

const _nowRoster = new Date();
let selectedRosterDate = `${_nowRoster.getFullYear()}-${String(_nowRoster.getMonth() + 1).padStart(2, '0')}-${String(_nowRoster.getDate()).padStart(2, '0')}`;
let selectedRosterHour = '10:00';
let assignedMinisters = [];

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
    btnSave.addEventListener('click', async () => {
      await saveCurrentRoster(false);
    });
  }

  // 6. Salvar e Notificar via WhatsApp
  if (btnSaveNotify) {
    btnSaveNotify.addEventListener('click', async () => {
      await saveCurrentRoster(true);
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
        renderCelebrantSelect();
        renderCandidateMinisters();
      } else if (event === 'celebrations') {
        renderCelebrationSelect();
      }
    });
  }

  window.addEventListener('routeChanged', async (e) => {
    if (e.detail && e.detail.path === 'montar-escala') {
      const hourSelect = document.getElementById('roster-hour-select');
      if (hourSelect) hourSelect.value = selectedRosterHour;

      if (window.appStore) {
        await Promise.allSettled([
          window.appStore.fetchMembers(),
          window.appStore.fetchCelebrations()
        ]);
      }

      renderRosterDateChips();
      renderCelebrationSelect();
      renderCelebrantSelect();
      loadExistingScaleForSelectedDate();
      renderCandidateMinisters();
    }
  });

  // Render inicial
  renderRosterDateChips();
  renderCelebrationSelect();
  renderCelebrantSelect();
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
 * Renderiza o <select> de Celebrante Principal dinamicamente
 */
function renderCelebrantSelect(selectedCelebrantValue = '') {
  const celebranteSelect = document.getElementById('celebrante');
  if (!celebranteSelect || !window.appStore) return;

  const celebrants = window.appStore.getCelebrants();
  const currentVal = selectedCelebrantValue || celebranteSelect.value;

  if (celebrants.length === 0) {
    celebranteSelect.innerHTML = `
      <option value="Pe. Marcelo Rossi (Pároco)">Pe. Marcelo Rossi (Pároco)</option>
      <option value="Pe. Antônio Vieira (Vigário)">Pe. Antônio Vieira (Vigário)</option>
      <option value="Diácono Francisco">Diácono Francisco</option>
    `;
    return;
  }

  celebranteSelect.innerHTML = celebrants.map((c) => {
    const isSelected = c.id === currentVal || c.name === currentVal || (selectedCelebrantValue && c.name.toLowerCase().includes(selectedCelebrantValue.toLowerCase()));
    return `<option value="${c.id || c.name}" ${isSelected ? 'selected' : ''}>${c.name}</option>`;
  }).join('');
}

/**
 * Inicializa os controles de cadastro de novo nome de celebração
 */
function initCelebrationControls() {
  const toggleBtn = document.getElementById('btn-toggle-new-celebration');
  const modal = document.getElementById('roster-celebration-modal');
  const inputName = document.getElementById('new-celebration-name');
  const inputCategory = document.getElementById('new-celebration-category');
  const btnSaveNew = document.getElementById('btn-save-new-celebration');
  const btnCancelNew = document.getElementById('btn-cancel-new-celebration');
  const btnCloseModal = document.getElementById('btn-close-roster-celebration-modal');

  const openModal = () => {
    if (modal) {
      modal.classList.remove('hidden');
      if (inputName) {
        inputName.value = '';
        setTimeout(() => inputName.focus(), 50);
      }
      if (inputCategory) inputCategory.value = 'dominical';
    }
  };

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', openModal);
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelNew) btnCancelNew.addEventListener('click', closeModal);

  if (btnSaveNew) {
    btnSaveNew.addEventListener('click', async () => {
      const name = inputName ? inputName.value.trim() : '';
      const category = inputCategory ? inputCategory.value : 'dominical';

      if (!name) {
        if (window.showToast) window.showToast('Por favor, digite o nome da celebração.');
        return;
      }

      if (window.appStore) {
        let icon = 'church';
        if (category === 'semanal') icon = 'wb_sunny';
        else if (category === 'solenidade') icon = 'star';
        else if (category === 'sacramento') icon = 'water_drop';
        else if (category === 'especial') icon = 'favorite';

        await window.appStore.addCelebration({ name, category, icon });
        renderCelebrationSelect(name);
        closeModal();
        if (window.showToast) window.showToast(`Celebração "${name}" cadastrada com sucesso!`);
      }
    });
  }
}

/**
 * Renderiza os chips de data do mês selecionado
 */
function renderRosterDateChips() {
  const container = document.getElementById('roster-date-chips');
  if (!container) return;

  const parts = selectedRosterDate.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);

  const daysInMonth = new Date(year, month, 0).getDate();
  const chips = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, month - 1, day);
    const dayOfWeekShort = WEEKDAY_NAMES_SHORT[dt.getDay()];
    const isSunday = dt.getDay() === 0;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = dateStr === selectedRosterDate;

    let chipClass = '';
    let textClass = '';
    let subTextClass = '';

    if (isSelected) {
      chipClass = 'active-date flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-primary text-on-primary shadow-sm transition-all focus:outline-none flex-shrink-0 cursor-pointer';
      textClass = 'font-label-sm text-[11px] text-primary-fixed font-bold';
      subTextClass = 'font-label-sm text-[10px] text-primary-fixed';
    } else if (isSunday) {
      chipClass = 'flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface font-semibold hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer';
      textClass = 'font-label-sm text-[11px] text-primary font-bold';
      subTextClass = 'font-label-sm text-[10px] opacity-70';
    } else {
      chipClass = 'flex flex-col items-center justify-center min-w-[64px] py-2.5 px-2 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all focus:outline-none flex-shrink-0 cursor-pointer';
      textClass = 'font-label-sm text-[11px]';
      subTextClass = 'font-label-sm text-[10px] opacity-70';
    }

    chips.push(`
      <button type="button" class="date-chip ${chipClass}" data-date="${dateStr}" id="chip-date-${dateStr}">
        <span class="${textClass}">${dayOfWeekShort}</span>
        <span class="font-title-md text-title-md font-bold leading-tight my-0.5">${day}</span>
        <span class="${subTextClass}">${ROSTER_MONTH_NAMES[month - 1].substring(0, 3)}</span>
      </button>
    `);
  }

  container.innerHTML = chips.join('');

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
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
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
  const subtitleInput = document.getElementById('roster-subtitle');

  if (existingScale) {
    assignedMinisters = (existingScale.ministers || []).map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone || '',
      avatar: m.avatar || null
    }));
    renderCelebrationSelect(existingScale.celebrationName || 'Santa Missa Dominical');
    renderCelebrantSelect(existingScale.celebrant || existingScale.celebrantId || '');
    if (subtitleInput) subtitleInput.value = existingScale.subtitle || '';
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
    renderCelebrantSelect();
    if (subtitleInput) subtitleInput.value = '';
    assignedMinisters = [];
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
    const count = assignedMinisters.length;
    counterBadge.textContent = `${count} Ministro${count === 1 ? '' : 's'} Escalado${count === 1 ? '' : 's'}`;
    counterBadge.className = 'font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 rounded-full font-bold';
  }

  if (!container) return;

  if (assignedMinisters.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center bg-surface-container-low rounded-xl text-on-surface-variant font-body-sm text-body-sm border border-outline-variant/15">
        Nenhum ministro escalado ainda. Adicione ministros pela lista abaixo.
      </div>
    `;
    return;
  }

  container.innerHTML = assignedMinisters.map((minister) => {
    const initials = window.getInitials ? window.getInitials(minister.name) : (minister.name || 'M').substring(0, 2).toUpperCase();
    const phoneDisplay = minister.phone ? `<span class="font-body-sm text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5"><span class="material-symbols-outlined text-[14px]">call</span>${minister.phone}</span>` : '';

    return `
      <div class="minister-assigned flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 animate-fade-in" data-id="${minister.id}">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-primary-fixed text-primary font-title-md text-title-md flex items-center justify-center flex-shrink-0 font-bold border border-primary/20">
            ${initials}
          </div>
          <div class="min-w-0">
            <h4 class="font-label-lg text-label-lg text-on-surface font-semibold truncate">${minister.name || 'Ministro'}</h4>
            ${phoneDisplay}
          </div>
        </div>
        <button type="button" class="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer" onclick="removeAssignedMinister('${minister.id}')" aria-label="Remover ${minister.name}">
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
  assignedMinisters = assignedMinisters.filter((m) => String(m.id) !== String(id));
  renderAssignedMinisters();
  renderCandidateMinisters();
  if (window.showToast) window.showToast('Ministro removido da equipe.');
};

/**
 * Adiciona ministro candidato à escala
 */
window.assignCandidateMinister = function(id) {
  const member = window.appStore ? window.appStore.getMemberById(id) : null;
  if (!member) return;

  if (assignedMinisters.some(m => String(m.id) === String(id))) {
    if (window.showToast) window.showToast(`${member.name} já está na escala.`);
    return;
  }

  assignedMinisters.push({
    id: member.id,
    name: member.name,
    phone: member.phone || '',
    avatar: member.avatar || null
  });

  renderAssignedMinisters();
  renderCandidateMinisters();
  if (window.showToast) window.showToast(`${member.name} adicionado(a) à equipe!`);
};

/**
 * Renderiza a lista de candidatos disponíveis para escala
 */
function renderCandidateMinisters(searchTerm = '') {
  const container = document.getElementById('candidate-ministers-list');
  const baseCountEl = document.getElementById('active-base-count');
  if (!container || !window.appStore) return;

  const allMembers = window.appStore.getMembers().filter((m) => m.status !== 'licenca' && m.profile !== 'celebrante');
  const assignedIds = new Set(assignedMinisters.map((m) => String(m.id)));

  if (baseCountEl) {
    baseCountEl.textContent = `Base Ativa (${allMembers.length})`;
  }

  const available = allMembers.filter((m) => {
    if (assignedIds.has(String(m.id))) return false;
    if (searchTerm) {
      return (m.name || '').toLowerCase().includes(searchTerm) || (m.phone && m.phone.toLowerCase().includes(searchTerm));
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
    const initials = window.getInitials ? window.getInitials(member.name) : (member.name || 'M').substring(0, 2).toUpperCase();

    return `
      <div class="candidate-row flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full bg-primary-fixed text-primary font-label-md text-label-md flex items-center justify-center flex-shrink-0 font-bold border border-primary/20">
            ${initials}
          </div>
          <div class="min-w-0">
            <div class="font-label-md text-label-md text-on-surface truncate font-medium">${member.name || 'Ministro'}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="font-label-sm text-[10px] text-tertiary-container bg-tertiary-fixed px-1.5 py-0.2 rounded font-semibold">Disponível</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant truncate">${member.phone || 'Sem telefone'}</span>
            </div>
          </div>
        </div>
        <button type="button" class="add-minister-btn px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1 flex-shrink-0 active:scale-95 cursor-pointer" onclick="assignCandidateMinister('${member.id}')">
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
async function saveCurrentRoster(notifyWhatsApp = false) {
  if (assignedMinisters.length === 0) {
    if (window.showToast) window.showToast('Adicione pelo menos um ministro à celebração antes de salvar.');
    return;
  }

  const celebrationSelect = document.getElementById('celebration-select');
  const celebrationName = celebrationSelect ? (celebrationSelect.value || celebrationSelect.options[celebrationSelect.selectedIndex]?.text) : 'Santa Missa';

  const celebranteSelect = document.getElementById('celebrante');
  const celebrantName = celebranteSelect ? celebranteSelect.options[celebranteSelect.selectedIndex]?.text : 'Pe. Marcelo Rossi (Pároco)';
  const celebrantId = celebranteSelect ? celebranteSelect.value : '';

  const subtitleInput = document.getElementById('roster-subtitle');
  const subtitle = subtitleInput ? subtitleInput.value.trim() : '';

  const dateParts = selectedRosterDate.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);
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
    subtitle: subtitle || undefined,
    celebrant: celebrantName,
    celebrantId: celebrantId || undefined,
    ministers: assignedMinisters
  };

  try {
    if (window.appStore) {
      await window.appStore.saveScale(scaleData);
    }

    if (notifyWhatsApp && window.copyScaleReminder) {
      window.copyScaleReminder(scaleData);
    } else {
      if (window.showToast) window.showToast(`Escala da "${celebrationName}" salva com sucesso!`);
    }
  } catch (err) {
    console.error('Erro ao salvar escala:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRosterComponent);
} else {
  initRosterComponent();
}
