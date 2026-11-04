// Dados FICTÍCIOS para demonstração. Nada aqui existe no servidor.
// Datas são relativas a "agora" para a demo parecer sempre atual.

import type {
  Activity,
  AppNotification,
  FileItem,
  MediaItem,
  ServerStatus,
  User,
} from '../../types'

const GB = 1024 ** 3
const MB = 1024 ** 2
const TB = 1024 ** 4

const now = Date.now()
const ago = (days: number, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString()

/** Senha única de demonstração — apenas para o modo demo, nunca usada com servidor real */
export const DEMO_PASSWORD = 'familia123'

export const users: User[] = [
  {
    id: 'u-diego', name: 'Diego', email: 'diego@homecloud.local', role: 'admin', color: '#5b8cff',
    quotaBytes: 600 * GB, usedBytes: 148.6 * GB, createdAt: ago(210), lastSeenAt: ago(0, 0.1),
  },
  {
    id: 'u-ana', name: 'Ana Paula', email: 'ana@homecloud.local', role: 'member', color: '#c084fc',
    quotaBytes: 400 * GB, usedBytes: 212.3 * GB, createdAt: ago(205), lastSeenAt: ago(0, 3),
  },
  {
    id: 'u-carlos', name: 'Carlos', email: 'carlos@homecloud.local', role: 'member', color: '#22d3ee',
    quotaBytes: 300 * GB, usedBytes: 64.8 * GB, createdAt: ago(205), lastSeenAt: ago(1, 4),
  },
  {
    id: 'u-julia', name: 'Júlia', email: 'julia@homecloud.local', role: 'member', color: '#f472b6',
    quotaBytes: 300 * GB, usedBytes: 271.4 * GB, createdAt: ago(190), lastSeenAt: ago(0, 6),
  },
  {
    id: 'u-lucia', name: 'Vó Lúcia', email: 'lucia@homecloud.local', role: 'member', color: '#fbbf24',
    quotaBytes: 100 * GB, usedBytes: 9.2 * GB, createdAt: ago(120), lastSeenAt: ago(9),
  },
]

let seq = 0
const id = (p: string) => `${p}-${++seq}`

function folder(name: string, parentId: string | null, opts: Partial<FileItem> = {}): FileItem {
  return {
    id: opts.id ?? id('f'), name, kind: 'folder', parentId, size: 0, modifiedAt: opts.modifiedAt ?? ago(3),
    ownerId: opts.ownerId ?? 'u-diego', favorite: false, sharedWith: [], ...opts,
  }
}
function file(name: string, kind: FileItem['kind'], parentId: string | null, size: number, days: number, opts: Partial<FileItem> = {}): FileItem {
  return {
    id: id('a'), name, kind, parentId, size, modifiedAt: ago(days, (seq % 7) + 1),
    ownerId: 'u-diego', favorite: false, sharedWith: [], ...opts,
  }
}

const docs = folder('Documentos', null, { id: 'f-docs', favorite: true, modifiedAt: ago(1) })
const facul = folder('Faculdade', null, { id: 'f-facul', favorite: true, modifiedAt: ago(0, 5) })
const celular = folder('Fotos do celular', null, { id: 'f-celular', modifiedAt: ago(0, 2) })
const receitas = folder('Receitas da família', null, {
  id: 'f-receitas', family: true, favorite: true, modifiedAt: ago(6),
  sharedWith: [{ userId: 'u-ana', permission: 'edit' }, { userId: 'u-lucia', permission: 'edit' }, { userId: 'u-carlos', permission: 'view' }, { userId: 'u-julia', permission: 'view' }],
})
const projetos = folder('Projetos', null, { id: 'f-proj', modifiedAt: ago(4) })
const musica = folder('Música', null, { id: 'f-musica', modifiedAt: ago(40) })
const garantias = folder('Garantias e notas fiscais', 'f-docs', { id: 'f-garantias', modifiedAt: ago(15) })
const ir = folder('Imposto de Renda 2026', 'f-docs', { id: 'f-ir', modifiedAt: ago(150) })
const natal = folder('Natal 2025', 'f-celular', {
  id: 'f-natal', modifiedAt: ago(300),
  sharedWith: [{ userId: 'u-ana', permission: 'view' }],
})

export const files: FileItem[] = [
  docs, facul, celular, receitas, projetos, musica, garantias, ir, natal,
  file('Currículo 2026.pdf', 'pdf', null, 312 * 1024, 2, { favorite: true }),
  file('Orçamento da casa.xlsx', 'sheet', null, 86 * 1024, 1, { sharedWith: [{ userId: 'u-carlos', permission: 'edit' }] }),
  file('Lista de compras.txt', 'text', null, 2 * 1024, 0.2),
  file('Contrato de aluguel.pdf', 'pdf', 'f-docs', 1.8 * MB, 30),
  file('Documentos digitalizados.pdf', 'pdf', 'f-docs', 4.2 * MB, 60),
  file('Comprovante de residência.pdf', 'pdf', 'f-docs', 640 * 1024, 12),
  file('Nota fiscal - notebook.pdf', 'pdf', 'f-garantias', 220 * 1024, 90),
  file('Garantia geladeira.jpg', 'image', 'f-garantias', 2.4 * MB, 140),
  file('Recibos médicos.zip', 'archive', 'f-ir', 18 * MB, 160),
  file('Informe de rendimentos.pdf', 'pdf', 'f-ir', 180 * 1024, 165),
  file('Proposta de TCC.docx', 'doc', 'f-facul', 410 * 1024, 0.3),
  file('Apresentação IoT.pptx', 'slides', 'f-facul', 7.6 * MB, 2),
  file('Dashboard ESP32.zip', 'archive', 'f-facul', 24 * MB, 3),
  file('Notas Ciência de Dados.md', 'text', 'f-facul', 14 * 1024, 5),
  file('Cronograma do semestre.xlsx', 'sheet', 'f-facul', 42 * 1024, 20),
  file('IMG_2041.jpg', 'image', 'f-celular', 3.1 * MB, 0.1),
  file('IMG_2040.jpg', 'image', 'f-celular', 2.9 * MB, 0.1),
  file('VID_0318.mp4', 'video', 'f-celular', 148 * MB, 1),
  file('Ceia em família.jpg', 'image', 'f-natal', 3.8 * MB, 300),
  file('Amigo secreto.mp4', 'video', 'f-natal', 212 * MB, 300),
  file('Bolo de cenoura da vó.pdf', 'pdf', 'f-receitas', 280 * 1024, 6, { ownerId: 'u-lucia' }),
  file('Lasanha de domingo.docx', 'doc', 'f-receitas', 96 * 1024, 25, { ownerId: 'u-ana' }),
  file('Pão caseiro.jpg', 'image', 'f-receitas', 2.2 * MB, 48, { ownerId: 'u-ana' }),
  file('Carcaça NAS v2.stl', 'other', 'f-proj', 9.4 * MB, 4),
  file('Ideias de jogos.txt', 'text', 'f-proj', 6 * 1024, 11),
  file('Playlist viagem.mp3', 'audio', 'f-musica', 8.2 * MB, 40),
  // Lixeira
  file('Rascunho antigo.docx', 'doc', null, 120 * 1024, 20, { trashedAt: ago(2) }),
  file('Print duplicado.png', 'image', null, 900 * 1024, 9, { trashedAt: ago(5) }),
]

// Itens que outros familiares compartilharam com o usuário atual
export const sharedWithMe: FileItem[] = [
  folder('Viagem para Gramado', null, {
    id: 'f-gramado', ownerId: 'u-carlos', modifiedAt: ago(1, 2), childCount: 86,
    sharedWith: [{ userId: 'u-diego', permission: 'view' }, { userId: 'u-ana', permission: 'view' }, { userId: 'u-julia', permission: 'view' }],
  }),
  file('Boletos da casa - outubro.pdf', 'pdf', null, 540 * 1024, 2, {
    ownerId: 'u-ana', sharedWith: [{ userId: 'u-diego', permission: 'edit' }],
  }),
  file('Formatura Júlia.mp4', 'video', null, 1.4 * GB, 8, {
    ownerId: 'u-julia', sharedWith: [{ userId: 'u-diego', permission: 'view' }, { userId: 'u-ana', permission: 'view' }, { userId: 'u-lucia', permission: 'view' }],
  }),
  file('Telefones importantes.docx', 'doc', null, 34 * 1024, 70, {
    ownerId: 'u-lucia', sharedWith: [{ userId: 'u-diego', permission: 'view' }],
  }),
]

export const familyFolders: FileItem[] = [
  receitas,
  folder('Fotos antigas da família', null, {
    id: 'f-antigas', family: true, ownerId: 'u-ana', modifiedAt: ago(12), childCount: 412,
    sharedWith: users.filter((u) => u.id !== 'u-ana').map((u) => ({ userId: u.id, permission: 'view' as const })),
  }),
  folder('Documentos da casa', null, {
    id: 'f-casa', family: true, ownerId: 'u-carlos', modifiedAt: ago(4), childCount: 37,
    sharedWith: [{ userId: 'u-diego', permission: 'edit' }, { userId: 'u-ana', permission: 'edit' }],
  }),
]

// Galeria: gerada de forma determinística ao longo dos últimos meses
const albums = ['Dia a dia', 'Praia', 'Aniversário', 'Natal', 'Viagem', 'Pets']
const photoNames = ['Pôr do sol', 'Almoço de domingo', 'Passeio no parque', 'Cachorro dormindo', 'Família reunida', 'Céu de inverno', 'Trilha', 'Bolo de aniversário', 'Praia cedo', 'Jardim da vó']

function rnd(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export const media: MediaItem[] = Array.from({ length: 64 }, (_, i) => {
  const isVideo = i % 7 === 3
  const dayOffset = Math.floor(i * 3.4 + rnd(i) * 3) + (i > 30 ? 30 : 0)
  const portrait = rnd(i + 3) > 0.6
  return {
    id: `m-${i + 1}`,
    name: isVideo ? `VID_${(4200 - i).toString()}.mp4` : `${photoNames[i % photoNames.length]}.jpg`,
    type: isVideo ? 'video' : 'photo',
    takenAt: ago(dayOffset, rnd(i + 1) * 12),
    size: isVideo ? Math.round((40 + rnd(i) * 300) * MB) : Math.round((1.5 + rnd(i) * 3) * MB),
    width: portrait ? 3024 : 4032,
    height: portrait ? 4032 : 3024,
    durationSec: isVideo ? Math.round(12 + rnd(i + 9) * 170) : undefined,
    favorite: rnd(i + 5) > 0.82,
    album: albums[Math.floor(rnd(i + 2) * albums.length)],
    ownerId: i % 5 === 0 ? 'u-ana' : 'u-diego',
    seed: i + 1,
  }
})

export const activities: Activity[] = [
  { id: 'ac-1', type: 'upload', userId: 'u-diego', target: '2 fotos em "Fotos do celular"', at: ago(0, 0.1) },
  { id: 'ac-2', type: 'share', userId: 'u-carlos', target: 'a pasta "Viagem para Gramado" com você', at: ago(1, 2) },
  { id: 'ac-3', type: 'upload', userId: 'u-ana', target: '"Boletos da casa - outubro.pdf"', at: ago(2) },
  { id: 'ac-4', type: 'folder', userId: 'u-diego', target: 'a pasta "Projetos"', at: ago(4) },
  { id: 'ac-5', type: 'favorite', userId: 'u-diego', target: '"Currículo 2026.pdf"', at: ago(2, 3) },
  { id: 'ac-6', type: 'rename', userId: 'u-julia', target: '"Formatura Júlia.mp4"', at: ago(8) },
  { id: 'ac-7', type: 'delete', userId: 'u-diego', target: '"Print duplicado.png"', at: ago(5) },
  { id: 'ac-8', type: 'login', userId: 'u-lucia', target: 'pelo celular', at: ago(9) },
]

export const notifications: AppNotification[] = [
  { id: 'n-1', kind: 'share', title: 'Carlos compartilhou uma pasta', body: '"Viagem para Gramado" agora está em Compartilhados.', at: ago(1, 2), read: false },
  { id: 'n-2', kind: 'share', title: 'Ana enviou um documento', body: '"Boletos da casa - outubro.pdf" — você pode editar.', at: ago(2), read: false },
  { id: 'n-3', kind: 'storage', title: 'Espaço da Júlia quase cheio', body: 'Ela já usou 90% do espaço disponível.', at: ago(3), read: true },
  { id: 'n-4', kind: 'system', title: 'Backup concluído', body: 'Cópia de segurança diária feita com sucesso.', at: ago(0, 8), read: true },
]

export const serverStatus: ServerStatus = {
  hostname: 'homecloud-nas',
  uptimeSec: 18 * 86400 + 7 * 3600,
  cpuPercent: 14,
  ramUsedBytes: 1.3 * GB,
  ramTotalBytes: 2 * GB,
  cpuTempC: 52,
  totalBytes: 3 * TB,
  usedBytes: users.reduce((s, u) => s + u.usedBytes, 0) + 38 * GB,
  health: 'warn',
  disks: [
    { id: 'd-1', label: 'Sistema', model: 'SSD interno 128 GB', sizeBytes: 128 * GB, usedBytes: 21 * GB, temperatureC: 38, health: 'ok', smart: 'Saudável' },
    { id: 'd-2', label: 'Dados da família', model: 'HD externo USB 1 TB', sizeBytes: 1 * TB, usedBytes: 744 * GB, temperatureC: 44, health: 'ok', smart: 'Saudável' },
    { id: 'd-3', label: 'Backup', model: 'HD externo USB 2 TB', sizeBytes: 2 * TB, usedBytes: 790 * GB, temperatureC: 47, health: 'warn', smart: '2 setores realocados — acompanhar' },
  ],
  backups: [
    { id: 'b-1', name: 'Arquivos da família', lastRunAt: ago(0, 8), status: 'success', sizeBytes: 706 * GB, destination: 'HD Backup (USB 2 TB)', nextRunAt: new Date(now + 16 * 3600000).toISOString() },
    { id: 'b-2', name: 'Configuração do servidor', lastRunAt: ago(3), status: 'success', sizeBytes: 48 * MB, destination: 'HD Backup (USB 2 TB)', nextRunAt: new Date(now + 4 * 86400000).toISOString() },
    { id: 'b-3', name: 'Cópia externa (fora de casa)', lastRunAt: ago(12), status: 'failed', sizeBytes: 0, destination: 'Ainda não configurado', nextRunAt: new Date(now + 2 * 86400000).toISOString() },
  ],
}
