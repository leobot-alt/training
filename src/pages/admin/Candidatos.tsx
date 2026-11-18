import { useMemo, useState } from 'react';
import { Download, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { CandidatoDrawer } from '@/components/CandidatoDrawer';
import { useStore } from '@/lib/store';
import { STATUS_META, STATUS_ORDER, type CandidatoStatus } from '@/lib/types';
import { downloadFile, formatDate, initials } from '@/lib/utils';

type SortKey = 'recentes' | 'antigos' | 'nome';

export default function Candidatos() {
  const { candidatos, pipelineStages } = useStore();
  const etapasAtivas = pipelineStages.filter((stage) => stage.enabled).sort((a, b) => a.order - b.order);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<CandidatoStatus | 'todos'>('todos');
  const [profissao, setProfissao] = useState<'todos' | 'Psicólogo' | 'Psiquiatra'>('todos');
  const [uf, setUf] = useState('todas');
  const [sort, setSort] = useState<SortKey>('recentes');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const ufs = useMemo(() => Array.from(new Set(candidatos.map((c) => c.uf))).sort(), [candidatos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = candidatos.filter((c) => {
      const matchTermo =
        !termo ||
        c.nome.toLowerCase().includes(termo) ||
        c.email.toLowerCase().includes(termo) ||
        c.cidade.toLowerCase().includes(termo) ||
        c.registro.toLowerCase().includes(termo) ||
        c.especialidades.some((e) => e.toLowerCase().includes(termo));
      const matchStatus = status === 'todos' || c.status === status;
      const matchProfissao = profissao === 'todos' || c.profissao === profissao;
      const matchUf = uf === 'todas' || c.uf === uf;
      return matchTermo && matchStatus && matchProfissao && matchUf;
    });

    return lista.sort((a, b) => {
      if (sort === 'recentes') return +new Date(b.criadoEm) - +new Date(a.criadoEm);
      if (sort === 'antigos') return +new Date(a.criadoEm) - +new Date(b.criadoEm);
      return a.nome.localeCompare(b.nome);
    });
  }, [candidatos, busca, status, profissao, uf, sort]);

  const candidato = candidatos.find((c) => c.id === selecionado) ?? null;
  const solicitacoesPendentes = candidatos.filter((item) => item.solicitacaoAtualizacao).length;
  const filtrosAtivos = [busca, status !== 'todos', profissao !== 'todos', uf !== 'todas'].filter(Boolean).length;

  const exportar = () => {
    const header = ['Protocolo', 'Nome', 'E-mail', 'Telefone', 'Cidade', 'UF', 'Profissão', 'Registro', 'Status', 'Cadastro'];
    const rows = filtrados.map((c) => [
      c.protocolo,
      c.nome,
      c.email,
      c.telefone,
      c.cidade,
      c.uf,
      c.profissao,
      c.registro,
      STATUS_META[c.status].label,
      formatDate(c.criadoEm),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    downloadFile(`candidatos-somente-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`);
  };

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Candidatos</h1>
          <p className="text-sm text-muted-foreground">
            {filtrados.length} de {candidatos.length} cadastros
          </p>
          {solicitacoesPendentes > 0 && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              {solicitacoesPendentes} solicitação(ões) de atualização aguardando validação
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportar}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      <Card className="border-border/70 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1.6fr_1fr_1fr_0.8fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, cidade ou registro"
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as CandidatoStatus | 'todos')}>
            <option value="todos">Todos os status</option>
            {etapasAtivas.map(({ status: s, label }) => (
              <option key={s} value={s}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={profissao} onChange={(e) => setProfissao(e.target.value as typeof profissao)}>
            <option value="todos">Todas as profissões</option>
            <option value="Psicólogo">Psicólogo(a)</option>
            <option value="Psiquiatra">Psiquiatra</option>
          </Select>
          <Select value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="todas">UF</option>
            {ufs.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
            <option value="nome">Nome (A-Z)</option>
          </Select>
        </div>

        {filtrosAtivos > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtrosAtivos} filtro(s) aplicado(s)
            <button
              onClick={() => {
                setBusca('');
                setStatus('todos');
                setProfissao('todos');
                setUf('todas');
              }}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground hover:bg-border"
            >
              <X className="h-3 w-3" /> limpar
            </button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden border-border/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Candidato</th>
                <th className="px-4 py-3 font-medium">Profissão</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Especialidades</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelecionado(c.id)}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {initials(c.nome)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p>{c.profissao}</p>
                    <p className="text-[11px] text-muted-foreground">{c.registro}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {c.cidade}/{c.uf}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.especialidades.slice(0, 2).map((esp) => (
                        <span key={esp} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {esp}
                        </span>
                      ))}
                      {c.especialidades.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{c.especialidades.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={STATUS_META[c.status].badge}>{pipelineStages.find((stage) => stage.status === c.status)?.label ?? STATUS_META[c.status].label}</Badge>
                      {c.solicitacaoAtualizacao && <Badge className="border-amber-200 bg-amber-50 text-amber-800">Atualização pendente</Badge>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(c.criadoEm)}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    <Filter className="mx-auto mb-2 h-5 w-5" />
                    Nenhum candidato encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CandidatoDrawer candidato={candidato} onClose={() => setSelecionado(null)} />
    </div>
  );
}
