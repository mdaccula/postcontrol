import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, Plus, Send, Pencil, Check, X, CheckCheck, Trash2, Copy, Columns3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { EventDialog } from "@/components/EventDialog";
import { PostDialog } from "@/components/PostDialog";
import { DashboardStats } from "@/components/DashboardStats";
import { UserPerformance } from "@/components/UserPerformance";
import { UserManagement } from "@/components/UserManagement";
import { AdminSettings } from "@/components/AdminSettings";
import { SubmissionKanban } from "@/components/SubmissionKanban";
import { SubmissionAuditLog } from "@/components/SubmissionAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const Admin = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionEventFilter, setSubmissionEventFilter] = useState<string>("all");
  const [submissionPostFilter, setSubmissionPostFilter] = useState<string>("all");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>("all");
  const [postEventFilter, setPostEventFilter] = useState<string>("all");
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedSubmissionForRejection, setSelectedSubmissionForRejection] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTemplate, setRejectionTemplate] = useState("");
  const [kanbanView, setKanbanView] = useState(false);
  const [auditLogSubmissionId, setAuditLogSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    const { data: eventsData } = await sb
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: postsData } = await sb
      .from('posts')
      .select('*, events(title)')
      .order('created_at', { ascending: false });
    
    const { data: submissionsData } = await sb
      .from('submissions')
      .select(`
        *,
        posts(post_number, deadline, event_id, events(title, id))
      `)
      .order('submitted_at', { ascending: false });

    // Buscar perfis em lote (admins têm permissão para ver todos)
    const userIds = Array.from(new Set((submissionsData || []).map((s: any) => s.user_id)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profilesData } = await sb
        .from('profiles')
        .select('id, full_name, email, instagram')
        .in('id', userIds);
      (profilesData || []).forEach((p: any) => { profilesById[p.id] = p; });
    }

    // Contar postagens por usuário
    const countsById: Record<string, number> = {};
    await Promise.all(userIds.map(async (uid: string) => {
      const { count } = await sb
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);
      countsById[uid as string] = count || 0;
    }));

    // Gerar signed URLs para os screenshots
    const submissionsWithSignedUrls = await Promise.all((submissionsData || []).map(async (s: any) => {
      let signedUrl = s.screenshot_url;
      if (s.screenshot_url) {
        const path = s.screenshot_url.split('/screenshots/')[1];
        if (path) {
          const { data } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(path, 31536000); // 1 year
          if (data?.signedUrl) {
            signedUrl = data.signedUrl;
          }
        }
      }
      return {
        ...s,
        screenshot_url: signedUrl,
        profiles: profilesById[s.user_id] || null,
        total_submissions: countsById[s.user_id] || 0,
      };
    }));

    setEvents(eventsData || []);
    setPosts(postsData || []);
    setSubmissions(submissionsWithSignedUrls);
    setSelectedSubmissions(new Set());
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      console.log('Aprovando submissão:', submissionId);
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', submissionId)
        .select();

      console.log('Resultado da aprovação:', { data, error });

      if (error) {
        toast.error("Erro ao aprovar submissão");
        console.error('Erro detalhado:', error);
      } else {
        toast.success("Submissão aprovada com sucesso");
        await loadData();
      }
    } catch (error) {
      toast.error("Erro ao aprovar submissão");
      console.error('Exception:', error);
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    setSelectedSubmissionForRejection(submissionId);
    setRejectionReason("");
    setRejectionTemplate("");
    setRejectionDialogOpen(true);
  };

  const confirmRejection = async () => {
    if (!selectedSubmissionForRejection) return;
    
    try {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || undefined,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', selectedSubmissionForRejection)
        .select();

      if (error) {
        toast.error("Erro ao rejeitar submissão");
        console.error('Erro detalhado:', error);
      } else {
        toast.success("Submissão rejeitada");
        await loadData();
        setRejectionDialogOpen(false);
        setSelectedSubmissionForRejection(null);
        setRejectionReason("");
      }
    } catch (error) {
      toast.error("Erro ao rejeitar submissão");
      console.error('Exception:', error);
    }
  };

  const rejectionTemplates = [
    { value: "formato", label: "Imagem fora do padrão" },
    { value: "conteudo", label: "Post não relacionado ao evento" },
    { value: "prazo", label: "Prazo expirado" },
    { value: "qualidade", label: "Qualidade da imagem inadequada" },
    { value: "outro", label: "Outro (especificar abaixo)" },
  ];

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      console.log('Alterando status:', submissionId, newStatus);
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: newStatus,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', submissionId)
        .select();

      console.log('Resultado da alteração:', { data, error });

      if (error) {
        toast.error("Erro ao alterar status");
        console.error('Erro detalhado:', error);
      } else {
        toast.success(`Status alterado para ${newStatus === 'approved' ? 'aprovado' : newStatus === 'rejected' ? 'rejeitado' : 'pendente'}`);
        await loadData();
      }
    } catch (error) {
      toast.error("Erro ao alterar status");
      console.error('Exception:', error);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedSubmissions);
    if (ids.length === 0) {
      toast.error("Selecione pelo menos uma submissão");
      return;
    }

    const { error } = await sb
      .from('submissions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      })
      .in('id', ids);

    if (error) {
      toast.error("Erro ao aprovar submissões em massa");
      console.error(error);
    } else {
      toast.success(`${ids.length} submissões aprovadas com sucesso`);
      await loadData();
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else {
      newSet.add(submissionId);
    }
    setSelectedSubmissions(newSet);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredSubmissions();
    if (selectedSubmissions.size === filtered.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(filtered.map((s: any) => s.id)));
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await sb
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success("Evento excluído com sucesso");
      await loadData();
      setEventToDelete(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleDuplicateEvent = async (event: any) => {
    try {
      const { data: newEvent, error } = await sb
        .from('events')
        .insert({
          title: `${event.title} - Cópia`,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          setor: event.setor,
          numero_de_vagas: event.numero_de_vagas,
          required_posts: event.required_posts,
          required_sales: event.required_sales,
          is_active: false, // Criar inativo por padrão
          require_instagram_link: event.require_instagram_link,
          event_image_url: event.event_image_url,
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicar requisitos também
      const { data: requirements } = await sb
        .from('event_requirements')
        .select('*')
        .eq('event_id', event.id);

      if (requirements && requirements.length > 0) {
        const newRequirements = requirements.map((req: any) => ({
          event_id: newEvent.id,
          required_posts: req.required_posts,
          required_sales: req.required_sales,
          description: req.description,
          display_order: req.display_order,
        }));

        await sb.from('event_requirements').insert(newRequirements);
      }

      toast.success("Evento duplicado com sucesso! Você pode editá-lo agora.");
      await loadData();
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast.error("Erro ao duplicar evento");
    }
  };

  const getFilteredSubmissions = () => {
    return submissions.filter((s: any) => {
      const eventMatch = submissionEventFilter === "all" || s.posts?.events?.id === submissionEventFilter;
      const postMatch = submissionPostFilter === "all" || s.posts?.post_number?.toString() === submissionPostFilter;
      const statusMatch = submissionStatusFilter === "all" || s.status === submissionStatusFilter;
      return eventMatch && postMatch && statusMatch;
    });
  };

  const getAvailablePostNumbers = () => {
    const filtered = submissions.filter((s: any) => 
      submissionEventFilter === "all" || s.posts?.events?.id === submissionEventFilter
    );
    const postNumbers = new Set(filtered.map((s: any) => s.posts?.post_number).filter(Boolean));
    return Array.from(postNumbers).sort((a, b) => a - b);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Controle de Postagem - Admin
            </h1>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Link to="/submit" className="flex-1 sm:flex-initial">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Postagem
                </Button>
              </Link>
              <Button variant="outline" onClick={signOut} className="flex-1 sm:flex-initial">Sair</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Postagens</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submissões</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 h-auto">
            <TabsTrigger value="events" className="text-xs sm:text-sm py-2">Eventos</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">Postagens</TabsTrigger>
            <TabsTrigger value="submissions" className="text-xs sm:text-sm py-2">Submissões</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2">Usuários</TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2">Dashboard</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Gerenciar Eventos</h2>
              <Button className="bg-gradient-primary w-full sm:w-auto" onClick={() => {
                setSelectedEvent(null);
                setEventDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </div>

            <Card className="p-6">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum evento cadastrado ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 w-full">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          {event.event_date && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📅 {new Date(event.event_date).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-sm text-muted-foreground">📍 {event.location}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            📊 Requisitos: {event.required_posts} posts, {event.required_sales} vendas
                          </p>
                          {event.description && (
                            <p className="text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setEventDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-initial"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateEvent(event)}
                            className="flex-1 sm:flex-initial"
                            title="Duplicar evento"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventToDelete(event.id)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <h2 className="text-2xl font-bold">Gerenciar Postagens</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={postEventFilter} onValueChange={setPostEventFilter}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Filtrar por evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eventos</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="bg-gradient-primary w-full sm:w-auto" onClick={() => {
                    setSelectedPost(null);
                    setPostDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Postagem
                  </Button>
                </div>
              </div>
            </div>

            <Card className="p-6">
              {posts.filter((p) => postEventFilter === "all" || p.event_id === postEventFilter).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {postEventFilter === "all" ? "Nenhuma postagem cadastrada ainda" : "Nenhuma postagem para este evento"}
                </p>
              ) : (
                <div className="space-y-4">
                  {posts.filter((p) => postEventFilter === "all" || p.event_id === postEventFilter).map((post) => (
                    <Card key={post.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">Postagem #{post.post_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Evento: {post.events?.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Prazo: {new Date(post.deadline).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setPostDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Submissões de Usuários</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKanbanView(!kanbanView)}
                >
                  <Columns3 className="mr-2 h-4 w-4" />
                  {kanbanView ? "Ver Lista" : "Ver Kanban"}
                </Button>
              </div>

              {kanbanView ? (
                <SubmissionKanban 
                  submissions={getFilteredSubmissions()} 
                  onUpdate={loadData}
                  userId={user?.id}
                />
              ) : (
                <>
                  {/* Filtros e ações */}
                  <div className="flex flex-col gap-3">
                {selectedSubmissions.size > 0 && (
                  <Button onClick={handleBulkApprove} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Aprovar {selectedSubmissions.size}
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select value={submissionEventFilter} onValueChange={(v) => {
                    setSubmissionEventFilter(v);
                    setSubmissionPostFilter("all");
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eventos</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={submissionPostFilter} onValueChange={setSubmissionPostFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Número da postagem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os números</SelectItem>
                      {getAvailablePostNumbers().map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          Postagem #{num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Aguardando aprovação</SelectItem>
                      <SelectItem value="approved">Aprovados</SelectItem>
                      <SelectItem value="rejected">Reprovados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Card className="p-6">
              {getFilteredSubmissions().length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma submissão encontrada com os filtros selecionados
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <Checkbox
                      checked={selectedSubmissions.size === getFilteredSubmissions().length && getFilteredSubmissions().length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Selecionar todos ({getFilteredSubmissions().length})
                    </span>
                  </div>
                  {getFilteredSubmissions().map((submission: any) => (
                    <Card key={submission.id} className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {/* Layout Mobile e Desktop */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                          {/* Checkbox de seleção */}
                          <div className="flex items-start pt-2 order-1 sm:order-1">
                            <Checkbox
                              checked={selectedSubmissions.has(submission.id)}
                              onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                            />
                          </div>

                          {/* Screenshot */}
                          <div className="w-full sm:w-48 h-64 sm:h-48 flex-shrink-0 order-2 sm:order-2">
                            <img 
                              src={submission.screenshot_url} 
                              alt="Screenshot da postagem"
                              className="w-full h-full object-cover rounded-lg border"
                            />
                          </div>

                          {/* Informações do usuário */}
                          <div className="flex-1 space-y-3 order-3 sm:order-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div>
                                <h3 className="font-bold text-lg">
                                  {submission.profiles?.full_name || 'Nome não disponível'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {submission.profiles?.email || 'Email não disponível'}
                                </p>
                                {submission.profiles?.instagram && (
                                  <p className="text-sm font-medium text-primary mt-1">
                                    @{submission.profiles.instagram}
                                  </p>
                                )}
                              </div>
                              <div className="sm:text-right">
                                <p className="text-sm font-medium">
                                  Postagem #{submission.posts?.post_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {submission.posts?.events?.title}
                                </p>
                                <div className="mt-2">
                                  {submission.status === 'pending' && (
                                    <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">
                                      Aguardando
                                    </span>
                                  )}
                                  {submission.status === 'approved' && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
                                      Aprovado
                                    </span>
                                  )}
                                  {submission.status === 'rejected' && (
                                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500">
                                      Rejeitado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t pt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Data de Envio:</p>
                                  <p className="font-medium">
                                    {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Prazo da Postagem:</p>
                                  <p className="font-medium">
                                    {submission.posts?.deadline 
                                      ? new Date(submission.posts.deadline).toLocaleString('pt-BR')
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total de Postagens:</p>
                                  <p className="font-medium text-primary">
                                    {submission.total_submissions} postagem{submission.total_submissions !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <label className="text-sm text-muted-foreground mb-1 block">Status da Submissão:</label>
                                <Select 
                                  value={submission.status} 
                                  onValueChange={(newStatus) => handleStatusChange(submission.id, newStatus)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Aguardando aprovação</SelectItem>
                                    <SelectItem value="approved">Aprovado</SelectItem>
                                    <SelectItem value="rejected">Rejeitado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAuditLogSubmissionId(submission.id)}
                                >
                                  Ver Histórico
                                </Button>
                              </div>
                            </div>

                            {submission.status === 'pending' && (
                              <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                                  onClick={() => handleApproveSubmission(submission.id)}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Aprovar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="w-full sm:w-auto"
                                  onClick={() => handleRejectSubmission(submission.id)}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
            </>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <Tabs defaultValue="events-stats" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-2 gap-1 h-auto">
                <TabsTrigger value="events-stats" className="text-xs sm:text-sm whitespace-normal py-2">Estatísticas por Evento</TabsTrigger>
                <TabsTrigger value="user-performance" className="text-xs sm:text-sm whitespace-normal py-2">Desempenho por Usuário</TabsTrigger>
              </TabsList>

              <TabsContent value="events-stats">
                <DashboardStats />
              </TabsContent>

              <TabsContent value="user-performance">
                <UserPerformance />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>

      <EventDialog 
        open={eventDialogOpen} 
        onOpenChange={(open) => {
          setEventDialogOpen(open);
          if (!open) setSelectedEvent(null);
        }}
        onEventCreated={loadData}
        event={selectedEvent}
      />
      <PostDialog 
        open={postDialogOpen} 
        onOpenChange={(open) => {
          setPostDialogOpen(open);
          if (!open) setSelectedPost(null);
        }}
        onPostCreated={loadData}
        post={selectedPost}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Submissão</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para que o usuário possa corrigir
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template de Resposta</Label>
              <Select 
                value={rejectionTemplate} 
                onValueChange={(value) => {
                  setRejectionTemplate(value);
                  const template = rejectionTemplates.find(t => t.value === value);
                  if (template && value !== "outro") {
                    setRejectionReason(template.label);
                  } else {
                    setRejectionReason("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {rejectionTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo Detalhado (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmRejection}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={!!auditLogSubmissionId} onOpenChange={(open) => !open && setAuditLogSubmissionId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações</DialogTitle>
            <DialogDescription>
              Visualize todas as mudanças de status desta submissão
            </DialogDescription>
          </DialogHeader>
          
          {auditLogSubmissionId && (
            <SubmissionAuditLog submissionId={auditLogSubmissionId} />
          )}

          <DialogFooter>
            <Button onClick={() => setAuditLogSubmissionId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento e todos os seus dados relacionados serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => eventToDelete && handleDeleteEvent(eventToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
