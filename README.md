# HomeCloud — Nuvem Familiar

Portal web da família para o NAS de casa (OpenMediaVault + Nextcloud). Os familiares usam o HomeCloud; o OMV continua sendo só a ferramenta do administrador.

> **Estado atual:** interface completa rodando com **dados demonstrativos**. Nenhuma operação chega ao servidor ainda — a própria interface avisa isso (faixa "Modo demonstração" e selos "Demonstração").

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173 (também acessível pela rede local)
npm run build        # gera dist/ para servir no NAS
npm run build:single # gera dist-single/index.html único (prévia/demonstração)
```

Contas de demonstração (senha `familia123`):

| E-mail | Papel |
| --- | --- |
| diego@homecloud.local | Administrador (vê a área Administração) |
| ana@homecloud.local | Familiar |

## Telas

| Rota | Página |
| --- | --- |
| `/entrar`, `/esqueci-senha` | Login e recuperação de senha |
| `/` | Início: boas-vindas, espaço, pastas favoritas, fotos e arquivos recentes, atividade |
| `/arquivos`, `/arquivos/:pasta` | Gerenciador: pastas, grade/lista, busca, ordenação, favoritar, compartilhar, renomear, baixar, excluir, arrastar e soltar |
| `/fotos` | Galeria por mês/ano, filtros, álbuns, visualização ampliada, vídeos |
| `/compartilhados` | Comigo, Por mim, Pastas da família, Privados — com quem tem acesso |
| `/favoritos`, `/lixeira` | Atalhos e recuperação (com confirmação antes de excluir de vez) |
| `/conta` | Foto, nome, senha, tema claro/escuro/automático, espaço, dados da conta |
| `/admin` | Só administrador: usuários, cotas, capacidade, saúde do servidor, discos, backups, temperatura |

## Estrutura

```
server/      backend Node (login, WebDAV/OCS, site) — veja server/server.mjs
deploy/      Dockerfile e compose.yml do NAS
src/
  pages/       uma página por rota
  components/  componentes reutilizáveis (ui/ = primitivos: Button, Input, Modal, Menu…)
  layouts/     AppLayout (menu lateral, topo, barra inferior no celular) e AuthLayout
  contexts/    Auth, Theme, Toast, Upload
  hooks/       useAsync, useFileActions, useFamily, useDebounce
  services/    camada de dados desacoplada da interface
    contracts.ts      interfaces que as páginas usam
    mock/             implementação demonstrativa (padrão)
    nextcloud/        esqueleto real: WebDAV, OCS Share API, cliente HTTP
  types/       tipos de domínio
  lib/         formatação pt-BR, tipos de arquivo, utilitários
public/        manifest.webmanifest, sw.js, ícones (PWA)
```

## Instalação no NAS (modo real, com Nextcloud)

Arquitetura: **navegador → HomeCloud (porta 8090, container `homecloud`) → Nextcloud (container `nextcloud`)**.
O backend em `server/` faz login no Nextcloud, guarda só uma *senha de app* revogável no servidor e entrega ao navegador um cookie httpOnly.

```bash
# no seu computador: gera build-nas/homecloud-nas.tar.gz (site em modo real + backend + Dockerfile + compose)
VITE_DATA_MODE=nextcloud npm run package:nas

# no NAS
cd /appdata && tar -xzf homecloud-nas.tar.gz && cd homecloud
mkdir -p data && chown 1000:1000 data
docker compose up -d --build
```

No Nextcloud, libere o acesso interno pelo nome do container e a origem real dos pedidos:

```bash
docker exec -u www-data nextcloud php occ config:system:set trusted_domains 10 --value=nextcloud
docker exec -u www-data nextcloud php occ config:system:set trusted_proxies 0 --value=172.16.0.0/12
```

Variáveis (em `deploy/compose.yml`): `NC_URL`, `FAMILY_GROUP` (grupo usado em "Toda a família"), `ADMIN_GROUP`, `PHOTOS_FOLDER` (destino dos envios da galeria), `HOST_NAME`.

### O que já funciona no modo real
Login/logout, sessão de 30 dias, pastas (listar, criar, renomear, excluir), envio com progresso (sem sobrescrever nomes iguais), download, busca, favoritos, recentes, lixeira (recuperar, excluir, esvaziar), galeria com miniaturas do Nextcloud e vídeos com avanço/retrocesso, compartilhar com pessoas ou com "Toda a família", notificações, atividade, troca de nome e senha, área do administrador (CPU, RAM, temperatura, disco, contas e cotas).

### Ainda não ligado (a interface avisa)
Troca da foto de perfil, recuperação de senha por e-mail (o admin redefine), monitoramento SMART e status de backups do OMV.

### Testes do backend
```bash
cd server && npm install && npm test   # 15 testes: mapeamento WebDAV/OCS + servidor contra um Nextcloud simulado
```

## PWA

`manifest.webmanifest` + `sw.js` permitem instalar no celular e no computador ("Adicionar à tela inicial"). O service worker guarda apenas a casca do app, nunca arquivos da família. Requer HTTPS (ex.: certificado do proxy reverso do NAS).

Ao servir `dist/` com Nginx, redirecione rotas desconhecidas para `index.html`:

```nginx
location / { try_files $uri /index.html; }
```

Ou use `VITE_ROUTER=hash` para não precisar disso.
