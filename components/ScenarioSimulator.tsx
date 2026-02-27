import React, { useState } from 'react';
import { Transaction, Goal } from '../types';
import { analyzeScenario } from '../services/gemini';
import { BrainCircuit, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  goals: Goal[];
}

const ScenarioSimulator: React.FC<Props> = ({ transactions, goals }) => {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    if (!scenario.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeScenario(transactions, goals, scenario);
      setResult(analysis);
    } catch (e) {
      setResult("Falha na simulação. Verifique sua rede ou chave de API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
                <BrainCircuit size={24} />
                <h2 className="text-xl font-bold">Simulador de Cenários "What-If"</h2>
            </div>
            <p className="text-slate-400 mb-6 text-sm">
                Descreva uma decisão financeira potencial (ex: "Comprar um carro de R$ 40.000 com entrada de R$ 10.000 e parcelas de R$ 800 por 48 meses"). 
                O Auditor de IA avaliará o impacto no seu Orçamento Base Zero e metas.
            </p>

            <div className="relative">
                <textarea
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    placeholder="Digite seu cenário financeiro aqui..."
                    className="w-full h-32 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-4 focus:outline-none focus:border-purple-500 resize-none font-mono text-sm"
                />
                <button
                    onClick={handleSimulate}
                    disabled={loading || !scenario}
                    className="absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                    {loading ? 'Simulando...' : 'Rodar Simulação'}
                </button>
            </div>
        </div>

        {result && (
            <div className="bg-slate-800 p-6 rounded-lg border border-l-4 border-l-purple-500 border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-4 text-purple-300">
                    <AlertTriangle size={20} />
                    <h3 className="font-bold">Relatório de Análise do Auditor</h3>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                    <pre className="whitespace-pre-wrap font-sans">{result}</pre>
                </div>
            </div>
        )}
    </div>
  );
};

export default ScenarioSimulator;