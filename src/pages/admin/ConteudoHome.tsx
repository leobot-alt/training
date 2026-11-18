import { useStore } from '@/lib/store';
import type { HomeContent, HomeFaqItem, HomeTextItem } from '@/lib/home-content';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/field';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{multiline ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} /> : <Input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

export default function ConteudoHome() {
  const { homeContent, updateHomeContent, resetHomeContent } = useStore();
  const patch = <K extends keyof HomeContent>(section: K, value: Partial<HomeContent[K]>) => {
    updateHomeContent({ ...homeContent, [section]: { ...homeContent[section], ...value } });
  };
  const patchTextItem = (section: 'how' | 'benefits', index: number, value: Partial<HomeTextItem>) => {
    const items = homeContent[section].items.map((item, i) => i === index ? { ...item, ...value } : item);
    patch(section, { items });
  };
  const patchFaq = (index: number, value: Partial<HomeFaqItem>) => {
    const items = homeContent.faq.items.map((item, i) => i === index ? { ...item, ...value } : item);
    patch('faq', { items });
  };

  return <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-secondary">Portal público</p><h1 className="mt-1 text-2xl font-bold">Conteúdo da página inicial</h1><p className="mt-1 text-sm text-muted-foreground">As alterações são salvas automaticamente e aparecem no portal público.</p></div>
      <Button variant="outline" onClick={() => { if (window.confirm('Restaurar o conteúdo padrão das quatro seções?')) resetHomeContent(); }}><RotateCcw className="mr-2 h-4 w-4" />Restaurar padrão</Button>
    </header>

    <Card className="space-y-4 border-border/70 p-5">
      <div><h2 className="text-lg font-semibold">Como funciona</h2><p className="text-xs text-muted-foreground">Edite os textos e os passos do processo de pré-cadastro.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Texto superior" value={homeContent.how.eyebrow} onChange={(eyebrow) => patch('how', { eyebrow })}/><Field label="Título" value={homeContent.how.title} onChange={(title) => patch('how', { title })}/></div>
      <Field label="Descrição" value={homeContent.how.description} onChange={(description) => patch('how', { description })} multiline />
      {homeContent.how.items.map((item, index) => <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1.5fr_auto]"><Field label={`Passo ${index + 1} · título`} value={item.title} onChange={(title) => patchTextItem('how', index, { title })}/><Field label="Descrição" value={item.text} onChange={(text) => patchTextItem('how', index, { text })} multiline/><Button variant="ghost" size="icon" aria-label="Remover passo" onClick={() => patch('how', { items: homeContent.how.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4"/></Button></div>)}
      <Button variant="outline" size="sm" onClick={() => patch('how', { items: [...homeContent.how.items, { title: '', text: '' }] })}><Plus className="mr-2 h-4 w-4"/>Adicionar passo</Button>
    </Card>

    <Card className="space-y-4 border-border/70 p-5">
      <div><h2 className="text-lg font-semibold">Benefícios</h2><p className="text-xs text-muted-foreground">Gerencie os benefícios apresentados aos profissionais.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Texto superior" value={homeContent.benefits.eyebrow} onChange={(eyebrow) => patch('benefits', { eyebrow })}/><Field label="Título" value={homeContent.benefits.title} onChange={(title) => patch('benefits', { title })}/></div>
      <Field label="Descrição" value={homeContent.benefits.description} onChange={(description) => patch('benefits', { description })} multiline />
      {homeContent.benefits.items.map((item, index) => <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1.5fr_auto]"><Field label="Benefício · título" value={item.title} onChange={(title) => patchTextItem('benefits', index, { title })}/><Field label="Descrição" value={item.text} onChange={(text) => patchTextItem('benefits', index, { text })} multiline/><Button variant="ghost" size="icon" aria-label="Remover benefício" onClick={() => patch('benefits', { items: homeContent.benefits.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4"/></Button></div>)}
      <Button variant="outline" size="sm" onClick={() => patch('benefits', { items: [...homeContent.benefits.items, { title: '', text: '' }] })}><Plus className="mr-2 h-4 w-4"/>Adicionar benefício</Button>
    </Card>

    <Card className="space-y-4 border-border/70 p-5">
      <div><h2 className="text-lg font-semibold">Requisitos</h2><p className="text-xs text-muted-foreground">Atualize o texto e os itens do checklist.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Texto superior" value={homeContent.requirements.eyebrow} onChange={(eyebrow) => patch('requirements', { eyebrow })}/><Field label="Título" value={homeContent.requirements.title} onChange={(title) => patch('requirements', { title })}/></div>
      <Field label="Descrição" value={homeContent.requirements.description} onChange={(description) => patch('requirements', { description })} multiline />
      <Field label="Título do checklist" value={homeContent.requirements.listTitle} onChange={(listTitle) => patch('requirements', { listTitle })}/>
      {homeContent.requirements.items.map((item, index) => <div key={index} className="flex items-end gap-2"><Field label={`Requisito ${index + 1}`} value={item} onChange={(next) => patch('requirements', { items: homeContent.requirements.items.map((entry, i) => i === index ? next : entry) })}/><Button variant="ghost" size="icon" aria-label="Remover requisito" onClick={() => patch('requirements', { items: homeContent.requirements.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4"/></Button></div>)}
      <Button variant="outline" size="sm" onClick={() => patch('requirements', { items: [...homeContent.requirements.items, ''] })}><Plus className="mr-2 h-4 w-4"/>Adicionar requisito</Button>
      <Field label="Observação complementar" value={homeContent.requirements.note} onChange={(note) => patch('requirements', { note })} multiline />
    </Card>

    <Card className="space-y-4 border-border/70 p-5">
      <div><h2 className="text-lg font-semibold">Dúvidas frequentes</h2><p className="text-xs text-muted-foreground">Edite as respostas e o contato exibido ao final da seção.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><Field label="Texto superior" value={homeContent.faq.eyebrow} onChange={(eyebrow) => patch('faq', { eyebrow })}/><Field label="Título" value={homeContent.faq.title} onChange={(title) => patch('faq', { title })}/></div>
      <Field label="Descrição" value={homeContent.faq.description} onChange={(description) => patch('faq', { description })}/><Field label="E-mail de contato" value={homeContent.faq.email} onChange={(email) => patch('faq', { email })}/>
      {homeContent.faq.items.map((item, index) => <div key={index} className="relative space-y-3 rounded-md border p-3 pr-12"><Field label={`Pergunta ${index + 1}`} value={item.q} onChange={(q) => patchFaq(index, { q })}/><Field label="Resposta" value={item.a} onChange={(a) => patchFaq(index, { a })} multiline/><Button className="absolute right-2 top-2" variant="ghost" size="icon" aria-label="Remover pergunta" onClick={() => patch('faq', { items: homeContent.faq.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4"/></Button></div>)}
      <Button variant="outline" size="sm" onClick={() => patch('faq', { items: [...homeContent.faq.items, { q: '', a: '' }] })}><Plus className="mr-2 h-4 w-4"/>Adicionar pergunta</Button>
    </Card>
  </div>;
}
