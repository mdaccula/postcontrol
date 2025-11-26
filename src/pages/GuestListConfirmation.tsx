import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Instagram, Globe, MessageCircle, Ticket, Share2, CheckCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { shareViaWhatsApp } from "@/lib/phoneUtils";
interface RegistrationData {
  id: string;
  full_name: string;
  email: string;
  gender: string;
  event_id: string;
  date_id: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}
interface EventData {
  id: string;
  name: string;
  slug: string;
  location: string;
  agency_id: string;
  whatsapp_link?: string;
  agency_phone?: string;
}
interface AgencyData {
  id: string;
  name: string;
  logo_url?: string;
  instagram_url?: string;
  website_url?: string;
  whatsapp_group_url?: string;
  tickets_group_url?: string;
}
interface DateData {
  id: string;
  name: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  female_price: number;
  male_price: number;
  image_url: string | null;
  price_type?: string;
}
export default function GuestListConfirmation() {
  const {
    agencySlug,
    eventSlug,
    id
  } = useParams<{
    agencySlug: string;
    eventSlug: string;
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [dateData, setDateData] = useState<DateData | null>(null);
  const [allDates, setAllDates] = useState<DateData[]>([]);

  // Pegar datas do state se vieram da navegação
  const selectedDatesFromState = location.state?.selectedDates as DateData[] | undefined;
  useEffect(() => {
    loadConfirmationData();
  }, [id, agencySlug, eventSlug]);
  const loadConfirmationData = async () => {
    if (!id || !agencySlug || !eventSlug) {
      console.log('[CONFIRMATION] Link inválido - ID ou Slugs ausentes');
      toast.error("Link inválido");
      navigate("/");
      return;
    }
    console.log('[CONFIRMATION] Carregando dados de confirmação:', {
      id,
      agencySlug,
      eventSlug
    });
    try {
      // Buscar dados da inscrição
      const {
        data: regData,
        error: regError
      } = await supabase.from("guest_list_registrations").select("*").eq("id", id).maybeSingle();
      if (regError) {
        console.error('[CONFIRMATION] Erro ao buscar registro:', regError);
        toast.error("Erro ao buscar inscrição");
        navigate("/");
        return;
      }
      if (!regData) {
        console.log('[CONFIRMATION] Inscrição não encontrada para ID:', id);
        toast.error("Inscrição não encontrada");
        navigate("/");
        return;
      }
      console.log('[CONFIRMATION] Registro encontrado:', regData);
      setRegistration(regData);

      // Buscar dados do evento com validação de agência
      const {
        data: eventData,
        error: eventError
      } = await supabase.from("guest_list_events").select(`
          *,
          agencies!inner (slug)
        `).eq("slug", eventSlug).eq("agencies.slug", agencySlug).eq("id", regData.event_id).maybeSingle();
      if (eventError) {
        console.error('[CONFIRMATION] Erro ao buscar evento:', eventError);
        toast.error("Erro ao buscar evento");
        navigate("/");
        return;
      }
      if (!eventData) {
        console.log('[CONFIRMATION] Evento não encontrado para slugs:', agencySlug, eventSlug);
        toast.error("Evento não encontrado");
        navigate("/");
        return;
      }
      console.log('[CONFIRMATION] Evento encontrado:', eventData);
      setEvent(eventData);

      // Buscar dados da agência
      const {
        data: agencyData,
        error: agencyError
      } = await supabase.from("agencies").select("id, name, logo_url, instagram_url, website_url, whatsapp_group_url, tickets_group_url").eq("id", eventData.agency_id).maybeSingle();
      if (agencyError) {
        console.error('[CONFIRMATION] Erro ao buscar agência:', agencyError);
      }
      if (agencyData) {
        console.log('[CONFIRMATION] Agência encontrada:', agencyData);
        setAgency(agencyData);
      }

      // Buscar dados da data específica
      const {
        data: dateInfo,
        error: dateError
      } = await supabase.from("guest_list_dates").select("id, name, event_date, start_time, end_time, female_price, male_price, image_url, price_type").eq("id", regData.date_id).maybeSingle();
      if (dateError) {
        console.error('[CONFIRMATION] Erro ao buscar data:', dateError);
      }
      if (dateInfo) {
        console.log('[CONFIRMATION] Data encontrada:', dateInfo);
        setDateData(dateInfo);
      }

      // Se temos múltiplas datas do state, usar elas
      if (selectedDatesFromState && selectedDatesFromState.length > 0) {
        console.log('[CONFIRMATION] Usando datas do state:', selectedDatesFromState);
        setAllDates(selectedDatesFromState);
      } else if (dateInfo) {
        // Caso contrário, usar apenas a data única
        setAllDates([dateInfo]);
      }
      console.log('[CONFIRMATION] ✅ Dados carregados com sucesso');
      // Track analytics - share_click será trackado quando clicar no botão
    } catch (error) {
      console.error("[CONFIRMATION] ❌ Erro ao carregar confirmação:", error);
      toast.error("Erro ao carregar confirmação");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // HH:mm
  };
  const getPriceTypeDescription = (priceType?: string) => {
    switch (priceType) {
      case 'entry_only':
        return 'Valor de entrada';
      case 'consumable_only':
        return 'Valor consumível (entrada grátis)';
      case 'entry_plus_half':
        return 'Entrada + consome metade do valor';
      case 'entry_plus_full':
        return 'Entrada + consome valor integral';
      default:
        return 'Valor de entrada';
    }
  };
  const handleWhatsAppShare = async () => {
    if (!event || !registration) return;

    // Build UTM parameters
    const utmParams = new URLSearchParams({
      utm_source: registration.utm_source || "whatsapp",
      utm_medium: "share",
      utm_campaign: registration.utm_campaign || event.slug
    });

    // Build share URL with agency slug
    const shareUrl = `${window.location.origin}/${agencySlug}/lista/${event.slug}?${utmParams.toString()}`;

    // Build WhatsApp message
    const message = `🎉 Acabei de me inscrever na lista VIP de ${event.name}! 

📍 ${event.location}

Garanta sua vaga também: ${shareUrl}`;

    // Track share click
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-guest-list-analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: event.id,
          dateId: registration.date_id,
          eventType: "share_click",
          utmParams: {
            utm_source: registration.utm_source,
            utm_medium: registration.utm_medium,
            utm_campaign: registration.utm_campaign
          }
        })
      });
    } catch (error) {
      console.error("Error tracking share click:", error);
    }

    // Open WhatsApp with Web Share API fallback
    await shareViaWhatsApp(message);
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
      </div>;
  }
  if (!registration || !event) {
    return null;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-6 animate-fade-in border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Logo da Agência */}
        {agency?.logo_url && <div className="flex justify-center mb-6 animate-fade-in" style={{
        animationDelay: "0.1s"
      }}>
          <img src={agency.logo_url} alt={agency.name} className="h-60 w-auto object-contain" />
          </div>}

        {/* Success Icon */}
        <div className="flex justify-center animate-scale-in" style={{
        animationDelay: "0.2s"
      }}>
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-center space-y-3 animate-fade-in" style={{
        animationDelay: "0.3s"
      }}>
          <h1 className="text-2xl font-bold text-foreground">
            Inscrição Confirmada! 🎉
          </h1>
          <p className="text-muted-foreground">
            Olá <span className="font-semibold text-foreground">{registration.full_name}</span>,
            sua inscrição foi confirmada com sucesso!
          </p>
          {agency && <p className="text-sm text-muted-foreground mt-2">
              Ao chegar no evento, informar que está na lista da{' '}
              <span className="font-semibold text-foreground">{agency.name}</span>
            </p>}
        </div>

        {/* Event Info - Detalhado */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-4 animate-fade-in" style={{
        animationDelay: "0.4s"
      }}>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Evento</p>
            <p className="font-bold text-lg text-foreground">{event.name}</p>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Local</p>
            <p className="font-semibold text-foreground">{event.location}</p>
          </div>
          
          <Separator />
          
          {/* Múltiplas Datas */}
          {allDates.length > 0 && <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {allDates.length > 1 ? 'Datas Selecionadas' : 'Data Selecionada'}
              </p>
              
              {allDates.map((date, index) => <div key={date.id} className="bg-background/50 rounded-lg p-3 space-y-2">
                  {date.image_url && <div className="rounded overflow-hidden mb-2">
                      <img src={date.image_url} alt={date.name || 'Data do evento'} className="w-full h-24 object-contain bg-muted/20" />
                    </div>}
                  
                  {date.name && <p className="font-semibold text-foreground">{date.name}</p>}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {formatDate(date.event_date)}
                    </span>
                    {date.start_time && date.end_time && <span className="text-xs text-muted-foreground">
                        {formatTime(date.start_time)} - {formatTime(date.end_time)}
                      </span>}
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Valor:</span>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        R$ {registration.gender === 'feminino' ? date.female_price.toFixed(2).replace('.', ',') : date.male_price.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPriceTypeDescription(date.price_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({registration.gender === 'feminino' ? 'Lista Feminina' : 'Lista Masculina'})
                      </p>
                    </div>
                  </div>
                </div>)}
            </div>}
        </div>

        {/* WhatsApp Share Button - VIRAL */}
        <Button onClick={handleWhatsAppShare} size="lg" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-6 animate-fade-in" style={{
        animationDelay: "0.5s"
      }}>
          <Share2 className="mr-2 h-5 w-5" />
          Compartilhar no WhatsApp
        </Button>

        {/* Social Links */}
        {agency && <div className="space-y-3 animate-fade-in" style={{
        animationDelay: "0.6s"
      }}>
            <p className="text-sm text-center text-muted-foreground">
              {agency.instagram_url || agency.website_url || agency.whatsapp_group_url || agency.tickets_group_url ? `Siga ${agency.name}` : `Continue conectado com ${agency.name}`}
            </p>
            <div className="flex justify-center gap-4">
              {agency.instagram_url && <a href={agency.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110">
                  <Instagram className="h-5 w-5 text-foreground" />
                </a>}
              {agency.website_url && <a href={agency.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110">
                  <Globe className="h-5 w-5 text-foreground" />
                </a>}
              {agency.whatsapp_group_url && <a href={agency.whatsapp_group_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110">
                  <MessageCircle className="h-5 w-5 text-foreground" />
                </a>}
              {agency.tickets_group_url && <a href={agency.tickets_group_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110">
                  <Ticket className="h-5 w-5 text-foreground" />
                </a>}
            </div>
          </div>}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground animate-fade-in" style={{
        animationDelay: "0.7s"
      }}>
          <p>Você receberá mais informações no email:</p>
          <p className="font-medium text-foreground">{registration.email}</p>
        </div>
      </Card>
    </div>;
}