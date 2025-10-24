import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { sb } from "@/lib/supabaseSafe";
import { Trophy, Users, Target, TrendingUp, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";

interface EventStats {
  event_id: string;
  event_title: string;
  total_users: number;
  total_submissions: number;
  total_posts_available: number;
}

interface UserStats {
  user_id: string;
  user_name: string;
  user_email: string;
  user_instagram: string;
  events_participated: number;
  total_submissions: number;
  total_posts_available: number;
  completion_percentage: number;
}

export const DashboardStats = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStats();
    }
  }, [selectedEventId, activeFilter]);

  const loadEvents = async () => {
    const { data } = await sb
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    setEvents(data || []);
    if (data && data.length > 0) {
      setSelectedEventId("all");
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      if (selectedEventId === "all") {
        await loadAllStats();
      } else {
        await loadEventSpecificStats(selectedEventId);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportEventStatsToExcel = () => {
    const eventName = selectedEventId === "all" 
      ? "Todos os Eventos" 
      : events.find(e => e.id === selectedEventId)?.title || "Evento";

    const worksheet = XLSX.utils.json_to_sheet(
      eventStats.map(stat => ({
        'Evento': stat.event_title,
        'Participantes': stat.total_users,
        'Submissões': stat.total_submissions,
        'Posts Disponíveis': stat.total_posts_available
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estatísticas por Evento');
    XLSX.writeFile(workbook, `Estatisticas_Evento_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Relatório Excel exportado com sucesso!");
  };

  const exportEventStatsToPDF = () => {
    const eventName = selectedEventId === "all" 
      ? "Todos os Eventos" 
      : events.find(e => e.id === selectedEventId)?.title || "Evento";

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Estatísticas por Evento - ${eventName}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Evento', 'Participantes', 'Submissões', 'Posts Disponíveis']],
      body: eventStats.map(stat => [
        stat.event_title,
        stat.total_users.toString(),
        stat.total_submissions.toString(),
        stat.total_posts_available.toString()
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [168, 85, 247] }
    });

    doc.save(`Estatisticas_Evento_${eventName}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const loadAllStats = async () => {
    // Estatísticas por evento
    let query = sb.from('events').select('id, title, is_active');
    
    if (activeFilter === "active") {
      query = query.eq('is_active', true);
    } else if (activeFilter === "inactive") {
      query = query.eq('is_active', false);
    }
    
    const { data: eventsData } = await query;

    const eventStatsData: EventStats[] = [];

    for (const event of eventsData || []) {
      const { data: postsData } = await sb
        .from('posts')
        .select('id')
        .eq('event_id', event.id);

      const postIds = (postsData || []).map((p: any) => p.id);
      
      const { data: submissionsData } = await sb
        .from('submissions')
        .select('user_id')
        .in('post_id', postIds);

      const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));

      eventStatsData.push({
        event_id: event.id,
        event_title: event.title,
        total_users: uniqueUsers.size,
        total_submissions: (submissionsData || []).length,
        total_posts_available: (postsData || []).length,
      });
    }

    setEventStats(eventStatsData);

    // Estatísticas por usuário
    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, email, instagram');

    const userStatsData: UserStats[] = [];

    for (const profile of profilesData || []) {
      const { data: userSubmissions } = await sb
        .from('submissions')
        .select('post_id, posts(event_id)')
        .eq('user_id', profile.id);

      const eventsParticipated = new Set(
        (userSubmissions || [])
          .map((s: any) => s.posts?.event_id)
          .filter(Boolean)
      ).size;

      // Calcular total de posts disponíveis para os eventos que o usuário participou
      const eventIds = Array.from(new Set(
        (userSubmissions || [])
          .map((s: any) => s.posts?.event_id)
          .filter(Boolean)
      ));

      let totalPostsAvailable = 0;
      if (eventIds.length > 0) {
        const { count } = await sb
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds);
        totalPostsAvailable = count || 0;
      }

      const completionPercentage = totalPostsAvailable > 0 
        ? Math.round(((userSubmissions || []).length / totalPostsAvailable) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        events_participated: eventsParticipated,
        total_submissions: (userSubmissions || []).length,
        total_posts_available: totalPostsAvailable,
        completion_percentage: completionPercentage,
      });
    }

    setUserStats(userStatsData.filter(u => u.total_submissions > 0));
  };

  const loadEventSpecificStats = async (eventId: string) => {
    const { data: event } = await sb
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    const { data: postsData } = await sb
      .from('posts')
      .select('id')
      .eq('event_id', eventId);

    const postIds = (postsData || []).map((p: any) => p.id);
    
    const { data: submissionsData } = await sb
      .from('submissions')
      .select('user_id')
      .in('post_id', postIds);

    const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));

    const eventTitle = event && event.title ? event.title : '';

    setEventStats([{
      event_id: eventId,
      event_title: eventTitle,
      total_users: uniqueUsers.size,
      total_submissions: (submissionsData || []).length,
      total_posts_available: (postsData || []).length,
    }]);

    // Usuários específicos do evento
    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, email, instagram')
      .in('id', Array.from(uniqueUsers));

    const userStatsData: UserStats[] = [];

    for (const profile of profilesData || []) {
      const { data: userSubmissions } = await sb
        .from('submissions')
        .select('id')
        .in('post_id', postIds)
        .eq('user_id', profile.id);

      const completionPercentage = (postsData || []).length > 0
        ? Math.round(((userSubmissions || []).length / (postsData || []).length) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        events_participated: 1,
        total_submissions: (userSubmissions || []).length,
        total_posts_available: (postsData || []).length,
        completion_percentage: completionPercentage,
      });
    }

    setUserStats(userStatsData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Dashboard de Desempenho</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportEventStatsToExcel} variant="outline" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={exportEventStatsToPDF} variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            PDF
          </Button>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Somente ativos</SelectItem>
              <SelectItem value="inactive">Somente inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Eventos</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title} {!event.is_active && '(Inativo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estatísticas por Evento */}
      <div>
        <h3 className="text-xl font-semibold mb-4">📊 Estatísticas por Evento</h3>
        <div className="grid gap-4">
          {eventStats.map((stat) => (
            <Card key={stat.event_id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold">{stat.event_title}</h4>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participantes</p>
                    <p className="text-2xl font-bold">{stat.total_users}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submissões</p>
                    <p className="text-2xl font-bold">{stat.total_submissions}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posts Disponíveis</p>
                    <p className="text-2xl font-bold">{stat.total_posts_available}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Estatísticas por Usuário */}
      <div>
        <h3 className="text-xl font-semibold mb-4">👥 Desempenho por Usuário</h3>
        <div className="grid gap-4">
          {userStats.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              Nenhum usuário com submissões ainda
            </Card>
          ) : (
            userStats
              .sort((a, b) => b.completion_percentage - a.completion_percentage)
              .map((stat) => (
                <Card key={stat.user_id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold">{stat.user_name}</h4>
                      <p className="text-sm text-muted-foreground">{stat.user_email}</p>
                      {stat.user_instagram && (
                        <p className="text-sm font-medium text-primary">@{stat.user_instagram}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        <span className="text-2xl font-bold">{stat.completion_percentage}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Conclusão</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Eventos Participados</p>
                      <p className="text-xl font-bold">{stat.events_participated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Enviados</p>
                      <p className="text-xl font-bold">{stat.total_submissions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Disponíveis</p>
                      <p className="text-xl font-bold">{stat.total_posts_available}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all" 
                        style={{ width: `${stat.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      </div>
    </div>
  );
};