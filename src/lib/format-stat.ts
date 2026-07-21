import type { StatKey } from "./modes/types";

/** Formata o valor de um atributo comparável para exibição. */
export function formatStat(statKey: StatKey, value: number): string {
  switch (statKey) {
    case "year":
      return String(value);
    case "pages":
      return `${value} páginas`;
    case "sales_estimate":
      return `${value}M cópias`;
  }
}
