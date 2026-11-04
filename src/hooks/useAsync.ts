import { useCallback, useEffect, useRef, useState, type DependencyList, type Dispatch, type SetStateAction } from 'react'
import { ServiceError } from '../services'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setData: Dispatch<SetStateAction<T | undefined>>
}

/** Carrega dados de um serviço com estados de carregamento e erro amigável. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const callId = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const id = ++callId.current
    setLoading(true)
    setError(null)
    try {
      const result = await run()
      if (id === callId.current) setData(result)
    } catch (e) {
      if (id === callId.current) setError(errorMessage(e))
    } finally {
      if (id === callId.current) setLoading(false)
    }
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload, setData }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ServiceError) return e.message
  return 'Algo deu errado. Tente novamente em instantes.'
}
