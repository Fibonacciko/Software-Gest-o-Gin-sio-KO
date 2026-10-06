/**
 * As categorias de despesa, num sítio só.
 *
 * Estavam escritas duas vezes — nas Finanças e nos Relatórios — e bastava
 * acrescentar uma categoria num lado para o outro passar a mostrar o nome
 * técnico em inglês.
 */

/** As que o formulário oferece, pela ordem que o dono do ginásio escolheu. */
export const CATEGORIAS_DE_DESPESA = [
  'rent', 'salaries', 'accountant', 'technology', 'energy',
  'infrastructure', 'merchandise', 'marketing', 'licenses', 'fnb'
];

export const NOME_DA_CATEGORIA = {
  rent: 'Renda',
  salaries: 'Salários',
  accountant: 'Contabilista',
  technology: 'Tecnologia',
  energy: 'Energia',
  infrastructure: 'Infraestruturas',
  merchandise: 'Merchandise',
  marketing: 'Marketing',
  licenses: 'Licenças',
  fnb: 'F&B',
  // Categorias usadas antes de a lista ter sido revista. Continuam a existir
  // nas despesas de 2025 e do início de 2026, por isso precisam de nome.
  teachers: 'Professores',
  collaborators: 'Colaboradores',
  maintenance: 'Manutenção',
  equipment: 'Equipamento',
  utilities: 'Serviços (água, luz)',
  products: 'Produtos',
  cleaning: 'Limpeza',
  insurance: 'Seguros',
  misc: 'Diversos',
  other: 'Outros'
};

/** O nome da categoria. Uma categoria desconhecida mostra-se como está. */
export const nomeDaCategoria = (id) => NOME_DA_CATEGORIA[id] || id || 'Sem categoria';
