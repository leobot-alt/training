import type { ProgressoMap, Trilha } from './types';

/**
 * Vídeos de demonstração gerados localmente (public/videos).
 * Substitua cada `videoUrl` pelo arquivo real em Admin › Treinamentos —
 * aceita .mp4 direto, YouTube ou Vimeo.
 */
const VIDEO_A = '/videos/aula-01.mp4';
const VIDEO_B = '/videos/aula-02.mp4';
const VIDEO_C = '/videos/aula-03.mp4';
const VIDEO_D = '/videos/aula-04.mp4';
const VIDEO_E = '/videos/aula-05.mp4';

export function buildTrilhas(): Trilha[] {
  return [
    {
      id: 'trilha-onboarding',
      titulo: 'Onboarding obrigatório',
      descricao:
        'Tudo o que você precisa saber antes da primeira sessão: conduta, plataforma, prontuário e acolhimento.',
      obrigatoria: true,
      ordem: 1,
      aulas: [
        {
          id: 'aula-boas-vindas',
          titulo: 'Boas-vindas à Somente',
          descricao:
            'Como nasceu a Somente, nosso posicionamento clínico e o que esperamos de cada profissional da rede.',
          videoUrl: VIDEO_A,
          duracaoMin: 8,
        },
        {
          id: 'aula-etica',
          titulo: 'Código de ética e LGPD na prática',
          descricao:
            'Sigilo, guarda de prontuário, consentimento digital e o que nunca deve ser compartilhado por mensagem.',
          videoUrl: VIDEO_B,
          duracaoMin: 14,
        },
        {
          id: 'aula-plataforma',
          titulo: 'Como funciona a plataforma',
          descricao: 'Agenda, sala de vídeo, lembretes automáticos, remarcações e política de faltas.',
          videoUrl: VIDEO_C,
          duracaoMin: 11,
        },
        {
          id: 'aula-primeira-sessao',
          titulo: 'Primeira sessão: acolhimento e contrato terapêutico',
          descricao:
            'Roteiro sugerido para a primeira consulta, alinhamento de expectativas e definição de frequência.',
          videoUrl: VIDEO_D,
          duracaoMin: 16,
        },
        {
          id: 'aula-prontuario',
          titulo: 'Prontuário e registros clínicos',
          descricao: 'O que registrar, com que frequência e como manter o histórico útil para o cuidado.',
          videoUrl: VIDEO_E,
          duracaoMin: 12,
        },
      ],
    },
    {
      id: 'trilha-clinica',
      titulo: 'Excelência clínica',
      descricao: 'Aprofundamento em situações sensíveis: crise, risco e teleconsulta de qualidade.',
      obrigatoria: false,
      ordem: 2,
      aulas: [
        {
          id: 'aula-crise',
          titulo: 'Manejo de crise e situações de risco',
          descricao: 'Protocolo de acolhimento, avaliação de risco e quando acionar a rede de urgência.',
          videoUrl: '',
          duracaoMin: 22,
        },
        {
          id: 'aula-teleconsulta',
          titulo: 'Teleconsulta com qualidade',
          descricao: 'Enquadre, ambiente, linguagem e ajustes técnicos para o atendimento online.',
          videoUrl: '',
          duracaoMin: 18,
        },
        {
          id: 'aula-encaminhamento',
          titulo: 'Encaminhamentos e trabalho em rede',
          descricao: 'Como encaminhar para psiquiatria, grupos de apoio e serviços públicos.',
          videoUrl: '',
          duracaoMin: 9,
        },
      ],
    },
    {
      id: 'trilha-operacao',
      titulo: 'Operação e repasses',
      descricao: 'Rotina financeira e administrativa: recibos, repasses, suporte e canais de contato.',
      obrigatoria: false,
      ordem: 3,
      aulas: [
        {
          id: 'aula-agenda',
          titulo: 'Agenda, faltas e remarcações',
          descricao: 'Regras de remarcação, no-show e impacto no repasse.',
          videoUrl: '',
          duracaoMin: 7,
        },
        {
          id: 'aula-repasse',
          titulo: 'Como funciona o repasse',
          descricao: 'Ciclo semanal, extrato detalhado, notas fiscais e bônus por indicação.',
          videoUrl: '',
          duracaoMin: 6,
        },
      ],
    },
  ];
}

/** Progresso inicial de demonstração: Ana já concluiu as duas primeiras aulas do onboarding. */
export function buildProgressoInicial(): ProgressoMap {
  const agora = new Date();
  const em = (dias: number) => new Date(agora.getTime() - dias * 86_400_000).toISOString();

  return {
    'cand-001': {
      'aula-boas-vindas': {
        aulaId: 'aula-boas-vindas',
        segundos: 480,
        percentual: 100,
        concluida: true,
        atualizadoEm: em(9),
      },
      'aula-etica': {
        aulaId: 'aula-etica',
        segundos: 840,
        percentual: 100,
        concluida: true,
        atualizadoEm: em(6),
      },
      'aula-plataforma': {
        aulaId: 'aula-plataforma',
        segundos: 142,
        percentual: 38,
        concluida: false,
        atualizadoEm: em(2),
      },
    },
    'cand-013': {
      'aula-boas-vindas': {
        aulaId: 'aula-boas-vindas',
        segundos: 480,
        percentual: 100,
        concluida: true,
        atualizadoEm: em(30),
      },
    },
  };
}
