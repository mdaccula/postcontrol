import { memo, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Check, 
  X, 
  Eye,
  Instagram,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { formatPostName } from '@/lib/postNameFormatter';
import { EnrichedSubmission, ImageUrlCache } from '@/types/admin';
import { cn } from '@/lib/utils';

/**
 * Submission Cards Grid Component
 * 
 * Displays submissions in a compact grid layout (Pinterest-style).
 * Optimized for quick visual scanning and bulk operations.
 * 
 * @component
 */

interface SubmissionCardsGridProps {
  submissions: EnrichedSubmission[];
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  selectedSubmissions: Set<string>;
  imageUrls: ImageUrlCache;
  isReadOnly: boolean;
  
  onPageChange: (page: number) => void;
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string) => void;
  onToggleSelection: (submissionId: string) => void;
  onImageZoom: (url: string, index: number) => void;
  
  SubmissionImageDisplay?: React.ComponentType<any>;
}

const SubmissionCardsGridComponent = ({
  submissions,
  currentPage,
  itemsPerPage,
  totalPages,
  selectedSubmissions,
  imageUrls,
  isReadOnly,
  onPageChange,
  onApprove,
  onReject,
  onToggleSelection,
  onImageZoom,
  SubmissionImageDisplay,
}: SubmissionCardsGridProps) => {
  if (submissions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhuma submissão encontrada com os filtros aplicados</p>
      </Card>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubmissions = submissions.slice(startIndex, startIndex + itemsPerPage);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Aprovado',
          variant: 'default' as const,
          icon: CheckCircle2,
          bgClass: 'bg-green-500/10 border-green-500/20',
          iconColor: 'text-green-500'
        };
      case 'rejected':
        return {
          label: 'Reprovado',
          variant: 'destructive' as const,
          icon: XCircle,
          bgClass: 'bg-red-500/10 border-red-500/20',
          iconColor: 'text-red-500'
        };
      default:
        return {
          label: 'Pendente',
          variant: 'secondary' as const,
          icon: Clock,
          bgClass: 'bg-yellow-500/10 border-yellow-500/20',
          iconColor: 'text-yellow-600'
        };
    }
  };

  return (
    <>
      {/* Grid de Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedSubmissions.map((submission: any, index: number) => {
          const statusConfig = getStatusConfig(submission.status);
          const StatusIcon = statusConfig.icon;
          const isSelected = selectedSubmissions.has(submission.id);

          return (
            <Card 
              key={submission.id} 
              className={cn(
                "group relative overflow-hidden transition-all hover:shadow-lg",
                isSelected && "ring-2 ring-primary",
                statusConfig.bgClass
              )}
            >
              {/* Checkbox de seleção */}
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-background/90 backdrop-blur-sm rounded-md p-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(submission.id)}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge 
                  variant={statusConfig.variant}
                  className="flex items-center gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Imagem da Submissão */}
              <div 
                className="aspect-square w-full bg-muted relative overflow-hidden cursor-pointer"
                onClick={() => onImageZoom(imageUrls[submission.id] || submission.screenshot_url, startIndex + index)}
              >
                {SubmissionImageDisplay && submission.screenshot_url ? (
                  <Suspense fallback={<Skeleton className="w-full h-full" />}>
                    <SubmissionImageDisplay
                      screenshotUrl={imageUrls[submission.id] || submission.screenshot_url}
                      submissionId={submission.id}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </Suspense>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Overlay com ação de visualizar */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Informações do Card */}
              <div className="p-3 space-y-2">
                {/* Usuário */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={submission.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {submission.profiles?.full_name || 'Sem nome'}
                    </p>
                    {submission.profiles?.instagram && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Instagram className="h-3 w-3" />
                        <span className="truncate">@{submission.profiles.instagram}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações do Post */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium truncate">
                    {formatPostName(submission.posts?.post_type, submission.posts?.post_number)}
                    {submission.posts?.events?.title && (
                      <span className="text-muted-foreground"> – {submission.posts.events.title}</span>
                    )}
                  </p>
                </div>

                {/* Ações Rápidas */}
                {submission.status === 'pending' && !isReadOnly && (
                  <div className="flex gap-1 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 bg-green-500 hover:bg-green-600 text-xs"
                      onClick={() => onApprove(submission.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-8 text-xs"
                      onClick={() => onReject(submission.id)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
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

export const SubmissionCardsGrid = memo(SubmissionCardsGridComponent);
