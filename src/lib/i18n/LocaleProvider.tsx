"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, type Dictionary } from "./dictionaries";
import { getUiLocale, setUiLocale as persistUiLocale, type UiLocale } from "./locale";

interface I18nContextValue {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "pt",
  setLocale: () => {},
  t: dictionaries.pt,
});

/**
 * Provedor do idioma da INTERFACE. Guarda a preferência no navegador e
 * reflete no atributo `lang` do `<html>` (acessibilidade/SEO). Independente
 * do filtro de idioma do acervo de livros (lib/lang.ts).
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("pt");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(getUiLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  function setLocale(next: UiLocale) {
    setLocaleState(next);
    persistUiLocale(next);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
