import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateTimeBRT } from "@/lib/dateUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GuestListDate {
  id: string;
  event_date: string;
  start_time?: string | null;
  name?: string | null;
  image_url?: string | null;
  important_info?: string | null;
  alternative_link_female?: string | null;
  alternative_link_male?: string | null;
  show_alternative_after_start?: boolean;
}

interface AlternativeLinkCardProps {
  date: GuestListDate;
  eventName: string;
  onLinkClick: (gender: 'feminino' | 'masculino', url: string) => void;
}

export function AlternativeLinkCard({ date, eventName, onLinkClick }: AlternativeLinkCardProps) {
  if (!date.start_time || !date.show_alternative_after_start) return null;
  
  const eventDateTime = parseDateTimeBRT(date.event_date, date.start_time);
  const isPast = eventDateTime < new Date();
  
  if (!isPast) return null;
  
  const displayName = date.name || format(eventDateTime, "dd 'de' MMMM", { locale: ptBR });
  
  return (
    <Card className="border-2 border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="w-5 h-5" />
          <CardTitle className="text-lg">Inscrições Encerradas</CardTitle>
        </div>
        <CardDescription>
          As inscrições para <strong>{displayName}</strong> se encerraram às{' '}
          {format(eventDateTime, "HH:mm 'de' dd/MM/yyyy")}
        </CardDescription>
      </CardHeader>
      
      {date.image_url && (
        <div className="px-6">
          <img src={date.image_url} alt={eventName} className="w-full rounded-lg" />
        </div>
      )}
      
      <CardContent className="pt-4 space-y-4">
        {date.important_info && (
          <Alert className="bg-blue-500/5 border-blue-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm whitespace-pre-wrap">
              {date.important_info}
            </AlertDescription>
          </Alert>
        )}
        
        {(date.alternative_link_female || date.alternative_link_male) && (
          <>
            <p className="text-sm font-medium text-center">
              Opções alternativas para entrada:
            </p>
            
            <div className="grid gap-3">
              {date.alternative_link_female && (
                <Button
                  onClick={() => onLinkClick('feminino', date.alternative_link_female!)}
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Lista Feminina - Clique Aqui
                </Button>
              )}
              
              {date.alternative_link_male && (
                <Button
                  onClick={() => onLinkClick('masculino', date.alternative_link_male!)}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Lista Masculina - Clique Aqui
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
