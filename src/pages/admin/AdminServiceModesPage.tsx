import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { serviceModesApi, vehicleTypesApi } from '@/lib/api';
import type { ServiceMode, VehicleTypeInfo } from '@/types';
import {
  Settings,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type RuleFormState = {
  ruleId?: string;
  durationMinutes: string;
  basePrice: string;
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  rules: Record<string, RuleFormState>;
};

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  isActive: true,
  rules: {},
});

export default function AdminServiceModesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: modes = [], isLoading } = useQuery({
    queryKey: ['admin-service-modes'],
    queryFn: serviceModesApi.listAdmin,
  });

  const { data: vehicleTypes = [], isLoading: loadingVehicleTypes } = useQuery({
    queryKey: ['admin-vehicle-types'],
    queryFn: vehicleTypesApi.listAdmin,
  });

  const createMutation = useMutation({
    mutationFn: serviceModesApi.create,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      serviceModesApi.update(id, data),
  });

  const createRuleMutation = useMutation({
    mutationFn: ({
      serviceModeId,
      data,
    }: {
      serviceModeId: string;
      data: {
        vehicleTypeKind: string;
        durationMinutes: number;
        basePriceInCents: number;
      };
    }) => serviceModesApi.createRule(serviceModeId, data),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: {
        durationMinutes: number;
        basePriceInCents: number;
      };
    }) => serviceModesApi.updateRule(ruleId, data),
  });

  const deleteMutation = useMutation({
    mutationFn: serviceModesApi.delete,
    onSuccess: async () => {
      toast.success('Modalidade excluída com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-service-modes'],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao excluir modalidade';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createRuleMutation.isPending ||
    updateRuleMutation.isPending;

  const openCreate = () => {
    const next = emptyForm();

    vehicleTypes.forEach((vehicle: VehicleTypeInfo) => {
      next.rules[vehicle.id] = {
        durationMinutes: '',
        basePrice: '',
      };
    });

    setForm(next);
    setShowForm(true);
  };

  const openEdit = (mode: ServiceMode) => {
    const next = emptyForm();

    next.id = mode.id;
    next.name = mode.name;
    next.description = mode.description || '';
    next.isActive = mode.isActive;

    vehicleTypes.forEach((vehicle: VehicleTypeInfo) => {
      next.rules[vehicle.id] = {
        durationMinutes: '',
        basePrice: '',
      };
    });

    mode.rules.forEach((rule) => {
      const vehicleTypeId = rule.vehicleType.id;
      next.rules[vehicleTypeId] = {
        ruleId: rule.id,
        durationMinutes: String(rule.durationMinutes),
        basePrice: String((rule.basePriceInCents / 100).toFixed(2)),
      };
    });

    setForm(next);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da modalidade');
      return;
    }

    try {
      let modeId = form.id;

      if (modeId) {
        await updateMutation.mutateAsync({
          id: modeId,
          data: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            isActive: form.isActive,
          },
        });
      } else {
        const created = await createMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });

        modeId = created.id;
      }

      for (const vehicle of vehicleTypes) {
        const rule = form.rules[vehicle.id];
        if (!rule) continue;

        const durationMinutes = Number(rule.durationMinutes || 0);
        const basePriceInCents = Math.round(
          Number((rule.basePrice || '0').replace(',', '.')) * 100,
        );

        if (!durationMinutes || !basePriceInCents) continue;

        if (rule.ruleId) {
          await updateRuleMutation.mutateAsync({
            ruleId: rule.ruleId,
            data: {
              durationMinutes,
              basePriceInCents,
            },
          });
        } else {
          await createRuleMutation.mutateAsync({
            serviceModeId: modeId!,
            data: {
              vehicleTypeKind: vehicle.kind,
              durationMinutes,
              basePriceInCents,
            },
          });
        }
      }

      toast.success(
        form.id
          ? 'Modalidade atualizada com sucesso'
          : 'Modalidade criada com sucesso',
      );

      await queryClient.invalidateQueries({
        queryKey: ['admin-service-modes'],
      });

      closeForm();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Erro ao salvar modalidade';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const sortedModes = useMemo(() => modes, [modes]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modalidades</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os tipos de lavagem, duração e valores por veículo
            </p>
          </div>

          <Button onClick={openCreate} className="gap-2" disabled={loadingVehicleTypes}>
            <Plus className="h-4 w-4" />
            Nova modalidade
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {form.id ? 'Editar modalidade' : 'Nova modalidade'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Defina nome, status e regras por tipo de veículo
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ex: Lavagem completa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.value === 'active',
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Descreva a modalidade"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {vehicleTypes.map((vehicle: VehicleTypeInfo) => {
                const rule = form.rules[vehicle.id] || {
                  durationMinutes: '',
                  basePrice: '',
                };

                return (
                  <div
                    key={vehicle.id}
                    className="rounded-2xl border border-border bg-background p-4 space-y-3"
                  >
                    <div>
                      <h3 className="font-medium text-foreground">
                        {vehicle.displayName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Defina tempo e valor para este veículo
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Duração (min)
                      </label>
                      <input
                        type="number"
                        value={rule.durationMinutes}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              [vehicle.id]: {
                                ...prev.rules[vehicle.id],
                                durationMinutes: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Ex: 60"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={rule.basePrice}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              [vehicle.id]: {
                                ...prev.rules[vehicle.id],
                                basePrice: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Ex: 80.00"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>

              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar modalidade
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sortedModes.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhuma modalidade cadastrada
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedModes.map((mode: ServiceMode, i: number) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-5 border border-border shadow-card"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{mode.name}</h3>
                    {mode.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      mode.isActive
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {mode.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                {mode.rules?.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Regras por veículo
                    </p>

                    {mode.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {rule.vehicleType?.displayName ||
                            rule.vehicleType?.kind ||
                            '-'}
                        </span>
                        <span className="text-muted-foreground">
                          {rule.durationMinutes}min • R${' '}
                          {(rule.basePriceInCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openEdit(mode)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(mode.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}