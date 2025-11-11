import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ Hook consolidado para buscar configurações de admin
 * Substitui: useAdminSettings (useReactQuery.ts)
 */

interface AdminSetting {
  setting_key: string;
  setting_value: string | null;
}

interface AdminSettingsMap {
  [key: string]: string;
}

export const useAdminSettingsQuery = (keys?: string[]) => {
  return useQuery({
    queryKey: ['admin-settings', keys],
    queryFn: async () => {
      let query = supabase.from('admin_settings').select('setting_key, setting_value');
      
      if (keys && keys.length > 0) {
        query = query.in('setting_key', keys);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Converter array para objeto { setting_key: setting_value }
      const settingsMap: AdminSettingsMap = {};
      (data || []).forEach((setting: AdminSetting) => {
        settingsMap[setting.setting_key] = setting.setting_value || '';
      });

      return settingsMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
