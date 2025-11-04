import { useQuery } from '@tanstack/react-query';
import { sb } from '@/lib/supabaseSafe';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  instagram?: string;
  agency_id?: string;
  created_at: string;
  followers_range?: string;
}

interface UserWithRolesAndStats extends UserProfile {
  roles: string[];
  submission_count: number;
}

interface UseAllUsersParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  roleFilter?: string;
  agencyFilter?: string;
  genderFilter?: string;
}

/**
 * Hook React Query para carregar TODOS os usuários com paginação no backend
 * ✅ Item 6: Migração para React Query
 * ✅ Item 7: Paginação no Backend
 * ✅ Item 8: SELECT específico de colunas
 */
export const useAllUsers = ({
  page = 1,
  pageSize = 20,
  searchTerm = '',
  roleFilter = 'all',
  agencyFilter = 'all',
  genderFilter = 'all'
}: UseAllUsersParams = {}) => {
  return useQuery({
    queryKey: ['allUsers', page, pageSize, searchTerm, roleFilter, agencyFilter, genderFilter],
    queryFn: async (): Promise<{ users: UserWithRolesAndStats[]; totalCount: number }> => {
      console.log('🔄 [useAllUsers] Carregando página:', page, 'Tamanho:', pageSize);

      // ✅ ITEM 8: SELECT específico (não usar *)
      let query = sb
        .from('profiles')
        .select('id, full_name, email, phone, gender, instagram, agency_id, created_at, followers_range', 
          { count: 'exact' });

      // Aplicar filtros de busca
      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,instagram.ilike.%${searchTerm}%`
        );
      }

      if (agencyFilter !== 'all') {
        query = query.eq('agency_id', agencyFilter);
      }

      if (genderFilter !== 'all') {
        query = query.eq('gender', genderFilter);
      }

      // ✅ ITEM 7: Paginação no BACKEND (não carregar todos os dados)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: usersData, error: usersError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      console.log('📊 [useAllUsers] Usuários carregados:', usersData?.length, 'Total:', count);

      if (usersError) throw usersError;
      if (!usersData) return { users: [], totalCount: 0 };

      // Carregar roles e submission counts em paralelo
      const usersWithData = await Promise.all(
        usersData.map(async (user) => {
          const [rolesResult, submissionResult] = await Promise.all([
            sb.from('user_roles').select('role').eq('user_id', user.id),
            sb.from('submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
          ]);

          return {
            ...user,
            roles: rolesResult.data?.map((ur: any) => ur.role) || [],
            submission_count: submissionResult.count || 0
          };
        })
      );

      console.log('✅ [useAllUsers] Dados enriquecidos:', usersWithData.length);

      return {
        users: usersWithData,
        totalCount: count || 0
      };
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });
};

/**
 * Hook para carregar agências (usado nos filtros)
 */
export const useAgencies = () => {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      console.log('🏢 [useAgencies] Carregando agências...');
      
      // ✅ ITEM 8: SELECT específico
      const { data, error } = await sb
        .from('agencies')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (error) throw error;
      
      console.log('✅ [useAgencies] Agências carregadas:', data?.length);
      return data || [];
    },
    staleTime: 60000, // 1 minuto
  });
};
