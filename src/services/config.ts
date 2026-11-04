// Configuração da camada de dados.
// Defina no arquivo .env (veja .env.example):
//   VITE_DATA_MODE=demo        → dados fictícios (padrão)
//   VITE_DATA_MODE=nextcloud   → integração real (requer backend — veja README)
//   VITE_API_BASE=/api         → endereço do backend Node.js que fala com o Nextcloud

export type DataMode = 'demo' | 'nextcloud'

export const DATA_MODE: DataMode = import.meta.env.VITE_DATA_MODE === 'nextcloud' ? 'nextcloud' : 'demo'

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

export const IS_DEMO = DATA_MODE === 'demo'
