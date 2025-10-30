import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Upload, ArrowLeft, X, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { z } from "zod";

interface Post {
  id: string;
  post_number: number;
  deadline: string;
  event_id: string;
}

  interface Event {
    id: string;
    title: string;
    description: string | null;
    event_date: string | null;
    location: string | null;
    setor: string | null;
    numero_de_vagas: number | null;
    event_image_url: string | null;
    require_instagram_link: boolean;
    event_purpose?: string;
    accept_sales?: boolean;
    accept_posts?: boolean;
    require_profile_screenshot?: boolean;
    require_post_screenshot?: boolean;
    whatsapp_group_url?: string;
    whatsapp_group_title?: string;
    target_gender?: string[];
  }

interface EventRequirement {
  id: string;
  required_posts: number;
  required_sales: number;
  description: string;
  display_order: number;
}

// Validation schemas
const submitFormSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  instagram: z.string().trim().min(1, "Instagram é obrigatório").max(50, "Instagram muito longo"),
  phone: z
    .string()
    .trim()
    .regex(/^\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})$/, "Formato de telefone inválido. Use: (00) 00000-0000"),
  instagramLink: z.string().optional(),
});

const instagramLinkSchema = z
  .string()
  .trim()
  .min(1, "Link do Instagram é obrigatório")
  .refine(
    (val) => val.includes("instagram.com/") || val.startsWith("@"),
    "Formato inválido. Use: https://instagram.com/usuario ou @usuario"
  );

const Submit = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [hasExistingPhone, setHasExistingPhone] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedPost, setSelectedPost] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [requirements, setRequirements] = useState<EventRequirement[]>([]);
  const [submissionType, setSubmissionType] = useState<string>("post");
  const [salesProofFile, setSalesProofFile] = useState<File | null>(null);
  const [salesProofPreview, setSalesProofPreview] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  // 🆕 Estados para seleção de perfil
  const [profileScreenshotFile, setProfileScreenshotFile] = useState<File | null>(null);
  const [profileScreenshotPreview, setProfileScreenshotPreview] = useState<string | null>(null);
  const [followersRange, setFollowersRange] = useState<string>("");

  useEffect(() => {
    loadEvents();
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      loadPostsForEvent(selectedEvent);
      loadRequirementsForEvent(selectedEvent);
    } else {
      setPosts([]);
      setRequirements([]);
      setSelectedPost("");
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    console.log('🔄 Carregando eventos...');
    
    if (!user) {
      console.log('❌ Usuário não logado');
      setEvents([]);
      return;
    }

    // 1. Buscar contexto da agência (via URL query param ou última acessada)
    const urlParams = new URLSearchParams(window.location.search);
    let contextAgencyId = urlParams.get('agency');

    if (!contextAgencyId) {
      // Buscar última agência acessada pelo usuário
      const { data: userAgencies, error: agenciesError } = await sb
        .from('user_agencies')
        .select('agency_id')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false })
        .limit(1);

      if (agenciesError) {
        console.error('❌ Erro ao buscar agências do usuário:', agenciesError);
        toast({
          title: "Erro de configuração",
          description: "Não foi possível carregar suas agências.",
          variant: "destructive"
        });
        return;
      }

      if (!userAgencies || userAgencies.length === 0) {
        console.warn('⚠️ Usuário sem agência vinculada');
        toast({
          title: "Sem agência vinculada",
          description: "Você precisa se cadastrar através do link de uma agência.",
          variant: "destructive"
        });
        setEvents([]);
        return;
      }

      contextAgencyId = userAgencies[0].agency_id;
    }

    console.log('🏢 Contexto da agência:', contextAgencyId);
    setAgencyId(contextAgencyId); // ✅ Armazenar agency_id no estado

    // 2. Atualizar last_accessed_at
    await sb
      .from('user_agencies')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('agency_id', contextAgencyId);

    // 3. Buscar eventos APENAS da agência no contexto
    const { data, error } = await sb
      .from("events")
      .select("id, title, description, event_date, location, setor, numero_de_vagas, event_image_url, require_instagram_link, event_purpose, accept_sales, accept_posts, require_profile_screenshot, require_post_screenshot, whatsapp_group_url, target_gender")
      .eq("is_active", true)
      .eq("agency_id", contextAgencyId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("❌ Erro ao carregar eventos:", error);
      return;
    }

    console.log(`✅ ${data?.length || 0} eventos carregados da agência ${contextAgencyId}`);
    setEvents(data || []);
  };

  const loadPostsForEvent = async (eventId: string) => {
    if (!user) return;
    
    // 1. Buscar IDs dos posts do evento
    const { data: eventPosts } = await sb
      .from('posts')
      .select('id')
      .eq('event_id', eventId);
    
    const eventPostIds = (eventPosts || []).map((p: any) => p.id);
    
    if (eventPostIds.length === 0) {
      setPosts([]);
      return;
    }
    
    // 2. Buscar submissões já enviadas pelo usuário
    const { data: userSubmissions } = await sb
      .from('submissions')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', eventPostIds);
    
    const submittedPostIds = (userSubmissions || []).map((s: any) => s.post_id);
    
    // 3. Buscar próxima postagem disponível (não enviada, deadline futuro)
    let query = sb
      .from('posts')
      .select('id, post_number, deadline, event_id')
      .eq('event_id', eventId)
      .gte('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(1);
    
    // Excluir posts já enviados
    if (submittedPostIds.length > 0) {
      query = query.not('id', 'in', `(${submittedPostIds.join(',')})`);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Erro ao carregar posts",
        description: "Não foi possível carregar as postagens disponíveis.",
        variant: "destructive",
      });
      return;
    }

    setPosts(data || []);
    
    // Auto-selecionar se houver apenas 1 post
    if (data && data.length === 1) {
      setSelectedPost(data[0].id);
    }
  };

  const loadRequirementsForEvent = async (eventId: string) => {
    const { data, error } = await sb
      .from("event_requirements")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error loading requirements:", error);
      return;
    }

    setRequirements(data || []);
  };

  const loadUserProfile = async () => {
    if (!user) return;

    const { data, error } = await sb
      .from("profiles")
      .select("full_name, email, instagram, phone")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setName(data.full_name || "");
      setEmail(data.email || "");
      setInstagram(data.instagram || data.email?.split("@")[0] || "");
      setPhone(data.phone || "");
      setHasExistingPhone(!!data.phone);
    }
  };
// 🆕 Função para comprimir imagens
const compressImage = async (file: File, maxWidth: number = 1080, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg', // Sempre converter para JPEG
                lastModified: Date.now(),
              });
              console.log(`📦 Imagem comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
              resolve(compressedFile);
            } else {
              reject(new Error('Erro ao comprimir imagem'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
  });
};

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, uploadType: 'post' | 'sale' | 'profile' = 'post') => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    
    // Validação de tamanho ANTES de comprimir (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use apenas imagens JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 🆕 COMPRIMIR IMAGEM
      const compressedFile = await compressImage(file, 1080, 0.8);
      
      // Suporte para 3 tipos de upload
      if (uploadType === "post") {
        setSelectedFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } else if (uploadType === "sale") {
        setSalesProofFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSalesProofPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } else if (uploadType === "profile") {
        setProfileScreenshotFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast({
        title: "Erro ao processar imagem",
        description: "Tente novamente ou use outra imagem.",
        variant: "destructive",
      });
    }
  }
};

  
  const handleRemoveImage = (uploadType: 'post' | 'sale' | 'profile' = 'post') => {
    if (uploadType === "post") {
      setSelectedFile(null);
      setPreviewUrl(null);
    } else if (uploadType === "sale") {
      setSalesProofFile(null);
      setSalesProofPreview(null);
    } else if (uploadType === "profile") {
      setProfileScreenshotFile(null);
      setProfileScreenshotPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para enviar uma postagem.",
        variant: "destructive",
      });
      return;
    }

    // M4: Validação aprimorada com mensagens específicas
    try {
      submitFormSchema.parse({ name, email, instagram, phone, instagramLink });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldNames: Record<string, string> = {
          name: "Nome",
          email: "E-mail",
          instagram: "Instagram",
          phone: "Telefone"
        };
        const fieldName = fieldNames[error.errors[0].path[0] as string] || "Campo";
        toast({
          title: `${fieldName} inválido`,
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate Instagram link if required
    const currentEvent = events.find(e => e.id === selectedEvent);
    if (currentEvent?.require_instagram_link) {
      try {
        instagramLinkSchema.parse(instagramLink);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: "Link do Instagram inválido",
            description: error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // 🆕 Validação de gênero compatível (Item 2)
    if (selectedEventData?.target_gender && selectedEventData.target_gender.length > 0) {
      // Buscar gênero do perfil do usuário
      const { data: userProfile, error: profileError } = await sb
        .from('profiles')
        .select('gender')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
      }

      const userGender = userProfile?.gender;

      // Verificar se gênero do usuário está na lista de gêneros aceitos
      const genderCompatible = !userGender || selectedEventData.target_gender.includes(userGender);

      if (!genderCompatible) {
        const genderLabels: Record<string, string> = {
          'masculino': 'Masculino',
          'feminino': 'Feminino',
          'outro': 'Outro'
        };
        const acceptedGenders = selectedEventData.target_gender.map(g => genderLabels[g] || g).join(', ');
        const userGenderLabel = userGender ? genderLabels[userGender] || userGender : 'Não informado';
        
        toast({
          title: "Gênero Incompatível",
          description: `Este evento aceita apenas submissões de: ${acceptedGenders}. Seu perfil está cadastrado como: ${userGenderLabel}.`,
          variant: "destructive",
        });
        return; // ⛔ Bloquear envio
      }
    }

    if (!selectedEvent) {
      toast({
        title: "Selecione um evento",
        description: "Por favor, selecione um evento.",
        variant: "destructive",
      });
      return;
    }

    // Validar apenas se for tipo "post"
    if (submissionType === "post" && !selectedPost) {
      toast({
        title: "Selecione uma postagem",
        description: "Por favor, selecione qual postagem você está enviando.",
        variant: "destructive",
      });
      return;
    }

    // 🆕 Validação para eventos de seleção de perfil
    if (selectedEventData?.event_purpose === "selecao_perfil") {
      // Validar faixa de seguidores
      if (!followersRange) {
        toast({
          title: "Selecione a faixa de seguidores",
          description: "Por favor, selecione quantos seguidores você tem.",
          variant: "destructive",
        });
        return;
      }

      // Validar print do perfil (se obrigatório)
      if (selectedEventData.require_profile_screenshot && !profileScreenshotFile) {
        toast({
          title: "Adicione o print do perfil",
          description: "Por favor, adicione o print do seu perfil do Instagram.",
          variant: "destructive",
        });
        return;
      }

      // Validar print da postagem (se obrigatório)
      if (selectedEventData.require_post_screenshot && !selectedFile) {
        toast({
          title: "Adicione o print da postagem",
          description: "Por favor, adicione o print de uma postagem sua.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Validação para eventos normais
      const fileToCheck = submissionType === "post" ? selectedFile : salesProofFile;
      if (!fileToCheck) {
        toast({
          title: submissionType === "post" ? "Adicione o print" : "Adicione o comprovante",
          description: submissionType === "post" 
            ? "Por favor, adicione o print da sua postagem." 
            : "Por favor, adicione o comprovante de venda.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (fileToCheck.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      // Rate limiting check (5 submissions per hour)
      const { data: rateLimitCheck, error: rateLimitError } = await sb.rpc('check_rate_limit', {
        p_user_id: user!.id,
        p_action_type: 'submission',
        p_max_count: 5,
        p_window_minutes: 60
      });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      }

      if (rateLimitCheck === false) {
        const minutesLeft = 60; // Simplificado - idealmente calcular tempo real restante
        toast({
          variant: "destructive",
          title: "Limite de envios atingido",
          description: `Você atingiu o limite de 5 submissões por hora. Aguarde aproximadamente ${minutesLeft} minutos para enviar novamente.`,
        });
        setIsSubmitting(false);
        return;
      }

      const post = posts.find((p) => p.id === selectedPost);
      if (post && new Date(post.deadline) < new Date()) {
        toast({
          title: "Prazo expirado",
          description: "O prazo para envio desta postagem já passou.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: profile } = await sb
        .from("profiles")
        .select("instagram, full_name, email, phone")
        .eq("id", user.id)
        .single();

      const updateData: any = {
        instagram,
        full_name: name,
        email,
      };

      // Only update phone if it doesn't exist yet
      if (!profile?.phone && phone) {
        updateData.phone = phone;
      }

      if (
        profile &&
        (profile.instagram !== instagram ||
          profile.full_name !== name ||
          profile.email !== email ||
          (!profile.phone && phone))
      ) {
        await sb.from("profiles").update(updateData).eq("id", user.id);
      }

      // 🔄 Upload de screenshot principal
      const fileToUpload = submissionType === "post" ? selectedFile : 
                          (selectedEventData?.event_purpose === "selecao_perfil" && selectedEventData.require_post_screenshot ? selectedFile : salesProofFile);
      if (!fileToUpload && selectedEventData?.event_purpose !== "selecao_perfil") throw new Error("No file to upload");

      const insertData: any = {
        user_id: user.id,
        submission_type: submissionType,
      };

      // Upload da imagem principal (se houver)
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("screenshots").upload(fileName, fileToUpload);
        if (uploadError) throw uploadError;
        insertData.screenshot_path = fileName;
      }

      // 🆕 Upload de screenshot do perfil (se for seleção de perfil)
      if (selectedEventData?.event_purpose === "selecao_perfil" && profileScreenshotFile) {
        const profileFileExt = profileScreenshotFile.name.split(".").pop();
        const profileFileName = `${user.id}/profile_${Date.now()}.${profileFileExt}`;
        const { error: profileUploadError } = await supabase.storage
          .from("screenshots")
          .upload(profileFileName, profileScreenshotFile);
        if (profileUploadError) throw profileUploadError;
        insertData.profile_screenshot_path = profileFileName;
      }

      // 🆕 Adicionar faixa de seguidores (se for seleção de perfil)
      if (selectedEventData?.event_purpose === "selecao_perfil" && followersRange) {
        insertData.followers_range = followersRange;
      }

      // Adicionar post_id e event_id baseado no tipo
      if (submissionType === "post") {
        insertData.post_id = selectedPost;
        // event_id virá do post automaticamente
      } else {
        // Para vendas: sem post, mas COM event_id
        insertData.post_id = null;
        
        // ✅ CRÍTICO: Adicionar event_id manualmente para vendas
        if (selectedEvent && agencyId) {
          // Buscar o event_id real para inserir na submission
          const { data: eventData } = await sb
            .from('events')
            .select('id')
            .eq('id', selectedEvent)
            .single();
          
          if (eventData) {
            // Criar entrada virtual em posts para manter compatibilidade com queries
            const { data: virtualPost } = await sb
              .from('posts')
              .insert({
                event_id: eventData.id,
                post_number: 0, // Número especial para vendas
                deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano no futuro
                created_by: user.id,
                agency_id: agencyId,
              })
              .select()
              .single();
            
            if (virtualPost) {
              insertData.post_id = virtualPost.id;
            }
          }
        }
      }

      const { error } = await sb.from("submissions").insert(insertData);

      if (error) throw error;

      toast({
        title: submissionType === "post" ? "Postagem enviada!" : "Venda enviada!",
        description: submissionType === "post" 
          ? "Sua postagem foi enviada com sucesso e está em análise."
          : "Seu comprovante de venda foi enviado com sucesso e está em análise.",
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setSalesProofFile(null);
      setSalesProofPreview(null);
      setProfileScreenshotFile(null); // 🆕
      setProfileScreenshotPreview(null); // 🆕
      setFollowersRange(""); // 🆕
      setSelectedPost("");
      setSelectedEvent("");
    } catch (error) {
      console.error("Error submitting:", error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar sua postagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEventData = events.find((e) => e.id === selectedEvent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card className="p-8 shadow-card">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Enviar Postagem
            </h1>
            <p className="text-muted-foreground">Preencha seus dados e envie o print da sua postagem no Instagram</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!user && (
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Faça login
                  </Link>{" "}
                  para preencher seus dados automaticamente
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event">Escolher Evento *</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent} required disabled={isSubmitting}>
                <SelectTrigger id="event">
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} {event.event_date && `- ${new Date(event.event_date).toLocaleDateString("pt-BR")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && selectedEventData && (
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                {selectedEventData.event_image_url && (
                  <div className="flex justify-center mb-3">
                    <img
                      src={selectedEventData.event_image_url}
                      alt={selectedEventData.title}
                      className="w-100 h-100 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
                
                {selectedEventData.description && (
                  <div className="bg-background/50 rounded-lg p-3 mb-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedEventData.description}</p>
                  </div>
                )}
                
                <h2 className="text-2xl font-bold">{selectedEventData.title}</h2>
                
                <div className="space-y-2 text-sm">
                  {selectedEventData.location && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground">Local:</span>
                      <span>{selectedEventData.location}</span>
                    </div>
                  )}
                  {selectedEventData.setor && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground">Setor:</span>
                      <span>{selectedEventData.setor}</span>
                    </div>
                  )}
                  {selectedEventData.numero_de_vagas && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground">Vagas:</span>
                      <span>{selectedEventData.numero_de_vagas} vagas disponíveis</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedEvent && (
              <>
                {/* Exibir Tipo de Evento de forma destacada */}
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg border">
                  <Label>Tipo de Evento *</Label>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedEventData?.event_purpose === "selecao_perfil" ? "secondary" : "default"}
                    >
                      {selectedEventData?.event_purpose === "selecao_perfil" ? "👤 Seleção de Perfil" : "📢 Divulgação"}
                    </Badge>
                  </div>
                </div>

                {(selectedEventData?.accept_posts || selectedEventData?.accept_sales) && (
                  <div className="space-y-2">
                    <Label>Tipo de Envio *</Label>
                    <Select value={submissionType} onValueChange={setSubmissionType} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedEventData?.accept_posts && (
                          <SelectItem value="post">📸 Enviar Postagem</SelectItem>
                        )}
                        {selectedEventData?.accept_sales && (
                          <SelectItem value="sale">💰 Enviar Comprovante de Venda</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}


                {/* Mostrar seleção de postagem APENAS se tipo for "post" */}
                {submissionType === "post" && (
                  <div className="space-y-2">
                    {posts.length > 0 ? (
                      <div className="bg-primary/10 border border-primary rounded-lg p-4">
                        <p className="font-semibold text-primary mb-2">📌 Postagem Atual Disponível:</p>
                        <p className="text-sm">
                          Postagem #{posts[0].post_number} - Prazo: {new Date(posts[0].deadline).toLocaleDateString("pt-BR")} às {new Date(posts[0].deadline).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Após enviar, a próxima postagem será liberada automaticamente.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-muted/50 border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          Não há postagens disponíveis para este evento no momento ou você já completou todas as postagens! 🎉
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Para vendas, mostrar apenas informação */}
                {submissionType === "sale" && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm text-center">
                      💰 <strong>Envio de Comprovante de Venda</strong><br/>
                      Vendas não estão vinculadas a números de postagem
                    </p>
                  </div>
                )}

                {requirements.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">Condições para Cortesia:</h3>
                        <div className="space-y-2">
                          {requirements.map((req, index) => (
                            <div key={req.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-primary">{index > 0 ? "OU" : "•"}</span>
                              <span>
                                {req.description || `${req.required_posts} postagens e ${req.required_sales} vendas`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || !!user}
              />
              {user && <p className="text-xs text-muted-foreground">Email bloqueado quando logado</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram *</Label>
              <Input
                id="instagram"
                placeholder="@seuinstagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={isSubmitting || hasExistingPhone}
              />
              {hasExistingPhone && (
                <p className="text-xs text-muted-foreground">
                  Telefone bloqueado após o primeiro envio. Entre em contato com o admin para alterações.
                </p>
              )}
            </div>

            {selectedEventData?.require_instagram_link && (
              <div className="space-y-2">
                <Label htmlFor="instagramLink">Link do Instagram *</Label>
                <Input
                  id="instagramLink"
                  placeholder="https://instagram.com/seuusuario ou @seuusuario"
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                  required={selectedEventData.require_instagram_link}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Insira o link completo do seu perfil ou seu @ do Instagram
                </p>
              </div>
            )}

            {/* Grupo WhatsApp com título customizável */}
            {selectedEventData?.event_purpose === "selecao_perfil" && selectedEventData?.whatsapp_group_url && (
              <div className="space-y-2 p-4 border-2 border-green-200 rounded-lg bg-green-50 dark:bg-green-950 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <div className="flex-1">
                    <Label className="font-semibold">
                      {selectedEventData.whatsapp_group_title || "Grupo WhatsApp de Resultados"}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Entre no grupo para receber os resultados da seleção
                    </p>
                  </div>
                </div>
                <a
                  href={selectedEventData.whatsapp_group_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button type="button" className="w-full bg-green-600 hover:bg-green-700">
                    Entrar no Grupo WhatsApp
                  </Button>
                </a>
              </div>
            )}

            {/* 🆕 Campos específicos para Seleção de Perfil */}
            {selectedEventData?.event_purpose === "selecao_perfil" && (
              <>
                {/* Select de Faixa de Seguidores */}
                <div className="space-y-2">
                  <Label htmlFor="followersRange">Quantos seguidores você tem? *</Label>
                  <Select value={followersRange} onValueChange={setFollowersRange} required disabled={isSubmitting}>
                    <SelectTrigger id="followersRange">
                      <SelectValue placeholder="Selecione a faixa de seguidores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5k">1.000 a 5.000 seguidores</SelectItem>
                      <SelectItem value="5-10k">5.000 a 10.000 seguidores</SelectItem>
                      <SelectItem value="10k+">10.000+ seguidores</SelectItem>
                      <SelectItem value="50k+">50.000+ seguidores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload do Print do Perfil */}
                {selectedEventData.require_profile_screenshot && (
                  <div className="space-y-2">
                    <Label htmlFor="profileScreenshot">Print do Perfil do Instagram *</Label>
                    {profileScreenshotPreview ? (
                      <div className="relative max-w-sm mx-auto">
                        <AspectRatio ratio={9 / 16}>
                          <img
                            src={profileScreenshotPreview}
                            alt="Preview do perfil"
                            className="w-full h-full object-cover rounded-lg border"
                          />
                        </AspectRatio>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveImage('profile')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          {profileScreenshotFile?.name}
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <input
                          id="profileScreenshot"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'profile')}
                          className="hidden"
                          required
                        />
                        <label htmlFor="profileScreenshot" className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Clique para fazer upload do print do seu perfil
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (Max. 5MB)</p>
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      📸 Faça um print da página inicial do seu perfil mostrando seu @ e quantidade de seguidores
                    </p>
                  </div>
                )}

                {/* Upload do Print da Postagem (condicional) */}
                {selectedEventData.require_post_screenshot && (
                  <div className="space-y-2">
                    <Label htmlFor="postScreenshot">Print do Post do Evento *</Label>
                    {previewUrl ? (
                      <div className="relative max-w-sm mx-auto">
                        <AspectRatio ratio={9 / 16}>
                          <img
                            src={previewUrl}
                            alt="Preview da postagem"
                            className="w-full h-full object-cover rounded-lg border"
                          />
                        </AspectRatio>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveImage('post')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          {selectedFile?.name}
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <input
                          id="postScreenshot"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'post')}
                          className="hidden"
                          required
                        />
                        <label htmlFor="postScreenshot" className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Clique para fazer upload do print de uma postagem
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (Max. 5MB)</p>
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      📸 Faça um print do post relacionado a este evento
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Upload único para eventos normais (não seleção de perfil) */}
            {selectedEventData?.event_purpose !== "selecao_perfil" && (
              <div className="space-y-2">
                <Label htmlFor="screenshot">
                  {submissionType === "post" ? "Print da Postagem *" : "Comprovante de Venda *"}
                </Label>
                {(submissionType === "post" ? previewUrl : salesProofPreview) ? (
                <div className="relative max-w-sm mx-auto">
                  <AspectRatio ratio={9 / 16}>
                    <img
                      src={submissionType === "post" ? previewUrl! : salesProofPreview!}
                      alt={submissionType === "post" ? "Preview da postagem" : "Preview do comprovante"}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                  </AspectRatio>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveImage(submissionType === "post" ? "post" : "sale")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {(submissionType === "post" ? selectedFile : salesProofFile)?.name}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                  <label htmlFor="screenshot" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {submissionType === "post" ? "Clique para fazer upload do print" : "Clique para fazer upload do comprovante"}
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (Max. 10MB)</p>
                  </label>
                </div>
              )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
              disabled={isSubmitting || !selectedEvent || posts.length === 0}
            >
              {isSubmitting ? "Enviando..." : submissionType === "post" ? "Enviar Postagem" : "Enviar Comprovante"}
            </Button>
          </form>
        </Card>

        <div className="mt-8 p-6 bg-card/50 backdrop-blur-sm rounded-lg border">
          <h3 className="font-semibold mb-2">📋 Informações Importantes</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Certifique-se de que o print mostra claramente sua postagem</li>
            <li>• Cada postagem aprovada vale 1 ponto</li>
            <li>• Fique atento aos prazos e condições de cada evento</li>
          </ul>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Verifique se os dados estão corretos antes de enviar:</p>
              <div className="bg-muted p-4 rounded-lg space-y-1 text-foreground">
                <p>
                  <strong>Nome:</strong> {name}
                </p>
                <p>
                  <strong>E-mail:</strong> {email}
                </p>
                <p>
                  <strong>Instagram:</strong> {instagram}
                </p>
                <p>
                  <strong>Evento:</strong> {selectedEventData?.title}
                </p>
                <p>
                  <strong>Postagem:</strong> #{posts.find((p) => p.id === selectedPost)?.post_number}
                </p>
              </div>
              <p className="text-sm">Deseja confirmar o envio?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Confirmar Envio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Submit;
