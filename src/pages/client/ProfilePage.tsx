import { useQuery } from '@tanstack/react-query';
import ClientLayout from '@/components/layouts/ClientLayout';
import { customersApi } from '@/lib/api';
import { User, Mail, Phone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: customersApi.getProfile,
  });

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-primary-foreground">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {profile?.name || 'Usuário'}
            </h2>
            <p className="text-sm text-muted-foreground">Cliente</p>
          </div>

          <div className="space-y-4">
            <InfoRow
              icon={Mail}
              label="Email"
              value={profile?.user?.email || 'Não informado'}
            />
            <InfoRow
              icon={Phone}
              label="Telefone"
              value={profile?.phone || 'Não informado'}
            />
          </div>
        </div>
      </motion.div>
    </ClientLayout>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <Icon className="h-4.5 w-4.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}