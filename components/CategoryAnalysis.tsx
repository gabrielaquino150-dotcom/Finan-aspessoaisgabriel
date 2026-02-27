import React, { useMemo, useState } from 'react';
import { Transaction, PAYMENT_METHODS } from '../types';
import { ChevronDown, ChevronRight, PieChart as PieChartIcon, BarChart3, Wallet, CreditCard, Repeat, ArrowRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const CategoryAnalysis: React.FC<Props> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthData = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const expenses = useMemo(() => monthData.filter(t => t.type === 'EXPENSE'), [monthData]);

  // Grouping logic
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, { total: number; subcategories: Record<string, number> }> = {};
    
    expenses.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = { total: 0, subcategories: {} };
      }
      groups[t.category].total += t.amount;
      
      const sub = t.subCategory || 'Sem Subcategoria';
      groups[t.category].subcategories[sub] = (groups[t.category].subcategories[sub] || 0) + t.amount;
    });

    return Object.entries(groups)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        name,
        total: data.total,
        subcategories: Object.entries(data.subcategories)
          .sort((a, b) => b[1] - a[1])
          .map(([subName, subTotal]) => ({ name: subName, total: subTotal }))
      }));
  }, [expenses]);

  // Financial Structure logic
  const structure = useMemo(() => {
    const fixed = expenses.filter(t => t.isFixed).reduce((acc, t) => acc + t.amount, 0);
    const installments = expenses.filter(t => t.installmentCurrent).reduce((acc, t) => acc + t.amount, 0);
    const variable = expenses.filter(t => !t.isFixed && !t.installmentCurrent).reduce((acc, t) => acc + t.amount, 0);

    const methods: Record<string, number> = {};
    expenses.forEach(t => {
      const m = t.paymentMethod || 'CASH';
      methods[m] = (methods[m] || 0) + t.amount;
    });

    return {
      fixed,
      installments,
      variable,
      methods: Object.entries(methods).map(([key, value]) => ({
        label: PAYMENT_METHODS.find(pm => pm.value === key)?.label || key,
        value
      })).sort((a, b) => b.value - a.value)
    };
  }, [expenses]);

  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (name: string) => {
    setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-emerald-500" />
            Análise Detalhada de Gastos
          </h2>
          <p className="text-slate-400 text-sm">Exploração por categorias e estrutura de custos</p>
        </div>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Structure Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Repeat size={20} />
            </div>
            <h3 className="font-semibold text-slate-200">Custos Fixos</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            R${structure.fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500">Compromissos recorrentes mensais</p>
        </div>

        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <CreditCard size={20} />
            </div>
            <h3 className="font-semibold text-slate-200">Parcelamentos</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            R${structure.installments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500">Compras parceladas no cartão</p>
        </div>

        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Wallet size={20} />
            </div>
            <h3 className="font-semibold text-slate-200">Variáveis / Outros</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            R${structure.variable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500">Gastos pontuais e do dia a dia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <PieChartIcon size={18} className="text-emerald-500" />
                Hierarquia de Categorias
              </h3>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Total: R${expenses.reduce((a,b) => a+b.amount, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="divide-y divide-slate-700">
              {categoryBreakdown.length > 0 ? categoryBreakdown.map(cat => (
                <div key={cat.name} className="group">
                  <button 
                    onClick={() => toggleCat(cat.name)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCats[cat.name] ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                      <span className="font-medium text-slate-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block w-32 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full" 
                          style={{ width: `${expenses.length > 0 ? (cat.total / expenses.reduce((a,b) => a+b.amount, 0)) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-100 min-w-[100px] text-right">
                        R${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                  
                  {expandedCats[cat.name] && (
                    <div className="bg-slate-900/30 px-4 pb-4 animate-in fade-in slide-in-from-top-2">
                      <div className="ml-8 space-y-2 pt-2 border-l border-slate-700 pl-4">
                        {cat.subcategories.map(sub => (
                          <div key={sub.name} className="flex items-center justify-between py-1">
                            <span className="text-sm text-slate-400">{sub.name}</span>
                            <span className="text-sm font-medium text-slate-300">
                              R${sub.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 italic">
                  Nenhuma despesa encontrada para este período.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
            <h3 className="font-semibold text-slate-200 mb-6 flex items-center gap-2">
              <CreditCard size={18} className="text-purple-500" />
              Canais de Saída
            </h3>
            <div className="space-y-4">
              {structure.methods.map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-400">{m.label}</span>
                    <span className="text-slate-200 font-bold">R${m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${expenses.length > 0 ? (m.value / expenses.reduce((a,b) => a+b.amount, 0)) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {structure.methods.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">Sem dados de pagamento.</p>
              )}
            </div>
          </div>

          <div className="bg-emerald-900/10 border border-emerald-900/20 p-6 rounded-lg">
            <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Insight de Gestão</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Seus custos fixos representam <span className="text-emerald-300 font-bold">
                {expenses.length > 0 ? ((structure.fixed / expenses.reduce((a,b) => a+b.amount, 0)) * 100).toFixed(1) : 0}%
              </span> do seu orçamento total este mês. Manter este índice abaixo de 50% é ideal para sua saúde financeira.
            </p>
            <button className="mt-4 text-emerald-400 text-xs font-bold flex items-center gap-1 hover:underline">
              Ver dicas de otimização <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryAnalysis;
