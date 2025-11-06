import { memo, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';

/**
 * Componente de histórico de submissões do Dashboard
 * Memoizado para performance
 */

interface Submission {
  id: string;
  status: string;
  submitted_at: string;
  rejection_reason?: string;
  screenshot_url?: string;
  screenshot_path?: string;
  posts?: {
    post_number: number;
    events?: {
      title: string;
    };
  };
}

interface Event {
  id: string;
  title: string;
}

interface DashboardSubmissionHistoryProps {
  submissions: Submission[];
  events: Event[];
  selectedEvent: string;
  onEventChange: (value: string) => void;
  onDeleteSubmission: (submission: { id: string; status: string }) => void;
  SubmissionImageDisplay?: React.ComponentType<any>;
}

const DashboardSubmissionHistoryComponent = ({
  submissions,
  events,
  selectedEvent,
  onEventChange,
  onDeleteSubmission,
  SubmissionImageDisplay,
}: DashboardSubmissionHistoryProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Histórico de Submissões</h2>
        <Select value={selectedEvent} onValueChange={onEventChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {submissions.length > 0 ? (
          submissions.map((submission) => (
            <Card key={submission.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        submission.status === 'approved'
                          ? 'default'
                          : submission.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {submission.status === 'approved'
                        ? 'Aprovado'
                        : submission.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="font-medium">
                    {submission.posts?.events?.title} - Post #{submission.posts?.post_number}
                  </p>
                  {submission.rejection_reason && (
                    <p className="text-sm text-destructive">Motivo: {submission.rejection_reason}</p>
                  )}
                </div>
                {submission.screenshot_url && SubmissionImageDisplay && (
                  <Suspense fallback={<Skeleton className="h-20 w-20" />}>
                    <SubmissionImageDisplay
                      screenshotPath={submission.screenshot_path}
                      screenshotUrl={submission.screenshot_url}
                      className="h-20 w-20 object-cover rounded"
                    />
                  </Suspense>
                )}
              </div>
              {/* Botão excluir apenas para submissões pendentes */}
              {submission.status === 'pending' && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                    onClick={() => onDeleteSubmission({ id: submission.id, status: submission.status })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Submissão
                  </Button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhuma submissão encontrada</p>
        )}
      </div>
    </Card>
  );
};

export const DashboardSubmissionHistory = memo(DashboardSubmissionHistoryComponent);
