import { useState } from 'react';
import { sb } from '@/lib/supabaseSafe';
import { useToast } from '@/hooks/use-toast';

export interface EventTemplate {
  id: string;
  name: string;
  template_data: {
    title?: string;
    description?: string;
    location?: string;
    setor?: string;
    numero_de_vagas?: number;
    require_instagram_link?: boolean;
    target_gender?: string[];
    requirements?: any[];
    total_required_posts?: number;
    is_approximate_total?: boolean;
  };
  created_at: string;
  created_by: string;
  agency_id?: string;
}

export const useEventTemplates = () => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadTemplates = async (agencyId?: string) => {
    setLoading(true);
    try {
      let query = sb.from('event_templates').select('*').order('created_at', { ascending: false });
      
      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates salvos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (name: string, templateData: any, agencyId?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await sb.from('event_templates').insert({
        name,
        template_data: templateData,
        created_by: user.id,
        agency_id: agencyId
      });

      if (error) throw error;

      toast({
        title: "Template salvo!",
        description: "O template foi salvo com sucesso."
      });

      await loadTemplates(agencyId);
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro ao salvar template",
        description: "Não foi possível salvar o template.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string, agencyId?: string) => {
    try {
      const { error } = await sb.from('event_templates').delete().eq('id', id);
      
      if (error) throw error;

      toast({
        title: "Template removido",
        description: "O template foi removido com sucesso."
      });

      await loadTemplates(agencyId);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erro ao remover template",
        description: "Não foi possível remover o template.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    templates,
    loading,
    loadTemplates,
    saveTemplate,
    deleteTemplate
  };
};
