import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DateSelector } from "@/components/GuestList/DateSelector";
import { GuestListForm } from "@/components/GuestList/GuestListForm";
import { toast } from "sonner";
interface GuestListEvent {
  id: string;
  agency_id: string;
  name: string;
  location: string;
  extra_info: string | null;
  whatsapp_link: string | null;
  agency_phone: string | null;
  slug: string;
  agencies: {
    name: string;
    logo_url: string | null;
  };
}
interface GuestListDate {
  id: string;
  event_date: string;
  female_price: number;
  male_price: number;
  max_capacity: number | null;
  is_active: boolean;
  name?: string;
  image_url?: string;
  start_time?: string;
  end_time?: string;
  auto_deactivate_after_start?: boolean;
  important_info?: string | null;
}
export default function GuestListRegister() {
  const {
    slug
  } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<GuestListEvent | null>(null);
  const [dates, setDates] = useState<GuestListDate[]>([]);
  const [selectedDateIds, setSelectedDateIds] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    loadEventData();
  }, [slug]);
  useEffect(() => {
    // Registrar visualização da página
    if (event) {
      trackAnalytics('view');
    }
  }, [event]);
  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar evento por slug (público, sem auth)
      const {
        data: eventData,
        error: eventError
      } = await supabase.from('guest_list_events').select(`
          *,
          agencies (
            name,
            logo_url
          )
        `).eq('slug', slug).eq('is_active', true).single();
      if (eventError || !eventData) {
        setError('Evento não encontrado ou não está mais disponível.');
        return;
      }
      setEvent(eventData as any);

      // Buscar datas disponíveis
      const {
        data: datesData,
        error: datesError
      } = await supabase.from('guest_list_dates').select('*').eq('event_id', eventData.id).eq('is_active', true).gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', {
        ascending: true
      });
      if (datesError) throw datesError;
      if (!datesData || datesData.length === 0) {
        setError('Não há datas disponíveis para este evento.');
        return;
      }

      // Filtrar datas que devem ser desativadas após início
      const activeDates = datesData.filter(date => {
        if (!date.auto_deactivate_after_start) return true;

        // Só filtrar por horário se start_time estiver definido
        if (!date.start_time) return true;

        // Criar datetime com timezone BRT (UTC-3) para comparação consistente
        const eventDateTime = new Date(`${date.event_date}T${date.start_time}:00-03:00`);
        const now = new Date();
        return eventDateTime > now;
      });
      if (activeDates.length === 0) {
        setError('Não há datas disponíveis para este evento.');
        return;
      }
      setDates(activeDates);
      // Não selecionar nenhuma data automaticamente para permitir seleção múltipla
    } catch (err: any) {
      console.error('Erro ao carregar evento:', err);
      setError('Erro ao carregar informações do evento.');
      toast.error('Erro ao carregar evento');
    } finally {
      setLoading(false);
    }
  };
  const trackAnalytics = async (eventType: 'view' | 'form_start' | 'submission' | 'share_click') => {
    if (!event) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = {
        source: urlParams.get('utm_source') || undefined,
        medium: urlParams.get('utm_medium') || undefined,
        campaign: urlParams.get('utm_campaign') || undefined,
        ref: urlParams.get('ref') || undefined
      };
      await supabase.functions.invoke('track-guest-list-analytics', {
        body: {
          eventId: event.id,
          dateId: selectedDateIds[0] || undefined,
          eventType,
          utmParams
        }
      });
    } catch (error) {
      console.error('Erro ao registrar analytics:', error);
    }
  };
  const handleFormStart = () => {
    trackAnalytics('form_start');
  };
  const handleSuccess = (registrationIds: string[], formData: any) => {
    // Redirecionar para página de confirmação com primeira inscrição
    const selectedDates = dates.filter(d => selectedDateIds.includes(d.id));
    navigate(`/lista/${slug}/confirmacao/${registrationIds[0]}`, {
      state: {
        eventName: event?.name,
        agencyName: event?.agencies?.name,
        agencyLogo: event?.agencies?.logo_url,
        selectedDates,
        registrationIds,
        formData
      }
    });
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando evento...</p>
        </div>
      </div>;
  }
  if (error || !event) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Evento não encontrado'}</AlertDescription>
        </Alert>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Logo da Agência */}
        {event.agencies?.logo_url && <div className="flex justify-center">
            <img src={event.agencies.logo_url} alt={event.agencies.name} className="h-40 w-auto object-contain" />
          </div>}

        {/* Card Principal */}
        <Card className="border-2">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-center">
                {event.name}
              </CardTitle>
              <CardDescription className="text-center font-bold text-xl">
                {event.agencies?.name}
              </CardDescription>
            </div>

            {/* Localização */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="font-bold">{event.location}</span>
            </div>

            {/* Info Extra */}
            {event.extra_info && <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription className="text-sm whitespace-pre-wrap">
                  {event.extra_info}
                </AlertDescription>
              </Alert>}
          </CardHeader>

          <Separator />

          <CardContent className="pt-6 space-y-6">
            {/* Seletor de Datas */}
            <DateSelector dates={dates} selectedDateIds={selectedDateIds} onSelectDates={setSelectedDateIds} userGender={selectedGender} />

            <Separator />

            {/* Formulário */}
            {selectedDateIds.length > 0 && <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">
                    📝 Complete sua inscrição
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Preencha os dados abaixo para garantir sua vaga
                  </p>
                </div>

                <GuestListForm eventId={event.id} dateIds={selectedDateIds} agencyPhone={event.agency_phone || undefined} whatsappLink={event.whatsapp_link || undefined} eventName={event.name} onSuccess={handleSuccess} onFormStart={handleFormStart} onGenderChange={setSelectedGender} />
              </div>}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Ao se inscrever, você concorda com nossos termos de uso</p>
        </div>
      </div>
    </div>;
}