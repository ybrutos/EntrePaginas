# Guia de Publicação do Entre Páginas (Vercel + Supabase)

Este documento foi preparado para guiá-lo no lançamento público da sua aplicação. O Entre Páginas é totalmente compatível com o ecossistema Serverless (Vercel) e bancos de dados gerenciados (Supabase). 

Abaixo está o passo a passo exato do que você precisa fazer manualmente. Não é necessário editar código!

---

## 1. Banco de Dados (Supabase)

O primeiro passo é criar um banco de dados hospedado em nuvem para armazenar os dados de produção.

1. Acesse [Supabase](https://supabase.com/) e crie uma conta (se não tiver).
2. Clique em **"New Project"**.
   - Escolha a organização padrão.
   - Dê um nome (ex: `entre-paginas-prod`).
   - Crie uma **Senha forte do Database** (Guarde essa senha! Você precisará dela).
   - Região: Escolha a mais próxima do seu público (ex: `São Paulo (sa-east-1)`).
   - Plano: Escolha o **Free**.
   - Clique em **Create new project**.
3. Aguarde o provisionamento (pode levar uns minutos).
4. No menu lateral esquerdo, clique em **Project Settings** (o ícone de engrenagem) e depois em **Database**.
5. Role até a seção **Connection string** e clique na aba **URI**.
6. Ative o **Use connection pooling** (Transaction mode, porta 6543).
7. Copie essa URL. Ela se parecerá com isso:
   `postgresql://postgres.[SEU-REF]:[YOUR-PASSWORD]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true`
8. Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 2. 
   > **Importante:** Guarde esta URL! Ela é a sua `DATABASE_URL` de produção.

### 1.1 Limitações do Plano Gratuito (Supabase)
- **Banco de dados:** 500 MB (Ideal para texto. Evite armazenar arquivos PDF ou imagens localmente, o app usa URLs externas para otimizar isso).
- **Inatividade:** Projetos gratuitos do Supabase entram em pausa caso não tenham atividade no painel de administração ou requisições na API em 7 dias (embora chamadas via Prisma devam mantê-lo acordado).

---

## 2. Configurando o Repositório e Variáveis de Ambiente

No seu projeto local (`C:\Entre Páginas`), você deve renomear ou usar as variáveis a seguir na Vercel, mas primeiro, suba o código:

1. Acesse o **GitHub** e crie um novo repositório (privado recomendado).
2. Faça push do código local:
   ```bash
   git add .
   git commit -m "Preparando para Vercel e Supabase"
   git push origin main
   ```

*(Nota: Certifique-se de que o arquivo `.env` **NÃO** está sendo enviado. Ele deve constar no `.gitignore`)*

---

## 3. Hospedagem Frontend (Vercel)

1. Acesse [Vercel](https://vercel.com/) e faça login usando o GitHub.
2. Na página principal, clique em **"Add New..." > "Project"**.
3. Localize o repositório do "Entre Páginas" que você criou no GitHub e clique em **Import**.
4. Na tela de **Configure Project**:
   - **Framework Preset:** Next.js (já virá selecionado).
   - **Root Directory:** `./`
   - Abra a seção **Environment Variables** e adicione as seguintes:

   | Name | Value |
   | :--- | :--- |
   | `DATABASE_URL` | Cole a string que você pegou do Supabase (porta 6543 / Transaction Pooler). |
   | `DIRECT_URL` | Copie a mesma do Supabase, mas desative o connection pooling (porta 5432). *(Usado para migrations).* |
   | `AUTH_SECRET` | Gere uma senha aleatória longa (ex: `openssl rand -hex 32` no terminal ou digite algo bem complexo de 64 caracteres). |
   | `NEXT_PUBLIC_APP_URL` | `https://[NOME-DO-SEU-APP].vercel.app` (Ou atualize isso depois que a Vercel gerar o seu link no fim do Deploy). |

5. Clique em **Deploy**. A Vercel vai instalar os pacotes, rodar o `prisma generate`, fazer a build do Next.js e publicar.
6. Se der tudo certo, você receberá um link como: `https://entre-paginas-git-main-seuusuario.vercel.app`. Acesse esse link e teste.

---

## 4. Migrations (Tabelas Iniciais do Banco)

Agora que a aplicação está na Vercel e o Supabase está de pé, precisamos criar as tabelas no Supabase (que está vazio).

1. No seu computador local, certifique-se que o `.env` local aponta para o Supabase temporariamente, ou use o comando abaixo trocando `<SUA_DIRECT_URL_DO_SUPABASE>` pela URL do Supabase com porta 5432:

```bash
npx prisma db push --schema=prisma/schema.prisma
```
Ou se preferir via migrations oficiais:
```bash
npx prisma migrate deploy
```

Isso fará o Prisma ler seu `schema.prisma` e criar todas as tabelas, indexes e relações no seu Supabase novo.

---

## 5. (Opcional) Promovendo a si mesmo a ADMIN

Como não exigimos pagamento ou banco pré-populado, você pode acessar a URL pública gerada pela Vercel e **Criar uma conta**.

Ao criar a primeira conta, ela terá a permissão `USER`.
Para se tornar o Administrador real sem depender de rotas vulneráveis, rode o script localmente, apontando para o banco de produção:

1. No seu computador:
   ```bash
   npx tsx scripts/promote-admin.ts <seu-email-ou-username>
   ```
*(O script solicitará a `DATABASE_URL` de produção e atualizará seu cargo para ADMIN com segurança no PostgreSQL)*.

---

## Próximos Passos (SEO e Domínio)
Se no futuro quiser um domínio próprio (ex: `entrepáginas.com`), vá no painel da Vercel, em **Settings > Domains**, e adicione o domínio. Não esqueça de mudar a variável `NEXT_PUBLIC_APP_URL` na Vercel depois!
