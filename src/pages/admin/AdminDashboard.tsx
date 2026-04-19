import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardSummary } from '@/types';
import {
  CalendarDays,
  Users,
  DollarSign,
  Clock,
  Loader2,
  Ban,
  Receipt,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-warning/10 text-warning',
  },
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-success/10 text-success',
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    className: 'bg-primary/10 text-primary',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-muted text-muted-foreground',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-destructive/10 text-destructive',
  },
  NO_SHOW: {
    label: 'Não compareceu',
    className: 'bg-yellow-100 text-yellow-700',
  },
  
};


export default function AdminDashboard() {
  const { user } = useAuth();
  const [rankingPeriod, setRankingPeriod] = useState<'MONTH' | 'WEEK'>('MONTH');
  const dashboardDate = format(new Date(), 'yyyy-MM-dd');

  const {
    data: summary,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardSummary>({
    queryKey: ['admin-dashboard', dashboardDate],
    queryFn: () => adminApi.dashboardSummary(dashboardDate),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const { data: topCustomersRanking = [] } = useQuery({
  queryKey: ['admin-top-customers', rankingPeriod],
  queryFn: () => adminApi.topCustomersByPeriod(rankingPeriod),
  refetchInterval: 15000,
  refetchOnWindowFocus: true,
});

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {user?.name?.split(' ')[0] || 'Admin'}
            </p>
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-card">
            <p className="font-semibold text-destructive">
              Erro ao carregar dashboard
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(
                (error as any)?.response?.data?.message ||
                (error as any)?.message ||
                'Falha ao buscar dados do dashboard'
              ).toString()}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const safeSummary = summary || {
    todayAppointments: 0,
    weekAppointments: 0,
    monthRevenue: 0,
    totalClients: 0,
    recentAppointments: [],
    cancellationRate: 0,
    averageTicket: 0,
    dailyRevenue: [],
    topServices: [],
    topCustomers: [],
  };

  const stats = [
    {
      label: 'Hoje',
      value: safeSummary.todayAppointments,
      icon: CalendarDays,
      color: 'text-primary',
    },
    {
      label: 'Semana',
      value: safeSummary.weekAppointments,
      icon: Clock,
      color: 'text-success',
    },
    {
      label: 'Receita (mês)',
      value: `R$ ${Number(safeSummary.monthRevenue || 0).toFixed(0)}`,
      icon: DollarSign,
      color: 'text-warning',
    },
    {
      label: 'Clientes',
      value: safeSummary.totalClients,
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Ticket médio',
      value: `R$ ${Number(safeSummary.averageTicket || 0).toFixed(2)}`,
      icon: Receipt,
      color: 'text-success',
    },
    {
      label: 'Cancelamento',
      value: `${Number(safeSummary.cancellationRate || 0).toFixed(2)}%`,
      icon: Ban,
      color: 'text-destructive',
    },
  ];

  const revenueChartData = (safeSummary.dailyRevenue || []).map((item) => ({
    ...item,
    label: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
  }));

  const topServicesData = (safeSummary.topServices || []).map((item) => ({
    name: item.name,
    total: item.count,
  }));

  const topCustomersData = topCustomersRanking;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Bem-vindo, {user?.name?.split(' ')[0] || 'Admin'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={cn('rounded-xl bg-muted p-2', stat.color)}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">
                Faturamento por dia
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Últimos 7 dias com base nos agendamentos confirmados e concluídos.
              </p>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `R$ ${Number(value).toFixed(2)}`}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">
                Ranking de serviços
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Serviços mais agendados hoje.
              </p>
            </div>

            {topServicesData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServicesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => `${value} agendamento(s)`}
                    />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Trophy className="h-4 w-4" />
                Ranking de clientes
              </h3>
              <div className="flex items-center justify-between mt-1">
  <p className="text-xs text-muted-foreground">
    Clientes com mais agendamentos no período selecionado.
  </p>

  <div className="flex gap-2 text-xs">
    <button
      onClick={() => setRankingPeriod('WEEK')}
      className={cn(
        'px-2 py-1 rounded-md',
        rankingPeriod === 'WEEK'
          ? 'bg-primary text-white'
          : 'bg-muted text-muted-foreground'
      )}
    >
      Semana
    </button>

    <button
      onClick={() => setRankingPeriod('MONTH')}
      className={cn(
        'px-2 py-1 rounded-md',
        rankingPeriod === 'MONTH'
          ? 'bg-primary text-white'
          : 'bg-muted text-muted-foreground'
      )}
    >
      Mês
    </button>
  </div>
</div>
            </div>

            <div className="divide-y divide-border">
              {topCustomersData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum cliente no ranking
                </p>
              ) : (
                topCustomersData.map((customer, index) => (
                  <div
                    key={`${customer.name}-${index}`}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {index + 1}. {customer.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {customer.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        agendamento(s)
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold text-foreground">
                Agendamentos Recentes
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Mostrando apenas os 5 últimos agendamentos. Para ver todos, acesse a agenda.
              </p>
            </div>

            <div className="divide-y divide-border">
              {safeSummary.recentAppointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum agendamento recente
                </p>
              ) : (
                safeSummary.recentAppointments.map((apt) => {
                  const status =
                    STATUS_MAP[apt.status] || STATUS_MAP.PENDING;

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between px-5 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {apt.client?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.serviceMode?.name || 'Serviço'} • {apt.vehicleType}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-xs font-medium',
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {apt.time}
                          {apt.date
                            ? ` • ${format(new Date(apt.date), 'dd/MM')}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}