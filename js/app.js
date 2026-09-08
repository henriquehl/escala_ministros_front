/**
 * Aplicação Principal - Portal Pastoral MESC
 * Inicialização global e gerenciador de Toasts/Notificações
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

document.addEventListener('DOMContentLoaded', () => {
  console.log('⛪ Portal Pastoral MESC - Front-end Inicializado com Sucesso');
});
