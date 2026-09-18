/**
 * Roteador SPA (Single Page Application)
 * Controla navegação entre as telas com barra de navegação no topo e controle de acesso
 */

class Router {
  constructor() {
    this.routes = ['inicio-login', 'calendario-missas', 'membros-mesc', 'celebracoes', 'montar-escala', 'gerenciar-usuarios'];
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
          const hasToken = window.api ? Boolean(window.api.getToken()) : false;
          const isAuth = Boolean(hasToken && window.appStore.currentUser);
          if (!isAuth && this.currentRoute !== 'inicio-login') {
            this.navigate('inicio-login', true);
          } else {
            this.renderView(this.currentRoute);
          }
        }
      });
    }

    // Rota inicial baseada na autenticação e hash
    const initialHash = window.location.hash.replace('#/', '').replace('#', '');
    const hasToken = window.api ? Boolean(window.api.getToken()) : false;
    const isAuth = Boolean(hasToken && window.appStore && window.appStore.currentUser);

    if (isAuth) {
      if (this.routes.includes(initialHash) && initialHash !== 'inicio-login') {
        this.navigate(initialHash, false);
      } else {
        this.navigate('calendario-missas', false);
      }
    } else {
      this.navigate('inicio-login', false);
    }
  }

  navigate(path, updateHistory = true) {
    if (!this.routes.includes(path)) return;

    // AUTH GUARD: Bloqueio estrito de acesso sem autenticação válida
    const currentUser = window.appStore ? window.appStore.currentUser : null;
    const hasToken = window.api ? Boolean(window.api.getToken()) : false;
    const isAuthenticated = Boolean(currentUser && hasToken);
    const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isAdmin === true));
    const canManageScales = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'coordinator' || currentUser.isAdmin === true));

    // Se NÃO estiver autenticado e tentar acessar qualquer tela interna
    if (path !== 'inicio-login' && !isAuthenticated) {
      if (window.showToast) {
        window.showToast('Acesso restrito. Faça login para continuar.', 3000);
      }
      this.currentRoute = 'inicio-login';
      if (updateHistory) {
        window.location.hash = '#/inicio-login';
      }
      this.renderView('inicio-login');
      return;
    }

    // Se já estiver autenticado e tentar voltar para a tela de login
    if (path === 'inicio-login' && isAuthenticated) {
      this.navigate('calendario-missas', updateHistory);
      return;
    }

    // Proteção de rota para 'montar-escala' (Administrador e Coordenador)
    if (path === 'montar-escala' && !canManageScales) {
      if (window.showToast) {
        window.showToast('Acesso restrito: Apenas administradores e coordenadores podem gerir escalas.');
      }
      this.navigate('calendario-missas', updateHistory);
      return;
    }

    // Proteção de rota para 'gerenciar-usuarios' (apenas Administrador)
    if (path === 'gerenciar-usuarios' && !isAdmin) {
      if (window.showToast) {
        window.showToast('Acesso restrito a administradores do sistema.', 3000);
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
    const headerChurchNameEl = document.getElementById('header-church-name');
    const dropdownChurchNameEl = document.getElementById('dropdown-church-name');
    const headerTitleEl = document.getElementById('header-sub-title');
    const userRoleEl = document.getElementById('header-user-role');
    const currentUser = window.appStore ? window.appStore.currentUser : null;
    const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isAdmin === true));
    const isCoordinator = Boolean(currentUser && currentUser.role === 'coordinator');
    const canManageScales = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'coordinator' || currentUser.isAdmin === true));
    const roleName = (currentUser && (currentUser.roleName || (currentUser.role === 'admin' ? 'Administrador' : (currentUser.role === 'coordinator' ? 'Coordenador' : (currentUser.role === 'guest' ? 'Convidado' : 'Visitante'))))) || (isAdmin ? 'Administrador' : 'Visitante');
    const churchName = (currentUser && currentUser.churchName) ? currentUser.churchName : 'Capela Divino Espírito Santo';

    if (path === 'inicio-login') {
      if (headerEl) headerEl.classList.add('hidden');
    } else {
      if (headerEl) headerEl.classList.remove('hidden');

      // Atualizar nome da igreja no cabeçalho e dropdown
      if (headerChurchNameEl) {
        headerChurchNameEl.textContent = churchName;
      }
      if (dropdownChurchNameEl) {
        dropdownChurchNameEl.textContent = churchName;
      }

      // Atualizar título da seção do cabeçalho
      if (headerTitleEl) {
        switch (path) {
          case 'calendario-missas':
            headerTitleEl.textContent = 'CALENDÁRIO DE MISSAS';
            break;
          case 'membros-mesc':
            headerTitleEl.textContent = 'MEMBROS MESC';
            break;
          case 'celebracoes':
            headerTitleEl.textContent = 'CELEBRAÇÕES';
            break;
          case 'montar-escala':
            headerTitleEl.textContent = 'GERIR ESCALAS';
            break;
          case 'gerenciar-usuarios':
            headerTitleEl.textContent = 'GERENCIAR USUÁRIOS';
            break;
          default:
            headerTitleEl.textContent = churchName.toUpperCase();
        }
      }

      // Atualizar badge de papel do usuário
      if (userRoleEl) {
        userRoleEl.textContent = roleName;
        if (isAdmin) {
          userRoleEl.className = 'hidden sm:inline-block px-spacing-xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold';
        } else if (isCoordinator) {
          userRoleEl.className = 'hidden sm:inline-block px-spacing-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold';
        } else {
          userRoleEl.className = 'hidden sm:inline-block px-spacing-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold';
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
        link.style.display = canManageScales ? (isDesktop ? 'flex' : 'flex') : 'none';
      }

      if (linkPath === path) {
        link.setAttribute('aria-current', 'page');
        if (isDesktop) {
          link.className = 'nav-tab-link flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm transition-all';
        } else {
          link.className = 'nav-tab-link flex items-center gap-1 py-1.5 px-2 rounded-xl bg-primary/10 text-primary font-label-sm text-label-sm font-semibold transition-all whitespace-nowrap shrink-0';
        }

        if (icon) {
          icon.style.fontVariationSettings = "'FILL' 1";
        }
      } else {
        link.removeAttribute('aria-current');
        if (isDesktop) {
          link.className = 'nav-tab-link flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-all';
        } else {
          link.className = 'nav-tab-link flex items-center gap-1 py-1.5 px-2 rounded-xl text-on-surface-variant hover:text-on-surface transition-all whitespace-nowrap shrink-0';
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
