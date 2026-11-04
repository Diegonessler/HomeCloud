// Cliente HTTP para o backend do HomeCloud (pasta server/).
//
// SEGURANÇA — como funciona:
// O navegador NUNCA fala direto com o Nextcloud nem guarda senhas/tokens.
// O backend, no próprio NAS:
//   1. recebe usuário/senha no login e troca por uma "senha de app" revogável no Nextcloud;
//   2. guarda essa senha de app SOMENTE no servidor;
//   3. devolve ao navegador um cookie de sessão httpOnly + SameSite=Strict;
//   4. atende /api/... em nome do usuário, aplicando as permissões reais.
// O cabeçalho X-Requested-With protege contra pedidos forjados por outros sites (CSRF).

import { API_BASE } from '../config'
import { ServiceError } from '../contracts'

const CSRF_HEADER = { 'X-Requested-With': 'HomeCloud' }

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null
}

export async function http<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts
  const isJson = body !== undefined && body !== null && !(body instanceof FormData) && !(body instanceof Blob) && typeof body === 'object'

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'same-origin',
      headers: {
        ...CSRF_HEADER,
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        Accept: 'application/json',
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : (body as BodyInit | null | undefined),
      ...rest,
    })
  } catch {
    throw new ServiceError('Sem conexão com o servidor de casa. Confira sua internet ou o Tailscale.', 'network')
  }

  if (!res.ok) {
    let msg =
      res.status === 401
        ? 'Sua sessão expirou. Entre novamente.'
        : res.status === 403
          ? 'Você não tem permissão para isso.'
          : 'Não foi possível concluir. Tente novamente em instantes.'
    try {
      const data = await res.json()
      if (data?.message) msg = data.message
    } catch {
      /* resposta sem JSON */
    }
    throw new ServiceError(msg, res.status === 401 ? 'unauthorized' : `http_${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const type = res.headers.get('content-type') ?? ''
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>
}

/** Envio com progresso real (fetch ainda não expõe progresso de upload) */
export function uploadWithProgress<T = unknown>(path: string, file: File, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `${API_BASE}${path}`)
    xhr.setRequestHeader('X-Requested-With', 'HomeCloud')
    if (file.type) xhr.setRequestHeader('Content-Type', file.type)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      if (xhr.status < 300) return resolve(xhr.response as T)
      const msg = (xhr.response as { message?: string } | null)?.message ?? `Falha ao enviar "${file.name}".`
      reject(new ServiceError(msg, `http_${xhr.status}`))
    }
    xhr.onerror = () => reject(new ServiceError('A conexão caiu durante o envio. Tente de novo.', 'network'))
    xhr.send(file)
  })
}
