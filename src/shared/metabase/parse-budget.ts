import { BudgetRow, BudgetSummary } from "../types";

const DAYS_REMAINING_THRESHOLD = 1.5;

export function parseBudgetResponse(payload: any): BudgetRow[] {
  const rows: any[][] = payload?.data?.rows ?? [];

  return rows.map((row) => {
    const label = row[0];
    const daysTotal = Number(row[1]);
    const daysLogged = Number(row[3]);
    const daysRemaining = Number(row[4]);

    return {
      label,
      daysTotal,
      daysLogged,
      daysRemaining,
      overBudget: daysRemaining < 0,
      atRisk: daysRemaining >= 0 && daysRemaining <= DAYS_REMAINING_THRESHOLD,
    };
  });
}

export function wrapBudgetSummary(rows: BudgetRow[]): BudgetSummary {
  const totalDays = rows.reduce((acc, row) => acc + row.daysTotal, 0);
  const totalLogged = rows.reduce((acc, row) => acc + row.daysLogged, 0);
  const totalRemaining = totalDays - totalLogged;

  return {
    totalDays,
    totalLogged,
    totalRemaining,
    rows,
  };
}
