export interface TrainingFlowStage {
  id: string;
  title: string;
  description: string;
  owner: string;
  timing: string;
  checklist: string[];
}

export const DEFAULT_TRAINING_FLOW: TrainingFlowStage[] = [
  { id: 'pre-cadastro', title: 'Pré-cadastro recebido', description: 'O profissional preenche seus dados e envia a documentação inicial pelo portal.', owner: 'Equipe de recrutamento', timing: 'Dia 0', checklist: ['Conferir se o cadastro foi enviado', 'Verificar se os documentos obrigatórios foram anexados', 'Confirmar que o profissional recebeu o protocolo'] },
  { id: 'triagem', title: 'Triagem cadastral e documental', description: 'Validar dados, registro profissional, formação e documentos antes de avançar.', owner: 'Equipe de recrutamento', timing: 'Até 3 dias úteis', checklist: ['Conferir CPF e dados de contato', 'Validar CRP/CRM e situação do registro', 'Revisar diploma e certificados', 'Solicitar correções, se necessário'] },
  { id: 'entrevista', title: 'Entrevista e alinhamento', description: 'Realizar conversa com o profissional para conhecer a experiência clínica, abordagem e disponibilidade.', owner: 'Recrutador responsável', timing: 'Após aprovação da triagem', checklist: ['Agendar entrevista', 'Registrar parecer interno', 'Alinhar funcionamento da plataforma e próximos passos'] },
  { id: 'decisao', title: 'Decisão e aprovação', description: 'Registrar a decisão do processo seletivo e comunicar o resultado ao profissional.', owner: 'Coordenação clínica', timing: 'Após entrevista', checklist: ['Revisar parecer e documentos', 'Atualizar etapa no pipeline', 'Enviar retorno ao profissional'] },
  { id: 'configuracao', title: 'Configuração do perfil e agenda', description: 'Preparar o perfil de atendimento e orientar o profissional sobre o cadastro de disponibilidade.', owner: 'Operações', timing: 'Após aprovação', checklist: ['Conferir dados do perfil', 'Confirmar permissão para edição de agenda', 'Verificar se a agenda foi preenchida corretamente'] },
  { id: 'treinamento', title: 'Treinamento obrigatório', description: 'O profissional acessa as trilhas e aulas obrigatórias no painel. Acompanhar o progresso antes de liberar o atendimento.', owner: 'Treinamento / Operações', timing: 'Antes da ativação', checklist: ['Liberar acesso às trilhas obrigatórias', 'Acompanhar conclusão das aulas', 'Confirmar conclusão do treinamento obrigatório'] },
  { id: 'ativacao', title: 'Liberação para atendimento', description: 'Concluir a integração, ativar o profissional e confirmar que ele está apto a iniciar os atendimentos.', owner: 'Operações', timing: 'Após conclusão das etapas', checklist: ['Confirmar documentação validada', 'Confirmar treinamento concluído', 'Atualizar status para ativo', 'Enviar orientações de início'] },
];
