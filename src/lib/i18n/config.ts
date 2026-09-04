export const locales = ["fr", "en"] as const;
export const defaultLocale = "fr";

export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function localePrefix(locale: Locale) {
  return locale === defaultLocale ? "" : `/${locale}`;
}

export function stripLocalePrefix(pathname: string) {
  if (pathname === "/en") {
    return "/";
  }

  if (pathname.startsWith("/en/")) {
    return pathname.slice(3) || "/";
  }

  return pathname || "/";
}

export function localizedPath(pathname: string, locale: Locale) {
  const stripped = stripLocalePrefix(pathname);
  const normalized = stripped.startsWith("/") ? stripped : `/${stripped}`;
  const prefix = localePrefix(locale);

  if (!prefix) {
    return normalized;
  }

  return normalized === "/" ? prefix : `${prefix}${normalized}`;
}

export function switchLocalePath(pathname: string, locale: Locale) {
  return localizedPath(stripLocalePrefix(pathname), locale);
}
