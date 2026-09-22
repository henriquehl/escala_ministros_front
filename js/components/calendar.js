/**
 * Componente: Calendário de Missas e Escalas
 * Renderiza grade de dias, filtros de horário e card interativo de presenças
 */

const _today = new Date();
let currentYear = _today.getFullYear();
let currentMonth = _today.getMonth() + 1; // 1-12
let selectedDay = _today.getDate();
let activeTimeFilter = 'todos';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function initCalendarComponent() {
  const prevMonthBtn = document.getElementById('btn-prev-month');
  const nextMonthBtn = document.getElementById('btn-next-month');

  // Navegação de Mês
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', async () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      if (window.appStore) {
        await window.appStore.fetchScales(currentYear, currentMonth);
      }
      renderCalendar();
      renderSelectedDayCard();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', async () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      if (window.appStore) {
        await window.appStore.fetchScales(currentYear, currentMonth);
      }
      renderCalendar();
      renderSelectedDayCard();
    });
  }

  // Ação rápida do Header: Montar Escala com a data ativa do calendário
  const btnCalendarCreateRoster = document.getElementById('btn-calendar-create-roster');
  if (btnCalendarCreateRoster) {
    btnCalendarCreateRoster.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.openRosterWithSelectedCalendarDate) {
        window.openRosterWithSelectedCalendarDate();
      } else if (window.appRouter) {
        window.appRouter.navigate('montar-escala');
      }
    });
  }

  // Filtros de Horário
  const filterChips = document.querySelectorAll('#calendar-time-filters .filter-chip');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => {
        c.className = 'filter-chip px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md whitespace-nowrap active:scale-95 transition-all';
      });
      chip.className = 'filter-chip px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md whitespace-nowrap shadow-sm transition-all';

      activeTimeFilter = chip.getAttribute('data-horario') || 'todos';
      renderCalendar();
      renderSelectedDayCard();
    });
  });

  function updateCalendarAdminVisibility() {
    const user = window.appStore && window.appStore.currentUser;
    const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));

    const adminSection = document.getElementById('admin-management-section');
    if (adminSection) {
      adminSection.style.display = canManage ? 'block' : 'none';
    }

    const btnCalendarCreateRoster = document.getElementById('btn-calendar-create-roster');
    if (btnCalendarCreateRoster) {
      btnCalendarCreateRoster.style.display = canManage ? 'flex' : 'none';
    }
  }

  // Re-renderizar quando o Store for atualizado ou a rota for ativada
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'scales' || event === 'members' || event === 'user') {
        updateCalendarAdminVisibility();
        renderCalendar();
        renderSelectedDayCard();
      }
    });
  }

  window.addEventListener('routeChanged', async (e) => {
    if (e.detail && e.detail.path === 'calendario-missas') {
      updateCalendarAdminVisibility();
      if (window.appStore) {
        await window.appStore.fetchScales(currentYear, currentMonth);
      }
      renderCalendar();
      renderSelectedDayCard();
    }
  });

  // Render inicial
  updateCalendarAdminVisibility();
  if (window.appStore) {
    window.appStore.fetchScales(currentYear, currentMonth).then(() => {
      renderCalendar();
      renderSelectedDayCard();
    });
  } else {
    renderCalendar();
    renderSelectedDayCard();
  }
}

/**
 * Renderiza os dias na grade do calendário
 */
function renderCalendar() {
  const monthNameEl = document.getElementById('calendar-month-name');
  const yearBadgeEl = document.getElementById('calendar-year-badge');
  const gridEl = document.getElementById('calendarGrid');

  if (monthNameEl) monthNameEl.textContent = MONTH_NAMES[currentMonth - 1];
  if (yearBadgeEl) yearBadgeEl.textContent = currentYear;
  if (!gridEl) return;

  const monthScales = window.appStore ? window.appStore.getScalesForMonth(currentYear, currentMonth) : [];

  // Dias no mês atual e primeiro dia da semana
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

  let html = '';

  // 1. Dias do mês anterior
  for (let x = firstDayIndex; x > 0; x--) {
    const dayNum = prevMonthDays - x + 1;
    html += `<div class="h-12 sm:h-14 w-full rounded-2xl flex items-center justify-center text-outline/30 text-xs sm:text-sm select-none opacity-40">${dayNum}</div>`;
  }

  // 2. Dias do mês corrente
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayScales = monthScales.filter((s) => s.day === day || s.dateString === dateStr);
    const isSunday = (firstDayIndex + day - 1) % 7 === 0;

    // Filtrar por horário se selecionado
    const matchingScale = dayScales.find((s) => {
      if (activeTimeFilter === 'todos') return true;
      return s.time && s.time.startsWith(activeTimeFilter.substring(0, 2));
    });

    const isSelected = day === selectedDay;

    if (matchingScale) {
      if (isSelected) {
        html += `
          <button class="calendar-day-btn relative h-12 sm:h-14 w-full rounded-2xl bg-primary text-on-primary shadow-md flex flex-col items-center justify-center p-1 transition-all active:scale-95 ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest" data-day="${day}" data-date="${dateStr}" type="button">
            <span class="text-sm sm:text-base font-bold text-on-primary leading-none">${day}</span>
            <span class="w-1.5 h-1.5 rounded-full bg-on-primary mt-1 shadow-xs"></span>
          </button>
        `;
      } else {
        html += `
          <button class="calendar-day-btn relative h-12 sm:h-14 w-full rounded-2xl bg-surface-container-low/80 hover:bg-primary-fixed/40 border border-outline-variant/30 flex flex-col items-center justify-center p-1 transition-all group active:scale-95" data-day="${day}" data-date="${dateStr}" type="button">
            <span class="text-sm sm:text-base font-semibold ${isSunday ? 'text-primary' : 'text-on-surface'} group-hover:text-primary leading-none">${day}</span>
            <span class="w-1.5 h-1.5 rounded-full bg-primary mt-1 group-hover:scale-125 transition-transform"></span>
          </button>
        `;
      }
    } else {
      if (isSelected) {
        html += `
          <button class="calendar-day-btn relative h-12 sm:h-14 w-full rounded-2xl bg-primary text-on-primary shadow-md flex flex-col items-center justify-center p-1 transition-all active:scale-95" data-day="${day}" data-date="${dateStr}" type="button">
            <span class="text-sm sm:text-base font-bold text-on-primary leading-none">${day}</span>
          </button>
        `;
      } else {
        html += `
          <button class="calendar-day-btn relative h-12 sm:h-14 w-full rounded-2xl hover:bg-surface-container-low/70 flex flex-col items-center justify-center p-1 text-on-surface/80 transition-colors" data-day="${day}" data-date="${dateStr}" type="button">
            <span class="text-sm sm:text-base font-medium ${isSunday ? 'text-primary/70 font-semibold' : 'text-on-surface/75'} leading-none">${day}</span>
          </button>
        `;
      }
    }
  }

  // 3. Dias do próximo mês para completar grade
  const totalCells = firstDayIndex + daysInMonth;
  const nextMonthCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let n = 1; n <= nextMonthCells; n++) {
    html += `<div class="h-12 sm:h-14 w-full rounded-2xl flex items-center justify-center text-outline/30 text-xs sm:text-sm select-none opacity-40">${n}</div>`;
  }

  gridEl.innerHTML = html;

  // Vincular eventos de clique nos dias
  gridEl.querySelectorAll('.calendar-day-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const clickedDay = parseInt(btn.getAttribute('data-day'), 10);
      selectedDay = clickedDay;
      renderCalendar();
      renderSelectedDayCard();
    });
  });
}

/**
 * Renderiza o Card de Detalhes da Escala do Dia Selecionado
 */
function renderSelectedDayCard() {
  const titleEl = document.getElementById('selectedDateTitle');
  const massSubtitleEl = document.getElementById('selectedMassSubtitle');
  const countRatioEl = document.getElementById('selectedSlotRatio');
  const listEl = document.getElementById('ministersRosterList');

  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayScales = window.appStore ? window.appStore.getScalesForDay(dateStr, activeTimeFilter) : [];

  // Formatar data em português com padrão DD/MM/AAAA
  const dateObj = new Date(currentYear, currentMonth - 1, selectedDay);
  const dayOfWeekName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dateObj.getDay()];
  const dayPad = String(selectedDay).padStart(2, '0');
  const monthPad = String(currentMonth).padStart(2, '0');
  const formattedDateDDMMAAAA = `${dayPad}/${monthPad}/${currentYear}`;
  const formattedFullDate = `${dayOfWeekName}, ${formattedDateDDMMAAAA}`;

  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));

  if (titleEl) titleEl.textContent = formattedFullDate;

  if (dayScales.length === 0) {
    if (massSubtitleEl) massSubtitleEl.innerHTML = `<span class="material-symbols-outlined text-[16px] text-outline">event_busy</span> Nenhuma celebração escalada para este dia.`;
    if (countRatioEl) {
      countRatioEl.innerHTML = `<span class="material-symbols-outlined text-[15px] leading-none">person_off</span><span>Sem ministros escalados</span>`;
    }
    if (listEl) {
      const createBtnHtml = canManage ? `
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors active:scale-95 cursor-pointer" onclick="if(window.openRosterWithSelectedCalendarDate){window.openRosterWithSelectedCalendarDate('');}else if(window.startEditScale){window.startEditScale('${dateStr}', '');}else if(window.appRouter){window.appRouter.navigate('montar-escala');}">
          Montar Escala para este Dia
        </button>
      ` : '';

      listEl.innerHTML = `
        <div class="col-span-full text-center py-8 px-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/20">
          <span class="material-symbols-outlined text-4xl text-outline/60 mb-2">calendar_add_on</span>
          <p class="font-body-md text-body-md text-on-surface">Nenhum ministro escalado para este dia.</p>
          ${createBtnHtml}
        </div>
      `;
    }
    return;
  }

  // Se houver 1 única celebração
  if (dayScales.length === 1) {
    const scale = dayScales[0];
    const celebrantText = scale.celebrant ? ` - ${scale.celebrant}` : '';
    if (massSubtitleEl) {
      massSubtitleEl.innerHTML = `
        <span class="material-symbols-outlined text-[16px] text-secondary">schedule</span>
        <span>${scale.time}h - <strong>${scale.celebrationName || 'Santa Missa'}</strong>${celebrantText}</span>
      `;
    }

    const assignedCount = (scale.ministers || []).length;
    const editBtnHtml = canManage ? `
      <button type="button" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer" onclick="window.startEditScale('${scale.dateString}', '${scale.time}', '${scale.id || ''}')">
        <span class="material-symbols-outlined text-[14px]">edit</span>
        <span>Editar Escala</span>
      </button>
    ` : '';

    const deleteBtnHtml = canManage ? `
      <button type="button" class="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer" onclick="window.deleteScaleFromCalendar('${scale.id || ''}', '${(scale.celebrationName || 'Santa Missa').replace(/'/g, "\\'")}', '${scale.time}', '${scale.dateString}')" title="Excluir esta escala">
        <span class="material-symbols-outlined text-[14px]">delete</span>
        <span>Excluir</span>
      </button>
    ` : '';

    const copyBtnHtml = `
      <button type="button" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer" onclick="window.copyScaleReminderByEvent('${scale.dateString}', '${scale.time}', '${scale.id || ''}')" title="Copiar lembrete desta missa para WhatsApp">
        <span class="material-symbols-outlined text-[14px] text-primary">content_copy</span>
        <span>Copiar Lembrete</span>
      </button>
    `;

    if (countRatioEl) {
      countRatioEl.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] leading-none">group</span><span>${assignedCount} Ministro${assignedCount === 1 ? '' : 's'} Escalado${assignedCount === 1 ? '' : 's'}</span></span>
          ${copyBtnHtml}
          ${editBtnHtml}
          ${deleteBtnHtml}
        </div>
      `;
    }

    if (listEl) {
      if (assignedCount === 0) {
        listEl.innerHTML = `
          <div class="col-span-full text-center py-6 px-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/20">
            <p class="font-body-md text-body-md text-on-surface">Nenhum ministro vinculado a esta celebração.</p>
          </div>
        `;
      } else {
        listEl.innerHTML = scale.ministers.map((minister) => {
          const initials = window.getInitials ? window.getInitials(minister.name) : (minister.name || 'M').substring(0, 2).toUpperCase();
          return `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low/70 hover:bg-surface-container transition-all border border-outline-variant/20 shadow-xs">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 border border-primary/20">
                  ${initials}
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-bold text-on-surface truncate">${minister.name || 'Ministro'}</span>
                  </div>
                  <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1 mt-0.5 truncate">
                    <span class="material-symbols-outlined text-[13px]">church</span>
                    ${minister.phone || 'MESC'}
                  </span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
    return;
  }

  // Se houver MÚLTIPLAS celebrações no mesmo dia
  const totalMinisters = dayScales.reduce((sum, s) => sum + (s.ministers || []).length, 0);
  if (massSubtitleEl) {
    massSubtitleEl.innerHTML = `
      <span class="material-symbols-outlined text-[16px] text-secondary">schedule</span>
      <span>${dayScales.length} Celebrações neste dia: <strong>${dayScales.map(s => s.time + 'h').join(', ')}</strong></span>
    `;
  }

  if (countRatioEl) {
    const copyAllBtnHtml = `
      <button type="button" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer" onclick="window.copyScaleReminder()" title="Copiar lembrete de todas as celebrações deste dia para WhatsApp">
        <span class="material-symbols-outlined text-[14px] text-primary">content_copy</span>
        <span>Copiar Lembrete</span>
      </button>
    `;
    countRatioEl.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] leading-none">group</span><span>${totalMinisters} Ministro${totalMinisters === 1 ? '' : 's'} (${dayScales.length} Missas)</span></span>
        ${copyAllBtnHtml}
      </div>
    `;
  }

  if (listEl) {
    listEl.innerHTML = dayScales.map((scale) => {
      const celebrantText = scale.celebrant ? ` • ${scale.celebrant}` : '';
      const editBtnHtml = canManage ? `
        <button type="button" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer" onclick="window.startEditScale('${scale.dateString}', '${scale.time}', '${scale.id || ''}')">
          <span class="material-symbols-outlined text-[14px]">edit</span>
          <span>Editar</span>
        </button>
      ` : '';

      const deleteBtnHtml = canManage ? `
        <button type="button" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer" onclick="window.deleteScaleFromCalendar('${scale.id || ''}', '${(scale.celebrationName || 'Santa Missa').replace(/'/g, "\\'")}', '${scale.time}', '${scale.dateString}')" title="Excluir esta celebração (${scale.time}h)">
          <span class="material-symbols-outlined text-[14px]">delete</span>
          <span>Excluir</span>
        </button>
      ` : '';

      const copyBtnHtml = `
        <button type="button" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer" onclick="window.copyScaleReminderByEvent('${scale.dateString}', '${scale.time}', '${scale.id || ''}')" title="Copiar lembrete desta celebração para WhatsApp">
          <span class="material-symbols-outlined text-[14px] text-primary">content_copy</span>
          <span>Copiar Lembrete</span>
        </button>
      `;

      const ministersHtml = (scale.ministers && scale.ministers.length > 0)
        ? scale.ministers.map((m) => {
            const initials = window.getInitials ? window.getInitials(m.name) : (m.name || 'M').substring(0, 2).toUpperCase();
            return `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/15">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    ${initials}
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-on-surface truncate">${m.name || 'Ministro'}</div>
                    <div class="text-[11px] text-on-surface-variant truncate">${m.phone || 'MESC'}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')
        : `<p class="text-xs text-on-surface-variant italic col-span-full py-2">Nenhum ministro escalado para este horário.</p>`;

      return `
        <div class="col-span-full p-4 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20 mb-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-outline-variant/15 pb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-bold text-xs">${scale.time}h</span>
              <span class="text-sm font-bold text-on-surface">${scale.celebrationName || 'Santa Missa'}</span>
              <span class="text-xs text-on-surface-variant hidden sm:inline">${celebrantText}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-medium text-on-surface-variant">${(scale.ministers || []).length} escalados</span>
              ${copyBtnHtml}
              ${editBtnHtml}
              ${deleteBtnHtml}
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            ${ministersHtml}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Obter a escala ativa no momento selecionado
window.getSelectedScale = function() {
  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  return window.appStore ? window.appStore.getScaleByDateAndHour(dateStr, activeTimeFilter) : null;
};

// Obter data selecionada no calendário no formato AAAA-MM-DD
window.getSelectedCalendarDate = function() {
  return `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
};

// Obter escalas do dia selecionado
window.getSelectedDayScales = function() {
  const dateStr = window.getSelectedCalendarDate();
  return window.appStore ? window.appStore.getScalesForDay(dateStr, 'todos') : [];
};

// Obter mês e ano ativos no calendário
window.getCurrentCalendarMonthAndYear = function() {
  return { year: currentYear, month: currentMonth };
};

// Iniciar edição de escala a partir do calendário
window.startEditScale = function(dateString, time, scaleId) {
  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));
  if (!canManage) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem gerir escalas.', 'warning');
    return;
  }
  if (window.setRosterEditingScale) {
    window.setRosterEditingScale(dateString, time, scaleId);
  }
  if (window.appRouter) {
    window.appRouter.navigate('montar-escala');
  }
};

// Abrir tela de montagem de escala com a data ativa do calendário
window.openRosterWithSelectedCalendarDate = function(time, scaleId) {
  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));
  if (!canManage) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem gerir escalas.', 'warning');
    return;
  }
  const dateStr = window.getSelectedCalendarDate ? window.getSelectedCalendarDate() : `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const targetTime = time || '';
  const targetScaleId = scaleId || null;

  window.startEditScale(dateStr, targetTime, targetScaleId);
};

// Excluir escala a partir do calendário (Admin/Coordenador)
window.deleteScaleFromCalendar = async function(scaleId, celebrationName, time, dateString) {
  const user = window.appStore && window.appStore.currentUser;
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true));
  if (!canManage) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem excluir escalas.', 'warning');
    return;
  }

  let targetId = scaleId;
  if (!targetId && dateString && time && window.appStore) {
    const scales = window.appStore.getScalesForDay(dateString);
    const found = scales.find(s => s.time && s.time.startsWith(time.substring(0, 2)));
    if (found) targetId = found.id;
  }

  if (!targetId) {
    if (window.showToast) window.showToast('Identificador da escala não encontrado para exclusão.', 'warning');
    return;
  }

  const celebrationLabel = celebrationName ? `"${celebrationName}" (${time}h)` : `escala de ${time}h`;
  const confirmMsg = `Deseja realmente excluir a celebração ${celebrationLabel} e seus ministros escalados?`;

  if (!window.confirm(confirmMsg)) return;

  try {
    if (window.appStore) {
      await window.appStore.deleteScale(targetId);
    }
    if (window.showToast) window.showToast('Escala excluída com sucesso!', 'success');
  } catch (err) {
    console.error('Erro ao excluir escala pelo calendário:', err);
    if (window.showErrorToast) {
      window.showErrorToast(err, 'Erro ao excluir escala.');
    } else if (window.showToast) {
      window.showToast(err.message || 'Erro ao excluir escala.', 'error');
    }
  }
};

// Copiar lembrete de um evento específico
window.copyScaleReminderByEvent = function(dateString, time, scaleId) {
  if (!window.appStore) return;
  const dayScales = window.appStore.getScalesForDay(dateString) || [];

  let found = null;
  if (scaleId) {
    found = dayScales.find(s => String(s.id) === String(scaleId));
  }
  if (!found && time) {
    found = dayScales.find(s => s.time === time || (s.time && s.time.startsWith(time.substring(0, 2))));
  }
  if (!found && dayScales.length === 1) {
    found = dayScales[0];
  }

  if (found && window.copyScaleReminder) {
    window.copyScaleReminder(found);
  } else if (window.showToast) {
    window.showToast('Escala não encontrada para copiar lembrete.', 'warning');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendarComponent);
} else {
  initCalendarComponent();
}
