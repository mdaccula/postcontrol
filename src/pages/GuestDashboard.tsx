import { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useIsGuest } from '@/hooks/useIsGuest';
import { useGuestPermissions } from '@/hooks/useGuestPermissions';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Trophy, Eye, CheckCircle, XCircle, Clock, AlertCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { PERMISSION_LABELS } from '@/types/guest';
import { useEventsQuery, useSubmissionsQuery, useBulkUpdateSubmissionStatusMutation } from '@/hooks/consolidated';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCheck } from 'lucide-react';

// ✅ FASE 2 - Item 2.1 e 2.2: Lazy load dos componentes de imagem
const SubmissionImageDisplay = lazy(() => import('@/components/SubmissionImageDisplay').then(m => ({
  default: m.SubmissionImageDisplay
})));
const SubmissionZoomDialog = lazy(() => import('@/components/SubmissionZoomDialog').then(m => ({
  default: m.SubmissionZoomDialog
})));
export const GuestDashboard = () => {
  const navigate = useNavigate();
  const {
    isGuest,
    guestData,
    loading: guestLoading
  } = useIsGuest();
  const {
    hasPermission,
    getPermissionLevel,
    allowedEvents,
    loading: permissionsLoading
  } = useGuestPermissions();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string>('all');
  const [zoomedSubmission, setZoomedSubmission] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ FASE 3: Estados para filtros avançados
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFollowerRange, setSelectedFollowerRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);

  // ✅ Bulk approval states
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const bulkUpdateStatusMutation = useBulkUpdateSubmissionStatusMutation();

  // ✅ Usar hooks consolidados em vez de fetch manual
  const {
    data: eventsData,
    isLoading: loadingEvents
  } = useEventsQuery({
    agencyId: guestData?.agency_id,
    enabled: isGuest && !!guestData?.agency_id && allowedEvents.length > 0
  });

  // Extrair apenas array de events (não posts)
  const events = eventsData?.events || [];
  const {
    data: submissionsResponse,
    isLoading: loadingSubmissions,
    refetch: refetchSubmissions
  } = useSubmissionsQuery({
    eventId: selectedEventId || undefined,
    enrichProfiles: true,
    enabled: !!selectedEventId,
    itemsPerPage: 999999 // Guest vê todas as submissões dos eventos autorizados
  });

  // Extrair array de submissions do objeto paginado
  const submissions = Array.isArray(submissionsResponse) ? submissionsResponse : submissionsResponse?.data || [];

  // Redirecionar se não for convidado
  useEffect(() => {
    if (!guestLoading && !isGuest) {
      toast.error('Você não tem acesso de convidado');
      navigate('/dashboard');
    }
  }, [isGuest, guestLoading, navigate]);

  // Auto-selecionar primeiro evento quando carregar
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      // Filtrar apenas eventos permitidos
      const allowedEventsData = events.filter(e => allowedEvents.includes(e.id));
      if (allowedEventsData.length > 0) {
        setSelectedEventId(allowedEventsData[0].id);
      }
    }
  }, [events, allowedEvents, selectedEventId]);
  const handleApproveSubmission = async (submissionId: string) => {
    if (!selectedEventId || !hasPermission(selectedEventId, 'moderator')) {
      toast.error('Você não tem permissão para aprovar submissões');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('submissions').update({
        status: 'approved',
        approved_at: new Date().toISOString()
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Submissão aprovada!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          y: 0.6
        }
      });

      // Log da ação
      await supabase.from('guest_audit_log').insert({
        guest_id: guestData.id,
        event_id: selectedEventId,
        submission_id: submissionId,
        action: 'approved_submission',
        action_data: {
          status: 'approved'
        }
      });
      refetchSubmissions();

      // ✅ FASE 2 - Item 2.2: Fechar zoom dialog se estiver aberto
      if (zoomedSubmission?.id === submissionId) {
        setZoomedSubmission(null);
      }
    } catch (err: any) {
      console.error('Error approving submission:', err);
      toast.error('Erro ao aprovar submissão');
    }
  };
  const handleRejectSubmission = async (submissionId: string, reason: string) => {
    if (!selectedEventId || !hasPermission(selectedEventId, 'moderator')) {
      toast.error('Você não tem permissão para reprovar submissões');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('submissions').update({
        status: 'rejected',
        rejection_reason: reason
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Submissão reprovada');

      // Log da ação
      await supabase.from('guest_audit_log').insert({
        guest_id: guestData.id,
        event_id: selectedEventId,
        submission_id: submissionId,
        action: 'rejected_submission',
        action_data: {
          status: 'rejected',
          reason
        }
      });
      refetchSubmissions();

      // ✅ FASE 2 - Item 2.2: Fechar zoom dialog se estiver aberto
      if (zoomedSubmission?.id === submissionId) {
        setZoomedSubmission(null);
      }
    } catch (err: any) {
      console.error('Error rejecting submission:', err);
      toast.error('Erro ao reprovar submissão');
    }
  };

  // ✅ FASE 2 - Item 2.2: Navegação entre submissões no zoom
  const handleZoomNext = () => {
    const currentIndex = filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission?.id);
    if (currentIndex < filteredSubmissions.length - 1) {
      setZoomedSubmission(filteredSubmissions[currentIndex + 1]);
    }
  };
  const handleZoomPrevious = () => {
    const currentIndex = filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission?.id);
    if (currentIndex > 0) {
      setZoomedSubmission(filteredSubmissions[currentIndex - 1]);
    }
  };

  // ✅ FASE 2 - Item 2.2: Wrapper para onReject com prompt
  const handleRejectWithPrompt = (submissionId: string) => {
    const reason = prompt('Motivo da reprovação:');
    if (reason) {
      handleRejectSubmission(submissionId, reason);
    }
  };

  // ✅ FASE 3: Filtrar submissões com todos os filtros
  const filteredSubmissions = submissions.filter((s: any) => {
    // Filtro por post
    if (selectedPostId !== 'all' && s.post_id !== selectedPostId) return false;

    // Filtro por status
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;

    // Filtro por faixa de seguidores
    const effectiveRange = s.followers_range || s.profiles?.followers_range;
    if (selectedFollowerRange !== 'all' && effectiveRange !== selectedFollowerRange) return false;

    // Filtro por período de data
    if (startDate && new Date(s.submitted_at) < new Date(startDate)) return false;
    if (endDate && new Date(s.submitted_at) > new Date(endDate + 'T23:59:59')) return false;

    // Filtro por busca
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const followerRange = s.followers_range || s.profiles?.followers_range || '';
    return s.profiles?.full_name?.toLowerCase().includes(searchLower) || s.profiles?.instagram?.toLowerCase().includes(searchLower) || followerRange.toLowerCase().includes(searchLower);
  });

  // ✅ FASE 3: Paginação
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedSubmissions,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
    resetPage
  } = usePagination({
    items: filteredSubmissions,
    itemsPerPage
  });

  // ✅ FASE 3: Reset página quando filtros mudarem
  useEffect(() => {
    resetPage();
  }, [selectedPostId, selectedStatus, selectedFollowerRange, startDate, endDate, searchTerm, resetPage]);

  // Contar total de posts aprovados por usuário
  const getUserApprovedCount = (userId: string) => {
    return submissions.filter((s: any) => s.user_id === userId && s.status === 'approved').length;
  };

  // Extrair posts únicos do evento atual
  const uniquePosts = Array.from(new Set(submissions.map((s: any) => s.post_id).filter(Boolean))).map(postId => {
    const submission = submissions.find((s: any) => s.post_id === postId);
    return {
      id: postId,
      number: submission?.posts?.post_number || 'N/A'
    };
  }).sort((a, b) => {
    if (typeof a.number === 'number' && typeof b.number === 'number') {
      return a.number - b.number;
    }
    return 0;
  });
  if (guestLoading || permissionsLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>;
  }
  if (!isGuest) {
    return null;
  }

  // Filtrar apenas eventos permitidos
  const allowedEventsData = events.filter(e => allowedEvents.includes(e.id));
  const selectedEvent = allowedEventsData.find(e => e.id === selectedEventId);
  const permissionLevel = selectedEventId ? getPermissionLevel(selectedEventId) : null;

  // ✅ FASE 3: Stats baseados em TODAS as submissions (não paginadas)
  const stats = {
    total: submissions.length,
    pending: submissions.filter((s: any) => s.status === 'pending').length,
    approved: submissions.filter((s: any) => s.status === 'approved').length,
    rejected: submissions.filter((s: any) => s.status === 'rejected').length,
    uniqueUsers: new Set(submissions.map((s: any) => s.user_id)).size
  };

  // ✅ FASE 3: Extrair faixas de seguidores únicas para o filtro
  const uniqueFollowerRanges = Array.from(
    new Set(submissions.map((s: any) => s.followers_range || s.profiles?.followers_range).filter(Boolean))
  ).sort();

  // ✅ FASE 3: Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSelectedPostId('all');
    setSelectedStatus('all');
    setSelectedFollowerRange('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  // ✅ Bulk approval functions
  const toggleSubmissionSelection = (submissionId: string) => {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else {
      newSet.add(submissionId);
    }
    setSelectedSubmissions(newSet);
  };

  const toggleSelectAllPending = () => {
    const pendingIds = paginatedSubmissions
      .filter((s: any) => s.status === 'pending')
      .map((s: any) => s.id);
    
    if (selectedSubmissions.size === pendingIds.length && pendingIds.length > 0) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(pendingIds));
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedSubmissions);
    if (ids.length === 0) return;
    
    if (!selectedEventId || !hasPermission(selectedEventId, 'moderator')) {
      toast.error('Você não tem permissão para aprovar submissões');
      return;
    }
    
    try {
      toast.loading(`Aprovando ${ids.length} submissões...`, { id: 'bulk-approve' });
      
      await bulkUpdateStatusMutation.mutateAsync({
        submissionIds: ids,
        status: 'approved',
        userId: guestData.guest_user_id // ID do guest aprovador
      });
      
      // Log de auditoria para cada submissão
      for (const id of ids) {
        await supabase.from('guest_audit_log').insert({
          guest_id: guestData.id,
          event_id: selectedEventId,
          submission_id: id,
          action: 'bulk_approved_submission',
          action_data: { status: 'approved', bulk: true }
        });
      }
      
      toast.success(`${ids.length} submissões aprovadas!`, { id: 'bulk-approve' });
      confetti({ particleCount: 150, spread: 100 });
      setSelectedSubmissions(new Set());
      refetchSubmissions();
    } catch (err) {
      toast.error('Erro ao aprovar em massa', { id: 'bulk-approve' });
    }
  };

  // Limpar seleções ao trocar de evento
  useEffect(() => {
    setSelectedSubmissions(new Set());
  }, [selectedEventId]);
  return <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="items-center justify-between flex flex-col gap-3 md:flex-row">
            <div>
              <h1 className="font-bold text-xl md:text-2xl">Dashboard de Convidado</h1>
              <p className="text-muted-foreground text-sm md:text-base my-2">
                Acesso válido até {new Date(guestData.access_end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 md:flex-none text-sm h-9">
                ← Voltar
              </Button>
              <Badge variant="secondary" className="text-sm md:text-base py-1 px-2 md:py-[4px] md:px-[8px]">
                <Eye className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                Convidado
              </Badge>
            </div>
          </div>
        </div>

        {/* Seletor de Eventos */}
        <Card className="p-3 md:p-4">
          <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Eventos com Acesso</h3>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
            {allowedEventsData.map(event => {
            const level = getPermissionLevel(event.id);
            return <Button key={event.id} onClick={() => setSelectedEventId(event.id)} variant={selectedEventId === event.id ? 'default' : 'outline'} className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 text-left text-sm h-9 md:h-10">
                  <span className="truncate">{event.title}</span>
                  {level && <Badge variant="secondary" className="shrink-0 text-xs">
                      {PERMISSION_LABELS[level]}
                    </Badge>}
                </Button>;
          })}
          </div>
        </Card>

        {selectedEvent && <>
            {/* Stats - Grid 2x3 em mobile, 5 em desktop */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aprovadas</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.approved}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reprovadas</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.rejected}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usuários</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.uniqueUsers}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Permissões Info */}
            {permissionLevel && <Card className="p-3 md:p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2 md:gap-3">
                  <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm md:text-base">Nível: {PERMISSION_LABELS[permissionLevel]}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {permissionLevel === 'viewer' && 'Visualizar estatísticas e submissões'}
                      {permissionLevel === 'moderator' && 'Visualizar, aprovar e reprovar submissões'}
                      {permissionLevel === 'manager' && 'Acesso total: gerenciar posts e aprovar submissões'}
                    </p>
                  </div>
                </div>
              </Card>}

            {/* ✅ FASE 3: Tabela de Submissões com filtros avançados e paginação */}
            <Card className="p-3 md:p-6">
              <div className="space-y-3 md:space-y-4">
                  <div className="items-center justify-between flex flex-col md:flex-row gap-2">
                  <h3 className="font-semibold text-base md:text-lg">Submissões - {selectedEvent.title}</h3>
                  <div className="flex items-center gap-2">
                    {selectedSubmissions.size > 0 && hasPermission(selectedEventId!, 'moderator') && (
                      <Button onClick={handleBulkApprove} className="bg-green-500 hover:bg-green-600 h-9 text-sm">
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Aprovar {selectedSubmissions.size}
                      </Button>
                    )}
                    <Badge variant="outline" className="text-xs md:text-sm">
                      {filteredSubmissions.length} de {submissions.length} submiss{filteredSubmissions.length !== 1 ? 'ões' : 'ão'}
                    </Badge>
                  </div>
                </div>

                {/* ✅ FASE 3: Filtros Avançados */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-2">
                  <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Post" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os posts</SelectItem>
                      {uniquePosts.map(post => <SelectItem key={post.id} value={post.id}>
                          Post {post.number}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovada</SelectItem>
                      <SelectItem value="rejected">Reprovada</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedFollowerRange} onValueChange={setSelectedFollowerRange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Seguidores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {uniqueFollowerRanges.map(range => <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Início" className="h-9 text-sm" />

                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Fim" className="h-9 text-sm" />

                  <Button variant="outline" onClick={clearAllFilters} className="h-9 text-sm flex items-center gap-2">
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 pl-9 text-sm" />
                </div>
              
                {loadingSubmissions ? <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div> : filteredSubmissions.length === 0 ? <p className="text-center text-muted-foreground py-8">
                    {submissions.length === 0 ? 'Nenhuma submissão encontrada' : 'Nenhum resultado encontrado para sua busca'}
                  </p> : <>
                    {/* Desktop: Tabela completa */}
                    <div className="border rounded-lg hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && (
                              <TableHead className="w-[40px]">
                                <Checkbox
                                  checked={selectedSubmissions.size > 0 && paginatedSubmissions.filter((s: any) => s.status === 'pending').length > 0}
                                  onCheckedChange={toggleSelectAllPending}
                                />
                              </TableHead>
                            )}
                            <TableHead>Usuário</TableHead>
                            <TableHead>Faixa de Seguidores</TableHead>
                            <TableHead>Total Posts</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Data de Envio</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Screenshot</TableHead>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && <TableHead className="text-right">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSubmissions.map((submission: any) => <TableRow key={submission.id}>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && (
                              <TableCell className="w-[40px]">
                                {submission.status === 'pending' && (
                                  <Checkbox
                                    checked={selectedSubmissions.has(submission.id)}
                                    onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                                  />
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <div>
                                <p className="font-medium">{submission.profiles?.full_name || 'N/A'}</p>
                                {submission.profiles?.instagram && <a href={`https://instagram.com/${submission.profiles.instagram.replace(/^@+/, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                    @{submission.profiles.instagram.replace(/^@+/, '')}
                                  </a>}
                              </div>
                            </TableCell>
                            <TableCell>{submission.followers_range || submission.profiles?.followers_range || 'N/A'}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {getUserApprovedCount(submission.user_id)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{selectedEvent.title}</p>
                                {submission.posts?.post_number && <p className="text-xs text-muted-foreground">
                                    Post #{submission.posts.post_number}
                                  </p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={submission.status === 'approved' ? 'default' : submission.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {submission.status === 'approved' ? 'Aprovada' : submission.status === 'rejected' ? 'Reprovada' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Suspense fallback={<Skeleton className="w-16 h-16" />}>
                                  {submission.profile_screenshot_path && <div className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedSubmission(submission)}>
                                      <SubmissionImageDisplay screenshotPath={submission.profile_screenshot_path} className="w-full h-full object-cover rounded" />
                                    </div>}
                                  {submission.screenshot_path && <div className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedSubmission(submission)}>
                                      <SubmissionImageDisplay screenshotPath={submission.screenshot_path} className="w-full h-full object-cover rounded" />
                                    </div>}
                                </Suspense>
                              </div>
                            </TableCell>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && <TableCell>
                                <div className="flex gap-2 justify-end">
                                  {submission.status === 'pending' && <>
                                      <Button size="sm" onClick={() => handleApproveSubmission(submission.id)}>
                                        Aprovar
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleRejectWithPrompt(submission.id)}>
                                        Reprovar
                                      </Button>
                                    </>}
                                </div>
                              </TableCell>}
                          </TableRow>)}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile: Cards compactos */}
                    <div className="space-y-3 md:hidden">
                      {paginatedSubmissions.map((submission: any) => <Card key={submission.id} className="p-3">
                        <div className="flex gap-3">
                          {/* Checkbox para seleção (se moderador e pendente) */}
                          {permissionLevel && hasPermission(selectedEventId!, 'moderator') && submission.status === 'pending' && (
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox
                                checked={selectedSubmissions.has(submission.id)}
                                onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                              />
                            </div>
                          )}

                          {/* Screenshot à esquerda */}
                          <div className="flex-shrink-0">
                            <Suspense fallback={<Skeleton className="w-14 h-14" />}>
                              {(submission.profile_screenshot_path || submission.screenshot_path) && <div className="w-14 h-14 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedSubmission(submission)}>
                                  <SubmissionImageDisplay screenshotPath={submission.profile_screenshot_path || submission.screenshot_path} className="w-full h-full object-cover rounded" />
                                </div>}
                            </Suspense>
                          </div>

                          {/* Informações principais */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{submission.profiles?.full_name || 'N/A'}</p>
                                {submission.profiles?.instagram && <a href={`https://instagram.com/${submission.profiles.instagram.replace(/^@+/, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                                    @{submission.profiles.instagram.replace(/^@+/, '')}
                                  </a>}
                              </div>
                              <Badge variant={submission.status === 'approved' ? 'default' : submission.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                                {submission.status === 'approved' ? 'Aprovada' : submission.status === 'rejected' ? 'Reprovada' : 'Pendente'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{getUserApprovedCount(submission.user_id)} posts</span>
                              <span>•</span>
                              <span>{format(new Date(submission.submitted_at), 'dd/MM/yy HH:mm')}</span>
                            </div>

                            {/* Faixa de seguidores */}
                            {(submission.followers_range || submission.profiles?.followers_range) && (
                              <p className="text-xs text-muted-foreground">
                                Seguidores: {submission.followers_range || submission.profiles?.followers_range}
                              </p>
                            )}

                            {submission.posts?.post_number && <p className="text-xs text-muted-foreground">
                                Post #{submission.posts.post_number}
                              </p>}

                            {/* Ações (se tiver permissão e status pendente) */}
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && submission.status === 'pending' && <div className="flex gap-2 pt-1">
                                <Button size="sm" className="h-7 text-xs" onClick={() => handleApproveSubmission(submission.id)}>
                                  Aprovar
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRejectWithPrompt(submission.id)}>
                                  Reprovar
                                </Button>
                              </div>}
                          </div>
                        </div>
                      </Card>)}
                    </div>

                    {/* Controles de Paginação - Responsivo */}
                    <div className="items-center justify-between pt-4 gap-3 flex flex-col md:flex-row">
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm text-muted-foreground">Por página:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={value => setItemsPerPage(Number(value))}>
                          <SelectTrigger className="w-16 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm text-muted-foreground">
                          Pág. {currentPage} de {totalPages}
                        </span>
                        <div className="gap-1 flex-row flex items-center justify-center">
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={previousPage} disabled={!hasPreviousPage}>
                            Anterior
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={nextPage} disabled={!hasNextPage}>
                            Próxima
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>}
              </div>
            </Card>
          </>}
      </div>

      {/* ✅ FASE 2 - Item 2.2: Dialog de Zoom (igual Admin) */}
      {zoomedSubmission && <Suspense fallback={null}>
          <SubmissionZoomDialog submission={zoomedSubmission} open={!!zoomedSubmission} onOpenChange={open => !open && setZoomedSubmission(null)} onApprove={handleApproveSubmission} onReject={handleRejectWithPrompt} onNext={handleZoomNext} onPrevious={handleZoomPrevious} hasNext={filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission.id) < filteredSubmissions.length - 1} hasPrevious={filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission.id) > 0} />
        </Suspense>}
    </div>;
};