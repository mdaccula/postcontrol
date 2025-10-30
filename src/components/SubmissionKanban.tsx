import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragOverEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SubmissionImageDisplay } from "./SubmissionImageDisplay";
import { useUpdateSubmissionStatus } from "@/hooks/useReactQuery";

interface Submission {
  id: string;
  status: string;
  submitted_at: string;
  screenshot_url: string;
  screenshot_path: string | null;
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

const DraggableSubmissionCard = ({ submission }: { submission: Submission }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: submission.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className={`p-3 cursor-move hover:shadow-md transition-all ${isDragging ? 'opacity-50' : ''}`}>
        <div className="space-y-2">
          <div className="aspect-video bg-muted rounded overflow-hidden">
            <SubmissionImageDisplay
              screenshotPath={submission.screenshot_path}
              screenshotUrl={submission.screenshot_url}
              alt="Screenshot"
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
    </div>
  );
};

const DroppableColumn = ({ 
  id, 
  title, 
  color, 
  count, 
  children 
}: { 
  id: string; 
  title: string; 
  color: string; 
  count: number; 
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`p-4 ${color} border-2 transition-all ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {children}
        </div>
      </ScrollArea>
    </Card>
  );
};

export const SubmissionKanban = ({ submissions, onUpdate, userId }: SubmissionKanbanProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingSubmission, setDraggingSubmission] = useState<Submission | null>(null);
  
  // Mutation com cache automático
  const updateStatusMutation = useUpdateSubmissionStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

    // Usar mutation com cache automático
    updateStatusMutation.mutate({
      submissionId,
      status: newStatus,
      approvedBy: userId,
    }, {
      onSuccess: () => {
        onUpdate(); // Atualizar UI local também
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(columns).map(([key, column]) => {
          const columnSubmissions = getSubmissionsByStatus(column.status);
          
          return (
            <DroppableColumn
              key={key}
              id={column.status}
              title={column.title}
              color={column.color}
              count={columnSubmissions.length}
            >
              {columnSubmissions.map((submission) => (
                <DraggableSubmissionCard 
                  key={submission.id}
                  submission={submission}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeId && draggingSubmission ? (
          <Card className="p-3 shadow-lg rotate-3">
            <div className="space-y-2">
              <div className="aspect-video bg-muted rounded overflow-hidden">
                <SubmissionImageDisplay
                  screenshotPath={draggingSubmission.screenshot_path}
                  screenshotUrl={draggingSubmission.screenshot_url}
                  alt="Screenshot"
                  loading="eager"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium truncate">{draggingSubmission.profiles?.full_name}</span>
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
