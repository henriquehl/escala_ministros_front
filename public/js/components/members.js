/**
 * Componente: Gestão de Membros MESC
 * Dashboard, listagem com busca e filtros, modal de cadastro e edição, remoção
 * Status suportados: 'ativo' e 'licenca'
 */

let activeMembersFilter = 'todos';
let currentSearchTerm = '';
let editingMemberId = null;

function isUserAdmin() {
  return Boolean(window.appStore && window.appStore.currentUser && window.appStore.currentUser.isAdmin);
}

function updateAdminMembersVisibility() {
  const openModalBtn = document.getElementById('open-modal-btn');
  if (openModalBtn) {
    openModalBtn.style.display = isUserAdmin() ? 'flex' : 'none';
  }
}

function initMembersComponent() {
  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  const ministerForm = document.getElementById('minister-form');
  const searchInput = document.getElementById('search-ministers');
  const filterChips = document.querySelectorAll('#members-filter-chips button');

  // Abrir Modal de Cadastro
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      openAddMemberModal();
    });
  }

  // Fechar Modal
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeMemberModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeMemberModal);

  // Submeter Formulário
  if (ministerForm) {
    ministerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveMemberForm();
    });
  }

  // Busca em Tempo Real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase().trim();
      renderMembersList();
    });
  }

  // Filtros de Categoria
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => {
        c.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all';
      });
      chip.className = 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all';

      activeMembersFilter = chip.getAttribute('data-filter') || 'todos';
      renderMembersList();
    });
  });

  // Alternador de Status no Modal (Ativo / Licença)
  const statusButtons = document.querySelectorAll('#modal-status-buttons button');
  statusButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-status');
      document.getElementById('input-status-hidden').value = status;
      resetModalStatusButtons(status);
    });
  });

  // Re-renderizar quando Store mudar
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'members' || event === 'user') {
        updateAdminMembersVisibility();
        renderMembersStats();
        renderMembersList();
      }
    });
  }

  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'membros-mesc') {
      updateAdminMembersVisibility();
      renderMembersStats();
      renderMembersList();
    }
  });

  // Render inicial
  updateAdminMembersVisibility();
  renderMembersStats();
  renderMembersList();
}

/**
 * Atualiza os contadores do Dashboard (Ativos e Licença)
 */
function renderMembersStats() {
  if (!window.appStore) return;
  const stats = window.appStore.getMemberStats();

  const totalHeroEl = document.getElementById('stat-total-hero');
  const activeHeroEl = document.getElementById('stat-active-hero');
  const statActiveEl = document.getElementById('stat-active-count');
  const statLeaveEl = document.getElementById('stat-leave-count');

  if (totalHeroEl) totalHeroEl.textContent = 'Quadro de Ministros';
  if (activeHeroEl) {
    activeHeroEl.textContent = `${stats.total} ministro${stats.total === 1 ? '' : 's'} cadastrado${stats.total === 1 ? '' : 's'} na pastoral`;
  }
  if (statActiveEl) statActiveEl.textContent = String(stats.active).padStart(2, '0');
  if (statLeaveEl) statLeaveEl.textContent = String(stats.leave).padStart(2, '0');

  // Atualizar contadores nos chips
  const allChip = document.querySelector('#members-filter-chips button[data-filter="todos"]');
  if (allChip) allChip.textContent = `Todos (${stats.total})`;
  const activeChip = document.querySelector('#members-filter-chips button[data-filter="ativo"]');
  if (activeChip) activeChip.textContent = `Ativos (${stats.active})`;
  const leaveChip = document.querySelector('#members-filter-chips button[data-filter="licenca"]');
  if (leaveChip) leaveChip.textContent = `Licença (${stats.leave})`;
}

/**
 * Renderiza a lista de cartões de ministros
 */
function renderMembersList() {
  const container = document.getElementById('members-list-container');
  if (!container || !window.appStore) return;

  const members = window.appStore.getMembers();
  const isAdmin = isUserAdmin();

  // Filtragem
  const filtered = members.filter((m) => {
    // 1. Filtro por Categoria
    if (activeMembersFilter === 'ativo' && m.status !== 'ativo') return false;
    if (activeMembersFilter === 'licenca' && m.status !== 'licenca') return false;

    // 2. Filtro por Busca
    if (currentSearchTerm) {
      const matchName = m.name.toLowerCase().includes(currentSearchTerm);
      const matchPhone = (m.phone || '').includes(currentSearchTerm);
      const matchSchedule = (m.schedule || '').toLowerCase().includes(currentSearchTerm);
      return matchName || matchPhone || matchSchedule;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-surface-container-lowest rounded-xl shadow-sm">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">person_search</span>
        <p class="font-body-md text-body-md text-on-surface">Nenhum ministro encontrado com estes critérios.</p>
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md hover:bg-surface-container transition-colors" onclick="clearMembersSearch()">
          Limpar Filtros
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((member) => {
    const initials = member.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
    let statusBadge = '';
    let opacityClass = '';

    if (member.status === 'ativo') {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold leading-none">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Ativo
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/30 text-[11px] font-medium leading-none">
          <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>
          Licença
        </span>
      `;
      opacityClass = 'opacity-80';
    }

    return `
      <div class="relative bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-xs ${opacityClass}" id="member-card-${member.id}">
        <!-- Topo: Avatar, Nome, Experiência, Status e Ações -->
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-container flex items-center justify-center border border-outline-variant/30 shadow-xs">
              ${
                member.avatar
                  ? `<img class="w-full h-full object-cover" src="${member.avatar}" alt="${member.name}">`
                  : `<div class="w-full h-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">${initials}</div>`
              }
            </div>
            <div class="min-w-0">
              <h3 class="text-[14px] sm:text-[15px] font-bold text-on-surface truncate leading-tight">${member.name}</h3>
              <p class="text-xs text-primary font-medium flex items-center gap-1 mt-0.5 truncate">
                <span class="material-symbols-outlined text-[13px] shrink-0">verified_user</span>
                <span class="truncate">${member.experience || 'Ministro MESC'}</span>
              </p>
            </div>
          </div>

          <!-- Status & Botões de Ação do Admin -->
          <div class="flex items-center gap-1 shrink-0">
            ${statusBadge}
            ${
              isAdmin ? `
                <div class="flex items-center gap-0.5 ml-1">
                  <button type="button" class="w-7 h-7 rounded-lg text-outline hover:bg-surface-container-high hover:text-primary flex items-center justify-center transition-all" title="Editar ministro" onclick="openEditMemberModal('${member.id}')">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button type="button" class="w-7 h-7 rounded-lg text-outline hover:bg-error-container hover:text-on-error-container flex items-center justify-center transition-all" title="Excluir ministro" onclick="deleteMemberAction('${member.id}', '${member.name.replace("'", "\\'")}')">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ` : ''
            }
          </div>
        </div>

        <!-- Linha Inferior de Informações: Horário Habitual e Contato -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant font-medium">
          <div class="flex items-center gap-1.5 min-w-0" title="${member.schedule || 'Disponibilidade sob consulta'}">
            <span class="material-symbols-outlined text-[15px] text-primary shrink-0">schedule</span>
            <span class="truncate">${member.schedule || 'Disponibilidade sob consulta'}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0" title="${member.phone || 'Sem telefone'}">
            <span class="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">chat</span>
            <span>${member.phone || 'Sem telefone'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.clearMembersSearch = function() {
  const searchInput = document.getElementById('search-ministers');
  if (searchInput) searchInput.value = '';
  currentSearchTerm = '';
  activeMembersFilter = 'todos';
  const filterChips = document.querySelectorAll('#members-filter-chips button');
  filterChips.forEach((chip, idx) => {
    chip.className = idx === 0
      ? 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all'
      : 'px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all';
  });
  renderMembersList();
};

/**
 * Funções de Modal Add / Edit (Ativo / Licença)
 */
function openAddMemberModal() {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem cadastrar novos ministros.');
    return;
  }

  editingMemberId = null;
  const modal = document.getElementById('minister-modal');
  const modalTitle = document.getElementById('modal-title');
  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const startDateInput = document.getElementById('input-start-date');
  const statusInput = document.getElementById('input-status-hidden');

  if (modalTitle) modalTitle.textContent = 'Cadastrar Novo Ministro';
  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (startDateInput) startDateInput.value = '';
  if (statusInput) statusInput.value = 'ativo';

  resetModalStatusButtons('ativo');
  if (modal) modal.classList.remove('hidden');
}

window.openEditMemberModal = function(id) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem editar informações de ministros.');
    return;
  }

  if (!window.appStore) return;
  const member = window.appStore.getMemberById(id);
  if (!member) return;

  editingMemberId = id;
  const modal = document.getElementById('minister-modal');
  const modalTitle = document.getElementById('modal-title');
  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const startDateInput = document.getElementById('input-start-date');
  const statusInput = document.getElementById('input-status-hidden');

  if (modalTitle) modalTitle.textContent = 'Editar Ministro';
  if (nameInput) nameInput.value = member.name || '';
  if (phoneInput) phoneInput.value = member.phone || '';
  if (startDateInput) startDateInput.value = member.startDate || '';
  const currentStatus = member.status === 'licenca' ? 'licenca' : 'ativo';
  if (statusInput) statusInput.value = currentStatus;

  resetModalStatusButtons(currentStatus);
  if (modal) modal.classList.remove('hidden');
};

function resetModalStatusButtons(status) {
  const statusButtons = document.querySelectorAll('#modal-status-buttons button');
  statusButtons.forEach((btn) => {
    const btnStatus = btn.getAttribute('data-status');
    if (btnStatus === status) {
      if (status === 'ativo') {
        btn.className = 'flex-1 py-2.5 px-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md text-center font-bold shadow-sm';
      } else {
        btn.className = 'flex-1 py-2.5 px-3 rounded-xl bg-surface-container-highest text-on-surface font-label-md text-label-md text-center font-bold shadow-sm';
      }
    } else {
      btn.className = 'flex-1 py-2.5 px-3 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-label-md text-center transition-colors';
    }
  });
}

function closeMemberModal() {
  const modal = document.getElementById('minister-modal');
  if (modal) modal.classList.add('hidden');
  editingMemberId = null;
}

function saveMemberForm() {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem salvar alterações.');
    return;
  }

  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  const startDateInput = document.getElementById('input-start-date');
  const statusInput = document.getElementById('input-status-hidden');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const startDate = startDateInput ? startDateInput.value : '';
  const status = (statusInput && statusInput.value === 'licenca') ? 'licenca' : 'ativo';

  // Coletar horários (se existirem checkboxes) ou manter existente/padrão
  const checkedSchedules = [];
  document.querySelectorAll('#modal-schedule-checkboxes input[type="checkbox"]:checked').forEach((cb) => {
    checkedSchedules.push(cb.value);
  });
  const existingSchedule = (editingMemberId && window.appStore.getMemberById(editingMemberId)?.schedule);
  const scheduleStr = checkedSchedules.length > 0
    ? checkedSchedules.join(' | ')
    : (existingSchedule || 'Todos os horários');

  // Calcular experiência se data de início for informada
  let calculatedExperience = undefined;
  if (startDate) {
    const startYear = parseInt(startDate.split('-')[0], 10);
    const currentYear = new Date().getFullYear();
    const diffYears = currentYear - startYear;
    if (diffYears <= 0) {
      calculatedExperience = 'Novo Ministro';
    } else if (diffYears === 1) {
      calculatedExperience = '1 ano de Ministério';
    } else {
      calculatedExperience = `${diffYears} anos de Ministério`;
    }
  }

  if (!name) {
    if (window.showToast) window.showToast('Por favor, informe o nome do ministro.');
    return;
  }

  if (editingMemberId) {
    const currentMember = window.appStore.getMemberById(editingMemberId);
    window.appStore.updateMember(editingMemberId, {
      name,
      phone,
      status,
      startDate: startDate || undefined,
      experience: calculatedExperience || (currentMember && currentMember.experience) || 'Ministro MESC',
      schedule: scheduleStr
    });
    if (window.showToast) window.showToast('Dados do ministro atualizados com sucesso!');
  } else {
    window.appStore.addMember({
      name,
      phone,
      status,
      startDate: startDate || undefined,
      experience: calculatedExperience || 'Novo Ministro',
      schedule: scheduleStr
    });
    if (window.showToast) window.showToast('Novo ministro cadastrado na paróquia com bênçãos!');
  }

  closeMemberModal();
}

window.deleteMemberAction = function(id, name) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem remover ministros.');
    return;
  }

  if (confirm(`Deseja realmente remover ${name} do cadastro ativo da paróquia?`)) {
    const card = document.getElementById(`member-card-${id}`);
    if (card) {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        window.appStore.deleteMember(id);
        if (window.showToast) window.showToast(`${name} foi removido do corpo de ministros.`);
      }, 300);
    } else {
      window.appStore.deleteMember(id);
    }
  }
};

window.addEventListener('DOMContentLoaded', initMembersComponent);
