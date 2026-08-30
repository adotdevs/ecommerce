"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_TAX_RATE_PERCENT,
  normalizeTaxRatePercent,
} from "@/lib/tax/settings";

const TaxRateContext = createContext<number>(DEFAULT_TAX_RATE_PERCENT);

export function TaxRateProvider({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const [taxRatePercent, setTaxRatePercent] = useState(
    normalizeTaxRatePercent(value)
  );

  useEffect(() => {
    setTaxRatePercent(normalizeTaxRatePercent(value));
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/settings/site", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        if (data.data?.taxRatePercent != null) {
          setTaxRatePercent(normalizeTaxRatePercent(data.data.taxRatePercent));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TaxRateContext.Provider value={taxRatePercent}>
      {children}
    </TaxRateContext.Provider>
  );
}

/** Estimated checkout tax rate as a percent (e.g. 8 for 8%). */
export function useTaxRatePercent() {
  return useContext(TaxRateContext);
}
