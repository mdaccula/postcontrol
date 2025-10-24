import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Upload, ArrowLeft, X, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
  event_date: string | null;
  location: string | null;
  setor: string | null;
  numero_de_vagas: number | null;
  event_image_url: string | null;
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
  phone: z.string().trim().regex(/^\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})$/, "Formato de telefone inválido. Use: (00) 00000-0000"),
});

const Submit = () => {
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [requirements, setRequirements] = useState<EventRequirement[]>([]);

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
    const { data, error } = await sb
      .from('events')
      .select('id, title, event_date, location, setor, numero_de_vagas, event_image_url')
      .eq('is_active', true)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    setEvents(data || []);
  };

  const loadPostsForEvent = async (eventId: string) => {
    const { data, error } = await sb
      .from('posts')
      .select('id, post_number, deadline, event_id')
      .eq('event_id', eventId)
      .gte('deadline', new Date().toISOString())
      .order('post_number', { ascending: true });

    if (error) {
      console.error('Error loading posts:', error);
      return;
    }

    setPosts(data || []);
  };

  const loadRequirementsForEvent = async (eventId: string) => {
    const { data, error } = await sb
      .from('event_requirements')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading requirements:', error);
      return;
    }

    setRequirements(data || []);
  };

  const loadUserProfile = async () => {
    if (!user) return;

    const { data, error } = await sb
      .from('profiles')
      .select('full_name, email, instagram, phone')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (data) {
      setName(data.full_name || "");
      setEmail(data.email || "");
      setInstagram(data.instagram || data.email?.split('@')[0] || "");
      setPhone(data.phone || "");
      setHasExistingPhone(!!data.phone);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
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

    // Validate form inputs
    try {
      submitFormSchema.parse({ name, email, instagram, phone });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
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

    if (!selectedPost) {
      toast({
        title: "Selecione uma postagem",
        description: "Por favor, selecione qual postagem você está enviando.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Adicione o print",
        description: "Por favor, adicione o print da sua postagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      const post = posts.find(p => p.id === selectedPost);
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
        .from('profiles')
        .select('instagram, full_name, email, phone')
        .eq('id', user.id)
        .single();

      const updateData: any = {
        instagram,
        full_name: name,
        email
      };

      // Only update phone if it doesn't exist yet
      if (!profile?.phone && phone) {
        updateData.phone = phone;
      }

      if (profile && (profile.instagram !== instagram || profile.full_name !== name || profile.email !== email || (!profile.phone && phone))) {
        await sb
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get signed URL instead of public URL (bucket is now private)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(fileName, 31536000); // 1 year expiry

      if (urlError) throw urlError;
      const screenshotUrl = signedUrlData.signedUrl;

      const { error } = await sb
        .from('submissions')
        .insert({
          post_id: selectedPost,
          user_id: user.id,
          screenshot_url: screenshotUrl,
        });

      if (error) throw error;

      toast({
        title: "Postagem enviada!",
        description: "Sua postagem foi enviada com sucesso e está em análise.",
      });
      
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedPost("");
      setSelectedEvent("");
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar sua postagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

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
            <p className="text-muted-foreground">
              Preencha seus dados e envie o print da sua postagem no Instagram
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!user && (
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Faça login
                  </Link>
                  {" "}para preencher seus dados automaticamente
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
                      {event.title} {event.event_date && `- ${new Date(event.event_date).toLocaleDateString('pt-BR')}`}
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
                      className="w-32 h-32 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
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
                <div className="space-y-2">
                  <Label htmlFor="post">Postagem Disponível *</Label>
                  <Select value={selectedPost} onValueChange={setSelectedPost} required disabled={isSubmitting || posts.length === 0}>
                    <SelectTrigger id="post">
                      <SelectValue placeholder={posts.length === 0 ? "Nenhuma postagem disponível" : "Selecione a postagem"} />
                    </SelectTrigger>
                    <SelectContent>
                      {posts.map((post) => (
                        <SelectItem key={post.id} value={post.id}>
                          Postagem #{post.post_number} (Prazo: {new Date(post.deadline).toLocaleDateString('pt-BR')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {posts.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Não há postagens disponíveis para este evento no momento
                    </p>
                  )}
                </div>

                {requirements.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">Condições para Cortesia:</h3>
                        <div className="space-y-2">
                          {requirements.map((req, index) => (
                            <div key={req.id} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-primary">{index > 0 ? 'OU' : '•'}</span>
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
              {user && (
                <p className="text-xs text-muted-foreground">
                  Email bloqueado quando logado
                </p>
              )}
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

            <div className="space-y-2">
              <Label htmlFor="screenshot">Print da Postagem *</Label>
              {previewUrl ? (
                <div className="relative max-w-sm mx-auto">
                  <AspectRatio ratio={9/16}>
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
                    onClick={handleRemoveImage}
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
                      Clique para fazer upload do print
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou JPEG (Max. 10MB)
                    </p>
                  </label>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" 
              size="lg"
              disabled={isSubmitting || !selectedEvent || posts.length === 0}
            >
              {isSubmitting ? "Enviando..." : "Enviar Postagem"}
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
                <p><strong>Nome:</strong> {name}</p>
                <p><strong>E-mail:</strong> {email}</p>
                <p><strong>Instagram:</strong> {instagram}</p>
                <p><strong>Evento:</strong> {selectedEventData?.title}</p>
                <p><strong>Postagem:</strong> #{posts.find(p => p.id === selectedPost)?.post_number}</p>
              </div>
              <p className="text-sm">Deseja confirmar o envio?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Submit;