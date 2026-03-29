
import { GoogleGenAI } from "@google/genai";
import { BusinessState } from "../types";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const getContextPrompt = (state: BusinessState) => {
  const sales = state.transactions.filter(t => t.type === 'sale');
  const salesTotal = sales.reduce((acc, t) => acc + t.amount, 0);
    
  const expensesTotal = state.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const investmentTotal = state.transactions
    .filter(t => t.type === 'investment')
    .reduce((acc, t) => acc + t.amount, 0);

  const netProfit = salesTotal - expensesTotal - investmentTotal;

  const salesByCategory = sales.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(salesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => `${cat}: ${val.toLocaleString()} Kz`)
    .join(', ');

  const topCategory = Object.entries(salesByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return `
    Você é o consultor estratégico da "CrystalOne", uma loja de água purificada em Luanda, Angola.
    DADOS FINANCEIROS ATUAIS (Kz):
    - Faturamento: ${salesTotal.toLocaleString()} Kz
    - Despesas Operacionais: ${expensesTotal.toLocaleString()} Kz
    - Investimentos: ${investmentTotal.toLocaleString()} Kz
    - Lucro Líquido: ${netProfit.toLocaleString()} Kz
    
    PERFORMANCE POR PRODUTO/CATEGORIA:
    - Ranking de Vendas: ${sortedCategories || 'Sem dados de vendas ainda'}
    - Produto Estrela: ${topCategory}
    
    RECURSOS:
    - Estoque Atual: ${state.inventory.map(i => `${i.name} (${i.quantity}${i.unit})`).join(', ')}
    - Alertas de Qualidade: ${state.phRecords.filter(r => r.status !== 'Ideal').length} registros fora do ideal recentemente.
    
    IMPORTANTE: Suas sugestões devem ser práticas para o mercado de Luanda (ex: uso intenso de WhatsApp, anúncios geolocalizados no Facebook, fidelização via motoboys).
  `;
};

export const getDailyMarketingTip = async (state: BusinessState): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY não configurada. Usando dica padrão.");
    return "Crie um combo especial: na compra de 5 galões, a entrega é grátis hoje!";
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = getContextPrompt(state);
  const prompt = `Com base nos dados da CrystalOne fornecidos, crie uma ÚNICA dica de marketing diária curta (máximo 280 caracteres). A dica deve ser extremamente prática, criativa e focada em resultados imediatos (WhatsApp, combos ou fidelização). Use um tom motivador.`;

  const maxRetries = 3;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: context + "\n\n" + prompt,
        config: { temperature: 0.9 }
      });
      return response.text || "Crie um combo especial: na compra de 5 galões, a entrega é grátis hoje!";
    } catch (error) {
      console.error(`Tentativa ${i + 1} falhou:`, error);
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return "Que tal postar um vídeo rápido no status do WhatsApp mostrando a pureza da sua água hoje?";
};

export const getBusinessInsights = async (state: BusinessState, type: 'daily' | 'monthly' = 'daily'): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "A chave da IA não está configurada. Por favor, adicione a GEMINI_API_KEY nas configurações.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = getContextPrompt(state);

  const requestPrompt = type === 'monthly' 
    ? `Crie um RELATÓRIO ESTRATÉGICO MENSAL. 
       1. Analise o ranking de vendas acima e identifique oportunidades de Cross-Selling.
       2. Proponha 3 ações de MARKETING DIGITAL específicas para Instagram e WhatsApp.
       3. Sugira uma meta de faturamento baseada no lucro atual.
       4. Dê uma sugestão de investimento em infraestrutura ou estoque que traga retorno rápido.`
    : `Forneça uma análise rápida de 3 pontos: 1. Desempenho financeiro imediato. 2. Alerta de estoque/qualidade. 3. Uma dica prática de marketing para aplicar ainda hoje no WhatsApp da loja.`;

  const maxRetries = 3;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: context + "\n\n" + requestPrompt,
        config: { temperature: 0.7 }
      });
      return response.text || "Não consegui gerar a análise estratégica.";
    } catch (error) {
      console.error(`Tentativa ${i + 1} de insights falhou:`, error);
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return "Erro ao conectar com a IA consultora.";
};

export const getStockPredictions = async (state: BusinessState): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "A chave da IA não está configurada para previsões de estoque.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = getContextPrompt(state);
  
  const movements = state.inventoryMovements
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50) // Analisar as últimas 50 movimentações
    .map(m => `${m.type === 'in' ? 'Entrada' : 'Saída'} de ${m.quantity} unidades em ${new Date(m.created_at).toLocaleDateString()}`)
    .join('\n');

  const prompt = `
    Com base no estoque atual e no histórico de movimentações abaixo, preveja quando os itens críticos podem acabar.
    HISTÓRICO RECENTE:
    ${movements || 'Sem histórico de movimentações ainda.'}
    
    ESTOQUE ATUAL:
    ${state.inventory.map(i => `${i.name}: ${i.quantity} ${i.unit} (Mínimo: ${i.min_threshold})`).join('\n')}
    
    Forneça uma análise preditiva curta e direta (máximo 3 parágrafos). Identifique quais itens correm mais risco e dê uma sugestão de data para reposição.
  `;

  const maxRetries = 3;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: context + "\n\n" + prompt,
        config: { temperature: 0.7 }
      });
      return response.text || "Não foi possível gerar a previsão de estoque no momento.";
    } catch (error) {
      console.error(`Tentativa ${i + 1} de estoque falhou:`, error);
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return "Erro ao calcular previsões de estoque.";
};

export const sendChatMessage = async (state: BusinessState, history: ChatMessage[], newMessage: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Chat desativado: GEMINI_API_KEY ausente.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = getContextPrompt(state) + "\nResponda como um mentor de negócios focado em resultados. Use emojis ocasionalmente para ser amigável mas mantenha o profissionalismo.";

  const maxRetries = 3;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { 
          systemInstruction,
          temperature: 0.8
        }
      });

      const response = await chat.sendMessage({ message: newMessage });
      return response.text || "Não entendi sua dúvida, pode repetir?";
    } catch (error) {
      console.error(`Tentativa ${i + 1} de chat falhou:`, error);
      if (i === maxRetries - 1) break;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return "Ocorreu um erro na comunicação. Tente novamente em instantes.";
};
