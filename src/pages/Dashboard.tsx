import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Award, Calendar, LogOut, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Submission {
  id: string;
  submitted_at: string;
  screenshot_url: string;
  status: string;
  rejection_reason?: string;
  posts: {
    post_number: number;
    deadline: string;
    event_id: string;
    events: {
      title: string;
      required_posts: number;
    } | null;
  } | null;
}

interface EventStats {
  eventTitle: string;
  eventId: string;
  totalRequired: number;
  submitted: number;
  percentage: number;
}

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; email: string; instagram: string } | null>(null);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    // Carregar perfil
    const { data: profileData } = await sb
      .from('profiles')
      .select('full_name, email, instagram')
      .eq('id', user.id)
      .maybeSingle();

    setProfile(profileData);

    // Carregar configuração do WhatsApp
    const { data: whatsappData } = await sb
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'whatsapp_number')
      .maybeSingle();
    
    if (whatsappData?.setting_value) {
      setWhatsappNumber(whatsappData.setting_value);
    }

    // Carregar eventos ativos
    const { data: eventsData } = await sb
      .from('events')
      .select('id, title')
      .eq('is_active', true)
      .order('event_date', { ascending: false });
    
    setEvents(eventsData || []);

    // Carregar submissões - Filtrar apenas eventos ativos
    const { data: submissionsData } = await sb
      .from('submissions')
      .select(`
        id,
        submitted_at,
        screenshot_url,
        status,
        rejection_reason,
        posts!inner (
          post_number,
          deadline,
          event_id,
          events!inner (
            title,
            required_posts,
            id,
            is_active
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('posts.events.is_active', true)
      .order('submitted_at', { ascending: false });

    setSubmissions(submissionsData || []);

    // Calcular estatísticas por evento - posts aprovados / total de posts do evento
    if (submissionsData) {
      const eventMap = new Map<string, { title: string; totalPosts: number; approvedCount: number }>();

      // Primeiro, coletar todos os eventos únicos das submissões
      const uniqueEventIds = new Set<string>();
      submissionsData.forEach((sub) => {
        if (sub.posts?.events) {
          const eventId = (sub.posts.events as any).id;
          uniqueEventIds.add(eventId);
        }
      });

      // Para cada evento, buscar o total de posts criados
      for (const eventId of Array.from(uniqueEventIds)) {
        const eventData = submissionsData.find(
          (sub) => sub.posts?.events && (sub.posts.events as any).id === eventId
        )?.posts?.events;

        if (eventData) {
          // Contar total de posts do evento
          const { count } = await sb
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);

          const totalPosts = count || 0;

          // Contar posts aprovados do usuário neste evento
          const approvedCount = submissionsData.filter(
            (sub) => 
              sub.status === 'approved' && 
              sub.posts?.events && 
              (sub.posts.events as any).id === eventId
          ).length;

          eventMap.set(eventId, {
            title: eventData.title,
            totalPosts: totalPosts,
            approvedCount: approvedCount
          });
        }
      }

      const stats: EventStats[] = Array.from(eventMap.entries()).map(([eventId, data]) => ({
        eventId,
        eventTitle: data.title,
        totalRequired: data.totalPosts,
        submitted: data.approvedCount,
        percentage: data.totalPosts > 0 ? (data.approvedCount / data.totalPosts) * 100 : 0
      }));

      setEventStats(stats);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline">
                  Painel Admin
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Perfil do Usuário */}
        <Card className="p-4 md:p-6 mb-8 border-2">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent break-words">
                Olá, {profile?.full_name || 'Usuário'}!
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-2 break-words">{profile?.email}</p>
              <p className="text-sm text-muted-foreground break-words">Instagram: {profile?.instagram}</p>
            </div>
            <Link to="/submit" className="w-full sm:w-auto">
              <Button className="bg-gradient-primary w-full sm:w-auto whitespace-nowrap">
                Enviar Nova Postagem
              </Button>
            </Link>
          </div>
        </Card>

        {/* Estatísticas Gerais */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Posts Aprovados</p>
                <p className="text-3xl font-bold">{submissions.filter(s => s.status === 'approved').length}</p>
                {submissions.filter(s => s.status === 'pending').length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {submissions.filter(s => s.status === 'pending').length} pendente(s) de aprovação
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                <p className="text-3xl font-bold">{eventStats.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Último Envio</p>
                <p className="text-lg font-bold">
                  {submissions.length > 0
                    ? new Date(submissions[0].submitted_at).toLocaleDateString('pt-BR')
                    : 'Nenhum'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Aba de Estatísticas */}
          <TabsContent value="stats" className="space-y-6">
            <h2 className="text-2xl font-bold">Progresso por Evento</h2>
            
            {eventStats.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Você ainda não enviou nenhuma postagem</p>
                <Link to="/submit">
                  <Button className="bg-gradient-primary">
                    Enviar Primeira Postagem
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-6">
                {eventStats.map((stat) => (
                  <Card key={stat.eventId} className="p-6 border-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">{stat.eventTitle}</h3>
                        <Badge variant={stat.percentage >= 100 ? "default" : "secondary"} className="text-lg px-3 py-1">
                          {stat.submitted}/{stat.totalRequired}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.min(stat.percentage, 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(stat.percentage, 100)} className="h-3" />
                      </div>

                      {stat.percentage >= 100 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                          <Award className="w-5 h-5 text-green-500" />
                          <span className="text-green-500 font-medium">Meta atingida! Cortesia garantida 🎉</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba de Histórico */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Histórico de Postagens</h2>
              <Select value={selectedHistoryEvent} onValueChange={setSelectedHistoryEvent}>
                <SelectTrigger className="w-[250px]">
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
            </div>
            
            {submissions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhuma postagem enviada ainda</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions
                  .filter((submission) => {
                    if (selectedHistoryEvent === "all") return true;
                    return submission.posts?.event_id === selectedHistoryEvent;
                  })
                  .map((submission) => (
                  <Card key={submission.id} className="overflow-hidden hover:shadow-glow transition-all">
                    <img 
                      src={submission.screenshot_url} 
                      alt="Screenshot da postagem"
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold">
                        {submission.posts?.events?.title || 'Evento'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Post #{submission.posts?.post_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviado em {new Date(submission.submitted_at).toLocaleDateString('pt-BR')} às {new Date(submission.submitted_at).toLocaleTimeString('pt-BR')}
                      </p>
                      {submission.status === 'pending' && (
                        <Badge variant="outline" className="w-full justify-center bg-yellow-500/20 text-yellow-500 border-yellow-500">
                          Aguardando Aprovação
                        </Badge>
                      )}
                      {submission.status === 'approved' && (
                        <Badge variant="outline" className="w-full justify-center bg-green-500/20 text-green-500 border-green-500">
                          Aprovado
                        </Badge>
                      )}
                       {submission.status === 'rejected' && (
                        <div className="space-y-2">
                          <Badge variant="outline" className="w-full justify-center bg-red-500/20 text-red-500 border-red-500">
                            Rejeitado
                          </Badge>
                          {submission.rejection_reason && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-500">
                              <strong>Motivo:</strong> {submission.rejection_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Botão flutuante do WhatsApp */}
      {whatsappNumber && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 bg-green-500 hover:bg-green-600"
            asChild
          >
            <a
              href={`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}?text=Olá, tenho uma dúvida sobre os eventos`}
              target="_blank"
              rel="noopener noreferrer"
              title="Falar com o Admin no WhatsApp"
            >
              <MessageCircle className="h-6 w-6" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
