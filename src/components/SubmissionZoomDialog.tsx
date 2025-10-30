import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SubmissionImageDisplay } from "./SubmissionImageDisplay";
import { useEffect } from "react";

interface SubmissionZoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: {
    id: string;
    screenshot_path: string | null;
    screenshot_url?: string | null;
    status: string;
    profiles?: {
      full_name: string;
      email: string;
      instagram?: string;
    };
    posts?: {
      post_number?: number;
      events?: {
        title: string;
      };
    };
  };
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const SubmissionZoomDialog = ({
  open,
  onOpenChange,
  submission,
  onApprove,
  onReject,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}: SubmissionZoomDialogProps) => {
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'ArrowRight' && hasNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasNext, hasPrevious, onNext, onPrevious, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <div className="relative flex flex-col h-full">
          {/* Imagem com zoom */}
          <div className="flex-1 relative bg-black min-h-[60vh]">
            <SubmissionImageDisplay
              screenshotPath={submission.screenshot_path}
              screenshotUrl={submission.screenshot_url}
              className="w-full h-full object-contain"
              loading="eager"
            />
            
            {/* Navegação por setas */}
            {hasPrevious && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={onPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={onNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>
          
          {/* Informações e ações */}
          <div className="bg-background p-4 border-t">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="font-bold text-lg">
                  {submission.profiles?.full_name || 'Nome não disponível'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {submission.profiles?.email || 'Email não disponível'}
                </p>
                {submission.profiles?.instagram && (
                  <p className="text-sm font-medium text-primary mt-1">
                    @{submission.profiles.instagram}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right">
                {submission.posts?.post_number && (
                  <p className="text-sm font-medium">
                    Postagem #{submission.posts.post_number}
                  </p>
                )}
                {submission.posts?.events?.title && (
                  <p className="text-xs text-muted-foreground">
                    {submission.posts.events.title}
                  </p>
                )}
              </div>
            </div>
            
            {/* Botões de ação (apenas se pendente) */}
            {submission.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => onApprove(submission.id)}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => onReject(submission.id)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
            )}
            
            {/* Hint de navegação */}
            <p className="text-xs text-muted-foreground text-center mt-2">
              Use as setas ← → do teclado para navegar | ESC para fechar
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
