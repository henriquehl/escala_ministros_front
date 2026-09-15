/**
 * Aplicação Principal - Portal Pastoral MESC
 * Inicialização global, gerenciador de Toasts/Notificações e Menu de Perfil
 */

// Notificação Global Toast
window.showToast = function(message, duration = 3000) {
  const toast = document.getElementById('global-toast');
  const toastText = document.getElementById('global-toast-text');

  if (!toast || !toastText) {
    console.log('[Toast]', message);
    return;
  }

  toastText.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (window._toastTimeout) {
    clearTimeout(window._toastTimeout);
  }

  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
  }, duration);
};

// Gerenciador da Caixa de Seleção / Dropdown do Usuário (com opção de Sair)
function initUserProfileMenu() {
  const menuBtn = document.getElementById('header-user-menu-btn');
  const dropdown = document.getElementById('header-user-dropdown');
  const logoutBtn = document.getElementById('btn-logout');

  if (!menuBtn || !dropdown) return;

  function updateDropdownUserInfo() {
    const userNameEl = document.getElementById('dropdown-user-name');
    const userChurchEl = document.getElementById('dropdown-church-name');
    const headerChurchNameEl = document.getElementById('header-church-name');
    const manageUsersLink = document.getElementById('dropdown-link-manage-users');
    if (window.appStore) {
      const user = window.appStore.currentUser;
      const isAdmin = Boolean(user && user.isAdmin);
      const churchName = (user && user.churchName) ? user.churchName : 'Capela Divino Espírito Santo';
      if (userNameEl) {
        userNameEl.textContent = (user && user.name) ? user.name : (isAdmin ? 'Administrador' : 'Visitante');
      }
      if (userChurchEl) {
        userChurchEl.textContent = churchName;
      }
      if (headerChurchNameEl) {
        headerChurchNameEl.textContent = churchName;
      }
      if (manageUsersLink) {
        manageUsersLink.style.display = isAdmin ? 'flex' : 'none';
      }
    }
  }

  // Inscrever-se a atualizações de usuário no store
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'user') {
        updateDropdownUserInfo();
      }
    });
  }

  const manageUsersLink = document.getElementById('dropdown-link-manage-users');
  if (manageUsersLink) {
    manageUsersLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeDropdown();
      if (window.appRouter) {
        window.appRouter.navigate('gerenciar-usuarios');
      }
    });
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      updateDropdownUserInfo();
      dropdown.classList.remove('hidden');
      menuBtn.setAttribute('aria-expanded', 'true');
    } else {
      dropdown.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function closeDropdown() {
    if (!dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  }

  menuBtn.addEventListener('click', toggleDropdown);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDropdown();

      if (window.appStore) {
        window.appStore.setUser({
          isAdmin: false,
          roleName: 'Visitante',
          name: 'Visitante',
          churchId: null,
          churchName: ''
        });
      }

      if (window.showToast) {
        window.showToast('Sessão encerrada com sucesso.');
      }

      if (window.appRouter) {
        window.appRouter.navigate('inicio-login');
      }
    });
  }

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
      closeDropdown();
    }
  });

  // Fechar ao pressionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  });
}

function startApp() {
  console.log('⛪ Portal Pastoral MESC - Front-end Inicializado com Sucesso');
  initUserProfileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
