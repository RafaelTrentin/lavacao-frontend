import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { vehicleTypesApi } from '@/lib/api';
import type { VehicleTypeInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Car, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

type FormState = {
  id?: string;
  kind: string;
  displayName: string;
};

const emptyForm = (): FormState => ({
  kind: '',
  displayName: '',
});

export default function AdminVehicleTypesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: vehicleTypes = [], isLoading } = useQuery({
    queryKey: ['admin-vehicle-types'],
    queryFn: vehicleTypesApi.listAdmin,
  });

  const createMutation = useMutation({
    mutationFn: vehicleTypesApi.create,
    onSuccess: async () => {
      toast.success('Tipo de veículo criado com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-vehicle-types'],
      });
      closeForm();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao criar tipo de veículo';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { kind?: string; displayName?: string };
    }) => vehicleTypesApi.update(id, data),
    onSuccess: async () => {
      toast.success('Tipo de veículo atualizado com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-vehicle-types'],
      });
      closeForm();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao atualizar tipo de veículo';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vehicleTypesApi.delete,
    onSuccess: async () => {
      toast.success('Tipo de veículo excluído com sucesso');
      await queryClient.invalidateQueries({
        queryKey: ['admin-vehicle-types'],
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao excluir tipo de veículo';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (item: VehicleTypeInfo) => {
    setForm({
      id: item.id,
      kind: item.kind,
      displayName: item.displayName,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.kind.trim() || !form.displayName.trim()) {
      toast.error('Informe o código e o nome do tipo de veículo');
      return;
    }

    if (form.id) {
      updateMutation.mutate({
        id: form.id,
        data: {
          kind: form.kind.trim().toUpperCase(),
          displayName: form.displayName.trim(),
        },
      });
    } else {
      createMutation.mutate({
        kind: form.kind.trim().toUpperCase(),
        displayName: form.displayName.trim(),
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Tipos de Veículo
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre os tipos de veículo usados nas modalidades desta empresa
            </p>
          </div>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo tipo
          </Button>
        </div>

        {showForm && (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {form.id
                    ? 'Editar tipo de veículo'
                    : 'Novo tipo de veículo'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Exemplo de código: CARRO, MOTO, CAMINHONETE, SUV
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Código interno - não alterar depois de usar
                </label>
                <input
                  type="text"
                  value={form.kind}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, kind: e.target.value }))
                  }
                  disabled={!!form.id}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ex: CAMINHONETE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome exibido
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ex: Caminhonete"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeForm}>
                Cancelar
              </Button>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar tipo
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : vehicleTypes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum tipo de veículo cadastrado
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {vehicleTypes.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground">
                    {item.displayName}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Código: {item.kind}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}