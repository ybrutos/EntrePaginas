# Entre Páginas 📖✨

> *"Onde cada livro vira uma nova jornada."*  
> **Plataforma Online Multiusuário de Descoberta, Organização e Gamificação de Leitura.**

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest%20(23%20passed)-729B1B?logo=vitest)](https://vitest.dev/)
[![Port](https://img.shields.io/badge/Local%20Port-3001-722F37)](http://localhost:3001)

---

## 🌟 Visão Geral

O **Entre Páginas** é uma plataforma literária moderna, elegante e multiusuário. Qualquer leitor pode criar sua própria conta, manter sua estante privada, registrar metas, acompanhar progresso de leitura e audição, e evoluir através de um sistema de gamificação com níveis, conquistas e contabilidade de XP estritamente idempotente.

O sistema integra e consolida em tempo real dados de **8 bibliotecas digitais abertas e acervos culturais legítimos**, com deduplicação inteligente baseada em similaridade e ISBN, reprodutores de audiolivros do LibriVox integrados e downloads legais de EPUB e PDF.

---

## 🏛️ Os 8 Provedores Oficiais Integrados

1. **Project Gutenberg (Gutendex):** Clássicos em domínio público com download de EPUB, HTML, TXT e MOBI.
2. **Open Library:** Maior catálogo de metadados abertos, ISBN, paginação e capas em alta resolução.
3. **LibriVox:** Gravações de audiolivros em domínio público com player de streaming integrado e ganho de `listeningXP`.
4. **Standard Ebooks:** Obras de domínio público com tratamento editorial e tipográfico de alta qualidade.
5. **Internet Archive (Open Texts):** Acervo de textos históricos e digitalizações *(filtros estritos anti-torrent)*.
6. **Wikisource (PT):** Textos integrais em português pela Wikimedia Foundation sob Creative Commons e Domínio Público.
7. **Google Books:** Catálogo bibliográfico de amplitude global.
8. **Europeana:** Acervo de patrimônio cultural, histórico e bibliográfico europeu.

Consulte a matriz completa em [PROVIDERS.md](file:///c:/Entre%20P%C3%A1ginas/PROVIDERS.md).

---

## 🛡️ Compromisso de Legalidade & Zero Pirataria

- **Sem Torrents ou Warez:** A plataforma rejeita qualquer link não autorizado, bypass de DRM ou violação de termos de uso.
- **Separação Transparente:**
  - 📚 **Metadados disponíveis**: Obras comerciais são identificadas apenas para catalogação e consulta.
  - 📥 **Download legal disponível**: Obras em Domínio Público ou licenças abertas exibem botões claros de download direto com a fonte informada.
  - 🎧 **Audiolivro integrado**: Gravações gratuitas do LibriVox com player e capítulos.

---

## 👥 Contas Padrão para Testes e Demonstração

O banco de dados local inclui duas contas pré-configuradas para validação rápida:

| Usuário | E-mail | Senha | Papel | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin@entre-paginas.local` | `admin123` | `ADMIN` | Acesso completo ao painel de status `/admin/providers` e gestão de usuários `/usuarios`. |
| **`karolayne`** | `karolayne@entre-paginas.local` | `karolayne123` | `USER` | Conta de usuária seed com histórico de leitura, conquistas e progresso demonstrativo. |

> **Nota de Isolamento:** A estante e leituras da usuária Karolayne são estritamente privadas e **nunca** aparecem para novas contas criadas. Cada novo usuário registrado no `/cadastro` tem estante, favoritos e XP completamente independentes.

---

## 🚀 Como Executar Localmente

### 1. Requisitos
- Node.js 18+ (recomendado 20+)
- PostgreSQL ativo na porta `5432` com banco `entre_paginas`
- Aplicação roda na porta **3001** (não conflita com a porta 3000)

### 2. Instalação e Preparação
```bash
# Entrar no diretório
cd "C:\Entre Páginas"

# Instalar dependências
npm install

# Sincronizar o banco de dados via Prisma
npx prisma db push

# Executar o seed inicial (cria as contas admin e karolayne e 27 gêneros)
npm run db:seed
```

### 3. Rodar Testes Automatizados
```bash
npm test
```
*Executa 23 testes unitários e de integração cobrindo autenticação bcrypt, deduplicação, gamificação, isolamento multiusuário e provedores.*

### 4. Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em: [http://localhost:3001](http://localhost:3001)

---

## 📂 Rotas Principais da Aplicação

- `/`: Home pública (para visitantes) ou Dashboard Pessoal (após login).
- `/buscar`: Motor de busca global agregando as 8 fontes com filtros avançados.
- `/explorar`: Navegação visual pelos 27 gêneros e categorias literárias normalizadas.
- `/explorar/[genreSlug]`: Hub específico do gênero (ex: `/explorar/romance`, `/explorar/ficcao-cientifica`).
- `/livro/[id]`: Página detalhada da obra com Matriz de Fontes & Direitos, downloads e player de audiolivro.
- `/ler/[bookId]`: Leitor digital com controle de tema (Sépia, Noturno, Claro), marcadores, notas e sincronização de XP.
- `/ranking`: Classificação da comunidade por XP e palavras lidas (apenas usuários com opt-in ativo).
- `/u/[username]`: Perfil público do leitor (respeita flags de privacidade).
- `/admin/providers`: Painel diagnóstico em tempo real do status dos 8 provedores.
- `/usuarios`: Área administrativa de gestão de leitores.
- `/login` e `/cadastro`: Autenticação e criação de novas contas com senhas em hash bcrypt.

---

## 📚 Documentação Complementar

- [ARCHITECTURE.md](file:///c:/Entre%20P%C3%A1ginas/ARCHITECTURE.md) — Diagrama e especificação da arquitetura técnica.
- [PROVIDERS.md](file:///c:/Entre%20P%C3%A1ginas/PROVIDERS.md) — Matriz completa dos 8 provedores, termos de uso e rate limits.
- [DEPLOY.md](file:///c:/Entre%20P%C3%A1ginas/DEPLOY.md) — Passo a passo para publicação 100% gratuita na Vercel + Supabase.
- [SECURITY.md](file:///c:/Entre%20P%C3%A1ginas/SECURITY.md) — Diretrizes de segurança, criptografia e privacidade por padrão.
