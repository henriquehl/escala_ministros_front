/**
 * Componente: Gestão e Cadastro de Usuários
 * Controla listagem, filtragem, criação, edição e ativação/inativação de usuários do sistema
 */

function initUsersComponent() {
  const usersListContainer = document.getElementById('users-list-container');
  const searchInput = document.getElementById('search-users');
  const filterChips = document.querySelectorAll('#users-filter-chips button');
  const openModalBtn = document.getElementById('open-user-modal-btn');
  const userModal = document.getElementById('user-modal');
  const closeModalBtn = document.getElementById('close-user-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-user-modal-btn');
  const userForm = document.getElementById('user-form');
  const modalTitle = document.getElementById('user-modal-title');
  const userIdInput = document.getElementById('user-form-id');

  let currentFilter = 'todos';
  let currentSearch = '';

  // Renderiza checkboxes de igrejas dinamicamente
  function renderChurchCheckboxes(selectedChurchIds = []) {
    const container = document.getElementById('user-church-checkboxes');
    if (!container || !window.appStore) return;

    const churches = window.appStore.getChurches();
    if (churches.length === 0) return;

    container.innerHTML = churches.map(c => {
      const isChecked = selectedChurchIds.map(String).includes(String(c.id));
      return `
        <label class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer text-xs font-medium text-on-surface">
          <input type="checkbox" value="${c.id}" class="church-checkbox w-4 h-4 rounded text-primary focus:ring-primary/30 accent-primary" ${isChecked ? 'checked' : ''} />
          <span class="church-label-text">${c.name || 'Comunidade ' + c.id}</span>
        </label>
      `;
    }).join('');
  }

  // Renderiza a lista de usuários
  function renderUsers() {
    if (!usersListContainer || !window.appStore) return;

    const allUsers = window.appStore.getUsersList();
    
    // Filtragem por perfil/status
    let filtered = allUsers.filter(u => {
      if (currentFilter === 'admin') return u.role === 'admin';
      if (currentFilter === 'coordinator') return u.role === 'coordinator';
      if (currentFilter === 'visitor') return u.role === 'visitor';
      if (currentFilter === 'ativo') return u.status === 'ativo';
      if (currentFilter === 'inativo') return u.status === 'inativo';
      return true; // 'todos'
    });

    // Busca textual
    if (currentSearch.trim() !== '') {
      const q = currentSearch.toLowerCase().trim();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.roleName && u.roleName.toLowerCase().includes(q)) ||
        (u.churchNames && u.churchNames.some(c => c.toLowerCase().includes(q)))
      );
    }

    updateStats();

    if (filtered.length === 0) {
      usersListContainer.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/30 flex flex-col items-center justify-center">
          <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-3">
            <span class="material-symbols-outlined text-[28px]">search_off</span>
          </div>
          <h3 class="text-base font-bold text-on-surface">Nenhum usuário encontrado</h3>
          <p class="text-xs text-on-surface-variant mt-1">Tente ajustar o termo de busca ou o filtro selecionado.</p>
        </div>
      `;
      return;
    }

    usersListContainer.innerHTML = filtered.map(user => {
      const isActive = user.status === 'ativo';
      const initials = window.getInitials(user.name);
      
      // Badges por perfil
      let roleBadge = '';
      if (user.role === 'admin') {
        roleBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed-variant border border-primary/20"><span class="material-symbols-outlined text-[14px]">shield_person</span>Administrador</span>';
      } else if (user.role === 'coordinator') {
        roleBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container border border-secondary/20"><span class="material-symbols-outlined text-[14px]">supervised_user_circle</span>Coordenador</span>';
      } else {
        roleBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface-variant"><span class="material-symbols-outlined text-[14px]">visibility</span>Visitante</span>';
      }

      // Status badge
      const statusBadge = isActive
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Ativo</span>'
        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-highest text-on-surface-variant/80 border border-outline-variant/30"><span class="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40"></span>Inativo</span>';

      // Tags de Igrejas
      const churchesTags = (user.churchNames || user.churches || ['Capela Divino Espírito Santo'])
        .map(ch => `<span class="inline-flex items-center gap-1 text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/20"><span class="material-symbols-outlined text-[12px]">church</span>${typeof ch === 'object' ? ch.name : ch}</span>`)
        .join(' ');

      // Avatar ou Iniciais
      const avatarEl = user.avatar
        ? `<img alt="${user.name}" class="w-11 h-11 rounded-full object-cover border border-outline-variant/30 shadow-xs" src="${user.avatar}" />`
        : `<div class="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-xs">${initials}</div>`;

      return `
        <div class="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-outline-variant/60">
          <div class="flex items-start sm:items-center gap-3.5 min-w-0">
            ${avatarEl}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-bold text-sm sm:text-base text-on-surface truncate">${user.name || 'Sem nome'}</h3>
                ${roleBadge}
                ${statusBadge}
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant mt-1">
                <span class="flex items-center gap-1 font-mono text-[11px]">
                  <span class="material-symbols-outlined text-[13px]">alternate_email</span>
                  ${user.username || '-'}
                </span>
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">mail</span>
                  ${user.email || '-'}
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                ${churchesTags}
              </div>
            </div>
          </div>

          <!-- Ações -->
          <div class="flex items-center justify-end gap-1.5 border-t md:border-t-0 pt-3 md:pt-0 border-outline-variant/20">
            <button class="btn-toggle-status p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer" data-id="${user.id}" type="button" title="${isActive ? 'Inativar Usuário' : 'Ativar Usuário'}">
              <span class="material-symbols-outlined text-[20px] ${isActive ? 'text-emerald-600' : 'text-on-surface-variant'}">${isActive ? 'toggle_on' : 'toggle_off'}</span>
            </button>
            <button class="btn-edit-user p-2 rounded-xl text-primary hover:bg-primary-fixed/30 transition-colors cursor-pointer" data-id="${user.id}" type="button" title="Editar Usuário">
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button class="btn-delete-user p-2 rounded-xl text-error hover:bg-error-container/40 transition-colors cursor-pointer" data-id="${user.id}" type="button" title="Excluir Usuário">
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind event listeners para os botões gerados
    usersListContainer.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openModal(id);
      });
    });

    usersListContainer.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const updated = await window.appStore.toggleUserStatusInList(id);
        if (updated && window.showToast) {
          window.showToast(`Usuário ${updated.name} está agora ${updated.status}.`);
        }
        renderUsers();
      });
    });

    usersListContainer.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const user = window.appStore.getUserById(id);
        if (confirm(`Deseja realmente remover o usuário "${user ? user.name : 'selecionado'}"?`)) {
          await window.appStore.deleteUserFromList(id);
          if (window.showToast) {
            window.showToast('Usuário removido com sucesso.');
          }
          renderUsers();
        }
      });
    });
  }

  // Atualiza métricas no header hero
  function updateStats() {
    if (!window.appStore) return;
    const stats = window.appStore.getUserStats();
    
    const totalEl = document.getElementById('stat-total-users');
    const adminEl = document.getElementById('stat-admin-users');
    const coordEl = document.getElementById('stat-coord-users');
    const activeEl = document.getElementById('stat-active-users');

    if (totalEl) totalEl.textContent = stats.total;
    if (adminEl) adminEl.textContent = stats.admins;
    if (coordEl) coordEl.textContent = stats.coordinators;
    if (activeEl) activeEl.textContent = stats.active;
  }

  // Modal: Abrir
  function openModal(userId = null) {
    if (!userModal) return;

    if (userForm) userForm.reset();

    if (userId) {
      // Edição
      const user = window.appStore.getUserById(userId);
      if (user) {
        if (modalTitle) modalTitle.textContent = 'Editar Usuário';
        if (userIdInput) userIdInput.value = user.id;
        
        const nameInput = document.getElementById('user-form-name');
        const usernameInput = document.getElementById('user-form-username');
        const emailInput = document.getElementById('user-form-email');
        const roleSelect = document.getElementById('user-form-role');
        const statusSelect = document.getElementById('user-form-status');
        const passInput = document.getElementById('user-form-password');

        if (nameInput) nameInput.value = user.name || '';
        if (usernameInput) usernameInput.value = user.username || '';
        if (emailInput) emailInput.value = user.email || '';
        if (roleSelect) roleSelect.value = user.role || 'coordinator';
        if (statusSelect) statusSelect.value = user.status || 'ativo';
        if (passInput) passInput.placeholder = 'Deixe em branco para manter a atual';

        renderChurchCheckboxes(user.churches || []);
      }
    } else {
      // Novo cadastro
      if (modalTitle) modalTitle.textContent = 'Cadastrar Novo Usuário';
      if (userIdInput) userIdInput.value = '';
      
      const roleSelect = document.getElementById('user-form-role');
      const statusSelect = document.getElementById('user-form-status');
      const passInput = document.getElementById('user-form-password');
      
      if (roleSelect) roleSelect.value = 'coordinator';
      if (statusSelect) statusSelect.value = 'ativo';
      if (passInput) passInput.placeholder = 'Digite a senha de acesso inicial';

      renderChurchCheckboxes(['1']);
    }

    userModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  // Modal: Fechar
  function closeModal() {
    if (!userModal) return;
    userModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  // Listeners de abertura/fechamento do modal
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => openModal());
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', closeModal);
  }

  // Fechar ao clicar fora do container do modal
  if (userModal) {
    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) closeModal();
    });
  }

  // Submissão do Formulário
  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = userIdInput ? userIdInput.value : '';
      const name = document.getElementById('user-form-name')?.value.trim() || '';
      const username = document.getElementById('user-form-username')?.value.trim() || '';
      const email = document.getElementById('user-form-email')?.value.trim() || '';
      const role = document.getElementById('user-form-role')?.value || 'coordinator';
      const status = document.getElementById('user-form-status')?.value || 'ativo';
      const password = document.getElementById('user-form-password')?.value || '';

      // Obter igrejas marcadas
      const selectedChurches = [];
      const selectedChurchNames = [];
      document.querySelectorAll('.church-checkbox:checked').forEach(cb => {
        selectedChurches.push(cb.value);
        const labelText = cb.closest('label')?.querySelector('.church-label-text')?.textContent.trim();
        if (labelText) selectedChurchNames.push(labelText);
      });

      if (selectedChurches.length === 0) {
        if (window.showToast) {
          window.showToast('Por favor, selecione ao menos uma comunidade vinculada para o usuário.', 'warning');
        }
        return;
      }

      const roleNames = {
        admin: 'Administrador',
        coordinator: 'Coordenador',
        visitor: 'Visitante'
      };

      const payload = {
        name,
        username,
        email,
        role,
        roleName: roleNames[role] || 'Coordenador',
        status,
        churches: selectedChurches,
        churchNames: selectedChurchNames
      };

      if (password) {
        payload.password = password;
      }

      if (id) {
        payload.id = id;
      }

      const saveBtn = userForm.querySelector('button[type="submit"]');
      const originalHtml = saveBtn ? saveBtn.innerHTML : '';

      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.classList.add('opacity-75', 'cursor-not-allowed');
        }

        await window.appStore.saveUserToList(payload);
        if (window.showToast) {
          window.showToast(id ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado com sucesso!', 'success');
        }
        closeModal();
        renderUsers();
      } catch (err) {
        console.error('Erro ao salvar usuário:', err);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          saveBtn.innerHTML = originalHtml;
        }
      }
    });
  }

  // Busca em tempo real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderUsers();
    });
  }

  // Filtros rápidos
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-colors cursor-pointer';
      });
      chip.className = 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm cursor-pointer';
      
      currentFilter = chip.getAttribute('data-filter') || 'todos';
      renderUsers();
    });
  });

  // Inscrever-se a atualizações no Store
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'users') {
        renderUsers();
      }
    });
  }

  // Re-renderizar ao navegar para gerenciar-usuarios
  window.addEventListener('routeChanged', async (e) => {
    if (e.detail && e.detail.path === 'gerenciar-usuarios') {
      const currentUser = window.appStore ? window.appStore.currentUser : null;
      const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isAdmin === true));
      if (isAdmin && window.appStore) {
        await window.appStore.fetchSystemUsers();
        renderUsers();
      }
    }
  });

  // Render inicial apenas para administradores
  if (window.appStore) {
    const currentUser = window.appStore.currentUser;
    const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isAdmin === true));
    if (isAdmin) {
      window.appStore.fetchSystemUsers().then(() => {
        renderUsers();
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUsersComponent);
} else {
  initUsersComponent();
}
