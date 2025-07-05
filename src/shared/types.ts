export interface BudgetRow {
  label: string; // es. "design"
  daysTotal: number; // es. 20.0
  daysLogged: number; // es. 31.5
  daysRemaining: number; // es. -11.5
  overBudget: boolean; // true se < 0
  atRisk: boolean; // true se <= threshold (es. 1 giorno)
}

export interface BudgetSummary {
  totalDays: number;
  totalLogged: number;
  totalRemaining: number;
  rows: BudgetRow[];
}

export enum Intents {
  BUDGET = "BUDGET",
  GENERIC = "GENERIC",
}

export enum TurnTypes {
  USER = "user",
  ASSISTANT = "assistant",
}
