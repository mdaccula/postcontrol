import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Instagram, Globe, MessageCircle, Ticket, Share2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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

export default function GuestListConfirmation() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [agency, setAgency] = useState<AgencyData | null>(null);

  useEffect(() => {
    loadConfirmationData();
  }, [id, slug]);

  const loadConfirmationData = async () => {
    if (!id || !slug) {
      console.log('[CONFIRMATION] Link inválido - ID ou Slug ausente');
      toast.error("Link inválido");
      navigate("/");
      return;
    }

    console.log('[CONFIRMATION] Carregando dados de confirmação:', { id, slug });

    try {
      // Buscar dados da inscrição
      const { data: regData, error: regError } = await supabase
        .from("guest_list_registrations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

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

      // Buscar dados do evento
      const { data: eventData, error: eventError } = await supabase
        .from("guest_list_events")
        .select("*")
        .eq("slug", slug)
        .eq("id", regData.event_id)
        .maybeSingle();

      if (eventError) {
        console.error('[CONFIRMATION] Erro ao buscar evento:', eventError);
        toast.error("Erro ao buscar evento");
        navigate("/");
        return;
      }

      if (!eventData) {
        console.log('[CONFIRMATION] Evento não encontrado para slug:', slug);
        toast.error("Evento não encontrado");
        navigate("/");
        return;
      }

      console.log('[CONFIRMATION] Evento encontrado:', eventData);
      setEvent(eventData);

      // Buscar dados da agência
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("id, name, logo_url, instagram_url, website_url, whatsapp_group_url, tickets_group_url")
        .eq("id", eventData.agency_id)
        .maybeSingle();

      if (agencyError) {
        console.error('[CONFIRMATION] Erro ao buscar agência:', agencyError);
      }

      if (agencyData) {
        console.log('[CONFIRMATION] Agência encontrada:', agencyData);
        setAgency(agencyData);
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

  const handleWhatsAppShare = async () => {
    if (!event || !registration) return;

    // Build UTM parameters
    const utmParams = new URLSearchParams({
      utm_source: registration.utm_source || "whatsapp",
      utm_medium: "share",
      utm_campaign: registration.utm_campaign || event.slug,
    });

    // Build share URL
    const shareUrl = `${window.location.origin}/lista/${event.slug}?${utmParams.toString()}`;
    
    // Build WhatsApp message
    const message = `🎉 Acabei de me inscrever na lista VIP de ${event.name}! 

📍 ${event.location}

Garanta sua vaga também: ${shareUrl}`;

    // Track share click
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-guest-list-analytics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            dateId: registration.date_id,
            eventType: "share_click",
            utmParams: {
              utm_source: registration.utm_source,
              utm_medium: registration.utm_medium,
              utm_campaign: registration.utm_campaign,
            },
          }),
        }
      );
    } catch (error) {
      console.error("Error tracking share click:", error);
    }

    // Open WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!registration || !event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-6 animate-fade-in border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Logo da Agência */}
        {agency?.logo_url && (
          <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="h-20 w-auto object-contain"
            />
          </div>
        )}

        {/* Success Icon */}
        <div className="flex justify-center animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h1 className="text-2xl font-bold text-foreground">
            Inscrição Confirmada! 🎉
          </h1>
          <p className="text-muted-foreground">
            Olá <span className="font-semibold text-foreground">{registration.full_name}</span>,
            sua inscrição foi confirmada com sucesso!
          </p>
        </div>

        {/* Event Info */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-1 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <p className="text-sm text-muted-foreground">Evento</p>
          <p className="font-semibold text-foreground">{event.name}</p>
          <p className="text-sm text-muted-foreground">{event.location}</p>
        </div>

        {/* WhatsApp Share Button - VIRAL */}
        <Button
          onClick={handleWhatsAppShare}
          size="lg"
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-6 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          <Share2 className="mr-2 h-5 w-5" />
          Compartilhar no WhatsApp
        </Button>

        {/* Social Links */}
        {agency && (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm text-center text-muted-foreground">
              Siga {agency.name}
            </p>
            <div className="flex justify-center gap-4">
              {agency.instagram_url && (
                <a
                  href={agency.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                >
                  <Instagram className="h-5 w-5 text-foreground" />
                </a>
              )}
              {agency.website_url && (
                <a
                  href={agency.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                >
                  <Globe className="h-5 w-5 text-foreground" />
                </a>
              )}
              {agency.whatsapp_group_url && (
                <a
                  href={agency.whatsapp_group_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                >
                  <MessageCircle className="h-5 w-5 text-foreground" />
                </a>
              )}
              {agency.tickets_group_url && (
                <a
                  href={agency.tickets_group_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                >
                  <Ticket className="h-5 w-5 text-foreground" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <p>Você receberá mais informações no email:</p>
          <p className="font-medium text-foreground">{registration.email}</p>
        </div>
      </Card>
    </div>
  );
}
