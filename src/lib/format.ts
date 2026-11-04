// Formatação amigável (pt-BR) para tamanhos, datas e durações.

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** i
  const d = value >= 100 || i === 0 ? 0 : decimals
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 })} ${UNITS[i]}`
}

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const longDateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const monthYearFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

export const formatDate = (iso: string) => dateFmt.format(new Date(iso)).replace('.', '')
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso)).replace('.', '')
export const formatMonthYear = (iso: string) => capitalize(monthYearFmt.format(new Date(iso)))
export const formatLongToday = (d = new Date()) => capitalize(longDateFmt.format(d))

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `há ${m} min`
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `há ${h} h`
  }
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return formatDate(iso)
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  return d > 0 ? `${d} dias e ${h} h` : `${h} h`
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function firstName(name: string) {
  return name.split(' ')[0]
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
