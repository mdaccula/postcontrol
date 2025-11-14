import { memo, Suspense } from 'react';
// @ts-ignore - react-window types compatibility
import { FixedSizeList } from 'react-window';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  MessageSquare,
  CheckCheck 
} from 'lucide-react';
import { formatPostName } from '@/lib/postNameFormatter';
import { EnrichedSubmission, ImageUrlCache } from '@/types/admin';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';

/**
 * Admin Submission List Component
 * 
 * Displays paginated list of submissions with inline actions.
 * Supports bulk operations and lazy-loaded components for performance.
 * Memoized to prevent unnecessary re-renders.
 * 
 * @component
 */

/**
 * Props for AdminSubmissionList component
 */
interface AdminSubmissionListProps {
  /** Filtered and enriched submissions to display */
  submissions: EnrichedSubmission[];
  /** Current active page number (1-indexed) */
  currentPage: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Total number of pages based on filtered submissions */
  totalPages: number;
  /** Set of selected submission IDs for bulk operations */
  selectedSubmissions: Set<string>;
  /** Set of submission IDs with expanded comment sections */
  expandedComments: Set<string>;
  /** Map of submission IDs to signed image URLs */
  imageUrls: ImageUrlCache;
  /** Whether actions are read-only (for guest users) */
  isReadOnly: boolean;
  
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when submission status changes */
  onStatusChange: (submissionId: string, newStatus: string) => void;
  /** Callback to approve submission */
  onApprove: (submissionId: string) => void;
  /** Callback to reject submission */
  onReject: (submissionId: string) => void;
  /** Callback to delete submission */
  onDelete: (submissionId: string) => void;
  /** Callback to view audit log */
  onAuditLog: (submissionId: string) => void;
  /** Callback to toggle comment section visibility */
  onToggleComments: (submissionId: string) => void;
  /** Callback to toggle single submission selection */
  onToggleSelection: (submissionId: string) => void;
  /** Callback to toggle all submissions on current page */
  onToggleSelectAll: () => void;
  /** Callback to approve all selected submissions */
  onBulkApprove: () => void;
  /** Callback when image is clicked for zoom view */
  onImageZoom: (url: string, index: number) => void;
  
  /** Lazy-loaded comments component */
  SubmissionComments?: React.ComponentType<any>;
  /** Lazy-loaded image display component */
  SubmissionImageDisplay?: React.ComponentType<any>;
}

const AdminSubmissionListComponent = ({
  submissions,
  currentPage,
  itemsPerPage,
  totalPages,
  selectedSubmissions,
  expandedComments,
  imageUrls,
  isReadOnly,
  onPageChange,
  onStatusChange,
  onApprove,
  onReject,
  onDelete,
  onAuditLog,
  onToggleComments,
  onToggleSelection,
  onToggleSelectAll,
  onBulkApprove,
  onImageZoom,
  SubmissionComments,
  SubmissionImageDisplay,
}: AdminSubmissionListProps) => {
  if (submissions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhuma submissão encontrada com os filtros aplicados</p>
      </Card>
    );
  }

  // Calcular submissions da página atual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubmissions = submissions.slice(startIndex, startIndex + itemsPerPage);
  const allSelected = selectedSubmissions.size === paginatedSubmissions.length && paginatedSubmissions.length > 0;

  // ✅ OTIMIZAÇÃO 1: Usar virtualização para listas grandes
  const shouldVirtualize = paginatedSubmissions.length > 20; // Virtualizar se >20 items
  const ITEM_HEIGHT = 450; // Altura estimada de cada card

  const { listRef, itemCount, itemHeight, containerHeight, overscanCount } = 
    useVirtualizedList({
      items: paginatedSubmissions,
      itemHeight: ITEM_HEIGHT,
      containerHeight: Math.min(paginatedSubmissions.length * ITEM_HEIGHT, 3000), // Max 3000px
      overscanCount: 2,
    });

  // Renderizar item individual
  const renderSubmissionCard = ({ index, style }: { index: number; style?: React.CSSProperties }) => {
    const submission = paginatedSubmissions[index];
    
    return (
      <div style={style} className={shouldVirtualize ? "px-1" : ""}>
        <Card key={submission.id} className="p-6 mb-4">
          <div className="space-y-4">
            {/* Header com checkbox e informações básicas */}
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedSubmissions.has(submission.id)}
                onCheckedChange={() => onToggleSelection(submission.id)}
                className="mt-1"
              />
              
              <Avatar className="h-12 w-12">
                <AvatarImage src={submission.profiles?.avatar_url} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">{submission.profiles?.full_name || 'Nome não disponível'}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                      {submission.profiles?.instagram && (
                        <span>@{submission.profiles.instagram}</span>
                      )}
                      {submission.profiles?.email && (
                        <span className="text-xs">• {submission.profiles.email}</span>
                      )}
                    </div>
                  </div>
                  
                  <Badge 
                    variant={
                      submission.status === 'approved' ? 'default' :
                      submission.status === 'rejected' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {submission.status === 'approved' ? 'Aprovado' :
                     submission.status === 'rejected' ? 'Reprovado' :
                     'Pendente'}
                  </Badge>
                </div>

                {/* Informações do post */}
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <span className="font-medium">
                        {formatPostName(submission.posts?.post_type, submission.posts?.post_number)}
                      </span>
                      {submission.posts?.events?.title && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {submission.posts.events.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Enviado em {new Date(submission.submitted_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                
                {/* 🆕 CORREÇÃO #1: Exibir motivo de rejeição DENTRO da div flex-1 */}
                {submission.status === 'rejected' && submission.rejection_reason && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-semibold text-destructive mb-1">
                      Motivo da rejeição:
                    </p>
                    <p className="text-sm text-destructive/90">
                      {submission.rejection_reason}
                    </p>
                  </div>
                )}
                </div>
              </div>

            {/* Imagem da submissão */}
            {SubmissionImageDisplay && submission.screenshot_url && (
              <div className="mt-4 w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <Suspense fallback={<Skeleton className="w-full h-full" />}>
                  <SubmissionImageDisplay
                    screenshotUrl={imageUrls[submission.id] || submission.screenshot_url}
                    submissionId={submission.id}
                    onImageClick={() => onImageZoom(imageUrls[submission.id] || submission.screenshot_url, startIndex + index)}
                    className="w-full h-full object-cover"
                  />
                </Suspense>
              </div>
            )}

            {/* Ações */}
            <div className="space-y-3 pt-3 border-t">
              {/* Seletor de Status */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Status da Submissão:
                  </label>
                  <Select
                    value={submission.status}
                    onValueChange={(newStatus) => onStatusChange(submission.id, newStatus)}
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
                    onClick={() => onAuditLog(submission.id)}
                  >
                    Ver Histórico
                  </Button>
                </div>
              </div>

              {/* Botões de aprovação/rejeição para pendentes */}
              {submission.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                    onClick={() => onApprove(submission.id)}
                    disabled={isReadOnly}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => onReject(submission.id)}
                    disabled={isReadOnly}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              )}

              {/* Botão de deletar */}
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                  onClick={() => onDelete(submission.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar Submissão
                </Button>
              </div>
            </div>

            {/* Seção de Comentários */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleComments(submission.id)}
                className="mb-3"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {expandedComments.has(submission.id) ? 'Ocultar' : 'Mostrar'} Comentários
              </Button>

              {expandedComments.has(submission.id) && SubmissionComments && (
                <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                  <SubmissionComments
                    submissionId={submission.id}
                    onCommentAdded={() => {/* refetch if needed */}}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      {/* Ações em lote */}
      {selectedSubmissions.size > 0 && (
        <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedSubmissions.size} submiss{selectedSubmissions.size === 1 ? 'ão' : 'ões'} selecionada{selectedSubmissions.size === 1 ? '' : 's'}
            </span>
            <Button
              size="sm"
              onClick={onBulkApprove}
              disabled={isReadOnly}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Aprovar Selecionadas
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de submissões */}
      <div className="space-y-4">
        {/* Checkbox de selecionar todas */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            Selecionar todas desta página
          </label>
        </div>

        {/* Cards de submissões */}
        {shouldVirtualize ? (
          <FixedSizeList
            ref={listRef}
            height={containerHeight}
            itemCount={itemCount}
            itemSize={itemHeight}
            width="100%"
            overscanCount={overscanCount}
          >
            {renderSubmissionCard}
          </FixedSizeList>
        ) : (
          <div className="space-y-4">
            {paginatedSubmissions.map((submission: any, index: number) => 
              renderSubmissionCard({ index })
            )}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a{' '}
            {Math.min(startIndex + itemsPerPage, submissions.length)} de{' '}
            {submissions.length} submissões
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export const AdminSubmissionList = memo(AdminSubmissionListComponent);
