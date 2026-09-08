/**
 * Componente: Login & Acesso
 * Controla autenticação de Administrador e modo Visitante
 */

function initLoginComponent() {
  const loginForm = document.getElementById('login-form');
  const loginUser = document.getElementById('login-user');
  const loginPassword = document.getElementById('login-password');
  const togglePassBtn = document.getElementById('toggle-password-btn');
  const visitorBtn = document.getElementById('btn-visitor-access');

  // Toggle Mostrar/Ocultar Senha
  if (togglePassBtn && loginPassword) {
    togglePassBtn.addEventListener('click', () => {
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
      const user = loginUser ? loginUser.value.trim() : '';

      window.appStore.setUser({
        isAdmin: true,
        roleName: 'Administrador',
        name: user || 'Coordenação Capela Divino'
      });

      if (window.showToast) {
        window.showToast('Bem-vindo à Capela Divino Espírito Santo!');
      }

      window.appRouter.navigate('calendario-missas');
    });
  }

  // Acesso como Visitante
  if (visitorBtn) {
    visitorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.appStore.setUser({
        isAdmin: false,
        roleName: 'Visitante',
        name: 'Visitante da Paróquia'
      });

      if (window.showToast) {
        window.showToast('Acesso como Visitante liberado (Modo Consulta)');
      }

      window.appRouter.navigate('calendario-missas');
    });
  }
}

window.addEventListener('DOMContentLoaded', initLoginComponent);
