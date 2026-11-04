import { useEffect, useState } from 'react'
import { api } from '../services'
import type { User } from '../types'

let cache: User[] | null = null
let pending: Promise<User[]> | null = null

/** Lista de familiares (com cache simples), usada para avatares e compartilhamento. */
export function useFamily() {
  const [family, setFamily] = useState<User[]>(cache ?? [])
  useEffect(() => {
    if (cache) return
    pending ??= api.people.family()
    pending.then((list) => {
      cache = list
      setFamily(list)
    }).catch(() => {
      pending = null
    })
  }, [])
  const byId = (id: string) => family.find((u) => u.id === id)
  return { family, byId }
}
