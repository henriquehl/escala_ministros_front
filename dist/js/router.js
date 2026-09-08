/**
 * Roteador SPA (Single Page Application)
 * Controla navegação entre as telas com barra de navegação no topo e controle de acesso
 */

class Router {
  constructor() {
    this.routes = ['inicio-login', 'calendario-missas', 'membros-mesc', 'celebracoes', 'montar-escala'];
    this.currentRoute = 'inicio-login';
    this.init();
  }

  init() {
    // Interceptar cliques em links com atributo data-path
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-path]');
      if (target) {
        e.preventDefault();
        const path = target.getAttribute('data-path');
        this.navigate(path);
      }
    });

    // Escutar hash change se o usuário usar o histórico do navegador
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (this.routes.includes(hash)) {
        this.navigate(hash, false);
      }
    });

    // Reagir a mudanças de usuário no Store
    if (window.appStore) {
      window.appStore.subscribe((event) => {
        if (event === 'user') {
          this.renderView(this.currentRoute);
        }
      });
    }

    // Rota inicial baseada na hash ou padrão
    const initialHash = window.location.hash.replace('#/', '').replace('#', '');
    if (this.routes.includes(initialHash)) {
      this.navigate(initialHash, false);
    } else {
      this.navigate('inicio-login', false);
    }
  }

  navigate(path, updateHistory = true) {
    if (!this.routes.includes(path)) return;

    // Proteção de rota para 'montar-escala' (apenas Administrador)
    const currentUser = window.appStore ? window.appStore.currentUser : { isAdmin: true, roleName: 'Administrador' };
    if (path === 'montar-escala' && (!currentUser || !currentUser.isAdmin)) {
      if (window.showToast) {
        window.showToast('Acesso restrito: Apenas a coordenação pode gerir escalas.');
      }
      this.navigate('calendario-missas', updateHistory);
      return;
    }

    this.currentRoute = path;
    if (updateHistory) {
      window.location.hash = `#/${path}`;
    }
    this.renderView(path);
  }

  renderView(path) {
    this.currentRoute = path;

    // 1. Alternar visibilidade dos contêineres de tela
    document.querySelectorAll('.view-container').forEach((el) => {
      el.classList.remove('active');
    });

    const activeContainer = document.getElementById(`view-${path}`);
    if (activeContainer) {
      activeContainer.classList.add('active');
    }

    // 2. Controlar Cabeçalho Superior com Navegação
    const headerEl = document.getElementById('app-header');
    const headerTitleEl = document.getElementById('header-sub-title');
    const userRoleEl = document.getElementById('header-user-role');
    const currentUser = window.appStore ? window.appStore.currentUser : { isAdmin: true, roleName: 'Administrador' };
    const isAdmin = Boolean(currentUser && currentUser.isAdmin);

    if (path === 'inicio-login') {
      if (headerEl) headerEl.classList.add('hidden');
    } else {
      if (headerEl) headerEl.classList.remove('hidden');

      // Atualizar título do cabeçalho
      if (headerTitleEl) {
        switch (path) {
          case 'calendario-missas':
            headerTitleEl.textContent = 'CALENDÁRIO DE MISSAS';
            break;
          case 'membros-mesc':
            headerTitleEl.textContent = 'MEMBROS CAPELA DIVINO';
            break;
          case 'celebracoes':
            headerTitleEl.textContent = 'CELEBRAÇÕES LITÚRGICAS';
            break;
          case 'montar-escala':
            headerTitleEl.textContent = 'GERIR ESCALAS';
            break;
          default:
            headerTitleEl.textContent = 'CAPELA DIVINO';
        }
      }

      // Atualizar badge de papel do usuário
      if (userRoleEl) {
        userRoleEl.textContent = isAdmin ? 'Administrador' : 'Visitante';
        if (isAdmin) {
          userRoleEl.className = 'hidden sm:inline-block px-spacing-xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm';
        } else {
          userRoleEl.className = 'hidden sm:inline-block px-spacing-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm';
        }
      }
    }

    // 3. Atualizar estado e visibilidade dos links na Barra de Navegação Superior (Desktop & Mobile)
    document.querySelectorAll('#app-header .nav-tab-link').forEach((link) => {
      const linkPath = link.getAttribute('data-path');
      const icon = link.querySelector('.material-symbols-outlined');
      const isDesktop = link.closest('#app-desktop-nav') !== null;

      // Ocultar aba 'Gerir Escalas' para visitantes
      if (linkPath === 'montar-escala') {
        link.style.display = isAdmin ? (isDesktop ? 'flex' : 'flex') : 'none';
      }

      if (linkPath === path) {
        link.setAttribute('aria-current', 'page');
        if (isDesktop) {
          link.className = 'nav-tab-link flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm transition-all';
        } else {
          link.className = 'nav-tab-link flex items-center gap-1 py-1.5 px-3 rounded-xl bg-primary/10 text-primary font-label-sm text-label-sm font-semibold transition-all';
        }

        if (icon) {
          icon.style.fontVariationSettings = "'FILL' 1";
        }
      } else {
        link.removeAttribute('aria-current');
        if (isDesktop) {
          link.className = 'nav-tab-link flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-all';
        } else {
          link.className = 'nav-tab-link flex items-center gap-1 py-1.5 px-3 rounded-xl text-on-surface-variant hover:text-on-surface transition-all';
        }

        if (icon) {
          icon.style.fontVariationSettings = "'FILL' 0";
        }
      }
    });

    // 4. Disparar evento de ciclo de vida para os componentes
    window.dispatchEvent(new CustomEvent('routeChanged', { detail: { path } }));
    window.scrollTo(0, 0);
  }
}

window.appRouter = new Router();
