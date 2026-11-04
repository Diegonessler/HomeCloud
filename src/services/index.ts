// Ponto único de acesso aos dados. Páginas importam `api` daqui e nunca uma implementação concreta.
import { DATA_MODE } from './config'
import type { Api } from './contracts'
import { mockApi } from './mock/mockApi'
import { nextcloudApi } from './nextcloud/nextcloudApi'

export const api: Api = DATA_MODE === 'nextcloud' ? nextcloudApi : mockApi

export { DATA_MODE, IS_DEMO } from './config'
export { ServiceError } from './contracts'
export type { Api } from './contracts'
