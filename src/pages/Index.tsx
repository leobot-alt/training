import { Link } from 'react-router-dom';
import { useStore } from '@/lib/store';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  CreditCard,
  HeartHandshake,
  Laptop,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const stats = [
  { value: '1.200+', label: 'profissionais ativos' },
  { value: '38 mil', label: 'sessões por mês' },
  { value: '4,8/5', label: 'nota dos pacientes' },
  { value: '7 dias', label: 'média para o 1º repasse' },
];

const stepIcons = [BadgeCheck, HeartHandshake, CalendarClock];
const benefitIcons = [Users, Video, CreditCard, Laptop, ShieldCheck, Sparkles];

const depoimentos = [
  {
    nome: 'Mariana Alves',
    cargo: 'Psicóloga · CRP 04/33210',
    texto:
      'Em três meses eu saí de dois pacientes para uma agenda cheia, sem gastar um real com anúncio. O time acompanha de perto e o repasse nunca atrasou.',
  },
  {
    nome: 'Carlos Eduardo Lima',
    cargo: 'Psiquiatra · CRM 52-88412',
    texto:
      'A plataforma resolve o que mais consome tempo no consultório: agenda, lembretes e prontuário. Consigo focar no cuidado e ainda atender de casa.',
  },
];

function HeroPanel() {
  const sessoes = [
    { hora: '09:00', nome: 'Paciente A.', tag: 'Retorno', status: 'Confirmada' },
    { hora: '11:30', nome: 'Paciente B.', tag: '1ª sessão', status: 'Confirmada' },
    { hora: '15:00', nome: 'Paciente C.', tag: 'Retorno', status: 'Aguardando' },
  ];

  return (
    <div className="relative">
      <div className="absolute -left-6 -top-6 hidden h-24 w-24 rounded-full bg-secondary/15 blur-2xl md:block" />
      <div className="absolute -bottom-8 right-2 hidden h-32 w-32 rounded-full bg-accent blur-2xl md:block" />

      <Card className="relative overflow-hidden border-border/70 shadow-lift">
        <div className="flex items-center justify-between border-b bg-muted/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-foreground">Agenda de hoje</span>
          </div>
          <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Online</Badge>
        </div>

        <CardContent className="space-y-3 p-5">
          {sessoes.map((s) => (
            <div
              key={s.hora}
              className="flex items-center gap-3 rounded-md border border-border/70 bg-card px-3 py-2.5"
            >
              <div className="w-12 shrink-0 text-xs font-semibold text-secondary">{s.hora}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.nome}</p>
                <p className="text-[11px] text-muted-foreground">{s.tag} · 50 min</p>
              </div>
              <span
                className={
                  s.status === 'Confirmada'
                    ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700'
                    : 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700'
                }
              >
                {s.status}
              </span>
            </div>
          ))}

          <div className="rounded-md bg-primary p-4 text-white">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Repasse previsto · sexta</p>
            <p className="mt-1 font-display text-2xl font-bold">R$ 2.480</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-[68%] rounded-full bg-brand-cyan" />
            </div>
            <p className="mt-2 text-[11px] text-white/60">16 de 24 sessões concluídas nesta semana</p>
          </div>
        </CardContent>
      </Card>

      <Card className="absolute -bottom-10 -left-4 hidden w-52 border-border/70 shadow-soft md:block">
        <CardContent className="flex items-center gap-3 p-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
            <Star className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold">4,8 de 5</p>
            <p className="text-[10px] text-muted-foreground">Avaliação dos pacientes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Index() {
  const { homeContent } = useStore();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 via-background to-background" />
        <div className="absolute inset-x-0 top-0 -z-10 h-72 grid-lines opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <div className="container grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in space-y-7">
            <Badge className="border-secondary/30 bg-white/70 px-3 py-1 text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Vagas abertas para todo o Brasil
            </Badge>

            <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-[3.4rem]">
              Atenda de onde estiver.
              <br />
              <span className="brand-wordmark">A gente leva os pacientes</span> até você.
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              A Somente conecta psicólogos e psiquiatras a pacientes que já chegam prontos para começar.
              Você cuida do cuidado — a plataforma cuida do resto.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/pre-cadastro">
                <Button size="lg" className="w-full sm:w-auto">
                  Fazer meu cadastro
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver como funciona
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-secondary" /> Cadastro gratuito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-secondary" /> Sem exclusividade
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-secondary" /> Repasse semanal
              </span>
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:120ms]">
            <HeroPanel />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y bg-card">
        <div className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="font-display text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
              <p className="text-xs text-muted-foreground md:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="container scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{homeContent.how.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{homeContent.how.title}</h2>
          <p className="mt-3 text-muted-foreground">{homeContent.how.description}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {homeContent.how.items.map((step, index) => {
            const StepIcon = stepIcons[index % stepIcons.length];
            return <Card key={`${step.title}-${index}`} className="relative overflow-hidden border-border/70">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-4xl font-extrabold text-muted">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </CardContent>
            </Card>;
          })}
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="scroll-mt-20 bg-card py-20">
        <div className="container">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{homeContent.benefits.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{homeContent.benefits.title}</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{homeContent.benefits.description}</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {homeContent.benefits.items.map((benefit, index) => {
              const BenefitIcon = benefitIcons[index % benefitIcons.length];
              return (
              <div
                key={`${benefit.title}-${index}`}
                className="group rounded-lg border border-border/70 bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-soft"
              >
                <BenefitIcon className="h-5 w-5 text-secondary transition-transform group-hover:scale-110" />
                <h3 className="mt-4 font-semibold">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{benefit.text}</p>
              </div>
            );})}
          </div>
        </div>
      </section>

      {/* REQUISITOS */}
      <section id="requisitos" className="container scroll-mt-20 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{homeContent.requirements.eyebrow}</p>
            <h2 className="text-3xl font-bold sm:text-4xl">{homeContent.requirements.title}</h2>
            <p className="text-muted-foreground">{homeContent.requirements.description}</p>
            <Link to="/pre-cadastro" className="inline-block">
              <Button>
                Começar cadastro
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card className="border-border/70 shadow-soft">
            <CardContent className="space-y-4 p-7">
              <h3 className="font-display text-base font-semibold">{homeContent.requirements.listTitle}</h3>
              <ul className="space-y-3">
                {homeContent.requirements.items.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3 w-3 text-secondary" />
                    </span>
                    <span className="leading-relaxed text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              {homeContent.requirements.note && <p className="rounded-md bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">{homeContent.requirements.note}</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-card py-20">
        <div className="container">
          <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">Quem já atende com a gente</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {depoimentos.map((dep) => (
              <Card key={dep.nome} className="border-border/70 bg-background">
                <CardContent className="space-y-4 p-7">
                  <Quote className="h-7 w-7 text-secondary/30" />
                  <p className="text-[15px] leading-relaxed text-foreground/90">“{dep.texto}”</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {dep.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{dep.nome}</p>
                      <p className="text-xs text-muted-foreground">{dep.cargo}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container scroll-mt-20 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{homeContent.faq.eyebrow}</p>
            <h2 className="text-3xl font-bold sm:text-4xl">{homeContent.faq.title}</h2>
            <p className="text-sm text-muted-foreground">
              {homeContent.faq.description}{' '}
              <span className="font-medium text-foreground">{homeContent.faq.email}</span>.
            </p>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
            {homeContent.faq.items.map((item, index) => (
              <details key={`${item.q}-${index}`} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container pb-4">
        <div className="relative overflow-hidden rounded-[1.5rem] brand-gradient px-6 py-14 text-center text-white sm:px-12">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-secondary/25 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-brand-cyan/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Sua próxima agenda cheia começa com um formulário</h2>
            <p className="text-white/70">
              Leva cerca de 6 minutos. Você recebe retorno do nosso time em até 3 dias úteis.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/pre-cadastro">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  Fazer cadastro agora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  Já sou cadastrado
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
