import { useState, type FormEvent } from 'react';
import { Check, Save } from 'lucide-react';
import { AgendaGrade } from '@/components/AgendaGrade';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { ABORDAGENS, ESPECIALIDADES, type Candidato, type DadosPerfilCandidato } from '@/lib/types';
import { cn } from '@/lib/utils';

const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

function dadosAtuais(candidato: Candidato): DadosPerfilCandidato {
  return {
    nome: candidato.nome,
    cpf: candidato.cpf ?? '',
    rg: candidato.rg ?? '',
    sexo: candidato.sexo ?? '',
    dataNascimento: candidato.dataNascimento ?? '',
    email: candidato.email,
    emailTeams: candidato.emailTeams ?? '',
    telefone: candidato.telefone,
    cep: candidato.cep ?? '',
    endereco: candidato.endereco ?? '',
    numero: candidato.numero ?? '',
    chavePix: candidato.chavePix ?? '',
    cidade: candidato.cidade,
    uf: candidato.uf,
    profissao: candidato.profissao,
    registro: candidato.registro,
    especialidades: [...candidato.especialidades],
    abordagem: candidato.abordagem,
    experienciaAnos: candidato.experienciaAnos,
    bio: candidato.bio ?? '',
    agenda: [...(candidato.agenda ?? [])],
    observacoesAgenda: candidato.observacoesAgenda ?? '',
  };
}

export function AdminCandidateEdit({ candidato, onSave }: {
  candidato: Candidato;
  onSave: (dados: DadosPerfilCandidato) => void;
}) {
  const [form, setForm] = useState(() => dadosAtuais(candidato));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  const set = <K extends keyof DadosPerfilCandidato>(key: K, value: DadosPerfilCandidato[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setSalvo(false);
  };

  const toggleEspecialidade = (item: string) => {
    set('especialidades', form.especialidades.includes(item)
      ? form.especialidades.filter((especialidade) => especialidade !== item)
      : [...form.especialidades, item]);
  };

  const salvar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.nome.trim().length < 5) next.nome = 'Informe o nome completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
    if (form.registro.trim().length < 3) next.registro = 'Informe o registro profissional.';
    if (!form.abordagem) next.abordagem = 'Selecione uma abordagem.';
    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({
      ...form,
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      emailTeams: form.emailTeams?.trim().toLowerCase(),
      bio: form.bio?.trim(),
      especialidades: [...form.especialidades],
      agenda: [...form.agenda],
      observacoesAgenda: form.observacoesAgenda?.trim() ?? '',
    });
    setSalvo(true);
  };

  return (
    <form className="space-y-6 animate-fade-in" onSubmit={salvar}>
      <div>
        <h2 className="font-semibold">Editar dados do profissional</h2>
        <p className="mt-1 text-sm text-muted-foreground">As alterações salvas pela equipe são aplicadas diretamente ao cadastro.</p>
      </div>

      <section className="space-y-4">
        <h3 className="border-b pb-2 text-sm font-semibold">Dados pessoais e contato</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" required error={errors.nome} className="sm:col-span-2">
            <Input value={form.nome} onChange={(event) => set('nome', event.target.value)} />
          </Field>
          <Field label="CPF">
            <Input value={form.cpf ?? ''} onChange={(event) => set('cpf', event.target.value)} />
          </Field>
          <Field label="RG">
            <Input value={form.rg ?? ''} onChange={(event) => set('rg', event.target.value)} />
          </Field>
          <Field label="Sexo">
            <Select value={form.sexo ?? ''} onChange={(event) => set('sexo', event.target.value)}>
              <option value="">Selecione</option>
              <option value="Feminino">Feminino</option>
              <option value="Masculino">Masculino</option>
              <option value="Não binário">Não binário</option>
              <option value="Prefiro não informar">Prefiro não informar</option>
            </Select>
          </Field>
          <Field label="Data de nascimento">
            <Input type="date" value={form.dataNascimento ?? ''} onChange={(event) => set('dataNascimento', event.target.value)} />
          </Field>
          <Field label="E-mail" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
          </Field>
          <Field label="E-mail Microsoft Teams">
            <Input type="email" value={form.emailTeams ?? ''} onChange={(event) => set('emailTeams', event.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(event) => set('telefone', event.target.value)} />
          </Field>
          <Field label="CEP">
            <Input value={form.cep ?? ''} onChange={(event) => set('cep', event.target.value)} />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <Input value={form.endereco ?? ''} onChange={(event) => set('endereco', event.target.value)} />
          </Field>
          <Field label="Número / complemento">
            <Input value={form.numero ?? ''} onChange={(event) => set('numero', event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">
              <Input value={form.cidade} onChange={(event) => set('cidade', event.target.value)} />
            </Field>
            <Field label="UF">
              <Select value={form.uf} onChange={(event) => set('uf', event.target.value)}>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Chave Pix" className="sm:col-span-2">
            <Input value={form.chavePix ?? ''} onChange={(event) => set('chavePix', event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 text-sm font-semibold">Dados profissionais</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profissão">
            <Select value={form.profissao} onChange={(event) => set('profissao', event.target.value as DadosPerfilCandidato['profissao'])}>
              <option value="Psicólogo">Psicólogo(a)</option>
              <option value="Psiquiatra">Psiquiatra</option>
            </Select>
          </Field>
          <Field label="Registro profissional" required error={errors.registro}>
            <Input value={form.registro} onChange={(event) => set('registro', event.target.value)} />
          </Field>
          <Field label="Anos de experiência">
            <Input type="number" min={0} max={80} value={form.experienciaAnos ?? ''} onChange={(event) => set('experienciaAnos', event.target.value === '' ? null : Number(event.target.value))} />
          </Field>
          <Field label="Abordagem principal" required error={errors.abordagem}>
            <Select value={form.abordagem} onChange={(event) => set('abordagem', event.target.value)}>
              <option value="">Selecione uma abordagem</option>
              {form.abordagem && !ABORDAGENS.includes(form.abordagem) && <option value={form.abordagem}>{form.abordagem}</option>}
              {ABORDAGENS.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Especialidades" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map((item) => {
                const active = form.especialidades.includes(item);
                return (
                  <button key={item} type="button" onClick={() => toggleEspecialidade(item)} className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active ? 'border-secondary bg-secondary text-white' : 'border-input bg-card text-muted-foreground hover:border-secondary/50',
                  )}>{item}</button>
                );
              })}
            </div>
          </Field>
          <Field label="Resumo profissional" className="sm:col-span-2">
            <Textarea value={form.bio ?? ''} onChange={(event) => set('bio', event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b pb-2 text-sm font-semibold">Agenda do profissional</h3>
        <AgendaGrade
          agenda={form.agenda}
          observacoes={form.observacoesAgenda}
          onChange={(agenda) => set('agenda', agenda)}
          onObservacoesChange={(observacoes) => set('observacoesAgenda', observacoes)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit"><Save className="h-4 w-4" /> Salvar alterações</Button>
        {salvo && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><Check className="h-3 w-3" /> Salvo no cadastro</Badge>}
      </div>
    </form>
  );
}
