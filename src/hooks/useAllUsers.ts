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

      // ✅ ITEM 3: Aplicar filtros de busca com trim
      if (searchTerm) {
        const cleanSearch = searchTerm.trim();
        query = query.or(
          `full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,instagram.ilike.%${cleanSearch}%`
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

      // ✅ ITEM 2: Performance - buscar roles e submissions em BATCH (3 queries em vez de 41)
      const userIds = usersData.map(u => u.id);
      
      console.log('🔍 [useAllUsers] Buscando roles e submissions em batch para', userIds.length, 'usuários');

      const [rolesResult, submissionsResult] = await Promise.all([
        sb.from('user_roles').select('user_id, role').in('user_id', userIds),
        sb.from('submissions').select('user_id').in('user_id', userIds)
      ]);

      console.log('📋 [useAllUsers] Roles encontradas:', rolesResult.data?.length);
      console.log('📄 [useAllUsers] Submissions encontradas:', submissionsResult.data?.length);

      // Montar dados com roles e submission counts
      const usersWithData = usersData.map(user => {
        const userRoles = rolesResult.data?.filter(r => r.user_id === user.id).map(r => r.role) || [];
        const submissionCount = submissionsResult.data?.filter(s => s.user_id === user.id).length || 0;
        
        return {
          ...user,
          roles: userRoles,
          submission_count: submissionCount
        };
      });

      // ✅ ITEM 1: Filtrar por role no JavaScript (após buscar do banco)
      let filteredUsers = usersWithData;
      let finalCount = count || 0;

      if (roleFilter !== 'all') {
        console.log('🔎 [useAllUsers] Aplicando filtro de role:', roleFilter);
        
        filteredUsers = usersWithData.filter(user => {
          if (roleFilter === 'master_admin') return user.roles.includes('master_admin');
          if (roleFilter === 'agency_admin') return user.roles.includes('agency_admin');
          if (roleFilter === 'user') return user.roles.length === 0 || (!user.roles.includes('master_admin') && !user.roles.includes('agency_admin'));
          return true;
        });

        finalCount = filteredUsers.length;
        console.log('✅ [useAllUsers] Usuários após filtro de role:', filteredUsers.length);
      }

      console.log('✅ [useAllUsers] Dados finais:', filteredUsers.length, 'usuários');

      return {
        users: filteredUsers,
        totalCount: finalCount
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
