import { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Columns3 } from 'lucide-react';
import { formatPostName } from '@/lib/postNameFormatter';

/**
 * Componente de filtros da aba Submissions
 * Memoizado para evitar re-renders desnecessários
 */

interface AdminFiltersProps {
  // Filtros atuais
  submissionEventFilter: string;
  submissionPostFilter: string;
  submissionStatusFilter: string;
  postTypeFilter: string;
  searchTerm: string;
  dateFilterStart: string;
  dateFilterEnd: string;
  kanbanView: boolean;
  
  // Dados para popular dropdowns
  events: any[];
  submissions: any[];
  
  // Setters
  onSubmissionEventFilterChange: (value: string) => void;
  onSubmissionPostFilterChange: (value: string) => void;
  onSubmissionStatusFilterChange: (value: string) => void;
  onPostTypeFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onDateFilterStartChange: (value: string) => void;
  onDateFilterEndChange: (value: string) => void;
  onKanbanViewToggle: () => void;
  
  // Ações
  onExport?: () => void;
  
  // Estado
  filteredCount: number;
  totalCount: number;
}

const AdminFiltersComponent = ({
  submissionEventFilter,
  submissionPostFilter,
  submissionStatusFilter,
  postTypeFilter,
  searchTerm,
  dateFilterStart,
  dateFilterEnd,
  kanbanView,
  events,
  submissions,
  onSubmissionEventFilterChange,
  onSubmissionPostFilterChange,
  onSubmissionStatusFilterChange,
  onPostTypeFilterChange,
  onSearchTermChange,
  onDateFilterStartChange,
  onDateFilterEndChange,
  onKanbanViewToggle,
  onExport,
  filteredCount,
  totalCount,
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
            Total: {filteredCount} submiss{filteredCount === 1 ? 'ão' : 'ões'}
            {submissionEventFilter !== 'all' && <span className="text-xs ml-1">(filtrado por evento)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onKanbanViewToggle}>
            <Columns3 className="mr-2 h-4 w-4" />
            {kanbanView ? 'Ver Lista' : 'Ver Kanban'}
          </Button>
        </div>
      </div>

      {/* Grid de filtros principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {/* Filtro de Evento */}
        <Select
          value={submissionEventFilter}
          onValueChange={onSubmissionEventFilterChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Selecione um evento</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          disabled={submissionEventFilter === 'all'}
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
          disabled={submissionEventFilter === 'all'}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo de Postagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="divulgacao">📢 Divulgação</SelectItem>
            <SelectItem value="venda">💰 Vendas</SelectItem>
            <SelectItem value="selecao_perfil">🎯 Seleção de Perfil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtros de busca e data (apenas quando evento estiver selecionado) */}
      {submissionEventFilter !== 'all' && (
        <>
          {/* Campo de Busca */}
          <div className="grid grid-cols-1 gap-2">
            <Input
              placeholder="Buscar por nome, email ou Instagram..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filtros de Data */}
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
