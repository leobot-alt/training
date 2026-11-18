import type { Aula, ProgressoCandidato, Trilha } from './types';

export interface ResumoTrilha {
  total: number;
  concluidas: number;
  percentual: number;
  concluida: boolean;
  duracaoMin: number;
  proximaAula: Aula | null;
}

export function resumoTrilha(trilha: Trilha, progresso: ProgressoCandidato = {}): ResumoTrilha {
  const total = trilha.aulas.length;
  const concluidas = trilha.aulas.filter((aula) => progresso[aula.id]?.concluida).length;
  const percentual = total === 0 ? 0 : Math.round((concluidas / total) * 100);
  const proximaAula = trilha.aulas.find((aula) => !progresso[aula.id]?.concluida) ?? null;

  return {
    total,
    concluidas,
    percentual,
    concluida: total > 0 && concluidas === total,
    duracaoMin: trilha.aulas.reduce((acc, aula) => acc + aula.duracaoMin, 0),
    proximaAula,
  };
}

export type AulaStatus = 'concluida' | 'atual' | 'disponivel' | 'bloqueada';

export function statusAula(trilha: Trilha, aulaId: string, progresso: ProgressoCandidato = {}): AulaStatus {
  const index = trilha.aulas.findIndex((aula) => aula.id === aulaId);
  if (index < 0) return 'bloqueada';
  if (progresso[aulaId]?.concluida) return 'concluida';

  const anterioresConcluidas = trilha.aulas
    .slice(0, index)
    .every((aula) => progresso[aula.id]?.concluida);

  if (!anterioresConcluidas) return 'bloqueada';
  return index === 0 || progresso[trilha.aulas[index - 1].id]?.concluida ? 'atual' : 'disponivel';
}

export function aulaLiberada(trilha: Trilha, aulaId: string, progresso: ProgressoCandidato = {}) {
  return statusAula(trilha, aulaId, progresso) !== 'bloqueada';
}

export interface ResumoOnboarding {
  percentual: number;
  concluido: boolean;
  aulasConcluidas: number;
  totalAulas: number;
  trilhasPendentes: number;
  proximaAula: { trilha: Trilha; aula: Aula } | null;
}

export function resumoObrigatorio(trilhas: Trilha[], progresso: ProgressoCandidato = {}): ResumoOnboarding {
  const obrigatorias = trilhas.filter((trilha) => trilha.obrigatoria);
  const totalAulas = obrigatorias.reduce((acc, trilha) => acc + trilha.aulas.length, 0);
  const aulasConcluidas = obrigatorias.reduce(
    (acc, trilha) => acc + trilha.aulas.filter((aula) => progresso[aula.id]?.concluida).length,
    0,
  );

  let proximaAula: { trilha: Trilha; aula: Aula } | null = null;
  for (const trilha of obrigatorias) {
    const resumo = resumoTrilha(trilha, progresso);
    if (resumo.proximaAula) {
      proximaAula = { trilha, aula: resumo.proximaAula };
      break;
    }
  }

  return {
    percentual: totalAulas === 0 ? 100 : Math.round((aulasConcluidas / totalAulas) * 100),
    concluido: totalAulas === 0 || aulasConcluidas === totalAulas,
    aulasConcluidas,
    totalAulas,
    trilhasPendentes: obrigatorias.filter((trilha) =>
      trilha.aulas.length > 0 && !resumoTrilha(trilha, progresso).concluida,
    ).length,
    proximaAula,
  };
}

/** Aceita link do YouTube/Vimeo e devolve a URL de embed; devolve null para arquivos diretos. */
export function embedUrl(url: string): string | null {
  if (!url) return null;
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function formatDuracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
