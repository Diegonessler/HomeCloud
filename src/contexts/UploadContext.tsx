import { createContext, useCallback, useContext, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { CloudUpload, Camera, FolderUp, CheckCircle2, X, Image as ImageIcon } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/misc'
import { FileIcon } from '../components/FileIcon'
import { DemoTag } from '../components/DemoBanner'
import { api } from '../services'
import { IS_DEMO } from '../services/config'
import { kindFromName } from '../lib/fileKind'
import { formatBytes } from '../lib/format'
import { cn } from '../lib/cn'
import { useToast } from './ToastContext'
import { errorMessage } from '../hooks/useAsync'

type Target = 'files' | 'media'
interface OpenOptions {
  target?: Target
  parentId?: string | null
  folderName?: string
  files?: File[]
}
interface UploadApi {
  openUpload: (opts?: OpenOptions) => void
  /** Muda sempre que um envio termina — páginas usam para recarregar a lista */
  version: number
}

const UploadContext = createContext<UploadApi | null>(null)

interface Row {
  file: File
  pct: number
  done: boolean
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<OpenOptions>({})
  const [rows, setRows] = useState<Row[]>([])
  const [phase, setPhase] = useState<'pick' | 'sending' | 'done'>('pick')
  const [version, setVersion] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const openUpload = useCallback((o: OpenOptions = {}) => {
    setOpts(o)
    setRows((o.files ?? []).map((file) => ({ file, pct: 0, done: false })))
    setPhase('pick')
    setOpen(true)
  }, [])

  const target = opts.target ?? 'files'

  function add(list: FileList | File[] | null) {
    if (!list) return
    const arr = Array.from(list)
    setRows((r) => [...r, ...arr.map((file) => ({ file, pct: 0, done: false }))])
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    add(e.dataTransfer.files)
  }

  async function send() {
    if (!rows.length) return
    setPhase('sending')
    const files = rows.map((r) => r.file)
    const onProgress = (i: number, pct: number) =>
      setRows((list) => list.map((r, idx) => (idx === i ? { ...r, pct, done: pct >= 100 } : r)))
    try {
      if (target === 'media') await api.media.upload(files, onProgress)
      else await api.files.upload(opts.parentId ?? null, files, onProgress)
      setPhase('done')
      setVersion((v) => v + 1)
      toast.success(
        files.length === 1 ? 'Arquivo enviado' : `${files.length} arquivos enviados`,
        IS_DEMO ? 'Demonstração: o arquivo aparece só nesta tela, não foi para o servidor.' : 'Já está guardado na nuvem da família.',
      )
    } catch (e) {
      setPhase('pick')
      toast.error('O envio não foi concluído', errorMessage(e))
    }
  }

  function close() {
    if (phase === 'sending') return
    setOpen(false)
  }

  const total = rows.reduce((s, r) => s + r.file.size, 0)
  const overall = rows.length ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0
  const accept = target === 'media' ? 'image/*,video/*' : undefined

  const value = useMemo(() => ({ openUpload, version }), [openUpload, version])

  return (
    <UploadContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={close}
        size="md"
        icon={<CloudUpload className="size-5" />}
        title={target === 'media' ? 'Enviar fotos e vídeos' : 'Enviar arquivos'}
        description={target === 'media' ? 'Vão direto para a galeria da família.' : `Destino: ${opts.folderName ?? 'Meus arquivos'}`}
      >
        {phase !== 'done' && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'relative flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all',
              dragging ? 'scale-[1.01] border-brand bg-brand-soft' : 'border-line-strong bg-surface-2',
              phase === 'sending' && 'pointer-events-none opacity-60',
            )}
          >
            <div className={cn('mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-lg transition-transform', dragging && 'animate-float')}>
              <CloudUpload className="size-7" />
            </div>
            <p className="font-display font-semibold text-fg">{dragging ? 'Pode soltar!' : 'Arraste e solte aqui'}</p>
            <p className="mt-1 text-sm text-muted">ou escolha do seu aparelho</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" icon={target === 'media' ? <ImageIcon className="size-4" /> : <FolderUp className="size-4" />} onClick={() => inputRef.current?.click()}>
                {target === 'media' ? 'Escolher fotos' : 'Escolher arquivos'}
              </Button>
              <Button variant="secondary" size="sm" className="sm:hidden" icon={<Camera className="size-4" />} onClick={() => cameraRef.current?.click()}>
                Tirar foto
              </Button>
            </div>
            <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
            <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
          </div>
        )}

        {phase === 'done' && (
          <div className="flex animate-fade-up flex-col items-center py-6 text-center">
            <div className="mb-3 grid size-14 place-items-center rounded-full bg-ok/15 text-ok">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="font-display text-lg font-semibold text-fg">Tudo enviado!</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {IS_DEMO ? 'Na demonstração, os itens aparecem na lista apenas até você recarregar a página.' : 'Seus arquivos já estão seguros no servidor de casa.'}
            </p>
            <DemoTag className="mt-3" />
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-subtle">
              <span>
                {rows.length} {rows.length === 1 ? 'item' : 'itens'} · {formatBytes(total)}
              </span>
              {phase === 'sending' && <span>{Math.round(overall)}%</span>}
            </div>
            <ul className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5">
                  <FileIcon item={{ kind: kindFromName(r.file.name, r.file.type) }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{r.file.name}</p>
                    {phase === 'pick' ? (
                      <p className="text-xs text-subtle">{formatBytes(r.file.size)}</p>
                    ) : (
                      <ProgressBar value={r.pct} tone={r.done ? 'ok' : 'brand'} className="mt-1.5 h-1.5" />
                    )}
                  </div>
                  {phase === 'pick' && (
                    <button
                      onClick={() => setRows((list) => list.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-1.5 text-subtle hover:bg-surface-3 hover:text-fg"
                      aria-label={`Remover ${r.file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                  {r.done && <CheckCircle2 className="size-5 text-ok" />}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {phase === 'done' ? (
            <Button onClick={close}>Concluir</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={phase === 'sending'}>
                Cancelar
              </Button>
              <Button onClick={send} disabled={!rows.length} loading={phase === 'sending'} icon={<CloudUpload className="size-4" />}>
                {phase === 'sending' ? 'Enviando…' : rows.length ? `Enviar ${rows.length} ${rows.length === 1 ? 'item' : 'itens'}` : 'Enviar'}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </UploadContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUploads() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploads precisa estar dentro de <UploadProvider>')
  return ctx
}
