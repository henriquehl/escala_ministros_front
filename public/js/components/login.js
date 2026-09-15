/**
 * Componente: Login & Acesso
 * Controla autenticação de Administrador e modo Visitante
 */

function initLoginComponent() {
  const loginForm = document.getElementById('login-form');
  const loginChurch = document.getElementById('login-church');
  const loginChurchTitle = document.getElementById('login-church-title');
  const loginUser = document.getElementById('login-user');
  const loginPassword = document.getElementById('login-password');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const loginSubmitBtn = document.getElementById('btn-login-submit') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);
  const visitorBtn = document.getElementById('btn-visitor-access');

  // Gerencia o bloqueio e desbloqueio dos campos com base na escolha da igreja
  function updateChurchSelectionState() {
    const hasChurch = Boolean(loginChurch && loginChurch.value);
    const selectedOption = hasChurch ? loginChurch.selectedOptions[0] : null;

    if (loginChurchTitle) {
      loginChurchTitle.textContent = selectedOption ? selectedOption.text : 'Selecione sua Igreja';
    }

    if (loginUser) loginUser.disabled = !hasChurch;
    if (loginPassword) loginPassword.disabled = !hasChurch;
    if (togglePassBtn) togglePassBtn.disabled = !hasChurch;
    if (loginSubmitBtn) loginSubmitBtn.disabled = !hasChurch;
    if (visitorBtn) visitorBtn.disabled = !hasChurch;
  }

  // Listener para troca de igreja (change e input)
  if (loginChurch) {
    loginChurch.addEventListener('change', updateChurchSelectionState);
    loginChurch.addEventListener('input', updateChurchSelectionState);
  }

  // Atualizar estado caso a rota mude de volta para inicio-login
  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'inicio-login') {
      updateChurchSelectionState();
    }
  });

  // Inicializa o estado bloqueado/desbloqueado
  updateChurchSelectionState();

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

  // Acesso como Administrador / Formulário
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loginChurch || !loginChurch.value) {
        if (window.showToast) {
          window.showToast('Por favor, selecione uma igreja para continuar.', 'warning');
        }
        return;
      }

      const user = loginUser ? loginUser.value.trim() : '';
      const churchId = loginChurch.value;
      const churchName = loginChurch.selectedOptions[0] ? loginChurch.selectedOptions[0].text : 'Comunidade Paroquial';

      window.appStore.setUser({
        isAdmin: true,
        roleName: 'Administrador',
        name: user || `Coordenação ${churchName}`,
        churchId: churchId,
        churchName: churchName
      });

      if (window.showToast) {
        window.showToast(`Bem-vindo à ${churchName}!`);
      }

      if (window.appRouter) {
        window.appRouter.navigate('calendario-missas');
      }
    });
  }

  // Acesso como Visitante
  if (visitorBtn) {
    visitorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!loginChurch || !loginChurch.value) {
        if (window.showToast) {
          window.showToast('Por favor, selecione uma igreja para continuar.', 'warning');
        }
        return;
      }

      const churchId = loginChurch.value;
      const churchName = loginChurch.selectedOptions[0] ? loginChurch.selectedOptions[0].text : 'Comunidade Paroquial';

      window.appStore.setUser({
        isAdmin: false,
        roleName: 'Visitante',
        name: 'Visitante da Paróquia',
        churchId: churchId,
        churchName: churchName
      });

      if (window.showToast) {
        window.showToast(`Acesso como Visitante em ${churchName} liberado (Modo Consulta)`);
      }

      if (window.appRouter) {
        window.appRouter.navigate('calendario-missas');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginComponent);
} else {
  initLoginComponent();
}
