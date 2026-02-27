import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES, PAYMENT_METHODS, BANKS, BankConfig } from '../types';
import { Plus, Calculator, CreditCard, CalendarClock, AlertCircle, FileText, Upload, Check, X, Loader2 } from 'lucide-react';
import { parseInvoicePDF } from '../services/invoiceParser';

interface Props {
  userId: string;
  onAddTransaction: (t: Transaction[]) => void;
  editingTransaction?: Transaction | null;
  onUpdateTransaction?: (t: Transaction) => void;
  onCancelEdit?: () => void;
}

const TransactionForm: React.FC<Props> = ({ userId, onAddTransaction, editingTransaction, onUpdateTransaction, onCancelEdit }) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES.EXPENSE[0]);
  const [subCategory, setSubCategory] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [bankValue, setBankValue] = useState(BANKS[0].value);
  
  // Credit Card Calculation State
  const [projectedDate, setProjectedDate] = useState<string | null>(null);

  // Invoice Import State
  const [isImporting, setIsImporting] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<(Transaction & { _isNewInstallmentPlan?: boolean; _installmentsCount?: number })[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Load editing transaction
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description.replace(' [Fatura Cartão]', '').replace(/\(\d+\/\d+\)/, '').trim());
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.originalDate || editingTransaction.date);
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setIsFixed(editingTransaction.isFixed);
      setPaymentMethod(editingTransaction.paymentMethod || PAYMENT_METHODS[0].value);
      setBankValue(editingTransaction.bank || BANKS[0].value);
      setIsInstallment(false); // We don't support re-parceling from edit yet to avoid complexity
    } else {
      // Reset form
      setType('EXPENSE');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(DEFAULT_CATEGORIES.EXPENSE[0]);
      setSubCategory('');
      setIsFixed(false);
      setIsInstallment(false);
    }
  }, [editingTransaction]);

  // Calcula a data real de pagamento baseada no cartão
  const calculateCardDueDate = (purchaseDateStr: string, bankConfig: BankConfig): Date => {
    const purchaseDate = new Date(purchaseDateStr);
    // Ajuste para fuso horário local para evitar erros de dia
    const pYear = purchaseDate.getUTCFullYear();
    const pMonth = purchaseDate.getUTCMonth(); // 0-11
    const pDay = purchaseDate.getUTCDate();

    // Data de fechamento neste mês da compra
    // Atenção: Se fechamento é dia 26 e hoje é 27, já virou.
    
    let referenceMonth = pMonth;
    let referenceYear = pYear;

    if (pDay > bankConfig.closingDay) {
        // Comprou depois do fechamento, joga para a próxima fatura base
        referenceMonth++;
        if (referenceMonth > 11) {
            referenceMonth = 0;
            referenceYear++;
        }
    }

    // Agora calculamos o vencimento com base no mês de referência da fatura
    // Regra: Se o dia do vencimento é MENOR que o dia do fechamento (ex: Fecha 26, Vence 12),
    // então o vencimento ocorre no mês SEGUINTE ao fechamento.
    // Ex: Bradesco. Fecha 26 Jan. Vence 12 Fev.
    // Compra 15 Jan -> Tá dentro do ciclo de Jan -> Vence 12 Fev.
    // Compra 27 Jan -> Tá no ciclo de Fev -> Fecha 26 Fev -> Vence 12 Mar.
    
    let dueMonth = referenceMonth;
    let dueYear = referenceYear;

    // Se o dia do vencimento for menor que o fechamento, o pagamento é no mês seguinte ao ciclo
    // Se o dia do vencimento for maior (ex: fecha 5, vence 10), é no mesmo mês.
    if (bankConfig.dueDay < bankConfig.closingDay) {
        dueMonth++;
        if (dueMonth > 11) {
            dueMonth = 0;
            dueYear++;
        }
    }

    // Criar data de vencimento
    const dueDate = new Date(Date.UTC(dueYear, dueMonth, bankConfig.dueDay));
    return dueDate;
  };

  // Efeito para atualizar a previsão visual
  useEffect(() => {
    if (type === 'EXPENSE' && paymentMethod === 'CREDIT_CARD') {
        const selectedBank = BANKS.find(b => b.value === bankValue);
        if (selectedBank && date) {
            const dueDate = calculateCardDueDate(date, selectedBank);
            setProjectedDate(dueDate.toISOString().split('T')[0]);
        }
    } else {
        setProjectedDate(null);
    }
  }, [date, bankValue, paymentMethod, type]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert("Por favor, envie apenas arquivos PDF.");
        return;
    }

    setImportLoading(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const extracted = await parseInvoicePDF(base64);
            
            // Map to Transaction objects
            const mapped = extracted.map((item: any) => ({
                id: crypto.randomUUID(),
                userId,
                date: item.date,
                description: item.description,
                amount: parseFloat(item.amount),
                type: 'EXPENSE' as TransactionType,
                category: item.category || 'Outros',
                subCategory: '',
                isFixed: false,
                paymentMethod: 'CREDIT_CARD',
                bank: BANKS.find(b => b.value === bankValue)?.label, // Assume current selected bank
                originalDate: item.date,
                _isNewInstallmentPlan: false,
                _installmentsCount: 2
            }));
            
            setPendingTransactions(mapped);
            setIsImporting(true);
        };
    } catch (error) {
        console.error(error);
        alert("Erro ao processar fatura. Tente novamente.");
    } finally {
        setImportLoading(false);
    }
  };

  const handleConfirmImport = () => {
    const finalTransactions: Transaction[] = [];

    pendingTransactions.forEach(t => {
        if (t._isNewInstallmentPlan && t._installmentsCount && t._installmentsCount > 1) {
            // Generate installments
            const numAmount = t.amount; // Total amount
            const installments = t._installmentsCount;
            const installmentAmount = numAmount / installments;
            const groupId = crypto.randomUUID();
            
            // Determine base date
            let baseDateObj = new Date(t.date);
            let isCard = false;
            const selectedBank = BANKS.find(b => b.label === t.bank);

            if (t.type === 'EXPENSE' && t.paymentMethod === 'CREDIT_CARD' && selectedBank) {
                 // Recalculate due date based on the transaction date and bank config
                 // We need the bank config. We can try to find it by label.
                 // If not found, use date as is.
                 const bankConfig = BANKS.find(b => b.label === t.bank);
                 if (bankConfig) {
                    baseDateObj = calculateCardDueDate(t.date, bankConfig);
                    isCard = true;
                 }
            }

            for (let i = 0; i < installments; i++) {
                const tDate = new Date(baseDateObj);
                tDate.setUTCMonth(baseDateObj.getUTCMonth() + i);
                
                finalTransactions.push({
                    id: crypto.randomUUID(),
                    userId: t.userId,
                    date: tDate.toISOString().split('T')[0],
                    description: `${t.description} (${i + 1}/${installments}) ${isCard ? '[Fatura Cartão]' : ''}`,
                    amount: parseFloat(installmentAmount.toFixed(2)),
                    type: t.type,
                    category: t.category,
                    subCategory: t.subCategory,
                    isFixed: false,
                    installmentTotal: installments,
                    installmentCurrent: i + 1,
                    relatedGroupId: groupId,
                    paymentMethod: t.paymentMethod,
                    bank: t.bank,
                    originalDate: t.date
                });
            }
        } else {
            // Single transaction
            // Recalculate date if it's credit card to match system logic (due date)
            // UNLESS the user manually set it. But for consistency, let's apply the logic if it's credit card.
            let finalDate = t.date;
            let finalDesc = t.description;
            
            if (t.type === 'EXPENSE' && t.paymentMethod === 'CREDIT_CARD') {
                 const bankConfig = BANKS.find(b => b.label === t.bank);
                 if (bankConfig) {
                    const dueDate = calculateCardDueDate(t.date, bankConfig);
                    finalDate = dueDate.toISOString().split('T')[0];
                    if (!finalDesc.includes('[Fatura Cartão]')) {
                        finalDesc += ' [Fatura Cartão]';
                    }
                 }
            }

            // Remove internal flags
            const { _isNewInstallmentPlan, _installmentsCount, ...cleanTransaction } = t;
            finalTransactions.push({
                ...cleanTransaction,
                date: finalDate,
                description: finalDesc
            });
        }
    });

    onAddTransaction(finalTransactions);
    setPendingTransactions([]);
    setIsImporting(false);
  };

  const updatePendingTransaction = (id: string, field: string, value: any) => {
    setPendingTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const removePendingTransaction = (id: string) => {
    setPendingTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const numAmount = parseFloat(amount);
    const newTransactions: Transaction[] = [];
    const groupId = crypto.randomUUID();
    const selectedBank = BANKS.find(b => b.value === bankValue);
    
    // Determina a data base para os lançamentos
    // Se for cartão, a data base é a data da primeira fatura
    // Se for dinheiro/pix, a data base é a data da compra
    let baseDateObj = new Date(date);
    let isCard = false;

    if (type === 'EXPENSE' && paymentMethod === 'CREDIT_CARD' && selectedBank) {
        baseDateObj = calculateCardDueDate(date, selectedBank);
        isCard = true;
    }

    if (editingTransaction && onUpdateTransaction) {
        onUpdateTransaction({
            ...editingTransaction,
            date: isCard ? baseDateObj.toISOString().split('T')[0] : date,
            description: isCard ? `${description} [Fatura Cartão]` : description,
            amount: numAmount,
            type,
            category,
            subCategory,
            isFixed,
            paymentMethod: type === 'EXPENSE' ? paymentMethod : undefined,
            bank: type === 'EXPENSE' && isCard ? selectedBank?.label : undefined,
            originalDate: date
        });
        return;
    }

    if (isInstallment && type === 'EXPENSE') {
      const installmentAmount = numAmount / installments;
      
      for (let i = 0; i < installments; i++) {
        const tDate = new Date(baseDateObj);
        // Adiciona meses à data de VENCIMENTO
        tDate.setUTCMonth(baseDateObj.getUTCMonth() + i);
        
        newTransactions.push({
          id: crypto.randomUUID(),
          userId,
          date: tDate.toISOString().split('T')[0],
          description: `${description} (${i + 1}/${installments}) ${isCard ? '[Fatura Cartão]' : ''}`,
          amount: parseFloat(installmentAmount.toFixed(2)),
          type,
          category,
          subCategory,
          isFixed: false,
          installmentTotal: installments,
          installmentCurrent: i + 1,
          relatedGroupId: groupId,
          paymentMethod,
          bank: isCard ? selectedBank?.label : undefined,
          originalDate: date // Guarda a data que a compra realmente aconteceu
        });
      }
    } else {
      newTransactions.push({
        id: groupId,
        userId,
        date: isCard ? baseDateObj.toISOString().split('T')[0] : date,
        description: isCard ? `${description} [Fatura Cartão]` : description,
        amount: numAmount,
        type,
        category,
        subCategory,
        isFixed,
        paymentMethod: type === 'EXPENSE' ? paymentMethod : undefined,
        bank: type === 'EXPENSE' && isCard ? selectedBank?.label : undefined,
        originalDate: date
      });
    }

    onAddTransaction(newTransactions);
    setDescription('');
    setAmount('');
    setIsInstallment(false);
  };

  // Formatação de data para exibição PT-BR
  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg mb-8">
      <div className="flex items-center justify-between mb-6 text-emerald-400">
        <div className="flex items-center gap-2">
            <Calculator size={20} />
            <h2 className="font-semibold text-lg">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
        </div>
        
        {!editingTransaction && (
            <div className="relative">
                <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={importLoading}
                />
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${importLoading ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {importLoading ? 'Analisando docs...' : 'Importar Fatura PDF'}
                </button>
                {importLoading && (
                    <p className="absolute top-full right-0 mt-2 text-[10px] text-indigo-400 font-medium animate-pulse whitespace-nowrap">
                        A IA está extraindo os dados, aguarde...
                    </p>
                )}
            </div>
        )}
      </div>

      {isImporting && pendingTransactions.length > 0 ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    Revisar Transações Importadas ({pendingTransactions.length})
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {pendingTransactions.map(t => (
                        <div key={t.id} className="bg-slate-800 p-4 rounded border border-slate-700 text-sm space-y-3 shadow-sm">
                            {/* Row 1: Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Data</label>
                                    <input 
                                        type="date" 
                                        value={t.date}
                                        onChange={(e) => updatePendingTransaction(t.id, 'date', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Descrição</label>
                                    <input 
                                        type="text" 
                                        value={t.description}
                                        onChange={(e) => updatePendingTransaction(t.id, 'description', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Valor</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={t.amount}
                                        onChange={(e) => updatePendingTransaction(t.id, 'amount', parseFloat(e.target.value))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tipo</label>
                                    <select 
                                        value={t.type}
                                        onChange={(e) => updatePendingTransaction(t.id, 'type', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    >
                                        <option value="EXPENSE">Despesa</option>
                                        <option value="INCOME">Receita</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex items-end justify-end">
                                    <button 
                                        onClick={() => removePendingTransaction(t.id)}
                                        className="text-slate-500 hover:text-rose-500 p-2 hover:bg-rose-900/20 rounded transition-colors"
                                        title="Remover"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Categorization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categoria</label>
                                    <select 
                                        value={t.category}
                                        onChange={(e) => {
                                            updatePendingTransaction(t.id, 'category', e.target.value);
                                            updatePendingTransaction(t.id, 'subCategory', '');
                                        }}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    >
                                        {(t.type === 'INCOME' ? DEFAULT_CATEGORIES.INCOME : DEFAULT_CATEGORIES.EXPENSE).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Subcategoria</label>
                                    <select 
                                        value={t.subCategory}
                                        onChange={(e) => updatePendingTransaction(t.id, 'subCategory', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {DEFAULT_SUBCATEGORIES[t.category]?.map(sc => (
                                            <option key={sc} value={sc}>{sc}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: Payment Details & Flags */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-700/50">
                                <div className="md:col-span-3">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Método</label>
                                    <select 
                                        value={t.paymentMethod}
                                        onChange={(e) => updatePendingTransaction(t.id, 'paymentMethod', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                    >
                                        {PAYMENT_METHODS.map(pm => (
                                            <option key={pm.value} value={pm.value}>{pm.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {t.paymentMethod === 'CREDIT_CARD' && (
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Banco</label>
                                        <select 
                                            value={t.bank}
                                            onChange={(e) => updatePendingTransaction(t.id, 'bank', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                                        >
                                            {BANKS.map(b => (
                                                <option key={b.label} value={b.label}>{b.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="md:col-span-6 flex items-center gap-4 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={t.isFixed}
                                            onChange={(e) => updatePendingTransaction(t.id, 'isFixed', e.target.checked)}
                                            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-300">Fixo</span>
                                    </label>

                                    <div className="w-px h-4 bg-slate-700"></div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={t._isNewInstallmentPlan}
                                            onChange={(e) => updatePendingTransaction(t.id, '_isNewInstallmentPlan', e.target.checked)}
                                            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-300">Parcelar Agora</span>
                                    </label>

                                    {t._isNewInstallmentPlan && (
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                min="2" 
                                                max="60" 
                                                value={t._installmentsCount}
                                                onChange={(e) => updatePendingTransaction(t.id, '_installmentsCount', parseInt(e.target.value))}
                                                className="w-12 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white text-center"
                                            />
                                            <span className="text-[10px] text-slate-500">x</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-700">
                    <button 
                        onClick={() => {
                            setIsImporting(false);
                            setPendingTransactions([]);
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmImport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
                    >
                        <Check size={16} />
                        Confirmar Importação
                    </button>
                </div>
            </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Type Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-md">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-1.5 px-4 rounded text-sm font-medium transition-colors ${
                type === 'INCOME' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-1.5 px-4 rounded text-sm font-medium transition-colors ${
                type === 'EXPENSE' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despesa
            </button>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
            {projectedDate && (
                <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-900/20 p-1.5 rounded border border-orange-900/30">
                    <CalendarClock size={12} />
                    <span>Cai na fatura de: <strong>{formatDateBR(projectedDate)}</strong></span>
                </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Descrição"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-500">R$</span>
            <input
              type="number"
              placeholder="0,00"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 pl-9 w-full focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={category}
            onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory('');
            }}
            className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {(type === 'INCOME' ? DEFAULT_CATEGORIES.INCOME : DEFAULT_CATEGORIES.EXPENSE).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          {DEFAULT_SUBCATEGORIES[category] && (
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Subcategoria (Opcional)</option>
              {DEFAULT_SUBCATEGORIES[category].map(sc => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          )}
        </div>
        
        {/* Payment Logic - Only for Expense */}
        {type === 'EXPENSE' && (
          <div className="bg-slate-900/50 p-4 rounded border border-slate-700/50 space-y-3 animate-in fade-in slide-in-from-top-2">
             <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
                <div className="flex items-center gap-2">
                    <CreditCard size={14} />
                    Método de Pagamento
                </div>
                {paymentMethod === 'CREDIT_CARD' && (
                   <span className="text-emerald-500 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Modo Fluxo de Caixa Real
                   </span>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="bg-slate-800 border border-slate-600 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                >
                    {PAYMENT_METHODS.map(pm => (
                        <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                </select>

                {paymentMethod === 'CREDIT_CARD' && (
                    <div className="space-y-1">
                        <select
                            value={bankValue}
                            onChange={(e) => setBankValue(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                        >
                            {BANKS.map(b => (
                                <option key={b.value} value={b.value}>
                                    {b.label} (Fecha dia {b.closingDay}, Vence dia {b.dueDay})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
             </div>
          </div>
        )}

        {type === 'EXPENSE' && (
          <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 p-3 rounded border border-slate-700/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                disabled={isInstallment}
                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Custo Fixo (Recorrente)</span>
            </label>

            <div className="w-px h-6 bg-slate-700 mx-2"></div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                disabled={isFixed}
                className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Parcelado</span>
            </label>

            {isInstallment && (
              <div className="flex items-center gap-2 ml-auto">
                 <span className="text-sm text-slate-400">Meses:</span>
                 <input 
                    type="number" 
                    min="2" 
                    max="60" 
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                    className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                 />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {editingTransaction && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded transition-all"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className={`flex-[2] ${editingTransaction ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-medium py-2.5 rounded shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2`}
          >
            {editingTransaction ? <Check size={18} /> : <Plus size={18} />}
            {editingTransaction ? 'Salvar Alterações' : 'Registrar'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default TransactionForm;