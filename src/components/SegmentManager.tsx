import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Segment {
  id: string;
  segment_name: string;
  description: string | null;
  filters: any;
  created_at: string;
}

export const SegmentManager = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [open, setOpen] = useState(false);
  const [newSegment, setNewSegment] = useState({
    name: "",
    description: "",
    filterType: "completion",
  });

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    const { data } = await supabase
      .from("user_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setSegments(data);
  };

  const createSegment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filters = {
      type: newSegment.filterType,
      // Aqui você pode adicionar lógica mais complexa
    };

    const { error } = await supabase.from("user_segments").insert({
      segment_name: newSegment.name,
      description: newSegment.description,
      filters: filters,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro ao criar segmento");
    } else {
      toast.success("Segmento criado com sucesso");
      setOpen(false);
      setNewSegment({ name: "", description: "", filterType: "completion" });
      loadSegments();
    }
  };

  const deleteSegment = async (id: string) => {
    const { error } = await supabase.from("user_segments").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao deletar segmento");
    } else {
      toast.success("Segmento deletado");
      loadSegments();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Segmentação de Usuários</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-primary">
              <Plus className="h-4 w-4" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Segmento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Segmento</Label>
                <Input
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                  placeholder="Ex: Top Performers"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                  placeholder="Descreva o critério deste segmento"
                />
              </div>
              <div>
                <Label>Tipo de Filtro</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newSegment.filterType}
                  onChange={(e) => setNewSegment({ ...newSegment, filterType: e.target.value })}
                >
                  <option value="completion">100% Conclusão</option>
                  <option value="no_submissions">Sem Submissões</option>
                  <option value="top_10">Top 10%</option>
                  <option value="active">Ativos (últimos 7 dias)</option>
                </select>
              </div>
              <Button onClick={createSegment} className="w-full bg-gradient-primary">
                Criar Segmento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {segments.map((segment) => (
          <Card key={segment.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-bold text-lg">{segment.segment_name}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{segment.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Criado em {new Date(segment.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSegment(segment.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
