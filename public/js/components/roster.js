/**
 * Componente: Montar e Gerir Escala (Assistente em 3 Passos)
 * Permite selecionar qualquer dia do calendário (Segunda a Domingo)
 * Passo 2: Escolha da celebração, subtítulo opcional e celebrante principal
 * Passo 3: Adição de ministros para a equipe
 */

const _nowRoster = new Date();
let selectedRosterDate = `${_nowRoster.getFullYear()}-${String(_nowRoster.getMonth() + 1).padStart(2, '0')}-${String(_nowRoster.getDate()).padStart(2, '0')}`;
let selectedRosterHour = '';
let assignedMinisters = [];

const ROSTER_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

let currentEditingScaleId = null;
let originalEditingDate = null;
let originalEditingHour = null;

function initRosterComponent() {
  const datePicker = document.getElementById('roster-date-picker');
  const searchInput = document.getElementById('minister-search');
  const btnSave = document.getElementById('btn-save-roster');
  const btnSaveNotify = document.getElementById('btn-save-notify');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnCancelEdit = document.getElementById('btn-cancel-roster-edit');
  const btnDeleteScale = document.getElementById('btn-delete-roster-scale');

  // 1. Sincronização com Seletor Nativo de Data
  if (datePicker) {
    datePicker.value = selectedRosterDate;
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        handleRosterDateTimeChange(e.target.value, selectedRosterHour);
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

  // 7. Cancelar Edição / Modo Nova Escala
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      resetRosterToNew();
    });
  }

  // 8. Excluir Escala Cadastrada
  if (btnDeleteScale) {
    btnDeleteScale.addEventListener('click', async () => {
      await deleteCurrentRosterScale();
    });
  }

  // 9. Exportar PDF
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
        renderRosterDayScalesChips();
        renderCelebrantSelect();
        renderCandidateMinisters();
      } else if (event === 'celebrations') {
        renderCelebrationSelect();
      }
    });
  }

  window.addEventListener('routeChanged', async (e) => {
    if (e.detail && e.detail.path === 'montar-escala') {
      if (!currentEditingScaleId) {
        selectedRosterHour = '';
      }
      const hourSelect = document.getElementById('roster-hour-select');
      if (hourSelect) hourSelect.value = selectedRosterHour || '';

      const datePicker = document.getElementById('roster-date-picker');
      if (datePicker && selectedRosterDate) datePicker.value = selectedRosterDate;

      if (window.appStore) {
        await Promise.allSettled([
          window.appStore.fetchMembers(),
          window.appStore.fetchCelebrations()
        ]);
      }

      setSelectedRosterDate(selectedRosterDate);
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
function renderCelebrationSelect(selectedCelebrationIdOrName = '') {
  const selectEl = document.getElementById('celebration-select');
  if (!selectEl || !window.appStore) return;

  const celebrations = window.appStore.getCelebrationObjects();
  const currentVal = selectedCelebrationIdOrName || selectEl.value;

  selectEl.innerHTML = celebrations.map((c) => {
    const isSelected = String(c.id) === String(currentVal) || 
      c.name === currentVal || 
      (selectedCelebrationIdOrName && c.name.toLowerCase().includes(String(selectedCelebrationIdOrName).toLowerCase()));
    return `<option value="${c.id}" data-name="${c.name}" ${isSelected ? 'selected' : ''}>${c.name}</option>`;
  }).join('');
}

/**
 * Renderiza o <select> de Celebrante Principal dinamicamente com IDs numéricos,
 * disponibilizando tanto padres quanto ministros que estiverem ativos.
 */
function renderCelebrantSelect(selectedCelebrantValue = '') {
  const celebranteSelect = document.getElementById('celebrante');
  if (!celebranteSelect || !window.appStore) return;

  const allMembers = window.appStore.getMembers() || [];
  const isSelectedEmpty = !selectedCelebrantValue;

  const isCelebrantProfile = (m) => {
    const p = (m.profile || '').toLowerCase();
    const n = m.name || '';
    return ['padre', 'celebrante', 'celebrant', 'diacono', 'deacon'].includes(p) ||
      n.startsWith('Pe.') || n.startsWith('Padre') || n.startsWith('Dom ') || n.startsWith('Diác.');
  };

  const isSelectedMatch = (m) => Boolean(selectedCelebrantValue) && (
    String(m.id) === String(selectedCelebrantValue) || 
    m.name === selectedCelebrantValue || 
    (m.name && m.name.toLowerCase() === String(selectedCelebrantValue).toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(String(selectedCelebrantValue).toLowerCase()))
  );

  // Filtrar apenas membros ativos (ou que já estejam selecionados na escala)
  const activeMembers = allMembers.filter((m) => {
    const isActive = (m.status || 'ativo') === 'ativo' && m.status !== 'licenca' && m.status !== 'inativo';
    return isActive || isSelectedMatch(m);
  });

  const celebrantsList = activeMembers.filter(isCelebrantProfile);
  const ministersList = activeMembers.filter((m) => !isCelebrantProfile(m));

  // Ordenar alfabeticamente
  celebrantsList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  ministersList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  const renderOption = (c) => {
    const isSelected = isSelectedMatch(c);
    return `<option value="${c.id}" data-name="${c.name}" ${isSelected ? 'selected' : ''}>${c.name}</option>`;
  };

  let groupsHtml = '';

  if (celebrantsList.length > 0 && ministersList.length > 0) {
    groupsHtml = `
      <optgroup label="Padres / Celebrantes">
        ${celebrantsList.map(renderOption).join('')}
      </optgroup>
      <optgroup label="Ministros (MESC)">
        ${ministersList.map(renderOption).join('')}
      </optgroup>
    `;
  } else if (celebrantsList.length > 0) {
    groupsHtml = celebrantsList.map(renderOption).join('');
  } else if (ministersList.length > 0) {
    groupsHtml = ministersList.map(renderOption).join('');
  } else if (allMembers.length > 0) {
    groupsHtml = allMembers.map(renderOption).join('');
  }

  celebranteSelect.innerHTML = `
    <option value="" ${isSelectedEmpty ? 'selected' : ''}>Selecione o celebrante (opcional)...</option>
    ${groupsHtml}
  `;
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
        if (window.showToast) window.showToast('Por favor, digite o nome da celebração.', 'warning');
        return;
      }

      if (window.appStore) {
        let icon = 'church';
        if (category === 'semanal') icon = 'wb_sunny';
        else if (category === 'solenidade') icon = 'star';
        else if (category === 'sacramento') icon = 'water_drop';
        else if (category === 'especial') icon = 'favorite';

        const created = await window.appStore.addCelebration({ name, category, icon });
        const createdIdOrName = (created && (created.id || created.name)) || name;
        renderCelebrationSelect(createdIdOrName);
        closeModal();
        if (window.showToast) window.showToast(`Celebração "${name}" cadastrada com sucesso!`, 'success');
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
        handleRosterDateTimeChange(date, selectedRosterHour);
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
  const month = parseInt(parts[1], 10);

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

      const activeChip = document.getElementById(`chip-date-${dateStr}`);
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  renderRosterDayScalesChips();
}

/**
 * Renderiza os chips de celebrações cadastradas no dia selecionado
 */
function renderRosterDayScalesChips() {
  const container = document.getElementById('roster-day-scales-container');
  const chipsContainer = document.getElementById('roster-day-scales-chips');
  if (!container || !chipsContainer || !window.appStore) return;

  const dayScales = window.appStore.getScalesForDay(selectedRosterDate) || [];
  if (dayScales.length === 0) {
    container.classList.add('hidden');
    chipsContainer.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');

  const chipsHtml = dayScales.map(scale => {
    const isCurrentlyEditing = currentEditingScaleId && String(currentEditingScaleId) === String(scale.id);
    if (isCurrentlyEditing) {
      return `
        <button type="button" class="px-3.5 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-md text-xs font-bold shadow-xs flex items-center gap-1.5 ring-2 ring-secondary/50 cursor-default">
          <span class="material-symbols-outlined text-[15px]">edit</span>
          <span>${scale.time}h • ${scale.celebrationName || 'Santa Missa'} (Editando)</span>
        </button>
      `;
    }
    return `
      <button type="button" class="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border border-outline-variant/30 cursor-pointer" onclick="window.setRosterEditingScale('${selectedRosterDate}', '${scale.time}', '${scale.id}')">
        <span class="material-symbols-outlined text-[15px] text-primary">schedule</span>
        <span>${scale.time}h • ${scale.celebrationName || 'Santa Missa'}</span>
      </button>
    `;
  });

  const isCreateMode = !currentEditingScaleId;
  const newScaleChip = `
    <button type="button" class="px-3.5 py-1.5 rounded-xl ${isCreateMode ? 'bg-primary text-on-primary font-bold shadow-xs' : 'bg-surface-container-low hover:bg-surface-container text-primary font-semibold border border-primary/30'} font-label-md text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer" onclick="window.resetRosterToNew()">
      <span class="material-symbols-outlined text-[15px]">add_circle</span>
      <span>+ Nova Escala neste dia</span>
    </button>
  `;

  chipsContainer.innerHTML = [...chipsHtml, newScaleChip].join('');
}

/**
 * Atualiza os elementos visuais do cabeçalho de modo (Cadastro vs Edição)
 */
function updateRosterModeUI(existingScale = null) {
  const header = document.getElementById('roster-mode-header');
  const iconContainer = document.getElementById('roster-mode-icon-container');
  const icon = document.getElementById('roster-mode-icon');
  const badge = document.getElementById('roster-mode-badge');
  const badgeText = document.getElementById('roster-mode-badge-text');
  const eventIdEl = document.getElementById('roster-edit-event-id');
  const title = document.getElementById('roster-mode-title');
  const desc = document.getElementById('roster-mode-desc');
  const btnCancelEdit = document.getElementById('btn-cancel-roster-edit');
  const btnSaveText = document.getElementById('btn-save-roster-text');
  const btnSaveIcon = document.getElementById('btn-save-roster-icon');
  const btnSaveNotifyText = document.getElementById('btn-save-notify-text');
  const btnDeleteScale = document.getElementById('btn-delete-roster-scale');

  const parts = selectedRosterDate.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  if (existingScale) {
    if (header) {
      header.className = 'rounded-2xl p-5 sm:p-6 border transition-all duration-200 shadow-sm bg-secondary-container/10 border-secondary/40';
    }
    if (iconContainer) {
      iconContainer.className = 'w-11 h-11 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5';
    }
    if (icon) icon.textContent = 'edit_calendar';
    if (badge) {
      badge.className = 'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30';
    }
    if (badgeText) badgeText.textContent = 'Modo de Edição';
    if (eventIdEl) {
      eventIdEl.classList.remove('hidden');
      eventIdEl.textContent = existingScale.id ? `#${existingScale.id}` : '';
    }
    if (title) title.textContent = 'Editar Escala Existente';
    if (desc) {
      desc.textContent = `Alterando: ${existingScale.celebrationName || 'Santa Missa'} — ${selectedRosterHour || existingScale.time}h (${formattedDate})`;
    }
    if (btnCancelEdit) {
      btnCancelEdit.classList.remove('hidden');
      btnCancelEdit.classList.add('flex');
    }
    if (btnSaveText) btnSaveText.textContent = 'Salvar Alterações';
    if (btnSaveIcon) btnSaveIcon.textContent = 'save';
    if (btnSaveNotifyText) btnSaveNotifyText.textContent = 'Salvar Alterações e Copiar Lembrete';
    if (btnDeleteScale) {
      btnDeleteScale.classList.remove('hidden');
      btnDeleteScale.classList.add('flex');
    }
  } else {
    if (header) {
      header.className = 'rounded-2xl p-5 sm:p-6 border transition-all duration-200 shadow-sm bg-surface-container-lowest border-outline-variant/30';
    }
    if (iconContainer) {
      iconContainer.className = 'w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5';
    }
    if (icon) icon.textContent = 'post_add';
    if (badge) {
      badge.className = 'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20';
    }
    if (badgeText) badgeText.textContent = 'Nova Escala';
    if (eventIdEl) eventIdEl.classList.add('hidden');
    if (title) title.textContent = 'Cadastrar Nova Escala';
    if (desc) {
      desc.textContent = `Selecione o horário e escalone os ministros para criar a escala de ${formattedDate}.`;
    }
    if (btnCancelEdit) {
      btnCancelEdit.classList.add('hidden');
      btnCancelEdit.classList.remove('flex');
    }
    if (btnSaveText) btnSaveText.textContent = 'Salvar Escala';
    if (btnSaveIcon) btnSaveIcon.textContent = 'check_circle';
    if (btnSaveNotifyText) btnSaveNotifyText.textContent = 'Salvar e Copiar Lembrete';
    if (btnDeleteScale) {
      btnDeleteScale.classList.add('hidden');
      btnDeleteScale.classList.remove('flex');
    }
  }
}

/**
 * Controla a exibição do Modal Dinâmico de Confirmação/Conflito/Decisão
 */
function openRosterConfirmModal({
  icon = 'info',
  iconColorClass = 'bg-primary/15 text-primary',
  badgeText = 'Aviso',
  badgeColorClass = 'bg-primary/10 text-primary border border-primary/20',
  title = '',
  message = '',
  details = null,
  submessage = 'O que você deseja fazer?',
  actions = []
}) {
  const modal = document.getElementById('roster-confirm-modal');
  const iconBox = document.getElementById('roster-confirm-icon-box');
  const iconEl = document.getElementById('roster-confirm-icon');
  const badgeEl = document.getElementById('roster-confirm-badge');
  const titleEl = document.getElementById('roster-confirm-title');
  const messageEl = document.getElementById('roster-confirm-message');
  const detailsBox = document.getElementById('roster-confirm-details-box');
  const detailCelebration = document.getElementById('roster-confirm-detail-celebration');
  const detailTime = document.getElementById('roster-confirm-detail-time');
  const detailMinisters = document.getElementById('roster-confirm-detail-ministers');
  const detailCelebrant = document.getElementById('roster-confirm-detail-celebrant');
  const submessageEl = document.getElementById('roster-confirm-submessage');
  const actionsEl = document.getElementById('roster-confirm-actions');

  if (!modal) return;

  if (iconBox) iconBox.className = `w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconColorClass}`;
  if (iconEl) iconEl.textContent = icon;
  if (badgeEl) {
    badgeEl.textContent = badgeText;
    badgeEl.className = `inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-0.5 ${badgeColorClass}`;
  }
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.innerHTML = message;

  if (details && detailsBox) {
    detailsBox.classList.remove('hidden');
    if (detailCelebration) detailCelebration.textContent = details.celebration || 'Santa Missa';
    if (detailTime) detailTime.textContent = `${details.time || ''}h`;
    if (detailMinisters) detailMinisters.textContent = `${details.ministersCount || 0} ministro(s)`;
    if (detailCelebrant) detailCelebrant.textContent = details.celebrant || 'Sem celebrante';
  } else if (detailsBox) {
    detailsBox.classList.add('hidden');
  }

  if (submessageEl) submessageEl.textContent = submessage;

  if (actionsEl) {
    actionsEl.innerHTML = '';
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      let btnClass = 'flex-1 h-11 px-3.5 rounded-xl font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer font-semibold ';
      if (action.primary) {
        btnClass += 'bg-primary text-on-primary shadow-sm hover:bg-primary-container';
      } else if (action.danger) {
        btnClass += 'bg-error-container/30 text-error hover:bg-error-container/60 border border-error/20';
      } else {
        btnClass += 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30';
      }
      btn.className = btnClass;
      btn.innerHTML = `
        ${action.icon ? `<span class="material-symbols-outlined text-[18px]">${action.icon}</span>` : ''}
        <span>${action.text}</span>
      `;
      btn.addEventListener('click', () => {
        closeRosterConfirmModal();
        if (action.onClick) action.onClick();
      });
      actionsEl.appendChild(btn);
    });
  }

  const closeBtn = document.getElementById('btn-close-roster-confirm-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closeRosterConfirmModal();
      const cancelAction = actions.find(a => a.isCancel);
      if (cancelAction && cancelAction.onClick) cancelAction.onClick();
    };
  }

  modal.classList.remove('hidden');
}

function closeRosterConfirmModal() {
  const modal = document.getElementById('roster-confirm-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Intercepta e valida alterações de Data e Horário com os devidos popups de confirmação/conflito
 */
function handleRosterDateTimeChange(targetDate, targetHour) {
  const newDate = targetDate || selectedRosterDate;
  const newHour = (targetHour !== undefined && targetHour !== null) ? targetHour : selectedRosterHour;

  if (!newHour) {
    selectedRosterDate = newDate;
    selectedRosterHour = '';
    const datePicker = document.getElementById('roster-date-picker');
    if (datePicker && datePicker.value !== newDate) datePicker.value = newDate;
    const hourSelect = document.getElementById('roster-hour-select');
    if (hourSelect && hourSelect.value !== '') hourSelect.value = '';
    setSelectedRosterDate(newDate);
    const currentScale = currentEditingScaleId && window.appStore?.scales?.find(s => String(s.id) === String(currentEditingScaleId));
    updateRosterModeUI(currentScale || null);
    renderRosterDayScalesChips();
    return;
  }

  const parts = newDate.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  const existingAtTarget = window.appStore ? window.appStore.getScaleByDateAndHour(newDate, newHour) : null;

  // CENÁRIO 1: Usuário está em Modo de Cadastro e selecionou data/hora com escala existente
  if (!currentEditingScaleId) {
    if (existingAtTarget) {
      openRosterConfirmModal({
        icon: 'event_repeat',
        iconColorClass: 'bg-primary/15 text-primary',
        badgeText: 'Aviso • Escala Existente',
        badgeColorClass: 'bg-primary/15 text-primary border border-primary/20',
        title: 'Escala Existente Encontrada',
        message: `Já existe uma escala cadastrada para o dia <strong>${formattedDate}</strong> às <strong>${newHour}h</strong> (${existingAtTarget.celebrationName || 'Santa Missa'}).`,
        details: {
          celebration: existingAtTarget.celebrationName || 'Santa Missa',
          time: existingAtTarget.time,
          ministersCount: (existingAtTarget.ministers || []).length,
          celebrant: existingAtTarget.celebrant
        },
        submessage: 'Deseja abrir esta celebração para edição?',
        actions: [
          {
            text: 'Sim, Editar Escala',
            icon: 'edit',
            primary: true,
            onClick: () => {
              window.setRosterEditingScale(newDate, newHour, existingAtTarget.id);
            }
          },
          {
            text: 'Cancelar',
            icon: 'close',
            secondary: true,
            isCancel: true,
            onClick: () => {
              selectedRosterHour = '';
              const hourSelect = document.getElementById('roster-hour-select');
              if (hourSelect) hourSelect.value = '';
              renderRosterDayScalesChips();
            }
          }
        ]
      });
      return;
    }

    // Sem escala existente: aplica normalmente
    selectedRosterDate = newDate;
    selectedRosterHour = newHour;
    const hourSelect = document.getElementById('roster-hour-select');
    if (hourSelect) hourSelect.value = newHour;
    setSelectedRosterDate(newDate);
    updateRosterModeUI(null);
    renderRosterDayScalesChips();
    return;
  }

  // Se estiver em MODO DE EDIÇÃO
  // Se for a mesma data e hora original da escala em edição, atualiza os dados sem disparar modal
  if (newDate === originalEditingDate && newHour === originalEditingHour) {
    selectedRosterDate = newDate;
    selectedRosterHour = newHour;
    const hourSelect = document.getElementById('roster-hour-select');
    if (hourSelect) hourSelect.value = newHour;
    setSelectedRosterDate(newDate);
    const currentScale = window.appStore?.scales?.find(s => String(s.id) === String(currentEditingScaleId));
    updateRosterModeUI(currentScale);
    renderRosterDayScalesChips();
    return;
  }

  // CENÁRIO 2: Editando e alterou para data/hora já ocupada por OUTRA escala (Conflito)
  if (existingAtTarget && String(existingAtTarget.id) !== String(currentEditingScaleId)) {
    openRosterConfirmModal({
      icon: 'event_busy',
      iconColorClass: 'bg-error-container/40 text-error',
      badgeText: 'Conflito de Horário',
      badgeColorClass: 'bg-error-container/30 text-error border border-error/30',
      title: 'Conflito de Horário',
      message: `Já existe outra escala cadastrada para o dia <strong>${formattedDate}</strong> às <strong>${newHour}h</strong> (${existingAtTarget.celebrationName || 'Santa Missa'}). Não é possível transferir a escala atual para este horário.`,
      details: {
        celebration: existingAtTarget.celebrationName || 'Santa Missa',
        time: existingAtTarget.time,
        ministersCount: (existingAtTarget.ministers || []).length,
        celebrant: existingAtTarget.celebrant
      },
      submessage: 'Por favor, selecione outro horário livre ou mantenha o horário original.',
      actions: [
        {
          text: 'Voltar ao Horário Anterior',
          icon: 'undo',
          primary: true,
          isCancel: true,
          onClick: () => {
            revertRosterDateTimeSelectors();
          }
        }
      ]
    });
    return;
  }

  // CENÁRIO 3: Editando e alterou para data/hora LIVRE (Pergunta se deseja alterar escala atual ou criar nova)
  openRosterConfirmModal({
    icon: 'schedule_send',
    iconColorClass: 'bg-secondary/15 text-secondary',
    badgeText: 'Alteração de Data/Horário',
    badgeColorClass: 'bg-secondary/20 text-secondary border border-secondary/30',
    title: 'Alterar Escala Existente',
    message: `Você selecionou a nova data/horário: <strong>${formattedDate} às ${newHour}h</strong>.`,
    submessage: 'Deseja alterar a data/hora da escala atual ou criar uma nova escala a partir destes dados?',
    actions: [
      {
        text: 'Alterar Data/Hora Atual',
        icon: 'update',
        primary: true,
        onClick: () => {
          selectedRosterDate = newDate;
          selectedRosterHour = newHour;
          originalEditingDate = newDate;
          originalEditingHour = newHour;
          const hourSelect = document.getElementById('roster-hour-select');
          if (hourSelect) hourSelect.value = newHour;
          const datePicker = document.getElementById('roster-date-picker');
          if (datePicker) datePicker.value = newDate;
          setSelectedRosterDate(newDate);
          const currentScale = window.appStore?.scales?.find(s => String(s.id) === String(currentEditingScaleId));
          updateRosterModeUI(currentScale);
          renderRosterDayScalesChips();
          if (window.showToast) window.showToast(`Data/horário alterados para ${formattedDate} às ${newHour}h. Clique em "Salvar Alterações" para confirmar.`, 'info');
        }
      },
      {
        text: 'Criar Nova Escala',
        icon: 'add_circle',
        secondary: true,
        onClick: () => {
          currentEditingScaleId = null;
          originalEditingDate = null;
          originalEditingHour = null;
          selectedRosterDate = newDate;
          selectedRosterHour = newHour;
          const hourSelect = document.getElementById('roster-hour-select');
          if (hourSelect) hourSelect.value = newHour;
          const datePicker = document.getElementById('roster-date-picker');
          if (datePicker) datePicker.value = newDate;
          setSelectedRosterDate(newDate);
          updateRosterModeUI(null);
          renderRosterDayScalesChips();
          if (window.showToast) window.showToast(`Modo de nova escala ativado para ${formattedDate} às ${newHour}h.`, 'info');
        }
      },
      {
        text: 'Cancelar',
        icon: 'close',
        secondary: true,
        isCancel: true,
        onClick: () => {
          revertRosterDateTimeSelectors();
        }
      }
    ]
  });
}

function revertRosterDateTimeSelectors() {
  const targetDate = originalEditingDate || selectedRosterDate;
  const targetHour = originalEditingHour || selectedRosterHour;

  selectedRosterDate = targetDate;
  selectedRosterHour = targetHour;

  const datePicker = document.getElementById('roster-date-picker');
  if (datePicker) datePicker.value = targetDate;

  const hourSelect = document.getElementById('roster-hour-select');
  if (hourSelect) hourSelect.value = targetHour;

  setSelectedRosterDate(targetDate);
  const currentScale = currentEditingScaleId && window.appStore?.scales?.find(s => String(s.id) === String(currentEditingScaleId));
  updateRosterModeUI(currentScale);
  renderRosterDayScalesChips();
}

/**
 * Inicializa a seleção suspensa de horário da missa
 */
function initRosterHourSelect() {
  const hourSelect = document.getElementById('roster-hour-select');
  if (hourSelect) {
    hourSelect.value = selectedRosterHour;
    hourSelect.addEventListener('change', (e) => {
      handleRosterDateTimeChange(selectedRosterDate, e.target.value);
    });
  }
}

/**
 * Carrega a escala existente para a data e hora selecionadas ou prepara uma nova
 */
function loadExistingScaleForSelectedDate() {
  if (!window.appStore) return;

  let existingScale = null;
  if (currentEditingScaleId && window.appStore.scales) {
    existingScale = window.appStore.scales.find(s => String(s.id) === String(currentEditingScaleId));
  }

  const subtitleInput = document.getElementById('roster-subtitle');

  if (existingScale) {
    currentEditingScaleId = existingScale.id;
    originalEditingDate = existingScale.dateString || selectedRosterDate;
    if (existingScale.time) {
      selectedRosterHour = existingScale.time.substring(0, 5);
      originalEditingHour = selectedRosterHour;
      const hourSelect = document.getElementById('roster-hour-select');
      if (hourSelect) hourSelect.value = selectedRosterHour;
    }
    assignedMinisters = (existingScale.ministers || []).map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone || '',
      avatar: m.avatar || null
    }));
    renderCelebrationSelect(existingScale.celebration_id || existingScale.celebrationId || existingScale.celebrationName || 'Santa Missa Dominical');
    renderCelebrantSelect(existingScale.celebrantId || existingScale.celebrant_id || existingScale.celebrant || '');
    if (subtitleInput) subtitleInput.value = existingScale.subtitle || '';

    updateRosterModeUI(existingScale);
  } else {
    currentEditingScaleId = null;
    originalEditingDate = null;
    originalEditingHour = null;

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

    updateRosterModeUI(null);
  }

  renderRosterDayScalesChips();
  renderAssignedMinisters();
  renderCandidateMinisters();
}

/**
 * Reseta o formulário para o modo de nova escala
 */
function resetRosterToNew() {
  currentEditingScaleId = null;
  originalEditingDate = null;
  originalEditingHour = null;
  selectedRosterHour = '';
  const hourSelect = document.getElementById('roster-hour-select');
  if (hourSelect) hourSelect.value = '';
  const subtitleInput = document.getElementById('roster-subtitle');
  if (subtitleInput) subtitleInput.value = '';

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
  assignedMinisters = [];

  updateRosterModeUI(null);
  renderRosterDayScalesChips();
  renderAssignedMinisters();
  renderCandidateMinisters();
  if (window.showToast) window.showToast('Modo de nova escala ativado.', 'info');
}
window.resetRosterToNew = resetRosterToNew;

/**
 * Exclui a escala em edição atual
 */
async function deleteCurrentRosterScale() {
  if (!currentEditingScaleId) return;

  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));
  if (!canManage) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem excluir escalas.', 'warning');
    return;
  }

  const confirmDelete = window.confirm('Tem certeza que deseja excluir esta celebração e sua escala de ministros?');
  if (!confirmDelete) return;

  const btnDelete = document.getElementById('btn-delete-roster-scale');
  try {
    if (btnDelete) {
      btnDelete.disabled = true;
      btnDelete.classList.add('opacity-75', 'cursor-not-allowed');
    }

    if (window.appStore) {
      await window.appStore.deleteScale(currentEditingScaleId);
    }
    if (window.showToast) window.showToast('Escala excluída com sucesso!', 'success');
    currentEditingScaleId = null;
    loadExistingScaleForSelectedDate();
  } catch (err) {
    console.error('Erro ao excluir escala:', err);
    if (window.showErrorToast) {
      window.showErrorToast(err, 'Erro ao excluir escala.');
    }
  } finally {
    if (btnDelete) {
      btnDelete.disabled = false;
      btnDelete.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }
}
window.deleteCurrentRosterScale = deleteCurrentRosterScale;

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

  const allMembers = window.appStore.getMembers().filter((m) => 
    m.status !== 'licenca' && 
    !['celebrante', 'celebrant', 'padre'].includes(m.profile)
  );
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
  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));
  if (!canManage) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem salvar escalas.', 'warning');
    return;
  }

  if (assignedMinisters.length === 0) {
    if (window.showToast) window.showToast('Adicione pelo menos um ministro à celebração antes de salvar.', 'warning');
    return;
  }

  const hourSelect = document.getElementById('roster-hour-select');
  const finalHour = (hourSelect ? hourSelect.value : selectedRosterHour) || '';
  if (!finalHour) {
    if (window.showToast) window.showToast('Por favor, selecione o horário da missa antes de salvar.', 'warning');
    if (hourSelect) {
      hourSelect.focus();
      hourSelect.classList.add('ring-2', 'ring-primary');
      setTimeout(() => hourSelect.classList.remove('ring-2', 'ring-primary'), 2000);
    }
    return;
  }
  selectedRosterHour = finalHour;

  const celebrationSelect = document.getElementById('celebration-select');
  const selectedOption = celebrationSelect ? celebrationSelect.options[celebrationSelect.selectedIndex] : null;
  const rawCelebrationId = selectedOption ? selectedOption.value : null;
  const celebrationName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text) : 'Santa Missa';

  if (!rawCelebrationId && !celebrationName) {
    if (window.showToast) window.showToast('Por favor, selecione uma celebração antes de salvar.', 'warning');
    return;
  }

  const parsedCelebrationId = rawCelebrationId && !String(rawCelebrationId).startsWith('cel-') && !isNaN(rawCelebrationId) 
    ? Number(rawCelebrationId) 
    : rawCelebrationId;

  const celebranteSelect = document.getElementById('celebrante');
  const selectedCelebrantOption = celebranteSelect && celebranteSelect.selectedIndex >= 0 ? celebranteSelect.options[celebranteSelect.selectedIndex] : null;
  const rawCelebrantId = selectedCelebrantOption ? selectedCelebrantOption.value : '';
  const hasCelebrant = Boolean(rawCelebrantId && !isNaN(rawCelebrantId) && Number(rawCelebrantId) > 0);
  const parsedCelebrantId = hasCelebrant ? Number(rawCelebrantId) : null;
  const celebrantName = hasCelebrant ? (selectedCelebrantOption.getAttribute('data-name') || selectedCelebrantOption.text) : null;

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

  const parsedMinistersIds = assignedMinisters
    .map(m => (typeof m === 'object' ? m.id : m))
    .map(id => Number(id))
    .filter(id => !isNaN(id) && id > 0);

  const isEditMode = Boolean(currentEditingScaleId && !String(currentEditingScaleId).startsWith('scale-'));
  const finalEventId = isEditMode ? Number(currentEditingScaleId) : `scale-${selectedRosterDate}-${selectedRosterHour.replace(':', '')}`;

  const scaleData = {
    id: finalEventId,
    year,
    month,
    day,
    dayOfWeek,
    dateString: selectedRosterDate,
    title: `${dayOfWeekFullName}, ${formattedDateDDMMAAAA}`,
    time: selectedRosterHour,
    celebration_id: Number(parsedCelebrationId),
    celebrationId: Number(parsedCelebrationId),
    celebrationName,
    subtitle: subtitle || null,
    celebrant: celebrantName,
    celebrant_id: parsedCelebrantId,
    celebrantId: parsedCelebrantId,
    ministers: assignedMinisters,
    minister_ids: parsedMinistersIds
  };

  const btnSave = document.getElementById('btn-save-roster');
  const btnSaveNotify = document.getElementById('btn-save-notify');
  const targetBtn = notifyWhatsApp ? btnSaveNotify : btnSave;
  const originalHtml = targetBtn ? targetBtn.innerHTML : '';

  try {
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }

    if (window.appStore) {
      await window.appStore.saveScale(scaleData);
    }

    if (notifyWhatsApp && window.copyScaleReminder) {
      window.copyScaleReminder(scaleData);
    } else {
      const successMsg = isEditMode
        ? `Escala da "${celebrationName}" atualizada com sucesso!`
        : `Escala da "${celebrationName}" salva com sucesso!`;
      if (window.showToast) window.showToast(successMsg, 'success');
    }

    loadExistingScaleForSelectedDate();
  } catch (err) {
    console.error('Erro ao salvar escala:', err);
    if (!window.appStore && window.showErrorToast) {
      window.showErrorToast(err, 'Erro ao salvar escala.');
    }
  } finally {
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      targetBtn.innerHTML = originalHtml;
    }
  }
}

// Iniciar edição de escala programaticamente (a partir de outros componentes)
window.setRosterEditingScale = function(dateString, time, scaleId) {
  if (dateString) {
    selectedRosterDate = dateString;
    originalEditingDate = dateString;
  }
  if (time) {
    selectedRosterHour = time.substring(0, 5);
    originalEditingHour = selectedRosterHour;
  }
  currentEditingScaleId = scaleId || null;

  const datePicker = document.getElementById('roster-date-picker');
  if (datePicker && dateString) datePicker.value = dateString;

  const hourSelect = document.getElementById('roster-hour-select');
  if (hourSelect && time) hourSelect.value = selectedRosterHour;

  setSelectedRosterDate(selectedRosterDate);
  loadExistingScaleForSelectedDate();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRosterComponent);
} else {
  initRosterComponent();
}
