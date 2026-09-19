# Política de Segurança e Privacidade • Entre Páginas

O **Entre Páginas** adota diretrizes de segurança defensiva por padrão (*Secure by Default*), com proteção a dados pessoais, isolamento estrito entre usuários e conformidade legal de propriedade intelectual.

---

## 1. Autenticação e Gestão de Credenciais

- **Criptografia de Senhas:** Senhas são processadas com o algoritmo `bcrypt` (`bcryptjs`) utilizando fator de custo (work factor) de 10 rounds de salt aleatório.
  - O sistema **jamais** armazena, transmite ou registra senhas em texto puro em logs ou bancos de dados.
  - A complexidade mínima de senha é validada na criação da conta.
- **Sessões Criptográficas:**
  - Identificadores de sessão são gerados a partir de geradores de números pseudo-aleatórios criptograficamente seguros (`crypto.randomBytes(32)`).
  - Tokens são transmitidos ao navegador exclusivamente através de cookies com os atributos:
    - `HttpOnly`: Impede a leitura do token por scripts JavaScript maliciosos em caso de ataques de Cross-Site Scripting (XSS).
    - `SameSite=Lax`: Previne ataques de Cross-Site Request Forgery (CSRF) em requisições de outros domínios.
    - `Secure`: Ativado automaticamente em conexões HTTPS de produção.
    - `Path=/`: Restrito ao escopo do domínio da aplicação.

---

## 2. Isolamento Rígido de Dados Multiusuário

1. **Escopo Obrigatório por Usuário Autenticado:**
   - Toda consulta de estante (`/api/library`), atualização de leitura (`/api/progress`) ou streaming de audiolivro (`/api/progress/audio`) extrai a identidade do leitor unicamente da sessão autenticada via cookie de servidor (`getCurrentUser()`).
   - Parâmetros enviados pelo cliente como `?userId=...` ou corpos de requisição contendo identidades forjadas são terminantemente ignorados para efeitos de autorização.
   - O Usuário A **não tem acesso** aos livros favoritados, resenhas particulares, notas ou porcentagens de leitura do Usuário B.

2. **Privacidade Seletiva:**
   - **Ranking:** Participar do ranking da comunidade é uma opção de opt-in (`participateInRanking = true`). Leitores que optarem por privacidade não constam na classificação.
   - **Perfil Público:** O endpoint `/u/[username]` verifica a flag `isPublicProfile`. Perfis privados ocultam todas as métricas e livros, exibindo apenas aviso de privacidade preservada. Em hipótese alguma o e-mail ou o papel administrativo do usuário é exposto publicamente.

---

## 3. Conformidade Legal & Política Anti-Pirataria

O Entre Páginas foi desenvolvido sob a premissa fundamental de valorizar o patrimônio cultural aberto e respeitar os direitos autorais:

1. **Apenas Fontes Legítimas e Abertas:**
   - Trabalhamos exclusivamente com obras em **Domínio Público**, licenças **Creative Commons** e acervos culturais autorizados (Project Gutenberg, Open Library, LibriVox, Standard Ebooks, Internet Archive, Wikisource, Google Books e Europeana).
2. **Exclusão Ativa de Redes Piratas:**
   - Não há suporte, raspagem ou direcionamento para redes torrents, sites warez, bypass de DRM ou quebra de paywalls.
   - O adaptador do *Internet Archive* aplica filtro programático explícito para descartar arquivos `.torrent`, `.sqlite` ou conteúdos protegidos.
3. **Downloads Responsáveis:**
   - Quando um livro possui download legal (ex: EPUB no Gutenberg ou Standard Ebooks), o link oficial é fornecido ao usuário com transparência total de procedência.
   - Não fazemos espelhamento não autorizado nem proxy abusivo de arquivos volumosos.

---

## 4. Proteção contra Injeções & Ataques Web

- **SQL Injection:** O acesso a banco de dados é intermediado integralmente pelo Prisma ORM com queries parametrizadas nativas, eliminando vetores de injeção direta de SQL.
- **Rate Limiting & Resiliência:** Requisições a APIs externas contam com limites de requisição por minuto e timeouts controlados via `AbortController`, evitando ataques de negação de serviço (DoS) reflexivos.
- **Sanitização de Entradas:** Expressões de busca e strings de usuário passam por sanitização contra caracteres de controle e injeções de HTML.
