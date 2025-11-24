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

interface GuestListEvent {
  id: string;
  name: string;
  slug: string;
  location: string;
  extra_info: string | null;
  whatsapp_link: string | null;
  agency_phone: string | null;
  is_active: boolean;
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
    no_dates_message: event?.no_dates_message || "Não há datas disponíveis no momento. Fique atento às nossas redes sociais!",
    no_dates_show_social: event?.no_dates_show_social ?? true,
    no_dates_show_tickets: event?.no_dates_show_tickets ?? true,
    no_dates_show_whatsapp: event?.no_dates_show_whatsapp ?? true,
  });

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
