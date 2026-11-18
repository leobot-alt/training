# Somente — Portal de Recrutamento e CRM

Aplicação para pré-cadastro, recrutamento e integração de psicólogos e psiquiatras. A interface React/TypeScript é publicada como site estático no GitHub Pages; autenticação, dados compartilhados, documentos e vídeos usam Supabase. O projeto não contém usuários fictícios nem credenciais de administrador padrão.

## Funcionalidades

- Portal público com as seções **Como funciona**, **Benefícios**, **Requisitos** e **Dúvidas** editáveis pelo administrador.
- Pré-cadastro profissional em etapas, validação de CPF, consulta de CEP, consentimento e envio privado de documentos.
- Acesso profissional por CPF e data de nascimento, acompanhamento do processo, agenda recorrente, solicitações e mensagens.
- Treinamentos obrigatórios, aulas sequenciais, vídeos privados e progresso salvo.
- CRM da equipe com dashboard, candidatos, pipeline configurável, revisão de alterações cadastrais, central de solicitações, editor da home, biblioteca de treinamentos e guia interno do fluxo de integração.
- Contas da equipe por e-mail e senha, troca de senha e permissões por módulo aplicadas também no banco/RPCs, não apenas no menu da interface.
- Arquivos em buckets privados `professional-documents` e `training-media`; a chave Supabase `service_role` é usada somente no ambiente seguro das Edge Functions.
- Exportação CSV e fluxo de exportação/importação ZIP da base local, sem senhas da equipe.

## Executar localmente

Requer Node.js 22 e npm. Primeiro configure a URL e a chave **pública** do projeto em `.env.local`:

```bash
cp .env.example .env.local
# Edite VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm ci
npm run dev
```

Para compilar e verificar tipos:

```bash
npm run build
```

Sem as variáveis Supabase, a aplicação mostra instruções de configuração e não autentica nem salva dados. A chave publicável/anon pode estar no frontend; **nunca** coloque `SUPABASE_SERVICE_ROLE_KEY` em arquivos `VITE_*`, no GitHub Pages, no repositório ou no navegador.

## Preparar o Supabase

Siga o guia [docs/supabase-setup.md](docs/supabase-setup.md). Em resumo:

1. Crie o projeto Supabase e aplique `supabase/migrations/20261118000000_initial_crm.sql` ao projeto correto.
2. Configure Auth/URLs, mantenha desativado o signup público e crie o primeiro administrador pelo Supabase Dashboard; depois promova o perfil no SQL Editor conforme o guia.
3. Publique `candidate-register`, `team-users` e `import-legacy`. As funções privilegiadas usam secrets fornecidos pelo runtime Supabase; nenhuma `service_role` é enviada ao cliente.
4. Confira os buckets privados e as políticas RLS criados pela migration.
5. Teste primeiro com dados fictícios e contas por papel: admin, equipe com módulos diferentes e profissional.

O estado funcional do CRM fica no PostgreSQL do Supabase. A migration expõe funções/RPCs que filtram dados por papel; um membro da equipe com acesso somente a solicitações não recebe o cadastro completo nem acesso aos documentos. A estrutura é enxuta e mantém o estado do domínio num registro JSON transacional; Auth, perfis e arquivos ficam separados.

## Publicar no GitHub Pages

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) instala dependências, executa `npm run build` e publica `dist/` em cada push para a branch `main` (ou por execução manual).

1. Envie este projeto para o repositório GitHub escolhido, mantendo o `package-lock.json`.
2. No repositório, abra **Settings → Secrets and variables → Actions → Variables** e crie:
   - `VITE_SUPABASE_URL` — URL do projeto;
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — chave publicável (ou configure `VITE_SUPABASE_ANON_KEY` para projetos que ainda usam a chave pública legada).
3. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
4. Faça push para `main` e acompanhe **Actions** até a publicação. O Vite deriva o caminho-base do nome do repositório; repositório `<usuario>.github.io` usa a raiz do domínio.
5. No Supabase, configure Site URL e Redirect URLs para o endereço GitHub Pages publicado e para o endereço local de desenvolvimento autorizado.

Não foi configurado nem publicado um repositório nesta cópia local. Para publicação direta é necessário indicar o repositório e configurar o Supabase da sua conta.

## Migrar os registros locais depois

A página **Admin → Ajustes** permite exportar e importar um pacote ZIP. Faça a exportação no navegador e na origem que contêm o armazenamento antigo: o pacote inclui o estado legado e arquivos encontrados no IndexedDB, mas exclui contas/senhas locais da equipe e a sessão. Como o ZIP pode conter CPF, endereço, chave Pix e documentos, guarde-o de forma restrita e apague-o depois da migração.

A importação requer administrador e base Supabase sem candidatos; não substitui dados existentes. Ela mostra a quantidade de registros e anexos antes da confirmação, envia documentos ao bucket privado e cria acesso profissional por CPF/data somente quando CPF e nascimento são válidos. Cadastros que não atendem a esses critérios ficam para revisão; contas/senhas da equipe devem ser recriadas manualmente. Faça backup e revisão do pacote antes de confirmar. Consulte `docs/supabase-setup.md` para limites e detalhes da operação.

> O acesso do profissional usa data de nascimento como senha, conforme solicitado para o fluxo atual. É uma credencial de baixa entropia; combine isso com controle de acesso, monitoração e um plano de substituição por senha própria/recuperação antes de ampliar o uso com dados sensíveis.

## Estrutura

```text
src/                         aplicação React e interface
src/lib/store.tsx            estado do domínio e operações do CRM
src/lib/supabase.ts           cliente público, Auth e Storage
src/lib/supabase-state.ts     normalização e patches por papel
src/lib/legacy-migration.ts  pacote ZIP da base local e anexos
supabase/migrations/          schema, políticas e RPCs
supabase/functions/           registro, gestão da equipe e importação
.github/workflows/deploy.yml  build e publicação GitHub Pages
docs/supabase-setup.md        configuração detalhada do Supabase
```

## Referências oficiais consultadas

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Publicação de Vite em GitHub Pages: https://vite.dev/guide/static-deploy
