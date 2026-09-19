# Matriz Oficial de Provedores e Fontes de Dados • Entre Páginas

O motor do **Entre Páginas** opera estritamente como um agregador e consolidador de acervos legítimos, obras em domínio público, Creative Commons e instituições culturais oficiais. Não realiza web scraping invasivo, não indexa torrents, nem contorna sistemas de proteção por DRM.

---

## Tabela Comparativa dos 8 Provedores Oficiais

| Provedor | URL Oficial | Tipo de Acesso | Licença Padrão | Rate Limit | Requer API Key? | Formatos de Download | Suporte a Audiolivro |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Gutenberg** | [gutenberg.org](https://www.gutenberg.org) | API Gutendex REST | Domínio Público Universal | 60 req/min | ❌ Não | EPUB, HTML, TXT, MOBI | ❌ Não |
| **Open Library** | [openlibrary.org](https://openlibrary.org) | API REST JSON | Metadados Abertos (ODbL / CC0) | 100 req/min | ❌ Não | Consulta Bibliográfica & Capas | ❌ Não |
| **LibriVox** | [librivox.org](https://librivox.org) | API REST Oficial | Domínio Público (Áudio Livre) | 60 req/min | ❌ Não | ZIP (MP3), Streaming 64kbps | ✅ Sim (Player nativo) |
| **Standard Ebooks** | [standardebooks.org](https://standardebooks.org) | Feed OPDS 1.2 XML | Creative Commons Zero (CC0) | 30 req/min | ❌ Não | EPUB (Alta tipografia), KEPUB, AZW3 | ❌ Não |
| **Internet Archive** | [archive.org](https://archive.org) | Search API JSON | Open Texts / Acesso Público | 30 req/min | ❌ Não | PDF, EPUB *(torrents bloqueados)* | ❌ Não |
| **Wikisource** | [pt.wikisource.org](https://pt.wikisource.org) | MediaWiki Action API | CC-BY-SA 4.0 / Domínio Público | 45 req/min | ❌ Não | HTML Original, Consulta de Texto | ❌ Não |
| **Google Books** | [books.google.com](https://books.google.com) | Volumes API v1 | Informações Bibliográficas | 100 req/min | ⚠️ Opcional (`GOOGLE_BOOKS_API_KEY`) | Apenas metadados & prévia legal | ❌ Não |
| **Europeana** | [europeana.eu](https://www.europeana.eu) | REST API v2 | Patrimônio Cultural Aberto | 60 req/min | ⚠️ Opcional (`EUROPEANA_API_KEY`) | Consulta & Imagens de Alta Resolução | ❌ Não |

---

## Detalhamento Técnico de Cada Fonte

### 1. Project Gutenberg (via Gutendex)
- **API Endpoint:** `https://gutendex.com/books`
- **Tipo de Dados:** Textos clássicos mundiais integralmente liberados de direitos autorais.
- **Licença:** Domínio público global.
- **Formatos Disponíveis:** `application/epub+zip`, `text/html`, `text/plain`.
- **Estratégia de Cache:** TTL de 24 horas em memória; priorização do link direto para download de EPUB.
- **Observações:** O Gutendex é um espelho indexado mantido pela comunidade que fornece busca textual veloz sem sobrecarregar os servidores do Gutenberg.

### 2. Open Library (Internet Archive)
- **API Endpoint:** `https://openlibrary.org/search.json` / `https://openlibrary.org/works/{id}.json`
- **Tipo de Dados:** Metadados bibliográficos completos, catalogação de edições, ISBN-10, ISBN-13, contagem de páginas e capas em alta resolução.
- **Licença:** Open Database License (ODbL).
- **Formatos Disponíveis:** Fornece apenas metadados e links para capas (`https://covers.openlibrary.org/b/id/{id}-L.jpg`).
- **Observações:** Essencial para alimentar a biblioteca com números de páginas, capas ilustradas e sinopses ricas.

### 3. LibriVox (Audiolivros de Domínio Público)
- **API Endpoint:** `https://librivox.org/api/feed/audiobooks/`
- **Tipo de Dados:** Audiolivros completos narrados por voluntários da comunidade internacional.
- **Licença:** Domínio Público 100% livre.
- **Formatos Disponíveis:** Streaming direto via áudio MP3 (hospedado pelo Internet Archive), arquivos compactados ZIP com capítulos completos e metadados de narrador e duração.
- **Gamificação:** Gera `listeningXP` na proporção de **10 XP por minuto escutado**.

### 4. Standard Ebooks
- **API Endpoint:** `https://standardebooks.org/opds/all`
- **Tipo de Dados:** Obras em domínio público com tratamento tipográfico profissional e código limpo.
- **Licença:** CC0 1.0 Universal (Public Domain Dedication).
- **Formatos Disponíveis:** EPUB, AZW3 (Kindle), KEPUB (Kobo).
- **Observações:** Considerado o mais alto padrão de qualidade editorial livre para e-readers modernos.

### 5. Internet Archive (Open Texts)
- **API Endpoint:** `https://archive.org/advancedsearch.php` e `https://archive.org/metadata/{id}`
- **Tipo de Dados:** Textos históricos digitalizados por bibliotecas acadêmicas e acervos mundiais.
- **Licença:** Public Domain / Open Source.
- **Filtro Anti-Pirataria Rigoroso:** O adaptador do Entre Páginas rejeita explicitamente qualquer arquivo `.torrent`, metadados de warez ou itens sem licença aberta confirmada. Apenas links oficiais de PDFs e EPUBs são admitidos.

### 6. Wikisource (Wikimedia Foundation)
- **API Endpoint:** `https://pt.wikisource.org/w/api.php`
- **Tipo de Dados:** Textos originais em língua portuguesa transcritos colaborativamente com rigor filológico.
- **Licença:** Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0) e Domínio Público.
- **Formatos Disponíveis:** Leitura em tela (HTML).

### 7. Google Books API
- **API Endpoint:** `https://www.googleapis.com/books/v1/volumes`
- **Tipo de Dados:** Catálogo bibliográfico de amplitude global.
- **Licença:** Metadados públicos. Se a obra for comercial com direitos reservados, é exibido o selo claro: *"Disponível apenas para consulta bibliográfica nesta fonte"*.
- **Cota & Resiliência:** Caso atinja limite de requisição sem chave (código HTTP 429), o motor do Entre Páginas degrada com segurança sem interromper a pesquisa do usuário.

### 8. Europeana
- **API Endpoint:** `https://api.europeana.eu/record/v2/search.json`
- **Tipo de Dados:** Acervo digital de museus, galerias e bibliotecas da Europa.
- **Licença:** Acesso aberto e patrimônio cultural.
- **Observações:** Obras históricas, traduções raras e documentos ilustrados.

---

## Configuração Centralizada (`provider.config.ts`)

Todas as opções de timeout, taxas de requisição por minuto e limites de cada provedor estão consolidadas em:
`src/lib/providers/provider.config.ts`.
Novas fontes abertas podem ser adicionadas implementando a interface `BookProvider` e registrando-a no `BookProviderManager`.
