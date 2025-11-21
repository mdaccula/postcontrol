import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

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
}

interface DateSelectorProps {
  dates: GuestListDate[];
  selectedDateId: string;
  onSelectDate: (dateId: string) => void;
  userGender?: string;
}

export const DateSelector = ({ 
  dates, 
  selectedDateId, 
  onSelectDate,
  userGender 
}: DateSelectorProps) => {
  const selectedDate = dates.find(d => d.id === selectedDateId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getDisplayPrice = () => {
    if (!selectedDate) return null;
    
    if (userGender === 'feminino') {
      return formatPrice(selectedDate.female_price);
    } else if (userGender === 'masculino') {
      return formatPrice(selectedDate.male_price);
    }
    
    // Mostrar ambos os preços se não houver gênero selecionado
    return `${formatPrice(selectedDate.female_price)} (F) / ${formatPrice(selectedDate.male_price)} (M)`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          📅 Selecione a data do evento
        </label>
        <Select value={selectedDateId} onValueChange={onSelectDate}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolha uma data" />
          </SelectTrigger>
          <SelectContent>
            {dates.map((date) => (
              <SelectItem key={date.id} value={date.id}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(date.event_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDate && (
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {selectedDate.image_url && (
                <div className="rounded-lg overflow-hidden -mx-6 -mt-6 mb-4">
                  <img 
                    src={selectedDate.image_url} 
                    alt={selectedDate.name || "Evento"} 
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              {selectedDate.name && (
                <h4 className="font-bold text-lg">{selectedDate.name}</h4>
              )}
              
              {(selectedDate.start_time || selectedDate.end_time) && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {selectedDate.start_time && selectedDate.end_time ? (
                    <span>{selectedDate.start_time.slice(0, 5)} às {selectedDate.end_time.slice(0, 5)}</span>
                  ) : selectedDate.start_time ? (
                    <span>Início: {selectedDate.start_time.slice(0, 5)}</span>
                  ) : (
                    <span>Término: {selectedDate.end_time.slice(0, 5)}</span>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor da Lista:</span>
                <span className="text-xl font-bold text-primary">
                  {getDisplayPrice()}
                </span>
              </div>
              
              {!userGender && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>💃 Lista Feminina: {formatPrice(selectedDate.female_price)}</div>
                  <div>🕺 Lista Masculina: {formatPrice(selectedDate.male_price)}</div>
                </div>
              )}

              {selectedDate.max_capacity && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>👥 Vagas limitadas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};