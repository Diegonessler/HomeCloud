import { Home, FolderOpen, Images, Users, Star, Trash2, UserRound, ShieldCheck } from 'lucide-react'

export const NAV = [
  { to: '/', label: 'Início', short: 'Início', icon: Home, end: true, mobile: true },
  { to: '/arquivos', label: 'Meus arquivos', short: 'Arquivos', icon: FolderOpen, mobile: true },
  { to: '/fotos', label: 'Fotos e vídeos', short: 'Fotos', icon: Images, mobile: true },
  { to: '/compartilhados', label: 'Compartilhados', short: 'Família', icon: Users, mobile: true },
  { to: '/favoritos', label: 'Favoritos', icon: Star },
  { to: '/lixeira', label: 'Lixeira', icon: Trash2 },
  { to: '/conta', label: 'Minha conta', icon: UserRound },
] as const

export const ADMIN_NAV = { to: '/admin', label: 'Administração', icon: ShieldCheck }
