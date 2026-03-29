export function fmtDate(date: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short' })
}

export function fmtDateTime(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fmtCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}
