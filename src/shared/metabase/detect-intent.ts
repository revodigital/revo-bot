import { callAIAsResponse } from "../prompt/openai";

export interface BudgetQueryIntent {
  projectKey: string | null;
  isBudgetQuestion: boolean;
}

export async function detectBudgetIntent(
  message: string,
  previousContext?: string,
): Promise<BudgetQueryIntent> {
  const match = message.match(/CO\d{5}/i);
  const projectKey = match ? match[0].toUpperCase() : null;

  const prompt = `
  ---

Stai proseguendo una conversazione di cui questi sono i messaggi precedenti
${previousContext}
---
  
L'utente ora ha scritto: \"${message}\"

Rispondi esclusivamente nel formato JSON che segue se la frase riguarda il budget di un progetto, o quanti giorni sono disponibili o consumati. Altrimenti rispondi solo con "false".

{
  "projectKey": "XXX", // esempio
  "isBudgetQuestion": false // esempio
}

Qui alcune chiavi progetto di esempio, sono sempre alfanumeriche, maiuscole e possono a volte includere numeri: ACL, BIA, MC2_2, EVO2, BEN, TAS4, CIS3. 
Non esistono chiavi progetto con più di 5 caratteri e quasi tutte sono di tre caratteri.

`;

  try {
    const result = await callAIAsResponse(prompt);
    return JSON.parse(
      result.trim().replaceAll("```json", "").replaceAll("```", ""),
    ) as BudgetQueryIntent;
  } catch (err) {
    console.error("Errore durante la chiamata a OpenAI", err);
    return {
      projectKey,
      isBudgetQuestion: false,
    };
  }
}
