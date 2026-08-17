import "server-only";
import { cookies } from "next/headers";
import { CURRENCY_COOKIE, REGION_COOKIE } from "@/src/modules/localization/server/preferences";
import { REGIONS, isCurrency, validCountry } from "@/src/modules/localization/domain/regions";

type RateResponse = { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
export type CurrencyDisplay = { currency: string; rateUpdatedAt?: string; converted: boolean; format: (minor: number, sourceCurrency: string) => string };
let lastKnownRates: RateResponse | null = null;

async function latestUsdRates(): Promise<RateResponse | null> {
  const endpoints = ["https://open.er-api.com/v6/latest/USD", "https://api.exchangerate-api.com/v4/latest/USD"];
  for (const endpoint of endpoints) try {
    const response = await fetch(endpoint, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) continue;
    const data = await response.json() as RateResponse;
    if (data.rates?.USD && data.rates.NGN && data.rates.EUR) { lastKnownRates = data; return data; }
  } catch { /* Try the secondary endpoint or the last known table. */ }
  return lastKnownRates;
}

export async function getCurrencyDisplay(): Promise<CurrencyDisplay> {
  const cookieStore = await cookies();
  const savedCurrency = cookieStore.get(CURRENCY_COOKIE)?.value ?? "";
  const savedCountry = (cookieStore.get(REGION_COOKIE)?.value ?? "NG").toUpperCase();
  const country = validCountry(savedCountry) ? savedCountry : "NG";
  const target = isCurrency(savedCurrency) ? savedCurrency : REGIONS[country].currency;
  const data = await latestUsdRates();
  const targetRate = data?.rates?.[target];
  return {
    currency: target,
    rateUpdatedAt: data?.time_last_update_utc,
    converted: Boolean(targetRate),
    format(minor, sourceCurrency) {
      const source = sourceCurrency.toUpperCase();
      const sourceRate = data?.rates?.[source];
      const convertedMinor = targetRate && sourceRate ? minor * targetRate / sourceRate : minor;
      const currency = targetRate && sourceRate ? target : source;
      return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(convertedMinor / 100);
    }
  };
}
