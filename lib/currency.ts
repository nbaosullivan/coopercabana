/**
 * Currency helpers for the app.
 *
 * All stored amounts (expenses, allocations) are in EUR — the DB schema and
 * seed data are euro-denominated. Conversion to GBP is display-only and uses
 * a live EUR→GBP rate (Frankfurter, free, no API key) cached for 12h so the
 * app stays performant; a hardcoded fallback covers offline/before first
 * fetch.
 */

export type Currency = 'EUR' | 'GBP';

export const DEFAULT_CURRENCY: Currency = 'EUR';
/** Offline / pre-fetch fallback rate. */
export const FALLBACK_EUR_GBP_RATE = 0.85;

const RATE_TTL_MS = 12 * 60 * 60 * 1000; // refresh live rate at most every 12h
const RATE_KEY = 'stag_eur_gbp_rate';
const RATE_TS_KEY = 'stag_eur_gbp_rate_ts';
const CURRENCY_KEY = 'stag_currency';

function readCachedRate(): number | null {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const ts = Number(localStorage.getItem(RATE_TS_KEY) ?? 0);
    if (!raw || Date.now() - ts > RATE_TTL_MS) return null;
    const rate = Number(raw);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** Fetch a fresh EUR→GBP rate (cached in localStorage for 12h). Never throws. */
export async function fetchEurGbpRate(): Promise<number> {
  const cached = readCachedRate();
  if (cached) return cached;

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('rate request failed');
    const json = await res.json();
    const rate = Number(json?.rates?.GBP);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('bad rate payload');

    localStorage.setItem(RATE_KEY, String(rate));
    localStorage.setItem(RATE_TS_KEY, String(Date.now()));
    return rate;
  } catch {
    return FALLBACK_EUR_GBP_RATE;
  }
}

export function loadCurrencyPref(): Currency {
  try {
    const v = localStorage.getItem(CURRENCY_KEY);
    return v === 'EUR' || v === 'GBP' ? v : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function saveCurrencyPref(c: Currency): void {
  try {
    localStorage.setItem(CURRENCY_KEY, c);
  } catch {
    // ignore (private mode etc.)
  }
}

const formatters: Partial<Record<Currency, Intl.NumberFormat>> = {};

function formatterFor(currency: Currency): Intl.NumberFormat {
  if (!formatters[currency]) {
    formatters[currency] = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
  }
  return formatters[currency]!;
}

/** Format an amount that is stored in EUR into the requested currency. */
export function formatMoney(amountEur: number, currency: Currency, rate: number): string {
  const amount = currency === 'EUR' ? amountEur : amountEur * rate;
  return formatterFor(currency).format(amount);
}
