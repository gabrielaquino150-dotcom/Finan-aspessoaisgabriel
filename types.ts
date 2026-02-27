export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string; // Foreign Key
  date: string; // ISO Date string YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string;
  isFixed: boolean;
  installmentTotal?: number;
  installmentCurrent?: number;
  relatedGroupId?: string;
  paymentMethod?: string;
  bank?: string;
  originalDate?: string; // Data real da compra (para referência)
}

export interface Goal {
  id: string;
  userId: string; // Foreign Key
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

// Default Categories (System Default)
export const DEFAULT_CATEGORIES = {
  INCOME: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
  EXPENSE: [
    'Moradia',
    'Transporte',
    'Alimentação',
    'Saúde',
    'Pessoal',
    'Dívidas',
    'Investimentos',
    'Dízimo e Doações'
  ]
};

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  'Moradia': ['Aluguel/Hipoteca', 'Luz', 'Água', 'Internet', 'Manutenção'],
  'Transporte': ['Combustível', 'Manutenção', 'Seguro', 'Transporte Público', 'Uber/Táxi'],
  'Alimentação': ['Mercado', 'Restaurantes', 'Delivery', 'Café'],
  'Saúde': ['Plano de Saúde', 'Médicos', 'Farmácia', 'Terapia', 'Academia'],
  'Pessoal': ['Vestuário', 'Calçados', 'Eletrônicos', 'Assinaturas', 'Lazer', 'Educação', 'Compras Online', 'Presentes', 'Produtos de Beleza'],
  'Dívidas': ['Cartão de Crédito', 'Empréstimos', 'Financiamentos'],
  'Investimentos': ['Reserva de Emergência', 'Aposentadoria', 'Fundo de Viagem', 'Geral'],
  'Dízimo e Doações': ['Dízimo', 'Ofertas', 'Caridade', 'Outros']
};

export const PAYMENT_METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'CASH', label: 'Dinheiro' },
];

export interface BankConfig {
  value: string;
  label: string;
  closingDay: number;
  dueDay: number;
}

export const BANKS: BankConfig[] = [
  { value: 'Bradesco', label: 'Bradesco', closingDay: 26, dueDay: 12 },
  { value: 'Mercado Pago', label: 'Mercado Pago', closingDay: 5, dueDay: 10 },
  { value: 'Inter', label: 'Inter', closingDay: 5, dueDay: 12 },
  { value: 'Nubank', label: 'Nubank', closingDay: 1, dueDay: 7 }, // Exemplo genérico
  { value: 'Itaú', label: 'Itaú', closingDay: 2, dueDay: 10 },    // Exemplo genérico
];
