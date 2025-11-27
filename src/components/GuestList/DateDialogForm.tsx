import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";

interface GuestListDate {
  id: string;
  event_id: string;
  event_date: string;
  female_price: number;
  male_price: number;
  max_capacity: number | null;
  is_active: boolean;
  name?: string | null;
  image_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  auto_deactivate_after_start?: boolean;
  price_type?: string;
  price_types?: string[];
  price_details?: Record<string, { female: number; male: number }>;
  important_info?: string | null;
  alternative_link_female?: string | null;
  alternative_link_male?: string | null;
  show_alternative_after_start?: boolean;
  created_at?: string;
}

interface DateDialogFormProps {
  date: GuestListDate | null;
  onSubmit: (data: Partial<GuestListDate>) => void;
  onCancel: () => void;
}

export function DateDialogForm({ date, onSubmit, onCancel }: DateDialogFormProps) {
  const initializePriceDetails = () => {
    if (date?.price_details && Object.keys(date.price_details).length > 0) {
      return date.price_details;
    }
    // Inicializar com valores padrão dos campos antigos
    const defaultPrice = { female: date?.female_price || 0, male: date?.male_price || 0 };
    return {
      entry_only: defaultPrice,
      consumable_only: defaultPrice,
      entry_plus_half: defaultPrice,
      entry_plus_full: defaultPrice,
    };
  };

  const [formData, setFormData] = useState({
    event_date: date?.event_date || format(new Date(), "yyyy-MM-dd"),
    name: date?.name || "",
    max_capacity: date?.max_capacity || null,
    is_active: date?.is_active ?? true,
    image_url: date?.image_url || "",
    start_time: date?.start_time?.slice(0, 5) || "",
    end_time: date?.end_time?.slice(0, 5) || "",
    auto_deactivate_after_start: date?.auto_deactivate_after_start ?? false,
    price_types: date?.price_types || date?.price_type ? [date.price_type] : ["entry_only"],
    price_details: initializePriceDetails(),
    important_info: date?.important_info || "",
    alternative_link_female: date?.alternative_link_female || "",
    alternative_link_male: date?.alternative_link_male || "",
    show_alternative_after_start: date?.show_alternative_after_start ?? false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(date?.image_url || "");
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!imageFile && date?.image_url) {
      return date.image_url;
    }
    
    if (!imageFile) return formData.image_url;

    setUploading(true);
    try {
      const compressedFile = await imageCompression(imageFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      const fileExt = compressedFile.name.split(".").pop();
      const fileName = `guest-list-dates/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-og-images")
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("agency-og-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da imagem");
      return formData.image_url;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que pelo menos um tipo foi selecionado
    if (formData.price_types.length === 0) {
      toast.error("Selecione pelo menos um tipo de valor");
      return;
    }
    
    const imageUrl = await uploadImage();
    
    // Calcular female_price e male_price para compatibilidade (usar primeiro tipo selecionado)
    const firstType = formData.price_types[0];
    const firstTypePrices = formData.price_details[firstType];
    
    onSubmit({
      ...formData,
      female_price: firstTypePrices.female,
      male_price: firstTypePrices.male,
      image_url: imageUrl || null,
      name: formData.name || null,
      start_time: formData.start_time ? `${formData.start_time}:00` : null,
      end_time: formData.end_time ? `${formData.end_time}:00` : null,
      auto_deactivate_after_start: formData.auto_deactivate_after_start,
      price_types: formData.price_types,
      price_details: formData.price_details,
      important_info: formData.important_info || null,
      alternative_link_female: formData.alternative_link_female || null,
      alternative_link_male: formData.alternative_link_male || null,
      show_alternative_after_start: formData.show_alternative_after_start,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="event_date">Data do Evento *</Label>
        <Input
          id="event_date"
          type="date"
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome da Festa (opcional)</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Noite das Estrelas"
        />
        <p className="text-xs text-muted-foreground">
          Nome específico da festa deste dia (deixe vazio para usar apenas a data)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Foto do Evento (opcional)</Label>
        <div className="space-y-2">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-40 object-cover rounded border"
            />
          )}
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="text-xs text-muted-foreground">
            Imagem específica para esta data/festa
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="important_info">
          <FileText className="inline h-3 w-3 mr-1" />
          Informações Importantes
        </Label>
        <Textarea
          id="important_info"
          value={formData.important_info}
          onChange={(e) => setFormData({ ...formData, important_info: e.target.value })}
          placeholder="Ex: Dress code obrigatório, menores de 18 não entram, etc."
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          ℹ️ Será exibido na página de inscrição para os usuários
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">
            <Clock className="inline h-3 w-3 mr-1" />
            Horário de Início
          </Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">
            <Clock className="inline h-3 w-3 mr-1" />
            Horário de Término
          </Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      {/* Campos de preço removidos - agora são específicos por tipo */}

      <div className="space-y-4">
        <Label>Tipo(s) de Valor e Preços *</Label>
        <p className="text-xs text-muted-foreground -mt-2">
          Selecione os tipos disponíveis e defina os valores para cada um
        </p>
        
        <div className="space-y-4">
          {/* Valor Seco */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="entry_only"
                checked={formData.price_types.includes("entry_only")}
                onCheckedChange={(checked) => {
                  const newPriceTypes = checked
                    ? [...formData.price_types, "entry_only"]
                    : formData.price_types.filter((t) => t !== "entry_only");
                  
                  const newPriceDetails = { ...formData.price_details };
                  if (checked && !newPriceDetails.entry_only) {
                    newPriceDetails.entry_only = { female: 0, male: 0 };
                  }
                  
                  setFormData({
                    ...formData,
                    price_types: newPriceTypes,
                    price_details: newPriceDetails,
                  });
                }}
              />
              <Label htmlFor="entry_only" className="font-medium cursor-pointer">
                Valor Seco (Apenas Entrada)
              </Label>
            </div>
            
            {formData.price_types.includes("entry_only") && (
              <div className="grid grid-cols-2 gap-3 ml-6">
                <div className="space-y-1">
                  <Label htmlFor="entry_only_female" className="text-xs">Feminino (R$)</Label>
                  <Input
                    id="entry_only_female"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_only?.female || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_only: {
                            ...formData.price_details.entry_only,
                            female: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="entry_only_male" className="text-xs">Masculino (R$)</Label>
                  <Input
                    id="entry_only_male"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_only?.male || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_only: {
                            ...formData.price_details.entry_only,
                            male: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Consumível */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consumable_only"
                checked={formData.price_types.includes("consumable_only")}
                onCheckedChange={(checked) => {
                  const newPriceTypes = checked
                    ? [...formData.price_types, "consumable_only"]
                    : formData.price_types.filter((t) => t !== "consumable_only");
                  
                  const newPriceDetails = { ...formData.price_details };
                  if (checked && !newPriceDetails.consumable_only) {
                    newPriceDetails.consumable_only = { female: 0, male: 0 };
                  }
                  
                  setFormData({
                    ...formData,
                    price_types: newPriceTypes,
                    price_details: newPriceDetails,
                  });
                }}
              />
              <Label htmlFor="consumable_only" className="font-medium cursor-pointer">
                Consumível (Entrada Grátis)
              </Label>
            </div>
            
            {formData.price_types.includes("consumable_only") && (
              <div className="grid grid-cols-2 gap-3 ml-6">
                <div className="space-y-1">
                  <Label htmlFor="consumable_only_female" className="text-xs">Feminino (R$)</Label>
                  <Input
                    id="consumable_only_female"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.consumable_only?.female || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          consumable_only: {
                            ...formData.price_details.consumable_only,
                            female: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="consumable_only_male" className="text-xs">Masculino (R$)</Label>
                  <Input
                    id="consumable_only_male"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.consumable_only?.male || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          consumable_only: {
                            ...formData.price_details.consumable_only,
                            male: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entrada + Consome Metade */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="entry_plus_half"
                checked={formData.price_types.includes("entry_plus_half")}
                onCheckedChange={(checked) => {
                  const newPriceTypes = checked
                    ? [...formData.price_types, "entry_plus_half"]
                    : formData.price_types.filter((t) => t !== "entry_plus_half");
                  
                  const newPriceDetails = { ...formData.price_details };
                  if (checked && !newPriceDetails.entry_plus_half) {
                    newPriceDetails.entry_plus_half = { female: 0, male: 0 };
                  }
                  
                  setFormData({
                    ...formData,
                    price_types: newPriceTypes,
                    price_details: newPriceDetails,
                  });
                }}
              />
              <Label htmlFor="entry_plus_half" className="font-medium cursor-pointer">
                Entrada + Consome Metade
              </Label>
            </div>
            
            {formData.price_types.includes("entry_plus_half") && (
              <div className="grid grid-cols-2 gap-3 ml-6">
                <div className="space-y-1">
                  <Label htmlFor="entry_plus_half_female" className="text-xs">Feminino (R$)</Label>
                  <Input
                    id="entry_plus_half_female"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_plus_half?.female || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_plus_half: {
                            ...formData.price_details.entry_plus_half,
                            female: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="entry_plus_half_male" className="text-xs">Masculino (R$)</Label>
                  <Input
                    id="entry_plus_half_male"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_plus_half?.male || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_plus_half: {
                            ...formData.price_details.entry_plus_half,
                            male: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entrada + Consome Valor Integral */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="entry_plus_full"
                checked={formData.price_types.includes("entry_plus_full")}
                onCheckedChange={(checked) => {
                  const newPriceTypes = checked
                    ? [...formData.price_types, "entry_plus_full"]
                    : formData.price_types.filter((t) => t !== "entry_plus_full");
                  
                  const newPriceDetails = { ...formData.price_details };
                  if (checked && !newPriceDetails.entry_plus_full) {
                    newPriceDetails.entry_plus_full = { female: 0, male: 0 };
                  }
                  
                  setFormData({
                    ...formData,
                    price_types: newPriceTypes,
                    price_details: newPriceDetails,
                  });
                }}
              />
              <Label htmlFor="entry_plus_full" className="font-medium cursor-pointer">
                Entrada + Consome Valor Integral
              </Label>
            </div>
            
            {formData.price_types.includes("entry_plus_full") && (
              <div className="grid grid-cols-2 gap-3 ml-6">
                <div className="space-y-1">
                  <Label htmlFor="entry_plus_full_female" className="text-xs">Feminino (R$)</Label>
                  <Input
                    id="entry_plus_full_female"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_plus_full?.female || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_plus_full: {
                            ...formData.price_details.entry_plus_full,
                            female: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="entry_plus_full_male" className="text-xs">Masculino (R$)</Label>
                  <Input
                    id="entry_plus_full_male"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_details.entry_plus_full?.male || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_details: {
                          ...formData.price_details,
                          entry_plus_full: {
                            ...formData.price_details.entry_plus_full,
                            male: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_capacity">Capacidade Máxima (opcional)</Label>
        <Input
          id="max_capacity"
          type="number"
          value={formData.max_capacity || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              max_capacity: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          placeholder="Deixe vazio para ilimitado"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Data Ativa</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_deactivate"
              checked={formData.auto_deactivate_after_start}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, auto_deactivate_after_start: checked })
              }
            />
            <Label htmlFor="auto_deactivate">
              Desativar automaticamente após início
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            A data será desativada automaticamente quando o evento iniciar
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="show_alternative"
              checked={formData.show_alternative_after_start}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, show_alternative_after_start: checked })
              }
            />
            <Label htmlFor="show_alternative">
              Mostrar links alternativos após início
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            Em vez de esconder a data, mostra links alternativos para os usuários
          </p>
        </div>

        {formData.show_alternative_after_start && (
          <div className="space-y-3 pl-9 border-l-2 border-muted">
            <div className="space-y-2">
              <Label htmlFor="alternative_link_female">Link Alternativo - Feminino</Label>
              <Input
                id="alternative_link_female"
                value={formData.alternative_link_female}
                onChange={(e) => setFormData({ ...formData, alternative_link_female: e.target.value })}
                placeholder="https://wa.me/..."
              />
              <p className="text-xs text-muted-foreground">
                Link para lista feminina (ex: WhatsApp, Telegram)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternative_link_male">Link Alternativo - Masculino</Label>
              <Input
                id="alternative_link_male"
                value={formData.alternative_link_male}
                onChange={(e) => setFormData({ ...formData, alternative_link_male: e.target.value })}
                placeholder="https://wa.me/..."
              />
              <p className="text-xs text-muted-foreground">
                Link para lista masculina (ex: WhatsApp, Telegram)
              </p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>{date ? "Atualizar" : "Adicionar"} Data</>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
