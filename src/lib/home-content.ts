export interface HomeTextItem {
  title: string;
  text: string;
}

export interface HomeFaqItem {
  q: string;
  a: string;
}

export interface HomeContent {
  how: {
    eyebrow: string;
    title: string;
    description: string;
    items: HomeTextItem[];
  };
  benefits: {
    eyebrow: string;
    title: string;
    description: string;
    items: HomeTextItem[];
  };
  requirements: {
    eyebrow: string;
    title: string;
    description: string;
    listTitle: string;
    items: string[];
    note: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    email: string;
    items: HomeFaqItem[];
  };
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  how: {
    eyebrow: 'Processo simples',
    title: 'Três passos entre você e seus primeiros pacientes',
    description: 'Sem prova de títulos interminável, sem taxa de adesão. Um processo humano, conduzido por quem entende de clínica.',
    items: [
      { title: 'Cadastre-se em 6 minutos', text: 'Formulário curto, sem burocracia. Você informa formação, registro profissional e disponibilidade.' },
      { title: 'Conversa com o time', text: 'Uma entrevista online de 30 minutos para entender sua abordagem e alinhar expectativas.' },
      { title: 'Receba pacientes', text: 'Seu perfil entra na plataforma e a agenda começa a receber pacientes compatíveis com você.' },
    ],
  },
  benefits: {
    eyebrow: 'Por que a Somente',
    title: 'Tudo o que atrapalha a clínica, resolvido',
    description: 'Você recebe pacientes, agenda, prontuário e repasse em um só lugar. O resto é tempo de escuta.',
    items: [
      { title: 'Pacientes recorrentes', text: 'Time de aquisição dedicado: você não precisa captar nem investir em anúncios.' },
      { title: 'Plataforma pronta', text: 'Sala de vídeo estável, prontuário digital, lembretes automáticos e suporte ao paciente.' },
      { title: 'Repasse previsível', text: 'Recebimento por sessão realizada, com extrato detalhado e repasse semanal.' },
      { title: 'Trabalhe de onde quiser', text: '100% online, com total autonomia para definir horários e volume de atendimentos.' },
      { title: 'Conformidade e LGPD', text: 'Ambiente criptografado, termo de consentimento digital e guarda segura de prontuários.' },
      { title: 'Desenvolvimento contínuo', text: 'Supervisões, materiais clínicos e comunidade com centenas de profissionais.' },
    ],
  },
  requirements: {
    eyebrow: 'Quem pode se cadastrar',
    title: 'Requisitos para fazer parte do time',
    description: 'Buscamos profissionais com registro ativo e prática clínica consolidada. Se você atende com ética e compromisso, seu lugar é aqui.',
    listTitle: 'Checklist',
    items: [
      'Graduação em Psicologia ou Medicina, com especialização em Psiquiatria',
      'Registro ativo no CRP ou CRM da sua região',
      'Experiência mínima de 2 anos em atendimento clínico',
      'Disponibilidade de pelo menos 8 horas semanais',
      'Computador com câmera e internet estável',
      'Pelo menos uma especialização ou formação complementar',
    ],
    note: 'Profissionais com registro provisório podem se cadastrar, mas a liberação para atendimento ocorre após a emissão do registro definitivo.',
  },
  faq: {
    eyebrow: 'Dúvidas frequentes',
    title: 'Perguntas que todo profissional faz',
    description: 'Não encontrou o que procurava? Fale com o time pelo e-mail',
    email: 'profissionais@somente.com.br',
    items: [
      { q: 'Preciso pagar algo para me cadastrar?', a: 'Não. O cadastro e todo o processo seletivo são gratuitos. A Somente remunera por sessão realizada — não há mensalidade, taxa de adesão ou exclusividade.' },
      { q: 'Como funciona o repasse?', a: 'Você define o valor da sua sessão dentro da faixa sugerida pela plataforma. O repasse é feito semanalmente, sempre às sextas-feiras, referente às sessões concluídas na semana anterior.' },
      { q: 'Posso manter meus pacientes particulares?', a: 'Sim. Não há cláusula de exclusividade. Você pode continuar atendendo em consultório próprio ou em outras plataformas.' },
      { q: 'Quanto tempo leva o processo seletivo?', a: 'Em média de 7 a 12 dias entre o cadastro e a liberação do perfil, considerando a entrevista e a validação de documentos.' },
      { q: 'Atendo presencialmente também?', a: 'A operação é 100% online. Alguns profissionais com registro em capitais podem atuar em regime híbrido, mediante avaliação do time.' },
    ],
  },
};
