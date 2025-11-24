import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface GuestListEvent {
  id: string;
  name: string;
  slug: string;
  location: string;
  extra_info: string | null;
  whatsapp_link: string | null;
  agency_phone: string | null;
  is_active: boolean;
  event_image_url?: string | null;
  no_dates_message?: string | null;
  no_dates_show_social?: boolean;
  no_dates_show_tickets?: boolean;
  no_dates_show_whatsapp?: boolean;
  created_at: string;
}

interface EventDialogFormProps {
  event: GuestListEvent | null;
  onSubmit: (data: Partial<GuestListEvent>) => void;
  onCancel: () => void;
}

export function EventDialogForm({ event, onSubmit, onCancel }: EventDialogFormProps) {
  const [formData, setFormData] = useState({
    name: event?.name || "",
    slug: event?.slug || "",
    location: event?.location || "",
    extra_info: event?.extra_info || "",
    whatsapp_link: event?.whatsapp_link || "",
    agency_phone: event?.agency_phone || "",
    is_active: event?.is_active ?? true,
    event_image_url: event?.event_image_url || "",
    no_dates_message: event?.no_dates_message || "Não há datas disponíveis no momento. Fique atento às nossas redes sociais!",
    no_dates_show_social: event?.no_dates_show_social ?? true,
    no_dates_show_tickets: event?.no_dates_show_tickets ?? true,
    no_dates_show_whatsapp: event?.no_dates_show_whatsapp ?? true,
  });

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB');
      return;
    }

    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `event-images/${fileName}`;

      // Upload para o bucket público
      const { error: uploadError } = await supabase.storage
        .from('agency-og-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('agency-og-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, event_image_url: publicUrl });
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, event_image_url: "" });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
          <TabsTrigger value="no-dates">Página Sem Datas</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Local *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: DEDGE Club"
              required
            />
            <p className="text-xs text-muted-foreground">
              Nome do estabelecimento/local onde acontecem os eventos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              placeholder="exemplo-festa"
              required
            />
            <p className="text-xs text-muted-foreground">
              URL: /lista/{formData.slug || "slug-aqui"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_image">Imagem do Evento</Label>
            {formData.event_image_url ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border-2 border-border">
                  <img 
                    src={formData.event_image_url} 
                    alt="Preview" 
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Imagem será exibida na página pública do evento
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="event_image" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-sm text-muted-foreground">Carregando...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                      </>
                    )}
                  </div>
                </label>
                <input
                  id="event_image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra_info">Informações Extras</Label>
            <Textarea
              id="extra_info"
              value={formData.extra_info}
              onChange={(e) => setFormData({ ...formData, extra_info: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_link">Link Grupo WhatsApp</Label>
            <Input
              id="whatsapp_link"
              value={formData.whatsapp_link}
              onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency_phone">Telefone da Agência</Label>
            <Input
              id="agency_phone"
              value={formData.agency_phone}
              onChange={(e) => setFormData({ ...formData, agency_phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Evento Ativo</Label>
          </div>
        </TabsContent>

        <TabsContent value="no-dates" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="no_dates_message">
              Mensagem quando não há datas disponíveis
            </Label>
            <Textarea
              id="no_dates_message"
              value={formData.no_dates_message}
              onChange={(e) => setFormData({ ...formData, no_dates_message: e.target.value })}
              placeholder="Não há datas disponíveis no momento. Fique atento às nossas redes sociais!"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Esta mensagem será exibida quando todas as datas estiverem inativas
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="no_dates_show_social"
                checked={formData.no_dates_show_social} 
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, no_dates_show_social: checked as boolean })
                }
              />
              <Label htmlFor="no_dates_show_social" className="cursor-pointer">
                Mostrar redes sociais
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="no_dates_show_tickets"
                checked={formData.no_dates_show_tickets} 
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, no_dates_show_tickets: checked as boolean })
                }
              />
              <Label htmlFor="no_dates_show_tickets" className="cursor-pointer">
                Mostrar botão de ingressos
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="no_dates_show_whatsapp"
                checked={formData.no_dates_show_whatsapp} 
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, no_dates_show_whatsapp: checked as boolean })
                }
              />
              <Label htmlFor="no_dates_show_whatsapp" className="cursor-pointer">
                Mostrar botão de WhatsApp
              </Label>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Os links das redes sociais (Instagram, Site, WhatsApp, Ingressos) são
              configurados nas <strong>Configurações da Agência</strong>.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{event ? "Atualizar" : "Criar"} Evento</Button>
      </DialogFooter>
    </form>
  );
}
