import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Save,
  Building2,
  MapPin,
  Palette,
  Clock3,
  Truck,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type OperatingPeriod = {
  open: string;
  close: string;
};

type OperatingHoursValue = OperatingPeriod[] | null;
type OperatingHoursMap = Record<string, OperatingHoursValue>;

const DEFAULT_OPERATING_HOURS: OperatingHoursMap = {
  SUNDAY: null,
  MONDAY: [{ open: '08:00', close: '18:00' }],
  TUESDAY: [{ open: '08:00', close: '18:00' }],
  WEDNESDAY: [{ open: '08:00', close: '18:00' }],
  THURSDAY: [{ open: '08:00', close: '18:00' }],
  FRIDAY: [{ open: '08:00', close: '18:00' }],
  SATURDAY: [{ open: '08:00', close: '14:00' }],
};

const DAYS = [
  { key: 'SUNDAY', label: 'Domingo' },
  { key: 'MONDAY', label: 'Segunda' },
  { key: 'TUESDAY', label: 'Terça' },
  { key: 'WEDNESDAY', label: 'Quarta' },
  { key: 'THURSDAY', label: 'Quinta' },
  { key: 'FRIDAY', label: 'Sexta' },
  { key: 'SATURDAY', label: 'Sábado' },
];

function normalizeOperatingHours(value: Record<string, any> | null | undefined): OperatingHoursMap {
  const result: OperatingHoursMap = { ...DEFAULT_OPERATING_HOURS };

  for (const day of DAYS) {
    const raw = value?.[day.key];

    if (!raw) {
      result[day.key] = null;
      continue;
    }

    const periods = Array.isArray(raw)
      ? raw
      : raw?.open && raw?.close
        ? [raw]
        : [];

    const cleaned = periods
      .filter(
        (period) =>
          period &&
          typeof period.open === 'string' &&
          typeof period.close === 'string' &&
          period.open < period.close,
      )
      .map((period) => ({
        open: period.open,
        close: period.close,
      }))
      .sort((a, b) => a.open.localeCompare(b.open));

    result[day.key] = cleaned.length > 0 ? cleaned : null;
  }

  return result;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['admin-business'],
    queryFn: adminApi.getBusiness,
  });

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-business-settings'],
    queryFn: adminApi.getBusinessSettings,
  });

  const { data: branding, isLoading: loadingBranding } = useQuery({
    queryKey: ['admin-business-branding'],
    queryFn: adminApi.getBusinessBranding,
  });

  const { data: address, isLoading: loadingAddress } = useQuery({
    queryKey: ['admin-business-address'],
    queryFn: adminApi.getBusinessAddress,
  });

  const [businessName, setBusinessName] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  const [settingsForm, setSettingsForm] = useState({
    whatsappPhone: '',
    minimumAdvanceMinutes: 15,
    searchFeeUpTo5km: 0,
    searchFeeOver5km: 0,
    searchFeeLimitKm: 5,
    operatingHoursJson: DEFAULT_OPERATING_HOURS as OperatingHoursMap,
  });

  const [addressForm, setAddressForm] = useState({
    streetAddress: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
  });

  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    iconUrl: '',
    primaryColor: '#0066CC',
    secondaryColor: '#FF6B35',
    accentColor: '#00D4FF',
  });

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setTimezone(business.timezone || 'America/Sao_Paulo');
    }
  }, [business]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        whatsappPhone: settings.whatsappPhone || '',
        minimumAdvanceMinutes: settings.minimumAdvanceMinutes ?? 15,
        searchFeeUpTo5km: Number(settings.searchFeeUpTo5km || 0) / 100,
        searchFeeOver5km: Number(settings.searchFeeOver5km || 0) / 100,
        searchFeeLimitKm: Number(settings.searchFeeLimitKm || 5),
        operatingHoursJson: normalizeOperatingHours(
          settings.operatingHours || DEFAULT_OPERATING_HOURS,
        ),
      });
    }
  }, [settings]);

  useEffect(() => {
    if (address) {
      setAddressForm({
        streetAddress: address.streetAddress || '',
        number: address.number || '',
        complement: address.complement || '',
        neighborhood: address.neighborhood || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        latitude:
          address.latitude !== null && address.latitude !== undefined
            ? String(address.latitude)
            : '',
        longitude:
          address.longitude !== null && address.longitude !== undefined
            ? String(address.longitude)
            : '',
      });
    }
  }, [address]);

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        logoUrl: branding.logoUrl || '',
        iconUrl: branding.iconUrl || '',
        primaryColor: branding.primaryColor || '#0066CC',
        secondaryColor: branding.secondaryColor || '#FF6B35',
        accentColor: branding.accentColor || '#00D4FF',
      });
    }
  }, [branding]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddressForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        toast.success('Localização atual capturada com sucesso');
      },
      () => {
        toast.error('Não foi possível capturar a localização atual');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const updateSettingsMutation = useMutation({
    mutationFn: adminApi.updateBusinessSettings,
    onSuccess: async () => {
      toast.success('Configurações salvas com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-business-settings'],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao salvar configurações';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: adminApi.updateBusinessAddress,
    onSuccess: async () => {
      toast.success('Endereço salvo com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-business-address'],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao salvar endereço';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: adminApi.updateBusinessBranding,
    onSuccess: async (_, variables) => {
      toast.success('Branding salvo com sucesso');

      const updatedBranding = {
        ...branding,
        ...variables,
        name: businessName || 'WashHub',
      };

      localStorage.setItem('branding', JSON.stringify(updatedBranding));

      const faviconUrl = updatedBranding.iconUrl || updatedBranding.logoUrl;
      if (faviconUrl) {
        let link = document.querySelector(
          "link[rel='icon']",
        ) as HTMLLinkElement | null;

        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }

        link.type = 'image/png';
        link.href = faviconUrl;
      }

      await queryClient.invalidateQueries({
        queryKey: ['admin-business-branding'],
      });

      window.dispatchEvent(new Event('storage'));
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao salvar branding';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const geocodeAddressMutation = useMutation({
    mutationFn: adminApi.geocodeBusinessAddress,
    onSuccess: (result: any) => {
      setAddressForm((prev) => ({
        ...prev,
        streetAddress:
          result.normalizedAddress.streetAddress || prev.streetAddress,
        number: result.normalizedAddress.number || prev.number,
        neighborhood:
          result.normalizedAddress.neighborhood || prev.neighborhood,
        city: result.normalizedAddress.city || prev.city,
        state: result.normalizedAddress.state || prev.state,
        zipCode: result.normalizedAddress.zipCode || prev.zipCode,
        latitude: String(result.latitude),
        longitude: String(result.longitude),
      }));
      toast.success('Endereço validado no mapa com sucesso');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Não foi possível validar o endereço';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const handleToggleDay = (day: string, enabled: boolean) => {
    setSettingsForm((prev) => ({
      ...prev,
      operatingHoursJson: {
        ...prev.operatingHoursJson,
        [day]: enabled ? [{ open: '08:00', close: '18:00' }] : null,
      },
    }));
  };

  const handleChangePeriod = (
    day: string,
    index: number,
    field: 'open' | 'close',
    value: string,
  ) => {
    setSettingsForm((prev) => {
      const periods = [...(prev.operatingHoursJson[day] || [])];
      periods[index] = {
        ...(periods[index] || { open: '08:00', close: '18:00' }),
        [field]: value,
      };

      return {
        ...prev,
        operatingHoursJson: {
          ...prev.operatingHoursJson,
          [day]: periods,
        },
      };
    });
  };

  const handleAddPeriod = (day: string) => {
    setSettingsForm((prev) => {
      const periods = [...(prev.operatingHoursJson[day] || [])];
      periods.push({ open: '13:00', close: '18:00' });

      return {
        ...prev,
        operatingHoursJson: {
          ...prev.operatingHoursJson,
          [day]: periods,
        },
      };
    });
  };

  const handleRemovePeriod = (day: string, index: number) => {
    setSettingsForm((prev) => {
      const periods = [...(prev.operatingHoursJson[day] || [])];
      periods.splice(index, 1);

      return {
        ...prev,
        operatingHoursJson: {
          ...prev.operatingHoursJson,
          [day]: periods.length > 0 ? periods : null,
        },
      };
    });
  };

  const isLoading =
    loadingBusiness || loadingSettings || loadingBranding || loadingAddress;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Ajuste dados da lavação, horários, taxas e branding.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Geral</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nome da empresa
              </label>
              <input
                type="text"
                value={businessName}
                disabled
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground outline-none"
              />
              <p className="text-xs text-muted-foreground">
                O nome da empresa está disponível em modo leitura nesta versão.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                disabled
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">
                Busca e atendimento
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={settingsForm.whatsappPhone}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      whatsappPhone: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Antecedência mínima (min)
                </label>
                <input
                  type="number"
                  value={settingsForm.minimumAdvanceMinutes}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      minimumAdvanceMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Taxa até o limite (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.searchFeeUpTo5km}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      searchFeeUpTo5km: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Taxa acima do limite (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.searchFeeOver5km}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      searchFeeOver5km: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Limite de km para taxa base
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsForm.searchFeeLimitKm}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      searchFeeLimitKm: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateSettingsMutation.mutate({
                    whatsappPhone: settingsForm.whatsappPhone,
                    minimumAdvanceMinutes: settingsForm.minimumAdvanceMinutes,
                    searchFeeUpTo5km: Math.round(
                      Number(settingsForm.searchFeeUpTo5km || 0) * 100,
                    ),
                    searchFeeOver5km: Math.round(
                      Number(settingsForm.searchFeeOver5km || 0) * 100,
                    ),
                    searchFeeLimitKm: settingsForm.searchFeeLimitKm,
                    operatingHoursJson: settingsForm.operatingHoursJson,
                  })
                }
                disabled={updateSettingsMutation.isPending}
                className="gap-2"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar configurações
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              Horário de funcionamento
            </h2>
          </div>

          <div className="grid gap-3">
            {DAYS.map((day) => {
              const periods = settingsForm.operatingHoursJson?.[day.key] || [];
              const enabled = periods.length > 0;

              return (
                <div
                  key={day.key}
                  className="space-y-3 rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {day.label}
                      </span>

                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          handleToggleDay(day.key, e.target.checked)
                        }
                      />

                      <span className="text-xs text-muted-foreground">
                        {enabled ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>

                    {enabled && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleAddPeriod(day.key)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar período
                      </Button>
                    )}
                  </div>

                  {enabled && (
                    <div className="space-y-3">
                      {periods.map((period, index) => (
                        <div
                          key={`${day.key}-${index}`}
                          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <input
                            type="time"
                            value={period.open}
                            onChange={(e) =>
                              handleChangePeriod(
                                day.key,
                                index,
                                'open',
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />

                          <input
                            type="time"
                            value={period.close}
                            onChange={(e) =>
                              handleChangePeriod(
                                day.key,
                                index,
                                'close',
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemovePeriod(day.key, index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateSettingsMutation.mutate({
                  operatingHoursJson: settingsForm.operatingHoursJson,
                  whatsappPhone: settingsForm.whatsappPhone,
                  minimumAdvanceMinutes: settingsForm.minimumAdvanceMinutes,
                  searchFeeUpTo5km: Math.round(
                    Number(settingsForm.searchFeeUpTo5km || 0) * 100,
                  ),
                  searchFeeOver5km: Math.round(
                    Number(settingsForm.searchFeeOver5km || 0) * 100,
                  ),
                  searchFeeLimitKm: settingsForm.searchFeeLimitKm,
                })
              }
              disabled={updateSettingsMutation.isPending}
              className="gap-2"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar horários
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Endereço</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
              >
                Usar localização atual
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  geocodeAddressMutation.mutate({
                    streetAddress: addressForm.streetAddress,
                    number: addressForm.number,
                    neighborhood: addressForm.neighborhood,
                    city: addressForm.city,
                    state: addressForm.state,
                    zipCode: addressForm.zipCode,
                  })
                }
                disabled={
                  geocodeAddressMutation.isPending ||
                  !addressForm.streetAddress ||
                  !addressForm.city ||
                  !addressForm.state
                }
              >
                {geocodeAddressMutation.isPending
                  ? 'Validando...'
                  : 'Validar endereço no mapa'}
              </Button>

              {addressForm.latitude && addressForm.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${addressForm.latitude},${addressForm.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Conferir no mapa
                </a>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Rua
                </label>
                <input
                  type="text"
                  value={addressForm.streetAddress}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      streetAddress: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Número
                </label>
                <input
                  type="text"
                  value={addressForm.number}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      number: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Complemento
                </label>
                <input
                  type="text"
                  value={addressForm.complement}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      complement: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bairro
                </label>
                <input
                  type="text"
                  value={addressForm.neighborhood}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      neighborhood: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Cidade
                </label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Estado
                </label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  CEP
                </label>
                <input
                  type="text"
                  value={addressForm.zipCode}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      zipCode: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Latitude da empresa
                </label>
                <input
                  type="text"
                  value={addressForm.latitude}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      latitude: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Longitude da empresa
                </label>
                <input
                  type="text"
                  value={addressForm.longitude}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      longitude: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateAddressMutation.mutate({
                    streetAddress: addressForm.streetAddress,
                    number: addressForm.number,
                    complement: addressForm.complement,
                    neighborhood: addressForm.neighborhood,
                    city: addressForm.city,
                    state: addressForm.state,
                    zipCode: addressForm.zipCode,
                    latitude: addressForm.latitude
                      ? Number(addressForm.latitude)
                      : undefined,
                    longitude: addressForm.longitude
                      ? Number(addressForm.longitude)
                      : undefined,
                  })
                }
                disabled={updateAddressMutation.isPending}
                className="gap-2"
              >
                {updateAddressMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar endereço
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Branding</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Logo
                </label>

                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const res = await adminApi.uploadLogo(file);

                        setBrandingForm((prev) => ({
                          ...prev,
                          logoUrl: res.url,
                        }));

                        toast.success('Logo enviada com sucesso');
                      } catch {
                        toast.error('Erro ao enviar logo');
                      }
                    }}
                    className="text-sm"
                  />
                </div>

                {brandingForm.logoUrl && (
                  <img
                    src={brandingForm.logoUrl}
                    alt="Logo"
                    className="mt-2 h-16 rounded"
                  />
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Ícone / favicon
                </label>

                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const res = await adminApi.uploadLogo(file);

                        setBrandingForm((prev) => ({
                          ...prev,
                          iconUrl: res.url,
                        }));

                        toast.success('Ícone enviado com sucesso');
                      } catch {
                        toast.error('Erro ao enviar ícone');
                      }
                    }}
                    className="text-sm"
                  />
                </div>

                {brandingForm.iconUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={brandingForm.iconUrl}
                      alt="Ícone"
                      className="h-10 w-10 rounded object-contain"
                    />
                    <span className="text-xs text-muted-foreground">
                      Prévia do favicon
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Cor primária
                </label>
                <input
                  type="color"
                  value={brandingForm.primaryColor}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-2 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Cor secundária
                </label>
                <input
                  type="color"
                  value={brandingForm.secondaryColor}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-2 py-2"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Cor de destaque
                </label>
                <input
                  type="color"
                  value={brandingForm.accentColor}
                  onChange={(e) =>
                    setBrandingForm((prev) => ({
                      ...prev,
                      accentColor: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-background px-2 py-2"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-foreground">Prévia</p>
              <div className="mt-3 flex gap-3">
                <div
                  className="h-12 w-12 rounded-xl"
                  style={{ backgroundColor: brandingForm.primaryColor }}
                />
                <div
                  className="h-12 w-12 rounded-xl"
                  style={{ backgroundColor: brandingForm.secondaryColor }}
                />
                <div
                  className="h-12 w-12 rounded-xl"
                  style={{ backgroundColor: brandingForm.accentColor }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateBrandingMutation.mutate({
                    logoUrl: brandingForm.logoUrl || undefined,
                    iconUrl: brandingForm.iconUrl || undefined,
                    primaryColor: brandingForm.primaryColor,
                    secondaryColor: brandingForm.secondaryColor,
                    accentColor: brandingForm.accentColor,
                  })
                }
                disabled={updateBrandingMutation.isPending}
                className="gap-2"
              >
                {updateBrandingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar branding
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}