/**
 * Componente: Gestão de Celebrações Litúrgicas
 * Dashboard, listagem com busca e filtros, modal de cadastro e edição, remoção
 * Categorias suportadas: 'dominical', 'semanal', 'solenidade', 'sacramento', 'especial'
 */

let activeCelebrationsFilter = 'todas';
let currentCelebrationsSearch = '';
let editingCelebrationId = null;

function isUserAdmin() {
  const user = window.appStore && window.appStore.currentUser;
  if (!user) return false;
  return Boolean(user.role === 'admin' || user.role === 'coordinator' || user.isAdmin === true);
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
    celebrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveCelebrationForm();
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

  window.addEventListener('routeChanged', async (e) => {
    if (e.detail && e.detail.path === 'celebracoes') {
      updateAdminCelebrationsVisibility();
      if (window.appStore) {
        await window.appStore.fetchCelebrations();
      }
      renderCelebrationsStats();
      renderCelebrationsList();
    }
  });

  // Render inicial
  updateAdminCelebrationsVisibility();
  if (window.appStore) {
    window.appStore.fetchCelebrations().then(() => {
      renderCelebrationsStats();
      renderCelebrationsList();
    });
  } else {
    renderCelebrationsStats();
    renderCelebrationsList();
  }
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

  if (totalHeroEl) totalHeroEl.textContent = 'Catálogo de Celebrações';
  if (regularHeroEl) {
    regularHeroEl.textContent = `${stats.total} celebraç${stats.total === 1 ? 'ão cadastrada' : 'ões cadastradas'} na pastoral`;
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
 * Retorna o ícone e as classes visuais do badge com base na categoria litúrgica
 */
function getCategoryBadgeInfo(category) {
  switch (category) {
    case 'dominical':
      return {
        label: 'Dominical',
        badgeClass: 'bg-primary/10 text-primary border border-primary/20',
        dotClass: 'bg-primary',
        icon: 'church',
        desc: 'Preceito Paroquial'
      };
    case 'semanal':
      return {
        label: 'Semanal',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        dotClass: 'bg-emerald-500',
        icon: 'wb_sunny',
        desc: 'Missa Ferial'
      };
    case 'solenidade':
      return {
        label: 'Solenidade',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300/60',
        dotClass: 'bg-amber-500',
        icon: 'star',
        desc: 'Festa e Solenidade'
      };
    case 'sacramento':
      return {
        label: 'Sacramento',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200/60',
        dotClass: 'bg-blue-500',
        icon: 'water_drop',
        desc: 'Rito Sacramental'
      };
    default:
      return {
        label: 'Especial',
        badgeClass: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30',
        dotClass: 'bg-outline',
        icon: 'favorite',
        desc: 'Devocional / Votiva'
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
      <div class="col-span-full p-8 text-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">church</span>
        <p class="font-body-md text-body-md text-on-surface">Nenhuma celebração encontrada.</p>
        <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md hover:bg-surface-container transition-colors cursor-pointer" onclick="clearCelebrationsSearch()">
          Limpar Filtros
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((cel) => {
    const badgeInfo = getCategoryBadgeInfo(cel.category);
    const iconToUse = cel.icon || badgeInfo.icon;
    const minMinisters = cel.minMinisters || (cel.category === 'dominical' || cel.category === 'solenidade' ? 4 : 2);

    return `
      <div class="relative bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-xs" id="celebration-card-${cel.id}">
        <!-- Topo: Avatar Litúrgico, Nome, Descrição, Badge de Categoria e Ações Admin -->
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-primary-fixed/60 text-primary flex items-center justify-center border border-outline-variant/30 shadow-xs">
              <span class="material-symbols-outlined text-[20px]">${iconToUse}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-[14px] sm:text-[15px] font-bold text-on-surface truncate leading-tight">${cel.name}</h3>
              </div>
              <p class="text-xs text-primary font-medium flex items-center gap-1 mt-0.5 truncate">
                <span class="material-symbols-outlined text-[13px] shrink-0">auto_stories</span>
                <span class="truncate">${badgeInfo.desc}</span>
              </p>
            </div>
          </div>

          <!-- Badge de Categoria & Botões de Ação do Admin -->
          <div class="flex items-center gap-1 shrink-0">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${badgeInfo.badgeClass} text-[11px] font-semibold leading-none">
              <span class="w-1.5 h-1.5 rounded-full ${badgeInfo.dotClass}"></span>
              ${badgeInfo.label}
            </span>
            ${
              isAdmin ? `
                <div class="flex items-center gap-0.5 ml-1">
                  <button type="button" class="w-7 h-7 rounded-lg text-outline hover:bg-surface-container-high hover:text-primary flex items-center justify-center transition-all cursor-pointer" title="Editar celebração" onclick="openEditCelebrationModal('${cel.id}')">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button type="button" class="w-7 h-7 rounded-lg text-outline hover:bg-error-container hover:text-on-error-container flex items-center justify-center transition-all cursor-pointer" title="Excluir celebração" onclick="deleteCelebrationAction('${cel.id}', '${(cel.name || '').replace("'", "\\'")}')">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ` : ''
            }
          </div>
        </div>

        <!-- Linha Inferior: Ministros Sugeridos e Categoria -->
        <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant font-medium">
          <div class="flex items-center gap-1.5 min-w-0" title="${minMinisters} ministros na escala sugerida">
            <span class="material-symbols-outlined text-[15px] text-primary shrink-0">groups</span>
            <span class="truncate font-semibold text-on-surface">${minMinisters} ministros sugeridos</span>
          </div>
          <div class="flex items-center gap-1 shrink-0 text-on-surface-variant/80">
            <span class="material-symbols-outlined text-[14px]">church</span>
            <span>${badgeInfo.label}</span>
          </div>
        </div>
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
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem cadastrar celebrações.');
    return;
  }

  editingCelebrationId = null;
  const modal = document.getElementById('celebration-modal');
  const modalTitle = document.getElementById('celebration-modal-title');
  const nameInput = document.getElementById('input-cel-name');
  const categoryInput = document.getElementById('input-cel-category');

  if (modalTitle) modalTitle.textContent = 'Cadastrar Nova Celebração';
  if (nameInput) nameInput.value = '';
  if (categoryInput) categoryInput.value = 'dominical';

  if (modal) modal.classList.remove('hidden');
}

window.openEditCelebrationModal = function(id) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem editar celebrações.');
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

  if (modalTitle) modalTitle.textContent = 'Editar Celebração';
  if (nameInput) nameInput.value = cel.name || '';
  if (categoryInput) categoryInput.value = cel.category || 'dominical';

  if (modal) modal.classList.remove('hidden');
};

function closeCelebrationModal() {
  const modal = document.getElementById('celebration-modal');
  if (modal) modal.classList.add('hidden');
  editingCelebrationId = null;
}

async function saveCelebrationForm() {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem salvar celebrações.', 'warning');
    return;
  }

  const nameInput = document.getElementById('input-cel-name');
  const categoryInput = document.getElementById('input-cel-category');

  const name = nameInput ? nameInput.value.trim() : '';
  const category = categoryInput ? categoryInput.value : 'especial';
  const minMinisters = category === 'dominical' || category === 'solenidade' ? 4 : 2;

  if (!name) {
    if (window.showToast) window.showToast('Por favor, informe o nome da celebração.', 'warning');
    return;
  }

  let icon = 'church';
  if (category === 'semanal') icon = 'wb_sunny';
  else if (category === 'solenidade') icon = 'star';
  else if (category === 'sacramento') icon = 'water_drop';
  else if (category === 'especial') icon = 'favorite';

  const saveBtn = document.getElementById('btn-save-celebration');
  const originalHtml = saveBtn ? saveBtn.innerHTML : '';

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('opacity-75', 'cursor-not-allowed');
    }

    if (editingCelebrationId) {
      await window.appStore.updateCelebration(editingCelebrationId, {
        name,
        category,
        icon,
        minMinisters
      });
      if (window.showToast) window.showToast(`Celebração "${name}" atualizada com sucesso!`, 'success');
    } else {
      await window.appStore.addCelebration({
        name,
        category,
        icon,
        minMinisters
      });
      if (window.showToast) window.showToast(`Celebração "${name}" cadastrada com sucesso!`, 'success');
    }
    closeCelebrationModal();
  } catch (err) {
    console.error('Erro ao salvar celebração:', err);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      saveBtn.innerHTML = originalHtml;
    }
  }
}

window.deleteCelebrationAction = async function(id, name) {
  if (!isUserAdmin()) {
    if (window.showToast) window.showToast('Apenas administradores e coordenadores podem excluir celebrações.', 'warning');
    return;
  }

  if (confirm(`Deseja realmente remover "${name}" do catálogo de celebrações?`)) {
    const card = document.getElementById(`celebration-card-${id}`);
    if (card) {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
    }
    try {
      await window.appStore.deleteCelebration(id);
      if (window.showToast) window.showToast(`Celebração "${name}" removida com sucesso!`, 'success');
    } catch (err) {
      if (card) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCelebrationsComponent);
} else {
  initCelebrationsComponent();
}
