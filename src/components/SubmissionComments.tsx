import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Lock } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  submission_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SubmissionCommentsProps {
  submissionId: string;
  onCommentAdded?: () => void;
}

export const SubmissionComments = ({ submissionId, onCommentAdded }: SubmissionCommentsProps) => {
  const { user } = useAuthStore();
  const { isAgencyAdmin } = useUserRole();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    loadComments();
    
    // Realtime subscription para novos comentários
    const channel = sb
      .channel(`submission-comments-${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submission_comments',
          filter: `submission_id=eq.${submissionId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [submissionId]);

  const loadComments = async () => {
    try {
      const { data, error } = await sb
        .from('submission_comments')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await sb
        .from('submission_comments')
        .insert({
          submission_id: submissionId,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: isInternal && isAgencyAdmin, // Apenas agency admins podem criar comentários internos
        });

      if (error) throw error;

      toast.success("Comentário adicionado");
      setNewComment("");
      setIsInternal(false);
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Comentários</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* Lista de comentários */}
      <ScrollArea className="h-[300px] mb-4 pr-4">
        {loadingComments ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando comentários...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum comentário ainda
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg ${
                  comment.is_internal
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {comment.profiles?.full_name || "Usuário"}
                    </span>
                    {comment.is_internal && (
                      <Lock className="h-3 w-3 text-amber-600" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Formulário de novo comentário */}
      <div className="space-y-3">
        <Textarea
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        
        <div className="flex items-center justify-between gap-3">
          {isAgencyAdmin && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`internal-${submissionId}`}
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              />
              <Label
                htmlFor={`internal-${submissionId}`}
                className="text-sm cursor-pointer flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                Comentário interno (apenas admins)
              </Label>
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || loading}
            size="sm"
            className="ml-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
};
