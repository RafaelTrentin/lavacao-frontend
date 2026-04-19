import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { extraServicesApi, adminApi } from '@/lib/api';
import type { ExtraService } from '@/types';
import {
  Sparkles,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type FormState = {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  imageUrl: '',
  isActive: true,
});

export default function AdminExtrasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: extras = [], isLoading } = useQuery({
    queryKey: ['admin-extras'],
    queryFn: extraServicesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: extraServicesApi.create,
    onSuccess: async () => {
      toast.success('Serviço extra criado com sucesso');
      await queryClient.invalidateQueries({ queryKey: ['admin-extras'] });
      closeForm();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao criar serviço extra';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExtraService> }) =>
      extraServicesApi.update(id, data),
    onSuccess: async () => {
      toast.success('Serviço extra atualizado com sucesso');
      await queryClient.invalidateQueries({ queryKey: ['admin-extras'] });
      closeForm();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao atualizar serviço extra';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: extraServicesApi.delete,
    onSuccess: async () => {
      toast.success('Serviço extra excluído com sucesso');
      await queryClient.invalidateQueries({ queryKey: ['admin-extras'] });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Erro ao excluir serviço extra';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (extra: ExtraService) => {
    setForm({
      id: extra.id,
      name: extra.name,
      description: extra.description || '',
      imageUrl: extra.imageUrl || '',
      isActive: extra.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm());
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do serviço extra');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
    };

    if (form.id) {
      updateMutation.mutate({
        id: form.id,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const sortedExtras = useMemo(() => extras, [extras]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Serviços Extras
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre serviços especiais atendidos via WhatsApp
            </p>
          </div>

          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo extra
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {form.id ? 'Editar serviço extra' : 'Novo serviço extra'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Esse serviço aparecerá na página de extras e abrirá conversa no WhatsApp
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome do serviço
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ex: Polimento"
                />
              </div>

              <div className="space-y-2">
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
                  className="min-h-[110px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Explique o que esse serviço faz"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Imagem do serviço
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const res = await adminApi.uploadLogo(file);
                      setForm((prev) => ({
                        ...prev,
                        imageUrl: res.url,
                      }));
                      toast.success('Imagem enviada com sucesso');
                    } catch {
                      toast.error('Erro ao enviar imagem');
                    }
                  }}
                  className="text-sm"
                />

                  <p className="text-xs text-muted-foreground">
                    Recomendado: imagem horizontal em 1200 x 800 px, nos formatos JPG ou PNG.
                  </p>

                {form.imageUrl && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-background">
                    <img
                      src={form.imageUrl}
                      alt="Prévia"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}
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
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
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
                Salvar serviço
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sortedExtras.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum serviço extra cadastrado
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedExtras.map((extra: ExtraService, i: number) => (
              <motion.div
                key={extra.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                {extra.imageUrl ? (
                  <img
                    src={extra.imageUrl}
                    alt={extra.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {extra.name}
                      </h3>
                      {extra.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {extra.description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        extra.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {extra.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Atendimento via WhatsApp
                    </span>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openEdit(extra)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(extra.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}