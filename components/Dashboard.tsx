import React, { useMemo } from 'react';
import { Transaction, PAYMENT_METHODS } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Target, CreditCard, Wallet, Calendar, Info } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<Props> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const monthData = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const globalBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
        return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
  }, [transactions]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const income = monthData.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const expenses = monthData.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const paymentMethodData = useMemo(() => {
    const data: Record<string, number> = {};
    monthData.filter(t => t.type === 'EXPENSE').forEach(t => {
      const method = t.paymentMethod || 'CASH';
      data[method] = (data[method] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ 
        name: PAYMENT_METHODS.find(pm => pm.value === name)?.label || name, 
        value 
    })).sort((a, b) => b.value - a.value);
  }, [monthData]);

  const futureProjections = useMemo(() => {
    const projections: Record<string, number> = {};
    const [sYear, sMonth] = selectedMonth.split('-').map(Number);
    
    // Próximos 5 meses
    for (let i = 1; i <= 5; i++) {
        const d = new Date(sYear, sMonth - 1 + i, 1);
        const mKey = d.toISOString().slice(0, 7);
        projections[mKey] = transactions
            .filter(t => t.type === 'EXPENSE' && t.date.startsWith(mKey))
            .reduce((acc, t) => acc + t.amount, 0);
    }
    return Object.entries(projections).map(([month, value]) => ({
        month: new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'short' }),
        fullMonth: new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        value
    }));
  }, [transactions, selectedMonth]);

  const totalPendingInstallments = useMemo(() => {
    const [sYear, sMonth] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(sYear, sMonth, 0); // Fim do mês selecionado
    
    return transactions
        .filter(t => t.type === 'EXPENSE' && new Date(t.date) > selectedDate)
        .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, selectedMonth]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    monthData.filter(t => t.type === 'EXPENSE').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [monthData]);

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
          Resumo Financeiro
        </h2>
        <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
          >
            <TrendingDown size={18} className="rotate-90" />
          </button>
          <span className="text-sm font-medium text-slate-200 min-w-[140px] text-center capitalize">
            {formatMonth(selectedMonth)}
          </span>
          <button 
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
          >
            <TrendingUp size={18} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Global</span>
            <Wallet size={14} className="text-blue-400" />
          </div>
          <div className={`text-xl font-bold ${globalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            R${globalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Acumulado total</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Receita (Mês)</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-white">R${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
          <div className="text-[10px] text-slate-500 mt-1">Entradas no período</div>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Despesas (Mês)</span>
            <TrendingDown size={14} className="text-rose-500" />
          </div>
          <div className="text-xl font-bold text-white">R${expenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
          <div className="text-[10px] text-slate-500 mt-1">Saídas no período</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo (Mês)</span>
            <DollarSign size={14} className={balance >= 0 ? "text-emerald-500" : "text-rose-500"} />
          </div>
          <div className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            R${balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Resultado mensal</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
           <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Poupança</span>
            <Target size={14} className="text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-400">{savingsRate.toFixed(1)}%</div>
          <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
             <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(savingsRate, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-full text-orange-500">
                <Calendar size={20} />
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Comprometimento Futuro</p>
                <p className="text-lg font-bold text-slate-200">R${totalPendingInstallments.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
                <Wallet size={20} />
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Gasto Médio Diário</p>
                <p className="text-lg font-bold text-slate-200">R${(expenses / 30).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-full text-purple-500">
                <CreditCard size={20} />
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Cartão de Crédito (Mês)</p>
                <p className="text-lg font-bold text-slate-200">
                    R${(monthData.filter(t => t.paymentMethod === 'CREDIT_CARD').reduce((acc, t) => acc + t.amount, 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg lg:col-span-2">
          <h3 className="text-slate-200 font-semibold mb-6 flex items-center gap-2">
             <span className="w-2 h-6 bg-emerald-500 rounded-sm"></span>
             Detalhamento de Despesas (Categoria)
          </h3>
          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                        formatter={(value: number) => `R$${value.toFixed(2)}`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                    Nenhum dado de despesa para este mês.
                </div>
            )}
          </div>
        </div>

        {/* Recent Transactions Widget */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-slate-200 font-semibold mb-6 flex items-center gap-2">
             <span className="w-2 h-6 bg-blue-500 rounded-sm"></span>
             Últimos Lançamentos
          </h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
                recentTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded transition-colors border-b border-slate-700/50 last:border-0">
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate">{t.description}</p>
                            <p className="text-[10px] text-slate-500">{formatDateBR(t.date)} • {t.category}</p>
                        </div>
                        <div className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {t.type === 'INCOME' ? '+' : '-'} R${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-slate-500 text-sm italic">
                    Nenhuma transação encontrada.
                </div>
            )}
          </div>
          {recentTransactions.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-4 text-center uppercase tracking-widest">
                  Mostrando os 5 mais recentes
              </p>
          )}
        </div>
      </div>

      {/* New Detailed Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-slate-200 font-semibold mb-6 flex items-center gap-2">
             <span className="w-2 h-6 bg-orange-500 rounded-sm"></span>
             Gastos por Forma de Pagamento
          </h3>
          <div className="h-64 w-full">
            {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethodData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                        <Tooltip 
                            cursor={{fill: '#334155', opacity: 0.2}}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value: number) => `R$${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {paymentMethodData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981', '#3b82f6', '#ef4444'][index % 4]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                    <Info size={32} />
                    <span>Sem dados de pagamento.</span>
                </div>
            )}
          </div>
        </div>

        {/* Future Projections / Installments */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-slate-200 font-semibold mb-6 flex items-center gap-2">
             <span className="w-2 h-6 bg-purple-500 rounded-sm"></span>
             Previsão de Gastos (Próximos Meses)
          </h3>
          <div className="h-48 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={futureProjections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                        formatter={(value: number) => `R$${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                        labelFormatter={(label, payload) => payload[0]?.payload?.fullMonth || label}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Próximas Parcelas</p>
            {transactions
                .filter(t => t.installmentCurrent && t.date > new Date().toISOString().split('T')[0])
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 3)
                .map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-slate-900/30 p-2 rounded border border-slate-700/50">
                        <div className="overflow-hidden">
                            <p className="text-slate-200 font-medium truncate">{t.description}</p>
                            <p className="text-slate-500">{formatDateBR(t.date)}</p>
                        </div>
                        <span className="text-slate-100 font-bold">R${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;