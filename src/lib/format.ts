const numberFormat = new Intl.NumberFormat('nl-NL')
const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
const shortDateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

export function formatNumber(n: number): string {
  return numberFormat.format(Math.round(n))
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso))
}

/** Vandaag als 'YYYY-MM-DD' in lokale tijd (niet UTC). */
export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Datum 'YYYY-MM-DD' min een aantal dagen. */
export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}
