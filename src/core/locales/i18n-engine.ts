/*
 * Lightweight i18n engine — no framework dependency.
 *
 * Locales are loaded as JSON modules. Translation is applied by scanning
 * data-i18n / data-i18n-aria / data-i18n-attr attributes.
 *
 * Source-of-truth: module_specification.md §Ⅴ.
 */

export type LangCode = 'en' | 'ko';
export type LocaleDict = Record<string, string>;

let currentLang: LangCode = 'en';
let currentDict: LocaleDict = {};

const listeners: Array<(lang: LangCode) => void> = [];

async function loadDict(lang: LangCode): Promise<LocaleDict> {
  // Static branches keep Vite/Rollup analysis happy (no dynamic-import-vars warning)
  // and let each locale ship as its own code-split JSON chunk.
  switch (lang) {
    case 'en': return (await import('./en.json')).default as LocaleDict;
    case 'ko': return (await import('./ko.json')).default as LocaleDict;
  }
}

export async function loadLocale(lang: LangCode): Promise<void> {
  try {
    currentDict = await loadDict(lang);
    currentLang = lang;
    document.documentElement.lang = lang;
    translatePage();
    listeners.forEach((fn) => fn(lang));
  } catch (err) {
    console.warn(`[i18n] Failed to load locale "${lang}":`, err);
  }
}

export function getLang(): LangCode {
  return currentLang;
}

export function t(key: string, fallback?: string): string {
  return currentDict[key] ?? fallback ?? key;
}

export function translatePage(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    // Preserve nested elements (e.g., math spans) when text is plain.
    if (el.childElementCount === 0) {
      el.textContent = t(key, el.textContent ?? undefined);
    } else {
      // Translate only text-bearing first child for mixed content.
      const tn = Array.from(el.childNodes).find(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim(),
      );
      if (tn) tn.textContent = t(key, tn.textContent ?? undefined);
    }
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (!key) return;
    el.setAttribute('aria-label', t(key));
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    // Format: "attrName:key, attrName2:key2"
    const spec = el.dataset.i18nAttr;
    if (!spec) return;
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

export function onLangChange(fn: (lang: LangCode) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function detectPreferredLang(): LangCode {
  const stored = localStorage.getItem('encyclopedia-lang') as LangCode | null;
  if (stored === 'en' || stored === 'ko') return stored;
  return navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function setLang(lang: LangCode): Promise<void> {
  localStorage.setItem('encyclopedia-lang', lang);
  return loadLocale(lang);
}
