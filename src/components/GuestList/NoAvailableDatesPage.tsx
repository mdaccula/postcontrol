import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Ticket, MessageCircle, Instagram, Globe } from "lucide-react";

interface NoAvailableDatesPageProps {
  event: {
    name: string;
    event_image_url?: string | null;
    no_dates_message?: string | null;
    no_dates_show_social?: boolean;
    no_dates_show_tickets?: boolean;
    no_dates_show_whatsapp?: boolean;
  };
  agency: {
    name: string;
    logo_url?: string | null;
    instagram_url?: string | null;
    website_url?: string | null;
    whatsapp_group_url?: string | null;
    tickets_group_url?: string | null;
  };
}

export function NoAvailableDatesPage({ event, agency }: NoAvailableDatesPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Logo da Agência */}
        {agency.logo_url && (
          <div className="flex justify-center animate-fade-in">
            <img src={agency.logo_url} alt={agency.name} className="h-40 w-auto object-contain" />
          </div>
        )}

        {/* Card Principal */}
        <Card className="border-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="text-center space-y-4">
            {/* Ícone de Info */}
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>

            <div>
              <CardTitle className="text-3xl font-bold">{event.name}</CardTitle>
              <CardDescription className="text-lg mt-2">{agency.name}</CardDescription>
            </div>
          </CardHeader>

          {/* Imagem do Evento */}
          {event.event_image_url && (
            <div className="px-6">
              <img 
                src={event.event_image_url} 
                alt={event.name}
                className="w-full rounded-lg object-cover max-h-[400px]"
              />
            </div>
          )}

          <CardContent className="space-y-6">{event.event_image_url && <div className="pt-4" />}
            {/* Mensagem Customizável */}
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-center whitespace-pre-wrap">
                {event.no_dates_message || "Não há datas disponíveis no momento. Fique atento às nossas redes sociais!"}
              </AlertDescription>
            </Alert>

            {/* Botões de Ação */}
            {(event.no_dates_show_tickets || event.no_dates_show_whatsapp) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {event.no_dates_show_tickets && agency.tickets_group_url && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => window.open(agency.tickets_group_url!, "_blank")}
                    >
                      <Ticket className="mr-2 h-5 w-5" />
                      Grupo Compra e Venda de Ingressos
                    </Button>
                  )}

                  {event.no_dates_show_whatsapp && agency.whatsapp_group_url && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(agency.whatsapp_group_url!, "_blank")}
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Grupo Exclusivo de Benefícios no WhatsApp
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Redes Sociais */}
            {event.no_dates_show_social && (agency.instagram_url || agency.website_url) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">Fique por dentro das próximas datas</p>

                  <div className="flex justify-center gap-4">
                    {agency.instagram_url && (
                      <a
                        href={agency.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}

                    {agency.website_url && (
                      <a
                        href={agency.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-110"
                        aria-label="Website"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Volte em breve para novas datas!</p>
        </div>
      </div>
    </div>
  );
}
