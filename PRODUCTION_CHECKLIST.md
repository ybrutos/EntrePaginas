# Checklist de Lançamento em Produção (Entre Páginas)

Antes de anunciar o lançamento público do sistema, certifique-se de que todos os itens abaixo estão confirmados. 
Não pule nenhuma etapa.

---

### Banco de Dados (Supabase)
- [ ] O banco de produção foi criado com sucesso no Supabase.
- [ ] O schema foi migrado corretamente para o banco (`prisma db push` ou `prisma migrate deploy`).
- [ ] O `DATABASE_URL` (com Transaction Pooling porta 6543) foi configurado na Vercel.
- [ ] O `DIRECT_URL` (porta 5432) foi configurado na Vercel (se estiver usando migrations completas do prisma).

### Segurança e Autenticação
- [ ] A variável `AUTH_SECRET` possui alta entropia (gerada de forma segura e não hardcoded).
- [ ] As URLs de redirecionamento/aplicação (`NEXT_PUBLIC_APP_URL`) refletem o domínio final na Vercel, e não `localhost`.
- [ ] O arquivo `.env` nunca foi adicionado ao Git (verificar `git status` e `.gitignore`).
- [ ] Nenhuma credencial ou token foi deixado em arquivos estáticos ou logado no console para produção.
- [ ] O rate limiting leve está em vigor nas rotas de Autenticação (`/api/auth/login`, `/api/auth/register`) para mitigar ataques de força bruta.
- [ ] Os dados de sessão garantem isolamento de usuário em endpoints privados através da função `getCurrentUser()`, ignorando Ids de cliente em transações (ex: ganhar XP, modificar a própria biblioteca).
- [ ] Nenhum endpoint `ADMIN` foi exposto publicamente; eles usam `getCurrentUser()` verificando a `.role === 'ADMIN'`.

### SEO e Interface
- [ ] O OpenGraph e os metadados (Título e Descrição) no `layout.tsx` estão configurados para o nome e propósito reais do projeto.
- [ ] As páginas de Termos de Uso e Política de Privacidade estão acessíveis ao público (ex: informando isenção sobre disponibilidade dos metadados de fontes externas).

### Qualidade de Código (Build)
- [ ] Os testes unitários (`npm test`) passam sem erros.
- [ ] O Next.js compilou com sucesso (`npm run build`).
- [ ] O Linter não reporta erros impeditivos (`npm run lint`).
- [ ] As rotas dinâmicas ou dependentes de requisição (como APIs REST e rotas de busca) usam `force-dynamic` se não puderem ser armazenadas em cache estaticamente na CDN da Vercel.

### Validação Pós-Deploy
- [ ] URL pública abre corretamente no Desktop e no Celular.
- [ ] Cadastro de um usuário real (comum) funciona perfeitamente (cria o registro e loga).
- [ ] Uma busca pública nos provedores de livros funciona sem exigir login.
- [ ] Foi possível promover você mesmo a Administrador com sucesso rodando o script isolado: `npx tsx scripts/promote-admin.ts <seu_email>`.
- [ ] Deslogar e logar novamente mantém a sessão funcional.

---
**Resultado Esperado:** Um sistema Serverless multiusuário no qual você atua como super-administrador, e os usuários conseguem acessar publicamente sem acessar informações cruzadas.
