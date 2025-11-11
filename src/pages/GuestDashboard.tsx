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
import { useEventsQuery, useSubmissionsQuery } from '@/hooks/consolidated';
import { format } from 'date-fns';

// ✅ FASE 2 - Item 2.1 e 2.2: Lazy load dos componentes de imagem
const SubmissionImageDisplay = lazy(() => 
  import('@/components/SubmissionImageDisplay').then(m => ({ default: m.SubmissionImageDisplay }))
);
const SubmissionZoomDialog = lazy(() => 
  import('@/components/SubmissionZoomDialog').then(m => ({ default: m.SubmissionZoomDialog }))
);

export const GuestDashboard = () => {
  const navigate = useNavigate();
  const { isGuest, guestData, loading: guestLoading } = useIsGuest();
  const { hasPermission, getPermissionLevel, allowedEvents, loading: permissionsLoading } = useGuestPermissions();
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

  // ✅ Usar hooks consolidados em vez de fetch manual
  const { data: eventsData, isLoading: loadingEvents } = useEventsQuery({
    agencyId: guestData?.agency_id,
    enabled: isGuest && !!guestData?.agency_id && allowedEvents.length > 0
  });

  // Extrair apenas array de events (não posts)
  const events = eventsData?.events || [];

  const { data: submissionsResponse, isLoading: loadingSubmissions, refetch: refetchSubmissions } = useSubmissionsQuery({
    eventId: selectedEventId || undefined,
    enrichProfiles: true,
    enabled: !!selectedEventId,
    itemsPerPage: 999999 // Guest vê todas as submissões dos eventos autorizados
  });

  // Extrair array de submissions do objeto paginado
  const submissions = Array.isArray(submissionsResponse) 
    ? submissionsResponse 
    : submissionsResponse?.data || [];

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
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Submissão aprovada!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Log da ação
      await supabase.from('guest_audit_log').insert({
        guest_id: guestData.id,
        event_id: selectedEventId,
        submission_id: submissionId,
        action: 'approved_submission',
        action_data: { status: 'approved' }
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
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Submissão reprovada');

      // Log da ação
      await supabase.from('guest_audit_log').insert({
        guest_id: guestData.id,
        event_id: selectedEventId,
        submission_id: submissionId,
        action: 'rejected_submission',
        action_data: { status: 'rejected', reason }
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
    if (selectedFollowerRange !== 'all' && s.profiles?.followers_range !== selectedFollowerRange) return false;
    
    // Filtro por período de data
    if (startDate && new Date(s.submitted_at) < new Date(startDate)) return false;
    if (endDate && new Date(s.submitted_at) > new Date(endDate + 'T23:59:59')) return false;
    
    // Filtro por busca
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      s.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      s.profiles?.instagram?.toLowerCase().includes(searchLower) ||
      s.profiles?.followers_range?.toLowerCase().includes(searchLower)
    );
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
    resetPage,
  } = usePagination({
    items: filteredSubmissions,
    itemsPerPage,
  });

  // ✅ FASE 3: Reset página quando filtros mudarem
  useEffect(() => {
    resetPage();
  }, [selectedPostId, selectedStatus, selectedFollowerRange, startDate, endDate, searchTerm, resetPage]);

  // Contar total de posts aprovados por usuário
  const getUserApprovedCount = (userId: string) => {
    return submissions.filter((s: any) => 
      s.user_id === userId && s.status === 'approved'
    ).length;
  };

  // Extrair posts únicos do evento atual
  const uniquePosts = Array.from(
    new Set(submissions.map((s: any) => s.post_id).filter(Boolean))
  ).map((postId) => {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
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
    uniqueUsers: new Set(submissions.map((s: any) => s.user_id)).size,
  };

  // ✅ FASE 3: Extrair faixas de seguidores únicas para o filtro
  const uniqueFollowerRanges = Array.from(
    new Set(submissions.map((s: any) => s.profiles?.followers_range).filter(Boolean))
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Convidado</h1>
              <p className="text-muted-foreground">
                Acesso válido até {new Date(guestData.access_end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
              >
                ← Voltar ao Dashboard
              </Button>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Eye className="mr-2 h-4 w-4" />
                Convidado
              </Badge>
            </div>
          </div>
        </div>

        {/* Seletor de Eventos */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Eventos com Acesso</h3>
          <div className="flex gap-2 flex-wrap">
            {allowedEventsData.map((event) => {
              const level = getPermissionLevel(event.id);
              return (
                <Button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  variant={selectedEventId === event.id ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                >
                  {event.title}
                  {level && (
                    <Badge variant="secondary" className="ml-2">
                      {PERMISSION_LABELS[level]}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </Card>

        {selectedEvent && (
          <>
            {/* Stats - FASE 3: 5 cards incluindo Usuários */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovadas</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reprovadas</p>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                    <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Permissões Info */}
            {permissionLevel && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Nível de Acesso: {PERMISSION_LABELS[permissionLevel]}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {permissionLevel === 'viewer' && 'Você pode visualizar estatísticas e submissões'}
                      {permissionLevel === 'moderator' && 'Você pode visualizar, aprovar e reprovar submissões'}
                      {permissionLevel === 'manager' && 'Você tem acesso total: gerenciar posts, editar evento e aprovar submissões'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* ✅ FASE 3: Tabela de Submissões com filtros avançados e paginação */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Submissões - {selectedEvent.title}</h3>
                  <Badge variant="outline" className="text-sm">
                    {filteredSubmissions.length} de {submissions.length} submiss{filteredSubmissions.length !== 1 ? 'ões' : 'ão'}
                  </Badge>
                </div>

                {/* ✅ FASE 3: Filtros Avançados */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <Select value={selectedPostId} onValueChange={setSelectedPostId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Post" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os posts</SelectItem>
                      {uniquePosts.map((post) => (
                        <SelectItem key={post.id} value={post.id}>
                          Post {post.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovada</SelectItem>
                      <SelectItem value="rejected">Reprovada</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedFollowerRange} onValueChange={setSelectedFollowerRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seguidores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as faixas</SelectItem>
                      {uniqueFollowerRanges.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data inicial"
                    className="text-sm"
                  />

                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data final"
                    className="text-sm"
                  />

                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, Instagram ou faixa de seguidores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              
                {loadingSubmissions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {submissions.length === 0 ? 'Nenhuma submissão encontrada' : 'Nenhum resultado encontrado para sua busca'}
                  </p>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Faixa de Seguidores</TableHead>
                            <TableHead>Total Posts</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Data de Envio</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Screenshot</TableHead>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && (
                              <TableHead className="text-right">Ações</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSubmissions.map((submission: any) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{submission.profiles?.full_name || 'N/A'}</p>
                                {submission.profiles?.instagram && (
                                  <a 
                                    href={`https://instagram.com/${submission.profiles.instagram.replace(/^@+/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    @{submission.profiles.instagram.replace(/^@+/, '')}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{submission.profiles?.followers_range || 'N/A'}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {getUserApprovedCount(submission.user_id)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{selectedEvent.title}</p>
                                {submission.posts?.post_number && (
                                  <p className="text-xs text-muted-foreground">
                                    Post #{submission.posts.post_number}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                submission.status === 'approved' ? 'default' :
                                submission.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {submission.status === 'approved' ? 'Aprovada' :
                                 submission.status === 'rejected' ? 'Reprovada' :
                                 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {/* ✅ FASE 2 - Item 2.1: Usar SubmissionImageDisplay */}
                                <Suspense fallback={<Skeleton className="w-16 h-16" />}>
                                  {submission.profile_screenshot_path && (
                                    <div
                                      className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setZoomedSubmission(submission)}
                                    >
                                      <SubmissionImageDisplay
                                        screenshotPath={submission.profile_screenshot_path}
                                        className="w-full h-full object-cover rounded"
                                      />
                                    </div>
                                  )}
                                  {submission.screenshot_path && (
                                    <div
                                      className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setZoomedSubmission(submission)}
                                    >
                                      <SubmissionImageDisplay
                                        screenshotPath={submission.screenshot_path}
                                        className="w-full h-full object-cover rounded"
                                      />
                                    </div>
                                  )}
                                </Suspense>
                              </div>
                            </TableCell>
                            {permissionLevel && hasPermission(selectedEventId!, 'moderator') && (
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  {submission.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveSubmission(submission.id)}
                                      >
                                        Aprovar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRejectWithPrompt(submission.id)}
                                      >
                                        Reprovar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* ✅ FASE 3: Controles de Paginação */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Itens por página:</span>
                        <Select 
                          value={itemsPerPage.toString()} 
                          onValueChange={(value) => setItemsPerPage(Number(value))}
                        >
                          <SelectTrigger className="w-20">
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
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={previousPage}
                            disabled={!hasPreviousPage}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={nextPage}
                            disabled={!hasNextPage}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ✅ FASE 2 - Item 2.2: Dialog de Zoom (igual Admin) */}
      {zoomedSubmission && (
        <Suspense fallback={null}>
          <SubmissionZoomDialog
            submission={zoomedSubmission}
            open={!!zoomedSubmission}
            onOpenChange={(open) => !open && setZoomedSubmission(null)}
            onApprove={handleApproveSubmission}
            onReject={handleRejectWithPrompt}
            onNext={handleZoomNext}
            onPrevious={handleZoomPrevious}
            hasNext={filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission.id) < filteredSubmissions.length - 1}
            hasPrevious={filteredSubmissions.findIndex((s: any) => s.id === zoomedSubmission.id) > 0}
          />
        </Suspense>
      )}
    </div>
  );
};
