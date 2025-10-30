import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { sb } from "@/lib/supabaseSafe";
import { Trophy, Users, Target, TrendingUp, FileSpreadsheet, FileText, AlertTriangle, CheckCircle, Clock, Award, BarChart3, PieChart, Calendar } from "lucide-react";
import { BarChart, Bar, PieChart as RePieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Papa from 'papaparse';

interface EventStats {
  event_id: string;
  event_title: string;
  event_date: string | null;
  event_location: string | null;
  event_sector: string | null;
  total_vacancies: number | null;
  is_active: boolean;
  required_posts: number | null;
  required_sales: number | null;
  target_gender: string[];
  total_users: number;
  total_submissions: number;
  approved_submissions: number;
  pending_submissions: number;
  rejected_submissions: number;
  total_posts_available: number;
  conversion_rate: number;
  approval_rate: number;
  avg_posts_per_user: number;
}

interface UserStats {
  user_id: string;
  user_name: string;
  user_email: string;
  user_instagram: string;
  events_participated: number;
  total_submissions: number;
  approved_submissions: number;
  total_posts_available: number;
  completion_percentage: number;
}

interface TimelineData {
  date: string;
  submissions: number;
}

interface GenderDistribution {
  gender: string;
  count: number;
}

export const DashboardStats = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [genderData, setGenderData] = useState<GenderDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(false);
  const [selectedSections, setSelectedSections] = useState({
    essentialData: true,
    participationMetrics: true,
    overview: true,
    statusChart: true,
    genderChart: true,
    top10Chart: true,
    timeline: true,
    ranking: true,
    alerts: true
  });

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

  useEffect(() => {
    checkAgencyAndLoadEvents();
  }, []);

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
    
    console.log('📊 Loaded events for agency:', data?.length || 0);
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

  const exportEventStatsToExcel = () => {
    const eventName = selectedEventId === "all" 
      ? "Todos os Eventos" 
      : events.find(e => e.id === selectedEventId)?.title || "Evento";

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: false }] };
    
    // Aba 1: Dados Essenciais do Evento (se selecionado)
    if (selectedSections.essentialData || selectedSections.participationMetrics) {
      const eventSheet = XLSX.utils.json_to_sheet(
        eventStats.map(stat => {
          const row: any = {};
          
          if (selectedSections.essentialData) {
            row['Evento'] = stat.event_title;
            row['Data do Evento'] = stat.event_date ? format(parseISO(stat.event_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A';
            row['Local'] = stat.event_location || 'N/A';
            row['Setor'] = stat.event_sector || 'N/A';
            row['Vagas'] = stat.total_vacancies || 'N/A';
            row['Status'] = stat.is_active ? 'Ativo' : 'Inativo';
            row['Posts Requisitados'] = stat.required_posts || 'N/A';
            row['Vendas Requisitadas'] = stat.required_sales || 'N/A';
            row['Gênero Alvo'] = stat.target_gender.join(', ') || 'Todos';
          }
          
          if (selectedSections.participationMetrics) {
            row['Participantes Únicos'] = stat.total_users;
            row['Total de Submissões'] = stat.total_submissions;
            row['Posts Aprovados'] = stat.approved_submissions;
            row['Posts Pendentes'] = stat.pending_submissions;
            row['Posts Rejeitados'] = stat.rejected_submissions;
            row['Posts Disponíveis'] = stat.total_posts_available;
            row['Taxa de Conversão (%)'] = stat.conversion_rate.toFixed(1);
            row['Taxa de Aprovação (%)'] = stat.approval_rate.toFixed(1);
            row['Média Posts/Usuário'] = stat.avg_posts_per_user.toFixed(1);
          }
          
          return row;
        })
      );
      XLSX.utils.book_append_sheet(workbook, eventSheet, 'Estatísticas do Evento');
    }

    // Aba 2: Ranking de Usuários (se selecionado)
    if (selectedSections.ranking) {
      const top10 = [...userStats].sort((a, b) => b.approved_submissions - a.approved_submissions).slice(0, 10);
      const userSheet = XLSX.utils.json_to_sheet(
        top10.map((stat, index) => ({
          'Posição': index + 1,
          'Nome': stat.user_name,
          'Email': stat.user_email,
          'Instagram': stat.user_instagram,
          'Eventos': stat.events_participated,
          'Posts Aprovados': stat.approved_submissions,
          'Total de Submissões': stat.total_submissions,
          'Posts Disponíveis': stat.total_posts_available,
          'Conclusão (%)': stat.completion_percentage
        }))
      );
      XLSX.utils.book_append_sheet(workbook, userSheet, 'Top 10 Usuários');
    }

    // Aba 3: Linha do Tempo (se selecionado)
    if (selectedSections.timeline && timelineData.length > 0) {
      const timelineSheet = XLSX.utils.json_to_sheet(
        timelineData.map(t => ({
          'Data': t.date,
          'Submissões': t.submissions
        }))
      );
      XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Linha do Tempo');
    }

    // Aba 4: Distribuição por Gênero (se selecionado)
    if ((selectedSections.genderChart) && genderData.length > 0) {
      const genderSheet = XLSX.utils.json_to_sheet(
        genderData.map(g => ({
          'Gênero': g.gender,
          'Quantidade': g.count
        }))
      );
      XLSX.utils.book_append_sheet(workbook, genderSheet, 'Distribuição Gênero');
    }

    // Aba 5: Alertas (se selecionado)
    if (selectedSections.alerts) {
      const alertUsers = userStats.filter(u => u.completion_percentage > 100);
      const highRejectionEvents = eventStats.filter(e => e.approval_rate < 50);
      
      const alertsData = [
        { 'Tipo de Alerta': 'Usuários com >100% conclusão', 'Quantidade': alertUsers.length },
        { 'Tipo de Alerta': 'Eventos com alta taxa de rejeição', 'Quantidade': highRejectionEvents.length }
      ];
      
      const alertSheet = XLSX.utils.json_to_sheet(alertsData);
      XLSX.utils.book_append_sheet(workbook, alertSheet, 'Alertas');
    }

    XLSX.writeFile(workbook, `Relatorio_Completo_${eventName}_${new Date().toISOString().split('T')[0]}.xlsx`, { 
      bookType: 'xlsx', 
      type: 'binary', 
      compression: true 
    });
    toast.success("Relatório Excel completo exportado com sucesso!");
    setShowExportDialog(false);
  };

  const exportEventStatsToPDF = async () => {
    const eventName = selectedEventId === "all" 
      ? "Todos os Eventos" 
      : events.find(e => e.id === selectedEventId)?.title || "Evento";

    toast.info("Gerando PDF com gráficos...");

    const doc = new jsPDF();
    let yPos = 20;
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(139, 92, 246);
    doc.text(`Relatório Completo - ${eventName}`, 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPos);
    yPos += 15;

    // Tabela 1: Dados Essenciais do Evento (se selecionado)
    if (selectedSections.essentialData) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('📋 Dados Essenciais do Evento', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Evento', 'Data', 'Local', 'Vagas', 'Status', 'Gênero Alvo']],
        body: eventStats.map(stat => [
          stat.event_title,
          stat.event_date ? format(parseISO(stat.event_date), "dd/MM/yyyy") : 'N/A',
          stat.event_location || 'N/A',
          stat.total_vacancies?.toString() || 'N/A',
          stat.is_active ? 'Ativo' : 'Inativo',
          stat.target_gender.join(', ') || 'Todos'
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tabela 2: Métricas de Participação (se selecionado)
    if (selectedSections.participationMetrics) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('📊 Métricas de Participação', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Participantes', 'Submissões', 'Aprovados', 'Pendentes', 'Rejeitados', 'Taxa Aprovação']],
        body: eventStats.map(stat => [
          stat.total_users.toString(),
          stat.total_submissions.toString(),
          stat.approved_submissions.toString(),
          stat.pending_submissions.toString(),
          stat.rejected_submissions.toString(),
          `${stat.approval_rate.toFixed(1)}%`
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tabela 3: Top 10 Usuários (se selecionado)
    if (selectedSections.ranking) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text('🏆 Top 10 Usuários', 14, yPos);
      yPos += 5;

      const top10 = [...userStats].sort((a, b) => b.approved_submissions - a.approved_submissions).slice(0, 10);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Pos', 'Nome', 'Email', 'Aprovados', 'Conclusão']],
        body: top10.map((stat, index) => [
          (index + 1).toString(),
          stat.user_name,
          stat.user_email,
          stat.approved_submissions.toString(),
          `${stat.completion_percentage}%`
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Timeline (se selecionado)
    if (selectedSections.timeline && timelineData.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text('📈 Linha do Tempo (Últimos 14 Dias)', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Submissões']],
        body: timelineData.map(t => [t.date, t.submissions.toString()]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Capturar e adicionar gráficos
    if (selectedSections.statusChart) {
      const statusChartElement = document.getElementById('status-chart');
      if (statusChartElement) {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('📊 Gráfico de Status', 14, yPos);
        yPos += 5;

        try {
          const canvas = await html2canvas(statusChartElement, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, yPos, 180, 100);
          yPos += 110;
        } catch (error) {
          console.error('Erro ao capturar gráfico:', error);
        }
      }
    }

    if (selectedSections.genderChart && genderData.length > 0) {
      const genderChartElement = document.getElementById('gender-chart');
      if (genderChartElement) {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('👥 Distribuição por Gênero', 14, yPos);
        yPos += 5;

        try {
          const canvas = await html2canvas(genderChartElement, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, yPos, 180, 100);
          yPos += 110;
        } catch (error) {
          console.error('Erro ao capturar gráfico:', error);
        }
      }
    }

    // Alertas (se selecionado)
    if (selectedSections.alerts) {
      const alerts = userStats.filter(u => u.completion_percentage > 100);
      const highRejectionEvents = eventStats.filter(e => e.approval_rate < 50);
      
      if (alerts.length > 0 || highRejectionEvents.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(239, 68, 68);
        doc.text('⚠️ Alertas de Atenção', 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;

        const alertsData = [];
        if (alerts.length > 0) {
          alertsData.push(['Usuários com >100% conclusão', `${alerts.length} usuário(s) identificado(s)`]);
        }
        if (highRejectionEvents.length > 0) {
          alertsData.push(['Eventos com alta taxa de rejeição', `${highRejectionEvents.length} evento(s)`]);
        }

        autoTable(doc, {
          startY: yPos,
          head: [['Alerta', 'Detalhes']],
          body: alertsData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 }
        });
      }
    }

    doc.save(`Relatorio_Completo_${eventName}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Relatório PDF completo exportado com sucesso!");
    setShowExportDialog(false);
  };

  const handleSelectAll = () => {
    setSelectedSections({
      essentialData: true,
      participationMetrics: true,
      overview: true,
      statusChart: true,
      genderChart: true,
      top10Chart: true,
      timeline: true,
      ranking: true,
      alerts: true
    });
  };

  const handleDeselectAll = () => {
    setSelectedSections({
      essentialData: false,
      participationMetrics: false,
      overview: false,
      statusChart: false,
      genderChart: false,
      top10Chart: false,
      timeline: false,
      ranking: false,
      alerts: false
    });
  };

  const handleExport = async () => {
    if (exportType === 'excel') {
      exportEventStatsToExcel();
    } else {
      await exportEventStatsToPDF();
    }
  };

  const loadAllStats = async () => {
    if (!currentAgencyId) {
      console.warn('⚠️ No agency ID available');
      return;
    }

    // Estatísticas por evento
    let query = sb.from('events').select('*').eq('agency_id', currentAgencyId);
    
    if (activeFilter === "active") {
      query = query.eq('is_active', true);
    } else if (activeFilter === "inactive") {
      query = query.eq('is_active', false);
    }
    
    const { data: eventsData } = await query;
    console.log('📊 Loading stats for events:', eventsData?.length || 0);

    const eventStatsData: EventStats[] = [];
    const allSubmissionsDates: { date: string; count: number }[] = [];
    const allGenderData: Map<string, number> = new Map();

    for (const event of eventsData || []) {
      const { data: postsData } = await sb
        .from('posts')
        .select('id')
        .eq('event_id', event.id);

      const postIds = (postsData || []).map((p: any) => p.id);
      
      const { data: submissionsData } = await sb
        .from('submissions')
        .select('user_id, status, submitted_at')
        .in('post_id', postIds);

      const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));
      
      const approvedCount = (submissionsData || []).filter((s: any) => s.status === 'approved').length;
      const pendingCount = (submissionsData || []).filter((s: any) => s.status === 'pending').length;
      const rejectedCount = (submissionsData || []).filter((s: any) => s.status === 'rejected').length;
      
      const conversionRate = event.numero_de_vagas ? (uniqueUsers.size / event.numero_de_vagas) * 100 : 0;
      const approvalRate = (submissionsData || []).length > 0 ? (approvedCount / (submissionsData || []).length) * 100 : 0;
      const avgPostsPerUser = uniqueUsers.size > 0 ? (submissionsData || []).length / uniqueUsers.size : 0;

      // Coletar dados de timeline
      (submissionsData || []).forEach((s: any) => {
        if (s.submitted_at) {
          const date = format(parseISO(s.submitted_at), 'dd/MM', { locale: ptBR });
          const existing = allSubmissionsDates.find(d => d.date === date);
          if (existing) {
            existing.count++;
          } else {
            allSubmissionsDates.push({ date, count: 1 });
          }
        }
      });

      // Coletar dados de gênero dos usuários reais
      const userIds = Array.from(uniqueUsers);
      if (userIds.length > 0) {
        const { data: profilesGender } = await sb
          .from('profiles')
          .select('gender')
          .in('id', userIds);
        
        (profilesGender || []).forEach((p: any) => {
          if (p.gender) {
            const displayGender = p.gender === 'masculino' ? 'Masculino' : p.gender === 'feminino' ? 'Feminino' : 'LGBTQ+';
            allGenderData.set(displayGender, (allGenderData.get(displayGender) || 0) + 1);
          }
        });
      }

      eventStatsData.push({
        event_id: event.id,
        event_title: event.title,
        event_date: event.event_date,
        event_location: event.location,
        event_sector: event.setor,
        total_vacancies: event.numero_de_vagas,
        is_active: event.is_active,
        required_posts: event.required_posts,
        required_sales: event.required_sales,
        target_gender: event.target_gender || [],
        total_users: uniqueUsers.size,
        total_submissions: (submissionsData || []).length,
        approved_submissions: approvedCount,
        pending_submissions: pendingCount,
        rejected_submissions: rejectedCount,
        total_posts_available: (postsData || []).length,
        conversion_rate: conversionRate,
        approval_rate: approvalRate,
        avg_posts_per_user: avgPostsPerUser
      });
    }

    setEventStats(eventStatsData);
    
    // Processar timeline
    const sortedTimeline = allSubmissionsDates
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
      })
      .slice(-14); // Últimos 14 dias
    
    setTimelineData(sortedTimeline.map(d => ({ date: d.date, submissions: d.count })));

    // Processar gênero
    const genderArray: GenderDistribution[] = Array.from(allGenderData.entries()).map(([gender, count]) => ({
      gender,
      count
    }));
    setGenderData(genderArray);

    // Estatísticas por usuário - apenas da agência
    const allUserIds = new Set<string>();
    for (const event of eventsData || []) {
      const { data: postsData } = await sb
        .from('posts')
        .select('id')
        .eq('event_id', event.id);
      
      const postIds = (postsData || []).map((p: any) => p.id);
      
      if (postIds.length > 0) {
        const { data: submissionsData } = await sb
          .from('submissions')
          .select('user_id')
          .in('post_id', postIds);
        
        (submissionsData || []).forEach((s: any) => allUserIds.add(s.user_id));
      }
    }

    const uniqueUserIds = Array.from(allUserIds);
    if (uniqueUserIds.length === 0) {
      setUserStats([]);
      return;
    }

    const { data: profilesData } = await sb
      .from('profiles')
      .select('id, full_name, email, instagram')
      .in('id', uniqueUserIds);

    const userStatsData: UserStats[] = [];

    for (const profile of profilesData || []) {
      // Buscar apenas submissões dos eventos da agência
      const eventIds = (eventsData || []).map((e: any) => e.id);
      const { data: eventPosts } = await sb
        .from('posts')
        .select('id, event_id')
        .in('event_id', eventIds);
      
      const postIds = (eventPosts || []).map(p => p.id);
      
      const { data: userSubmissions } = await sb
        .from('submissions')
        .select('post_id, status, posts!inner(event_id)')
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

      const completionPercentage = totalPostsAvailable > 0 
        ? Math.round((approvedSubmissions / totalPostsAvailable) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        events_participated: eventsParticipated,
        total_submissions: (userSubmissions || []).length,
        approved_submissions: approvedSubmissions,
        total_posts_available: totalPostsAvailable,
        completion_percentage: completionPercentage,
      });
    }

    setUserStats(userStatsData.filter(u => u.total_submissions > 0));
  };

  const loadEventSpecificStats = async (eventId: string) => {
    if (!currentAgencyId) {
      console.warn('⚠️ No agency ID available');
      return;
    }

    // Verificar se o evento pertence à agência
    const { data: event } = await sb
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('agency_id', currentAgencyId)
      .maybeSingle();

    if (!event) {
      console.warn('⚠️ Evento não pertence à agência');
      setEventStats([]);
      setUserStats([]);
      return;
    }

    const { data: postsData } = await sb
      .from('posts')
      .select('id')
      .eq('event_id', eventId);

    const postIds = (postsData || []).map((p: any) => p.id);
    
    const { data: submissionsData } = await sb
      .from('submissions')
      .select('user_id, status, submitted_at')
      .in('post_id', postIds);

    const uniqueUsers = new Set((submissionsData || []).map((s: any) => s.user_id));
    
    const approvedCount = (submissionsData || []).filter((s: any) => s.status === 'approved').length;
    const pendingCount = (submissionsData || []).filter((s: any) => s.status === 'pending').length;
    const rejectedCount = (submissionsData || []).filter((s: any) => s.status === 'rejected').length;
    
    const conversionRate = event.numero_de_vagas ? (uniqueUsers.size / event.numero_de_vagas) * 100 : 0;
    const approvalRate = (submissionsData || []).length > 0 ? (approvedCount / (submissionsData || []).length) * 100 : 0;
    const avgPostsPerUser = uniqueUsers.size > 0 ? (submissionsData || []).length / uniqueUsers.size : 0;

    // Timeline data
    const submissionsDates: { date: string; count: number }[] = [];
    (submissionsData || []).forEach((s: any) => {
      if (s.submitted_at) {
        const date = format(parseISO(s.submitted_at), 'dd/MM', { locale: ptBR });
        const existing = submissionsDates.find(d => d.date === date);
        if (existing) {
          existing.count++;
        } else {
          submissionsDates.push({ date, count: 1 });
        }
      }
    });

    const sortedTimeline = submissionsDates
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
      })
      .slice(-14);

    setTimelineData(sortedTimeline.map(d => ({ date: d.date, submissions: d.count })));

    // Gender data - buscar gênero real dos usuários
    const uniqueUserIds = Array.from(uniqueUsers);
    if (uniqueUserIds.length > 0) {
      const { data: profilesGender } = await sb
        .from('profiles')
        .select('gender')
        .in('id', uniqueUserIds);
      
      const genderCount = new Map<string, number>();
      (profilesGender || []).forEach((p: any) => {
        if (p.gender) {
          genderCount.set(p.gender, (genderCount.get(p.gender) || 0) + 1);
        }
      });
      
      const genderArray = Array.from(genderCount.entries()).map(([gender, count]) => ({
        gender: gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'LGBTQ+',
        count
      }));
      setGenderData(genderArray);
    } else {
      setGenderData([]);
    }

    const eventTitle = event && event.title ? event.title : '';

    setEventStats([{
      event_id: eventId,
      event_title: eventTitle,
      event_date: event.event_date,
      event_location: event.location,
      event_sector: event.setor,
      total_vacancies: event.numero_de_vagas,
      is_active: event.is_active,
      required_posts: event.required_posts,
      required_sales: event.required_sales,
      target_gender: event.target_gender || [],
      total_users: uniqueUsers.size,
      total_submissions: (submissionsData || []).length,
      approved_submissions: approvedCount,
      pending_submissions: pendingCount,
      rejected_submissions: rejectedCount,
      total_posts_available: (postsData || []).length,
      conversion_rate: conversionRate,
      approval_rate: approvalRate,
      avg_posts_per_user: avgPostsPerUser
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
        .select('id, status')
        .in('post_id', postIds)
        .eq('user_id', profile.id);

      const approvedSubmissions = (userSubmissions || []).filter((s: any) => s.status === 'approved').length;

      const completionPercentage = (postsData || []).length > 0
        ? Math.round((approvedSubmissions / (postsData || []).length) * 100)
        : 0;

      userStatsData.push({
        user_id: profile.id,
        user_name: profile.full_name || 'Sem nome',
        user_email: profile.email || 'Sem email',
        user_instagram: profile.instagram || 'Sem Instagram',
        events_participated: 1,
        total_submissions: (userSubmissions || []).length,
        approved_submissions: approvedSubmissions,
        total_posts_available: (postsData || []).length,
        completion_percentage: completionPercentage,
      });
    }

    setUserStats(userStatsData);
  };

  const statusData = eventStats.length > 0 ? [
    { name: 'Aprovados', value: eventStats[0].approved_submissions, color: '#10b981' },
    { name: 'Pendentes', value: eventStats[0].pending_submissions, color: '#f59e0b' },
    { name: 'Rejeitados', value: eventStats[0].rejected_submissions, color: '#ef4444' }
  ] : [];

  const top10Users = [...userStats].sort((a, b) => b.approved_submissions - a.approved_submissions).slice(0, 10);
  const perfectUsers = userStats.filter(u => u.completion_percentage === 100);
  const alertUsers = userStats.filter(u => u.completion_percentage > 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">📊 Dashboard de Desempenho Completo</h2>
        {hasSearched && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    setExportType('excel');
                    setShowExportDialog(true);
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel Completo
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Selecionar Seções do Relatório</DialogTitle>
                <DialogDescription>
                  Escolha quais métricas e dados incluir no relatório {exportType === 'excel' ? 'Excel' : 'PDF'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant="secondary" onClick={handleSelectAll}>
                    Selecionar Tudo
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                    Desmarcar Tudo
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="essentialData" 
                      checked={selectedSections.essentialData}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, essentialData: checked as boolean }))
                      }
                    />
                    <label htmlFor="essentialData" className="text-sm font-medium cursor-pointer">
                      📋 Dados Essenciais do Evento
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="participationMetrics" 
                      checked={selectedSections.participationMetrics}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, participationMetrics: checked as boolean }))
                      }
                    />
                    <label htmlFor="participationMetrics" className="text-sm font-medium cursor-pointer">
                      📊 Métricas de Participação
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="statusChart" 
                      checked={selectedSections.statusChart}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, statusChart: checked as boolean }))
                      }
                    />
                    <label htmlFor="statusChart" className="text-sm font-medium cursor-pointer">
                      📈 Gráfico de Posts por Status
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="genderChart" 
                      checked={selectedSections.genderChart}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, genderChart: checked as boolean }))
                      }
                    />
                    <label htmlFor="genderChart" className="text-sm font-medium cursor-pointer">
                      👥 Gráfico de Distribuição por Gênero
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="top10Chart" 
                      checked={selectedSections.top10Chart}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, top10Chart: checked as boolean }))
                      }
                    />
                    <label htmlFor="top10Chart" className="text-sm font-medium cursor-pointer">
                      🏆 Gráfico Top 10 Usuários
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="timeline" 
                      checked={selectedSections.timeline}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, timeline: checked as boolean }))
                      }
                    />
                    <label htmlFor="timeline" className="text-sm font-medium cursor-pointer">
                      📉 Timeline de Submissões (Últimos 14 Dias)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ranking" 
                      checked={selectedSections.ranking}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, ranking: checked as boolean }))
                      }
                    />
                    <label htmlFor="ranking" className="text-sm font-medium cursor-pointer">
                      🥇 Ranking de Usuários (Top 10 + 100% Conclusão)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="alerts" 
                      checked={selectedSections.alerts}
                      onCheckedChange={(checked) => 
                        setSelectedSections(prev => ({ ...prev, alerts: checked as boolean }))
                      }
                    />
                    <label htmlFor="alerts" className="text-sm font-medium cursor-pointer">
                      ⚠️ Alertas e Indicadores de Atenção
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleExport}>
                  Gerar Relatório {exportType === 'excel' ? 'Excel' : 'PDF'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => {
              setExportType('pdf');
              setShowExportDialog(true);
            }}
          >
            <FileText className="w-4 h-4" />
            PDF Completo
          </Button>
        </div>
        )}
      </div>
      
      {/* Filtros sempre visíveis */}
      <Card className="p-6">
        <p className="text-sm text-muted-foreground mb-4">
          📊 Selecione os filtros abaixo e clique em "Buscar" para carregar as estatísticas do evento.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
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

      {/* Dados - só aparecem após buscar */}
      {!hasSearched ? (
        <Card className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selecione os filtros e clique em Buscar</h3>
          <p className="text-muted-foreground">
            Escolha um evento e clique no botão "Buscar Dados" para visualizar as estatísticas completas.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="alerts">Alertas</TabsTrigger>
            </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {eventStats.map((stat) => (
            <div key={stat.event_id} className="space-y-4">
              {/* Dados Essenciais */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Dados Essenciais do Evento
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome do Evento</p>
                    <p className="text-lg font-bold">{stat.event_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="text-lg font-bold">
                      {stat.event_date ? format(parseISO(stat.event_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="text-lg font-bold">{stat.event_location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Setor</p>
                    <p className="text-lg font-bold">{stat.event_sector || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vagas Disponíveis</p>
                    <p className="text-lg font-bold">{stat.total_vacancies || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-lg font-bold ${stat.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.is_active ? '✓ Ativo' : '✗ Inativo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posts Requisitados</p>
                    <p className="text-lg font-bold">{stat.required_posts || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gênero Alvo</p>
                    <p className="text-lg font-bold">{stat.target_gender.join(', ') || 'Todos'}</p>
                  </div>
                </div>
              </Card>

              {/* Métricas de Participação */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Métricas de Participação
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes Únicos</p>
                      <p className="text-2xl font-bold">{stat.total_users}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Submissões</p>
                      <p className="text-2xl font-bold">{stat.total_submissions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Aprovados</p>
                      <p className="text-2xl font-bold text-green-600">{stat.approved_submissions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Pendentes</p>
                      <p className="text-2xl font-bold text-amber-600">{stat.pending_submissions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Posts Rejeitados</p>
                      <p className="text-2xl font-bold text-red-600">{stat.rejected_submissions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                      <p className="text-2xl font-bold">{stat.conversion_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                      <p className="text-2xl font-bold text-blue-600">{stat.approval_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média Posts/Usuário</p>
                      <p className="text-2xl font-bold">{stat.avg_posts_per_user.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Gráfico de Status */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Posts por Status</h3>
              {statusData.length > 0 && statusData.some(d => d.value > 0) ? (
                <div id="status-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados de submissões ainda
                </div>
              )}
            </Card>

            {/* Gráfico de Gênero */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Distribuição por Gênero</h3>
              {genderData.length > 0 ? (
                <div id="gender-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, count }) => `${gender}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados demográficos disponíveis
                </div>
              )}
            </Card>
          </div>

          {/* Gráfico de Barras - Top 10 */}
          {selectedSections.top10Chart && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Top 10 Usuários por Posts Aprovados</h3>
              {top10Users.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top10Users}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="user_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved_submissions" name="Posts Aprovados" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados de usuários ainda
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Evolução de Submissões (Últimos 14 Dias)</h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="submissions" 
                    name="Submissões" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Sem dados de timeline disponíveis
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top 10 */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Top 10 Participantes
              </h3>
              <div className="space-y-3">
                {top10Users.map((user, index) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-amber-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-muted text-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{user.user_name}</p>
                      <p className="text-sm text-muted-foreground">{user.user_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{user.approved_submissions}</p>
                      <p className="text-xs text-muted-foreground">aprovados</p>
                    </div>
                  </div>
                ))}
                {top10Users.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Sem dados de usuários ainda
                  </div>
                )}
              </div>
            </Card>

            {/* 100% de Conclusão */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Usuários com 100% de Conclusão
              </h3>
              <div className="space-y-3">
                {perfectUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div className="flex-1">
                      <p className="font-semibold">{user.user_name}</p>
                      <p className="text-sm text-muted-foreground">{user.user_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{user.approved_submissions}/{user.total_posts_available}</p>
                      <p className="text-xs text-muted-foreground">posts</p>
                    </div>
                  </div>
                ))}
                {perfectUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário com 100% ainda
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Indicadores de Alerta
            </h3>
            
            {/* Usuários com mais de 100% */}
            {alertUsers.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3">
                  ⚠️ Usuários com mais de 100% de conclusão ({alertUsers.length})
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Possível erro de aprovação ou configuração de posts
                </p>
                <div className="space-y-2">
                  {alertUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded">
                      <div>
                        <p className="font-medium">{user.user_name}</p>
                        <p className="text-sm text-muted-foreground">{user.user_email}</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        {user.completion_percentage}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Taxa de Rejeição Alta */}
            {eventStats.map((stat) => {
              const rejectionRate = stat.total_submissions > 0 
                ? (stat.rejected_submissions / stat.total_submissions) * 100 
                : 0;
              
              if (rejectionRate > 30) {
                return (
                  <div key={stat.event_id} className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                      ⚠️ Alta taxa de rejeição detectada
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Evento: <span className="font-medium">{stat.event_title}</span>
                    </p>
                    <p className="text-sm">
                      Taxa de rejeição: <span className="font-bold text-amber-600">{rejectionRate.toFixed(1)}%</span>
                      {' '}({stat.rejected_submissions} de {stat.total_submissions} submissões)
                    </p>
                  </div>
                );
              }
              return null;
            })}

            {alertUsers.length === 0 && eventStats.every(stat => 
              stat.total_submissions === 0 || (stat.rejected_submissions / stat.total_submissions) * 100 <= 30
            ) && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-green-600">Tudo certo!</p>
                <p className="text-sm text-muted-foreground">Nenhum alerta detectado no momento</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
};