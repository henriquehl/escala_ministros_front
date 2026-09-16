/**
 * Componente: Login & Acesso
 * Controla autenticação de Administrador e validação de credenciais via Backend
 */

function initLoginComponent() {
  const loginForm = document.getElementById('login-form');
  const loginChurch = document.getElementById('login-church');
  const loginChurchTitle = document.getElementById('login-church-title');
  const loginUser = document.getElementById('login-user');
  const loginPassword = document.getElementById('login-password');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const loginSubmitBtn = document.getElementById('btn-login-submit') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);

  // Popula o select de igrejas a partir da API
  async function populateChurches() {
    if (!loginChurch) return;

    let churches = (window.appStore && window.appStore.getChurches()) || [];
    if (churches.length === 0 && window.appStore) {
      churches = await window.appStore.fetchChurches();
    }

    loginChurch.innerHTML = '<option value="" disabled selected>Selecione sua comunidade...</option>';

    if (churches && churches.length > 0) {
      churches.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name || `Comunidade ${c.id}`;
        loginChurch.appendChild(opt);
      });
    } else {
      // Fallback para seleção padrão caso o backend ainda não tenha listado
      const opt = document.createElement('option');
      opt.value = "1";
      opt.textContent = "Capela Divino Espírito Santo";
      loginChurch.appendChild(opt);
    }

    updateChurchSelectionState();
  }

  // Gerencia o bloqueio e desbloqueio dos campos com base na escolha da igreja
  function updateChurchSelectionState() {
    const hasChurch = Boolean(loginChurch && loginChurch.value);
    const selectedOption = hasChurch ? loginChurch.selectedOptions[0] : null;

    if (loginChurchTitle) {
      loginChurchTitle.textContent = (selectedOption && selectedOption.value) 
        ? selectedOption.text 
        : 'Selecione sua Igreja';
    }

    if (loginUser) loginUser.disabled = !hasChurch;
    if (loginPassword) loginPassword.disabled = !hasChurch;
    if (togglePassBtn) togglePassBtn.disabled = !hasChurch;
    if (loginSubmitBtn) loginSubmitBtn.disabled = !hasChurch;
  }

  // Listener para troca de igreja
  if (loginChurch) {
    loginChurch.addEventListener('change', () => {
      updateChurchSelectionState();
    });
    loginChurch.addEventListener('input', updateChurchSelectionState);
  }

  // Reagir a mudanças nas igrejas no Store
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'churches') {
        populateChurches();
      }
    });
  }

  // Atualizar estado caso a rota mude de volta para inicio-login
  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'inicio-login') {
      populateChurches();
      updateChurchSelectionState();
    }
  });

  // Toggle Mostrar/Ocultar Senha
  if (togglePassBtn && loginPassword) {
    togglePassBtn.addEventListener('click', () => {
      if (loginPassword.disabled) return;
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      const icon = togglePassBtn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = isPassword ? 'visibility_off' : 'visibility';
      }
    });
  }

  // Acesso e Autenticação no Backend
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!loginChurch || !loginChurch.value) {
        if (window.showToast) {
          window.showToast('Por favor, selecione uma comunidade para continuar.', 3000);
        }
        return;
      }

      const user = loginUser ? loginUser.value.trim() : '';
      const password = loginPassword ? loginPassword.value : '';
      const churchId = loginChurch.value;
      const churchName = loginChurch.selectedOptions[0] ? loginChurch.selectedOptions[0].text : 'Comunidade Paroquial';

      if (!user || !password) {
        if (window.showToast) {
          window.showToast('Informe o usuário e a senha para acessar.', 3000);
        }
        return;
      }

      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = `
          <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
          <span>Autenticando...</span>
        `;
      }

      try {
        if (!window.api || !window.api.auth) {
          throw new Error('Módulo de API não inicializado.');
        }

        // Chamada direta à API de autenticação
        const authResult = await window.api.auth.login({
          username: user,
          password: password,
          church_id: churchId
        });

        const userData = (authResult && (authResult.user || authResult.data)) || {};
        const role = userData.role || (userData.isAdmin === true ? 'admin' : 'visitor');
        const isAdmin = role === 'admin' || userData.isAdmin === true;
        const roleNames = {
          admin: 'Administrador',
          coordinator: 'Coordenador',
          visitor: 'Visitante'
        };

        window.appStore.setUser({
          id: userData.id || 1,
          role: role,
          isAdmin: isAdmin,
          roleName: roleNames[role] || userData.roleName || (isAdmin ? 'Administrador' : 'Visitante'),
          name: userData.name || user,
          username: userData.username || user,
          email: userData.email || '',
          churchId: churchId,
          churchName: churchName
        });

        // Carrega dados da comunidade logada
        await window.appStore.init(churchId);

        if (window.showToast) {
          window.showToast(`Bem-vindo, ${userData.name || user}!`);
        }

        if (window.appRouter) {
          window.appRouter.navigate('calendario-missas');
        }
      } catch (err) {
        console.error('Falha na autenticação:', err);

        // Limpa qualquer sessão residual
        if (window.api && window.api.auth) {
          window.api.auth.logout();
        }
        if (window.appStore) {
          window.appStore.setUser(null);
        }

        let errorMsg = 'Falha ao autenticar. Verifique seus dados.';
        if (err.status === 401 || err.status === 400 || (err.message && err.message.toLowerCase().includes('inval'))) {
          errorMsg = 'Usuário ou senha incorretos.';
        } else if (!err.status || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('CONNECTION_REFUSED')) {
          errorMsg = 'Servidor backend indisponível em http://localhost:8000. Inicie o backend para acessar.';
        } else if (err.message) {
          errorMsg = err.message;
        }

        if (window.showToast) {
          window.showToast(errorMsg, 4000);
        }
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = `
            <span class="material-symbols-outlined text-[20px]">login</span>
            <span>Acessar</span>
          `;
        }
      }
    });
  }

  // Inicialização
  populateChurches();
  updateChurchSelectionState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginComponent);
} else {
  initLoginComponent();
}
