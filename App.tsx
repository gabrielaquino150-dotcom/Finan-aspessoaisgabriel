import React, { useState, useEffect } from 'react';
import { Transaction, Goal, User } from './types';
import { apiData, apiAuth } from './services/api';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import Dashboard from './components/Dashboard';
import ScenarioSimulator from './components/ScenarioSimulator';
import Reports from './components/Reports';
import { LayoutDashboard, Wallet, BrainCircuit, FileBarChart, Menu, X, User as UserIcon } from 'lucide-react';

const DEFAULT_USER: User = {
  id: 'default_guest_user',
  name: 'Usuário Principal',
  email: 'local@equilibrium',
  createdAt: new Date().toISOString()
};

const App: React.FC = () => {
  // App State
  const [view, setView] = useState<'DASHBOARD' | 'TRANSACTIONS' | 'SIMULATOR' | 'REPORTS'>('DASHBOARD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize User (Prioritize session if exists to preserve data from previous login, otherwise Default)
  const [user] = useState<User>(() => apiAuth.getSession() || DEFAULT_USER);

  // Fetch User Data on Mount
  useEffect(() => {
    const loadData = async () => {
      const tx = await apiData.getTransactions(user.id);
      const gl = await apiData.getGoals(user.id);
      setTransactions(tx);
      setGoals(gl);
    };
    loadData();
  }, [user]);

  const handleAddTransactions = async (newTx: Transaction[]) => {
    await apiData.saveTransactions(newTx);
    setTransactions(prev => [...prev, ...newTx]);
  };

  const handleDeleteTransaction = async (id: string) => {
    await apiData.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const NavItem = ({ id, label, icon: Icon }: { id: typeof view, label: string, icon: any }) => (
    <button
      onClick={() => {
        setView(id);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${
        view === id 
          ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Equilibrium</h1>
            <p className="text-xs text-emerald-500 font-mono tracking-widest uppercase">Financial OS</p>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <NavItem id="DASHBOARD" label="Painel" icon={LayoutDashboard} />
          <NavItem id="TRANSACTIONS" label="Transações" icon={Wallet} />
          <NavItem id="SIMULATOR" label="Simulador de Cenários" icon={BrainCircuit} />
          <NavItem id="REPORTS" label="Relatórios & Export" icon={FileBarChart} />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-900/30 text-emerald-400 flex items-center justify-center border border-emerald-900">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <button className="lg:hidden text-slate-400" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-4 ml-auto">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-500">Sessão Ativa</span>
                <span className="text-sm font-medium text-slate-300">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <span className="font-bold text-emerald-500">EF</span>
             </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {view === 'DASHBOARD' && <Dashboard transactions={transactions} />}
            
            {view === 'TRANSACTIONS' && (
              <>
                <TransactionForm userId={user.id} onAddTransaction={handleAddTransactions} />
                <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
              </>
            )}

            {view === 'SIMULATOR' && (
              <ScenarioSimulator transactions={transactions} goals={goals} />
            )}

            {view === 'REPORTS' && (
              <Reports transactions={transactions} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;