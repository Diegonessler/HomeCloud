import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpDown,
  ChevronRight,
  CloudUpload,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  SearchX,
  X,
  Check,
  Home,
} from 'lucide-react'
import { api } from '../services'
import { useAsync, errorMessage } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useFileActions } from '../hooks/useFileActions'
import { useUploads } from '../contexts/UploadContext'
import { useToast } from '../contexts/ToastContext'
import { FileCollection } from '../components/FileCollection'
import { FilePreview } from '../components/FilePreview'
import { ConfirmDialog, NameDialog, ShareDialog } from '../components/dialogs'
import { Button } from '../components/ui/Button'
import { EmptyState, Segmented } from '../components/ui/misc'
import { Menu } from '../components/ui/Menu'
import type { FileItem, SortDir, SortKey, ViewMode } from '../types'
import { cn } from '../lib/cn'
import { sortItems } from '../lib/sort'
import { folderHref } from '../lib/routes'

const VIEW_KEY = 'hc.view'
const SORT_LABEL: Record<SortKey, string> = { name: 'Nome', size: 'Tamanho', date: 'Data' }

function readView(): ViewMode {
  try {
    return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid'
  } catch {
    return 'grid'
  }
}

export default function FilesPage() {
  const { folderId = null } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { openUpload, version } = useUploads()

  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const debounced = useDebounce(query, 300)
  const searching = debounced.trim().length > 0
  const searchRef = useRef<HTMLInputElement>(null)

  const [view, setViewState] = useState<ViewMode>(readView)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [preview, setPreview] = useState<FileItem | null>(null)
  const [newFolder, setNewFolder] = useState(false)
  const [creating, setCreating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => setQuery(urlQuery), [urlQuery])
  useEffect(() => {
    if (params.get('buscar')) searchRef.current?.focus()
  }, [params])

  const list = useAsync(
    () => (searching ? api.files.search(debounced) : api.files.list(folderId)),
    [folderId, debounced, searching, version],
  )
  const path = useAsync(() => api.files.path(folderId), [folderId])
  const current = path.data?.[path.data.length - 1]

  const actions = useFileActions(list.reload)

  const items = useMemo(() => sortItems(list.data ?? [], sortKey, sortDir), [list.data, sortKey, sortDir])

  function setView(v: ViewMode) {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ok */
    }
  }

  function open(item: FileItem) {
    if (item.kind === 'folder') {
      setQuery('')
      if (urlQuery) setParams({})
      navigate(folderHref(item.id))
    } else setPreview(item)
  }

  async function createFolder(name: string) {
    setCreating(true)
    try {
      const f = await api.files.createFolder(folderId, name)
      toast.success('Pasta criada', `"${f.name}" está pronta para receber arquivos.`)
      setNewFolder(false)
      list.reload()
    } catch (e) {
      toast.error('Não foi possível criar a pasta', errorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  function clearSearch() {
    setQuery('')
    if (urlQuery || params.get('buscar')) setParams({})
  }

  const uploadHere = (files?: File[]) => openUpload({ parentId: folderId, folderName: current?.name ?? 'Meus arquivos', files })

  // Arrastar e soltar em qualquer lugar da página
  const dragHandlers = {
    onDragEnter: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      dragDepth.current++
      setDragging(true)
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (!dragDepth.current) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      if (e.dataTransfer.files.length) uploadHere(Array.from(e.dataTransfer.files))
    },
  }

  return (
    <div {...dragHandlers} className="relative min-h-[60vh]">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Caminho" className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1 text-sm text-subtle">
            <Link to="/arquivos" className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 hover:text-fg">
              <Home className="size-4" /> Meus arquivos
            </Link>
            {path.data?.map((p) => (
              <span key={p.id} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="size-4 shrink-0" />
                <Link to={folderHref(p.id)} className={cn('truncate rounded-lg px-1 py-0.5 hover:text-fg', p.id === folderId && 'text-muted')}>
                  {p.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {searching ? `Resultados para “${debounced}”` : (current?.name ?? 'Meus arquivos')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FolderPlus className="size-[18px]" />} onClick={() => setNewFolder(true)} className="flex-1 sm:flex-none">
            Nova pasta
          </Button>
          <Button icon={<CloudUpload className="size-[18px]" />} onClick={() => uploadHere()} className="flex-1 sm:flex-none">
            Enviar
          </Button>
        </div>
      </div>

      {/* Barra de ferramentas */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="group flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 transition focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10 sm:max-w-xs">
          <Search className="size-4 text-subtle group-focus-within:text-brand" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar em todos os arquivos"
            aria-label="Procurar em todos os arquivos"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
          {query && (
            <button onClick={clearSearch} className="rounded-md p-0.5 text-subtle hover:text-fg" aria-label="Limpar pesquisa">
              <X className="size-4" />
            </button>
          )}
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Menu
            label="Ordenar"
            trigger={({ toggle }) => (
              <Button variant="secondary" size="sm" className="h-10" onClick={toggle} icon={<ArrowUpDown className="size-4" />}>
                <span className="hidden sm:inline">{SORT_LABEL[sortKey]}</span>
              </Button>
            )}
          >
            {(close) => (
              <div>
                <p className="px-3 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-subtle uppercase">Ordenar por</p>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <button
                    key={k}
                    role="menuitem"
                    onClick={() => {
                      if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                      else {
                        setSortKey(k)
                        setSortDir(k === 'name' ? 'asc' : 'desc')
                      }
                      close()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg hover:bg-surface-3 focus:bg-surface-3 focus:outline-none"
                  >
                    <span className="w-4">{k === sortKey && <Check className="size-4 text-brand" />}</span>
                    {SORT_LABEL[k]}
                    {k === sortKey && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-subtle">
                        <ArrowDownAZ className={cn('size-3.5', sortDir === 'desc' && 'rotate-180')} />
                        {sortDir === 'asc' ? (k === 'name' ? 'A→Z' : k === 'size' ? 'menor' : 'antigos') : k === 'name' ? 'Z→A' : k === 'size' ? 'maior' : 'recentes'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Menu>
          <Segmented
            label="Modo de visualização"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Grade', icon: <LayoutGrid className="size-4" /> },
              { value: 'list', label: 'Lista', icon: <List className="size-4" /> },
            ]}
          />
        </div>
      </div>

      {list.error && (
        <EmptyState icon={<SearchX className="size-7" />} title="Não foi possível carregar" body={list.error} action={<Button onClick={list.reload}>Tentar de novo</Button>} />
      )}

      {!list.error && !list.loading && items.length === 0 ? (
        searching ? (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title="Nada encontrado"
            body={`Não achamos arquivos com “${debounced}”. Confira a escrita ou tente uma palavra mais curta.`}
            action={<Button variant="secondary" onClick={clearSearch}>Limpar pesquisa</Button>}
          />
        ) : (
          <EmptyState
            icon={<FolderOpen className="size-7" />}
            title="Esta pasta está vazia"
            body="Arraste arquivos para cá ou use o botão abaixo para enviar do seu aparelho."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={<CloudUpload className="size-4" />} onClick={() => uploadHere()}>Enviar arquivos</Button>
                <Button variant="secondary" icon={<FolderPlus className="size-4" />} onClick={() => setNewFolder(true)}>Nova pasta</Button>
              </div>
            }
          />
        )
      ) : (
        !list.error && (
          <FileCollection
            items={items}
            view={view}
            loading={list.loading && !list.data}
            onOpen={open}
            onFavorite={actions.toggleFavorite}
            onShare={actions.setSharing}
            onRename={actions.setRenaming}
            onDownload={actions.download}
            onDelete={actions.setDeleting}
          />
        )
      )}

      {/* Sobreposição de arrastar e soltar */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[65] grid animate-fade-in place-items-center bg-[#030612]/60 p-6 backdrop-blur-sm lg:pl-[272px]">
          <div className="flex animate-scale-in flex-col items-center rounded-3xl border-2 border-dashed border-brand bg-surface/90 px-12 py-10 text-center glow">
            <div className="mb-4 grid size-16 animate-float place-items-center rounded-2xl bg-gradient-brand text-white">
              <CloudUpload className="size-8" />
            </div>
            <p className="font-display text-xl font-semibold text-fg">Solte para enviar</p>
            <p className="mt-1 text-sm text-muted">para “{current?.name ?? 'Meus arquivos'}”</p>
          </div>
        </div>
      )}

      <FilePreview
        item={preview}
        onClose={() => setPreview(null)}
        onDownload={actions.download}
        onShare={(i) => {
          setPreview(null)
          actions.setSharing(i)
        }}
        onFavorite={async (i) => {
          await actions.toggleFavorite(i)
          setPreview((p) => (p ? { ...p, favorite: !p.favorite } : p))
        }}
      />
      <NameDialog open={newFolder} mode="folder" onClose={() => setNewFolder(false)} onSubmit={createFolder} loading={creating} />
      <NameDialog
        open={!!actions.renaming}
        mode="rename"
        initial={actions.renaming?.name}
        onClose={() => actions.setRenaming(null)}
        onSubmit={actions.confirmRename}
        loading={actions.busy}
      />
      <ConfirmDialog
        open={!!actions.deleting}
        onClose={() => actions.setDeleting(null)}
        onConfirm={actions.confirmDelete}
        loading={actions.busy}
        danger
        title={`Mover “${actions.deleting?.name}” para a lixeira?`}
        body={
          actions.deleting?.kind === 'folder'
            ? 'A pasta e tudo o que está dentro dela irão para a lixeira. Você pode recuperar depois.'
            : 'Você poderá recuperar o arquivo pela Lixeira enquanto ela não for esvaziada.'
        }
        confirmLabel="Mover para a lixeira"
      />
      <ShareDialog item={actions.sharing} onClose={() => actions.setSharing(null)} onChanged={list.reload} />
    </div>
  )
}
