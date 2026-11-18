# Configuração do Supabase — Somente CRM

Este guia prepara o backend persistente da aplicação publicada no GitHub Pages. O frontend usa apenas a URL do projeto e uma chave publicável/anon; a chave `service_role` permanece exclusivamente no ambiente seguro do Supabase.

## 1. Criar o projeto e aplicar a migration

1. Crie um projeto no Supabase Dashboard e guarde URL e chaves em local seguro.
2. Com o Supabase CLI instalado e autenticado, vincule o projeto correto:

   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```

3. Revise `supabase/migrations/20261118000000_initial_crm.sql` e aplique-a ao projeto correto:

   ```bash
   supabase db push
   ```

A migration cria `profiles`, `crm_state`, políticas, RPCs e os buckets privados `professional-documents` e `training-media`. Não cria candidatos de demonstração nem administrador padrão. `crm_state` é uma linha com estado JSONB; as RPCs bloqueiam a linha durante gravações, validam o papel/permissão e filtram o que pode voltar ao navegador. As tabelas de Auth e Storage mantêm usuários e binários fora desse JSON.

## 2. Auth e primeiro administrador

1. Em **Authentication → URL Configuration**, configure Site URL e Redirect URLs para as origens autorizadas de desenvolvimento e produção.
2. Desabilite o signup público em **Authentication → Providers → Email**. Novos profissionais são criados pelo fluxo protegido de pré-cadastro; integrantes da equipe são criados pelo administrador.
3. Em **Authentication → Users**, crie manualmente o usuário que será o primeiro administrador. O nome, e-mail e senha são definidos nessa tela. Em seguida, no **SQL Editor**, promova o ID desse usuário a administrador, preenchendo nome e e-mail:

   ```sql
   insert into public.profiles (id, role, permissions, active, nome, email)
   values ('<AUTH_USER_UUID>', 'admin', '{}'::jsonb, true, '<NOME>', '<EMAIL>')
   on conflict (id) do update set
     role = 'admin', permissions = '{}'::jsonb, active = true,
     nome = excluded.nome, email = excluded.email, updated_at = now();
   ```

Nunca cole senha, token ou chave nesse SQL. Não há credencial administrativa padrão. Contas da equipe recebem nome, e-mail, senha inicial e permissões em **Admin → Usuários**. A senha inicial exige ao menos 12 caracteres; a pessoa pode alterá-la depois em **Minha conta**. Só contas `equipe` são gerenciáveis nessa tela; o administrador principal e as contas profissionais não podem ser excluídos por esse endpoint.

## 3. Publicar as Edge Functions

O runtime Supabase disponibiliza as variáveis necessárias às funções. Não copie `SUPABASE_SERVICE_ROLE_KEY` para o GitHub, para `VITE_*` ou para o browser. Depois do `supabase link`, publique:

```bash
supabase functions deploy candidate-register
supabase functions deploy team-users
supabase functions deploy import-legacy
```

`supabase/config.toml` mantém `candidate-register` sem exigência de JWT porque atende o formulário público. `team-users` e `import-legacy` exigem sessão e verificam o perfil/permissão no servidor. Operações Auth Admin e escrita privilegiada no banco ficam apenas nas Edge Functions.

### Registro profissional

A função `candidate-register` valida CPF, nascimento, campos de identidade/contato, consentimento, profissão, registro, especialidades, abordagem, UF e grade de agenda. Ela cria o usuário Auth com e-mail sintético determinístico `cpf-<11 dígitos>@somente.invalid`, senha igual à data de nascimento e confirmação de e-mail; o e-mail real continua armazenado no perfil do profissional. A resposta retorna apenas identificador e protocolo — nunca CPF ou nascimento. O domínio `.invalid` não recebe mensagens e serve somente como identificador técnico de login.

### Usuários da equipe

`team-users` exige usuário autenticado e perfil ativo com papel `admin` ou permissão `usuarios`. Verifica o papel de destino; só cria, atualiza, desativa ou exclui contas `equipe`. Um gestor não-admin não pode conceder a própria permissão `usuarios`. O endpoint não pode apagar administradores nem profissionais.

## 4. Arquivos e buckets privados

A migration configura os buckets `professional-documents` e `training-media` como privados. Não marque nenhum deles como público.

- Documentos profissionais ficam em `<candidate_id>/<arquivo>`. O próprio profissional pode enviar/ler somente dentro da pasta vinculada ao seu perfil. A equipe precisa da permissão `candidatos` para revisar/baixar; a permissão `solicitacoes` não concede acesso a arquivos.
- Depois do envio do documento, o cliente chama `update_candidate_documents(p_candidate_id, p_documents)`. O servidor confere o vínculo do perfil e caminhos existentes no bucket; a equipe com permissão cadastral pode revisar o status.
- Vídeos ficam no bucket `training-media`. A equipe com `treinamentos` pode enviar/administrar; profissionais autenticados leem somente mídia marcada como publicada. O player usa URLs assinadas temporárias.

## 5. GitHub Pages e variáveis públicas

No repositório GitHub, em **Settings → Secrets and variables → Actions → Variables**, configure:

- `VITE_SUPABASE_URL` — URL do projeto;
- `VITE_SUPABASE_PUBLISHABLE_KEY` — chave publicável atual; ou `VITE_SUPABASE_ANON_KEY` para projetos que ainda usam a chave legada.

Esses valores são públicos por design e compõem o bundle. Nunca cadastre `service_role` com prefixo `VITE_`. Em **Settings → Pages**, selecione **GitHub Actions**. O workflow `deploy.yml` compila `dist/`, define o caminho-base pelo nome do repositório e publica a SPA.

## 6. Migração posterior do sistema local

O painel **Admin → Ajustes** tem uma exportação ZIP do formato legado, manifestando candidatos, configurações, progresso, solicitações e anexos do IndexedDB. Contas/senhas locais da equipe e sessão ativa são excluídas. O pacote pode conter CPF, RG, chave Pix, endereço, contatos e documentos: mantenha-o protegido, não o envie por e-mail aberto e apague-o após a migração.

**Origem do navegador:** o navegador separa `localStorage` por domínio. A exportação precisa ser executada em uma página servida pela mesma origem em que a versão antiga armazenou os dados, no mesmo navegador/perfil. Se o sistema antigo estiver em outro domínio, gere o ZIP antes de trocar a hospedagem ou disponibilize o exportador nessa origem; o site em GitHub Pages não consegue ler o `localStorage` de um domínio Lovable distinto.

Importação:

1. Tenha o admin configurado e publique também `import-legacy`.
2. Abra **Admin → Ajustes**, selecione o ZIP e confira a prévia de profissionais/anexos e avisos de arquivos ausentes.
3. Confirme somente depois de revisar backup e pacote. A importação só funciona quando o estado Supabase ainda não tem candidatos; não mescla nem substitui base existente.
4. A página envia documentos ao Storage privado antes de enviar os metadados/estado. O servidor valida IDs/CPFs duplicados, rejeita campos de credencial, limita a 5.000 candidatos e cria acesso profissional apenas para CPF e nascimento válidos.
5. Senhas/contas da equipe não são importadas. Profissionais com CPF ou nascimento inválidos ficam sem conta e precisam de revisão. Os elegíveis entram com CPF e data de nascimento.

A função tenta limpar arquivos enviados e usuários Auth criados se a importação falhar. Como Auth, Storage e Postgres não formam uma transação distribuída, a limpeza é best-effort; se houver dúvida sobre o resultado, confira a base e as contagens antes de repetir. A RPC recusa segunda importação quando já há candidatos.

## 7. RPCs, permissões e validação

- `get_public_state()` devolve apenas o conteúdo público da home.
- `get_my_state()` exige perfil ativo. Profissional recebe o próprio cadastro, trilhas, progresso e solicitações próprias. Equipe recebe apenas seções autorizadas. Admin recebe o estado de domínio e a lista sanitizada de contas `equipe` (sem hashes/senhas).
- A equipe sem permissão `candidatos` recebe resumos mínimos para pipeline/dashboard/treinamento. `solicitacoes` pode visualizar o ticket e somente os campos que a pessoa enviou para revisão cadastral; estes campos podem conter dados pessoais, mas a permissão não abre o cadastro completo nem os documentos. Conceda esse módulo com cuidado.
- `save_my_state(p_patch jsonb)` aceita apenas chaves autorizadas. Pipeline grava `pipelineUpdates` (status) em vez de um cadastro completo. Atualizações de cadastro da equipe são patches de campos; profissionais só podem gravar seu próprio progresso, pedido de mudança e novos tickets próprios. Exclusões explícitas de candidatos exigem permissão `candidatos` e desativam o perfil vinculado.
- `review_candidate_update` aprova ou recusa pedido; o cadastro só muda após aprovação. `resolve_solicitation` responde/encerra tickets e aplica alterações de agenda apenas quando a equipe atende um pedido de agenda.
- Módulos: `dashboard`, `candidatos`, `solicitacoes`, `pipeline`, `treinamentos`, `fluxo-treinamento`, `conteudo-home`, `ajustes`, `usuarios`. Admin tem acesso total; equipe recebe somente as permissões marcadas.

Antes de usar dados reais, teste pelo menos: profissional A não lê/escreve dados de B; conta sem permissão não obtém seções protegidas; `solicitacoes` não recebe arquivos nem cadastro completo; fluxo de aprovação deixa dados pendentes até decisão; buckets continuam privados; a chave de serviço não aparece no bundle; signup público continua desativado.

## Referências oficiais

- Supabase Auth: https://supabase.com/docs/guides/auth
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage security: https://supabase.com/docs/guides/storage/security/access-control
- Vite static deployment: https://vite.dev/guide/static-deploy
