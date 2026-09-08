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

  if (totalHeroEl) totalHeroEl.textContent = `${stats.active} Ministros Ativos`;
  if (activeHeroEl) {
    activeHeroEl.textContent = stats.leave > 0
      ? `${stats.leave} ministro(s) em licença pastoral`
      : 'Nenhum ministro em licença pastoral';
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
    if (activeMembersFilter === 'matriz' && !m.community.toLowerCase().includes('matriz')) return false;
    if (activeMembersFilter === 'comunidades' && m.community.toLowerCase().includes('matriz')) return false;

    // 2. Filtro por Busca
    if (currentSearchTerm) {
      const matchName = m.name.toLowerCase().includes(currentSearchTerm);
      const matchCommunity = m.community.toLowerCase().includes(currentSearchTerm);
      const matchPhone = (m.phone || '').includes(currentSearchTerm);
      const matchSchedule = (m.schedule || '').toLowerCase().includes(currentSearchTerm);
      return matchName || matchCommunity || matchPhone || matchSchedule;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-surface-container-lowest rounded-xl shadow-sm">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">person_search</span>
        <p class="font-body-md text-body-md text-on-surface">Nenhum ministro encontrado com estes critérios.</p>
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md" onclick="clearMembersSearch()">
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
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm shrink-0 font-medium">Ativo</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm shrink-0 font-medium">Licença</span>`;
      opacityClass = 'opacity-85';
    }

    // Botões de Ação apenas para Administradores
    const actionButtons = isAdmin ? `
      <div class="flex items-center justify-end gap-2 pt-spacing-xs">
        <button type="button" class="h-9 px-3 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" onclick="openEditMemberModal('${member.id}')">
          <span class="material-symbols-outlined text-[16px]">edit</span>
          Editar
        </button>
        <button type="button" class="h-9 px-2.5 rounded-lg text-outline hover:bg-error-container hover:text-on-error-container font-label-sm text-label-sm flex items-center gap-1 transition-colors" onclick="deleteMemberAction('${member.id}', '${member.name.replace("'", "\\'")}')">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    ` : '';

    return `
      <div class="relative bg-surface-container-lowest rounded-xl p-spacing-md shadow-sm flex flex-col space-y-spacing-xs ${opacityClass}" id="member-card-${member.id}">
        <div class="flex items-start justify-between gap-spacing-sm">
          <div class="flex items-center gap-spacing-sm min-w-0">
            <div class="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
              ${
                member.avatar
                  ? `<img class="w-full h-full object-cover" src="${member.avatar}" alt="${member.name}">`
                  : `<div class="w-full h-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-title-md text-title-md font-bold">${initials}</div>`
              }
            </div>
            <div class="min-w-0">
              <h3 class="font-title-md text-title-md text-on-surface truncate">${member.name}</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">church</span>
                <span class="truncate">${member.community}</span>
              </p>
            </div>
          </div>
          ${statusBadge}
        </div>

        <!-- Detalhes & Escalas -->
        <div class="grid grid-cols-1 gap-1.5 pt-1">
          <div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
            <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
            <span class="truncate">${member.schedule || 'Disponibilidade sob consulta'}</span>
          </div>
          <div class="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
            <div class="flex items-center gap-2 truncate">
              <span class="material-symbols-outlined text-[16px] text-tertiary">chat</span>
              <span class="truncate">${member.phone || 'Sem telefone'}</span>
            </div>
            <span class="font-label-sm text-label-sm text-primary font-semibold">${member.experience || 'Capela Divino'}</span>
          </div>
        </div>

        <!-- Ações do Administrador -->
        ${actionButtons}
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
    if (idx === 0) {
      chip.className = 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all';
    } else {
      chip.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all';
    }
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
  const communityInput = document.getElementById('input-community');
  const statusInput = document.getElementById('input-status-hidden');

  if (modalTitle) modalTitle.textContent = 'Cadastrar Novo Ministro';
  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (communityInput) communityInput.selectedIndex = 0;
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
  const communityInput = document.getElementById('input-community');
  const statusInput = document.getElementById('input-status-hidden');

  if (modalTitle) modalTitle.textContent = 'Editar Ministro';
  if (nameInput) nameInput.value = member.name || '';
  if (phoneInput) phoneInput.value = member.phone || '';
  const currentStatus = member.status === 'licenca' ? 'licenca' : 'ativo';
  if (statusInput) statusInput.value = currentStatus;

  if (communityInput) {
    let found = false;
    for (let i = 0; i < communityInput.options.length; i++) {
      if (communityInput.options[i].text === member.community || member.community.includes(communityInput.options[i].text)) {
        communityInput.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) communityInput.selectedIndex = 0;
  }

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
  const communityInput = document.getElementById('input-community');
  const statusInput = document.getElementById('input-status-hidden');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const community = communityInput ? communityInput.value : 'Matriz São José Operário';
  const status = (statusInput && statusInput.value === 'licenca') ? 'licenca' : 'ativo';

  // Coletar horários marcados
  const checkedSchedules = [];
  document.querySelectorAll('#modal-schedule-checkboxes input[type="checkbox"]:checked').forEach((cb) => {
    checkedSchedules.push(cb.value);
  });
  const scheduleStr = checkedSchedules.length > 0 ? checkedSchedules.join(' | ') : 'Domingos: 19:00';

  if (!name) {
    if (window.showToast) window.showToast('Por favor, informe o nome do ministro.');
    return;
  }

  if (editingMemberId) {
    window.appStore.updateMember(editingMemberId, {
      name,
      phone,
      community,
      status,
      schedule: scheduleStr
    });
    if (window.showToast) window.showToast('Dados do ministro atualizados com sucesso!');
  } else {
    window.appStore.addMember({
      name,
      phone,
      community,
      status,
      schedule: scheduleStr,
      experience: 'Novo Ministro'
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
