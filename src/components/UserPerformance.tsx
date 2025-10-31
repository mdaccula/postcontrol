import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sb } from "@/lib/supabaseSafe";
import { Trophy, Users, Target, TrendingUp, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStats {
  user_id: string;
  user_name: string;
  user_email: string;
  user_instagram: string;
  user_phone: string;
  user_gender: string;
  user_followers_range: string;
  events_participated: number;
  total_submissions: number;
  approved_submissions: number;
  pending_submissions: number;
  rejected_submissions: number;
  total_posts_available: number;
  completion_percentage: number;
}

export const UserPerformance = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(false);
  const [debouncedSearchName, setDebouncedSearchName] = useState("");
  const [debouncedSearchPhone, setDebouncedSearchPhone] = useState("");

  useEffect(() => {
    checkAgencyAndLoadEvents();
  }, []);

  // Debounce search name
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchName(searchName);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchName]);

  // Debounce search phone
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchPhone(searchPhone);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchPhone]);

  const checkAgencyAndLoadEvents = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    // Verificar se é master admin
    const { data: roleData } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'master_admin')
      .maybeSingle();
    
    const isMaster = !!roleData;
    setIsMasterAdmin(isMaster);

    if (isMaster) {
      // Master admin vê todos os eventos
      await loadAllEvents();
    } else {
      // Agency admin vê apenas seus eventos
      const { data: agencyData } = await sb
        .from('agencies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      const agencyId = agencyData?.id || null;
      setCurrentAgencyId(agencyId);
      
      if (agencyId) {
        await loadEvents(agencyId);
      }
    }
  };

  const loadAllEvents = async () => {
    const { data } = await sb
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    setEvents(data || []);
    if (data && data.length > 0) {
      setSelectedEventId("all");
    }
  };

  const loadEvents = async (agencyId: string) => {
    const { data } = await sb
      .from('events')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    
    console.log('👤 Loaded events for agency:', data?.length || 0);
    setEvents(data || []);
    if (data && data.length > 0) {
      setSelectedEventId("all");
    }
  };

  const handleSearch = () => {
    if (!selectedEventId) {
      toast.error("Por favor, selecione um evento antes de buscar.");
      return;
    }
    setHasSearched(true);
    loadStats();
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

  const exportToExcel = () => {
    const eventName = selectedEventId === "all" 
      ? "Todos os Eventos" 
      : events.find(e => e.id === selectedEventId)?.title || "Evento";

    const worksheet = XLSX.utils.json_to_sheet(
      filteredStats.map(stat => ({
        'Nome': stat.user_name,
        'Email': stat.user_email,
        'Instagram': stat.user_instagram,
        'Telefone': stat.user_phone,
        'Sexo': stat.user_gender || 'N/A',
        'Seguidores': stat.user_followers_range || 'N/A',
        'Eventos Participados': stat.events_participated,
        'Total Submissões': stat.total_submissions,
        'Aprovados': stat.approved_submissions,
        'Pendentes': stat.pending_submissions,
        'Rejeitados': stat.rejected_submissions,
        'Posts Disponíveis': stat.total_posts_available,
        'Conclusão (%)': stat.completion_percentage
      }))
    );

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: false }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estatísticas');
    XLSX.writeFile(workbook, `Relatorio_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`, {
      bookType: 'xlsx',
      type: 'binary',
      compression: true
    });
    toast.success("Relatório Excel exportado com sucesso!", {
      description: "O arquivo foi baixado para seu computador."
    });
  };

 const exportToPDF = () => {
  const doc = new jsPDF();
  const eventName = events.find(e => e.id === selectedEventId)?.title || 'Todos';
  
  // Função para remover acentos
  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Título SEM ACENTOS
  doc.setFontSize(18);
  doc.text(removeAccents(`Relatorio de Desempenho - ${eventName}`), 14, 20);
  doc.setFontSize(11);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  // Tabela com textos limpos
  autoTable(doc, {
    startY: 35,
    head: [[
      removeAccents('Nome'), 
      'Email', 
      'Instagram',
      'Sexo',
      'Seguidores',
      'Aprovados', 
      'Pendentes', 
      removeAccents('Conclusao (%)')
    ]],
    body: filteredStats.map(stat => [
      removeAccents(stat.user_name || ''),
      stat.user_email,
      stat.user_instagram,
      removeAccents(stat.user_gender || 'N/A'),
      stat.user_followers_range || 'N/A',
      stat.approved_submissions.toString(),
      stat.pending_submissions.toString(),
      `${stat.completion_percentage}%`
    ]),
    styles: { fontSize: 9, font: 'helvetica' },
    headStyles: { fillColor: [168, 85, 247] }
  });

  doc.save(`Relatorio_${removeAccents(eventName)}_${new Date().toISOString().split('T')[0]}.pdf`);
  toast.success("Relatorio PDF exportado com sucesso!", {
    description: "O arquivo foi baixado para seu computador."
  });
};

  const loadAllStats = async () => {
    if (!currentAgencyId && !isMasterAdmin) {
      console.warn('⚠️ No agency ID available');
      return;
    }

    // Buscar eventos da agência ou todos se master admin
    let eventsQuery = sb.from('events').select('id');
    
    if (!isMasterAdmin && currentAgencyId) {
      eventsQuery = eventsQuery.eq('agency_id', currentAgencyId);
    }
    
    const { data: agencyEvents } = await eventsQuery;

    const eventIds = (agencyEvents || []).map(e => e.id);

    if (eventIds.length === 0) {
      console.log('⚠️ Nenhum evento encontrado para a agência');
      setUserStats([]);
      return;
    }

    // Buscar posts desses eventos
    const { data: postsData } = await sb
      .from('posts')
      .select('id, event_id')
      .in('event_id', eventIds);

    const postIds = (postsData || []).map(p => p.id);

    if (postIds.length === 0) {
      console.log('⚠️ Nenhum post encontrado');
      setUserStats([]);
      return;
    }

    // Buscar submissões desses posts
    const { data: submissionsData } = await sb
      .from('submissions')
      .select('user_id, status, post_id')
      .in('post_id', postIds);

    const uniqueUserIds = Array.from(new Set((submissionsData || []).map(s => s.user_id)));

    if (uniqueUserIds.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado');
      setUserStats([]);
      return;
    }

    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, email, instagram, phone, gender, followers_range')
      .in('id', uniqueUserIds);

    const userStatsData: UserStats[] = [];

    for (const profile of profilesData || []) {
      const { data: userSubmissions } = await sb
        .from('submissions')
        .select('post_id, status, posts(event_id)')
        .eq('user_id', profile.id)
        .in('post_id', postIds);

      const eventsParticipated = new Set(
        (userSubmissions || [])
          .map((s: any) => s.posts?.event_id)
          .filter(Boolean)
      ).size;

      const userEventIds = Array.from(new Set(
        (userSubmissions || [])
          .map((s: any) => s.posts?.event_id)
          .filter(Boolean)
      ));

      let totalPostsAvailable = 0;
      if (userEventIds.length > 0) {
        const { count } = await sb
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('event_id', userEventIds);
        totalPostsAvailable = count || 0;
      }

      const approvedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'approved').length;
      const pendingSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'pending').length;
      const rejectedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'rejected').length;

      const completionPercentage = totalPostsAvailable > 0 
        ? Math.round((approvedSubmissions / totalPostsAvailable) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        user_phone: profile.phone || 'Sem telefone',
        user_gender: profile.gender || 'N/A',
        user_followers_range: profile.followers_range || 'N/A',
        events_participated: eventsParticipated,
        total_submissions: (userSubmissions || []).length,
        approved_submissions: approvedSubmissions,
        pending_submissions: pendingSubmissions,
        rejected_submissions: rejectedSubmissions,
        total_posts_available: totalPostsAvailable,
        completion_percentage: completionPercentage,
      });
    }

    console.log('👤 User stats loaded:', userStatsData.length);
    setUserStats(userStatsData.filter(u => u.total_submissions > 0));
  };

  const loadEventSpecificStats = async (eventId: string) => {
    if (!currentAgencyId && !isMasterAdmin) {
      console.warn('⚠️ No agency ID available');
      return;
    }

    // Verificar se o evento pertence à agência (apenas para agency admin)
    if (!isMasterAdmin && currentAgencyId) {
      const { data: eventData } = await sb
        .from('events')
        .select('id, agency_id')
        .eq('id', eventId)
        .eq('agency_id', currentAgencyId)
        .maybeSingle();

      if (!eventData) {
        console.warn('⚠️ Evento não pertence à agência');
        setUserStats([]);
        return;
      }
    }

    const { data: postsData } = await sb
      .from('posts')
      .select('id')
      .eq('event_id', eventId);

    const postIds = (postsData || []).map((p: any) => p.id);
    
    if (postIds.length === 0) {
      setUserStats([]);
      return;
    }

    const { data: submissionsData } = await sb
      .from('submissions')
      .select('user_id')
      .in('post_id', postIds);

    const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));

    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, email, instagram, phone')
      .in('id', Array.from(uniqueUsers));

    const userStatsData: UserStats[] = [];

    for (const profile of profilesData || []) {
      const { data: userSubmissions } = await sb
        .from('submissions')
        .select('id, status')
        .in('post_id', postIds)
        .eq('user_id', profile.id);

      const approvedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'approved').length;
      const pendingSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'pending').length;
      const rejectedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'rejected').length;

      const completionPercentage = (postsData || []).length > 0
        ? Math.round((approvedSubmissions / (postsData || []).length) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        user_phone: profile.phone || 'Sem telefone',
        user_gender: profile.gender || 'N/A',
        user_followers_range: profile.followers_range || 'N/A',
        events_participated: 1,
        total_submissions: (userSubmissions || []).length,
        approved_submissions: approvedSubmissions,
        pending_submissions: pendingSubmissions,
        rejected_submissions: rejectedSubmissions,
        total_posts_available: (postsData || []).length,
        completion_percentage: completionPercentage,
      });
    }

    setUserStats(userStatsData);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Card className="p-6">
          <Skeleton className="h-48 w-full" />
        </Card>
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const filteredStats = useMemo(() => {
    return userStats.filter((stat) => {
      const matchesName = stat.user_name.toLowerCase().includes(debouncedSearchName.toLowerCase());
      const matchesPhone = stat.user_phone.toLowerCase().includes(debouncedSearchPhone.toLowerCase());
      return matchesName && matchesPhone;
    });
  }, [userStats, debouncedSearchName, debouncedSearchPhone]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold">Desempenho por Usuário</h2>
          {hasSearched && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                PDF
              </Button>
            </div>
          )}
        </div>
        
        {/* Filtros sempre visíveis */}
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            📊 Selecione os filtros abaixo e clique em "Buscar" para carregar os dados de desempenho dos usuários.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[240px]">
                <label className="text-sm font-medium mb-2 block">Evento</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
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
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Somente ativos</SelectItem>
                    <SelectItem value="inactive">Somente inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSearch} disabled={!selectedEventId} className="w-full md:w-auto">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Carregando...
                </>
              ) : (
                'Buscar Dados'
              )}
            </Button>
          </div>
        </Card>

        {/* Filtros de busca - só aparecem após buscar */}
        {hasSearched && !loading && (
          <div className="flex gap-2">
            <Input 
              placeholder="Filtrar por nome..." 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="max-w-xs"
            />
            <Input 
              placeholder="Filtrar por telefone..." 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      {/* Dados - só aparecem após buscar */}
      {!hasSearched ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selecione os filtros e clique em Buscar</h3>
          <p className="text-muted-foreground">
            Escolha um evento e clique no botão "Buscar Dados" para visualizar o desempenho dos usuários.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStats.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              {userStats.length === 0 ? "Nenhum usuário com submissões ainda" : "Nenhum usuário encontrado com os filtros aplicados"}
            </Card>
          ) : (
            filteredStats
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
                    {stat.user_phone && (
                      <p className="text-sm text-muted-foreground">📱 {stat.user_phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Trophy className={`w-5 h-5 ${stat.completion_percentage > 100 ? 'text-red-500' : 'text-accent'}`} />
                      <span className={`text-2xl font-bold ${stat.completion_percentage > 100 ? 'text-red-500' : ''}`}>
                        {stat.completion_percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Conclusão</p>
                    {stat.completion_percentage > 100 && (
                      <p className="text-xs text-red-500 font-medium mt-1">⚠️ Erro detectado</p>
                    )}
                  </div>
                </div>
                {stat.completion_percentage > 100 && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-500 font-medium">
                      ⚠️ Atenção: Este usuário tem mais aprovações do que posts disponíveis. Verifique as aprovações.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Eventos</p>
                    <p className="text-xl font-bold">{stat.events_participated}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovados</p>
                    <p className="text-xl font-bold text-green-500">{stat.approved_submissions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-xl font-bold text-yellow-500">{stat.pending_submissions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejeitados</p>
                    <p className="text-xl font-bold text-red-500">{stat.rejected_submissions}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all ${stat.completion_percentage > 100 ? 'bg-red-500' : 'bg-gradient-primary'}`}
                      style={{ width: `${Math.min(stat.completion_percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                </Card>
              ))
          )}
        </div>
      )}
    </div>
  );
};