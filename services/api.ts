import { User, Transaction, Goal } from '../types';
import { supabase } from '../lib/supabase';

/**
 * EQUILIBRIUM FINANCIAL - API LAYER
 * 
 * Este arquivo gerencia a persistência de dados.
 * Prioriza o Supabase se configurado, caso contrário usa LocalStorage.
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Erro ao criar usuário.");

    const newUser: User = {
      id: data.user.id,
      name: data.user.user_metadata.name || name,
      email: data.user.email || email,
      createdAt: data.user.created_at
    };

    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));
    return newUser;
  },

  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error("Usuário não encontrado.");

    const user: User = {
      id: data.user.id,
      name: data.user.user_metadata.name || 'Usuário',
      email: data.user.email || email,
      createdAt: data.user.created_at
    };

    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await supabase.auth.signOut();
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
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId);

      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to LocalStorage', e);
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    return allTx.map(t => ({ ...t, userId }));
  },

  saveTransactions: async (newTransactions: Transaction[]): Promise<void> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .upsert(newTransactions);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase save failed, using LocalStorage', e);
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    const existingIds = new Set(allTx.map(t => t.id));
    const uniqueNewTx = newTransactions.filter(t => !existingIds.has(t.id));
    const updated = [...allTx, ...uniqueNewTx];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  deleteTransaction: async (txId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase delete failed, using LocalStorage', e);
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    const updated = allTx.filter(t => t.id !== txId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  updateTransaction: async (transaction: Transaction): Promise<void> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', transaction.id);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase update failed, using LocalStorage', e);
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const allTx: Transaction[] = rawData ? JSON.parse(rawData) : [];
    const updated = allTx.map(t => t.id === transaction.id ? transaction : t);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  restoreData: async (transactions: Transaction[], goals: Goal[]): Promise<void> => {
    try {
      await supabase.from('transactions').delete().neq('id', '0'); // Clear all
      await supabase.from('goals').delete().neq('id', '0'); // Clear all
      await supabase.from('transactions').insert(transactions);
      await supabase.from('goals').insert(goals);
    } catch (e) {
      console.warn('Supabase restore failed', e);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  // Goals
  getGoals: async (userId: string): Promise<Goal[]> => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('userId', userId);

      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase goals fetch failed', e);
    }

    const rawData = localStorage.getItem(STORAGE_KEYS.GOALS);
    const allGoals: Goal[] = rawData ? JSON.parse(rawData) : [];
    
    if (allGoals.length === 0) {
      const defaults: Goal[] = [
        { id: crypto.randomUUID(), userId, name: 'Reserva de Emergência', targetAmount: 10000, currentAmount: 0, deadline: '2025-12-31', color: '#10b981' },
        { id: crypto.randomUUID(), userId, name: 'Objetivo Curto Prazo', targetAmount: 2000, currentAmount: 0, deadline: '2024-12-31', color: '#3b82f6' }
      ];
      return defaults;
    }
    
    return allGoals.map(g => ({ ...g, userId }));
  }
};
