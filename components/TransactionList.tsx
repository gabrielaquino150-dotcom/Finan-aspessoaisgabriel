import React from 'react';
import { Transaction, PAYMENT_METHODS } from '../types';
import { Trash2, Repeat, Layers, Edit2 } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

const TransactionList: React.FC<Props> = ({ transactions, onDelete, onEdit }) => {
  // Sort by date descending
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getPaymentLabel = (t: Transaction) => {
    if (!t.paymentMethod) return '-';
    const method = PAYMENT_METHODS.find(pm => pm.value === t.paymentMethod)?.label || t.paymentMethod;
    if (t.paymentMethod === 'CREDIT_CARD' && t.bank) {
        return `${method} (${t.bank})`;
    }
    return method;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Prevent timezone issues by splitting the ISO string directly
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
            <tr>
              <th className="px-6 py-4">Data Compra / Pagto</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sorted.map((t) => (
              <tr key={t.id} className="hover:bg-slate-750 transition-colors">
                <td className="px-6 py-4 font-mono">
                    <div className="flex flex-col">
                        <span className="text-slate-100 text-xs" title="Data da Compra">
                            {formatDate(t.originalDate || t.date)}
                        </span>
                        {t.paymentMethod === 'CREDIT_CARD' && t.date !== (t.originalDate || t.date) && (
                            <span className="text-[10px] text-orange-400 font-bold" title="Data do Pagamento (Vencimento)">
                                → {formatDate(t.date)}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {t.isFixed && (
                      <span title="Custo Fixo">
                        <Repeat size={14} className="text-blue-400" />
                      </span>
                    )}
                    {t.installmentCurrent && (
                       <span title={`Parcela ${t.installmentCurrent}/${t.installmentTotal}`}>
                         <Layers size={14} className="text-purple-400" />
                       </span>
                    )}
                    <span className="text-slate-100">{t.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-900 rounded text-xs border border-slate-700">
                        {t.category} {t.subCategory ? `> ${t.subCategory}` : ''}
                    </span>
                </td>
                 <td className="px-6 py-4 text-xs">
                    {getPaymentLabel(t)}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                    {t.type === 'INCOME' ? 'RECEITA' : 'DESPESA'}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-mono font-medium ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {t.type === 'EXPENSE' ? '-' : '+'}R${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={() => onEdit(t)}
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="text-slate-500 hover:text-rose-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Nenhuma transação registrada.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;