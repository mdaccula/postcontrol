import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Lock, Save, FileText, X, Info, Settings, Users, Sparkles, Target } from "lucide-react";
import { useEventTemplates } from "@/hooks/useEventTemplates";
import { useQueryClient } from '@tanstack/react-query';

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
  const [producerName, setProducerName] = useState("");
  const [numeroDeVagas, setNumeroDeVagas] = useState("");
  const [eventSlug, setEventSlug] = useState("");
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
  const [eventPurpose, setEventPurpose] = useState<string>("divulgacao");
  const [acceptSales, setAcceptSales] = useState(false);
  const [acceptPosts, setAcceptPosts] = useState(true);
  const [requireProfileScreenshot, setRequireProfileScreenshot] = useState(false);
  const [requirePostScreenshot, setRequirePostScreenshot] = useState(false);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [whatsappGroupTitle, setWhatsappGroupTitle] = useState("");
  const [requireTicketerEmail, setRequireTicketerEmail] = useState(false);
  const [ticketerName, setTicketerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const { toast } = useToast();
  const { templates, loadTemplates, saveTemplate, deleteTemplate } = useEventTemplates();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadEventData = async () => {
      if (event) {
        setTitle(event.title || "");
        setDescription(event.description || "");
        // ✅ ITEM 8: Forçar horário fixo sem conversão de timezone
      if (event.event_date) {
        // 🔧 ITEM 8: Converter de UTC para horário de São Paulo
        const utcDate = new Date(event.event_date);
        
        // Obter offset de São Paulo (-03:00)
        const saoPauloOffset = -3 * 60; // -180 minutos
        const localDate = new Date(utcDate.getTime() + saoPauloOffset * 60 * 1000);
        
        // Formatar para datetime-local (YYYY-MM-DDTHH:mm)
        const year = localDate.getUTCFullYear();
        const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(localDate.getUTCDate()).padStart(2, '0');
        const hours = String(localDate.getUTCHours()).padStart(2, '0');
        const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
        
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        setEventDate(formattedDate);
        
        console.log('📅 Carregando data do evento:', {
          utc: utcDate.toISOString(),
          saoPaulo: formattedDate,
          original: event.event_date
        });
      } else {
        setEventDate("");
      }
        setLocation(event.location || "");
        setSetor(event.setor || "");
        setProducerName(event.producer_name || "");
        setNumeroDeVagas(event.numero_de_vagas ? String(event.numero_de_vagas) : "");
        setEventSlug(event.event_slug || "");
        setEventImageUrl(event.event_image_url || "");
        setIsActive(event.is_active ?? true);
        setTargetGender(event.target_gender || []);
        setRequireInstagramLink(event.require_instagram_link || false);
        setInternalNotes(event.internal_notes || "");
        setTotalRequiredPosts(event.total_required_posts || 0);
        setIsApproximateTotal(event.is_approximate_total || false);
        setEventPurpose(event.event_purpose || "divulgacao");
        setAcceptSales(event.accept_sales || false);
        setAcceptPosts(event.accept_posts ?? true);
        setRequireProfileScreenshot(event.require_profile_screenshot || false);
        setRequirePostScreenshot(event.require_post_screenshot || false);
        setWhatsappGroupUrl(event.whatsapp_group_url || "");
        setWhatsappGroupTitle(event.whatsapp_group_title || "");
        setRequireTicketerEmail(!!event.ticketer_email);
        setTicketerName(event.ticketer_email || "");

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
        setProducerName("");
        setNumeroDeVagas("");
        setEventSlug("");
        setRequirements([{ required_posts: 0, required_sales: 0, description: "", display_order: 0 }]);
        setEventImage(null);
        setEventImageUrl("");
        setIsActive(true);
        setTargetGender([]);
        setRequireInstagramLink(false);
        setInternalNotes("");
        setTotalRequiredPosts(0);
        setIsApproximateTotal(false);
        setEventPurpose("divulgacao");
        setAcceptSales(false);
        setAcceptPosts(true);
        setRequireProfileScreenshot(false);
        setRequirePostScreenshot(false);
        setWhatsappGroupUrl("");
        setWhatsappGroupTitle("");
        setRequireTicketerEmail(false);
        setTicketerName("");
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
      let oldImagePath: string | null = null;

      // 🔧 ITEM 10 - PASSO 1: Extrair path da imagem antiga ANTES de qualquer operação
      if (event?.event_image_url) {
        try {
          const url = new URL(event.event_image_url);
          const pathMatch = url.pathname.match(/\/screenshots\/(.+?)(\?|$)/);
          if (pathMatch) {
            oldImagePath = pathMatch[1];
            console.log('🗑️ Imagem antiga detectada:', oldImagePath);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao extrair path da imagem antiga:', error);
        }
      }

      // 🔧 ITEM 10 - PASSO 2: Upload da nova imagem (se houver)
      if (eventImage) {
        const fileExt = eventImage.name.split('.').pop();
        
        // 🔧 CORREÇÃO: Garantir nome ABSOLUTAMENTE único
        const eventIdPart = event?.id || 'new';
        const timestampPart = Date.now();
        const randomPart = crypto.randomUUID().slice(0, 8);
        const fileName = `events/${eventIdPart}_${timestampPart}_${randomPart}.${fileExt}`;
        
        console.log('📤 Fazendo upload para:', fileName);
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('screenshots')
          .upload(fileName, eventImage, {
            cacheControl: '3600',
            upsert: false // 🔧 IMPORTANTE: Nunca sobrescrever
          });

        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
        }

        console.log('✅ Upload bem-sucedido:', uploadData);

        // Gerar URL assinada
        const { data: signedData, error: signedError } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(fileName, 31536000); // 1 ano

        if (signedError) throw signedError;

        imageUrl = signedData.signedUrl;
        console.log('✅ URL assinada gerada:', imageUrl);
      }

      let eventId = event?.id;

      // 🔧 ITEM 10 - PASSO 3: Salvar evento no banco ANTES de deletar imagem antiga
      if (event) {
        const { error } = await sb
          .from('events')
          .update({
            title,
            description,
        event_date: eventDate ? (() => {
          // 🔧 ITEM 8: Converter de São Paulo para UTC corretamente
          // eventDate está em formato "YYYY-MM-DDTHH:mm" (hora local de SP)
          
          // Adicionar segundos e offset de São Paulo
          const dateWithOffset = `${eventDate}:00-03:00`;
          const utcDate = new Date(dateWithOffset);
          
          console.log('💾 Salvando data do evento:', {
            input: eventDate,
            withOffset: dateWithOffset,
            utc: utcDate.toISOString()
          });
          
          return utcDate.toISOString();
        })() : null,
            location,
            setor: setor || null,
            producer_name: producerName || null,
            numero_de_vagas: numeroDeVagas ? parseInt(numeroDeVagas) : null,
            event_slug: eventSlug.trim() || null,
            event_image_url: imageUrl || null, // 🆕 Nova URL
            is_active: isActive,
            target_gender: targetGender,
            require_instagram_link: requireInstagramLink,
            internal_notes: internalNotes,
            total_required_posts: totalRequiredPosts,
            is_approximate_total: isApproximateTotal,
            event_purpose: eventPurpose,
            accept_sales: acceptSales,
            accept_posts: acceptPosts,
            require_profile_screenshot: requireProfileScreenshot,
            require_post_screenshot: requirePostScreenshot,
            whatsapp_group_url: whatsappGroupUrl || null,
            whatsapp_group_title: whatsappGroupTitle || null,
            ticketer_email: requireTicketerEmail ? ticketerName.trim() : null,
          })
          .eq('id', event.id);

        if (error) throw error;
        console.log('✅ Evento atualizado no banco');

        // Reset user goals that reference old requirements for this event
        console.log('🔄 Resetando metas dos usuários para este evento antes de atualizar requisitos:', event.id);
        const { error: resetGoalsError } = await sb
          .from('user_event_goals')
          .update({
            achieved_requirement_id: null,
            goal_achieved: false,
            goal_achieved_at: null,
          })
          .eq('event_id', event.id);

        if (resetGoalsError) {
          console.error('❌ Erro ao resetar metas de usuários:', resetGoalsError);
          throw new Error(`Erro ao resetar metas de usuários: ${resetGoalsError.message}`);
        }
        console.log('✅ Metas de usuários resetadas para o evento');

        // Delete old requirements
        console.log('🗑️ Deletando requisitos antigos do evento:', event.id);
        const { error: deleteReqError } = await sb
          .from('event_requirements')
          .delete()
          .eq('event_id', event.id);
        
        if (deleteReqError) {
          console.error('❌ Erro ao deletar requisitos antigos:', deleteReqError);
          throw new Error(`Erro ao deletar requisitos antigos: ${deleteReqError.message}`);
        }
        console.log('✅ Requisitos antigos deletados');
      } else {
        const { data: newEvent, error } = await sb
          .from('events')
          .insert({
            title,
            description,
            // ✅ ITEM 8: Adicionar offset -03:00 antes de converter para ISO
            event_date: eventDate ? (new Date(eventDate + ':00-03:00').toISOString()) : null,
            location,
            setor: setor || null,
            producer_name: producerName || null,
            numero_de_vagas: numeroDeVagas ? parseInt(numeroDeVagas) : null,
            event_slug: eventSlug.trim() || null,
            event_image_url: imageUrl || null,
            is_active: isActive,
            target_gender: targetGender,
            require_instagram_link: requireInstagramLink,
            internal_notes: internalNotes,
            total_required_posts: totalRequiredPosts,
            is_approximate_total: isApproximateTotal,
            event_purpose: eventPurpose,
            accept_sales: acceptSales,
            accept_posts: acceptPosts,
            require_profile_screenshot: requireProfileScreenshot,
            require_post_screenshot: requirePostScreenshot,
            whatsapp_group_url: whatsappGroupUrl || null,
            whatsapp_group_title: whatsappGroupTitle || null,
            ticketer_email: requireTicketerEmail ? ticketerName.trim() : null,
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

      // 🔧 ITEM 10 - PASSO 4: Deletar imagem antiga APENAS APÓS sucesso
      if (oldImagePath && eventImage) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('screenshots')
            .remove([oldImagePath]);
          
          if (deleteError) {
            console.warn('⚠️ Erro ao deletar imagem antiga (não crítico):', deleteError);
          } else {
            console.log('✅ Imagem antiga deletada:', oldImagePath);
          }
        } catch (error) {
          console.warn('⚠️ Exceção ao deletar imagem antiga (não crítico):', error);
        }
      }

      // Insert new requirements
      console.log('📝 Inserindo novos requisitos:', requirements.length);
      const requirementsToInsert = requirements.map((req, index) => ({
        event_id: eventId,
        required_posts: req.required_posts,
        required_sales: req.required_sales,
        description: req.description || `${req.required_posts} postagens e ${req.required_sales} vendas`,
        display_order: index,
      }));

      console.log('📋 Requisitos a inserir:', requirementsToInsert);
      const { error: reqError } = await sb
        .from('event_requirements')
        .insert(requirementsToInsert);

      if (reqError) {
        console.error('❌ Erro ao inserir requisitos:', reqError);
        throw reqError;
      }
      console.log('✅ Requisitos inseridos com sucesso');

      toast({
        title: event ? "Evento atualizado!" : "Evento criado!",
        description: event ? "O evento foi atualizado com sucesso." : "O evento foi criado com sucesso.",
      });

      // 🆕 Forçar atualização do cache de eventos
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      console.log('✅ Cache de eventos invalidado - eventos serão atualizados automaticamente');

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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Criar Novo Evento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
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

          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basico" className="text-xs sm:text-sm">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Básico</span>
              </TabsTrigger>
              <TabsTrigger value="requisitos" className="text-xs sm:text-sm">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Requisitos</span>
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="text-xs sm:text-sm">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="publico" className="text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Público</span>
              </TabsTrigger>
              <TabsTrigger value="avancado" className="text-xs sm:text-sm">
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Avançado</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: INFORMAÇÕES BÁSICAS */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nome do Evento *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do evento"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setor">Setor</Label>
                  <Input
                    id="setor"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: Pista, Camarote"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producer_name">Produtor(a)</Label>
                  <Input
                    id="producer_name"
                    value={producerName}
                    onChange={(e) => setProducerName(e.target.value)}
                    placeholder="Nome do produtor/produtora do evento"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional - Será exibido para os divulgadores
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_de_vagas">Número de Vagas</Label>
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
                <Label htmlFor="event_slug">Slug do Evento (URL Pública)</Label>
                <Input
                  id="event_slug"
                  value={eventSlug}
                  onChange={(e) => {
                    const slug = e.target.value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');
                    setEventSlug(slug);
                  }}
                  placeholder="ex: black-friday-2025"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio se não quiser URL pública
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventImage">Imagem do Evento</Label>
                {(eventImageUrl || eventImage) && (
                  <div className="relative w-full max-w-sm">
                    <img 
                      src={eventImage ? URL.createObjectURL(eventImage) : eventImageUrl} 
                      alt="Preview" 
                      className="w-full h-auto rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setEventImage(null);
                        setEventImageUrl("");
                        const fileInput = document.getElementById('eventImage') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Input
                  id="eventImage"
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
                  Formatos: JPG, PNG, WEBP. Máximo 5MB
                </p>
              </div>
            </TabsContent>

            {/* ABA 2: REQUISITOS & METAS */}
            <TabsContent value="requisitos" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="total_required_posts">
                  Quantidade de Postagens Previstas <span className="text-xs text-muted-foreground">(apenas informativo)</span>
                </Label>
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
                    className="text-sm font-medium cursor-pointer"
                  >
                    Número aproximado (pode mudar)
                  </label>
                </div>
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
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex: 10 posts + 0 vendas OU 5 posts + 2 vendas
                </p>
                
                <div className="space-y-3">
                  {requirements.map((req, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Opção {index + 1}</Label>
                        {requirements.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRequirements(requirements.filter((_, i) => i !== index))}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                          value={req.description}
                          onChange={(e) => {
                            const newReqs = [...requirements];
                            newReqs[index].description = e.target.value;
                            setRequirements(newReqs);
                          }}
                          placeholder="Ex: Ideal para pequenos divulgadores"
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Metas (deixe zerado se não definido)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Posts Obrigatórios</Label>
                            <Input
                              type="number"
                              min="0"
                              value={req.required_posts}
                              onChange={(e) => {
                                const newReqs = [...requirements];
                                newReqs[index].required_posts = parseInt(e.target.value) || 0;
                                setRequirements(newReqs);
                              }}
                              disabled={loading}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Vendas Obrigatórias</Label>
                            <Input
                              type="number"
                              min="0"
                              value={req.required_sales}
                              onChange={(e) => {
                                const newReqs = [...requirements];
                                newReqs[index].required_sales = parseInt(e.target.value) || 0;
                                setRequirements(newReqs);
                              }}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: CONFIGURAÇÕES */}
            <TabsContent value="configuracoes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="event_purpose">Tipo de Evento *</Label>
                <Select value={eventPurpose} onValueChange={setEventPurpose} disabled={loading}>
                  <SelectTrigger id="event_purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divulgacao">Divulgação</SelectItem>
                    <SelectItem value="selecao_perfil">Seleção de Perfil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipos de Submissão Aceitos *</Label>
                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accept_posts"
                      checked={acceptPosts}
                      onCheckedChange={(checked) => setAcceptPosts(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="accept_posts" className="cursor-pointer font-normal">
                      Aceitar Postagens
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accept_sales"
                      checked={acceptSales}
                      onCheckedChange={(checked) => setAcceptSales(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="accept_sales" className="cursor-pointer font-normal">
                      Aceitar Comprovantes de Venda
                    </Label>
                  </div>
                </div>
              </div>

              {eventPurpose === "selecao_perfil" && (
                <div className="space-y-4 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                  <Label className="text-base font-semibold">
                    Configurações de Seleção de Perfil
                  </Label>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                      <div className="space-y-0.5">
                        <Label htmlFor="require_profile_screenshot" className="cursor-pointer">
                          Exigir print do perfil
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Usuário deve enviar screenshot do perfil para validação
                        </p>
                      </div>
                      <Checkbox
                        id="require_profile_screenshot"
                        checked={requireProfileScreenshot}
                        onCheckedChange={(checked) => setRequireProfileScreenshot(checked as boolean)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
                      <div className="space-y-0.5">
                        <Label htmlFor="require_post_screenshot" className="cursor-pointer">
                          Exigir print de postagem
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Usuário deve enviar screenshot de uma postagem
                        </p>
                      </div>
                      <Checkbox
                        id="require_post_screenshot"
                        checked={requirePostScreenshot}
                        onCheckedChange={(checked) => setRequirePostScreenshot(checked as boolean)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Group para AMBOS os tipos de evento */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Label className="text-base font-semibold">Grupo WhatsApp (Opcional)</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_group_url">URL do Grupo</Label>
                  <Input
                    id="whatsapp_group_url"
                    value={whatsappGroupUrl}
                    onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp_group_title">Título do Grupo</Label>
                  <Input
                    id="whatsapp_group_title"
                    value={whatsappGroupTitle}
                    onChange={(e) => setWhatsappGroupTitle(e.target.value)}
                    placeholder="Ex: Grupo VIP - Nome do Evento"
                    disabled={loading}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Link enviado ao divulgador quando atingir a meta
                </p>
              </div>
            </TabsContent>

            {/* ABA 4: DESCRIÇÃO & PÚBLICO */}
            <TabsContent value="publico" className="space-y-4 mt-4">
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
                <Label>Gênero Alvo (Opcional)</Label>
                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
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

              <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                <Checkbox
                  id="require_instagram_link"
                  checked={requireInstagramLink}
                  onCheckedChange={(checked) => setRequireInstagramLink(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="require_instagram_link" className="cursor-pointer font-normal">
                  Solicitar link do Instagram no formulário
                </Label>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                <Checkbox
                  id="require_ticketer_email"
                  checked={requireTicketerEmail}
                  onCheckedChange={(checked) => setRequireTicketerEmail(checked as boolean)}
                  disabled={loading}
                />
                <div className="flex-1">
                  <Label htmlFor="require_ticketer_email" className="cursor-pointer font-normal">
                    Solicitar e-mail para ticketeira
                  </Label>
                </div>
              </div>

              {requireTicketerEmail && (
                <div className="space-y-2 ml-7">
                  <Label htmlFor="ticketerName">Nome da Ticketeira *</Label>
                  <Input
                    id="ticketerName"
                    placeholder="Ex: Sympla, Eventbrite..."
                    value={ticketerName}
                    onChange={(e) => setTicketerName(e.target.value)}
                    disabled={loading}
                    required={requireTicketerEmail}
                  />
                </div>
              )}
            </TabsContent>

            {/* ABA 5: AVANÇADO */}
            <TabsContent value="avancado" className="space-y-4 mt-4">
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
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  🔒 Informações privadas, nunca exibidas para usuários
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Status do Evento</Label>
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer font-normal">
                    Evento ativo (visível para usuários)
                  </Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4 border-t">
            {!event && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(true)}
                disabled={loading || !title}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Template
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
                event ? "Atualizar" : "Criar Evento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Save Template Dialog */}
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
