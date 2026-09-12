/**
 * Componente: Calendário de Missas e Escalas
 * Renderiza grade de dias, filtros de horário e card interativo de presenças
 */

let currentYear = 2025;
let currentMonth = 10; // 1-12 (Outubro)
let selectedDay = 12; // Dia padrão selecionado no mockup
let activeTimeFilter = 'todos';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function initCalendarComponent() {
  const monthNameEl = document.getElementById('calendar-month-name');
  const yearBadgeEl = document.getElementById('calendar-year-badge');
  const prevMonthBtn = document.getElementById('btn-prev-month');
  const nextMonthBtn = document.getElementById('btn-next-month');

  // Navegação de Mês
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      renderCalendar();
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
    const adminSection = document.getElementById('admin-management-section');
    if (adminSection) {
      const isAdmin = Boolean(window.appStore && window.appStore.currentUser && window.appStore.currentUser.isAdmin);
      adminSection.style.display = isAdmin ? 'block' : 'none';
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

  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'calendario-missas') {
      updateCalendarAdminVisibility();
      renderCalendar();
      renderSelectedDayCard();
    }
  });

  // Render inicial
  updateCalendarAdminVisibility();
  renderCalendar();
  renderSelectedDayCard();
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
    const dayScales = monthScales.filter((s) => s.day === day);
    const isSunday = (firstDayIndex + day - 1) % 7 === 0;

    // Filtrar por horário se selecionado
    const matchingScale = dayScales.find((s) => {
      if (activeTimeFilter === 'todos') return true;
      return s.time.startsWith(activeTimeFilter.substring(0, 2));
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

  // 3. Dias do próximo mês para completar 35 ou 42 células
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
  const scale = window.appStore ? window.appStore.getScaleByDateAndHour(dateStr, activeTimeFilter) : null;

  // Formatar data em português com padrão DD/MM/AAAA
  const dateObj = new Date(currentYear, currentMonth - 1, selectedDay);
  const dayOfWeekName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dateObj.getDay()];
  const dayPad = String(selectedDay).padStart(2, '0');
  const monthPad = String(currentMonth).padStart(2, '0');
  const formattedDateDDMMAAAA = `${dayPad}/${monthPad}/${currentYear}`;
  const formattedFullDate = `${dayOfWeekName}, ${formattedDateDDMMAAAA}`;

  if (titleEl) titleEl.textContent = formattedFullDate;

  if (!scale || !scale.ministers || scale.ministers.length === 0) {
    if (massSubtitleEl) massSubtitleEl.innerHTML = `<span class="material-symbols-outlined text-[16px] text-outline">event_busy</span> Nenhuma celebração escalada para este dia.`;
    if (countRatioEl) {
      countRatioEl.innerHTML = `<span class="material-symbols-outlined text-[15px] leading-none">person_off</span><span>Sem ministros escalados</span>`;
    }
    if (listEl) {
      const isAdmin = Boolean(window.appStore && window.appStore.currentUser && window.appStore.currentUser.isAdmin);
      const createBtnHtml = isAdmin ? `
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors active:scale-95" data-path="montar-escala">
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

  // Preencher dados da celebração
  if (massSubtitleEl) {
    const celebrantText = scale.celebrant ? ` - ${scale.celebrant}` : '';
    massSubtitleEl.innerHTML = `
      <span class="material-symbols-outlined text-[16px] text-secondary">schedule</span>
      <span>${scale.time}h - <strong>${scale.celebrationName || 'Santa Missa'}</strong>${celebrantText}</span>
    `;
  }

  const assignedCount = scale.ministers.length;

  if (countRatioEl) {
    countRatioEl.innerHTML = `<span class="material-symbols-outlined text-[15px] leading-none">group</span><span>${assignedCount} Ministro${assignedCount === 1 ? '' : 's'} Escalado${assignedCount === 1 ? '' : 's'}</span>`;
  }

  // Renderizar Lista de Ministros (Grid moderna em 2 colunas)
  if (listEl) {
    listEl.innerHTML = scale.ministers.map((minister) => {
      const initials = window.getInitials ? window.getInitials(minister.name) : minister.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

      return `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low/70 hover:bg-surface-container transition-all border border-outline-variant/20 shadow-xs">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 border border-primary/20">
              ${initials}
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-bold text-on-surface truncate">${minister.name}</span>
                ${minister.isLeader ? `<span class="material-symbols-outlined text-primary text-[16px]" title="Coordenador de Turno">stars</span>` : ''}
              </div>
              <span class="text-xs ${minister.isLeader ? 'text-primary font-semibold' : 'text-on-surface-variant font-medium'} flex items-center gap-1 mt-0.5 truncate">
                <span class="material-symbols-outlined text-[13px]">${minister.isLeader ? 'workspace_premium' : 'church'}</span>
                ${minister.role || 'Ministro'}
              </span>
            </div>
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

window.addEventListener('DOMContentLoaded', initCalendarComponent);
