import { useEffect, useState } from "react";
import { formatPostName } from "@/lib/postNameFormatter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { sb } from "@/lib/supabaseSafe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface AddManualSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedEventId?: string;
}

export const AddManualSubmissionDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  selectedEventId
}: AddManualSubmissionDialogProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPost, setSelectedPost] = useState("");
  const [submissionType, setSubmissionType] = useState("post");
  const [submittedDate, setSubmittedDate] = useState(new Date().toISOString().slice(0, 16));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAgencyAndEvents();
    }
  }, [open]);

  useEffect(() => {
    if (selectedEventId) {
      setSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEvent) {
      loadPostsForEvent(selectedEvent);
    }
  }, [selectedEvent]);

  const loadAgencyAndEvents = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: agencyData } = await sb
      .from('agencies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    const userAgencyId = agencyData?.id;
    setAgencyId(userAgencyId);

    if (userAgencyId) {
      const { data: eventsData } = await sb
        .from('events')
        .select('id, title')
        .eq('agency_id', userAgencyId)
        .order('created_at', { ascending: false });
      
      setEvents(eventsData || []);

      const { data: usersData } = await sb
        .from('profiles')
        .select('id, full_name, email')
        .eq('agency_id', userAgencyId)
        .order('full_name', { ascending: true });
      
      setUsers(usersData || []);
    }
  };

  const loadPostsForEvent = async (eventId: string) => {
    const { data } = await sb
      .from('posts')
      .select('id, post_number, deadline')
      .eq('event_id', eventId)
      .order('post_number', { ascending: true });
    
    setPosts(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Use apenas imagens JPG, PNG ou WEBP.",
          variant: "destructive",
        });
        return;
      }
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedEvent || !selectedPost || !selectedFile) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload do arquivo
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${selectedUser}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Inserir submissão
      const insertData: any = {
        post_id: selectedPost,
        user_id: selectedUser,
        submission_type: submissionType === "post" ? "divulgacao" : submissionType,
        submitted_at: submittedDate,
        status: 'pending'
      };

      if (submissionType === "divulgacao") {
        insertData.screenshot_path = fileName;
      } else {
        insertData.sales_proof_url = fileName;
      }

      const { error } = await sb.from("submissions").insert(insertData);

      if (error) throw error;

      toast({
        title: "Submissão adicionada!",
        description: "A submissão foi adicionada com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error adding submission:", error);
      toast({
        title: "Erro ao adicionar",
        description: "Ocorreu um erro ao adicionar a submissão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEvent(selectedEventId || "");
    setSelectedUser("");
    setSelectedPost("");
    setSubmissionType("post");
    setSubmittedDate(new Date().toISOString().slice(0, 16));
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Submissão Manualmente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event">Evento *</Label>
            <Select 
              value={selectedEvent} 
              onValueChange={setSelectedEvent} 
              required 
              disabled={loading || !!selectedEventId}
            >
              <SelectTrigger id="event">
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Usuário *</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser} required disabled={loading}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <div className="space-y-2">
              <Label htmlFor="post">Postagem *</Label>
              <Select value={selectedPost} onValueChange={setSelectedPost} required disabled={loading}>
                <SelectTrigger id="post">
                  <SelectValue placeholder="Selecione a postagem" />
                </SelectTrigger>
                <SelectContent>
                  {posts.map((post) => (
                    <SelectItem key={post.id} value={post.id}>
                      {post.events?.title} - {formatPostName(
                        post.post_type,
                        post.post_number,
                        post.events?.event_purpose
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="submission_type">Tipo de Submissão *</Label>
            <Select value={submissionType} onValueChange={setSubmissionType} disabled={loading}>
              <SelectTrigger id="submission_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">📸 Postagem</SelectItem>
                <SelectItem value="sale">💰 Comprovante de Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitted_date">Data de Envio *</Label>
            <Input
              id="submitted_date"
              type="datetime-local"
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">
              {submissionType === "post" ? "Print da Postagem *" : "Comprovante de Venda *"}
            </Label>
            {previewUrl ? (
              <div className="relative max-w-sm mx-auto">
                <AspectRatio ratio={9 / 16}>
                  <img
                    src={previewUrl}
                    alt="Preview"
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
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                <label htmlFor="file" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (Max. 10MB)</p>
                </label>
              </div>
            )}
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
                  Adicionando...
                </>
              ) : (
                "Adicionar Submissão"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
