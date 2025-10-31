import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sb } from "@/lib/supabaseSafe";
import { Trophy, Users, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  usePerformanceEvents, 
  useAllUserStats, 
  useEventUserStats,
  type UserStats
} from "@/hooks/useUserPerformance";

export const UserPerformance = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(false);
  const [debouncedSearchName, setDebouncedSearchName] = useState("");
  const [debouncedSearchPhone, setDebouncedSearchPhone] = useState("");

  // Buscar eventos com cache
  const { data: events = [], isLoading: eventsLoading } = usePerformanceEvents(isMasterAdmin, currentAgencyId);

  // Buscar estatísticas com cache (só quando usuário clicar em buscar)
  const { data: allStatsData = [], isLoading: allStatsLoading, refetch: refetchAllStats } = useAllUserStats(
    currentAgencyId,
    isMasterAdmin,
    false // disabled por padrão
  );

  const { data: eventStatsData = [], isLoading: eventStatsLoading, refetch: refetchEventStats } = useEventUserStats(
    selectedEventId,
    currentAgencyId,
    isMasterAdmin,
    false // disabled por padrão
  );

  const loading = eventsLoading || allStatsLoading || eventStatsLoading;
  const userStats = selectedEventId === "all" ? allStatsData : eventStatsData;

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

    // Verificar role e agência em paralelo
    const [roleResult, agencyResult] = await Promise.all([
      sb.from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master_admin')
        .maybeSingle(),
      sb.from('agencies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()
    ]);

    const isMaster = !!roleResult.data;
    setIsMasterAdmin(isMaster);

    const agencyId = agencyResult.data?.id || null;
    setCurrentAgencyId(agencyId);

    // Setar selectedEventId inicial
    if (events.length > 0) {
      setSelectedEventId("all");
    }
  };

  const handleSearch = async () => {
    if (!selectedEventId) {
      toast.error("Por favor, selecione um evento antes de buscar.");
      return;
    }
    
    setHasSearched(true);
    
    // Trigger refetch com base no selectedEventId
    if (selectedEventId === "all") {
      await refetchAllStats();
    } else {
      await refetchEventStats();
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
