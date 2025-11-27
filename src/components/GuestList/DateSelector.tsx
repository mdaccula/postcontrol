import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Check, Music } from "lucide-react";
import { parseEventDateBRT, hasEventPassed } from "@/lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlternativeLinkCard } from "./AlternativeLinkCard";

interface GuestListDate {
  id: string;
  event_date: string;
  female_price: number;
  male_price: number;
  max_capacity: number | null;
  is_active: boolean;
  name?: string | null;
  image_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price_type?: string;
  price_types?: string[];
  price_details?: Record<string, { female: number; male: number }>;
  important_info?: string | null;
  alternative_link_female?: string | null;
  alternative_link_male?: string | null;
  show_alternative_after_start?: boolean;
}

interface DateSelectorProps {
  dates: GuestListDate[];
  selectedDateIds: string[];
  onSelectDates: (dateIds: string[]) => void;
  userGender?: string;
  eventName?: string;
}

export const DateSelector = ({
  dates,
  selectedDateIds,
  onSelectDates,
  userGender,
  eventName
}: DateSelectorProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  
  const handleToggleDate = (dateId: string) => {
    if (selectedDateIds.includes(dateId)) {
      onSelectDates(selectedDateIds.filter(id => id !== dateId));
    } else {
      onSelectDates([...selectedDateIds, dateId]);
    }
  };

  const handleAlternativeLinkClick = (gender: 'feminino' | 'masculino', url: string) => {
    console.log('Alternative link clicked:', { gender, url });
    window.open(url, '_blank');
  };
  
  const getPriceTypeLabel = (priceType?: string) => {
    switch (priceType) {
      case 'entry_only':
        return 'Valor Seco (Apenas Entrada)';
      case 'consumable_only':
        return 'Consumível (Entrada Grátis)';
      case 'entry_plus_half':
        return 'Entrada + Consome Metade';
      case 'entry_plus_full':
        return 'Entrada + Consome Integral';
      default:
        return 'Valor Seco';
    }
  };
  
  const getDatePrices = (date: GuestListDate) => {
    const orderedTypes: string[] = ['entry_only', 'consumable_only', 'entry_plus_half', 'entry_plus_full'];

    // Prioridade: usar explicitamente o que foi marcado em price_types
    let types = date.price_types && date.price_types.length > 0
      ? date.price_types
      : [];

    // Fallback: se não houver price_types (dados antigos ou inconsistentes),
    // inferir a partir dos tipos que possuem preço configurado em price_details
    if (types.length === 0 && date.price_details) {
      types = orderedTypes.filter((type) => {
        const prices = date.price_details?.[type];
        return prices && (prices.female > 0 || prices.male > 0);
      });
    }

    // Fallback final para dados bem antigos: usar price_type único ou entry_only
    if (types.length === 0) {
      types = date.price_type ? [date.price_type] : ['entry_only'];
    }

    return types.map((type) => {
      const prices = date.price_details?.[type] || {
        female: date.female_price,
        male: date.male_price,
      };

      const priceLabel = getPriceTypeLabel(type);

      if (userGender === 'feminino') {
        return { label: priceLabel, price: formatPrice(prices.female) };
      } else if (userGender === 'masculino') {
        return { label: priceLabel, price: formatPrice(prices.male) };
      } else {
        return {
          label: priceLabel,
          price: `${formatPrice(prices.female)} (F) / ${formatPrice(prices.male)} (M)`,
        };
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="font-medium text-foreground text-base">
          Selecione as datas do evento
        </label>
        <p className="text-muted-foreground text-base font-medium">
          Você pode selecionar múltiplas datas para se inscrever de uma vez
        </p>
        
        <div className="space-y-3">
          {dates.map(date => {
            // Verificar se evento passou e tem links alternativos
            const isPast = date.start_time && hasEventPassed(date.event_date, date.start_time);
            const hasAlternative = date.show_alternative_after_start && isPast &&
                                  (date.alternative_link_female || date.alternative_link_male);
            
            if (hasAlternative) {
              return (
                <AlternativeLinkCard
                  key={date.id}
                  date={date}
                  eventName={eventName || 'Evento'}
                  onLinkClick={handleAlternativeLinkClick}
                />
              );
            }
            
            // Card normal de seleção
            const isSelected = selectedDateIds.includes(date.id);
            
            return (
              <Card 
                key={date.id} 
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleToggleDate(date.id)}
              >
                <CardContent className="p-4 px-0 mx-0">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleToggleDate(date.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      {date.image_url && (
                        <div className="rounded-lg overflow-hidden">
                          <img 
                            src={date.image_url} 
                            alt={date.name || "Evento"} 
                            className="w-full h-60 md:h-50 object-contain bg-muted/20"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        {date.name && (
                          <h4 className="text-lg text-left font-semibold my-[20px]">
                            {date.name}
                          </h4>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {format(parseEventDateBRT(date.event_date), "EEEE, dd 'de' MMMM", {
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        
                        {(date.start_time || date.end_time) && (
                          <div className="text-xs text-muted-foreground">
                            {date.start_time && date.end_time ? (
                              <span>{date.start_time.slice(0, 5)} às {date.end_time.slice(0, 5)}</span>
                            ) : date.start_time ? (
                              <span>Início: {date.start_time.slice(0, 5)}</span>
                            ) : (
                              <span>Término: {date.end_time.slice(0, 5)}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="pt-1 flex-col flex items-start justify-between my-[20px]">
                          <span className="text-xs text-muted-foreground font-bold py-0 mt-0 my-0">
                            {getDatePrices(date).length > 1 ? 'Valores:' : 'Valor:'}
                          </span>
                          <div className="space-y-1 w-full">
                            {getDatePrices(date).map((priceInfo, idx) => (
                              <div key={idx} className="flex flex-col items-start">
                                <span className="text-xs text-muted-foreground">
                                  {priceInfo.label}
                                </span>
                                <span className="font-semibold text-base text-left text-slate-900 px-0 py-0">
                                  {priceInfo.price}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {date.important_info && (
                          <div className="mt-3 text-sm font-medium text-primary whitespace-pre-wrap gap-2 flex items-center justify-start">
                            <Music className="h-4 w-4 mt-0.5" />
                            <span className="text-slate-950 mx-0 my-[10px]">
                              {date.important_info}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {selectedDateIds.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-2">
            ⚠️ Selecione pelo menos uma data para continuar
          </p>
        )}
        
        {selectedDateIds.length > 0 && (
          <p className="text-sm text-primary font-medium text-center pt-2">
            ✓ {selectedDateIds.length} data{selectedDateIds.length > 1 ? 's' : ''} selecionada{selectedDateIds.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};
