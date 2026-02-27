import React, { useMemo, useState } from 'react';
import { Transaction, BANKS, PAYMENT_METHODS } from '../types';
import { CreditCard, Calendar, ChevronRight, ChevronDown, AlertCircle, Wallet, ArrowUpRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const CreditCardInvoices: React.FC<Props> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [expandedBank, setExpandedBank] = useState<string | null>(null);

  // Filtrar apenas despesas de cartão de crédito que VENCEM no mês selecionado
  const invoiceTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.type === 'EXPENSE' && 
      t.paymentMethod === 'CREDIT_CARD' && 
      t.date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  const banksSummary = useMemo(() => {
    const summary: Record<string, { total: number; transactions: Transaction[] }> = {};
    
    invoiceTransactions.forEach(t => {
      const bankName = t.bank || 'Outros';
      if (!summary[bankName]) {
        summary[bankName] = { total: 0, transactions: [] };
      }
      summary[bankName].total += t.amount;
      summary[bankName].transactions.push(t);
    });

    return Object.entries(summary)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        name,
        total: data.total,
        transactions: data.transactions.sort((a, b) => a.date.localeCompare(b.date)),
        config: BANKS.find(b => b.label === name)
      }));
  }, [invoiceTransactions]);

  const totalInvoices = useMemo(() => {
    return banksSummary.reduce((acc, b) => acc + b.total, 0);
  }, [banksSummary]);

  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="text-purple-500" />
            Gestão de Faturas de Cartão
          </h2>
          <p className="text-slate-400 text-sm">Acompanhamento de vencimentos e fechamentos</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 uppercase font-bold">Mês da Fatura:</span>
            <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
            />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Wallet size={20} />
            </div>
            <h3 className="font-semibold text-slate-200">Total em Faturas</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            R${totalInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500">Soma de todos os cartões para {selectedMonth}</p>
        </div>

        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Calendar size={20} />
            </div>
            <h3 className="font-semibold text-slate-200">Cartões Ativos</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {banksSummary.length}
          </div>
          <p className="text-xs text-slate-500">Instituições com gastos este mês</p>
        </div>

        <div className="bg-emerald-900/10 border border-emerald-900/20 p-5 rounded-lg flex flex-col justify-center">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <AlertCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Dica de Fluxo</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
                As faturas aqui listadas são baseadas na <strong>data de vencimento</strong>. 
                Compras feitas após o fechamento do cartão são automaticamente jogadas para o mês seguinte.
            </p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {banksSummary.length > 0 ? banksSummary.map(bank => (
          <div key={bank.name} className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
            <button 
              onClick={() => setExpandedBank(expandedBank === bank.name ? null : bank.name)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-purple-400 border border-slate-700">
                    <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-100">{bank.name}</h3>
                  {bank.config && (
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Fecha dia {bank.config.closingDay} • Vence dia {bank.config.dueDay}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Fatura</p>
                    <p className="text-xl font-bold text-white">R${bank.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {expandedBank === bank.name ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
              </div>
            </button>

            {expandedBank === bank.name && (
              <div className="border-t border-slate-700 bg-slate-900/30 animate-in fade-in slide-in-from-top-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-500 uppercase font-bold">
                      <th className="px-6 py-3">Data Compra</th>
                      <th className="px-6 py-3">Vencimento</th>
                      <th className="px-6 py-3">Descrição</th>
                      <th className="px-6 py-3">Categoria</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {bank.transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-700/20">
                        <td className="px-6 py-3 text-slate-400 font-mono">{formatDateBR(t.originalDate || t.date)}</td>
                        <td className="px-6 py-3 text-orange-400 font-bold font-mono">{formatDateBR(t.date)}</td>
                        <td className="px-6 py-3 text-slate-200">
                            <div className="flex items-center gap-2">
                                {t.installmentCurrent && <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1 rounded">{t.installmentCurrent}/{t.installmentTotal}</span>}
                                {t.description.replace(' [Fatura Cartão]', '')}
                            </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500">{t.category}</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-100">R${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900/50">
                        <td colSpan={4} className="px-6 py-3 text-right font-bold text-slate-400 uppercase">Total {bank.name}</td>
                        <td className="px-6 py-3 text-right font-bold text-white text-sm">R${bank.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )) : (
          <div className="bg-slate-800 p-12 rounded-lg border border-slate-700 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <CreditCard size={32} />
            </div>
            <h3 className="text-slate-300 font-medium">Nenhuma fatura para este mês</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Não identificamos gastos de cartão de crédito com vencimento em {formatDateBR(selectedMonth + '-01').slice(3)}.
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
        <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-emerald-500" />
            Como funciona o cálculo?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-400">
            <div className="space-y-2">
                <p><strong className="text-slate-200">Data de Fechamento:</strong> É o dia em que o banco "fecha" a conta do mês. Compras feitas após este dia só serão pagas na fatura do mês seguinte.</p>
                <p><strong className="text-slate-200">Data de Vencimento:</strong> É o dia limite para o pagamento da fatura sem juros.</p>
            </div>
            <div className="space-y-2">
                <p><strong className="text-slate-200">Exemplo Mercado Pago:</strong> Fecha dia 05, Vence dia 10.</p>
                <ul className="list-disc ml-5 space-y-1">
                    <li>Compra dia 04/02: Entra na fatura de 10/02.</li>
                    <li>Compra dia 06/02: Entra na fatura de 10/03.</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardInvoices;
