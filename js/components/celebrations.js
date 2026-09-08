/**
 * Componente: Gestão de Celebrações Litúrgicas
 * Dashboard, listagem com busca e filtros, modal de cadastro e edição, remoção
 * Categorias suportadas: 'dominical', 'semanal', 'solenidade', 'sacramento', 'especial'
 */

let activeCelebrationsFilter = 'todas';
let currentCelebrationsSearch = '';
let editingCelebrationId = null;

function isUserAdmin() {
  return Boolean(window.appStore && window.appStore.currentUser && window.appStore.currentUser.isAdmin);
}

function updateAdminCelebrationsVisibility() {
  const openModalBtn = document.getElementById('open-celebration-modal-btn');
  if (openModalBtn) {
    openModalBtn.style.display = isUserAdmin() ? 'flex' : 'none';
  }
}

function initCelebrationsComponent() {
  const openModalBtn = document.getElementById('open-celebration-modal-btn');
  const closeModalBtn = document.getElementById('close-celebration-modal-btn');
  const cancelModalBtn = document.getElementById('btn-cancel-celebration-modal');
  const celebrationForm = document.getElementById('celebration-form');
  const searchInput = document.getElementById('search-celebrations');
  const filterChips = document.querySelectorAll('#celebrations-filter-chips button');

  // Abrir Modal de Cadastro
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      openAddCelebrationModal();
    });
  }

  // Fechar Modal
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCelebrationModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeCelebrationModal);

  // Submeter Formulário
  if (celebrationForm) {
    celebrationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCelebrationForm();
    });
  }

  // Busca em Tempo Real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentCelebrationsSearch = e.target.value.toLowerCase().trim();
      renderCelebrationsList();
    });
  }

  // Filtros de Categoria
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => {
        c.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all';
      });
      chip.className = 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all';

      activeCelebrationsFilter = chip.getAttribute('data-filter') || 'todas';
      renderCelebrationsList();
    });
  });

  // Re-renderizar quando Store mudar
  if (window.appStore) {
    window.appStore.subscribe((event) => {
      if (event === 'celebrations' || event === 'user') {
        updateAdminCelebrationsVisibility();
        renderCelebrationsStats();
        renderCelebrationsList();
      }
    });
  }

  window.addEventListener('routeChanged', (e) => {
    if (e.detail && e.detail.path === 'celebracoes') {
      updateAdminCelebrationsVisibility();
      renderCelebrationsStats();
      renderCelebrationsList();
    }
  });

  // Render inicial
  updateAdminCelebrationsVisibility();
  renderCelebrationsStats();
  renderCelebrationsList();
}

/**
 * Atualiza os contadores do Dashboard de Celebrações
 */
function renderCelebrationsStats() {
  if (!window.appStore) return;
  const stats = window.appStore.getCelebrationStats();

  const totalHeroEl = document.getElementById('stat-total-celebrations-hero');
  const regularHeroEl = document.getElementById('stat-regular-celebrations-hero');
  const statDominicaisEl = document.getElementById('stat-dominicais-count');
  const statSolenesEl = document.getElementById('stat-solenes-count');

  if (totalHeroEl) totalHeroEl.textContent = `${stats.total} Celebrações Cadastradas`;
  if (regularHeroEl) {
    regularHeroEl.textContent = `${stats.dominicais} dominicais · ${stats.semanais} semanais · ${stats.solenesEEspeciais} solenes/especiais`;
  }
  if (statDominicaisEl) statDominicaisEl.textContent = String(stats.dominicais).padStart(2, '0');
  if (statSolenesEl) statSolenesEl.textContent = String(stats.solenesEEspeciais).padStart(2, '0');

  // Atualizar contadores nos chips
  const allChip = document.querySelector('#celebrations-filter-chips button[data-filter="todas"]');
  if (allChip) allChip.textContent = `Todas (${stats.total})`;
  const domChip = document.querySelector('#celebrations-filter-chips button[data-filter="dominical"]');
  if (domChip) domChip.textContent = `Dominicais (${stats.dominicais})`;
  const semChip = document.querySelector('#celebrations-filter-chips button[data-filter="semanal"]');
  if (semChip) semChip.textContent = `Semanais (${stats.semanais})`;
  const solChip = document.querySelector('#celebrations-filter-chips button[data-filter="solenidade"]');
  if (solChip) solChip.textContent = `Solenidades (${stats.solenidades})`;
  const sacChip = document.querySelector('#celebrations-filter-chips button[data-filter="sacramento"]');
  if (sacChip) sacChip.textContent = `Sacramentos (${stats.sacramentos})`;
  const espChip = document.querySelector('#celebrations-filter-chips button[data-filter="especial"]');
  if (espChip) espChip.textContent = `Especiais (${stats.especiais})`;
}

/**
 * Retorna o ícone e a cor do badge com base na categoria litúrgica
 */
function getCategoryBadgeInfo(category) {
  switch (category) {
    case 'dominical':
      return {
        label: 'Dominical',
        badgeClass: 'bg-primary/10 text-primary',
        icon: 'church'
      };
    case 'semanal':
      return {
        label: 'Semanal',
        badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
        icon: 'wb_sunny'
      };
    case 'solenidade':
      return {
        label: 'Solenidade',
        badgeClass: 'bg-secondary-container text-on-secondary-container font-bold',
        icon: 'star'
      };
    case 'sacramento':
      return {
        label: 'Sacramento',
        badgeClass: 'bg-primary-fixed text-on-primary-fixed-variant',
        icon: 'water_drop'
      };
    default:
      return {
        label: 'Especial / Devocional',
        badgeClass: 'bg-surface-container-highest text-on-surface-variant',
        icon: 'favorite'
      };
  }
}

/**
 * Renderiza a lista de cartões de celebrações
 */
function renderCelebrationsList() {
  const container = document.getElementById('celebrations-list-container');
  if (!container || !window.appStore) return;

  const celebrations = window.appStore.getCelebrationObjects();
  const isAdmin = isUserAdmin();

  // Filtragem
  const filtered = celebrations.filter((c) => {
    // 1. Filtro por Categoria
    if (activeCelebrationsFilter !== 'todas' && c.category !== activeCelebrationsFilter) {
      return false;
    }

    // 2. Filtro por Busca
    if (currentCelebrationsSearch) {
      const matchName = (c.name || '').toLowerCase().includes(currentCelebrationsSearch);
      const matchDesc = (c.description || '').toLowerCase().includes(currentCelebrationsSearch);
      const matchCat = (c.category || '').toLowerCase().includes(currentCelebrationsSearch);
      return matchName || matchDesc || matchCat;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-surface-container-lowest rounded-xl shadow-sm">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">church</span>
        <p class="font-body-md text-body-md text-on-surface">Nenhuma celebração encontrada com estes critérios.</p>
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md" onclick="clearCelebrationsSearch()">
          Limpar Filtros
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((cel) => {
    const badgeInfo = getCategoryBadgeInfo(cel.category);
    const iconToUse = cel.icon || badgeInfo.icon;

    // Botões de Ação apenas para Administradores
    const actionButtons = isAdmin ? `
      <div class="flex items-center justify-end gap-2 pt-spacing-xs">
        <button type="button" class="h-9 px-3 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" onclick="openEditCelebrationModal('${cel.id}')">
          <span class="material-symbols-outlined text-[16px]">edit</span>
          Editar
        </button>
        <button type="button" class="h-9 px-2.5 rounded-lg text-outline hover:bg-error-container hover:text-on-error-container font-label-sm text-label-sm flex items-center gap-1 transition-colors" onclick="deleteCelebrationAction('${cel.id}', '${cel.name.replace("'", "\\'")}')">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    ` : '';

    return `
      <div class="relative bg-surface-container-lowest rounded-xl p-spacing-md shadow-sm flex flex-col space-y-spacing-xs" id="celebration-card-${cel.id}">
        <div class="flex items-start justify-between gap-spacing-sm">
          <div class="flex items-center gap-spacing-sm min-w-0">
            <div class="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-primary-fixed/40 text-primary flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[24px]">${iconToUse}</span>
            </div>
            <div class="min-w-0">
              <h3 class="font-title-md text-title-md text-on-surface truncate">${cel.name}</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">auto_stories</span>
                <span class="truncate">${badgeInfo.label}</span>
              </p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full ${badgeInfo.badgeClass} font-label-sm text-label-sm shrink-0">
            ${badgeInfo.label}
          </span>
        </div>

        <!-- Detalhes & Descrição Litúrgica -->
        <div class="grid grid-cols-1 gap-1.5 pt-1">
          <div class="flex items-start gap-2 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
            <span class="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
            <span class="leading-relaxed line-clamp-2">${cel.description || 'Celebração litúrgica paroquial padronizada.'}</span>
          </div>
          <div class="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
            <div class="flex items-center gap-1.5 truncate">
              <span class="material-symbols-outlined text-[16px] text-tertiary">groups</span>
              <span class="truncate">Mínimo sugerido: <strong>${cel.minMinisters || 2} ministros</strong></span>
            </div>
            <span class="font-label-sm text-label-sm text-primary font-semibold">Capela Divino Espírito Santo</span>
          </div>
        </div>

        <!-- Ações do Administrador -->
        ${actionButtons}
      </div>
    `;
  }).join('');
}

window.clearCelebrationsSearch = function() {
  const searchInput = document.getElementById('search-celebrations');
  if (searchInput) searchInput.value = '';
  currentCelebrationsSearch = '';
  activeCelebrationsFilter = 'todas';
  const filterChips = document.querySelectorAll('#celebrations-filter-chips button');
  filterChips.forEach((chip, idx) => {
    if (idx === 0) {
      chip.className = 'px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm transition-all';
    } else {
      chip.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all';
    }
  });
  renderCelebrationsList();
};

/**
 * Funções de Modal Add / Edit de Celebração
 */
function openAddCelebrationModal() {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem cadastrar celebrações.');
    return;
  }

  editingCelebrationId = null;
  const modal = document.getElementById('celebration-modal');
  const modalTitle = document.getElementById('celebration-modal-title');
  const nameInput = document.getElementById('input-cel-name');
  const categoryInput = document.getElementById('input-cel-category');
  const descInput = document.getElementById('input-cel-description');
  const ministersInput = document.getElementById('input-cel-ministers');

  if (modalTitle) modalTitle.textContent = 'Cadastrar Nova Celebração';
  if (nameInput) nameInput.value = '';
  if (categoryInput) categoryInput.value = 'dominical';
  if (descInput) descInput.value = '';
  if (ministersInput) ministersInput.value = '4';

  if (modal) modal.classList.remove('hidden');
}

window.openEditCelebrationModal = function(id) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem editar celebrações.');
    return;
  }

  if (!window.appStore) return;
  const cel = window.appStore.getCelebrationById(id);
  if (!cel) return;

  editingCelebrationId = id;
  const modal = document.getElementById('celebration-modal');
  const modalTitle = document.getElementById('celebration-modal-title');
  const nameInput = document.getElementById('input-cel-name');
  const categoryInput = document.getElementById('input-cel-category');
  const descInput = document.getElementById('input-cel-description');
  const ministersInput = document.getElementById('input-cel-ministers');

  if (modalTitle) modalTitle.textContent = 'Editar Celebração';
  if (nameInput) nameInput.value = cel.name || '';
  if (categoryInput) categoryInput.value = cel.category || 'dominical';
  if (descInput) descInput.value = cel.description || '';
  if (ministersInput) ministersInput.value = cel.minMinisters || '2';

  if (modal) modal.classList.remove('hidden');
};

function closeCelebrationModal() {
  const modal = document.getElementById('celebration-modal');
  if (modal) modal.classList.add('hidden');
  editingCelebrationId = null;
}

function saveCelebrationForm() {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem salvar celebrações.');
    return;
  }

  const nameInput = document.getElementById('input-cel-name');
  const categoryInput = document.getElementById('input-cel-category');
  const descInput = document.getElementById('input-cel-description');
  const ministersInput = document.getElementById('input-cel-ministers');

  const name = (nameInput.value || '').trim();
  const category = categoryInput ? categoryInput.value : 'especial';
  const description = (descInput ? descInput.value : '').trim();
  const minMinisters = parseInt(ministersInput ? ministersInput.value : '2', 10) || 2;

  if (!name) {
    if (window.showToast) window.showToast('Por favor, informe o nome da celebração.');
    return;
  }

  // Ícone sugerido conforme a categoria
  let icon = 'church';
  if (category === 'semanal') icon = 'wb_sunny';
  else if (category === 'solenidade') icon = 'star';
  else if (category === 'sacramento') icon = 'water_drop';
  else if (category === 'especial') icon = 'favorite';

  if (editingCelebrationId) {
    window.appStore.updateCelebration(editingCelebrationId, {
      name,
      category,
      icon,
      description,
      minMinisters
    });
    if (window.showToast) window.showToast(`Celebração "${name}" atualizada com sucesso!`);
  } else {
    window.appStore.addCelebration({
      name,
      category,
      icon,
      description,
      minMinisters
    });
    if (window.showToast) window.showToast(`Celebração "${name}" cadastrada com sucesso!`);
  }

  closeCelebrationModal();
  renderCelebrationsStats();
  renderCelebrationsList();
}

window.deleteCelebrationAction = function(id, name) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores podem excluir celebrações.');
    return;
  }

  const confirmed = window.confirm(`Tem certeza que deseja excluir a celebração "${name}"?`);
  if (!confirmed) return;

  window.appStore.deleteCelebration(id);
  if (window.showToast) window.showToast(`Celebração "${name}" removida com sucesso!`);
  renderCelebrationsStats();
  renderCelebrationsList();
};

document.addEventListener('DOMContentLoaded', () => {
  initCelebrationsComponent();
});
