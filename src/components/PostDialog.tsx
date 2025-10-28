import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  post?: any;
}

interface Event {
  id: string;
  title: string;
}

export const PostDialog = ({ open, onOpenChange, onPostCreated, post }: PostDialogProps) => {
  const [eventId, setEventId] = useState("");
  const [postNumber, setPostNumber] = useState("");
  const [deadline, setDeadline] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open]);

  useEffect(() => {
    if (post) {
      setEventId(post.event_id || "");
      setPostNumber(post.post_number?.toString() || "");
      setDeadline(post.deadline ? new Date(post.deadline).toISOString().slice(0, 16) : "");
    } else {
      setEventId("");
      setPostNumber("");
      setDeadline("");
    }
  }, [post, open]);

  const loadEvents = async () => {
    const { data, error } = await sb
      .from('events')
      .select('id, title')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    setEvents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado.",
          variant: "destructive",
        });
        return;
      }

      if (post) {
        // Update existing post
        const { error } = await sb
          .from('posts')
          .update({
            event_id: eventId,
            post_number: parseInt(postNumber),
            deadline: new Date(deadline).toISOString(),
          })
          .eq('id', post.id);

        if (error) throw error;

        toast({
          title: "Postagem atualizada!",
          description: "A postagem foi atualizada com sucesso.",
        });
      } else {
        // Get user's agency_id
        const { data: profileData } = await sb
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .maybeSingle();

        // Create new post
        const { error } = await sb
          .from('posts')
          .insert({
            event_id: eventId,
            post_number: parseInt(postNumber),
            deadline: new Date(deadline).toISOString(),
            created_by: user.id,
            agency_id: profileData?.agency_id || null,
          });

        if (error) throw error;

        toast({
          title: "Postagem criada!",
          description: "A postagem foi criada com sucesso.",
        });
      }

      onPostCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: post ? "Erro ao atualizar postagem" : "Erro ao criar postagem",
        description: "Ocorreu um erro. Verifique se o número já existe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{post ? "Editar Postagem" : "Criar Nova Postagem"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event">Evento *</Label>
            <Select value={eventId} onValueChange={setEventId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento" />
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
            <Label htmlFor="postNumber">Número da Postagem *</Label>
            <Input
              id="postNumber"
              type="number"
              value={postNumber}
              onChange={(e) => setPostNumber(e.target.value)}
              placeholder="1, 2, 3..."
              required
              min="1"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo para Envio *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              disabled={loading}
            />
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
                  {post ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                post ? "Atualizar Postagem" : "Criar Postagem"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
