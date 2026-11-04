/** Junta classes condicionais, ignorando valores falsos. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/** Torna um id do React (useId) seguro para usar em url(#id) de SVG. */
export function svgId(raw: string) {
  return 'i' + raw.replace(/[^\w-]/g, '')
}
