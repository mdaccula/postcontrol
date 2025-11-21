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
  const [selectedPostType, setSelectedPostType] = useState<'divulgacao' | 'sale'>('divulgacao'); // ✅ ITEM 6
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open]);

  useEffect(() => {
    console.log('🎯 [PostDialog] Recebeu post:', post);
    console.log('🎯 [PostDialog] event_id direto:', post?.event_id);
    console.log('🎯 [PostDialog] events objeto:', post?.events);
    
    if (post) {
      // CRÍTICO: Tentar event_id primeiro, depois events.id como fallback
      const resolvedEventId = post.event_id || (Array.isArray(post.events) ? post.events[0]?.id : post.events?.id) || "";
      console.log('✅ [PostDialog] event_id resolvido:', resolvedEventId);
      
      setEventId(resolvedEventId);
      setPostNumber(post.post_number?.toString() || "");
      
      // 🟡 ITEM 3: Corrigir fuso horário - não usar toISOString que converte para UTC
      if (post.deadline) {
        const date = new Date(post.deadline);
        // Extrair componentes manualmente para evitar conversão UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setDeadline("");
      }
    } else {
      setEventId("");
      setPostNumber("");
      setDeadline("");
    }
  }, [post, open]);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user is master admin
    const { data: roleData } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'master_admin')
      .maybeSingle();

    const isMaster = !!roleData;

    let query = sb.from('events').select('id, title, agency_id, event_purpose, accept_sales');

    // If not master admin, filter by agency
    if (!isMaster) {
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData?.agency_id) {
        query = query.eq('agency_id', profileData.agency_id);
        console.log('🔍 Filtrando eventos por agency_id:', profileData.agency_id);
      }
    } else {
      console.log('👑 Master Admin - Mostrando todos os eventos');
    }

    const { data, error } = await query
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    console.log('📋 Eventos carregados:', data?.length);
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

      // Get user's agency_id
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      const userAgencyId = profileData?.agency_id;

      // ✅ ITEM 6: Buscar event_purpose e accept_sales do evento
      const { data: eventData } = await sb
        .from('events')
        .select('event_purpose, accept_sales')
        .eq('id', eventId)
        .maybeSingle();
      
      const eventPurpose = eventData?.event_purpose || 'divulgacao';
      const acceptSales = eventData?.accept_sales || false;
      
      // ✅ ITEM 6: Determinar post_type e post_number baseado no tipo selecionado
      let finalPostType = eventPurpose;
      let finalPostNumber = parseInt(postNumber);
      
      // Se evento aceita vendas E usuário selecionou venda
      if (acceptSales && eventPurpose === 'divulgacao' && selectedPostType === 'sale') {
        finalPostType = 'sale';
        finalPostNumber = 0;
      }
      
      // Se evento é exclusivamente venda
      if (eventPurpose === 'sale') {
        finalPostNumber = 0;
      }

      if (post) {
        // Update existing post
        // 🟡 ITEM 3: Corrigir salvamento - usar apenas new Date() sem forçar timezone
        const deadlineDate = new Date(deadline + ':00').toISOString();
        
        const { error } = await sb
          .from('posts')
          .update({
            event_id: eventId,
            post_number: finalPostNumber,
            deadline: deadlineDate,
            agency_id: userAgencyId,
            post_type: finalPostType, // ✅ ITEM 6
          })
          .eq('id', post.id);

        if (error) {
          console.error('❌ Error updating post:', error);
          throw error;
        }

        toast({
          title: "Postagem atualizada!",
          description: "A postagem foi atualizada com sucesso.",
        });
      } else {
        // Create new post
        // 🟡 ITEM 3: Corrigir salvamento - usar apenas new Date() sem forçar timezone
        const deadlineDate = new Date(deadline + ':00').toISOString();
        
        const { error } = await sb
          .from('posts')
          .insert({
            event_id: eventId,
            post_number: finalPostNumber,
            deadline: deadlineDate,
            created_by: user.id,
            agency_id: userAgencyId,
            post_type: finalPostType, // ✅ ITEM 6
          });

        if (error) {
          console.error('❌ Error creating post:', error);
          throw error;
        }
        console.log('✅ Post created successfully');

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
          
          {eventId && (() => {
            const event = events.find(e => e.id === eventId);
            if (!event) return null;
            
            const eventPurpose = (event as any).event_purpose || 'divulgacao';
            const acceptSales = (event as any).accept_sales || false;
            
            // ✅ ITEM 6: Eventos com accept_sales permitem 2 tipos
            if (acceptSales && eventPurpose === 'divulgacao') {
              return (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Tipos permitidos:</strong>
                      <br />
                      📢 Divulgação (post 1, 2, 3...) - 1 submissão por post
                      <br />
                      💰 Comprovante de Vendas (post 0) - múltiplas submissões
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postType">Tipo de Post *</Label>
                    <Select value={selectedPostType} onValueChange={(value) => setSelectedPostType(value as 'divulgacao' | 'sale')}>
                      <SelectTrigger id="postType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="divulgacao">📢 Divulgação</SelectItem>
                        <SelectItem value="sale">💰 Comprovante de Vendas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }
            
            // Eventos normais (apenas 1 tipo)
            const typeInfo = eventPurpose === 'sale' 
              ? { emoji: '💰', label: 'Comprovante de Vendas', desc: 'usuários podem enviar múltiplas vezes' }
              : eventPurpose === 'selecao_perfil'
              ? { emoji: '🎯', label: 'Seleção de Perfil', desc: 'usuário envia 1x: post + perfil' }
              : { emoji: '📢', label: 'Divulgação', desc: 'usuário envia 1 imagem por postagem' };
            
            return (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Tipo:</strong> {typeInfo.emoji} {typeInfo.label} ({typeInfo.desc})
                </p>
              </div>
            );
          })()}
          
          <div className="space-y-2">
            <Label htmlFor="postNumber">
              {(() => {
                const event = events.find(e => e.id === eventId);
                const eventPurpose = (event as any)?.event_purpose || 'divulgacao';
                return eventPurpose === 'sale' 
                  ? 'Número (sempre 0 para vendas)'
                  : eventPurpose === 'selecao_perfil'
                  ? 'Número da Seleção (1, 2, 3...)'
                  : 'Número da Postagem (1, 2, 3...)';
              })()} *
            </Label>
            <Input
              id="postNumber"
              type="number"
              value={(() => {
                const event = events.find(e => e.id === eventId);
                const eventPurpose = (event as any)?.event_purpose || 'divulgacao';
                const acceptSales = (event as any)?.accept_sales || false;
                
                // ✅ ITEM 6: Se evento aceita vendas E tipo selecionado é venda, fixar em 0
                if (acceptSales && selectedPostType === 'sale') {
                  return '0';
                }
                // Se evento é exclusivamente venda, fixar em 0
                if (eventPurpose === 'sale') {
                  return '0';
                }
                return postNumber;
              })()}
              onChange={(e) => setPostNumber(e.target.value)}
              placeholder={(() => {
                const event = events.find(e => e.id === eventId);
                const acceptSales = (event as any)?.accept_sales || false;
                if (acceptSales && selectedPostType === 'sale') return '0';
                if ((event as any)?.event_purpose === 'sale') return '0';
                return '1, 2, 3...';
              })()}
              required
              min="0"
              disabled={loading || (() => {
                const event = events.find(e => e.id === eventId);
                if (!event) return false;
                const eventPurpose = (event as any).event_purpose;
                const acceptSales = (event as any).accept_sales || false;
                return eventPurpose === 'sale' || (acceptSales && selectedPostType === 'sale');
              })()}
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
