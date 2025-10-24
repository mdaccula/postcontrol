import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
  event?: any;
}

interface EventRequirement {
  id?: string;
  required_posts: number;
  required_sales: number;
  description: string;
  display_order: number;
}

export const EventDialog = ({ open, onOpenChange, onEventCreated, event }: EventDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [setor, setSetor] = useState("");
  const [numeroDeVagas, setNumeroDeVagas] = useState("");
  const [requirements, setRequirements] = useState<EventRequirement[]>([
    { required_posts: 0, required_sales: 0, description: "", display_order: 0 }
  ]);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadEventData = async () => {
      if (event) {
        setTitle(event.title || "");
        setDescription(event.description || "");
        setEventDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "");
        setLocation(event.location || "");
        setSetor(event.setor || "");
        setNumeroDeVagas(event.numero_de_vagas ? String(event.numero_de_vagas) : "");
        setEventImageUrl(event.event_image_url || "");
        setIsActive(event.is_active ?? true);

        // Load requirements
        const { data: reqData } = await sb
          .from('event_requirements')
          .select('*')
          .eq('event_id', event.id)
          .order('display_order', { ascending: true });

        if (reqData && reqData.length > 0) {
          setRequirements(reqData);
        } else {
          setRequirements([{ required_posts: 0, required_sales: 0, description: "", display_order: 0 }]);
        }
      } else {
        setTitle("");
        setDescription("");
        setEventDate("");
        setLocation("");
        setSetor("");
        setNumeroDeVagas("");
        setRequirements([{ required_posts: 0, required_sales: 0, description: "", display_order: 0 }]);
        setEventImage(null);
        setEventImageUrl("");
        setIsActive(true);
      }
    };

    if (open) {
      loadEventData();
    }
  }, [event, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para criar um evento.",
          variant: "destructive",
        });
        return;
      }

      let imageUrl = eventImageUrl;

      if (eventImage) {
        const fileExt = eventImage.name.split('.').pop();
        const fileName = `events/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('screenshots')
          .upload(fileName, eventImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
        }

        // Get signed URL with 10 years expiry for permanent event images
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(fileName, 315360000); // 10 years in seconds

        if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          throw new Error(`Erro ao gerar URL da imagem: ${signedUrlError.message}`);
        }

        imageUrl = signedUrlData.signedUrl;
      }

      let eventId = event?.id;

      if (event) {
        const { error } = await sb
          .from('events')
          .update({
            title,
            description,
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            location,
            setor: setor || null,
            numero_de_vagas: numeroDeVagas ? parseInt(numeroDeVagas) : null,
            event_image_url: imageUrl || null,
            is_active: isActive,
          })
          .eq('id', event.id);

        if (error) throw error;

        // Delete old requirements
        await sb
          .from('event_requirements')
          .delete()
          .eq('event_id', event.id);
      } else {
        const { data: newEvent, error } = await sb
          .from('events')
          .insert({
            title,
            description,
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            location,
            setor: setor || null,
            numero_de_vagas: numeroDeVagas ? parseInt(numeroDeVagas) : null,
            event_image_url: imageUrl || null,
            is_active: isActive,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        eventId = newEvent.id;
      }

      // Insert new requirements
      const requirementsToInsert = requirements.map((req, index) => ({
        event_id: eventId,
        required_posts: req.required_posts,
        required_sales: req.required_sales,
        description: req.description || `${req.required_posts} postagens e ${req.required_sales} vendas`,
        display_order: index,
      }));

      const { error: reqError } = await sb
        .from('event_requirements')
        .insert(requirementsToInsert);

      if (reqError) throw reqError;

      toast({
        title: event ? "Evento atualizado!" : "Evento criado!",
        description: event ? "O evento foi atualizado com sucesso." : "O evento foi criado com sucesso.",
      });

      onEventCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: event ? "Erro ao atualizar evento" : "Erro ao criar evento",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Criar Novo Evento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nome *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do evento"
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="eventDate">Data do Evento</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local do evento"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor">Setor</Label>
            <Input
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              placeholder="Setor do evento"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_de_vagas">Número de Vagas (Opcional)</Label>
            <Input
              id="numero_de_vagas"
              type="number"
              value={numeroDeVagas}
              onChange={(e) => setNumeroDeVagas(e.target.value)}
              placeholder="Ex: 50"
              min="0"
              disabled={loading}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Requisitos para Cortesia (Opções OU) *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRequirements([...requirements, { 
                  required_posts: 0, 
                  required_sales: 0, 
                  description: "",
                  display_order: requirements.length 
                }])}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Opção
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure múltiplas combinações. Ex: 10 posts + 0 vendas OU 5 posts + 2 vendas
            </p>
            
            <div className="space-y-3">
              {requirements.map((req, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Opção {index + 1}</Label>
                    {requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRequirements(requirements.filter((_, i) => i !== index))}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Posts *</Label>
                      <Input
                        type="number"
                        value={req.required_posts}
                        onChange={(e) => {
                          const newReqs = [...requirements];
                          newReqs[index].required_posts = parseInt(e.target.value) || 0;
                          setRequirements(newReqs);
                        }}
                        placeholder="0"
                        min="0"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vendas *</Label>
                      <Input
                        type="number"
                        value={req.required_sales}
                        onChange={(e) => {
                          const newReqs = [...requirements];
                          newReqs[index].required_sales = parseInt(e.target.value) || 0;
                          setRequirements(newReqs);
                        }}
                        placeholder="0"
                        min="0"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição (opcional)</Label>
                    <Input
                      value={req.description}
                      onChange={(e) => {
                        const newReqs = [...requirements];
                        newReqs[index].description = e.target.value;
                        setRequirements(newReqs);
                      }}
                      placeholder={`${req.required_posts} postagens e ${req.required_sales} vendas`}
                      disabled={loading}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Evento</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o evento"
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_active">Status do Evento</Label>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer font-normal">
                Evento ativo (visível para os usuários)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_image">Imagem do Evento</Label>
            {(eventImageUrl || eventImage) && (
              <div className="mb-2">
                <img 
                  src={eventImage ? URL.createObjectURL(eventImage) : eventImageUrl} 
                  alt="Preview do evento"
                  className="w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
            <Input
              id="event_image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setEventImage(e.target.files[0]);
                }
              }}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Imagem que será exibida para todos os usuários
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {event ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                event ? "Atualizar Evento" : "Criar Evento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
