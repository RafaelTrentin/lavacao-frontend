import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const dateLabel = (date: string) => date.split('-').reverse().join('/');

export default function BusinessClosures() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const queryClient = useQueryClient();
  const { data: closures = [], isLoading, isError } = useQuery({
    queryKey: ['business-closures'], queryFn: adminApi.closures,
    staleTime: 0, refetchOnMount: 'always',
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['business-closures'] }),
      queryClient.invalidateQueries({ queryKey: ['slots'] }),
    ]);
  };
  const failure = (error: any) => {
    const message = error?.response?.data?.message;
    toast.error(typeof message === 'string' ? message : 'Não foi possível atualizar o fechamento. Tente novamente.');
  };
  const create = useMutation({
    mutationFn: () => adminApi.closeBusiness(start, end),
    onSuccess: async (block) => {
      setStart(''); setEnd('');
      if (block.affectedAppointments.length) toast.warning('Lavação fechada no período. Há agendamentos que precisam ser reagendados; confira a lista abaixo.');
      else toast.success('Período de fechamento salvo.');
      await refresh();
    }, onError: failure,
  });
  const remove = useMutation({ mutationFn: adminApi.removeClosure, onSuccess: refresh, onError: failure });
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
    <h2 className="font-semibold">Lavação fechada</h2>
    <p className="text-sm text-muted-foreground">Informe férias ou outro período sem atendimento. As duas datas estão incluídas, no horário local da lavação. Nenhum agendamento existente será cancelado automaticamente.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Fechada a partir de
        <Input aria-label="Fechada a partir de" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
      </label>
      <label className="space-y-1 text-sm">Fechada até (inclusive)
        <Input aria-label="Fechada até" type="date" min={start || undefined} value={end} onChange={(event) => setEnd(event.target.value)} />
      </label>
    </div>
    {start && end && end < start && <p role="alert" className="text-sm text-destructive">A data final deve ser igual ou posterior à inicial.</p>}
    <Button disabled={!start || !end || end < start || create.isPending} onClick={() => create.mutate()}>
      {create.isPending ? 'Salvando...' : 'Salvar período fechado'}
    </Button>
    {isLoading && <p>Carregando períodos...</p>}
    {isError && <p role="alert">Não foi possível carregar os períodos de fechamento.</p>}
    {!isLoading && !isError && !closures.length && <p className="text-sm text-muted-foreground">Nenhum período de fechamento cadastrado.</p>}
    {closures.map((closure) => <div key={closure.id} className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{dateLabel(closure.blockDate)} até {dateLabel(closure.blockEndDate)}</p>
        <Button variant="outline" disabled={remove.isPending} onClick={() => {
          if (window.confirm('Remover este fechamento e liberar a disponibilidade conforme os horários de funcionamento?')) remove.mutate(closure.id);
        }}>Remover fechamento</Button>
      </div>
      {!!closure.affectedAppointments.length && <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">Atenção: {closure.affectedAppointments.length} atendimento(s) neste período. Entre em contato com os clientes para reagendar.</p>
        <ul className="space-y-1">{closure.affectedAppointments.map((appointment) => <li key={appointment.id}>
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: closure.timezone }).format(new Date(appointment.scheduledStartAt))}
          {' — '}{appointment.customer.name} — #{appointment.bookingNumber}
        </li>)}</ul>
        <Link className="inline-block underline" to="/admin/schedule">Abrir agenda para reagendar</Link>
      </div>}
    </div>)}
  </section>;
}
