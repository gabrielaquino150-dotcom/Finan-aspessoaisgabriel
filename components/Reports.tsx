import React, { useState } from 'react';
import { Transaction, Goal } from '../types';
import { generateMonthlyReport } from '../services/gemini';
import { FileText, Loader2, Printer, Download, FileJson, Upload, CreditCard, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  transactions: Transaction[];
  onRestoreData: (transactions: Transaction[], goals: Goal[]) => void;
}

const Reports: React.FC<Props> = ({ transactions, onRestoreData }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const handleGenerate = async () => {
    setLoading(true);
    const monthTx = transactions.filter(t => t.date.startsWith(selectedMonth));
    const result = await generateMonthlyReport(monthTx, selectedMonth);
    setReport(result);
    setLoading(false);
  };

  const handleExportCSV = () => {
    const monthTx = transactions.filter(t => t.date.startsWith(selectedMonth));
    
    if (monthTx.length === 0) {
        alert("Sem dados para exportar neste período.");
        return;
    }

    const headers = ["Data", "Descrição", "Categoria", "Subcategoria", "Tipo", "Valor", "Método", "Banco"];
    const rows = monthTx.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
        t.category,
        t.subCategory || '',
        t.type,
        t.amount.toFixed(2).replace('.', ','), // PT-BR format
        t.paymentMethod || '',
        t.bank || ''
    ]);

    // Add Byte Order Mark (BOM) for Excel to recognize UTF-8
    const csvContent = '\uFEFF' + [
        headers.join(','), 
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `equilibrium_export_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportBackup = () => {
    const goals = JSON.parse(localStorage.getItem('eq_goals') || '[]');
    const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        transactions,
        goals
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `equilibrium_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error("Formato de backup inválido.");
            }
            
            if (confirm("Isso irá substituir todos os seus dados atuais pelos dados do backup. Deseja continuar?")) {
                onRestoreData(data.transactions, data.goals || []);
                alert("Dados restaurados com sucesso!");
            }
        } catch (err) {
            alert("Erro ao ler arquivo de backup: " + (err as Error).message);
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const creditCardSummary = transactions
    .filter(t => t.paymentMethod === 'CREDIT_CARD' && t.date.startsWith(selectedMonth))
    .reduce((acc, t) => {
        const b = t.bank || 'Outros';
        acc[b] = (acc[b] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

  const futureInstallments = transactions
    .filter(t => t.installmentCurrent && t.date > `${selectedMonth}-31`)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg no-print">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-indigo-400">
                <FileText size={24} />
                <h2 className="text-xl font-bold">Relatórios e Exportação</h2>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-slate-400 mb-1">Mês de Referência</label>
                <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
            </div>
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/20"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <FileJson size={18} />}
                Gerar Análise IA
            </button>
            
            <div className="flex-1"></div>

            <div className="flex gap-2">
                <button
                    onClick={handleExportCSV}
                    className="bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-slate-600 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
                    title="Baixar Tabela CSV (Excel)"
                >
                    <Download size={18} />
                    CSV
                </button>

                <div className="w-px h-8 bg-slate-700 mx-1"></div>

                <button
                    onClick={handleExportBackup}
                    className="bg-slate-700 hover:bg-slate-600 text-blue-400 border border-slate-600 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
                    title="Exportar Backup Completo (JSON)"
                >
                    <FileJson size={18} />
                    Exportar Backup
                </button>

                <div className="relative">
                    <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportBackup}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                        className="bg-slate-700 hover:bg-slate-600 text-purple-400 border border-slate-600 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
                        title="Restaurar Backup Anterior"
                    >
                        <Upload size={18} />
                        Restaurar
                    </button>
                </div>
                
                {report && (
                    <button
                        onClick={handlePrintPDF}
                        className="bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors shadow"
                    >
                        <Printer size={18} />
                        Salvar PDF
                    </button>
                )}
            </div>
        </div>
      </div>

      {report && (
        <div id="printable-content" className="bg-white text-slate-900 p-8 lg:p-12 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-2 max-w-4xl mx-auto">
            {/* Header do Documento */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900">Equilibrium</h1>
                    <p className="text-sm text-slate-500 font-medium tracking-widest uppercase mt-1">Relatório Executivo Mensal</p>
                </div>
                <div className="text-right">
                    <p className="font-mono font-bold text-lg text-slate-900">{selectedMonth}</p>
                    <div className="flex items-center gap-1 justify-end text-emerald-600 text-xs font-bold uppercase mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Auditoria IA Concluída
                    </div>
                </div>
            </div>

            {/* Resumo de Cartões (Visível no PDF) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                        <CreditCard size={16} />
                        Faturas de Cartão ({selectedMonth})
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(creditCardSummary).length > 0 ? Object.entries(creditCardSummary).map(([bank, value]) => (
                            <div key={bank} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                                <span className="text-slate-700 font-medium">{bank}</span>
                                <span className="text-slate-900 font-bold">R${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic text-sm">Nenhum gasto no cartão identificado.</p>
                        )}
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                        <Calendar size={16} />
                        Próximos Parcelamentos
                    </h3>
                    <div className="space-y-3">
                        {futureInstallments.length > 0 ? futureInstallments.map(t => (
                            <div key={t.id} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-800 truncate">{t.description}</p>
                                    <p className="text-[10px] text-slate-500">{t.date.split('-').reverse().join('/')}</p>
                                </div>
                                <span className="text-slate-900 font-bold text-xs">R${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic text-sm">Nenhum parcelamento futuro.</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Conteúdo Renderizado */}
            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900">
                 <ReactMarkdown>{report}</ReactMarkdown>
            </div>

            {/* Footer do Documento */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>GERADO POR EQUILIBRIUM FINANCIAL OS</span>
                <span>CONFIDENCIAL</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;