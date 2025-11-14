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
  genderFilter?: string;
  followersFilter?: string;
  minSubmissions?: number;
  minEvents?: number;
}

export const CSVImportExport = ({
  onImportComplete,
  users,
  currentAgencyId,
  isMasterAdmin,
  genderFilter = "all",
  followersFilter = "all",
  minSubmissions = 0,
  minEvents = 0,
}: CSVImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportUsers = async () => {
    let profilesToExport = users || [];

    if (profilesToExport.length === 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, instagram, phone, gender, followers_range, created_at")
        .order("created_at", { ascending: false });

      profilesToExport = profiles || [];
    }

    if (profilesToExport.length === 0) {
      toast.error("Nenhum usuário para exportar");
      return;
    }

    const userIds = profilesToExport.map((p) => p.id).filter(Boolean);
    
    const { data: submissionData } = await supabase
      .from('submissions')
      .select('user_id, posts!inner(event_id)')
      .in('user_id', userIds);

    // ✅ ITEM 6: Buscar vendas aprovadas por usuário
    const { data: approvedSalesData } = await supabase
      .from('submissions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('submission_type', 'sale')
      .eq('status', 'approved');

    const userStats: Record<string, { submissionCount: number; eventIds: Set<string>; approvedSales: number }> = {};
    
    (submissionData || []).forEach((sub: any) => {
      if (!userStats[sub.user_id]) {
        userStats[sub.user_id] = { submissionCount: 0, eventIds: new Set(), approvedSales: 0 };
      }
      userStats[sub.user_id].submissionCount += 1;
      if (sub.posts?.event_id) {
        userStats[sub.user_id].eventIds.add(sub.posts.event_id);
      }
    });

    // ✅ ITEM 6: Contar vendas aprovadas
    (approvedSalesData || []).forEach((sale: any) => {
      if (!userStats[sale.user_id]) {
        userStats[sale.user_id] = { submissionCount: 0, eventIds: new Set(), approvedSales: 0 };
      }
      userStats[sale.user_id].approvedSales += 1;
    });

    const formattedProfiles = profilesToExport.map((profile) => ({
      full_name: profile.full_name,
      email: profile.email,
      instagram_arroba: profile.instagram ? `@${profile.instagram.replace("@", "")}` : "",
      instagram_https: profile.instagram ? `https://instagram.com/${profile.instagram.replace("@", "")}` : "",
      phone: profile.phone,
      sexo: profile.gender || "Não informado",
      faixa_seguidores: profile.followers_range || "Não informado",
      total_submissoes: userStats[profile.id]?.submissionCount || 0,
      total_eventos_participados: userStats[profile.id]?.eventIds.size || 0,
      total_vendas_aprovadas: userStats[profile.id]?.approvedSales || 0, // ✅ ITEM 6: Nova coluna
      created_at: profile.created_at,
    }));

    // ✅ ITEM 6: Usar XLSX em vez de CSV
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(formattedProfiles);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');
    XLSX.writeFile(workbook, `usuarios_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success(`${profilesToExport.length} usuários exportados em XLSX!`);
  };

  const handleExportSubmissions = async () => {
    let query = supabase
      .from("submissions")
      .select(`id, submitted_at, status, user_id, posts!inner(post_number, event_id, events!inner(title)), profiles!inner(full_name, email, instagram, gender, followers_range)`)
      .eq("submission_type", "post")
      .order("submitted_at", { ascending: false });

    if (genderFilter !== "all") query = query.eq('profiles.gender', genderFilter);
    if (followersFilter !== "all") query = query.eq('profiles.followers_range', followersFilter);

    const { data: submissions } = await query;

    if (!submissions || submissions.length === 0) {
      toast.error("Nenhuma submissão encontrada");
      return;
    }

    const formattedSubmissions = submissions.map((sub: any) => ({
      usuario: sub.profiles.full_name,
      email: sub.profiles.email,
      instagram: sub.profiles.instagram,
      sexo: sub.profiles.gender || "Não informado",
      seguidores: sub.profiles.followers_range || "Não informado",
      evento: sub.posts.events.title,
      post_numero: sub.posts.post_number,
      status: sub.status,
      data_submissao: sub.submitted_at,
    }));

    const csv = Papa.unparse(formattedSubmissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `submissoes_globais_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${submissions.length} submissões exportadas!`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const validUsers = results.data.filter((row: any) => row.email && row.full_name);
        if (validUsers.length === 0) {
          toast.error("Nenhum usuário válido encontrado");
          return;
        }

        toast.info(`Importando ${validUsers.length} usuários...`);
        const { data, error } = await supabase.functions.invoke("import-users", {
          body: { users: validUsers },
        });

        if (error) {
          toast.error("Erro ao importar");
          return;
        }

        if (data) {
          toast.success(`✅ ${data.success.length} importados!`);
          if (data.errors.length > 0) toast.warning(`⚠️ ${data.errors.length} erros`);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        onImportComplete?.();
      },
    });
  };

  return (
    <div className="flex gap-2">
      <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" id="csv-import" />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">
        <Upload className="h-4 w-4 mr-2" />Importar CSV
      </Button>
      <Button variant="outline" onClick={handleExportUsers} size="sm">
        <Download className="h-4 w-4 mr-2" />Exportar Usuários
      </Button>
      <Button variant="outline" onClick={handleExportSubmissions} size="sm">
        <Download className="h-4 w-4 mr-2" />Exportar Submissões
      </Button>
    </div>
  );
};
