import { memo, useState, Suspense } from 'react';
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

/**
 * Componente da lista de submissões com paginação
 * Memoizado para performance
 */

interface AdminSubmissionListProps {
  submissions: any[];
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  selectedSubmissions: Set<string>;
  expandedComments: Set<string>;
  imageUrls: Record<string, string>;
  isReadOnly: boolean;
  
  // Ações
  onPageChange: (page: number) => void;
  onStatusChange: (submissionId: string, newStatus: string) => void;
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string) => void;
  onDelete: (submissionId: string) => void;
  onAuditLog: (submissionId: string) => void;
  onToggleComments: (submissionId: string) => void;
  onToggleSelection: (submissionId: string) => void;
  onToggleSelectAll: () => void;
  onBulkApprove: () => void;
  onImageZoom: (url: string, index: number) => void;
  
  // Componentes lazy-loaded
  SubmissionComments?: React.ComponentType<any>;
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
        {paginatedSubmissions.map((submission: any, index: number) => (
          <Card key={submission.id} className="p-6">
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
                      <span>
                        {formatPostName(submission.posts?.post_type, submission.posts?.post_number)} 
                        {submission.posts?.events?.title && ` - ${submission.posts.events.title}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Enviado em {new Date(submission.submitted_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagem da submissão */}
              {SubmissionImageDisplay && submission.screenshot_url && (
                <div className="mt-4">
                  <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                    <SubmissionImageDisplay
                      screenshotUrl={imageUrls[submission.id] || submission.screenshot_url}
                      submissionId={submission.id}
                      onImageClick={() => onImageZoom(imageUrls[submission.id] || submission.screenshot_url, startIndex + index)}
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
        ))}
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
