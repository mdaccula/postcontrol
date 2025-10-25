import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_visible: boolean;
}

interface FAQManagerProps {
  eventId: string;
}

export const FAQManager = ({ eventId }: FAQManagerProps) => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadFAQs();
    }
  }, [eventId]);

  const loadFAQs = async () => {
    const { data, error } = await sb
      .from('event_faqs')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading FAQs:', error);
    } else {
      setFaqs(data || []);
    }
  };

  const handleAddFAQ = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Preencha a pergunta e a resposta");
      return;
    }

    setLoading(true);

    const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.display_order)) : 0;

    const { error } = await sb
      .from('event_faqs')
      .insert({
        event_id: eventId,
        question: newQuestion,
        answer: newAnswer,
        display_order: maxOrder + 1,
        is_visible: true,
      });

    if (error) {
      console.error('Error adding FAQ:', error);
      toast.error("Erro ao adicionar FAQ");
    } else {
      toast.success("FAQ adicionado com sucesso!");
      setNewQuestion("");
      setNewAnswer("");
      loadFAQs();
    }

    setLoading(false);
  };

  const handleDeleteFAQ = async (faqId: string) => {
    const { error } = await sb
      .from('event_faqs')
      .delete()
      .eq('id', faqId);

    if (error) {
      console.error('Error deleting FAQ:', error);
      toast.error("Erro ao excluir FAQ");
    } else {
      toast.success("FAQ excluído com sucesso!");
      loadFAQs();
    }
  };

  const handleToggleVisibility = async (faqId: string, currentVisibility: boolean) => {
    const { error } = await sb
      .from('event_faqs')
      .update({ is_visible: !currentVisibility })
      .eq('id', faqId);

    if (error) {
      console.error('Error updating FAQ visibility:', error);
      toast.error("Erro ao atualizar visibilidade");
    } else {
      toast.success("Visibilidade atualizada!");
      loadFAQs();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-4">Gerenciar FAQ do Evento</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Adicione perguntas frequentes que serão exibidas para os usuários na página de submissão
        </p>
      </div>

      {/* Adicionar novo FAQ */}
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Pergunta</Label>
          <Input
            id="question"
            placeholder="Ex: Qual o prazo para enviar as postagens?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer">Resposta</Label>
          <Textarea
            id="answer"
            placeholder="Ex: O prazo está especificado em cada postagem..."
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>

        <Button
          onClick={handleAddFAQ}
          disabled={loading || !newQuestion.trim() || !newAnswer.trim()}
          className="bg-gradient-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar FAQ
        </Button>
      </Card>

      {/* Lista de FAQs */}
      {faqs.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">FAQs Cadastrados ({faqs.length})</h4>
          {faqs.map((faq) => (
            <Card key={faq.id} className="p-4">
              <div className="flex items-start gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
                
                <div className="flex-1 space-y-2">
                  <div className="font-medium">{faq.question}</div>
                  <div className="text-sm text-muted-foreground">{faq.answer}</div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={faq.is_visible}
                      onCheckedChange={() => handleToggleVisibility(faq.id, faq.is_visible)}
                    />
                    <Label className="text-xs cursor-pointer">
                      {faq.is_visible ? 'Visível' : 'Oculto'}
                    </Label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFAQ(faq.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
