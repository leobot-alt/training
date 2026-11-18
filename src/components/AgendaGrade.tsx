import { useMemo } from 'react';
import { Textarea } from '@/components/ui/field';
import { DIAS_SEMANA, type AgendaSlot } from '@/lib/types';
import { cn } from '@/lib/utils';

const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORAS = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);

function horaSeguinte(hora: string) {
  const proxima = Number(hora.slice(0, 2)) + 1;
  return `${String(proxima).padStart(2, '0')}:00`;
}

interface AgendaGradeProps {
  agenda: AgendaSlot[];
  observacoes: string;
  disabled?: boolean;
  onChange: (agenda: AgendaSlot[]) => void;
  onObservacoesChange: (value: string) => void;
}

export function AgendaGrade({ agenda, observacoes, disabled = false, onChange, onObservacoesChange }: AgendaGradeProps) {
  const selecionados = useMemo(() => {
    const set = new Set<string>();
    for (const slot of agenda) {
      for (const hora of HORAS) {
        if (DIAS_SEMANA.includes(slot.dia) && !(slot.dia === 'Sábado' && hora >= '14:00') && slot.inicio <= hora && slot.fim > hora) {
          set.add(`${slot.dia}|${hora}`);
        }
      }
    }
    return set;
  }, [agenda]);
  const totalSemana = selecionados.size;

  const alternar = (dia: string, hora: string) => {
    if (disabled || (dia === 'Sábado' && hora >= '14:00')) return;
    const chave = `${dia}|${hora}`;
    const proxima = new Set(selecionados);
    if (proxima.has(chave)) proxima.delete(chave);
    else proxima.add(chave);
    onChange(DIAS_SEMANA.flatMap((diaItem) => HORAS
      .filter((horaItem) => proxima.has(`${diaItem}|${horaItem}`))
      .map((horaItem) => ({ dia: diaItem, inicio: horaItem, fim: horaSeguinte(horaItem) }))));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Grade de horários (1h por atendimento, recorrente em 4 semanas)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Clique nos horários disponíveis. Cada horário marcado se repetirá em todas as 4 semanas do mês.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full min-w-[650px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th scope="col" className="w-24 px-3 py-3 text-left font-medium">Hora</th>
              {DIAS_CURTOS.map((dia) => <th scope="col" key={dia} className="px-3 py-3 text-center font-medium">{dia}</th>)}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora} className="border-b last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-normal text-muted-foreground">{hora}</th>
                {DIAS_SEMANA.map((dia, index) => {
                  const indisponivel = dia === 'Sábado' && hora >= '14:00';
                  const checked = selecionados.has(`${dia}|${hora}`);
                  return (
                    <td key={dia} className="px-3 py-1.5 text-center">
                      {indisponivel ? (
                        <span aria-label="Horário indisponível" className="mx-auto block h-8 w-8 rounded-md bg-muted/70" />
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`${hora} de ${DIAS_SEMANA[index]}`}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => alternar(dia, hora)}
                          className={cn('h-8 w-8 cursor-pointer rounded-md border-input accent-[hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-70', checked && 'border-secondary')}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalSemana} {totalSemana === 1 ? 'horário' : 'horários'}/semana · {totalSemana * 4}h/mês (4 semanas)
      </p>

      <div className="space-y-2">
        <label htmlFor="observacoes-agenda" className="text-sm font-medium">Observações sobre a disponibilidade</label>
        <Textarea
          id="observacoes-agenda"
          value={observacoes}
          onChange={(event) => onObservacoesChange(event.target.value)}
          disabled={disabled}
          placeholder="Ex.: não consigo atender às quartas; férias de 10 a 20/12"
          className="min-h-24"
        />
      </div>
    </div>
  );
}
