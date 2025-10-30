import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Lock, Save, FileText } from "lucide-react";
import { useEventTemplates } from "@/hooks/useEventTemplates";

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
  const [targetGender, setTargetGender] = useState<string[]>([]);
  const [requireInstagramLink, setRequireInstagramLink] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [totalRequiredPosts, setTotalRequiredPosts] = useState<number>(0);
  const [isApproximateTotal, setIsApproximateTotal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const { toast } = useToast();
  const { templates, loadTemplates, saveTemplate, deleteTemplate } = useEventTemplates();

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
        setTargetGender(event.target_gender || []);
        setRequireInstagramLink(event.require_instagram_link || false);
        setInternalNotes(event.internal_notes || "");
        setTotalRequiredPosts(event.total_required_posts || 0);
        setIsApproximateTotal(event.is_approximate_total || false);

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
        setTargetGender([]);
        setRequireInstagramLink(false);
        setInternalNotes("");
        setTotalRequiredPosts(0);
        setIsApproximateTotal(false);
      }
      
      // Load agency_id and templates
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await sb
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .maybeSingle();
        
        const userAgencyId = profileData?.agency_id;
        setAgencyId(userAgencyId);
        
        if (userAgencyId) {
          await loadTemplates(userAgencyId);
        }
      }
    };

    if (open) {
      loadEventData();
    }
  }, [event, open]);

  const loadFromTemplate = (templateData: any) => {
    if (templateData.title) setTitle(templateData.title);
    if (templateData.description) setDescription(templateData.description);
    if (templateData.location) setLocation(templateData.location);
    if (templateData.setor) setSetor(templateData.setor);
    if (templateData.numero_de_vagas) setNumeroDeVagas(String(templateData.numero_de_vagas));
    if (templateData.require_instagram_link !== undefined) setRequireInstagramLink(templateData.require_instagram_link);
    if (templateData.target_gender) setTargetGender(templateData.target_gender);
    if (templateData.requirements) setRequirements(templateData.requirements);
    if (templateData.total_required_posts !== undefined) setTotalRequiredPosts(templateData.total_required_posts);
    if (templateData.is_approximate_total !== undefined) setIsApproximateTotal(templateData.is_approximate_total);
    
    toast({
      title: "Template carregado",
      description: "Os dados do template foram preenchidos no formulário."
    });
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o template.",
        variant: "destructive"
      });
      return;
    }

    const templateData = {
      title,
      description,
      location,
      setor,
      numero_de_vagas: numeroDeVagas ? parseInt(numeroDeVagas) : null,
      require_instagram_link: requireInstagramLink,
      target_gender: targetGender,
      requirements,
      total_required_posts: totalRequiredPosts,
      is_approximate_total: isApproximateTotal
    };

    const success = await saveTemplate(templateName, templateData, agencyId || undefined);
    if (success) {
      setShowSaveTemplateDialog(false);
      setTemplateName("");
    }
  };

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

      // Get user's agency_id from profile
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      const userAgencyId = profileData?.agency_id;

      console.log('👤 User creating event:', { userId: user.id, agencyId: userAgencyId });

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
            target_gender: targetGender,
            require_instagram_link: requireInstagramLink,
            internal_notes: internalNotes,
            total_required_posts: totalRequiredPosts,
            is_approximate_total: isApproximateTotal,
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
            target_gender: targetGender,
            require_instagram_link: requireInstagramLink,
            internal_notes: internalNotes,
            total_required_posts: totalRequiredPosts,
            is_approximate_total: isApproximateTotal,
            created_by: user.id,
            agency_id: userAgencyId,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating event:', error);
          throw error;
        }
        console.log('✅ Event created successfully:', newEvent);
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
          {/* M10: Template selector */}
          {!event && templates.length > 0 && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <Label>Usar Template Salvo (Opcional)</Label>
              </div>
              <Select onValueChange={(value) => {
                const template = templates.find(t => t.id === value);
                if (template) loadFromTemplate(template.template_data);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
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

          <div className="space-y-2">
            <Label htmlFor="total_required_posts">Total de Postagens Obrigatórias *</Label>
            <Input
              id="total_required_posts"
              type="number"
              value={totalRequiredPosts}
              onChange={(e) => setTotalRequiredPosts(parseInt(e.target.value) || 0)}
              placeholder="Ex: 10"
              min="0"
              required
              disabled={loading}
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="is_approximate_total"
                checked={isApproximateTotal}
                onCheckedChange={(checked) => setIsApproximateTotal(checked as boolean)}
                disabled={loading}
              />
              <label
                htmlFor="is_approximate_total"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Aproximado (o número pode mudar)
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Este número será usado para calcular o progresso dos divulgadores. Se marcar como "aproximado", será exibido ao usuário com a indicação de que pode mudar.
            </p>
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
            <p className="text-xs text-muted-foreground">
              Esta descrição será exibida para os usuários no formulário de envio
            </p>
          </div>

          <div className="space-y-2">
            <Label>Gênero Alvo (Opcional)</Label>
            <div className="flex flex-col gap-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="feminino"
                  checked={targetGender.includes("Feminino")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTargetGender([...targetGender, "Feminino"]);
                    } else {
                      setTargetGender(targetGender.filter(g => g !== "Feminino"));
                    }
                  }}
                  disabled={loading}
                />
                <Label htmlFor="feminino" className="cursor-pointer font-normal">
                  Feminino
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="masculino"
                  checked={targetGender.includes("Masculino")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTargetGender([...targetGender, "Masculino"]);
                    } else {
                      setTargetGender(targetGender.filter(g => g !== "Masculino"));
                    }
                  }}
                  disabled={loading}
                />
                <Label htmlFor="masculino" className="cursor-pointer font-normal">
                  Masculino
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lgbtq"
                  checked={targetGender.includes("LGBTQ+")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTargetGender([...targetGender, "LGBTQ+"]);
                    } else {
                      setTargetGender(targetGender.filter(g => g !== "LGBTQ+"));
                    }
                  }}
                  disabled={loading}
                />
                <Label htmlFor="lgbtq" className="cursor-pointer font-normal">
                  LGBTQ+
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="require_instagram_link">Link do Instagram</Label>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Checkbox
                id="require_instagram_link"
                checked={requireInstagramLink}
                onCheckedChange={(checked) => setRequireInstagramLink(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="require_instagram_link" className="cursor-pointer font-normal">
                Solicitar link do perfil do Instagram no formulário de envio
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="internal_notes">Informações Internas</Label>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Textarea
              id="internal_notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Notas visíveis apenas para administradores"
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              🔒 Estas informações são privadas e nunca serão exibidas para os usuários
            </p>
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
            {!event && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(true)}
                disabled={loading || !title}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar como Template
              </Button>
            )}
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

      {/* M10: Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Evento Corporativo Padrão"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSaveTemplateDialog(false);
                  setTemplateName("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveAsTemplate}>
                Salvar Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
