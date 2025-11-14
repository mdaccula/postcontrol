import { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Columns3, Grid3x3, List } from 'lucide-react';
import { formatPostName } from '@/lib/postNameFormatter';
import { Event, Submission } from '@/types/admin';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Admin Filters Component
 * 
 * Provides comprehensive filtering UI for admin submission management.
 * Memoized to prevent unnecessary re-renders when parent state changes.
 * 
 * @component
 */

/**
 * Props for AdminFilters component
 */
interface AdminFiltersProps {
  /** ✅ ITEM 5: Filtro primário de status ativo/inativo */
  submissionActiveFilter: string;
  /** Current event filter value ('all' or event ID) */
  submissionEventFilter: string;
  /** Current post number filter value ('all' or post number) */
  submissionPostFilter: string;
  /** Current status filter value */
  submissionStatusFilter: string;
  /** Current post type filter value */
  postTypeFilter: string;
  /** Current search term */
  searchTerm: string;
  /** Start date for date range filter (ISO format) */
  dateFilterStart: string;
  /** End date for date range filter (ISO format) */
  dateFilterEnd: string;
  /** Whether kanban view is enabled */
  kanbanView: boolean;
  /** Whether cards grid view is enabled */
  cardsGridView: boolean;
  
  /** Available events for dropdown */
  events: Event[];
  /** All submissions for post number extraction */
  submissions: any[];
  
  /** ✅ ITEM 5: Callback quando filtro de status muda */
  onSubmissionActiveFilterChange: (value: string) => void;
  /** Callback when event filter changes */
  onSubmissionEventFilterChange: (value: string) => void;
  /** Callback when post filter changes */
  onSubmissionPostFilterChange: (value: string) => void;
  /** Callback when status filter changes */
  onSubmissionStatusFilterChange: (value: string) => void;
  /** Callback when post type filter changes */
  onPostTypeFilterChange: (value: string) => void;
  /** Callback when search term changes */
  onSearchTermChange: (value: string) => void;
  /** Callback when start date changes */
  onDateFilterStartChange: (value: string) => void;
  /** Callback when end date changes */
  onDateFilterEndChange: (value: string) => void;
  /** Callback when kanban view toggles */
  onKanbanViewToggle: () => void;
  /** Callback when cards grid view toggles */
  onCardsGridViewToggle: () => void;
  
  /** Optional export handler */
  onExport?: () => void;
  
  /** Number of submissions after filters applied */
  filteredCount: number;
  /** Total number of submissions before filters */
  totalCount: number;
  
  /** ✅ ITEM 5: Loading state for submissions */
  isLoadingSubmissions?: boolean;
}

const AdminFiltersComponent = ({
  submissionActiveFilter, // ✅ ITEM 5
  submissionEventFilter,
  submissionPostFilter,
  submissionStatusFilter,
  postTypeFilter,
  searchTerm,
  dateFilterStart,
  dateFilterEnd,
  kanbanView,
  cardsGridView,
  events,
  submissions,
  onSubmissionActiveFilterChange, // ✅ ITEM 5
  onSubmissionEventFilterChange,
  onSubmissionPostFilterChange,
  onSubmissionStatusFilterChange,
  onPostTypeFilterChange,
  onSearchTermChange,
  onDateFilterStartChange,
  onDateFilterEndChange,
  onKanbanViewToggle,
  onCardsGridViewToggle,
  onExport,
  filteredCount,
  totalCount,
  isLoadingSubmissions = false,
}: AdminFiltersProps) => {
  /**
   * Obter números de postagens disponíveis baseado no evento selecionado
   */
  const getAvailablePostNumbers = () => {
    const filtered = submissions.filter(
      (s: any) => submissionEventFilter === 'all' || s.posts?.event_id === submissionEventFilter
    );
    const postNumbers = new Set(filtered.map((s: any) => s.posts?.post_number).filter(Boolean));
    return Array.from(postNumbers).sort((a, b) => a - b);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header com contadores e ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Submissões de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Total: {totalCount} submiss{totalCount === 1 ? 'ão' : 'ões'}
            {submissionEventFilter !== 'all' && <span className="text-xs ml-1">(filtrado por evento)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={cardsGridView ? 'default' : 'outline'} 
            size="sm" 
            onClick={onCardsGridViewToggle}
            disabled={kanbanView}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            Cards
          </Button>
          <Button 
            variant={!cardsGridView && !kanbanView ? 'default' : 'outline'} 
            size="sm" 
            onClick={onCardsGridViewToggle}
            disabled={kanbanView}
          >
            <List className="mr-2 h-4 w-4" />
            Lista
          </Button>
          <Button 
            variant={kanbanView ? 'default' : 'outline'} 
            size="sm" 
            onClick={onKanbanViewToggle}
          >
            <Columns3 className="mr-2 h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Grid de filtros principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {/* ✅ ITEM 5: Novo filtro primário de status ativo/inativo */}
        <Select
          value={submissionActiveFilter}
          onValueChange={onSubmissionActiveFilterChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status do evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="active">✅ Eventos Ativos</SelectItem>
            <SelectItem value="inactive">⏸️ Eventos Inativos</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro de Evento */}
        {/* ✅ ITEM 5: Skeleton enquanto carrega */}
        {isLoadingSubmissions ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={submissionEventFilter}
            onValueChange={onSubmissionEventFilterChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Selecione um evento</SelectItem>
              {/* ✅ ITEM 5: Filtrar eventos baseado no status */}
              {events
                .filter((event) => {
                  if (submissionActiveFilter === "all") return true;
                  if (submissionActiveFilter === "active") return event.is_active === true;
                  if (submissionActiveFilter === "inactive") return event.is_active === false;
                  return true;
                })
                .map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro de Número da Postagem */}
        <Select
          value={submissionPostFilter}
          onValueChange={onSubmissionPostFilterChange}
          disabled={submissionEventFilter === 'all'}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Número da postagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os números</SelectItem>
            {getAvailablePostNumbers().map((num) => {
              const submission = submissions.find(
                s => (s.posts as any)?.post_number === num &&
                (submissionEventFilter === 'all' || (s.posts as any)?.event_id === submissionEventFilter)
              );
              const postType = (submission?.posts as any)?.post_type || null;
              return (
                <SelectItem key={num} value={num.toString()}>
                  {formatPostName(postType, num)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Filtro de Status */}
        <Select
          value={submissionStatusFilter}
          onValueChange={onSubmissionStatusFilterChange}
        >
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

      {/* Filtro de Tipo de Postagem */}
      <div className="grid grid-cols-1 gap-2">
        <Select
          value={postTypeFilter}
          onValueChange={onPostTypeFilterChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo de Postagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="divulgacao">📢 Divulgação</SelectItem>
            <SelectItem value="sale">💰 Vendas</SelectItem>
            <SelectItem value="selecao_perfil">🎯 Seleção de Perfil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 🆕 CORREÇÃO #2: Campo de Busca - SEMPRE VISÍVEL */}
      <div className="grid grid-cols-1 gap-2">
        <Input
          placeholder="Buscar por nome, email ou Instagram..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filtros de Data (apenas quando evento estiver selecionado) */}
      {submissionEventFilter !== 'all' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Data Inicial</label>
              <Input
                type="date"
                value={dateFilterStart}
                onChange={(e) => onDateFilterStartChange(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Data Final</label>
              <Input
                type="date"
                value={dateFilterEnd}
                onChange={(e) => onDateFilterEndChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Botão de Exportação */}
          {onExport && (
            <Button variant="outline" onClick={onExport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar para Excel
            </Button>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Exportar versão memoizada para evitar re-renders
 * Re-renderiza apenas se props mudarem
 */
export const AdminFilters = memo(AdminFiltersComponent);
