import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { adminApi } from '@/lib/api';
import type { CustomerProfile } from '@/types';
import { Users, Loader2, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

function buildWhatsAppLink(phone?: string | null) {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/55${cleaned}`;
}

export default function AdminClientsPage() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: adminApi.clients,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} clientes cadastrados
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {clients.map((client: CustomerProfile, i: number) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
                  {client.name?.charAt(0) || 'C'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {client.name}
                  </p>

                  <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.user?.email || 'Sem e-mail'}
                    </span>

                    {client.phone ? (
                      <a
                        href={buildWhatsAppLink(client.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Não informado
                      </span>
                    )}
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