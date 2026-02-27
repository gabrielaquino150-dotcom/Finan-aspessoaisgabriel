import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const parseInvoicePDF = async (base64Pdf: string): Promise<any[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("Chave de API ausente.");

  const prompt = `
    Você é um assistente financeiro especializado em extração de dados.
    Analise este documento (fatura de cartão de crédito) e extraia todas as transações financeiras.
    
    Retorne APENAS um JSON válido (sem markdown, sem aspas triplas) com a seguinte estrutura:
    [
      {
        "date": "YYYY-MM-DD",
        "description": "Descrição da compra",
        "amount": 0.00,
        "category": "Categoria sugerida"
      }
    ]

    Ignore pagamentos de fatura, juros de rotativo ou saldos anteriores. Foque apenas em novas compras/despesas.
    Se a data não tiver ano, use o ano corrente.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf
              }
            }
          ]
        }
      ]
    });

    const text = response.text || "[]";
    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("PDF Parsing error:", error);
    throw new Error("Falha ao processar o PDF. Verifique se o arquivo é válido.");
  }
};
