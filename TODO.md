# ToDo — Portal Somente em GitHub Pages + Supabase

## Portal público e pré-cadastro

- [x] O site apresenta “Como funciona”, “Benefícios”, “Requisitos” e “Dúvidas”, todas editáveis no admin; o fluxo de inscrição continua sendo pré-cadastro.
- [x] O formulário em etapas solicita nome completo, CPF validado/formatado, RG, sexo, data de nascimento, e-mail, e-mail Microsoft Teams, telefone, CEP, endereço preenchido pelo CEP e número complementar, chave Pix, profissão, registro profissional, experiência, abordagens em caixas de seleção, especialidades, agenda e consentimento.
- [x] O administrador configura em Ajustes, campo a campo, se RG, sexo, e-mail, e-mail Teams, telefone, CEP, endereço, número, cidade, UF, chave Pix, registro, experiência, abordagens, especialidades, resumo e agenda são obrigatórios. A escolha persiste no Supabase e é aplicada pelo formulário e pelo endpoint de cadastro. Nome, CPF, data de nascimento, profissão e consentimento LGPD permanecem obrigatórios.
- [x] Se o endpoint rejeitar um pré-cadastro, a tela aponta os campos a corrigir sem expor valores pessoais; os anexos selecionados permanecem disponíveis para nova tentativa e são enviados ao bucket privado após criar o cadastro; nenhum aviso afirma incorretamente que a aplicação ainda é protótipo ou não tem backend.
- [x] O profissional envia documentos durante o pré-cadastro. Formatos aceitos: PDF/JPG/PNG, até 10 MB por arquivo, guardados de forma privada.
- [x] O acesso do profissional usa CPF/data de nascimento; a agenda de inscrição não solicita valor de sessão, formato de atendimento ou turnos.
- [x] A identidade visual do portal existente se aproxima do site da Somente por meio da paleta azul-violeta/ciano, tipografia e acabamentos, sem alterar informações ou fluxos funcionais.

## Área do profissional

- [x] O profissional acompanha o status do pré-cadastro, os próprios documentos, pedidos e respostas da equipe depois de entrar com CPF/data de nascimento.
- [x] O profissional preenche disponibilidade semanal em blocos de uma hora; só altera a agenda quando a equipe libera a edição. Alterações submetidas ficam para análise antes de serem aplicadas.
- [x] O perfil tem treinamento obrigatório com vídeos, etapas e progresso. O acesso às etapas segue as regras da trilha configurada.
- [x] Mudanças cadastrais submetidas pelo profissional não alteram os dados vigentes imediatamente: ficam pendentes para a equipe aprovar ou recusar.

## CRM da equipe

- [x] O CRM oferece dashboard, lista de profissionais com filtros, ficha editável e pipeline com etapas configuráveis; não apresenta notas internas no cadastro.
- [x] A central reúne mensagens, mudanças de agenda e dados de todos os profissionais; a equipe pode responder. O histórico da pessoa também aparece dentro da ficha individual.
- [x] A equipe edita as seções públicas da home, os treinamentos obrigatórios e um guia interno sequencial do percurso de integração para orientar a operação.
- [x] O administrador cria usuários da equipe com nome, e-mail, senha inicial e permissões por módulo. Cada pessoa pode trocar a própria senha. O servidor aplica as permissões e não guarda senha de equipe em texto claro.

## Persistência e migração

- [x] O projeto integra React ao Supabase Auth, Postgres/JSONB, RPCs com autorização, RLS e buckets privados para documentos/vídeos. O bundle público usa somente URL/chave publicável, sem `service_role` nem dados fictícios.
- [x] A exportação ZIP lê LocalStorage/IndexedDB legados, exclui sessão e contas/senhas da equipe; a importação exige administrador/confirmacão e base vazia e não substitui registros.
- [x] `README.md` e `docs/supabase-setup.md` explicam configuração, primeiro admin, publicação, permissões e o limite de origem do navegador na migração.

## Publicação real

- [x] Há workflow GitHub Actions para build e GitHub Pages. Nesta cópia, `npm run build`, parsing TypeScript das Edge Functions e sintaxe SQL externa da migration passaram; `npm audit` não reportou vulnerabilidades.
- [ ] Enviar o projeto ao repositório GitHub escolhido, configurar as variáveis públicas e ativar Pages.
- [ ] Aplicar a migration e publicar Edge Functions no projeto Supabase da usuária; criar admin, cadastrar a origem publicada e testar contas/permissões.
- [ ] Migrar a base local quando a usuária decidir. A exportação deve rodar na mesma origem/navegador do armazenamento antigo; GitHub Pages não lê o `localStorage` de uma origem Lovable diferente.

O teste ponta a ponta e a publicação ainda dependem da URL do repositório e do projeto Supabase escolhidos pela usuária.
