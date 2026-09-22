/**
 * Aplicação Principal - Portal Pastoral MESC
 * Inicialização global, gerenciador de Toasts/Notificações e Menu de Perfil
 */

// Notificação Global Toast com suporte a tipos (success, error, warning, info)
window.showToast = function(message, typeOrDuration = 'success', duration = null) {
  const toast = document.getElementById('global-toast');
  const toastText = document.getElementById('global-toast-text');
  const toastIcon = document.getElementById('global-toast-icon');

  if (!toast || !toastText) {
    console.log('[Toast]', message);
    return;
  }

  let type = 'success';
  let timeoutDuration = 3200;

  if (typeof typeOrDuration === 'number') {
    timeoutDuration = typeOrDuration;
  } else if (typeof typeOrDuration === 'string') {
    type = typeOrDuration;
    if (typeof duration === 'number') {
      timeoutDuration = duration;
    } else {
      timeoutDuration = type === 'error' ? 5000 : (type === 'warning' ? 4200 : 3200);
    }
  }

  // Configuração visual de acordo com o tipo
  const toastConfigs = {
    success: {
      icon: 'check_circle',
      iconClass: 'text-tertiary-fixed',
      borderClass: 'border-emerald-500/20'
    },
    error: {
      icon: 'error',
      iconClass: 'text-red-400',
      borderClass: 'border-red-500/40'
    },
    warning: {
      icon: 'warning',
      iconClass: 'text-amber-400',
      borderClass: 'border-amber-500/30'
    },
    info: {
      icon: 'info',
      iconClass: 'text-sky-400',
      borderClass: 'border-sky-500/30'
    }
  };

  const currentConfig = toastConfigs[type] || toastConfigs.success;

  // Atualiza ícone
  if (toastIcon) {
    toastIcon.textContent = currentConfig.icon;
    toastIcon.className = `material-symbols-outlined text-[20px] shrink-0 ${currentConfig.iconClass}`;
  }

  // Atualiza bordas de destaque
  toast.classList.remove('border-emerald-500/20', 'border-red-500/40', 'border-amber-500/30', 'border-sky-500/30');
  toast.classList.add(currentConfig.borderClass);

  toastText.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-4', 'translate-y-3');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (window._toastTimeout) {
    clearTimeout(window._toastTimeout);
  }

  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');
  }, timeoutDuration);
};

// Helper global para exibição padronizada de erros capturados
window.showErrorToast = function(err, fallbackMessage = 'Ocorreu um erro ao processar a requisição.') {
  let message = fallbackMessage;

  if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object') {
    if (err.data && typeof err.data === 'object') {
      if (typeof err.data.error === 'string') {
        message = err.data.error;
      } else if (typeof err.data.message === 'string') {
        message = err.data.message;
      } else if (Array.isArray(err.data.errors) && err.data.errors.length > 0) {
        message = err.data.errors.map(e => (typeof e === 'object' ? e.message || e.error : e)).join(', ');
      }
    } else if (err.message) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Network request failed')) {
        message = 'Não foi possível conectar ao servidor backend (http://localhost:8000). Verifique se a API está online.';
      } else {
        message = err.message;
      }
    }
  }

  if (window.showToast) {
    window.showToast(message, 'error');
  }
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
      const isAdmin = Boolean(user && (user.role === 'admin' || user.isAdmin === true));
      const churchName = (user && user.churchName) ? user.churchName : 'Capela Divino Espírito Santo';
      if (userNameEl) {
        userNameEl.textContent = (user && user.name) ? user.name : (isAdmin ? 'Administrador' : (user && user.role === 'guest' ? 'Convidado' : 'Visitante'));
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
    } else if (manageUsersLink) {
      manageUsersLink.style.display = 'none';
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
      const user = window.appStore ? window.appStore.currentUser : null;
      const isAdmin = Boolean(user && (user.role === 'admin' || user.isAdmin === true));
      if (!isAdmin) {
        if (window.showToast) {
          window.showToast('Acesso restrito a administradores do sistema.', 3000);
        }
        return;
      }
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

      if (window.api && window.api.auth) {
        window.api.auth.logout();
      }

      if (window.appStore) {
        window.appStore.setUser(null);
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

  updateDropdownUserInfo();
}

async function startApp() {
  console.log('⛪ Portal Pastoral MESC - Front-end Inicializado com Sucesso');
  console.log('🔗 API Base URL:', (window.api && window.api.getBaseUrl()) || 'http://localhost:8000');
  
  initUserProfileMenu();

  if (window.appStore) {
    await window.appStore.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
