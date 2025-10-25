import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Upload } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";

interface CSVImportExportProps {
  onImportComplete?: () => void;
}

export const CSVImportExport = ({ onImportComplete }: CSVImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("full_name, email, instagram, phone, created_at")
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) {
      toast.error("Nenhum usuário para exportar");
      return;
    }

    const csv = Papa.unparse(profiles);
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

        // Note: Isso não criará contas de autenticação, apenas perfis
        // Para criar contas completas, seria necessário usar Supabase Admin API
        toast.info(`Processando ${validUsers.length} usuários...`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of validUsers) {
          // Aqui você precisaria usar a API Admin do Supabase para criar usuários
          // Por enquanto, apenas mostramos a intenção
          // const { error } = await supabase.auth.admin.createUser({
          //   email: user.email,
          //   password: 'temporary_password',
          //   user_metadata: {
          //     full_name: user.full_name,
          //     instagram: user.instagram,
          //     phone: user.phone,
          //   }
          // });

          // if (error) errorCount++;
          // else successCount++;
        }

        toast.info(
          "Importação de CSV requer acesso Admin API. Entre em contato com o suporte para habilitar esta funcionalidade."
        );

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
      <Input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
        id="csv-import"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
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
