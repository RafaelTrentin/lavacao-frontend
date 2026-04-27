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
  TrendingUp,
  Sparkles,
  Crown,
  Medal,
  Award,
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
  PENDING: { label: 'Pendente', className: 'bg-warning/10 text-warning' },
  CONFIRMED: { label: 'Confirmado', className: 'bg-success/10 text-success' },
  IN_PROGRESS: { label: 'Em andamento', className: 'bg-primary/10 text-primary' },
  COMPLETED: { label: 'Concluído', className: 'bg-muted text-muted-foreground' },
  CANCELLED: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive' },
  NO_SHOW: { label: 'Não compareceu', className: 'bg-yellow-100 text-yellow-700' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

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
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}
            </p>
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
            <p className="font-semibold text-destructive">Erro ao carregar dashboard</p>
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
      iconBg: 'bg-blue-50 text-blue-600',
      ring: 'ring-blue-100',
    },
    {
      label: 'Semana',
      value: safeSummary.weekAppointments,
      icon: Clock,
      iconBg: 'bg-emerald-50 text-emerald-600',
      ring: 'ring-emerald-100',
    },
    {
      label: 'Receita (mês)',
      value: Number(safeSummary.monthRevenue || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
      icon: DollarSign,
      iconBg: 'bg-amber-50 text-amber-600',
      ring: 'ring-amber-100',
    },
    {
      label: 'Clientes',
      value: safeSummary.totalClients,
      icon: Users,
      iconBg: 'bg-violet-50 text-violet-600',
      ring: 'ring-violet-100',
    },
    {
      label: 'Ticket médio',
      value: `R$ ${Number(safeSummary.averageTicket || 0).toFixed(2)}`,
      icon: Receipt,
      iconBg: 'bg-cyan-50 text-cyan-600',
      ring: 'ring-cyan-100',
    },
    {
      label: 'Cancelamento',
      value: `${Number(safeSummary.cancellationRate || 0).toFixed(2)}%`,
      icon: Ban,
      iconBg: 'bg-rose-50 text-rose-600',
      ring: 'ring-rose-100',
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
      <div className="space-y-6 sm:space-y-8">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <h1 className="mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui está um resumo do desempenho da sua lavação hoje.
            </p>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl ring-4 transition-transform group-hover:scale-110',
                    stat.iconBg,
                    stat.ring,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[2fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  Faturamento por dia
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Últimos 7 dias com base nos agendamentos confirmados e concluídos.
                </p>
              </div>
            </div>

            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [
                      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                      'Faturamento',
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="url(#revenueLine)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="mb-5">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-violet-500/5 text-violet-600">
                  <Award className="h-4 w-4" />
                </span>
                Ranking de serviços
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Serviços mais agendados hoje.</p>
            </div>

            {topServicesData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
              </div>
            ) : (
              <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServicesData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => `${value} agendamento(s)`}
                    />
                    <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="url(#barGrad)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </div>

        {/* Listas */}
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          {/* Ranking de clientes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <div className="border-b border-border/60 bg-gradient-to-br from-amber-50/50 to-transparent px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                  <Trophy className="h-4 w-4" />
                </span>
                Ranking de clientes
              </h3>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Clientes com mais agendamentos no período.
                </p>

                <div className="flex gap-1 rounded-lg bg-muted/60 p-1 text-xs">
                  <button
                    onClick={() => setRankingPeriod('WEEK')}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-medium transition-all',
                      rankingPeriod === 'WEEK'
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Semana
                  </button>

                  <button
                    onClick={() => setRankingPeriod('MONTH')}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-medium transition-all',
                      rankingPeriod === 'MONTH'
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Mês
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {topCustomersData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente no ranking
                </p>
              ) : (
                topCustomersData.map((customer, index) => {
                  const medalIcon =
                    index === 0 ? (
                      <Crown className="h-3.5 w-3.5" />
                    ) : index === 1 ? (
                      <Medal className="h-3.5 w-3.5" />
                    ) : index === 2 ? (
                      <Award className="h-3.5 w-3.5" />
                    ) : null;

                  const medalBg =
                    index === 0
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                      : index === 1
                      ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                      : index === 2
                      ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                      : 'bg-muted text-muted-foreground';

                  return (
                    <div
                      key={`${customer.name}-${index}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm',
                            medalBg,
                          )}
                        >
                          {medalIcon || index + 1}
                        </div>
                        <p className="truncate text-sm font-medium text-foreground">
                          {customer.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-foreground">{customer.count}</p>
                        <p className="text-[11px] text-muted-foreground">agendamento(s)</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Agendamentos recentes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <div className="border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-white shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </span>
                Agendamentos Recentes
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Mostrando os 5 últimos. Para ver todos, acesse a agenda.
              </p>
            </div>

            <div className="divide-y divide-border/60">
              {safeSummary.recentAppointments.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum agendamento recente
                </p>
              ) : (
                safeSummary.recentAppointments.map((apt) => {
                  const status = STATUS_MAP[apt.status] || STATUS_MAP.PENDING;

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-bold text-primary">
                          {(apt.client?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {apt.client?.name || 'Cliente'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {apt.serviceMode?.name || 'Serviço'} • {apt.vehicleType}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>

                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {apt.time}
                          {apt.date ? ` • ${format(new Date(apt.date), 'dd/MM')}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}