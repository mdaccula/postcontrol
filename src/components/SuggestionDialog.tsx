import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  agencyId?: string;
}

export const SuggestionDialog = ({ open, onOpenChange, userId, agencyId }: SuggestionDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Por favor, insira um título para a sugestão");
      return;
    }

    if (!description.trim()) {
      toast.error("Por favor, descreva sua sugestão");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await sb
        .from('suggestions')
        .insert({
          user_id: userId,
          agency_id: agencyId || null,
          title: title.trim(),
          description: description.trim(),
          priority,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Sugestão enviada com sucesso! Obrigado pelo feedback.");
      setTitle("");
      setDescription("");
      setPriority("medium");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
      toast.error("Erro ao enviar sugestão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Enviar Sugestão de Melhoria
          </DialogTitle>
          <DialogDescription>
            Compartilhe suas ideias para melhorar a plataforma. Sua opinião é muito importante!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Sugestão</Label>
            <Input
              id="title"
              placeholder="Ex: Adicionar filtro por data nas submissões"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/100 caracteres
            </p>
          </div>

          <div>
            <Label htmlFor="description">Descrição Detalhada</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua sugestão em detalhes. Quanto mais informações, melhor!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/1000 caracteres
            </p>
          </div>

          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione a urgência da sua sugestão
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-gradient-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar Sugestão"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};