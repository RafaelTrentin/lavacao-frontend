import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';

export function useBusinessTimezone() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['business-timezone', user?.businessId, user?.id],
    queryFn: async () => {
      const business = await adminApi.getBusiness();
      if (!business?.timezone) throw new Error('Timezone da empresa indisponível');
      new Intl.DateTimeFormat('pt-BR', { timeZone: business.timezone }).format();
      return business.timezone as string;
    },
    enabled: !!user,
  });
  return query.data ?? null;
}
