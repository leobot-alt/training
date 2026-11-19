import { useState } from 'react';
import { Database, Download, FileArchive, LockKeyhole, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { useStore } from '@/lib/store';
import { STATUS_META } from '@/lib/types';
import { exportLegacyBundle, readLegacyBundle, type LegacyBundle } from '@/lib/legacy-migration';
import { uploadCandidateDocument } from '@/lib/supabase';
import { deleteDocumentFile } from '@/lib/document-storage';
import { supabase } from '@/lib/supabase';
import { downloadFile, formatDate } from '@/lib/utils';
import { FIXED_REQUIRED_REGISTRATION_FIELDS, normalizeRegistrationFields, REGISTRATION_FIELD_GROUPS, type RegistrationFieldKey } from '@/lib/registration-fields';

const ALLOWED_STATE_KEYS = ['candidatos', 'trilhas', 'progresso', 'pipelineStages', 'solicitacoes', 'homeContent', 'trainingFlow'] as const;

export default function Ajustes() {
  const { candidatos, user, homeContent, syncError, updateHomeContent } = useStore();
  const registrationFields = normalizeRegistrationFields(homeContent.registrationFields);
  const [exportando, setExportando] = useState(false);
  const [bundle, setBundle] = useState<LegacyBundle | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [progresso, setProgresso] = useState('');

  const setRegistrationField = (key: RegistrationFieldKey, required: boolean) => {
    updateHomeContent({
      ...homeContent,
      registrationFields: { ...registrationFields, [key]: required },
    });
  };

  const exportarCsv = () => {
    const header = ['Protocolo', 'Nome', 'E-mail', 'Telefone', 'Cidade', 'UF', 'Profissão', 'Registro', 'Status', 'Agenda disponível', 'Cadastro'];
    const rows = candidatos.map((c) => [
      c.protocolo, c.nome, c.email, c.telefone, c.cidade, c.uf, c.profissao, c.registro,
      STATUS_META[c.status]?.label ?? c.status,
      (c.agenda ?? []).map((slot) => `${slot.dia} ${slot.inicio}-${slot.fim}`).join(' | '),
      formatDate(c.criadoEm),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    downloadFile(`base-somente-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${csv}`);
  };

  const exportarLegado = async () => {
    setErro(''); setMensagem(''); setExportando(true);
    try {
      const { file, manifest } = await exportLegacyBundle();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `somente-migracao-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMensagem(`Exportação concluída: ${manifest.candidateCount} profissional(is), ${manifest.attachmentCount} documento(s). ${manifest.missingAttachmentIds.length ? `${manifest.missingAttachmentIds.length} arquivo(s) não estavam no navegador e ficaram listados no manifesto.` : ''}`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível exportar os dados antigos.');
    } finally {
      setExportando(false);
    }
  };

  const selecionarArquivo = async (file?: File) => {
    setErro(''); setMensagem(''); setBundle(null);
    if (!file) return;
    try {
      const parsed = await readLegacyBundle(file);
      setBundle(parsed);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Arquivo de migração inválido.');
    }
  };

  const importar = async () => {
    if (!bundle || user?.role !== 'admin') return;
    if (candidatos.length > 0) return setErro('A importação só é permitida quando a base do Supabase ainda está sem profissionais. Ela não substitui nem mescla dados existentes.');
    const oldCandidates = Array.isArray(bundle.state.candidatos) ? bundle.state.candidatos as Array<Record<string, unknown>> : [];
    if (oldCandidates.some((candidate) => !/^[A-Za-z0-9_-]{1,100}$/.test(String(candidate.id ?? '')))) {
      return setErro('O pacote contém um identificador de profissional inválido. Nenhum arquivo foi enviado.');
    }
    const seen = new Set<string>();
    for (const candidate of oldCandidates) {
      const cpf = String(candidate.cpf ?? '').replace(/\D/g, '');
      if (!cpf) continue;
      if (seen.has(cpf)) return setErro('O pacote contém CPFs repetidos. Corrija a base antiga antes de importar.');
      seen.add(cpf);
    }
    if (!window.confirm(`Importar ${oldCandidates.length} profissional(is) e ${bundle.manifest.attachmentCount} documento(s)? Esta operação só pode ser executada uma vez e não substitui dados já existentes. Senhas e contas locais da equipe não serão migradas; profissionais com CPF/data válidos receberão acesso por CPF e data de nascimento. Continue?`)) return;

    setPreparando(true); setErro(''); setMensagem(''); setProgresso('Preparando dados…');
    const uploadedPaths: string[] = [];
    try {
      const attachmentById = new Map(bundle.manifest.attachments.map((attachment) => [attachment.oldId, attachment]));
      const candidates = [];
      let fileNumber = 0;
      for (const candidate of oldCandidates) {
        const sourceDocuments = Array.isArray(candidate.documentos) ? candidate.documentos as Array<Record<string, unknown>> : [];
        const documents = [];
        for (const document of sourceDocuments) {
          const oldId = typeof document.arquivoId === 'string' ? document.arquivoId : '';
          const attachment = oldId ? attachmentById.get(oldId) : undefined;
          if (!attachment) {
            const { arquivoId: _id, arquivoNome: _name, arquivoTipo: _type, arquivoTamanho: _size, enviadoEm: _sent, ...withoutFile } = document;
            documents.push({ ...withoutFile, status: 'pendente' });
            continue;
          }
          const entry = bundle.archive.file(attachment.archivePath);
          if (!entry) throw new Error(`O documento “${attachment.name}” não está dentro do pacote.`);
          const blob = await entry.async('blob');
          const safeName = attachment.name.replace(/[\\/]/g, '-').slice(-120) || 'documento.bin';
          if (blob.size > 10 * 1024 * 1024 || !/\.(pdf|jpe?g|png)$/i.test(safeName)) throw new Error(`O documento “${safeName}” excede 10 MB ou não está em PDF/JPG/PNG.`);
          const file = new File([blob], safeName, { type: attachment.type || blob.type || 'application/octet-stream' });
          const newPath = await uploadCandidateDocument(String(candidate.id), `migracao-${Date.now()}-${fileNumber++}`, file);
          uploadedPaths.push(newPath);
          const { arquivoId: _oldId, ...withoutOldId } = document;
          documents.push({ ...withoutOldId, status: document.status === 'validado' ? 'validado' : 'enviado', arquivoId: newPath, arquivoNome: file.name, arquivoTipo: file.type, arquivoTamanho: file.size });
          setProgresso(`Enviando documentos (${uploadedPaths.length}/${bundle.manifest.attachmentCount})…`);
        }
        candidates.push({ ...candidate, documentos: documents });
      }

      const sanitized: Record<string, unknown> = {};
      for (const key of ALLOWED_STATE_KEYS) {
        if (key === 'candidatos') sanitized[key] = candidates;
        else if (Object.prototype.hasOwnProperty.call(bundle.state, key)) sanitized[key] = bundle.state[key];
      }
      const { data, error } = await supabase.functions.invoke('import-legacy', { body: { state: sanitized } });
      if (error || data?.error || !data?.ok) throw new Error(data?.error ?? error?.message ?? 'Não foi possível concluir a migração.');
      setMensagem(`Migração concluída: ${data.importedCandidates} profissional(is), ${data.linkedCandidates} com acesso CPF/data de nascimento. ${data.semAcesso ? `${data.semAcesso} cadastro(s) precisam de revisão de CPF e data de nascimento.` : ''} Atualizando a tela…`);
      window.setTimeout(() => window.location.reload(), 1800);
    } catch (error) {
      await Promise.allSettled(uploadedPaths.map((path) => deleteDocumentFile(path)));
      setErro(error instanceof Error ? error.message : 'Não foi possível concluir a migração. Nenhum registro foi substituído.');
      setProgresso('');
    } finally {
      setPreparando(false);
    }
  };

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Exportações e manutenção da base persistente do Supabase.</p>
      </div>

      {erro && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erro}</div>}
      {mensagem && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensagem}</div>}

      {user?.role === 'admin' && <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Campos do pré-cadastro</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Defina o que o profissional precisa preencher. As alterações ficam salvas automaticamente e valem para novos envios.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {syncError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">A configuração não foi sincronizada com o Supabase: {syncError}</p>}
          <div className="rounded-md border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm font-medium">Sempre obrigatórios</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Nome, CPF, data de nascimento, profissão e consentimento LGPD são necessários para identificar o profissional, permitir o acesso e registrar a autorização de tratamento de dados.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FIXED_REQUIRED_REGISTRATION_FIELDS.map((field) => <span key={field.label} title={field.reason} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium"><LockKeyhole className="h-3 w-3 text-secondary" />{field.label}</span>)}
            </div>
          </div>

          {REGISTRATION_FIELD_GROUPS.map((group) => <section key={group.title} className="space-y-2">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <div className="divide-y rounded-md border border-border/70 px-3">
              {group.fields.map((field) => {
                const required = registrationFields[field.key];
                return <div key={field.key} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{required ? 'O profissional precisa preencher este campo.' : 'O profissional pode deixar este campo em branco.'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={required}
                      aria-label={`${field.label}: ${required ? 'obrigatório' : 'opcional'}`}
                      onClick={() => setRegistrationField(field.key, !required)}
                      className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${required ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`w-24 text-right text-xs font-semibold ${required ? 'text-primary' : 'text-muted-foreground'}`}>{required ? 'Obrigatório' : 'Opcional'}</span>
                  </div>
                </div>;
              })}
            </div>
          </section>)}

          <p className="text-xs text-muted-foreground">Os documentos anexos continuam podendo ser enviados nesta etapa e ficam pendentes para análise quando não anexados.</p>
        </CardContent>
      </Card>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4 text-secondary" /> Armazenamento permanente</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Profissionais, solicitações, permissões, treinamentos e conteúdo público são salvos no banco Supabase. Documentos e vídeos usam buckets privados, com acesso controlado por sessão e permissões.</p>
            <div className="rounded-md bg-muted/60 p-3 text-xs">{candidatos.length} profissionais carregados nesta área · acesso: {user?.role === 'admin' ? 'administrador' : 'equipe'}</div>
            <p className="text-xs">O portal estático não armazena segredos de serviço. A chave usada no navegador é pública; autorização é aplicada pelas políticas RLS e funções do Supabase.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4 text-secondary" /> Exportar dados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Baixe uma planilha CSV com os campos de acompanhamento. Para uma migração completa, use a exportação ZIP abaixo.</p>
            <Button variant="outline" size="sm" onClick={exportarCsv}><Download className="h-3.5 w-3.5" /> Baixar CSV</Button>
          </CardContent>
        </Card>

        {user?.role === 'admin' && <Card className="border-border/70 lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileArchive className="h-4 w-4 text-secondary" /> Migração da base local</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <p className="font-semibold">Proteja o arquivo exportado: ele contém dados pessoais e documentos.</p>
              <p className="mt-1 text-xs leading-relaxed">Faça a exportação no mesmo navegador e na mesma origem onde a versão antiga guardou os registros. O ZIP não leva contas nem senhas da equipe. A senha profissional continuará sendo a data de nascimento. Guarde o ZIP em local seguro e apague-o depois da migração.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void exportarLegado()} disabled={exportando}>{exportando ? 'Exportando…' : 'Exportar base antiga para ZIP'}</Button>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span>Selecionar ZIP para importar</span>
                <Input type="file" accept=".zip,application/zip" className="max-w-[220px]" disabled={preparando || candidatos.length > 0} onChange={(event) => void selecionarArquivo(event.target.files?.[0])} />
              </label>
            </div>
            {bundle && <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium">Pacote reconhecido</p>
              <p className="mt-1 text-xs text-muted-foreground">{bundle.manifest.candidateCount} profissional(is) · {bundle.manifest.attachmentCount} documento(s) incluído(s) · exportado em {formatDate(bundle.manifest.exportedAt)}.</p>
              {bundle.manifest.missingAttachmentIds.length > 0 && <p className="mt-2 text-xs text-amber-800">{bundle.manifest.missingAttachmentIds.length} documento(s) não estavam disponíveis no navegador antigo; serão importados sem o arquivo para revisão.</p>}
              <p className="mt-2 text-xs text-muted-foreground">A importação só funciona enquanto a base Supabase não tiver profissionais cadastrados. Contas e senhas da equipe devem ser recriadas no portal.</p>
              {progresso && <p className="mt-3 text-xs font-medium text-secondary">{progresso}</p>}
              <Button className="mt-3" size="sm" variant="danger" disabled={preparando || candidatos.length > 0} onClick={() => void importar()}>{preparando ? 'Migrando…' : 'Importar para Supabase'}</Button>
              {candidatos.length > 0 && <p className="mt-2 text-xs text-destructive">A base atual já tem profissionais; a importação está bloqueada para evitar sobrescrita.</p>}
            </div>}
          </CardContent>
        </Card>}

        <Card className="border-amber-200 bg-amber-50/60 lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-900"><ShieldAlert className="h-4 w-4" /> Privacidade e credenciais</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-amber-900/80">
            <p>1. Não compartilhe arquivos ZIP de migração por e-mail aberto; eles podem conter documentos e dados de saúde.</p>
            <p>2. Não coloque a chave service_role em arquivos Vite, GitHub Pages ou variáveis `VITE_*`.</p>
            <p>3. Profissionais acessam com CPF e data de nascimento; solicite que atualizem esse acesso por um canal seguro quando a política de senha estiver disponível.</p>
            <p>4. Contas da equipe não são migradas: crie usuários novos e atribua somente as permissões necessárias.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
