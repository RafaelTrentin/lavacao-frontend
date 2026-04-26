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

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-green-100 text-green-700',
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    className: 'bg-blue-100 text-blue-700',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-muted text-muted-foreground',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-700',
  },
  NO_SHOW: {
    label: 'Não compareceu',
    className: 'bg-yellow-100 text-yellow-700',
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
      const result = await adminApi.appointments({
        date: formattedDate,
      });
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
      (serviceModes as ServiceMode[]).find(
        (mode) => mode.id === serviceModeId,
      ) || null,
    [serviceModes, serviceModeId],
  );

  const selectedRule = useMemo(() => {
    if (!selectedMode || !vehicleType) return undefined;
    return selectedMode.rules.find(
      (rule: ServiceModeRule) => rule.vehicleType.kind === vehicleType,
    );
  }, [selectedMode, vehicleType]);

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: [
      'admin-available-slots',
      serviceModeId,
      vehicleType,
      formattedDate,
    ],
    queryFn: () =>
      availabilityApi.getSlots(serviceModeId, vehicleType, formattedDate),
    enabled: !!serviceModeId && !!vehicleType && !!showCreatePanel,
  });

  const { data: rescheduleSlots = [], isLoading: loadingRescheduleSlots } =
    useQuery({
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
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const openRescheduleModal = (apt: any) => {
    setRescheduleAppointment(apt);
    setRescheduleDate(
      apt.scheduledStartAt ? new Date(apt.scheduledStartAt) : new Date(),
    );
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

    const newScheduledStartAt = `${format(
      rescheduleDate,
      'yyyy-MM-dd',
    )}T${rescheduleSlot.startTime}:00-03:00`;

    rescheduleMutation.mutate({
      id: rescheduleAppointment.id,
      newScheduledStartAt,
    });
  };

  const resetCreateForm = () => {
    setClientMode('existing');
    setSelectedCustomerId('');
    setQuickCustomer({
      name: '',
      phone: '',
      email: '',
    });
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
      const message =
        error?.response?.data?.message || 'Erro ao criar agendamento';
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
      const message =
        error?.response?.data?.message || 'Erro ao cancelar agendamento';
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
      const message =
        error?.response?.data?.message || 'Erro ao iniciar agendamento';
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
      const message =
        error?.response?.data?.message || 'Erro ao concluir agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({
      id,
      newScheduledStartAt,
    }: {
      id: string;
      newScheduledStartAt: string;
    }) => adminApi.rescheduleAppointment(id, newScheduledStartAt),
    onSuccess: async () => {
      toast.success('Agendamento reagendado');
      await invalidateDayData();
      closeRescheduleModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao reagendar agendamento';
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
        const createdCustomer: any =
          await createQuickCustomerMutation.mutateAsync({
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

    createAdminAppointmentMutation.mutate({
      customerId,
      appointment: appointmentPayload,
    });
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setShowCreatePanel((prev) => !prev);
                if (showCreatePanel) resetCreateForm();
              }}
            >
              {showCreatePanel ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {showCreatePanel ? 'Fechar' : 'Novo Agendamento'}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
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
          </div>
        </div>

        {showCreatePanel && (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Novo Agendamento
              </h2>
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
                    className="gap-2"
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
                    className="gap-2"
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
                        {loadingClients
                          ? 'Carregando clientes...'
                          : 'Selecione'}
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
                      <label className="text-sm font-medium text-foreground">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={quickCustomer.name}
                        onChange={(e) =>
                          setQuickCustomer((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={quickCustomer.phone}
                        onChange={(e) =>
                          setQuickCustomer((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
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
                          setQuickCustomer((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Veículo
                  </label>

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
                  <label className="text-sm font-medium text-foreground">
                    Modalidade
                  </label>
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
                      const rule = mode.rules.find(
                        (r) => r.vehicleType.kind === vehicleType,
                      );
                      return (
                        <option key={mode.id} value={mode.id}>
                          {mode.name}
                          {rule
                            ? ` • ${rule.durationMinutes} min • R$ ${(
                                rule.basePriceInCents / 100
                              ).toFixed(2)}`
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Busca e entrega
                        </p>
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
                            className="w-full"
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
                              setManualAddress((prev) => ({
                                ...prev,
                                number: e.target.value,
                              }))
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
                              setManualAddress((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />

                          <input
                            type="text"
                            placeholder="Estado"
                            value={manualAddress.state}
                            onChange={(e) =>
                              setManualAddress((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />

                          <input
                            type="text"
                            placeholder="CEP"
                            value={manualAddress.zipCode}
                            onChange={(e) =>
                              setManualAddress((prev) => ({
                                ...prev,
                                zipCode: e.target.value,
                              }))
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

                          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
                            <p className="font-medium text-foreground">
                              Taxa de busca a confirmar
                            </p>
                            <p className="mt-1">
                              Para endereço manual, a taxa pode variar conforme
                              a distância.
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
                  <p className="text-sm font-medium text-foreground">Resumo</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Data:</span>{' '}
                      {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Horário:
                      </span>{' '}
                      {selectedSlot?.displayLabel || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Serviço:
                      </span>{' '}
                      {selectedMode?.name || '-'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Valor:</span>{' '}
                      {selectedRule
                        ? `R$ ${(selectedRule.basePriceInCents / 100).toFixed(2)}`
                        : '-'}
                    </p>

                    {pickupDelivery && searchType === 'MANUAL_ADDRESS' && (
                      <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Taxa de busca: A confirmar pela lavação
                        </p>
                        <p className="mt-1">
                          Para endereço manual, a taxa pode variar conforme a
                          distância.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreatePanel(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : appointmentsData.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum agendamento para esta data
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointmentsData.map((apt) => {
              const status = STATUS_MAP[apt.status] || STATUS_MAP.CONFIRMED;

              const start = apt.scheduledStartAt
                ? new Date(apt.scheduledStartAt)
                : null;
              const end = apt.scheduledEndAt
                ? new Date(apt.scheduledEndAt)
                : null;

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

              return (
                <div
                  key={apt.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex min-w-[88px] flex-col items-center justify-center rounded-xl bg-primary/10 px-3 py-2">
                      <Clock className="mb-0.5 h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {start ? format(start, 'HH:mm') : '--:--'}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground">
                        {customerName}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {serviceName} • {vehicleLabel}
                      </p>

                      {start && end && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </p>
                      )}

                      {apt.willSearchVehicle && (
                        <div className="mt-1 space-y-1 text-xs">
                          <p className="font-medium text-primary">
                            🚗 Busca e entrega
                          </p>

                          {locationLabel && (
                            <p className="text-muted-foreground">
                              📍 {locationLabel}
                            </p>
                          )}

                          {apt.snapshotAddressLine &&
                            apt.snapshotAddressLine !== 'Localização atual' && (
                              <p className="text-muted-foreground">
                                📍 {apt.snapshotAddressLine}
                                {apt.snapshotAddressNumber
                                  ? `, ${apt.snapshotAddressNumber}`
                                  : ''}
                                {apt.snapshotNeighborhood
                                  ? ` - ${apt.snapshotNeighborhood}`
                                  : ''}
                                {apt.snapshotCity ? ` - ${apt.snapshotCity}` : ''}
                                {apt.snapshotState
                                  ? `/${apt.snapshotState}`
                                  : ''}
                                {apt.snapshotZipCode
                                  ? ` • CEP ${apt.snapshotZipCode}`
                                  : ''}
                              </p>
                            )}

                          {apt.snapshotPickupReference && (
                            <p className="text-muted-foreground">
                              📝 Ref: {apt.snapshotPickupReference}
                            </p>
                          )}

                          {isManualPickupAddress && (
                            <div className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">
                                Taxa de busca: A confirmar pela lavação
                              </p>
                              <p className="mt-0.5">
                                Para endereço manual, a taxa pode variar
                                conforme a distância.
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

                  <div className="space-y-2 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>

                    <p className="text-sm font-semibold text-foreground">
                      R$ {totalPrice.toFixed(2)}
                    </p>

                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {apt.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => startMutation.mutate(apt.id)}
                            disabled={startMutation.isPending}
                            className="rounded-full bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            Iniciar
                          </button>

                          <button
                            onClick={() => openRescheduleModal(apt)}
                            disabled={rescheduleMutation.isPending}
                            className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            Reagendar
                          </button>

                          <button
                            onClick={() => cancelMutation.mutate(apt.id)}
                            disabled={cancelMutation.isPending}
                            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}

                      {apt.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => completeMutation.mutate(apt.id)}
                          disabled={completeMutation.isPending}
                          className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          Concluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRescheduleModal && rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Reagendar Agendamento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha uma nova data e horário disponível.
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={closeRescheduleModal}>
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
                <p className="text-sm font-medium text-foreground">
                  Horários disponíveis
                </p>

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
                  <p className="text-sm font-medium text-foreground">Resumo</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        Cliente:
                      </span>{' '}
                      {rescheduleAppointment.customer?.name ||
                        rescheduleAppointment.client?.name ||
                        'Cliente'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Serviço:
                      </span>{' '}
                      {rescheduleAppointment.snapshotServiceModeName ||
                        rescheduleAppointment.serviceMode?.name ||
                        'Serviço'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Nova data:
                      </span>{' '}
                      {format(rescheduleDate, 'dd/MM/yyyy')}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Novo horário:
                      </span>{' '}
                      {rescheduleSlot?.displayLabel || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={closeRescheduleModal}>
                Cancelar
              </Button>

              <Button
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