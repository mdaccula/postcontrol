import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Calendar } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";

interface Submission {
  id: string;
  status: string;
  submitted_at: string;
  screenshot_url: string;
  profiles: {
    full_name: string;
    instagram: string;
  };
  posts: {
    post_number: number;
    events: {
      title: string;
    };
  };
}

interface SubmissionKanbanProps {
  submissions: Submission[];
  onUpdate: () => void;
  userId: string | undefined;
}

export const SubmissionKanban = ({ submissions, onUpdate, userId }: SubmissionKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingSubmission, setDraggingSubmission] = useState<Submission | null>(null);

  const columns = {
    pending: { title: "Pendente", status: "pending", color: "bg-yellow-500/10 border-yellow-500/30" },
    approved: { title: "Aprovado", status: "approved", color: "bg-green-500/10 border-green-500/30" },
    rejected: { title: "Rejeitado", status: "rejected", color: "bg-red-500/10 border-red-500/30" },
  };

  const getSubmissionsByStatus = (status: string) => {
    return submissions.filter((s) => s.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const submission = submissions.find((s) => s.id === event.active.id);
    setActiveId(event.active.id as string);
    setDraggingSubmission(submission || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggingSubmission(null);

    if (!over) return;

    const submissionId = active.id as string;
    const newStatus = over.id as string;

    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission || submission.status === newStatus) return;

    // Atualizar status no banco
    const { error } = await sb
      .from('submissions')
      .update({
        status: newStatus,
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq('id', submissionId);

    if (error) {
      console.error('Error updating status:', error);
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status atualizado para ${newStatus === 'approved' ? 'aprovado' : newStatus === 'rejected' ? 'rejeitado' : 'pendente'}`);
      onUpdate();
    }
  };

  const SubmissionCard = ({ submission }: { submission: Submission }) => (
    <Card className="p-3 cursor-move hover:shadow-md transition-all">
      <div className="space-y-2">
        <div className="aspect-video bg-muted rounded overflow-hidden">
          <img
            src={submission.screenshot_url}
            alt="Screenshot"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium truncate">{submission.profiles?.full_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="truncate">{submission.posts?.events?.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Post #{submission.posts?.post_number}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(columns).map(([key, column]) => {
          const columnSubmissions = getSubmissionsByStatus(column.status);
          
          return (
            <Card
              key={key}
              id={column.status}
              className={`p-4 ${column.color} border-2`}
              data-status={column.status}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{column.title}</h3>
                <Badge variant="secondary">{columnSubmissions.length}</Badge>
              </div>

              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {columnSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      id={submission.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", submission.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData("text/plain");
                        
                        const submission = submissions.find((s) => s.id === draggedId);
                        if (!submission || submission.status === column.status) return;

                        // Atualizar status no banco
                        const { error } = await sb
                          .from('submissions')
                          .update({
                            status: column.status,
                            approved_at: new Date().toISOString(),
                            approved_by: userId,
                          })
                          .eq('id', draggedId);

                        if (error) {
                          console.error('Error updating status:', error);
                          toast.error("Erro ao atualizar status");
                        } else {
                          toast.success(`Status atualizado para ${column.status === 'approved' ? 'aprovado' : column.status === 'rejected' ? 'rejeitado' : 'pendente'}`);
                          onUpdate();
                        }
                      }}
                    >
                      <SubmissionCard submission={submission} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeId && draggingSubmission ? (
          <div className="opacity-50">
            <SubmissionCard submission={draggingSubmission} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
