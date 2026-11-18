import { useMemo, useState } from 'react';
import { CalendarClock, Check, Clock3, MessageSquareText, Search, Send, UserRound, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/field';
import { CandidatoDrawer } from '@/components/CandidatoDrawer';
import { useStore } from '@/lib/store';
import type { DadosPerfilCandidato, SolicitacaoProfissional } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const PROFILE_FIELDS: { key: keyof DadosPerfilCandidato; label: string }[] = [
  { key: 'nome', label: 'Nome completo' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'dataNascimento', label: 'Data de nascimento' },
  { key: 'email', label: 'E-mail' },
  { key: 'emailTeams', label: 'E-mail Teams' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'cep', label: 'CEP' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'numero', label: 'Número/complemento' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'uf', label: 'UF' },
  { key: 'chavePix', label: 'Chave Pix' },
  { key: 'profissao', label: 'Profissão' },
  { key: 'registro', label: 'Registro' },
  { key: 'especialidades', label: 'Especialidades' },
  { key: 'abordagem', label: 'Abordagem' },
  { key: 'experienciaAnos', label: 'Experiência' },
  { key: 'bio', label: 'Resumo profissional' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'observacoesAgenda', label: 'Observações da agenda' },
];

function stringify(value: unknown, field: keyof DadosPerfilCandidato) {
  if (field === 'agenda' && Array.isArray(value)) {
    return value.length ? value.map((slot) => `${slot.dia} ${slot.inicio}–${slot.fim}`).join(' · ') : 'Nenhum horário';
  }
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (field === 'dataNascimento' && typeof value === 'string' && value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
  }
  if (field === 'experienciaAnos' && typeof value === 'number') return `${value} anos`;
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function agendaText(agenda?: SolicitacaoProfissional['agenda']) {
  return agenda?.length ? agenda.map((slot) => `${slot.dia} ${slot.inicio}–${slot.fim}`).join(' · ') : 'Nenhum horário selecionado';
}

export default function Solicitacoes() {
  const {
    candidatos,
    solicitacoes,
    aprovarAtualizacaoCandidato,
    recusarAtualizacaoCandidato,
    responderSolicitacao,
    resolverSolicitacao,
  } = useStore();
  const [filtro, setFiltro] = useState<'pendente' | 'todas' | 'atendida' | 'recusada'>('pendente');
  const [tipo, setTipo] = useState('todas');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  const itens = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const all: Array<{
      id: string;
      candidatoId: string;
      nome: string;
      email: string;
      tipo: 'dados' | 'agenda' | 'mensagem';
      status: 'pendente' | 'atendida' | 'recusada';
      criadaEm: string;
      mensagem?: string;
      solicitacao?: SolicitacaoProfissional;
    }> = [];

    for (const candidato of candidatos) {
      const perfil = candidato.solicitacaoAtualizacao;
      if (perfil) {
        const camposMudaram = PROFILE_FIELDS.filter(({ key }) =>
          JSON.stringify(candidato[key] ?? '') !== JSON.stringify(perfil.dados[key] ?? ''),
        );
        const somenteAgenda = camposMudaram.length > 0 && camposMudaram.every(({ key }) => key === 'agenda' || key === 'observacoesAgenda');
        all.push({
          id: `perfil-${candidato.id}`,
          candidatoId: candidato.id,
          nome: candidato.nome,
          email: candidato.email,
          tipo: somenteAgenda ? 'agenda' : 'dados',
          status: 'pendente',
          criadaEm: perfil.solicitadaEm,
          mensagem: 'O profissional solicitou atualização dos dados cadastrais.',
        });
      }
    }

    for (const request of solicitacoes) {
      const candidato = candidatos.find((item) => item.id === request.candidatoId);
      if (!candidato) continue;
      all.push({
        id: request.id,
        candidatoId: request.candidatoId,
        nome: candidato.nome,
        email: candidato.email,
        tipo: request.tipo,
        status: request.status,
        criadaEm: request.criadaEm,
        mensagem: request.mensagem,
        solicitacao: request,
      });
    }

    return all
      .filter((item) => filtro === 'todas' || item.status === filtro)
      .filter((item) => tipo === 'todas' || item.tipo === tipo)
      .filter((item) => !termo || `${item.nome} ${item.email} ${item.mensagem ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo))
      .sort((a, b) => +new Date(b.criadaEm) - +new Date(a.criadaEm));
  }, [busca, candidatos, filtro, solicitacoes, tipo]);

  const pendentes = itens.filter((item) => item.status === 'pendente').length;
  const candidatoSelecionado = candidatos.find((item) => item.id === selecionado) ?? null;

  const resolverItem = (id: string, status: 'atendida' | 'recusada') => {
    if (id.startsWith('perfil-')) {
      const candidatoId = id.slice('perfil-'.length);
      if (status === 'atendida') aprovarAtualizacaoCandidato(candidatoId);
      else recusarAtualizacaoCandidato(candidatoId);
      return;
    }
    const request = solicitacoes.find((item) => item.id === id);
    if (!request) return;
    resolverSolicitacao(id, status);
  };

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Solicitações</h1>
        <p className="text-sm text-muted-foreground">Pedidos de atualização de dados, mudança de agenda e mensagens dos profissionais.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Aguardando análise</p>
          <p className="mt-1 text-2xl font-bold">{solicitacoes.filter((item) => item.status === 'pendente').length + candidatos.filter((item) => item.solicitacaoAtualizacao).length}</p>
        </Card>
        <Card className="border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mensagens pendentes</p>
          <p className="mt-1 text-2xl font-bold">{solicitacoes.filter((item) => item.tipo === 'mensagem' && item.status === 'pendente').length}</p>
        </Card>
        <Card className="border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Exibidas nesta lista</p>
          <p className="mt-1 text-2xl font-bold">{itens.length}</p>
        </Card>
      </div>

      <Card className="border-border/70 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar profissional, e-mail ou mensagem" className="pl-9" />
          </div>
          <Select value={filtro} onChange={(event) => setFiltro(event.target.value as typeof filtro)}>
            <option value="pendente">Pendentes</option>
            <option value="todas">Todas as solicitações</option>
            <option value="atendida">Atendidas</option>
            <option value="recusada">Recusadas</option>
          </Select>
          <Select value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="todas">Todos os tipos</option>
            <option value="dados">Alteração de dados</option>
            <option value="agenda">Mudança de agenda</option>
            <option value="mensagem">Mensagem</option>
          </Select>
        </div>
      </Card>

      <div className="space-y-3">
        {itens.map((item) => {
          const perfil = item.id.startsWith('perfil-')
            ? candidatos.find((candidate) => candidate.id === item.candidatoId)?.solicitacaoAtualizacao
            : undefined;
          const camposAlterados = perfil ? PROFILE_FIELDS.filter(({ key }) =>
            JSON.stringify(candidatos.find((candidate) => candidate.id === item.candidatoId)?.[key] ?? '') !== JSON.stringify(perfil.dados[key] ?? ''),
          ) : [];
          const pendente = item.status === 'pendente';
          const typeLabel = item.tipo === 'dados' ? 'Alteração de dados' : item.tipo === 'agenda' ? 'Mudança de agenda' : 'Mensagem';
          const TypeIcon = item.tipo === 'agenda' ? CalendarClock : item.tipo === 'mensagem' ? MessageSquareText : UserRound;
          return (
            <Card key={item.id} className="border-border/70 p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 rounded-md bg-accent p-2 text-secondary"><TypeIcon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{typeLabel}</h2>
                        <Badge className={pendente ? 'border-amber-200 bg-amber-50 text-amber-800' : item.status === 'atendida' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border bg-muted text-muted-foreground'}>
                          {pendente ? 'Pendente' : item.status === 'atendida' ? 'Atendida' : 'Recusada'}
                        </Badge>
                      </div>
                      <button className="mt-1 text-left text-sm font-medium hover:underline" onClick={() => setSelecionado(item.candidatoId)}>{item.nome}</button>
                      <p className="text-xs text-muted-foreground">{item.email} · {formatDateTime(item.criadaEm)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelecionado(item.candidatoId)}>Ver cadastro</Button>
                </div>

                {item.tipo === 'dados' && perfil && (
                  <div className="grid gap-2 rounded-md bg-muted/30 p-3 sm:grid-cols-2">
                    {camposAlterados.map(({ key, label }) => (
                      <div key={key} className="rounded border bg-card p-2.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-1 break-words text-xs"><span className="text-muted-foreground">Atual: </span>{stringify(candidatos.find((candidate) => candidate.id === item.candidatoId)?.[key], key)}</p>
                        <p className="mt-1 break-words text-xs"><span className="text-muted-foreground">Solicitado: </span>{stringify(perfil.dados[key], key)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {item.tipo === 'agenda' && item.solicitacao && (
                  <div className="rounded-md bg-muted/30 p-3 text-sm">
                    <p className="text-xs font-medium">Agenda solicitada</p>
                    <p className="mt-1 text-xs text-muted-foreground">{agendaText(item.solicitacao.agenda)}</p>
                    {item.solicitacao.observacoesAgenda && <p className="mt-2 text-xs"><span className="font-medium">Observações: </span>{item.solicitacao.observacoesAgenda}</p>}
                    {item.solicitacao.mensagem && <p className="mt-2 text-xs text-muted-foreground">{item.solicitacao.mensagem}</p>}
                  </div>
                )}

                {item.tipo === 'mensagem' && (
                  <div className="space-y-3 rounded-md bg-muted/30 p-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mensagem do profissional</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{item.mensagem}</p>
                    </div>
                    {item.solicitacao?.respostaEquipe && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Resposta da equipe</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">{item.solicitacao.respostaEquipe}</p>
                        {item.solicitacao.respondidaEm && <p className="mt-1 text-[10px] text-emerald-800">Respondida em {formatDateTime(item.solicitacao.respondidaEm)}</p>}
                      </div>
                    )}
                    {pendente && item.solicitacao && (
                      <div className="space-y-2 border-t border-border/70 pt-3">
                        <Textarea
                          value={respostas[item.id] ?? ''}
                          onChange={(event) => setRespostas((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          placeholder="Escreva uma resposta para o profissional..."
                          className="min-h-[84px] bg-background"
                        />
                        <Button
                          size="sm"
                          disabled={(respostas[item.id] ?? '').trim().length < 2}
                          onClick={() => {
                            responderSolicitacao(item.id, respostas[item.id] ?? '');
                            setRespostas((prev) => ({ ...prev, [item.id]: '' }));
                          }}
                        >
                          <Send className="h-3.5 w-3.5" /> Responder e concluir
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {item.tipo === 'agenda' && !item.solicitacao && perfil && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs">
                    <p className="font-medium">Agenda solicitada</p>
                    <p className="mt-1 text-muted-foreground">{stringify(perfil.dados.agenda, 'agenda')}</p>
                    {perfil.dados.observacoesAgenda && <p className="mt-1">Observações: {perfil.dados.observacoesAgenda}</p>}
                  </div>
                )}

                {pendente && item.tipo !== 'mensagem' && (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button size="sm" onClick={() => resolverItem(item.id, 'atendida')}>
                      <Check className="h-3.5 w-3.5" /> {item.tipo === 'dados' ? 'Aprovar alterações' : item.tipo === 'agenda' ? 'Aprovar agenda' : 'Marcar como atendida'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolverItem(item.id, 'recusada')}>
                      <X className="h-3.5 w-3.5" /> Recusar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {itens.length === 0 && (
          <Card className="border-dashed p-10 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">{pendentes ? 'Nenhum resultado encontrado' : 'Nenhuma solicitação por aqui'}</p>
            <p className="mt-1 text-sm text-muted-foreground">Novos pedidos enviados pelos profissionais aparecerão nesta página.</p>
          </Card>
        )}
      </div>

      <CandidatoDrawer candidato={candidatoSelecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}
