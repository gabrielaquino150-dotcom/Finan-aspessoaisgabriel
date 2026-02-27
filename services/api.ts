import { User, Transaction, Goal } from '../types';

/**
 * EQUILIBRIUM FINANCIAL - API LAYER
 * 
 * Em um ambiente de produção real, este arquivo conteria chamadas 'axios' ou 'fetch'
 * para o seu backend Node.js + Express.
 * 
 * Como estamos rodando em ambiente local/browser, implementamos uma simulação
 * de banco de dados relacional usando LocalStorage para garantir persistência
 * e integridade de dados multi-usuário.
 */

const STORAGE_KEYS = {
  USERS: 'eq_users',
  TRANSACTIONS: 'eq_transactions',
  GOALS: 'eq_goals',
  SESSION: 'eq_session_user'
};

// --- AUTHENTICATION SERVICES ---

export const apiAuth = {
  register: async (name: string, email: string, password: string): Promise<User> => {
    // Simulate API Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const users: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    if (users.find(u => u.email === email)) {
      throw new Error("Email já cadastrado no sistema.");
    }

    // In a real backend, we would use bcrypt.hash(password, 10) here
    // and NEVER store plain text passwords.
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password, // Simulated storage
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Return user without password
    const { password: _, ...userSafe } = newUser;
    return userSafe;
  },

  login: async (email: string, password: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    const users: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new Error("Credenciais inválidas.");
    }

    const { password: _, ...userSafe } = user;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userSafe));
    return userSafe;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getSession: (): User | null => {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  }
};

// --- DATA SERVICES (CRUD) ---

export const apiData = {
  // Transactions
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    
    // PROTOCOLO DE RESGATE DE DADOS (Data Rescue Protocol):
    // Como removemos a barreira de login, o sistema agora opera em modo "Single User Local".
    // Para evitar que dados criados em sessões anteriores (com outros IDs) fiquem ocultos,
    // nós forçamos a migração de TUDO que está no LocalStorage para o usuário atual.
    
    let hasChanges = false;
    const rescuedTx = allTx.map(t => {
      // Se a transação pertence a outro ID (ex: sessão antiga) ou não tem ID,
      // trazemos para o usuário atual.
      if (t.userId !== userId) {
        hasChanges = true;
        return { ...t, userId };
      }
      return t;
    });

    if (hasChanges) {
      console.log(`[Equilibrium System] Resgatados ${rescuedTx.length} registros para o usuário atual.`);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(rescuedTx));
    }

    // Retorna tudo, pois agora garantimos que tudo pertence ao usuário atual
    return rescuedTx;
  },

  saveTransactions: async (newTransactions: Transaction[]): Promise<void> => {
    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    
    // Safety check: ensure we don't duplicate by ID if something weird happens
    const existingIds = new Set(allTx.map(t => t.id));
    const uniqueNewTx = newTransactions.filter(t => !existingIds.has(t.id));

    const updated = [...allTx, ...uniqueNewTx];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  deleteTransaction: async (txId: string): Promise<void> => {
    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    const updated = allTx.filter(t => t.id !== txId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  // Goals
  getGoals: async (userId: string): Promise<Goal[]> => {
    const rawData = localStorage.getItem(STORAGE_KEYS.GOALS);
    const allGoals: Goal[] = rawData ? JSON.parse(rawData) : [];
    
    // PROTOCOLO DE RESGATE DE METAS
    // Mesma lógica das transações: Traz todas as metas do storage para o usuário atual.
    let hasChanges = false;
    const rescuedGoals = allGoals.map(g => {
        if (g.userId !== userId) {
            hasChanges = true;
            return { ...g, userId };
        }
        return g;
    });

    if (hasChanges) {
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(rescuedGoals));
    }

    const userGoals = rescuedGoals; // Retorna tudo
    
    // Se realmente não houver nada no storage (primeiro uso absoluto), cria padrões
    if (userGoals.length === 0) {
      const defaults: Goal[] = [
        { id: crypto.randomUUID(), userId, name: 'Reserva de Emergência', targetAmount: 10000, currentAmount: 0, deadline: '2025-12-31', color: '#10b981' },
        { id: crypto.randomUUID(), userId, name: 'Objetivo Curto Prazo', targetAmount: 2000, currentAmount: 0, deadline: '2024-12-31', color: '#3b82f6' }
      ];
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(defaults));
      return defaults;
    }
    
    return userGoals;
  }
};