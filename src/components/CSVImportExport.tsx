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
  eventFilter?: string; // 🆕 ITEM 8: Filtro de evento
}

export const CSVImportExport = ({ 
  onImportComplete, 
  users, 
  currentAgencyId, 
  isMasterAdmin,
  eventFilter = "all" // 🆕 ITEM 8: Default
}: CSVImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    let profilesToExport;
    
    if (users && users.length > 0) {
      profilesToExport = users;
    } else {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, email, instagram, phone, gender, followers_range, created_at")
        .order("created_at", { ascending: false });
      
      profilesToExport = profiles || [];
    }

    if (!profilesToExport || profilesToExport.length === 0) {
      toast.error("Nenhum usuário para exportar");
      return;
    }

    // 🔧 ITEM 8: Buscar contagem de posts por usuário se filtro de evento ativo
    const userIds = profilesToExport.map(p => p.id).filter(Boolean);
    let postsCountMap: Record<string, number> = {};
    
    if (userIds.length > 0 && eventFilter !== "all" && eventFilter !== "no_event") {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('user_id, posts!inner(event_id)')
        .in('user_id', userIds)
        .eq('submission_type', 'post')
        .eq('status', 'approved')
        .eq('posts.event_id', eventFilter);
      
      (submissions || []).forEach((sub: any) => {
        postsCountMap[sub.user_id] = (postsCountMap[sub.user_id] || 0) + 1;
      });
    }

    // Formatar dados para export
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
      
      // 🔧 ITEM 8: Adicionar contagem de posts quando filtro ativo
      if (eventFilter !== "all" && eventFilter !== "no_event") {
        return {
          ...baseData,
          total_posts_evento: postsCountMap[profile.id] || 0
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
      <Button variant="outline" onClick={handleExport} className="gap-2">
        <Download className="h-4 w-4" />
        Exportar CSV
      </Button>
    </div>
  );
};
