import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Transaction, Goal } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeScenario = async (
  transactions: Transaction[],
  goals: Goal[],
  scenarioDescription: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Erro: Chave de API ausente.";

  // Calculate basic metrics to feed the AI
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const averageMonthlySurplus = (totalIncome - totalExpense) / 12; // Crude approximation for context

  const prompt = `
    Você é o Diretor Financeiro (CFO) da Equilibrium Financial.
    
    **Contexto:**
    - Saldo/Superávit Mensal Aproximado da Carteira: R$${averageMonthlySurplus.toFixed(2)}
    - Metas Ativas: ${goals.map(g => `${g.name} (Alvo: R$${g.targetAmount})`).join(', ')}
    
    **Cenário para Análise:**
    "${scenarioDescription}"
    
    **Tarefa:**
    Analise o impacto deste cenário no fluxo de caixa do usuário e na capacidade de atingir as metas.
    Use um tom profissional, rigoroso e ligeiramente cauteloso.
    Forneça uma "Avaliação de Risco" (Baixo, Médio, Alto).
    Seja conciso. Use Markdown.
    IMPORTANTE: Responda estritamente em Português do Brasil.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Falha ao gerar análise.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Ocorreu um erro durante a análise da IA.";
  }
};

export const generateMonthlyReport = async (
  transactions: Transaction[],
  month: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Erro: Chave de API ausente.";

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  
  // Group by category
  const catBreakdown: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount;
  });

  const prompt = `
    Aja como um Auditor Financeiro implacavelmente eficiente da Equilibrium Financial.
    Gere um Relatório Executivo Mensal para ${month}.

    **Dados:**
    - Receita Total: R$${income.toFixed(2)}
    - Despesas Totais: R$${expense.toFixed(2)}
    - Resultado Líquido: R$${(income - expense).toFixed(2)}
    - Detalhamento de Despesas: ${JSON.stringify(catBreakdown)}

    **Requisitos:**
    1. Forneça um "Resumo de Desempenho" (Aprovado/Reprovado com base no fluxo de caixa positivo).
    2. Analise as maiores categorias de gastos.
    3. Identifique quaisquer tendências alarmantes (ex: se uma categoria for > 30% da renda).
    4. Forneça 3 recomendações acionáveis para o próximo mês para otimizar o "Orçamento Base Zero".
    5. Formate estritamente em Markdown. Mantenha o tom profissional e executivo.
    IMPORTANTE: Responda estritamente em Português do Brasil.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Falha na geração do relatório.";
  } catch (error) {
    console.error("Gemini report error:", error);
    return "Falha ao gerar relatório executivo.";
  }
};