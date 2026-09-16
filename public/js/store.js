/**
 * Store Central do Portal Pastoral MESC
 * Gerenciamento de estado reativo integrado à API REST do backend
 */

/**
 * Retorna as iniciais do nome de forma consistente (ex: "Francisco Andrade" -> "FA")
 */
window.getInitials = function(name) {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const STORAGE_KEY_USER = 'mesc_portal_user_v2';

class Store {
  constructor() {
    this.subscribers = [];
    this.categories = [];
    this.members = [];
    this.scales = [];
    this.celebrations = [];
    this.systemUsers = [];
    this.churches = [];
    this.currentUser = this.loadUser();
    this.isInitialized = false;
  }

  // ==========================================
  // INICIALIZAÇÃO & SINCRONIZAÇÃO
  // ==========================================
  async init(churchId) {
    // Carrega igrejas públicas
    await this.fetchChurches();

    const hasToken = window.api ? Boolean(window.api.getToken()) : false;
    // Se não houver token ou usuário logado, não dispara requisições de recursos protegidos
    if (!hasToken || !this.currentUser) {
      return;
    }

    const activeChurchId = churchId || (this.currentUser && this.currentUser.churchId);
    const isAdmin = Boolean(this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.isAdmin === true));
    try {
      const fetchPromises = [
        this.fetchCategories(),
        this.fetchCelebrations(),
        this.fetchMembers(activeChurchId)
      ];

      if (isAdmin) {
        fetchPromises.push(this.fetchSystemUsers());
      }

      await Promise.allSettled(fetchPromises);

      const now = new Date();
      await this.fetchScales(now.getFullYear(), now.getMonth() + 1, activeChurchId);
      this.isInitialized = true;
    } catch (err) {
      console.error('Erro ao inicializar dados do store:', err);
    }
  }

  // ==========================================
  // SESSÃO / USUÁRIO ATUAL
  // ==========================================
  loadUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  setUser(userObj) {
    this.currentUser = userObj;
    try {
      if (userObj) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.error('Erro ao salvar sessão', e);
    }
    this.notify('user');
  }

  // ==========================================
  // IGREJAS / COMUNIDADES
  // ==========================================
  async fetchChurches() {
    try {
      const data = await window.api.churches.list();
      this.churches = Array.isArray(data) ? data : (data && data.churches) || [];
      this.notify('churches');
      return this.churches;
    } catch (err) {
      console.warn('Erro ao carregar igrejas da API:', err);
      return this.churches;
    }
  }

  getChurches() {
    return this.churches;
  }

  getChurchById(id) {
    return this.churches.find(c => String(c.id) === String(id)) || null;
  }

  // ==========================================
  // CATEGORIAS LITÚRGICAS
  // ==========================================
  async fetchCategories() {
    try {
      const data = await window.api.celebrations.categories();
      this.categories = Array.isArray(data) ? data : (data && data.categories) || [];
      this.notify('categories');
      return this.categories;
    } catch (err) {
      console.warn('Erro ao carregar categorias da API:', err);
      return this.categories;
    }
  }

  getCategories() {
    return this.categories;
  }

  getCategoryById(id) {
    return this.categories.find(c => String(c.id) === String(id) || c.id === `cat-${id}`) || null;
  }

  // ==========================================
  // CELEBRAÇÕES LITÚRGICAS
  // ==========================================
  async fetchCelebrations() {
    try {
      const data = await window.api.celebrations.list();
      this.celebrations = Array.isArray(data) ? data : (data && data.celebrations) || [];
      this.notify('celebrations');
      return this.celebrations;
    } catch (err) {
      console.warn('Erro ao carregar celebrações da API:', err);
      return this.celebrations;
    }
  }

  getCelebrationObjects() {
    return this.celebrations.map((c, idx) => {
      if (typeof c === 'string') {
        return {
          id: `cel-${idx}`,
          name: c,
          category: 'especial',
          icon: 'church',
          description: 'Celebração litúrgica paroquial.',
          minMinisters: 2,
          isDefault: false
        };
      }
      const cat = c.category || (c.category_name ? c.category_name.toLowerCase() : (c.category_id ? String(c.category_id).replace('cat-', '') : 'especial'));
      return {
        ...c,
        id: c.id,
        name: c.name || '',
        category: cat,
        icon: c.icon || (cat === 'semanal' ? 'wb_sunny' : cat === 'solenidade' ? 'star' : cat === 'sacramento' ? 'water_drop' : 'church'),
        minMinisters: c.min_ministers || c.minMinisters || (cat === 'dominical' || cat === 'solenidade' ? 4 : 2),
        description: c.description || 'Celebração litúrgica paroquial.'
      };
    });
  }

  getCelebrations() {
    return this.getCelebrationObjects().map(c => c.name);
  }

  getCelebrationById(id) {
    const list = this.getCelebrationObjects();
    return list.find(c => String(c.id) === String(id)) || null;
  }

  async addCelebration(dataOrName) {
    try {
      let payload;
      if (typeof dataOrName === 'string') {
        payload = {
          name: dataOrName.trim(),
          category: 'especial',
          description: 'Celebração cadastrada pela coordenação.',
          min_ministers: 2
        };
      } else {
        payload = {
          name: (dataOrName.name || '').trim(),
          category: dataOrName.category || 'especial',
          category_id: dataOrName.category_id || undefined,
          description: (dataOrName.description || '').trim(),
          min_ministers: dataOrName.minMinisters || dataOrName.min_ministers || 2
        };
      }

      const created = await window.api.celebrations.create(payload);
      if (created) {
        this.celebrations.push(created);
        this.notify('celebrations');
        return created.name || payload.name;
      }
      return payload.name;
    } catch (err) {
      console.error('Erro ao adicionar celebração:', err);
      if (window.showToast) window.showToast('Erro ao salvar celebração no servidor.', 3500);
      throw err;
    }
  }

  async updateCelebration(id, updatedData) {
    try {
      const payload = {
        name: updatedData.name,
        category: updatedData.category,
        category_id: updatedData.category_id,
        description: updatedData.description,
        min_ministers: updatedData.minMinisters || updatedData.min_ministers
      };
      const updated = await window.api.celebrations.update(id, payload);
      const idx = this.celebrations.findIndex(c => String(c.id) === String(id));
      if (idx !== -1) {
        this.celebrations[idx] = { ...this.celebrations[idx], ...(updated || payload) };
      }
      this.notify('celebrations');
      return updated;
    } catch (err) {
      console.error('Erro ao atualizar celebração:', err);
      if (window.showToast) window.showToast('Erro ao atualizar celebração no servidor.', 3500);
      throw err;
    }
  }

  async deleteCelebration(id) {
    try {
      await window.api.celebrations.delete(id);
      this.celebrations = this.celebrations.filter(c => String(c.id) !== String(id));
      this.notify('celebrations');
    } catch (err) {
      console.error('Erro ao excluir celebração:', err);
      if (window.showToast) window.showToast('Erro ao excluir celebração no servidor.', 3500);
      throw err;
    }
  }

  getCelebrationStats() {
    const list = this.getCelebrationObjects();
    const dominicais = list.filter(c => c.category === 'dominical').length;
    const semanais = list.filter(c => c.category === 'semanal').length;
    const solenidades = list.filter(c => c.category === 'solenidade').length;
    const sacramentos = list.filter(c => c.category === 'sacramento').length;
    const especiais = list.filter(c => c.category === 'especial').length;

    return {
      total: list.length,
      dominicais,
      semanais,
      solenidades,
      sacramentos,
      especiais,
      solenesEEspeciais: solenidades + especiais + sacramentos
    };
  }

  // ==========================================
  // MEMBROS / MINISTROS
  // ==========================================
  async fetchMembers(churchId) {
    const cid = churchId || (this.currentUser && this.currentUser.churchId);
    try {
      const data = await window.api.members.list({ church_id: cid });
      this.members = Array.isArray(data) ? data : (data && data.members) || [];
      this.notify('members');
      return this.members;
    } catch (err) {
      console.warn('Erro ao carregar membros da API:', err);
      return this.members;
    }
  }

  getMembers() {
    return this.members;
  }

  getMemberById(id) {
    return this.members.find(m => String(m.id) === String(id)) || null;
  }

  getCelebrants() {
    return this.members.filter(m => 
      m.profile === 'celebrante' || 
      m.profile === 'celebrant' || 
      m.profile === 'diacono' || 
      m.profile === 'deacon' || 
      (m.name && (m.name.startsWith('Pe.') || m.name.startsWith('Dom ') || m.name.startsWith('Diác.')))
    );
  }

  async addMember(memberData) {
    try {
      const payload = {
        church_id: memberData.church_id || (this.currentUser && this.currentUser.churchId) || 1,
        name: memberData.name,
        phone: memberData.phone,
        status: memberData.status || 'ativo',
        profile: memberData.profile || 'minister',
        experience: memberData.experience || '',
        start_date: memberData.start_date || memberData.startDate || null,
        avatar: memberData.avatar || null
      };

      const created = await window.api.members.create(payload);
      const newMember = created || { id: 'm-' + Date.now(), ...payload };
      this.members.unshift(newMember);
      this.notify('members');
      return newMember;
    } catch (err) {
      console.error('Erro ao adicionar membro:', err);
      if (window.showToast) window.showToast('Erro ao salvar membro no servidor.', 3500);
      throw err;
    }
  }

  async updateMember(id, updatedData) {
    try {
      const payload = {
        name: updatedData.name,
        phone: updatedData.phone,
        status: updatedData.status,
        profile: updatedData.profile,
        experience: updatedData.experience,
        start_date: updatedData.start_date || updatedData.startDate,
        avatar: updatedData.avatar
      };

      const updated = await window.api.members.update(id, payload);
      const idx = this.members.findIndex(m => String(m.id) === String(id));
      if (idx !== -1) {
        this.members[idx] = { ...this.members[idx], ...(updated || payload) };
      }
      this.notify('members');
      return this.members[idx];
    } catch (err) {
      console.error('Erro ao atualizar membro:', err);
      if (window.showToast) window.showToast('Erro ao atualizar membro no servidor.', 3500);
      throw err;
    }
  }

  async deleteMember(id) {
    try {
      await window.api.members.delete(id);
      this.members = this.members.filter(m => String(m.id) !== String(id));
      this.notify('members');
    } catch (err) {
      console.error('Erro ao excluir membro:', err);
      if (window.showToast) window.showToast('Erro ao excluir membro no servidor.', 3500);
      throw err;
    }
  }

  getMemberStats() {
    const active = this.members.filter(m => m.status === 'ativo').length;
    const leave = this.members.filter(m => m.status === 'licenca').length;
    return {
      total: this.members.length,
      active,
      leave
    };
  }

  // ==========================================
  // ESCALAS & EVENTOS LITÚRGICOS
  // ==========================================
  async fetchScales(year, month, churchId) {
    const cid = churchId || (this.currentUser && this.currentUser.churchId);
    try {
      const data = await window.api.events.list({
        year,
        month,
        church_id: cid
      });

      const rawEvents = Array.isArray(data) ? data : (data && data.events) || [];
      
      // Normalização de eventos para formato padrão da UI
      this.scales = rawEvents.map(evt => {
        const dateObj = evt.date ? new Date(evt.date) : new Date();
        const y = evt.year || (evt.date ? parseInt(evt.date.substring(0, 4), 10) : year);
        const m = evt.month || (evt.date ? parseInt(evt.date.substring(5, 7), 10) : month);
        const d = evt.day || (evt.date ? parseInt(evt.date.substring(8, 10), 10) : dateObj.getDate());
        const dateString = evt.date_string || evt.date || `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const time = (evt.time || '19:00').substring(0, 5);

        return {
          id: evt.id,
          church_id: evt.church_id,
          celebration_id: evt.celebration_id,
          year: y,
          month: m,
          day: d,
          dateString: dateString,
          dayOfWeek: evt.day_of_week || evt.dayOfWeek || 'DOM',
          time: time,
          title: evt.title || `Data: ${dateString}`,
          celebrationName: evt.celebration_name || evt.celebrationName || 'Santa Missa',
          celebrant: evt.celebrant || '',
          subtitle: evt.subtitle || '',
          observation: evt.observation || '',
          ministers: (evt.ministers || evt.members || []).map(m => ({
            id: m.id || m.member_id,
            name: m.name || '',
            phone: m.phone || '',
            avatar: m.avatar || null
          }))
        };
      });

      this.notify('scales');
      return this.scales;
    } catch (err) {
      console.warn('Erro ao carregar escalas da API:', err);
      return this.scales;
    }
  }

  getScales() {
    return this.scales;
  }

  getScaleByDateAndHour(dateString, hour) {
    if (hour && hour !== 'todos') {
      const hStr = hour.substring(0, 2);
      return this.scales.find(s => s.dateString === dateString && s.time.startsWith(hStr));
    }
    return this.scales.find(s => s.dateString === dateString);
  }

  getScalesForMonth(year, month) {
    return this.scales.filter(s => s.year === year && s.month === month);
  }

  async saveScale(scaleData) {
    try {
      const churchId = scaleData.church_id || (this.currentUser && this.currentUser.churchId) || 1;
      const ministersIds = (scaleData.ministers || []).map(m => typeof m === 'object' ? m.id : m);

      const payload = {
        church_id: churchId,
        celebration_id: scaleData.celebration_id,
        celebration_name: scaleData.celebrationName,
        date: scaleData.dateString,
        time: scaleData.time,
        celebrant: scaleData.celebrant,
        subtitle: scaleData.subtitle || '',
        observation: scaleData.observation || '',
        ministers: ministersIds,
        member_ids: ministersIds
      };

      let result;
      // Se existe scaleData.id e não é gerado temporariamente
      if (scaleData.id && !String(scaleData.id).startsWith('scale-')) {
        result = await window.api.events.update(scaleData.id, payload);
      } else {
        result = await window.api.events.create(payload);
      }

      // Recarrega escalas do mês para sincronização completa
      if (scaleData.year && scaleData.month) {
        await this.fetchScales(scaleData.year, scaleData.month, churchId);
      } else {
        this.notify('scales');
      }

      return result;
    } catch (err) {
      console.error('Erro ao salvar escala:', err);
      if (window.showToast) window.showToast('Erro ao salvar escala no servidor.', 3500);
      throw err;
    }
  }

  async deleteScale(id) {
    try {
      await window.api.events.delete(id);
      this.scales = this.scales.filter(s => String(s.id) !== String(id));
      this.notify('scales');
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      if (window.showToast) window.showToast('Erro ao excluir escala no servidor.', 3500);
      throw err;
    }
  }

  // ==========================================
  // GESTÃO DE USUÁRIOS DO SISTEMA
  // ==========================================
  async fetchSystemUsers() {
    try {
      const data = await window.api.users.list();
      this.systemUsers = Array.isArray(data) ? data : (data && data.users) || [];
      this.notify('users');
      return this.systemUsers;
    } catch (err) {
      console.warn('Erro ao carregar usuários da API:', err);
      return this.systemUsers;
    }
  }

  getUsersList() {
    return this.systemUsers;
  }

  getUserById(id) {
    return this.systemUsers.find(u => String(u.id) === String(id)) || null;
  }

  async saveUserToList(userData) {
    try {
      const payload = {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        role: userData.role || 'visitor',
        role_name: userData.roleName || (userData.role === 'admin' ? 'Administrador' : (userData.role === 'coordinator' ? 'Coordenador' : 'Visitante')),
        status: userData.status || 'ativo',
        church_ids: userData.churches || ['1'],
        password: userData.password || undefined
      };

      let result;
      if (userData.id && !String(userData.id).startsWith('u-')) {
        result = await window.api.users.update(userData.id, payload);
      } else {
        result = await window.api.users.create(payload);
      }

      await this.fetchSystemUsers();
      return result;
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      if (window.showToast) window.showToast('Erro ao salvar usuário no servidor.', 3500);
      throw err;
    }
  }

  async deleteUserFromList(id) {
    try {
      await window.api.users.delete(id);
      this.systemUsers = this.systemUsers.filter(u => String(u.id) !== String(id));
      this.notify('users');
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      if (window.showToast) window.showToast('Erro ao excluir usuário no servidor.', 3500);
      throw err;
    }
  }

  async toggleUserStatusInList(id) {
    try {
      const user = this.systemUsers.find(u => String(u.id) === String(id));
      if (!user) return null;
      const updated = await window.api.users.toggleStatus(id, user.status);
      user.status = user.status === 'ativo' ? 'inativo' : 'ativo';
      this.notify('users');
      return updated || user;
    } catch (err) {
      console.error('Erro ao alternar status do usuário:', err);
      if (window.showToast) window.showToast('Erro ao alterar status do usuário.', 3500);
      throw err;
    }
  }

  getUserStats() {
    const list = this.getUsersList();
    const total = list.length;
    const admins = list.filter(u => u.role === 'admin').length;
    const coordinators = list.filter(u => u.role === 'coordinator').length;
    const visitors = list.filter(u => u.role === 'visitor').length;
    const active = list.filter(u => u.status === 'ativo').length;
    const inactive = list.filter(u => u.status === 'inativo').length;

    return {
      total,
      admins,
      coordinators,
      visitors,
      active,
      inactive
    };
  }

  // ==========================================
  // INSCRIÇÃO REATIVA EM EVENTOS
  // ==========================================
  subscribe(eventOrCallback, maybeCallback) {
    let callback;
    let targetEvent = null;

    if (typeof eventOrCallback === 'function') {
      callback = eventOrCallback;
    } else if (typeof eventOrCallback === 'string' && typeof maybeCallback === 'function') {
      targetEvent = eventOrCallback;
      callback = (evt, store) => {
        if (!targetEvent || evt === targetEvent) {
          maybeCallback(evt, store);
        }
      };
    }

    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      return () => {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
      };
    }
    return () => {};
  }

  notify(event) {
    this.subscribers.forEach(cb => {
      if (typeof cb === 'function') {
        try {
          cb(event, this);
        } catch (e) {
          console.error('Erro ao executar subscriber do store:', e);
        }
      }
    });
  }
}

// Instância global do Store
window.appStore = new Store();
