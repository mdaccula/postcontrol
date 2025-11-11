import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";

interface CSVImportExportProps {
  onImportComplete?: () => void;
  users?: any[];
  currentAgencyId?: string | null;
  isMasterAdmin?: boolean;
  eventFilter?: string;
  exportMode?: 'users' | 'submissions';
}

export const CSVImportExport = ({
  onImportComplete,
  users,
  currentAgencyId,
  isMasterAdmin,
  eventFilter = "all",
  exportMode = "users",
}: CSVImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    let profilesToExport;

    if (users && users.length > 0) {
      profilesToExport = users;
    } else {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, instagram, phone, gender, followers_range, created_at")
        .order("created_at", { ascending: false });

      profilesToExport = profiles || [];
    }

    if (!profilesToExport || profilesToExport.length === 0) {
      toast.error("Nenhum usuário para exportar");
      return;
    }

    // 🔧 ITEM 4: Buscar contagem de posts agrupada por usuário (1 linha por usuário)
    const userIds = profilesToExport.map((p) => p.id).filter(Boolean);
    let postsCountMap: Record<string, { approved: number; total: number }> = {};

    if (userIds.length > 0 && eventFilter !== "all" && eventFilter !== "no_event") {
      // Query única: contar posts por usuário e status
      const { data: submissions } = await supabase
        .from("submissions")
        .select("user_id, status, posts!inner(event_id)")
        .in("user_id", userIds)
        .eq("submission_type", "post")
        .eq("posts.event_id", eventFilter);

      // Agrupar contagens por usuário
      (submissions || []).forEach((sub: any) => {
        if (!postsCountMap[sub.user_id]) {
          postsCountMap[sub.user_id] = { approved: 0, total: 0 };
        }
        postsCountMap[sub.user_id].total += 1;
        if (sub.status === "approved") {
          postsCountMap[sub.user_id].approved += 1;
        }
      });

      console.log("📊 Posts agrupados por usuário:", {
        usuariosComPosts: Object.keys(postsCountMap).length,
        totalUsuarios: userIds.length,
      });
    }

    // Formatar dados para export (1 linha por usuário)
    const formattedProfiles = profilesToExport.map((profile) => {
      const baseData = {
        full_name: profile.full_name,
        email: profile.email,
        instagram_arroba: profile.instagram ? `@${profile.instagram.replace("@", "")}` : "",
        instagram_https: profile.instagram ? `https://instagram.com/${profile.instagram.replace("@", "")}` : "",
        phone: profile.phone,
        sexo: profile.gender || "Não informado",
        faixa_seguidores: profile.followers_range || "Não informado",
        created_at: profile.created_at,
      };

      // 🔧 ITEM 4: Adicionar "Total de Postagens" quando filtro ativo
      if (eventFilter !== "all" && eventFilter !== "no_event") {
        const counts = postsCountMap[profile.id] || { approved: 0, total: 0 };
        return {
          ...baseData,
          total_postagens: counts.total,
          posts_aprovados: counts.approved,
          posts_pendentes: counts.total - counts.approved,
        };
      }

      return baseData;
    });

    const csv = Papa.unparse(formattedProfiles);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `usuarios_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Usuários exportados com sucesso!");
  };

  const handleExportSubmissions = async () => {
    if (eventFilter === "all" || eventFilter === "no_event") {
      toast.error("Selecione um evento específico para exportar submissões");
      return;
    }

    // 1. Buscar TODAS as submissões do evento
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        id,
        submitted_at,
        status,
        user_id,
        posts!inner(post_number, event_id, events!inner(title)),
        profiles!inner(full_name, email, instagram)
      `)
      .eq("posts.event_id", eventFilter)
      .eq("submission_type", "post")
      .order("submitted_at", { ascending: false });

    if (!submissions || submissions.length === 0) {
      toast.error("Nenhuma submissão encontrada para este evento");
      return;
    }

    // 2. Calcular total de submissões aprovadas POR USUÁRIO (1 query)
    const userIds = [...new Set(submissions.map((s: any) => s.user_id))];
    
    const { data: approvedCounts } = await supabase
      .from("submissions")
      .select("user_id, status")
      .in("user_id", userIds)
      .eq("status", "approved")
      .eq("submission_type", "post");

    // Criar mapa: user_id => total aprovados
    const approvedCountMap: Record<string, number> = {};
    (approvedCounts || []).forEach((item: any) => {
      approvedCountMap[item.user_id] = (approvedCountMap[item.user_id] || 0) + 1;
    });

    // 3. Formatar dados (1 linha por submissão)
    const formattedSubmissions = submissions.map((sub: any) => ({
      nome: sub.profiles.full_name,
      email: sub.profiles.email,
      instagram: sub.profiles.instagram ? `@${sub.profiles.instagram.replace("@", "")}` : "",
      evento: sub.posts.events.title,
      post: `Post #${sub.posts.post_number}`,
      data_submissao: new Date(sub.submitted_at).toLocaleString('pt-BR'),
      status: sub.status === "approved" ? "Aprovado" : sub.status === "rejected" ? "Reprovado" : "Pendente",
      total_submissoes_aprovadas: approvedCountMap[sub.user_id] || 0,
    }));

    // 4. Exportar CSV
    const csv = Papa.unparse(formattedSubmissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `submissoes_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${formattedSubmissions.length} submissões exportadas!`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const validUsers = results.data.filter((row: any) => {
          return row.email && row.full_name;
        });

        if (validUsers.length === 0) {
          toast.error("Nenhum usuário válido encontrado no CSV");
          return;
        }

        toast.info(`Importando ${validUsers.length} usuários...`);

        const { data, error } = await supabase.functions.invoke("import-users", {
          body: { users: validUsers },
        });

        if (error) {
          toast.error("Erro ao importar usuários");
          console.error(error);
          return;
        }

        if (data) {
          toast.success(`✅ ${data.success.length} usuários importados com sucesso!`);

          if (data.errors.length > 0) {
            toast.warning(`⚠️ ${data.errors.length} erros durante a importação`);
            console.error("Erros:", data.errors);
          }
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        onImportComplete?.();
      },
      error: (error) => {
        toast.error(`Erro ao processar CSV: ${error.message}`);
      },
    });
  };

  return (
    <div className="flex gap-2">
      <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" id="csv-import" />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
        <Upload className="h-4 w-4" />
        Importar CSV
      </Button>
      <Button 
        variant="outline" 
        onClick={exportMode === 'submissions' ? handleExportSubmissions : handleExport} 
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {exportMode === 'submissions' ? 'Exportar Submissões' : 'Exportar Usuários'}
      </Button>
    </div>
  );
};
