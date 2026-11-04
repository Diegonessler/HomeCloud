import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, FolderPlus, Pencil, Share2, Check, Eye, PenLine, UserMinus } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Avatar } from './ui/misc'
import { FileIcon } from './FileIcon'
import type { FileItem, Permission } from '../types'
import { useFamily } from '../hooks/useFamily'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services'
import { errorMessage } from '../hooks/useAsync'
import { cn } from '../lib/cn'
import { DemoTag } from './DemoBanner'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirmar',
  danger,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={body}
      icon={danger ? <AlertTriangle className="size-5 text-danger" /> : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}

export function NameDialog({
  open,
  onClose,
  onSubmit,
  mode,
  initial = '',
  loading,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string) => void
  mode: 'rename' | 'folder'
  initial?: string
  loading?: boolean
}) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setName(initial)
      setError(null)
    }
  }, [open, initial])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(mode === 'folder' ? 'Dê um nome para a pasta.' : 'O nome não pode ficar vazio.')
    if (/[\\/:*?"<>|]/.test(name)) return setError('Evite os caracteres \\ / : * ? " < > |')
    onSubmit(name)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'folder' ? 'Nova pasta' : 'Renomear'}
      description={mode === 'folder' ? 'Escolha um nome fácil de lembrar, como “Viagem 2026”.' : undefined}
      icon={mode === 'folder' ? <FolderPlus className="size-5" /> : <Pencil className="size-5" />}
    >
      <form onSubmit={submit}>
        <Input
          label="Nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onFocus={(e) => {
            // Seleciona o nome sem a extensão, como nos gerenciadores de arquivos
            const dot = e.target.value.lastIndexOf('.')
            e.target.setSelectionRange(0, dot > 0 && mode === 'rename' ? dot : e.target.value.length)
          }}
          error={error}
          placeholder={mode === 'folder' ? 'Ex.: Documentos da casa' : ''}
          maxLength={120}
        />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {mode === 'folder' ? 'Criar pasta' : 'Salvar nome'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Compartilhar com familiares — linguagem simples: "pode ver" ou "pode editar". */
export function ShareDialog({ item, onClose, onChanged }: { item: FileItem | null; onClose: () => void; onChanged?: () => void }) {
  const { family } = useFamily()
  const { user } = useAuth()
  const toast = useToast()
  const [access, setAccess] = useState<Record<string, Permission | undefined>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setAccess(Object.fromEntries(item.sharedWith.map((s) => [s.userId, s.permission])))
  }, [item])

  const others = family.filter((u) => u.id !== user?.id && u.id !== item?.ownerId)

  async function set(userId: string, perm: Permission | undefined) {
    if (!item) return
    const who = family.find((u) => u.id === userId)?.name ?? ''
    setSaving(userId)
    try {
      if (perm) await api.sharing.share(item.id, userId, perm)
      else await api.sharing.unshare(item.id, userId)
      setAccess((a) => ({ ...a, [userId]: perm }))
      toast.success(perm ? `Compartilhado com ${who}` : `${who} não tem mais acesso`, perm ? (perm === 'edit' ? 'Pode ver e editar.' : 'Pode apenas ver.') : undefined)
      onChanged?.()
    } catch (e) {
      toast.error('Não foi possível alterar o acesso', errorMessage(e))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal open={!!item} onClose={onClose} title="Compartilhar com a família" icon={<Share2 className="size-5" />} size="md">
      {item && (
        <>
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
            <FileIcon item={item} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{item.name}</p>
            <DemoTag />
          </div>
          <p className="mb-3 text-sm text-muted">Escolha quem pode acessar. Só as pessoas marcadas verão este item.</p>
          <ul className="space-y-2">
            {others.map((u) => {
              const perm = access[u.id]
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3 sm:flex-nowrap">
                  <Avatar user={u} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{u.name}</p>
                    <p className="text-xs text-subtle">{perm ? (perm === 'edit' ? 'Pode ver e editar' : 'Pode ver') : 'Sem acesso'}</p>
                  </div>
                  <div className="flex w-full gap-1.5 sm:w-auto">
                    <AccessButton active={perm === 'view'} onClick={() => set(u.id, 'view')} disabled={saving === u.id} icon={<Eye className="size-4" />} label="Ver" />
                    <AccessButton active={perm === 'edit'} onClick={() => set(u.id, 'edit')} disabled={saving === u.id} icon={<PenLine className="size-4" />} label="Editar" />
                    {perm && (
                      <button
                        onClick={() => set(u.id, undefined)}
                        disabled={saving === u.id}
                        className="grid size-9 place-items-center rounded-xl text-subtle transition hover:bg-danger/10 hover:text-danger"
                        aria-label={`Remover acesso de ${u.name}`}
                        title="Remover acesso"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} icon={<Check className="size-4" />}>
              Pronto
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

function AccessButton({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition sm:flex-none',
        active ? 'border-brand/50 bg-brand-soft text-brand' : 'border-line text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
