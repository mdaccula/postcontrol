import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { sb } from "@/lib/supabaseSafe";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agency {
  id: string;
  name: string;
  logo_url?: string;
  slug: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  setor?: string;
  numero_de_vagas?: number;
  event_image_url?: string;
  total_required_posts?: number;
  is_approximate_total?: boolean;
  whatsapp_group_title?: string;
  whatsapp_group_url?: string;
  agency_id: string;
}

export default function PublicEvent() {
  const { agencySlug, eventSlug } = useParams<{ agencySlug: string; eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAssociated = useRef(false); // ✅ FASE 1: Controlar execução única

  useEffect(() => {
    const loadEventData = async () => {
      if (!agencySlug || !eventSlug) {
        setError("URL inválida");
        setLoading(false);
        return;
      }

      try {
        // Buscar agência pelo slug
        const { data: agencyData, error: agencyError } = await sb
          .from('agencies')
          .select('id, name, logo_url, slug')
          .eq('slug', agencySlug)
          .maybeSingle();

        if (agencyError) throw agencyError;
        if (!agencyData) {
          setError("Agência não encontrada");
          setLoading(false);
          return;
        }

        setAgency(agencyData);

        // Buscar evento pelo slug e agency_id
        const { data: eventData, error: eventError } = await sb
          .from('events')
          .select('*')
          .eq('event_slug', eventSlug)
          .eq('agency_id', agencyData.id)
          .eq('is_active', true)
          .maybeSingle();

        if (eventError) throw eventError;
        if (!eventData) {
          setError("Evento não encontrado ou inativo");
          setLoading(false);
          return;
        }

        setEvent(eventData);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar evento:", err);
        setError("Erro ao carregar informações do evento");
        setLoading(false);
      }
    };

    loadEventData();
  }, [agencySlug, eventSlug]);

  // ✅ FASE 1: Se o usuário está logado, associá-lo automaticamente à agência (1 vez apenas)
  useEffect(() => {
    const associateUserToAgency = async () => {
      if (user && agency && !hasAssociated.current) {
        hasAssociated.current = true; // ✅ Marca como executado
        console.log("🔗 Associando usuário à agência via evento público:", {
          user_id: user.id,
          agency_id: agency.id,
          agency_name: agency.name,
          event_slug: eventSlug
        });

        const { error: linkError } = await sb.from("user_agencies").upsert(
          {
            user_id: user.id,
            agency_id: agency.id,
            last_accessed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,agency_id",
          }
        );

        if (linkError) {
          console.error("❌ Erro ao vincular agência:", linkError);
        } else {
          console.log("✅ Usuário vinculado à agência com sucesso!");
          toast.success("Você está vinculado à " + agency.name);
        }
      }
    };

    associateUserToAgency();
  }, [user, agency, eventSlug]); // ✅ Remove 'associating' das dependências

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">😕 Ops!</h1>
          <p className="text-muted-foreground mb-6">{error || "Evento não encontrado"}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o início
          </Button>
        </Card>
      </div>
    );
  }

  const pageUrl = `${window.location.origin}/agencia/${agencySlug}/evento/${eventSlug}`;
  const eventImageUrl = event.event_image_url || agency.logo_url || `${window.location.origin}/placeholder.svg`;
  const eventDateFormatted = event.event_date 
    ? format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Helmet>
        <title>{event.title} - {agency.name}</title>
        <meta name="description" content={event.description || `Participe do evento ${event.title} organizado por ${agency.name}`} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`${event.title} - ${agency.name}`} />
        <meta property="og:description" content={event.description || `Participe do evento ${event.title} organizado por ${agency.name}`} />
        <meta property="og:image" content={eventImageUrl} />
        <meta property="og:image:secure_url" content={eventImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:site_name" content={agency.name} />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={`${event.title} - ${agency.name}`} />
        <meta name="twitter:description" content={event.description || `Participe do evento ${event.title} organizado por ${agency.name}`} />
        <meta name="twitter:image" content={eventImageUrl} />
        <meta name="twitter:image:alt" content={event.title} />
        
        {/* Additional SEO */}
        {event.event_date && <meta property="event:start_time" content={event.event_date} />}
        {event.location && <meta property="og:locale" content="pt_BR" />}
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agency.logo_url && (
              <img src={agency.logo_url} alt={agency.name} className="h-10 w-10 rounded-full object-cover" />
            )}
            <h1 className="text-xl font-bold">{agency.name}</h1>
          </div>
          <Button onClick={() => navigate("/")} variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Início
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto overflow-hidden">
          {/* Event Image */}
          {event.event_image_url && (
            <div className="w-full h-64 md:h-96 relative overflow-hidden">
              <img 
                src={event.event_image_url} 
                alt={event.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Event Details */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">{event.title}</h2>
              {event.description && (
                <p className="text-muted-foreground text-lg whitespace-pre-wrap">{event.description}</p>
              )}
            </div>

            {/* Event Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {event.event_date && (
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground">Data do Evento</p>
                    <p className="font-medium">
                      {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {event.location && (
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground">Local</p>
                    <p className="font-medium">{event.location}</p>
                    {event.setor && <p className="text-sm text-muted-foreground">Setor: {event.setor}</p>}
                  </div>
                </div>
              )}

              {event.numero_de_vagas && (
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground">Vagas Disponíveis</p>
                    <p className="font-medium">{event.numero_de_vagas} vagas</p>
                  </div>
                </div>
              )}

              {event.total_required_posts && event.total_required_posts > 0 && (
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                  <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground">Divulgação Necessária</p>
                    <p className="font-medium">
                      {event.total_required_posts} postagens{event.is_approximate_total ? ' (aproximado)' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Group */}
            {event.whatsapp_group_url && (
              <div className="mt-8 p-6 border-2 border-primary/20 rounded-lg bg-primary/5">
                <h3 className="font-bold text-lg mb-2">
                  {event.whatsapp_group_title || "Grupo do WhatsApp"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Entre no grupo para receber mais informações e ficar por dentro das novidades do evento!
                </p>
                <Button 
                  onClick={() => window.open(event.whatsapp_group_url!, '_blank')}
                  className="w-full md:w-auto bg-gradient-primary"
                  size="lg"
                >
                  Entrar no Grupo do WhatsApp
                </Button>
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 text-center">
              {user ? (
                <Button 
                  onClick={() => navigate("/submit")} 
                  size="lg"
                  className="bg-gradient-primary"
                >
                  Enviar Submissão
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => {
                      // ✅ FASE 2: Salvar contexto do evento antes de redirecionar
                      localStorage.setItem('event_context', JSON.stringify({
                        agencySlug,
                        eventSlug,
                        agencyId: agency.id,
                        agencyName: agency.name,
                        eventId: event.id,
                        eventTitle: event.title,
                        returnUrl: window.location.pathname
                      }));
                      navigate("/auth");
                    }} 
                    size="lg"
                    className="bg-gradient-primary"
                  >
                    Quero Participar
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Faça login para gerenciar suas cortesias
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
