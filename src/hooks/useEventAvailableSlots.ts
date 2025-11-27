import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SlotStats {
  total_slots: number;
  occupied_slots: number;
  available_slots: number;
  occupancy_percentage: number;
  total_participants: number; // 🆕 Total de participantes (batendo meta ou não)
}

export const useEventAvailableSlots = (eventId: string | null) => {
  return useQuery({
    queryKey: ['event-available-slots', eventId],
    queryFn: async (): Promise<SlotStats | null> => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .rpc('get_event_available_slots', { p_event_id: eventId })
        .single();

      if (error) {
        console.error('Erro ao buscar vagas disponíveis:', error);
        throw error;
      }

      return data as unknown as SlotStats;
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });
};
