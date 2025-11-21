import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Check, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  important_info?: string | null;
}

interface DateSelectorProps {
  dates: GuestListDate[];
  selectedDateIds: string[];
  onSelectDates: (dateIds: string[]) => void;
  userGender?: string;
}

export const DateSelector = ({ 
  dates, 
  selectedDateIds, 
  onSelectDates,
  userGender 
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

  const getPriceTypeLabel = (priceType?: string) => {
    switch (priceType) {
      case 'entry_only':
        return 'Entrada';
      case 'consumable_only':
        return 'Consumível';
      case 'entry_plus_half':
        return 'Entrada + Consome Metade';
      case 'entry_plus_full':
        return 'Entrada + Consome Integral';
      default:
        return 'Entrada';
    }
  };

  const getDatePrice = (date: GuestListDate) => {
    const price = userGender === 'feminino' ? date.female_price : userGender === 'masculino' ? date.male_price : null;
    const priceLabel = getPriceTypeLabel(date.price_type);
    
    if (price !== null) {
      return `${formatPrice(price)} (${priceLabel})`;
    }
    return `${formatPrice(date.female_price)} (F) / ${formatPrice(date.male_price)} (M) - ${priceLabel}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          📅 Selecione as datas do evento
        </label>
        <p className="text-xs text-muted-foreground">
          Você pode selecionar múltiplas datas para se inscrever de uma vez
        </p>
        
        <div className="space-y-3">
          {dates.map((date) => {
            console.log('DateSelector - Date important_info:', date.name, date.important_info); // DEBUG
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
                <CardContent className="p-4">
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
                className="w-full h-40 md:h-48 object-contain bg-muted/20"
              />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        {date.name && (
                          <h4 className="font-bold text-base">{date.name}</h4>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {format(new Date(date.event_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
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
                        
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">Valor:</span>
              <span className="text-base font-semibold text-primary">
                {getDatePrice(date)}
              </span>
                        </div>
                        
                        {date.important_info && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                                {date.important_info}
                              </div>
                            </div>
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