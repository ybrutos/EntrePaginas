# Auditoria do Projeto Atual • CURRENT_ARCHITECTURE.md
**Projeto:** Entre Páginas  
**Porta Oficial:** 3001  
**Data da Auditoria:** 19/09/2026  
**Status do Projeto Vizinho (Porta 3000 - Brutos Animes):** Preservado, intacto e ativo.

---

## 1. Estrutura de Diretórios e Arquivos

O projeto está estruturado em Next.js 14 (App Router) com TypeScript, Tailwind CSS e Prisma ORM:

```text
C:\Entre Páginas\
├── prisma/
│   ├── schema.prisma              # Definições das entidades relacionais
│   └── seed.ts                    # Seed com 27 gêneros, admin e karolayne
├── public/                        # Assets estáticos e manifest PWA
├── src/
│   ├── app/                       # Rotas App Router
│   │   ├── page.tsx               # Home pública (visitante) vs Dashboard (logado)
│   │   ├── layout.tsx             # Root layout com Navbar e Footer
│   │   ├── globals.css            # Design tokens e tipografia
│   │   ├── admin/providers/       # Painel de diagnóstico de fontes
│   │   ├── biblioteca/            # Estante privada do usuário
│   │   ├── buscar/                # Interface de busca agregada
│   │   ├── cadastro/              # Criação de conta
│   │   ├── conquistas/            # Visualização de insígnias
│   │   ├── estatisticas/          # Métricas de leitura do usuário
│   │   ├── explorar/              # Hub de 27 gêneros e categorias
│   │   ├── explorar/[genreSlug]/  # Obras filtradas por gênero
│   │   ├── ler/[bookId]/          # Leitor digital com controle de tema e notas
│   │   ├── livro/[id]/            # Ficha do livro, Matriz de Fontes e AudiobookPlayer
│   │   ├── login/                 # Autenticação com botões demo
│   │   ├── perfil/                # Preferências de privacidade e ranking
│   │   ├── ranking/               # Classificação pública opcional
│   │   ├── u/[username]/          # Perfil público de leitores
│   │   ├── usuarios/              # Gestão administrativa de usuários
│   │   └── api/                   # 14 endpoints serverless Next.js
│   ├── components/                # Componentes reutilizáveis
│   │   ├── audio/                 # AudiobookPlayer.tsx
│   │   ├── books/                 # BookCard.tsx, ProgressModal.tsx
│   │   ├── gamification/          # XPProgressBar.tsx, BadgeCard.tsx
│   │   └── layout/                # Navbar.tsx, Footer.tsx
│   └── lib/                       # Motores de negócio
│       ├── auth.ts                # Bcrypt, tokens seguros e cookies HttpOnly
│       ├── db.ts                  # Instância singleton do PrismaClient
│       ├── gamification/          # level-system.ts, xp-calculator.ts, achievements.ts
│       ├── providers/             # BookProviderManager, interfaces e 8 adaptadores
│       └── utils/                 # deduplication.ts, text.ts
└── tests/                         # 7 suítes de teste com Vitest (23 testes passando)
```

---

## 2. Banco de Dados Atual (`prisma/schema.prisma`)

Atualmente, o banco utiliza o PostgreSQL local (`entre_paginas` na porta 5432):

- `User`: Contas multiusuário com `username`, `email`, `passwordHash`, `role` (`USER`/`ADMIN`), `isPublicProfile`, `participateInRanking`, `totalXP`, `totalReadingXP`, `totalListeningXP`, `level`, `streakDays`.
- `Session`: Sessões com `token` único criptográfico e `expiresAt`.
- `Account`: Preparação para provedores federados (`credentials`, `google`, `apple`).
- `PasswordResetToken`: Recuperação futura de senha.
- `ReadingGoal`: Metas anuais por leitor.
- `Book`: Livro consolidado em entidade única (título, autor, capa, ano, páginas, contagem de palavras, etc.).
- `Author` & `BookAuthor`: Autores e relacionamentos muitos-para-muitos com ordenação.
- `Genre` & `BookGenre`: 27 gêneros normalizados.
- `BookSource`: Fontes rastreadas (`sourceName`, `externalId`, `canonicalUrl`, `isLegalDownload`, `isAudiobook`).
- `BookFormat`: Formatos digitais e links de download (`EPUB`, `MOBI`, `PDF`, `AUDIOBOOK`).
- `BookAudioChapter`: Capítulos de áudio para streaming.
- `LibraryItem`: Estante do usuário com status (`LENDO`, `LIDOS`, `QUERO_LER`, `PAUSADOS`, `ABANDONADOS`), notas, avaliação e tags.
- `ReadingProgress`: Progresso com porcentagem atual e `maxHistoricalPercent` para garantia de idempotência de XP.
- `ListeningProgress`: Progresso de audição em minutos com `listeningXP`.
- `XPTransaction`: Livro-razão contábil com transações de XP por leitura, audição e conquistas.
- `Achievement` & `UserAchievement`: Conquistas desbloqueáveis.
- `SearchCache`: Cache de queries de busca em banco.
- `ProviderLog`: Telemetria de requisições de provedores.

---

## 3. Provedores Atuais (`src/lib/providers/`)

O sistema conta com 8 adaptadores implementando a interface `BookProvider`:
1. **GutenbergProvider (`gutendex.com`):** Downloads de EPUB, HTML, TXT e MOBI em domínio público.
2. **OpenLibraryProvider (`openlibrary.org`):** Metadados, ISBN, páginas e capas em alta resolução.
3. **LibriVoxProvider (`librivox.org`):** Audiolivros em domínio público com narradores e faixas MP3.
4. **StandardEbooksProvider (`standardebooks.org`):** Feed OPDS para edições de alta tipografia.
5. **InternetArchiveProvider (`archive.org`):** Textos abertos com descarte rígido de arquivos `.torrent`.
6. **WikisourceProvider (`pt.wikisource.org`):** Textos integrais em português pela Wikimedia.
7. **GoogleBooksProvider (`googleapis.com/books/v1`):** Volumes API com prévia e catálogo bibliográfico.
8. **EuropeanaProvider (`api.europeana.eu`):** Patrimônio cultural europeu com suporte a chave opcional.

---

## 4. APIs Atuais (`src/app/api/`)

- `POST /api/auth/register`: Cadastro com hash bcrypt e criação de sessão automática.
- `POST /api/auth/login`: Verificação de credenciais e emissão de cookie `auth_token`.
- `POST /api/auth/logout`: Revogação da sessão e limpeza de cookies.
- `GET /api/auth/me`: Retorna dados do leitor autenticado via cookie.
- `PUT /api/auth/profile`: Atualização de bio, avatar, ranking e privacidade.
- `GET /api/genres`: Lista os 27 gêneros com contagem de obras.
- `GET /api/search`: Busca agregada e deduplicada com filtros.
- `GET /api/books/[id]`: Detalhes da obra com estado do usuário autenticado.
- `GET /api/library`: Estante particular do usuário autenticado.
- `POST /api/library`: Adiciona ou atualiza livros na estante pessoal.
- `POST /api/progress`: Salva progresso de leitura e computa XP idempotente ($1\text{ palavra} = 1\text{ XP}$).
- `POST /api/progress/audio`: Salva progresso de áudio e computa listeningXP ($1\text{ min} = 10\text{ XP}$).
- `GET /api/ranking`: Classificação pública dos leitores participantes.
- `GET /api/user`: Métricas e leitura atual do usuário logado.
- `GET /api/users/[username]`: Perfil público respeitando `isPublicProfile`.
- `GET /api/admin/providers`: Ping em tempo real de latência e saúde das 8 fontes.
- `GET /api/admin/users`: Gestão de usuários para administradores.

---

## 5. Páginas Atuais

- `/`: Home pública para visitantes e Dashboard para leitores logados.
- `/buscar`: Interface de busca com filtros e contador de fontes.
- `/explorar`: Catálogo visual dos 27 gêneros literários.
- `/explorar/[genreSlug]`: Hub de livros por gênero.
- `/livro/[id]`: Detalhes da obra, Matriz de Fontes e AudiobookPlayer.
- `/ler/[bookId]`: Leitor digital EPUB/HTML com temas, notas e marcadores.
- `/ranking`: Classificação da comunidade.
- `/u/[username]`: Perfil público do leitor.
- `/biblioteca`: Estante privada do leitor.
- `/conquistas`: Painel de medalhas e insígnias conquistadas.
- `/estatisticas`: Gráficos e números de leitura.
- `/admin/providers`: Status ao vivo dos provedores.
- `/usuarios`: Gestão administrativa de usuários cadastrados.
- `/login` e `/cadastro`: Autenticação.

---

## 6. Autenticação e Segurança Atual

- Senhas cifradas com `bcryptjs` (salt de 10 rounds).
- Cookies HttpOnly, SameSite=Lax, Secure em produção.
- Zero vazamento de senhas ou dados sensíveis em logs e respostas públicas.
- Isolamento absoluto da biblioteca de cada usuário.

---

## 7. Suíte de Testes Atual (`tests/`)

- `auth.test.ts`: Hashing bcrypt e tokens de sessão.
- `user-isolation.test.ts`: Isolamento entre usuários e privacidade de perfis.
- `providers.test.ts`: Registro dos 8 provedores e deduplicação de obras com fontes múltiplas.
- `gamification-audiobook.test.ts`: Idempotência de XP e cálculo de listeningXP.
- `deduplication.test.ts`: Mesclagem canônica de metadados.
- `levels.test.ts`: Marcos de níveis e títulos honoríficos.
- `gamification.test.ts`: Regras de gamificação básica.
- **Total:** 7 arquivos de teste, 23 testes aprovados (100%).

---

## 8. Pontos de Extensão para a V2

1. **Camada Work / Edition / Identifier / Alias:**
   Evoluir a representação de "Livro" para o modelo FRBR/OpenLibrary: `Work` $\rightarrow$ `Edition` $\rightarrow$ `BookFormat` $\rightarrow$ `AccessLink`.
2. **Nova Interface `BookProvider`:**
   Adicionar `capabilities`, tipagens específicas para `search`, `getBook`, `getWork`, `getEdition`, `getAvailability`, `getDownloadLinks`.
3. **Novos Provedores de Alta Escala:**
   - OverDrive / Libby (`LIBRARY_BORROW`, cópias, reservas).
   - WorldCat (OCLC, ISBN, bibliotecas mundiais).
   - HathiTrust (Full view vs Limited view).
   - DOAB / OAPEN (Acesso aberto acadêmico).
   - Repositórios acadêmicos e nacionais (SciELO Books, BDTD).
4. **Query Expansion & Cross-Lookup:**
   Identificação de títulos alternativos/traduções (ex: *"The Only One Left"* $\leftrightarrow$ *"O massacre da família Hope"*), extração de ISBNs/OCLCs para consulta cruzada em cascata.
5. **Entity Resolution:**
   Score de correspondência com `confidence` e `reasons[]`.
6. **Availability Engine & Honest Classification:**
   Enum `AccessType`, detecção de prévias parciais (`ContentAvailabilityAnalyzer`), distinção clara entre download, empréstimo, prévia e compra comercial.
7. **Observabilidade & Admin:**
   Circuit breaker, monitoramento de saúde de busca `/admin/search-health` e métricas de latência.
