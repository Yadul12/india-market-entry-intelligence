import { DisplayCurrency } from "../types/consulting";

export const DEFAULT_USD_INR = 94.0;
export const DEFAULT_JPY_INR = 0.59;

export function formatMoneyFromUsdM(
  valueUsdM: number | null | undefined,
  currency: DisplayCurrency = "USD",
  usdInr = DEFAULT_USD_INR,
  jpyInr = DEFAULT_JPY_INR,
  decimals = 1
): string {
  if (valueUsdM === null || valueUsdM === undefined || Number.isNaN(valueUsdM)) {
    return "—";
  }
  const sign = valueUsdM < 0 ? "-" : "";
  const abs = Math.abs(valueUsdM);

  if (currency === "INR") {
    // 1 USD M = usdInr / 10 INR Crores
    const cr = abs * (usdInr / 10);
    return `${sign}₹${cr.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} Cr`;
  }
  if (currency === "JPY") {
    // 1 USD = usdInr / jpyInr JPY -> USD M -> JPY Bn = abs * (usdInr/jpyInr) / 1000
    const jpyBn = (abs * (usdInr / jpyInr)) / 1000;
    return `${sign}¥${jpyBn.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}M`;
}

export function formatMoneyFromUsdBn(
  valueUsdBn: number | null | undefined,
  currency: DisplayCurrency = "USD",
  usdInr = DEFAULT_USD_INR,
  jpyInr = DEFAULT_JPY_INR
): string {
  if (valueUsdBn === null || valueUsdBn === undefined || Number.isNaN(valueUsdBn)) {
    return "—";
  }
  if (currency === "INR") {
    // 1 USD Bn = usdInr / 1000 Lakh Crore
    const lakhCr = (valueUsdBn * usdInr) / 1000;
    return `₹${lakhCr.toFixed(2)}L Cr`;
  }
  if (currency === "JPY") {
    // 1 USD Bn -> JPY Trillion = valueUsdBn * (usdInr/jpyInr) / 1000
    const jpyTn = (valueUsdBn * (usdInr / jpyInr)) / 1000;
    return `¥${jpyTn.toFixed(2)}T`;
  }
  return `$${valueUsdBn.toFixed(1)}B`;
}

export function formatPct(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return `${val.toFixed(decimals)}%`;
}

export function formatSignedPct(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${val.toFixed(decimals)}%`;
}

export function formatInteger(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return Math.round(val).toLocaleString("en-US");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escapeCell = (cell: string | number | null | undefined): string => {
    const str = cell === null || cell === undefined ? "" : String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
