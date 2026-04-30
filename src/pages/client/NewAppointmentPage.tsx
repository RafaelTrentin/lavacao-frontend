import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Loader2,
  MapPin,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

import ClientLayout from '@/components/layouts/ClientLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  appointmentsApi,
  availabilityApi,
  serviceModesApi,
  vehicleTypesApi,
} from '@/lib/api';
import type {
  CreateAppointmentDTO,
  ServiceMode,
  ServiceModeRule,
  TimeSlot,
  VehicleType,
  VehicleTypeInfo,
} from '@/types';

const STEPS = ['Veículo', 'Serviço', 'Data', 'Horário', 'Resumo'];
const STEP_ICONS = [Car, Wrench, CalendarIcon, Clock, CheckCircle2];
const STEP_DESCRIPTIONS = [
  'Selecione o tipo do seu veículo',
  'Escolha a modalidade de serviço',
  'Escolha o melhor dia para o atendimento',
  'Selecione um horário disponível',
  'Revise e confirme seu agendamento',
];

type SearchTypeOption = 'CURRENT_LOCATION' | 'MANUAL_ADDRESS' | null;

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug } = useParams();
  const basePath = slug ? `/empresa/${slug}` : '';

  const [step, setStep] = useState(0);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [serviceMode, setServiceMode] = useState<ServiceMode | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [pickupDelivery, setPickupDelivery] = useState(false);
  const [searchType, setSearchType] = useState<SearchTypeOption>(null);

  const [manualAddress, setManualAddress] = useState({
    streetAddress: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    pickupReference: '',
    latitude: null as number | null,
    longitude: null as number | null,
    validatedLabel: '',
  });

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const { data: serviceModes = [], isLoading: loadingModes } = useQuery({
    queryKey: ['service-modes'],
    queryFn: serviceModesApi.list,
  });

  const { data: vehicleTypes = [], isLoading: loadingVehicleTypes } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: vehicleTypesApi.list,
  });

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const slotsQueryKey = ['slots', serviceMode?.id, vehicleType, formattedDate];

  const {
    data: slots = [],
    isLoading: loadingSlots,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: slotsQueryKey,
    queryFn: () =>
      availabilityApi.getSlots(serviceMode!.id, vehicleType!, formattedDate),
    enabled: !!serviceMode && !!vehicleType && !!selectedDate,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!selectedSlot) return;
    const stillExists = slots.some(
      (slot) => slot.startTime === selectedSlot.startTime,
    );
    if (!stillExists) {
      setSelectedSlot(null);
    }
  }, [slots, selectedSlot]);

  useEffect(() => {
    if (step === 3 && serviceMode && vehicleType && selectedDate) {
      refetchSlots();
    }
  }, [step, serviceMode, vehicleType, selectedDate, refetchSlots]);

  const createMutation = useMutation({
    mutationFn: appointmentsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      await queryClient.invalidateQueries({ queryKey: slotsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
      setSelectedSlot(null);
      toast.success('Agendamento confirmado!');
      navigate(`${basePath}/my-appointments`);
    },
    onError: async (error: any) => {
      await queryClient.invalidateQueries({ queryKey: slotsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
      setSelectedSlot(null);
      const message =
        error?.response?.data?.message || 'Erro ao criar agendamento';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const filteredModes = useMemo(() => {
    if (!vehicleType) return [];
    return serviceModes.filter((mode) =>
      mode.rules.some((rule) => rule.vehicleType.kind === vehicleType),
    );
  }, [serviceModes, vehicleType]);

  const getRuleForVehicle = (
    mode: ServiceMode | null,
    currentVehicleType: VehicleType | null,
  ): ServiceModeRule | undefined => {
    if (!mode || !currentVehicleType) return undefined;
    return mode.rules.find(
      (rule) => rule.vehicleType.kind === currentVehicleType,
    );
  };

  const selectedRule = getRuleForVehicle(serviceMode, vehicleType);

  const shouldEstimateSearchFee =
    !!serviceMode &&
    !!vehicleType &&
    pickupDelivery &&
    searchType === 'CURRENT_LOCATION' &&
    !!location;

  const { data: searchEstimate, isLoading: loadingSearchEstimate } = useQuery({
    queryKey: [
      'estimate-search-fee',
      serviceMode?.id,
      vehicleType,
      pickupDelivery,
      searchType,
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      appointmentsApi.estimateSearchFee({
        serviceModeId: serviceMode!.id,
        vehicleType: vehicleType!,
        willSearchVehicle: pickupDelivery,
        searchType: searchType || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    enabled: shouldEstimateSearchFee,
  });

  const canAdvance = () => {
    switch (step) {
      case 0: return !!vehicleType;
      case 1: return !!serviceMode;
      case 2: return !!selectedDate;
      case 3: return !!selectedSlot;
      case 4: return true;
      default: return false;
    }
  };

  const next = () => {
    if (canAdvance() && step < 4) setStep((prev) => prev + 1);
  };

  const prev = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const totalPrice = () => {
    const base = selectedRule ? selectedRule.basePriceInCents / 100 : 0;
    if (pickupDelivery && searchType === 'CURRENT_LOCATION') {
      const searchFee = (searchEstimate?.searchFeeInCents || 0) / 100;
      return base + searchFee;
    }
    return base;
  };

  const resetPickupState = () => {
    setSearchType(null);
    setLocation(null);
    setManualAddress({
      streetAddress: '', number: '', neighborhood: '', city: '',
      state: '', zipCode: '', pickupReference: '',
      latitude: null, longitude: null, validatedLabel: '',
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast.success('Localização capturada com sucesso');
      },
      () => toast.error('Não foi possível capturar sua localização'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleConfirm = () => {
    if (!serviceMode || !vehicleType || !selectedDate || !selectedSlot) return;

    if (pickupDelivery && !searchType) {
      toast.error('Escolha como deseja informar o local de busca');
      return;
    }
    if (pickupDelivery && searchType === 'CURRENT_LOCATION' && !location) {
      toast.error('Capture sua localização atual antes de confirmar');
      return;
    }
    if (pickupDelivery && searchType === 'MANUAL_ADDRESS') {
      if (
        !manualAddress.streetAddress || !manualAddress.number ||
        !manualAddress.neighborhood || !manualAddress.city || !manualAddress.state
      ) {
        toast.error('Preencha rua, número, bairro, cidade e estado');
        return;
      }
    }

    const scheduledStartAt = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedSlot.startTime}:00-03:00`;

    const data: CreateAppointmentDTO & Record<string, any> = {
      serviceModeId: serviceMode.id,
      vehicleType,
      scheduledStartAt,
      willSearchVehicle: pickupDelivery,
    };

    if (pickupDelivery) {
      data.searchType = searchType;
      if (searchType === 'CURRENT_LOCATION' && location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }
      if (searchType === 'MANUAL_ADDRESS') {
        data.streetAddress = manualAddress.streetAddress;
        data.number = manualAddress.number;
        data.neighborhood = manualAddress.neighborhood;
        data.city = manualAddress.city;
        data.state = manualAddress.state;
        data.zipCode = manualAddress.zipCode;
        data.pickupReference = manualAddress.pickupReference;
      }
    }

    createMutation.mutate(data);
  };

  const currentVehicleInfo = vehicleTypes.find(
    (v: VehicleTypeInfo) => v.kind === vehicleType,
  );
  const StepIcon = STEP_ICONS[step];

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* Hero / identidade */}
          <div className="space-y-2 text-center sm:text-left">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="mr-1 h-3 w-3" />
              Novo agendamento
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Agende seu serviço em poucos passos
            </h1>
            <p className="text-sm text-muted-foreground">
              Rápido, fácil e sem complicação. Escolha veículo, serviço e horário.
            </p>
          </div>

          {/* Stepper visual premium */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-1.5">
              {STEPS.map((label, i) => {
                const Icon = STEP_ICONS[i];
                const isDone = i < step;
                const isActive = i === step;
                return (
                  <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                        isDone && 'border-primary bg-primary text-primary-foreground',
                        isActive && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                        !isDone && !isActive && 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={cn(
                        'hidden text-[10px] font-medium uppercase tracking-wide sm:block',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-1">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i <= step ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Cabeçalho do passo atual */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <StepIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Passo {step + 1} de {STEPS.length}
                </p>
                <h2 className="text-lg font-bold leading-tight text-foreground sm:text-xl">
                  {STEPS[step]}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {STEP_DESCRIPTIONS[step]}
                </p>
              </div>
            </div>

            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 0 — Veículo */}
              {step === 0 && (
                <div>
                  {loadingVehicleTypes ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando veículos...</p>
                    </div>
                  ) : vehicleTypes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                      <Car className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum tipo de veículo cadastrado.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {vehicleTypes.map((vt: VehicleTypeInfo) => {
                        const isSelected = vehicleType === vt.kind;
                        return (
                          <button
                            key={vt.id}
                            type="button"
                            onClick={() => {
                              setVehicleType(vt.kind);
                              setServiceMode(null);
                              setSelectedSlot(null);
                            }}
                            className={cn(
                              'group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/40',
                            )}
                          >
                            {isSelected && (
                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            <div
                              className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                              )}
                            >
                              <Car className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {vt.displayName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1 — Serviço/Modalidade */}
              {step === 1 && (
                <div className="space-y-3">
                  {loadingModes ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Carregando modalidades...</p>
                    </div>
                  ) : filteredModes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                      <Wrench className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma modalidade disponível para esse veículo.
                      </p>
                    </div>
                  ) : (
                    filteredModes.map((mode) => {
                      const rule = getRuleForVehicle(mode, vehicleType);
                      if (!rule) return null;
                      const isSelected = serviceMode?.id === mode.id;

                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            setServiceMode(mode);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'group w-full rounded-2xl border-2 bg-card p-4 text-left transition-all hover:shadow-md sm:p-5',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                                )}
                              >
                                <Wrench className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">
                                  {mode.name}
                                </p>
                                {mode.description && (
                                  <p className="mt-0.5 text-sm text-muted-foreground">
                                    {mode.description}
                                  </p>
                                )}
                                <Badge variant="secondary" className="mt-2 gap-1 rounded-full text-[11px] font-medium">
                                  <Clock className="h-3 w-3" />
                                  {rule.durationMinutes} min
                                </Badge>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                A partir de
                              </p>
                              <p className="text-lg font-bold text-primary">
                                R$ {(rule.basePriceInCents / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* STEP 2 — Data */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-4">
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        locale={ptBR}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        className="pointer-events-auto"
                      />
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="text-foreground">
                        Data selecionada:{' '}
                        <span className="font-semibold">
                          {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3 — Horário */}
              {step === 3 && (
                <div>
                  {loadingSlots ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Buscando horários disponíveis...</p>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                      <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="font-medium text-foreground">
                        Nenhum horário disponível
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tente selecionar outra data para ver os horários livres.
                      </p>
                      <Button variant="outline" className="mt-4" onClick={prev}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Escolher outra data
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slots.length} horários disponíveis</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot?.startTime === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={cn(
                                'relative rounded-xl border-2 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
                                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm',
                              )}
                            >
                              {isSelected && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                              {slot.startTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4 — Resumo */}
              {step === 4 && (
                <div className="space-y-4">
                  {/* Busca e entrega */}
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Busca e entrega
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Solicite a busca do seu veículo
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={pickupDelivery}
                        onCheckedChange={(value) => {
                          setPickupDelivery(value);
                          if (!value) resetPickupState();
                        }}
                      />
                    </div>

                    {pickupDelivery && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Como deseja informar o local?
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchType('CURRENT_LOCATION');
                                setManualAddress((prev) => ({
                                  ...prev,
                                  streetAddress: '', number: '', neighborhood: '',
                                  city: '', state: '', zipCode: '',
                                  validatedLabel: '', latitude: null, longitude: null,
                                }));
                              }}
                              className={cn(
                                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-semibold transition-all',
                                searchType === 'CURRENT_LOCATION'
                                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                  : 'border-border bg-background hover:border-primary/40',
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
                                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-semibold transition-all',
                                searchType === 'MANUAL_ADDRESS'
                                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                  : 'border-border bg-background hover:border-primary/40',
                              )}
                            >
                              <Home className="h-4 w-4" />
                              Digitar endereço
                            </button>
                          </div>

                          {searchType === 'CURRENT_LOCATION' && (
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleGetCurrentLocation}
                              >
                                <MapPin className="mr-2 h-4 w-4" />
                                Usar minha localização atual
                              </Button>
                              {location && (
                                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                  Localização capturada com sucesso
                                </div>
                              )}
                            </div>
                          )}

                          {searchType === 'MANUAL_ADDRESS' && (
                            <div className="space-y-2">
                              <Input
                                placeholder="Rua"
                                value={manualAddress.streetAddress}
                                onChange={(e) =>
                                  setManualAddress((prev) => ({
                                    ...prev, streetAddress: e.target.value,
                                    validatedLabel: '', latitude: null, longitude: null,
                                  }))
                                }
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Número"
                                  value={manualAddress.number}
                                  onChange={(e) =>
                                    setManualAddress((prev) => ({
                                      ...prev, number: e.target.value,
                                      validatedLabel: '', latitude: null, longitude: null,
                                    }))
                                  }
                                />
                                <Input
                                  placeholder="CEP"
                                  value={manualAddress.zipCode}
                                  onChange={(e) =>
                                    setManualAddress((prev) => ({
                                      ...prev, zipCode: e.target.value,
                                      validatedLabel: '', latitude: null, longitude: null,
                                    }))
                                  }
                                />
                              </div>
                              <Input
                                placeholder="Bairro"
                                value={manualAddress.neighborhood}
                                onChange={(e) =>
                                  setManualAddress((prev) => ({
                                    ...prev, neighborhood: e.target.value,
                                    validatedLabel: '', latitude: null, longitude: null,
                                  }))
                                }
                              />
                              <div className="grid grid-cols-[1fr_100px] gap-2">
                                <Input
                                  placeholder="Cidade"
                                  value={manualAddress.city}
                                  onChange={(e) =>
                                    setManualAddress((prev) => ({
                                      ...prev, city: e.target.value,
                                      validatedLabel: '', latitude: null, longitude: null,
                                    }))
                                  }
                                />
                                <Input
                                  placeholder="Estado"
                                  value={manualAddress.state}
                                  onChange={(e) =>
                                    setManualAddress((prev) => ({
                                      ...prev, state: e.target.value,
                                      validatedLabel: '', latitude: null, longitude: null,
                                    }))
                                  }
                                />
                              </div>
                              <Input
                                placeholder="Ponto de referência (opcional)"
                                value={manualAddress.pickupReference}
                                onChange={(e) =>
                                  setManualAddress((prev) => ({
                                    ...prev, pickupReference: e.target.value,
                                  }))
                                }
                              />

                              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed">
                                <p className="font-semibold text-foreground">
                                  Taxa de busca a confirmar
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  Para endereço manual, a taxa pode variar conforme a distância.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Serviços extras */}
                  <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Também oferecemos serviços especiais
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Polimento, higienização, cristalização e outros serviços podem ser consultados separadamente.
                        </p>
                        <Link
                          to={`${basePath}/extras`}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          Ver serviços extras
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do agendamento */}
                  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border bg-muted/40 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">
                          Resumo do agendamento
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      <SummaryRow
                        label="Veículo"
                        value={currentVehicleInfo?.displayName || ''}
                      />
                      <SummaryRow label="Serviço" value={serviceMode?.name || ''} />
                      <SummaryRow
                        label="Data"
                        value={
                          selectedDate
                            ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
                            : ''
                        }
                      />
                      <SummaryRow
                        label="Horário"
                        value={selectedSlot?.displayLabel || ''}
                      />
                      <SummaryRow
                        label="Busca/Entrega"
                        value={pickupDelivery ? 'Sim' : 'Não'}
                      />

                      {pickupDelivery && searchType === 'CURRENT_LOCATION' && (
                        <SummaryRow label="Local de busca" value="Localização atual" />
                      )}

                      {pickupDelivery && searchType === 'MANUAL_ADDRESS' && (
                        <SummaryRow
                          label="Local de busca"
                          value={`${manualAddress.streetAddress}, ${manualAddress.number} - ${manualAddress.neighborhood} - ${manualAddress.city}/${manualAddress.state}`}
                        />
                      )}

                      {pickupDelivery && searchType === 'CURRENT_LOCATION' && (
                        <>
                          <SummaryRow
                            label="Distância estimada"
                            value={
                              loadingSearchEstimate
                                ? 'Calculando...'
                                : `${Number(searchEstimate?.distanceKm || 0).toFixed(2)} km`
                            }
                          />
                          <SummaryRow
                            label="Taxa de busca"
                            value={
                              loadingSearchEstimate
                                ? 'Calculando...'
                                : `R$ ${((searchEstimate?.searchFeeInCents || 0) / 100).toFixed(2)}`
                            }
                          />
                        </>
                      )}

                      {pickupDelivery && searchType === 'MANUAL_ADDRESS' && (
                        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                          <p className="text-sm font-semibold text-foreground">
                            Taxa de busca: A confirmar pela lavação
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Para endereço manual, a taxa pode variar conforme a distância.
                          </p>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Total
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {totalPrice().toFixed(2)}
                          </p>
                        </div>
                        <Badge className="rounded-full bg-success/15 text-success hover:bg-success/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pronto para confirmar
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* CTA fixo na parte inferior em mobile */}
          <div className="sticky bottom-4 z-10 pt-2">
            {step < 4 ? (
              <Button
                onClick={next}
                disabled={!canAdvance()}
                size="lg"
                className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
              >
                Continuar
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={createMutation.isPending}
                size="lg"
                className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">
        {value || '—'}
      </span>
    </div>
  );
}