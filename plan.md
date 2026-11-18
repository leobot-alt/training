# Plano de implementação — Somente em GitHub Pages + Supabase

## Decisão confirmada

A usuária escolheu hospedar o frontend no GitHub e usar Supabase para autenticação, banco e arquivos. A implementação trata GitHub Pages como o destino estático do Vite, por meio de GitHub Actions. Não usar hospedagem ou banco gerenciado da Manus para publicar. Não conectar nem fazer push a um repositório sem URL e autorização explícitas; não coletar segredos no chat.

## Arquitetura

- Frontend: React, TypeScript, Vite, Tailwind e React Router, mantendo a identidade visual do portal existente. O build recebe o caminho-base do repositório GitHub e inclui fallback SPA para as rotas.
- Publicação: `.github/workflows/deploy.yml` executa instalação reproduzível, build e publicação do diretório `dist/` no GitHub Pages. A URL e chave publicável do Supabase são variáveis de build do GitHub Actions; a chave `service_role` nunca entra no cliente.
- Dados: `profiles` representa papéis e permissões; `crm_state` armazena o estado de domínio em JSONB, sem candidatos de demonstração ou administrador padrão. RPCs `SECURITY DEFINER` aplicam autorização e filtram o estado devolvido por papel/módulo. Gravações de candidato, solicitação, pipeline e revisão usam patches validados; o JSON mantém compatibilidade com o store existente.
- Auth: Supabase Auth. Administradores e equipe entram por e-mail/senha; cada usuário da equipe pode trocar a própria senha. Profissionais entram por CPF/data de nascimento através de um e-mail sintético não enviável gerado na Edge Function. Senhas não são persistidas no frontend nem exportadas.
- Arquivos: buckets privados `professional-documents` e `training-media`; políticas RLS de Storage verificam papel, permissão e vínculo do profissional. Vídeos usam URL assinada.
- Operações privilegiadas: Edge Functions `candidate-register`, `team-users` e `import-legacy` usam a chave de serviço somente no runtime Supabase.
- Migração: exportação ZIP lê o armazenamento legado no navegador (LocalStorage + IndexedDB), remove sessão e contas de equipe, e inclui manifesto/arquivos. Importação exige admin e estado de candidatos vazio, faz prévia/confirmação, envia anexos ao bucket privado e não sobrescreve registros existentes. A migração efetiva fica para quando a usuária tiver o pacote local.

## Critérios de aceite

1. Preservar os fluxos já solicitados: pré-cadastro, documentos, acesso CPF/data, agenda autorizada, pedidos e respostas, treinamento obrigatório, pipeline editável, conteúdo público editável, guia interno de treinamento e usuários de equipe com permissões.
2. Fazer autorização valer no banco/RPC e no Storage, não apenas no roteamento e no menu React.
3. Publicar como SPA estática no Pages e manter toda persistência compartilhada no Supabase.
4. Preparar migração local sem transportar senhas de equipe ou substituir registros já presentes.
5. Não afirmar publicação online até haver repositório e projeto Supabase indicados e configuração aplicada.

## Estrutura principal

`src/` contém a aplicação; `src/lib/store.tsx` e `src/lib/supabase-state.ts` integram o store; `supabase/migrations/` contém schema, policies e RPCs; `supabase/functions/` contém rotinas server-side; `.github/workflows/deploy.yml` publica no Pages; `docs/supabase-setup.md` orienta a preparação e a migração.

## Referências oficiais

- Supabase Auth: https://supabase.com/docs/guides/auth
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Deploy estático Vite/GitHub Pages: https://vite.dev/guide/static-deploy
