import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  adminApi,
  availabilityApi,
  serviceModesApi,
  vehicleTypesApi,
} from '@/lib/api';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  CalendarDays,
  Clock,
  Loader2,
  CalendarIcon,
  Plus,
  X,
  UserPlus,
  Users,
  MapPinned,
  Truck,
  MapPin,
  Play,
  CalendarClock,
  XCircle,
  CheckCircle2,
  Car,
  DollarSign,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type {
  ServiceMode,
  ServiceModeRule,
  TimeSlot,
  VehicleType,
  VehicleTypeInfo,
} from '@/types';
import { toast } from 'sonner';

const STATUS_MAP: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    dot: 'bg-emerald-500',
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
    dot: 'bg-sky-500',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    dot: 'bg-rose-500',
  },
  NO_SHOW: {
    label: 'Não compareceu',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    dot: 'bg-amber-500',
  },
};

type ClientMode = 'existing' | 'quick';

export default function AdminSchedulePage() {
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(new Date());
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const [clientMode, setClientMode] = useState<ClientMode>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [quickCustomer, setQuickCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [serviceModeId, setServiceModeId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [pickupDelivery, setPickupDelivery] = useState(false);
  const [searchType, setSearchType] = useState<
    'CURRENT_LOCATION' | 'MANUAL_ADDRESS' | null
  >(null);

  const [manualAddress, setManualAddress] = useState({
    streetAddress: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    pickupReference: '',
  });

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | null>(null);

  const formattedDate = format(date, 'yyyy-MM-dd');

  const invalidateDayData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['admin-appointments', formattedDate],
    });
    await queryClient.invalidateQueries({
      queryKey: ['admin-available-slots'],
    });
  };

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['admin-appointments', formattedDate],
    queryFn: async () => {
      const result = await adminApi.appointments({ date: formattedDate });
      return Array.isArray(result) ? result : [];
    },
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: adminApi.clients,
  });

  const { data: serviceModes = [], isLoading: loadingModes } = useQuery({
    queryKey: ['admin-service-modes'],
    queryFn: serviceModesApi.listAdmin,
  });

  const { data: vehicleTypes = [], isLoading: loadingVehicleTypes } = useQuery({
    queryKey: ['admin-vehicle-types'],
    queryFn: vehicleTypesApi.listAdmin,
  });

  const filteredModes = useMemo(() => {
    if (!vehicleType) return [];
    return (serviceModes as ServiceMode[]).filter((mode) =>
      mode.rules.some((rule) => rule.vehicleType.kind === vehicleType),
    );
  }, [serviceModes, vehicleType]);

  const selectedMode = useMemo(
    () =>
      (serviceModes as ServiceMode[]).find((mode) => mode.id === serviceModeId) ||
      null,
    [serviceModes, serviceModeId],
  );

  const selectedRule = useMemo(() => {
    if (!selectedMode || !vehicleType) return undefined;
    return selectedMode.rules.find(
      (rule: ServiceModeRule) => rule.vehicleType.kind === vehicleType,
    );
  }, [selectedMode, vehicleType]);

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['admin-available-slots', serviceModeId, vehicleType, formattedDate],
    queryFn: () => availabilityApi.getSlots(serviceModeId, vehicleType, formattedDate),
    enabled: !!serviceModeId && !!vehicleType && !!showCreatePanel,
  });

  const { data: rescheduleSlots = [], isLoading: loadingRescheduleSlots } = useQuery({
    queryKey: [
      'admin-reschedule-slots',
      rescheduleAppointment?.serviceModeId,
      rescheduleAppointment?.vehicleType,
      format(rescheduleDate, 'yyyy-MM-dd'),
    ],
    queryFn: () =>
      availabilityApi.getSlots(
        rescheduleAppointment!.serviceModeId,
        rescheduleAppointment!.vehicleType,
        format(rescheduleDate, 'yyyy-MM-dd'),
      ),
    enabled:
      !!showRescheduleModal &&
      !!rescheduleAppointment?.serviceModeId &&
      !!rescheduleAppointment?.vehicleType,
  });

  const resetPickupState = () => {
    setPickupDelivery(false);
    setSearchType(null);
    setLocation(null);
    setManualAddress({
      streetAddress: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      pickupReference: '',
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }
    toast.info('Capturando localização atual...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast.success('Localização capturada. Confira antes de finalizar.');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Permissão de localização negada');
          return;
        }
        toast.error('Não foi possível capturar a localização');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const openRescheduleModal = (apt: any) => {
    setRescheduleAppointment(apt);
    setRescheduleDate(apt.scheduledStartAt ? new Date(apt.scheduledStartAt) : new Date());
    setRescheduleSlot(null);
    setShowRescheduleModal(true);
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleAppointment(null);
    setRescheduleSlot(null);
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleAppointment || !rescheduleSlot) {
      toast.error('Selecione um novo horário');
      return;
    }
    const newScheduledStartAt = `${format(rescheduleDate, 'yyyy-MM-dd')}T${rescheduleSlot.startTime}:00-03:00`;
    rescheduleMutation.mutate({ id: rescheduleAppointment.id, newScheduledStartAt });
  };

  const resetCreateForm = () => {
    setClientMode('existing');
    setSelectedCustomerId('');
    setQuickCustomer({ name: '', phone: '', email: '' });
    setVehicleType('');
    setServiceModeId('');
    setSelectedSlot(null);
    resetPickupState();
  };

  const createQuickCustomerMutation = useMutation({
    mutationFn: adminApi.createQuickCustomer,
  });

  const createAdminAppointmentMutation = useMutation({
    mutationFn: adminApi.createAppointment,
    onSuccess: async () => {
      toast.success('Agendamento criado com sucesso');
      await invalidateDayData();
      setShowCreatePanel(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao criar agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminApi.cancelAppointment(id),
    onSuccess: async () => {
      toast.success('Agendamento cancelado');
      await invalidateDayData();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao cancelar agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => adminApi.startAppointment(id),
    onSuccess: async () => {
      toast.success('Agendamento iniciado');
      await invalidateDayData();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao iniciar agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => adminApi.completeAppointment(id),
    onSuccess: async () => {
      toast.success('Agendamento concluído');
      await invalidateDayData();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao concluir agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newScheduledStartAt }: { id: string; newScheduledStartAt: string }) =>
      adminApi.rescheduleAppointment(id, newScheduledStartAt),
    onSuccess: async () => {
      toast.success('Agendamento reagendado');
      await invalidateDayData();
      closeRescheduleModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao reagendar agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const handleCreateAppointment = async () => {
    if (!vehicleType || !serviceModeId || !selectedSlot) {
      toast.error('Preencha veículo, modalidade e horário');
      return;
    }
    let customerId = selectedCustomerId;
    if (clientMode === 'existing') {
      if (!customerId) {
        toast.error('Selecione um cliente');
        return;
      }
    }
    if (clientMode === 'quick') {
      if (!quickCustomer.name.trim() || !quickCustomer.phone.trim()) {
        toast.error('Informe nome e telefone do cliente');
        return;
      }
      try {
        const createdCustomer: any = await createQuickCustomerMutation.mutateAsync({
          name: quickCustomer.name.trim(),
          phone: quickCustomer.phone.trim(),
          email: quickCustomer.email.trim() || undefined,
          preferredContactMethod: 'WHATSAPP',
        });
        customerId = createdCustomer.id;
      } catch {
        return;
      }
    }
    if (pickupDelivery && !searchType) {
      toast.error('Escolha como deseja informar o local de busca');
      return;
    }
    if (pickupDelivery && searchType === 'CURRENT_LOCATION' && !location) {
      toast.error('Capture a localização atual antes de criar o agendamento');
      return;
    }
    if (pickupDelivery && searchType === 'MANUAL_ADDRESS') {
      if (
        !manualAddress.streetAddress ||
        !manualAddress.number ||
        !manualAddress.neighborhood ||
        !manualAddress.city ||
        !manualAddress.state
      ) {
        toast.error('Preencha rua, número, bairro, cidade e estado');
        return;
      }
    }
    const scheduledStartAt = `${formattedDate}T${selectedSlot.startTime}:00-03:00`;
    const appointmentPayload: any = {
      serviceModeId,
      vehicleType,
      scheduledStartAt,
      willSearchVehicle: pickupDelivery,
    };
    if (pickupDelivery) {
      appointmentPayload.searchType = searchType;
      if (searchType === 'CURRENT_LOCATION' && location) {
        appointmentPayload.latitude = location.latitude;
        appointmentPayload.longitude = location.longitude;
      }
      if (searchType === 'MANUAL_ADDRESS') {
        appointmentPayload.streetAddress = manualAddress.streetAddress;
        appointmentPayload.number = manualAddress.number;
        appointmentPayload.neighborhood = manualAddress.neighborhood;
        appointmentPayload.city = manualAddress.city;
        appointmentPayload.state = manualAddress.state;
        appointmentPayload.zipCode = manualAddress.zipCode;
        appointmentPayload.pickupReference = manualAddress.pickupReference;
      }
    }
    createAdminAppointmentMutation.mutate({ customerId, appointment: appointmentPayload });
  };

  const getMapsLink = (apt: any) => {
    const hasCoords =
      apt.snapshotLatitude !== null &&
      apt.snapshotLatitude !== undefined &&
      apt.snapshotLongitude !== null &&
      apt.snapshotLongitude !== undefined;
    if (!hasCoords) return null;
    return `https://www.google.com/maps?q=${apt.snapshotLatitude},${apt.snapshotLongitude}`;
  };

  const getLocationLabel = (apt: any) => {
    if (
      apt.snapshotLatitude !== null &&
      apt.snapshotLatitude !== undefined &&
      apt.snapshotLongitude !== null &&
      apt.snapshotLongitude !== undefined &&
      !apt.snapshotAddressLine
    ) {
      return 'Localização atual';
    }
    if (apt.snapshotAddressLine === 'Localização atual') {
      return 'Localização atual';
    }
    return null;
  };

  const appointmentsData = appointments as any[];
  const clientsData = clients as any[];
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Agenda do dia
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {format(date, 'EEEE', { locale: ptBR }).charAt(0).toUpperCase() +
                format(date, 'EEEE', { locale: ptBR }).slice(1)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {' • '}
              <span className="font-medium text-foreground">
                {appointmentsData.length}{' '}
                {appointmentsData.length === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              className="gap-2 rounded-xl shadow-sm"
              onClick={() => {
                setShowCreatePanel((prev) => !prev);
                if (showCreatePanel) resetCreateForm();
              }}
            >
              {showCreatePanel ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreatePanel ? 'Fechar' : 'Novo Agendamento'}
            </Button>
          </div>
        </div>

        {showCreatePanel && (
          <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Novo Agendamento</h2>
              <p className="text-sm text-muted-foreground">
                Crie um agendamento manualmente pelo painel administrativo.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={clientMode === 'existing' ? 'default' : 'outline'}
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      setClientMode('existing');
                      setSelectedCustomerId('');
                    }}
                  >
                    <Users className="h-4 w-4" />
                    Cliente existente
                  </Button>

                  <Button
                    type="button"
                    variant={clientMode === 'quick' ? 'default' : 'outline'}
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      setClientMode('quick');
                      setSelectedCustomerId('');
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Cliente novo
                  </Button>
                </div>

                {clientMode === 'existing' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Selecione o cliente
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">
                        {loadingClients ? 'Carregando clientes...' : 'Selecione'}
                      </option>
                      {clientsData.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.phone ? `• ${client.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nome</label>
                      <input
                        type="text"
                        value={quickCustomer.name}
                        onChange={(e) =>
                          setQuickCustomer((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Telefone</label>
                      <input
                        type="text"
                        value={quickCustomer.phone}
                        onChange={(e) =>
                          setQuickCustomer((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Telefone"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Email (opcional)
                      </label>
                      <input
                        type="email"
                        value={quickCustomer.email}
                        onChange={(e) =>
                          setQuickCustomer((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Veículo</label>

                  {loadingVehicleTypes ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : vehicleTypes.length === 0 ? (
                    <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      Nenhum tipo de veículo cadastrado.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {vehicleTypes.map((vt: VehicleTypeInfo) => (
                        <button
                          key={vt.id}
                          type="button"
                          onClick={() => {
                            setVehicleType(vt.kind);
                            setServiceModeId('');
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'rounded-xl border p-3 text-sm font-medium transition-all',
                            vehicleType === vt.kind
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:border-primary/30',
                          )}
                        >
                          {vt.displayName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Modalidade</label>
                  <select
                    value={serviceModeId}
                    onChange={(e) => {
                      setServiceModeId(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={!vehicleType || loadingModes}
                  >
                    <option value="">
                      {!vehicleType
                        ? 'Escolha o veículo primeiro'
                        : loadingModes
                          ? 'Carregando modalidades...'
                          : 'Selecione a modalidade'}
                    </option>
                    {filteredModes.map((mode) => {
                      const rule = mode.rules.find((r) => r.vehicleType.kind === vehicleType);
                      return (
                        <option key={mode.id} value={mode.id}>
                          {mode.name}
                          {rule
                            ? ` • ${rule.durationMinutes} min • R$ ${(rule.basePriceInCents / 100).toFixed(2)}`
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Busca e entrega</p>
                        <p className="text-xs text-muted-foreground">
                          Ative se precisar buscar o veículo
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={pickupDelivery}
                      onCheckedChange={(value) => {
                        setPickupDelivery(value);
                        if (!value) {
                          setSearchType(null);
                          setLocation(null);
                          setManualAddress({
                            streetAddress: '',
                            number: '',
                            neighborhood: '',
                            city: '',
                            state: '',
                            zipCode: '',
                            pickupReference: '',
                          });
                        }
                      }}
                    />
                  </div>

                  {pickupDelivery && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchType('CURRENT_LOCATION');
                            setManualAddress((prev) => ({
                              ...prev,
                              streetAddress: '',
                              number: '',
                              neighborhood: '',
                              city: '',
                              state: '',
                              zipCode: '',
                            }));
                          }}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                            searchType === 'CURRENT_LOCATION'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:border-primary/30',
                          )}
                        >
                          <MapPin className="h-4 w-4" />
                          Localização atual
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSearchType('MANUAL_ADDRESS');
                            setLocation(null);
                          }}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                            searchType === 'MANUAL_ADDRESS'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:border-primary/30',
                          )}
                        >
                          <MapPinned className="h-4 w-4" />
                          Digitar endereço
                        </button>
                      </div>

                      {searchType === 'CURRENT_LOCATION' && (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={handleGetCurrentLocation}
                          >
                            Usar localização atual
                          </Button>

                          {location && (
                            <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                              <p>Localização capturada com sucesso.</p>
                              <p className="text-xs">
                                Lat: {location.latitude.toFixed(6)} • Lng:{' '}
                                {location.longitude.toFixed(6)}
                              </p>
                              <a
                                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <MapPinned className="h-3.5 w-3.5" />
                                Conferir no Maps
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {searchType === 'MANUAL_ADDRESS' && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Rua"
                            value={manualAddress.streetAddress}
                            onChange={(e) =>
                              setManualAddress((prev) => ({
                                ...prev,
                                streetAddress: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Número"
                            value={manualAddress.number}
                            onChange={(e) =>
                              setManualAddress((prev) => ({ ...prev, number: e.target.value }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Bairro"
                            value={manualAddress.neighborhood}
                            onChange={(e) =>
                              setManualAddress((prev) => ({
                                ...prev,
                                neighborhood: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Cidade"
                            value={manualAddress.city}
                            onChange={(e) =>
                              setManualAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Estado"
                            value={manualAddress.state}
                            onChange={(e) =>
                              setManualAddress((prev) => ({ ...prev, state: e.target.value }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="CEP"
                            value={manualAddress.zipCode}
                            onChange={(e) =>
                              setManualAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Ponto de referência (opcional)"
                            value={manualAddress.pickupReference}
                            onChange={(e) =>
                              setManualAddress((prev) => ({
                                ...prev,
                                pickupReference: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />

                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                            <p className="font-medium">Taxa de busca a confirmar</p>
                            <p className="mt-1 text-amber-800/80">
                              Para endereço manual, a taxa pode variar conforme a distância.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setSelectedSlot(null);
                      }
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Horários disponíveis
                  </label>

                  {!serviceModeId || !vehicleType ? (
                    <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      Escolha veículo e modalidade para ver os horários.
                    </div>
                  ) : loadingSlots ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (slots as TimeSlot[]).length === 0 ? (
                    <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      Nenhum horário disponível nesta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(slots as TimeSlot[]).map((slot) => (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'rounded-xl border-2 py-3 text-sm font-medium transition-all',
                            selectedSlot?.startTime === slot.startTime
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-foreground hover:border-primary/30',
                          )}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Resumo</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Data:</span>{' '}
                      {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Horário:</span>{' '}
                      {selectedSlot?.displayLabel || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Serviço:</span>{' '}
                      {selectedMode?.name || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Valor:</span>{' '}
                      {selectedRule
                        ? `R$ ${(selectedRule.basePriceInCents / 100).toFixed(2)}`
                        : '-'}
                    </p>

                    {pickupDelivery && searchType === 'MANUAL_ADDRESS' && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                        <p className="font-medium">Taxa de busca: A confirmar pela lavação</p>
                        <p className="mt-1 text-amber-800/80">
                          Para endereço manual, a taxa pode variar conforme a distância.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowCreatePanel(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                className="rounded-xl"
                onClick={handleCreateAppointment}
                disabled={
                  createQuickCustomerMutation.isPending ||
                  createAdminAppointmentMutation.isPending
                }
              >
                {createQuickCustomerMutation.isPending ||
                createAdminAppointmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Criar Agendamento'
                )}
              </Button>
            </div>
          </div>
        )}
        {/* Lista de agendamentos */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : appointmentsData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
              <CalendarDays className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Nenhum agendamento para esta data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Clique em “Novo Agendamento” para criar o primeiro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointmentsData.map((apt) => {
              const status = STATUS_MAP[apt.status] || STATUS_MAP.CONFIRMED;

              const start = apt.scheduledStartAt ? new Date(apt.scheduledStartAt) : null;
              const end = apt.scheduledEndAt ? new Date(apt.scheduledEndAt) : null;

              const customerName =
                apt.customer?.name || apt.client?.name || 'Cliente';

              const serviceName =
                apt.snapshotServiceModeName ||
                apt.serviceRule?.serviceMode?.name ||
                apt.serviceMode?.name ||
                'Serviço';

              const vehicleLabel =
                vehicleTypes.find(
                  (v: VehicleTypeInfo) => v.kind === apt.vehicleType,
                )?.displayName ||
                apt.vehicleType ||
                '-';

              const totalPrice =
                typeof apt.snapshotTotalPriceInCents === 'number'
                  ? apt.snapshotTotalPriceInCents / 100
                  : typeof apt.totalPrice === 'number'
                    ? apt.totalPrice
                    : 0;

              const mapsLink = getMapsLink(apt);
              const locationLabel = getLocationLabel(apt);

              const isManualPickupAddress =
                apt.searchType === 'MANUAL_ADDRESS' ||
                apt.snapshotSearchType === 'MANUAL_ADDRESS' ||
                (!!apt.snapshotAddressLine &&
                  apt.snapshotAddressLine !== 'Localização atual' &&
                  !apt.snapshotLatitude &&
                  !apt.snapshotLongitude);

              const initials = customerName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={apt.id}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-border hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
                    {/* Bloco de horário */}
                    <div className="flex flex-row items-center gap-3 sm:flex-col sm:justify-center sm:gap-1 sm:rounded-xl sm:bg-primary/5 sm:px-4 sm:py-3 sm:ring-1 sm:ring-primary/10">
                      <Clock className="h-4 w-4 text-primary sm:hidden" />
                      <div className="flex items-baseline gap-1 sm:flex-col sm:items-center sm:gap-0">
                        <span className="text-xl font-bold leading-none text-primary sm:text-2xl">
                          {start ? format(start, 'HH:mm') : '--:--'}
                        </span>
                        {start && end && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            até {format(end, 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/10">
                          {initials || <User className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold leading-tight text-foreground">
                              {customerName}
                            </p>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                                status.className,
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Car className="h-3.5 w-3.5" />
                              {vehicleLabel}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="font-medium text-foreground/80">{serviceName}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                              R$ {totalPrice.toFixed(2)}
                            </span>
                          </div>

                          {apt.willSearchVehicle && (
                            <div className="mt-3 space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                              <p className="inline-flex items-center gap-1.5 font-semibold text-primary">
                                <Truck className="h-3.5 w-3.5" />
                                Busca e entrega
                              </p>

                              {locationLabel && (
                                <p className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {locationLabel}
                                </p>
                              )}

                              {apt.snapshotAddressLine &&
                                apt.snapshotAddressLine !== 'Localização atual' && (
                                  <p className="flex items-start gap-1.5 text-muted-foreground">
                                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                    <span>
                                      {apt.snapshotAddressLine}
                                      {apt.snapshotAddressNumber
                                        ? `, ${apt.snapshotAddressNumber}`
                                        : ''}
                                      {apt.snapshotNeighborhood
                                        ? ` - ${apt.snapshotNeighborhood}`
                                        : ''}
                                      {apt.snapshotCity ? ` - ${apt.snapshotCity}` : ''}
                                      {apt.snapshotState ? `/${apt.snapshotState}` : ''}
                                      {apt.snapshotZipCode
                                        ? ` • CEP ${apt.snapshotZipCode}`
                                        : ''}
                                    </span>
                                  </p>
                                )}

                              {apt.snapshotPickupReference && (
                                <p className="text-muted-foreground">
                                  📝 Ref: {apt.snapshotPickupReference}
                                </p>
                              )}

                              {isManualPickupAddress && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                                  <p className="font-medium">
                                    Taxa de busca: A confirmar pela lavação
                                  </p>
                                  <p className="mt-0.5 text-amber-800/80">
                                    Para endereço manual, a taxa pode variar conforme a
                                    distância.
                                  </p>
                                </div>
                              )}

                              {mapsLink && (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                >
                                  <MapPinned className="h-3.5 w-3.5" />
                                  Abrir no Maps
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    {(apt.status === 'CONFIRMED' || apt.status === 'IN_PROGRESS') && (
                      <div className="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3 sm:min-w-[150px] sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                        {apt.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => startMutation.mutate(apt.id)}
                              disabled={startMutation.isPending}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              Iniciar
                            </button>

                            <button
                              onClick={() => openRescheduleModal(apt)}
                              disabled={rescheduleMutation.isPending}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98] disabled:opacity-50"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              Reagendar
                            </button>

                            <button
                              onClick={() => cancelMutation.mutate(apt.id)}
                              disabled={cancelMutation.isPending}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          </>
                        )}

                        {apt.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => completeMutation.mutate(apt.id)}
                            disabled={completeMutation.isPending}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Concluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de reagendar */}
      {showRescheduleModal && rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Reagendar Agendamento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha uma nova data e horário disponível.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={closeRescheduleModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-background p-3">
                <Calendar
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={(d) => {
                    if (d) {
                      setRescheduleDate(d);
                      setRescheduleSlot(null);
                    }
                  }}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </div>

              <div className="min-w-0 space-y-3">
                <p className="text-sm font-medium text-foreground">Horários disponíveis</p>

                {loadingRescheduleSlots ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (rescheduleSlots as TimeSlot[]).length === 0 ? (
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    Nenhum horário disponível nesta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {(rescheduleSlots as TimeSlot[]).map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setRescheduleSlot(slot)}
                        className={cn(
                          'rounded-xl border-2 py-3 text-sm font-medium transition-all',
                          rescheduleSlot?.startTime === slot.startTime
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-primary/30',
                        )}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Resumo</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Cliente:</span>{' '}
                      {rescheduleAppointment.customer?.name ||
                        rescheduleAppointment.client?.name ||
                        'Cliente'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Serviço:</span>{' '}
                      {rescheduleAppointment.snapshotServiceModeName ||
                      rescheduleAppointment.serviceRule?.serviceMode?.name ||
                      rescheduleAppointment.serviceMode?.name ||
                      'Serviço'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Nova data:</span>{' '}
                      {format(rescheduleDate, 'dd/MM/yyyy')}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Novo horário:</span>{' '}
                      {rescheduleSlot?.displayLabel || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={closeRescheduleModal}
              >
                Cancelar
              </Button>

              <Button
                className="rounded-xl"
                onClick={handleConfirmReschedule}
                disabled={rescheduleMutation.isPending}
              >
                {rescheduleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirmar Reagendamento'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}