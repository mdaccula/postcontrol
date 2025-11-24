import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [formData, setFormData] = useState({
    event_date: date?.event_date || format(new Date(), "yyyy-MM-dd"),
    name: date?.name || "",
    female_price: date?.female_price || 0,
    male_price: date?.male_price || 0,
    max_capacity: date?.max_capacity || null,
    is_active: date?.is_active ?? true,
    image_url: date?.image_url || "",
    start_time: date?.start_time?.slice(0, 5) || "",
    end_time: date?.end_time?.slice(0, 5) || "",
    auto_deactivate_after_start: date?.auto_deactivate_after_start ?? false,
    price_type: date?.price_type || "entry_only",
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
    
    const imageUrl = await uploadImage();
    
    onSubmit({
      ...formData,
      image_url: imageUrl || null,
      name: formData.name || null,
      start_time: formData.start_time ? `${formData.start_time}:00` : null,
      end_time: formData.end_time ? `${formData.end_time}:00` : null,
      auto_deactivate_after_start: formData.auto_deactivate_after_start,
      price_type: formData.price_type,
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="female_price">Valor Feminino (R$) *</Label>
          <Input
            id="female_price"
            type="number"
            step="0.01"
            value={formData.female_price}
            onChange={(e) =>
              setFormData({ ...formData, female_price: parseFloat(e.target.value) })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="male_price">Valor Masculino (R$) *</Label>
          <Input
            id="male_price"
            type="number"
            step="0.01"
            value={formData.male_price}
            onChange={(e) =>
              setFormData({ ...formData, male_price: parseFloat(e.target.value) })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price_type">Tipo de Valor *</Label>
        <Select
          value={formData.price_type}
          onValueChange={(value) => setFormData({ ...formData, price_type: value })}
        >
          <SelectTrigger id="price_type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry_only">Valor Seco (Apenas Entrada)</SelectItem>
            <SelectItem value="consumable_only">Consumível (Entrada Grátis)</SelectItem>
            <SelectItem value="entry_plus_half">Entrada + Consome Metade</SelectItem>
            <SelectItem value="entry_plus_full">Entrada + Consome Valor Integral</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Como o valor será cobrado/utilizado no evento
        </p>
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
