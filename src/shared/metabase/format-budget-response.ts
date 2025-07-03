import { BudgetSummary } from "../types";

export function formatBudgetMessage(budget: BudgetSummary): string {
  if (budget.rows.length === 0) {
    return `❗️Non ho trovato righe budget per questo progetto.`;
  }

  const header =
    `*Totale disponibile:* ${budget.totalDays.toFixed(2)} giorni\n` +
    `*Già registrati:* ${budget.totalLogged.toFixed(2)} giorni\n` +
    `*Residuo complessivo:* ${budget.totalRemaining.toFixed(2)} giorni\n`;

  const details = budget.rows
    .map((row) => {
      const status = row.overBudget
        ? "⚠️ *SFORATO*"
        : row.atRisk
          ? "🟡 *Quasi esaurito*"
          : "🟢 ok";

      return `• *${row.label}*: ${row.daysRemaining.toFixed(2)} giorni rimasti su ${row.daysTotal.toFixed(1)} – ${status}`;
    })
    .join("\n");

  return `${header}\n${details}`;
}

export function buildFinalResponse({
  projectCode,
  budgetSummaryText,
  aiComment,
}: {
  projectCode: string;
  budgetSummaryText: string;
  aiComment: string;
}): string {
  return `
📊 *Budget per progetto \`${projectCode}\`*

${budgetSummaryText}

💬 _${aiComment}_
  `.trim();
}
