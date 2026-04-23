import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  Sparkles,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';

import ClientLayout from '@/components/layouts/ClientLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  appointmentsApi,
  availabilityApi,
  mapsApi,
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

  const geocodeManualAddressMutation = useMutation({
    mutationFn: mapsApi.geocodeAddress,
    onSuccess: (result: any) => {
      setManualAddress((prev) => ({
        ...prev,
        streetAddress:
          result.normalizedAddress.streetAddress || prev.streetAddress,
        number: result.normalizedAddress.number || prev.number,
        neighborhood:
          result.normalizedAddress.neighborhood || prev.neighborhood,
        city: result.normalizedAddress.city || prev.city,
        state: result.normalizedAddress.state || prev.state,
        zipCode: result.normalizedAddress.zipCode || prev.zipCode,
        latitude: result.latitude,
        longitude: result.longitude,
        validatedLabel: result.label || '',
      }));
      toast.success('Endereço validado com sucesso');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Não foi possível validar o endereço';
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
    !!searchType &&
    ((searchType === 'CURRENT_LOCATION' && !!location) ||
      (searchType === 'MANUAL_ADDRESS' &&
        !!manualAddress.streetAddress &&
        !!manualAddress.city &&
        !!manualAddress.state));

  const { data: searchEstimate, isLoading: loadingSearchEstimate } = useQuery({
    queryKey: [
      'estimate-search-fee',
      serviceMode?.id,
      vehicleType,
      pickupDelivery,
      searchType,
      location?.latitude,
      location?.longitude,
      manualAddress.streetAddress,
      manualAddress.number,
      manualAddress.neighborhood,
      manualAddress.city,
      manualAddress.state,
      manualAddress.zipCode,
      manualAddress.latitude,
      manualAddress.longitude,
    ],
    queryFn: () =>
      appointmentsApi.estimateSearchFee({
        serviceModeId: serviceMode!.id,
        vehicleType: vehicleType!,
        willSearchVehicle: pickupDelivery,
        searchType: searchType || undefined,
        streetAddress:
          searchType === 'MANUAL_ADDRESS'
            ? manualAddress.streetAddress
            : undefined,
        number:
          searchType === 'MANUAL_ADDRESS' ? manualAddress.number : undefined,
        neighborhood:
          searchType === 'MANUAL_ADDRESS'
            ? manualAddress.neighborhood
            : undefined,
        city: searchType === 'MANUAL_ADDRESS' ? manualAddress.city : undefined,
        state:
          searchType === 'MANUAL_ADDRESS' ? manualAddress.state : undefined,
        zipCode:
          searchType === 'MANUAL_ADDRESS' ? manualAddress.zipCode : undefined,
        latitude:
          searchType === 'CURRENT_LOCATION'
            ? location?.latitude
            : manualAddress.latitude || undefined,
        longitude:
          searchType === 'CURRENT_LOCATION'
            ? location?.longitude
            : manualAddress.longitude || undefined,
        pickupReference: manualAddress.pickupReference || undefined,
      }),
    enabled: shouldEstimateSearchFee,
  });

  const canAdvance = () => {
    switch (step) {
      case 0:
        return !!vehicleType;
      case 1:
        return !!serviceMode;
      case 2:
        return !!selectedDate;
      case 3:
        return !!selectedSlot;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const next = () => {
    if (canAdvance() && step < 4) {
      setStep((prev) => prev + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const totalPrice = () => {
    const base = selectedRule ? selectedRule.basePriceInCents / 100 : 0;
    const searchFee = (searchEstimate?.searchFeeInCents || 0) / 100;
    return base + searchFee;
  };

  const resetPickupState = () => {
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
      latitude: null,
      longitude: null,
      validatedLabel: '',
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
      () => {
        toast.error('Não foi possível capturar sua localização');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const handleConfirm = () => {
    if (!serviceMode || !vehicleType || !selectedDate || !selectedSlot) return;

    const scheduledStartAt = `${format(
      selectedDate,
      'yyyy-MM-dd',
    )}T${selectedSlot.startTime}:00-03:00`;

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

        if (manualAddress.latitude) data.latitude = manualAddress.latitude;
        if (manualAddress.longitude) data.longitude = manualAddress.longitude;
      }
    }

    createMutation.mutate(data);
  };

  return (
    <ClientLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= step ? 'gradient-primary' : 'bg-muted',
                )}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </p>
            <h2 className="text-xl font-bold text-foreground">{STEPS[step]}</h2>
          </div>

          {step > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              className="text-muted-foreground"
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
            {step === 0 && (
              <div>
                {loadingVehicleTypes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : vehicleTypes.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
                    Nenhum tipo de veículo cadastrado.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {vehicleTypes.map((vt: VehicleTypeInfo) => (
                      <button
                        key={vt.id}
                        type="button"
                        onClick={() => {
                          setVehicleType(vt.kind);
                          setServiceMode(null);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition-all',
                          vehicleType === vt.kind
                            ? 'border-primary bg-primary/5 shadow-elevated'
                            : 'border-border bg-card hover:border-primary/30',
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {vt.displayName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {loadingModes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredModes.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
                    Nenhuma modalidade disponível para esse veículo.
                  </div>
                ) : (
                  filteredModes.map((mode) => {
                    const rule = getRuleForVehicle(mode, vehicleType);
                    if (!rule) return null;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setServiceMode(mode);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          'w-full rounded-2xl border-2 p-4 text-left transition-all',
                          serviceMode?.id === mode.id
                            ? 'border-primary bg-primary/5 shadow-elevated'
                            : 'border-border bg-card hover:border-primary/30',
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-foreground">
                              {mode.name}
                            </p>
                            {mode.description && (
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {mode.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {rule.durationMinutes} min
                            </p>
                          </div>

                          <p className="text-lg font-bold text-primary">
                            R$ {(rule.basePriceInCents / 100).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {step === 2 && (
              <div className="flex justify-center">
                <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
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
            )}

            {step === 3 && (
              <div>
                {loadingSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Nenhum horário disponível nesta data.
                    </p>
                    <Button variant="outline" className="mt-3" onClick={prev}>
                      Escolher outra data
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'rounded-xl border-2 py-3 text-sm font-medium transition-all',
                          selectedSlot?.startTime === slot.startTime
                            ? 'gradient-primary border-primary text-primary-foreground shadow-elevated'
                            : 'border-border bg-card text-foreground hover:border-primary/30',
                        )}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Busca e entrega
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ative se quiser solicitar busca do veículo
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
                  <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
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
                            streetAddress: '',
                            number: '',
                            neighborhood: '',
                            city: '',
                            state: '',
                            zipCode: '',
                            validatedLabel: '',
                            latitude: null,
                            longitude: null,
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
                        <Home className="h-4 w-4" />
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
                          Usar minha localização atual
                        </Button>

                        {location && (
                          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                            Localização capturada com sucesso.
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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
                              validatedLabel: '',
                              latitude: null,
                              longitude: null,
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

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            geocodeManualAddressMutation.mutate({
                              streetAddress: manualAddress.streetAddress,
                              number: manualAddress.number,
                              neighborhood: manualAddress.neighborhood,
                              city: manualAddress.city,
                              state: manualAddress.state,
                              zipCode: manualAddress.zipCode,
                            })
                          }
                          disabled={
                            geocodeManualAddressMutation.isPending ||
                            !manualAddress.streetAddress ||
                            !manualAddress.city ||
                            !manualAddress.state
                          }
                        >
                          {geocodeManualAddressMutation.isPending
                            ? 'Validando...'
                            : 'Validar endereço'}
                        </Button>

                        {manualAddress.validatedLabel && (
                          <p className="text-xs text-muted-foreground">
                            Endereço validado: {manualAddress.validatedLabel}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Também oferecemos serviços especiais
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Polimento, higienização, cristalização e outros serviços
                        podem ser consultados separadamente.
                      </p>

                      <Link
                        to={`${basePath}/extras`}
                        className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                      >
                        Ver serviços extras
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
                  <SummaryRow
                    label="Veículo"
                    value={
                      vehicleTypes.find(
                        (v: VehicleTypeInfo) => v.kind === vehicleType,
                      )?.displayName || ''
                    }
                  />
                  <SummaryRow label="Serviço" value={serviceMode?.name || ''} />
                  <SummaryRow
                    label="Data"
                    value={
                      selectedDate
                        ? format(selectedDate, "dd 'de' MMMM, yyyy", {
                            locale: ptBR,
                          })
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
                    <SummaryRow
                      label="Local de busca"
                      value="Localização atual"
                    />
                  )}

                  {pickupDelivery && searchType === 'MANUAL_ADDRESS' && (
                    <SummaryRow
                      label="Local de busca"
                      value={`${manualAddress.streetAddress}, ${manualAddress.number} - ${manualAddress.city}/${manualAddress.state}`}
                    />
                  )}

                  {pickupDelivery && (
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
                            : `R$ ${(
                                (searchEstimate?.searchFeeInCents || 0) / 100
                              ).toFixed(2)}`
                        }
                      />
                    </>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {totalPrice().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pt-2">
          {step < 4 ? (
            <Button
              onClick={next}
              disabled={!canAdvance()}
              className="h-12 w-full rounded-xl gradient-primary font-medium text-primary-foreground"
            >
              Continuar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={createMutation.isPending}
              className="h-12 w-full rounded-xl gradient-primary font-medium text-primary-foreground"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirmar Agendamento'
              )}
            </Button>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}