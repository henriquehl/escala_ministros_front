/**
 * Store Central do Portal Pastoral MESC
 * Gerencia persistência em localStorage e emissão de eventos reativos
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

const STORAGE_KEY_MEMBERS = 'mesc_portal_members_v2';
const STORAGE_KEY_SCALES = 'mesc_portal_scales_v3';
const STORAGE_KEY_USER = 'mesc_portal_user_v2';
const STORAGE_KEY_CELEBRATIONS = 'mesc_portal_celebrations_v2';

// Lista Padrão de Celebrações Litúrgicas
const INITIAL_CELEBRATIONS = [
  {
    id: 'cel-1',
    name: 'Santa Missa Dominical',
    category: 'dominical',
    icon: 'church',
    description: 'Celebração principal dos preceitos dominicais com toda a comunidade paroquial.',
    minMinisters: 4,
    isDefault: true
  },
  {
    id: 'cel-2',
    name: 'Santa Missa Semanal',
    category: 'semanal',
    icon: 'wb_sunny',
    description: 'Celebrações de terça a sexta-feira na Matriz e Capelas paroquiais.',
    minMinisters: 2,
    isDefault: true
  },
  {
    id: 'cel-3',
    name: 'Missa da Primeira Sexta-feira (Sagrado Coração)',
    category: 'especial',
    icon: 'favorite',
    description: 'Missa devocional com bênção do Santíssimo Sacramento e comunhão reparadora.',
    minMinisters: 3,
    isDefault: true
  },
  {
    id: 'cel-4',
    name: 'Missa Vespertina de Sábado',
    category: 'dominical',
    icon: 'nights_stay',
    description: 'Missa vespertina com liturgia antecipada do Domingo.',
    minMinisters: 3,
    isDefault: true
  },
  {
    id: 'cel-5',
    name: 'Solenidade de Nossa Senhora Aparecida',
    category: 'solenidade',
    icon: 'star',
    description: 'Solenidade da Padroeira do Brasil com procissão e bênção especial.',
    minMinisters: 6,
    isDefault: true
  },
  {
    id: 'cel-6',
    name: 'Missa com Sacramento do Batismo',
    category: 'sacramento',
    icon: 'water_drop',
    description: 'Missa comunitária com acolhida e unção dos novos batizandos.',
    minMinisters: 3,
    isDefault: true
  },
  {
    id: 'cel-7',
    name: 'Missa de Casamento / Matrimônio',
    category: 'sacramento',
    icon: 'favorite_border',
    description: 'Celebração nupcial com bênção dos anéis e comunhão dos noivos.',
    minMinisters: 2,
    isDefault: true
  },
  {
    id: 'cel-8',
    name: 'Missa das Crianças / Catequese',
    category: 'especial',
    icon: 'child_care',
    description: 'Liturgia participativa voltada à infância e perseverança na fé.',
    minMinisters: 3,
    isDefault: true
  },
  {
    id: 'cel-9',
    name: 'Missa dos Enfermos e Saúde',
    category: 'especial',
    icon: 'healing',
    description: 'Celebração com Unção dos Enfermos e acolhida pastoral de cuidadores.',
    minMinisters: 4,
    isDefault: true
  },
  {
    id: 'cel-10',
    name: 'Missa de 7º Dia / Exéquias',
    category: 'especial',
    icon: 'candle',
    description: 'Celebração em sufrágio pelas almas e conforto às famílias enlutadas.',
    minMinisters: 2,
    isDefault: true
  },
  {
    id: 'cel-11',
    name: 'Celebração da Palavra com Comunhão',
    category: 'semanal',
    icon: 'auto_stories',
    description: 'Rito litúrgico presidido por Ministro Extraordinário na ausência do sacerdote.',
    minMinisters: 2,
    isDefault: true
  }
];


// Dados Iniciais de Membros (Seed - Apenas Ativos e Licença)
const INITIAL_MEMBERS = [
  {
    id: 'm-1',
    name: 'Antônio Carlos Silveira',
    phone: '(11) 99999-0001',
    status: 'ativo',
    experience: '15 anos de Ministério',
    schedule: 'Domingos: 08:00 e 19:00',
    specialties: ['Coordenação', 'Altar Principal & Rito'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzxt_yGxBs8rXNgxx97LdaE-1MojNEJZYj_Dky6lpz9bbLYJjVCLRNEtkxFTWAiQvRS4wRA8fJxZCa7z2yrHfm4xhMOngvmEBAmeEVCZraQPTNi7KLkqChT33EcTI68t9W6VcIs4vOAXnzYtan4V8LfS3cq1sDFUaPwVUeoje1lj9-s7GYzkcE6arqxFXb1jEk3c4BaA5DnC97rwbXQZlxoXjatKsFT5UzajVeu-i5Ox_otka2gKj0nA'
  },
  {
    id: 'm-2',
    name: 'Maria Aparecida Santos',
    phone: '(11) 98214-5501',
    status: 'ativo',
    experience: '12 anos de Ministério',
    schedule: 'Domingos: 08:00 e 19:00',
    specialties: ['Nave Direita & Coro', 'Cálice 1'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO2tztieShl3qdkwDTY23xKTIRrkeJSLRCQbymD6RyfDDUypzxYLZBaLyJz-KZTEQ1Cv5issZUK8di09K6thtWr-D7CUwPMpVCiB3mEzXcle1TOGubBFF74KFHlMLfZU8XqHLiYazrOMfw80zn1fri9v8rZ7dGaZGT_UovwntfeXyRSGLypPZN5DOTQRIYb3vvfYi-VbaJjk-ZsAB19TZRWc5sbfirsda4ANsQ1SxZ9nq0uGm7BZ1AQg'
  },
  {
    id: 'm-3',
    name: 'Maria Helena Fontes',
    phone: '(11) 99999-0002',
    status: 'ativo',
    experience: '8 anos de Ministério',
    schedule: 'Domingos: 19:00',
    specialties: ['Nave Direita & Coro'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuIoMxV182mAVtJs1bTDQRd874xQAlY5LkIbuXMoFm_6Ng7KIXHRguz5ssr2RzvIx0Si7UGF9R8j94uqXkfzeWmKSAlcvJMiLqPTUFA-UvSMl02kcqwp45opT3OKghLCCRHJ4vHShhPQ-o7uLnMrDhBkH49745Ycm1CSlhcuh47NZyi6OuGlKPvuU_BLUNXXv5NLdVAtJ6GpQGC3AX22xZufKDqpISxJ-V0GVVEs0-pym1sGRcldaHRw'
  },
  {
    id: 'm-4',
    name: 'Roberto Prado',
    phone: '(11) 99999-0003',
    status: 'ativo',
    experience: '5 anos de Ministério',
    schedule: 'Sábados: 19:30 | Domingos: 10:00',
    specialties: ['Nave Esquerda & Galeria'],
    avatar: null // Initials RP
  },
  {
    id: 'm-5',
    name: 'Luciana Vasconcelos',
    phone: '(11) 99999-0004',
    status: 'ativo',
    experience: '7 anos de Ministério',
    schedule: 'Domingos: 08:00 e 19:00',
    specialties: ['Comunhão aos Enfermos'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5AIwVCf1sdgFhiPTOXfJHKouK3iXJPazwuXO_TyAiP3pVyvGGOLGY5_1d-oH9tuB0knIws9kPhmXiav4-Uj626s4Exc9ewSygihrjTm1YBJUqgHWLQ4tStDSymeswuzC8iTF3NdIRS2uUZp_-x5ylMPTAJSL-kwFcW2CLk4RGyKDy633oPShN2AoHXLp6hprVa5GtX9tOsuzWqcXi_z5zTr-oCUgi3BOYswJk679n6e2ysgd2oh4oIA'
  },
  {
    id: 'm-6',
    name: 'João Marcos Tavares',
    phone: '(11) 99999-0005',
    status: 'ativo',
    experience: '10 anos de Ministério',
    schedule: 'Domingos: 19:00',
    specialties: ['Sacristia & Alfaias'],
    avatar: null // Initials JM
  },
  {
    id: 'm-7',
    name: 'Antônio Carlos Ribeiro',
    phone: '(11) 97130-9942',
    status: 'ativo',
    experience: 'Coord. Setor (14 anos)',
    schedule: 'Sábados: 19:30 | Altar & Enfermos',
    specialties: ['Coordenação', 'Altar Principal'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMO4mHrUQawsafUppNVyJPI06wpk5OiCMvrd9UWb8I7Qc6vKXoEKMv4Zs5AcH-J8V5bXhLEmquvFz_K0CLce83LTfG32YbMrIWtP9Q93296A8KrzHsKZjWm-cb33h9Gttdf-5IPHySsm3QJ_ZvB7ZfAtCPDKK-1Wq6YlCW51SsGkYcgPBIo1cq4do6TOubBT6aK2uqAqoDjOQRmHqkKsGkFf_hn9Tp_Ro_5MgfvNaCasCcpXHqzbl9xA'
  },
  {
    id: 'm-8',
    name: 'Gabriel de Souza Lima',
    phone: '(11) 94812-3329',
    status: 'ativo',
    experience: '2 anos de Ministério',
    schedule: 'Domingos: 10:00 e 18:00',
    specialties: ['Nave Central'],
    avatar: null // Initials GS
  },
  {
    id: 'm-9',
    name: 'Maria Helena Duarte',
    phone: '(11) 96522-8700',
    status: 'licenca',
    experience: 'Retorno previsto: Março 2025',
    schedule: 'Licença Médica',
    specialties: ['Oração Fraterna'],
    avatar: null // Initials MD
  },
  {
    id: 'm-10',
    name: 'Francisco Andrade',
    phone: '(11) 98111-2233',
    status: 'ativo',
    experience: '9 anos de Ministério',
    schedule: 'Domingos: 10:00 e 19:00',
    specialties: ['Coordenação', 'Cálice 1'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsHxdM1vRgCisJMeheYf4TaGHwf17_1zILg6K9eJbp8w2yBTn3Mw8RNMfnlQjuqv_qFqX3ulGDzaeXxbW_zTQU9qqFkz-ifnW1BstJQ1k5sEb-eteuPhtfceallVptJyQf525IA-ph_SrAYaGdM-G39GRfeZ00bGGpukvnDSZP7p6wYMV8Wooc5nCm7LdZQOOzqpBzH51taiiUg1s4a6e0X-04O5m3x0tdHJCQUTt0WcGPd1StMmrI_A'
  },
  {
    id: 'm-11',
    name: 'Maria Tereza Silveira',
    phone: '(11) 98444-5566',
    status: 'ativo',
    experience: '11 anos de Ministério',
    schedule: 'Domingos: 10:00',
    specialties: ['Cálice 1'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUl7SyWOKo43zLm1uJ1kRoYRbNtq52aXb2mS7oQtgFmUU8Z96TrT-BjuNLyb9-R3r9l5IhD2wL9igOibLLftsKvLjn1I79Ci311jpvGgLy76ncEpWc9m4hVUJAWIH0xpsTWhad7qexyY7rxeura8mH9aum5EIf41G214cP4r95tIT2bJQgVtAwXHQ-5uQrECn9I9Gam7Jykq_bYrFZMGTetJtSIANSPL65w1FQI5GVXUQoRO-bCUro0g'
  },
  {
    id: 'm-12',
    name: 'Lucas Mendonça',
    phone: '(11) 98777-8899',
    status: 'ativo',
    experience: '4 anos de Ministério',
    schedule: 'Domingos: 10:00 e 19:00',
    specialties: ['Cálice 2'],
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjKQa39MuPn9WIV8dSQFzUU2jkm_bq2fZTNzktesP765C7w87hg5hvSIpASrCenUWqvv0MEM1iwfXX4dGitEvMwZGgVopJkQBKKf7OKqfKt_5NDr1yzeZtA5--PA3u4RM7k1LxKxo_Vy7Wc-pMtI1p6OC9vV1sawFpVSWD4DhzFbwjrAxkZpWWpUebxQLR6YEBstedJTRhH2Pp0dWZ0RPCijH5JY8GjbMBTAQOUijnM1W6bR4DnuAfsg'
  },
  {
    id: 'm-13',
    name: 'Regina Célia Prado',
    phone: '(11) 98888-9900',
    status: 'ativo',
    experience: '6 anos de Ministério',
    schedule: 'Domingos: 10:00',
    specialties: ['Nave Central'],
    avatar: null
  },
  {
    id: 'm-14',
    name: 'Gabriel Alencar',
    phone: '(11) 97766-5544',
    status: 'ativo',
    experience: '3 anos de Ministério',
    schedule: 'Domingos: 08:00',
    specialties: ['Nave Central'],
    avatar: null
  },
  {
    id: 'm-15',
    name: 'Benedito Lima',
    phone: '(11) 97321-6543',
    status: 'ativo',
    experience: '5 anos de Ministério',
    schedule: 'Sábados: 19:30',
    specialties: ['Sacristia & Alfaias'],
    avatar: null
  },
  {
    id: 'm-16',
    name: 'Clara Fernandes',
    phone: '(11) 99123-4567',
    status: 'ativo',
    experience: '8 anos de Ministério',
    schedule: 'Domingos: 08:00 e 19:00',
    specialties: ['Altar Principal'],
    avatar: null
  }
];

// Dados Iniciais de Escalas (Seed - Outubro 2025)
const INITIAL_SCALES = [
  {
    id: 'scale-2025-10-05-1900',
    year: 2025,
    month: 10,
    day: 5,
    dateString: '2025-10-05',
    dayOfWeek: 'DOM',
    time: '19:00',
    title: 'Domingo, 05/10/2025',
    celebrationName: '27º Domingo do Tempo Comum',
    celebrant: 'Pe. Marcelo Rossi (Pároco)',
    isSolemnity: false,
    maxSlots: 4,
    ministers: [
      { id: 'm-1', name: 'Antônio Carlos Silveira', role: 'Altar Principal & Rito', isLeader: true, confirmed: true, phone: '(11) 99999-0001', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzxt_yGxBs8rXNgxx97LdaE-1MojNEJZYj_Dky6lpz9bbLYJjVCLRNEtkxFTWAiQvRS4wRA8fJxZCa7z2yrHfm4xhMOngvmEBAmeEVCZraQPTNi7KLkqChT33EcTI68t9W6VcIs4vOAXnzYtan4V8LfS3cq1sDFUaPwVUeoje1lj9-s7GYzkcE6arqxFXb1jEk3c4BaA5DnC97rwbXQZlxoXjatKsFT5UzajVeu-i5Ox_otka2gKj0nA' },
      { id: 'm-2', name: 'Maria Aparecida Santos', role: 'Nave Direita & Coro', isLeader: false, confirmed: true, phone: '(11) 98214-5501', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO2tztieShl3qdkwDTY23xKTIRrkeJSLRCQbymD6RyfDDUypzxYLZBaLyJz-KZTEQ1Cv5issZUK8di09K6thtWr-D7CUwPMpVCiB3mEzXcle1TOGubBFF74KFHlMLfZU8XqHLiYazrOMfw80zn1fri9v8rZ7dGaZGT_UovwntfeXyRSGLypPZN5DOTQRIYb3vvfYi-VbaJjk-ZsAB19TZRWc5sbfirsda4ANsQ1SxZ9nq0uGm7BZ1AQg' },
      { id: 'm-5', name: 'Luciana Vasconcelos', role: 'Comunhão aos Enfermos', isLeader: false, confirmed: true, phone: '(11) 99999-0004', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5AIwVCf1sdgFhiPTOXfJHKouK3iXJPazwuXO_TyAiP3pVyvGGOLGY5_1d-oH9tuB0knIws9kPhmXiav4-Uj626s4Exc9ewSygihrjTm1YBJUqgHWLQ4tStDSymeswuzC8iTF3NdIRS2uUZp_-x5ylMPTAJSL-kwFcW2CLk4RGyKDy633oPShN2AoHXLp6hprVa5GtX9tOsuzWqcXi_z5zTr-oCUgi3BOYswJk679n6e2ysgd2oh4oIA' },
      { id: 'm-6', name: 'João Marcos Tavares', role: 'Sacristia & Alfaias', isLeader: false, confirmed: true, phone: '(11) 99999-0005', avatar: null }
    ]
  },
  {
    id: 'scale-2025-10-12-1900',
    year: 2025,
    month: 10,
    day: 12,
    dateString: '2025-10-12',
    dayOfWeek: 'DOM',
    time: '19:00',
    title: 'Domingo, 12/10/2025',
    celebrationName: 'Missa semanal de quarta-feira',
    celebrant: 'Pe. Abcde',
    isSolemnity: false,
    maxSlots: 5,
    ministers: [
      { id: 'm-1', name: 'Antônio Carlos Silveira', role: 'Altar Principal & Rito', isLeader: true, confirmed: true, phone: '(11) 99999-0001', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzxt_yGxBs8rXNgxx97LdaE-1MojNEJZYj_Dky6lpz9bbLYJjVCLRNEtkxFTWAiQvRS4wRA8fJxZCa7z2yrHfm4xhMOngvmEBAmeEVCZraQPTNi7KLkqChT33EcTI68t9W6VcIs4vOAXnzYtan4V8LfS3cq1sDFUaPwVUeoje1lj9-s7GYzkcE6arqxFXb1jEk3c4BaA5DnC97rwbXQZlxoXjatKsFT5UzajVeu-i5Ox_otka2gKj0nA' },
      { id: 'm-3', name: 'Maria Helena Fontes', role: 'Nave Direita & Coro', isLeader: false, confirmed: true, phone: '(11) 99999-0002', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuIoMxV182mAVtJs1bTDQRd874xQAlY5LkIbuXMoFm_6Ng7KIXHRguz5ssr2RzvIx0Si7UGF9R8j94uqXkfzeWmKSAlcvJMiLqPTUFA-UvSMl02kcqwp45opT3OKghLCCRHJ4vHShhPQ-o7uLnMrDhBkH49745Ycm1CSlhcuh47NZyi6OuGlKPvuU_BLUNXXv5NLdVAtJ6GpQGC3AX22xZufKDqpISxJ-V0GVVEs0-pym1sGRcldaHRw' },
      { id: 'm-4', name: 'Roberto Prado', role: 'Nave Esquerda & Galeria', isLeader: false, confirmed: false, phone: '(11) 99999-0003', avatar: null },
      { id: 'm-5', name: 'Luciana Vasconcelos', role: 'Comunhão aos Enfermos', isLeader: false, confirmed: true, phone: '(11) 99999-0004', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5AIwVCf1sdgFhiPTOXfJHKouK3iXJPazwuXO_TyAiP3pVyvGGOLGY5_1d-oH9tuB0knIws9kPhmXiav4-Uj626s4Exc9ewSygihrjTm1YBJUqgHWLQ4tStDSymeswuzC8iTF3NdIRS2uUZp_-x5ylMPTAJSL-kwFcW2CLk4RGyKDy633oPShN2AoHXLp6hprVa5GtX9tOsuzWqcXi_z5zTr-oCUgi3BOYswJk679n6e2ysgd2oh4oIA' },
      { id: 'm-6', name: 'João Marcos Tavares', role: 'Sacristia & Alfaias', isLeader: false, confirmed: true, phone: '(11) 99999-0005', avatar: null }
    ]
  },
  {
    id: 'scale-2025-10-19-1000',
    year: 2025,
    month: 10,
    day: 19,
    dateString: '2025-10-19',
    dayOfWeek: 'DOM',
    time: '10:00',
    title: 'Domingo, 19/10/2025',
    celebrationName: '29º Domingo do Tempo Comum (Cor Verde)',
    celebrant: 'Pe. Marcelo Rossi (Pároco)',
    isSolemnity: false,
    maxSlots: 6,
    ministers: [
      { id: 'm-10', name: 'Francisco Andrade', role: 'Coordenação', isLeader: true, confirmed: true, phone: '(11) 98111-2233', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsHxdM1vRgCisJMeheYf4TaGHwf17_1zILg6K9eJbp8w2yBTn3Mw8RNMfnlQjuqv_qFqX3ulGDzaeXxbW_zTQU9qqFkz-ifnW1BstJQ1k5sEb-eteuPhtfceallVptJyQf525IA-ph_SrAYaGdM-G39GRfeZ00bGGpukvnDSZP7p6wYMV8Wooc5nCm7LdZQOOzqpBzH51taiiUg1s4a6e0X-04O5m3x0tdHJCQUTt0WcGPd1StMmrI_A' },
      { id: 'm-11', name: 'Maria Tereza Silveira', role: 'Cálice 1', isLeader: false, confirmed: true, phone: '(11) 98444-5566', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUl7SyWOKo43zLm1uJ1kRoYRbNtq52aXb2mS7oQtgFmUU8Z96TrT-BjuNLyb9-R3r9l5IhD2wL9igOibLLftsKvLjn1I79Ci311jpvGgLy76ncEpWc9m4hVUJAWIH0xpsTWhad7qexyY7rxeura8mH9aum5EIf41G214cP4r95tIT2bJQgVtAwXHQ-5uQrECn9I9Gam7Jykq_bYrFZMGTetJtSIANSPL65w1FQI5GVXUQoRO-bCUro0g' },
      { id: 'm-12', name: 'Lucas Mendonça', role: 'Cálice 2', isLeader: false, confirmed: true, phone: '(11) 98777-8899', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjKQa39MuPn9WIV8dSQFzUU2jkm_bq2fZTNzktesP765C7w87hg5hvSIpASrCenUWqvv0MEM1iwfXX4dGitEvMwZGgVopJkQBKKf7OKqfKt_5NDr1yzeZtA5--PA3u4RM7k1LxKxo_Vy7Wc-pMtI1p6OC9vV1sawFpVSWD4DhzFbwjrAxkZpWWpUebxQLR6YEBstedJTRhH2Pp0dWZ0RPCijH5JY8GjbMBTAQOUijnM1W6bR4DnuAfsg' },
      { id: 'm-13', name: 'Regina Célia Prado', role: 'Nave Central', isLeader: false, confirmed: true, phone: '(11) 98888-9900', avatar: null }
    ]
  },
  {
    id: 'scale-2025-10-26-1900',
    year: 2025,
    month: 10,
    day: 26,
    dateString: '2025-10-26',
    dayOfWeek: 'DOM',
    time: '19:00',
    title: 'Domingo, 26/10/2025',
    celebrationName: '30º Domingo do Tempo Comum - Missa da Juventude',
    celebrant: 'Pe. Antônio Vieira (Vigário)',
    isSolemnity: false,
    maxSlots: 4,
    ministers: [
      { id: 'm-2', name: 'Maria Aparecida Santos', role: 'Altar Principal', isLeader: true, confirmed: true, phone: '(11) 98214-5501', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBO2tztieShl3qdkwDTY23xKTIRrkeJSLRCQbymD6RyfDDUypzxYLZBaLyJz-KZTEQ1Cv5issZUK8di09K6thtWr-D7CUwPMpVCiB3mEzXcle1TOGubBFF74KFHlMLfZU8XqHLiYazrOMfw80zn1fri9v8rZ7dGaZGT_UovwntfeXyRSGLypPZN5DOTQRIYb3vvfYi-VbaJjk-ZsAB19TZRWc5sbfirsda4ANsQ1SxZ9nq0uGm7BZ1AQg' },
      { id: 'm-7', name: 'Antônio Carlos Ribeiro', role: 'Nave Direita', isLeader: false, confirmed: true, phone: '(11) 97130-9942', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMO4mHrUQawsafUppNVyJPI06wpk5OiCMvrd9UWb8I7Qc6vKXoEKMv4Zs5AcH-J8V5bXhLEmquvFz_K0CLce83LTfG32YbMrIWtP9Q93296A8KrzHsKZjWm-cb33h9Gttdf-5IPHySsm3QJ_ZvB7ZfAtCPDKK-1Wq6YlCW51SsGkYcgPBIo1cq4do6TOubBT6aK2uqAqoDjOQRmHqkKsGkFf_hn9Tp_Ro_5MgfvNaCasCcpXHqzbl9xA' },
      { id: 'm-15', name: 'Benedito Lima', role: 'Sacristia & Alfaias', isLeader: false, confirmed: true, phone: '(11) 97321-6543', avatar: null },
      { id: 'm-16', name: 'Clara Fernandes', role: 'Nave Esquerda', isLeader: false, confirmed: true, phone: '(11) 99123-4567', avatar: null }
    ]
  }
];

class Store {
  constructor() {
    this.subscribers = [];
    this.members = this.loadMembers();
    this.scales = this.loadScales();
    this.celebrations = this.loadCelebrations();
    this.currentUser = this.loadUser();
  }

  // Persistência de Membros
  loadMembers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
      const list = saved ? JSON.parse(saved) : INITIAL_MEMBERS;
      let hasChanges = false;
      const sanitized = list.map((m) => {
        if (m.community !== undefined) {
          hasChanges = true;
          const cleanMember = { ...m };
          delete cleanMember.community;
          return cleanMember;
        }
        return m;
      });
      if (hasChanges && saved) {
        localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch (e) {
      console.warn('Erro ao carregar membros do localStorage', e);
      return INITIAL_MEMBERS;
    }
  }

  saveMembers() {
    try {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(this.members));
    } catch (e) {
      console.error('Erro ao salvar membros', e);
    }
    this.notify('members');
  }

  // Persistência de Escalas
  loadScales() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCALES) || localStorage.getItem('mesc_portal_scales_v2');
      if (!saved) return INITIAL_SCALES;
      const parsed = JSON.parse(saved);
      return parsed.map((scale) => {
        if (scale.id === 'scale-2025-10-12-1900' || (scale.celebrationName && scale.celebrationName.includes('Aparecida'))) {
          return {
            ...scale,
            celebrationName: 'Missa semanal de quarta-feira',
            celebrant: 'Pe. Abcde',
            isSolemnity: false
          };
        }
        return scale;
      });
    } catch (e) {
      console.warn('Erro ao carregar escalas do localStorage', e);
      return INITIAL_SCALES;
    }
  }

  saveScales() {
    try {
      localStorage.setItem(STORAGE_KEY_SCALES, JSON.stringify(this.scales));
    } catch (e) {
      console.error('Erro ao salvar escalas', e);
    }
    this.notify('scales');
  }

  // Persistência do Usuário
  loadUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : { isAdmin: true, roleName: 'Administrador', name: 'Coordenação Geral' };
    } catch (e) {
      return { isAdmin: true, roleName: 'Administrador', name: 'Coordenação Geral' };
    }
  }

  setUser(userObj) {
    this.currentUser = userObj;
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
    } catch (e) {
      console.error('Erro ao salvar sessão', e);
    }
    this.notify('user');
  }

  // Operações de Membros
  getMembers() {
    return this.members;
  }

  getMemberById(id) {
    return this.members.find(m => m.id === id);
  }

  getCelebrants() {
    const fromMembers = this.members.filter(m => 
      m.profile === 'celebrante' || 
      m.profile === 'celebrant' || 
      m.profile === 'diacono' || 
      m.profile === 'deacon' || 
      m.name.startsWith('Pe.') || 
      m.name.startsWith('Dom ') || 
      m.name.startsWith('Diác.')
    );
    if (fromMembers.length > 0) return fromMembers;
    return [
      { id: 'cel-pe-marcelo', name: 'Pe. Marcelo Rossi (Pároco)', profile: 'celebrant' },
      { id: 'cel-pe-antonio', name: 'Pe. Antônio Vieira (Vigário)', profile: 'celebrant' },
      { id: 'cel-dom-orlando', name: 'Dom Orlando (Bispo Convidado)', profile: 'celebrant' },
      { id: 'cel-diac-francisco', name: 'Diác. Francisco Souza (Diácono)', profile: 'deacon' }
    ];
  }

  addMember(memberData) {
    const newMember = {
      id: 'm-' + Date.now(),
      avatar: null,
      ...memberData
    };
    this.members.unshift(newMember);
    this.saveMembers();
    return newMember;
  }

  updateMember(id, updatedData) {
    const idx = this.members.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.members[idx] = { ...this.members[idx], ...updatedData };
      this.saveMembers();
      return this.members[idx];
    }
    return null;
  }

  deleteMember(id) {
    this.members = this.members.filter(m => m.id !== id);
    this.saveMembers();
  }

  // Estatísticas de Membros (Ativos e Licença)
  getMemberStats() {
    const active = this.members.filter(m => m.status === 'ativo').length;
    const leave = this.members.filter(m => m.status === 'licenca').length;
    return {
      total: this.members.length,
      active,
      leave
    };
  }

  // Operações de Escalas
  getScales() {
    return this.scales;
  }

  getScaleByDateAndHour(dateString, hour) {
    if (hour && hour !== 'todos') {
      return this.scales.find(s => s.dateString === dateString && s.time.startsWith(hour.substring(0, 2)));
    }
    return this.scales.find(s => s.dateString === dateString);
  }

  getScalesForMonth(year, month) {
    return this.scales.filter(s => s.year === year && s.month === month);
  }

  saveScale(scaleData) {
    const existingIdx = this.scales.findIndex(s => s.id === scaleData.id || (s.dateString === scaleData.dateString && s.time === scaleData.time));
    if (existingIdx !== -1) {
      this.scales[existingIdx] = { ...this.scales[existingIdx], ...scaleData };
    } else {
      this.scales.push({
        id: scaleData.id || `scale-${scaleData.dateString}-${scaleData.time.replace(':', '')}`,
        ...scaleData
      });
    }
    this.saveScales();
  }

  // Persistência de Celebrações
  loadCelebrations() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CELEBRATIONS);
      if (!saved) return [...INITIAL_CELEBRATIONS];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalizar caso haja strings legadas salvas
        return parsed.map((item, idx) => {
          if (typeof item === 'string') {
            const lower = item.toLowerCase();
            let cat = 'especial';
            let icon = 'church';
            if (lower.includes('dominical') || lower.includes('domingo') || lower.includes('sábado')) {
              cat = 'dominical';
              icon = 'church';
            } else if (lower.includes('semanal') || lower.includes('palavra')) {
              cat = 'semanal';
              icon = 'wb_sunny';
            } else if (lower.includes('solenidade')) {
              cat = 'solenidade';
              icon = 'star';
            } else if (lower.includes('batismo') || lower.includes('casamento') || lower.includes('matrimônio')) {
              cat = 'sacramento';
              icon = 'water_drop';
            }
            return {
              id: `cel-legacy-${idx}-${Date.now()}`,
              name: item,
              category: cat,
              icon,
              description: 'Celebração litúrgica paroquial.',
              minMinisters: 2,
              isDefault: false
            };
          }
          return item;
        });
      }
      return [...INITIAL_CELEBRATIONS];
    } catch (e) {
      console.warn('Erro ao carregar celebrações', e);
      return [...INITIAL_CELEBRATIONS];
    }
  }

  saveCelebrations() {
    try {
      localStorage.setItem(STORAGE_KEY_CELEBRATIONS, JSON.stringify(this.celebrations));
    } catch (e) {
      console.error('Erro ao salvar celebrações', e);
    }
    this.notify('celebrations');
  }

  // Retorna apenas a lista de nomes (para retrocompatibilidade com selects existentes)
  getCelebrations() {
    if (!this.celebrations || this.celebrations.length === 0) {
      this.celebrations = [...INITIAL_CELEBRATIONS];
    }
    return this.celebrations.map(c => typeof c === 'string' ? c : c.name);
  }

  // Retorna os objetos completos de celebrações
  getCelebrationObjects() {
    if (!this.celebrations || this.celebrations.length === 0) {
      this.celebrations = [...INITIAL_CELEBRATIONS];
    }
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
      const cat = c.category || (c.category_id ? c.category_id.replace('cat-', '') : 'especial');
      return {
        ...c,
        category: cat,
        icon: c.icon || (cat === 'semanal' ? 'wb_sunny' : cat === 'solenidade' ? 'star' : cat === 'sacramento' ? 'water_drop' : 'church'),
        minMinisters: c.minMinisters || (cat === 'dominical' || cat === 'solenidade' ? 4 : 2),
        description: c.description || 'Celebração litúrgica paroquial.'
      };
    });
  }

  getCelebrationById(id) {
    const list = this.getCelebrationObjects();
    return list.find(c => c.id === id) || null;
  }

  addCelebration(dataOrName) {
    if (!dataOrName) return null;
    let newCel;
    if (typeof dataOrName === 'string') {
      const trimmed = dataOrName.trim();
      if (!trimmed) return null;
      // Verificar se já existe por nome
      const existing = this.getCelebrationObjects().find(c => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing.name;

      newCel = {
        id: `cel-${Date.now()}`,
        name: trimmed,
        category: 'especial',
        icon: 'church',
        description: 'Celebração cadastrada pela coordenação.',
        minMinisters: 2,
        isDefault: false
      };
    } else {
      newCel = {
        id: dataOrName.id || `cel-${Date.now()}`,
        name: (dataOrName.name || '').trim(),
        category: dataOrName.category || 'especial',
        icon: dataOrName.icon || 'church',
        description: (dataOrName.description || '').trim(),
        minMinisters: dataOrName.minMinisters || 2,
        isDefault: Boolean(dataOrName.isDefault)
      };
    }

    if (!newCel.name) return null;
    if (!this.celebrations) this.celebrations = [...INITIAL_CELEBRATIONS];
    this.celebrations.push(newCel);
    this.saveCelebrations();
    return newCel.name;
  }

  updateCelebration(id, updatedData) {
    if (!this.celebrations) return null;
    const idx = this.celebrations.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.celebrations[idx] = {
        ...this.celebrations[idx],
        ...updatedData
      };
      this.saveCelebrations();
      return this.celebrations[idx];
    }
    return null;
  }

  deleteCelebration(id) {
    if (!this.celebrations) return;
    this.celebrations = this.celebrations.filter(c => c.id !== id);
    this.saveCelebrations();
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


  // Inscrição em Eventos
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify(event) {
    this.subscribers.forEach(cb => cb(event, this));
  }
}

// Instância global do Store
window.appStore = new Store();
