'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  Currency,
  DEFAULT_CURRENCY,
  FALLBACK_EUR_GBP_RATE,
  fetchEurGbpRate,
  loadCurrencyPref,
  saveCurrencyPref,
  formatMoney,
} from '@/lib/currency';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** EUR → GBP rate (1 when currency is EUR, live rate otherwise). */
  rate: number;
  /** Format a EUR-denominated amount into the active currency. */
  format: (amountEur: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}

export default function CurrencyProvider({ children }: { children: ReactNode }) {
  // SSR-safe defaults (EUR + fallback rate) so server and first client paint
  // match; persisted prefs hydrate right after mount.
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [rate, setRate] = useState<number>(FALLBACK_EUR_GBP_RATE);

  useEffect(() => {
    setCurrencyState(loadCurrencyPref());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEurGbpRate().then((r) => {
      if (!cancelled) setRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    saveCurrencyPref(c);
  }, []);

  const format = useCallback(
    (amountEur: number) => formatMoney(amountEur, currency, rate),
    [currency, rate]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, rate, format }),
    [currency, setCurrency, rate, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
