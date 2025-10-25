import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Save } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { toast } from "sonner";

export const AdminSettings = () => {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await sb
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'whatsapp_number')
      .single();

    if (error) {
      console.error('Error loading settings:', error);
      return;
    }

    if (data) {
      setWhatsappNumber(data.setting_value || '');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Validar formato do número
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 11) {
      toast.error("Número de telefone inválido. Use o formato: (00) 00000-0000");
      setLoading(false);
      return;
    }

    const { error } = await sb
      .from('admin_settings')
      .update({ setting_value: whatsappNumber })
      .eq('setting_key', 'whatsapp_number');

    if (error) {
      console.error('Error saving settings:', error);
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas com sucesso!");
    }

    setLoading(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações do Admin</h2>
        <p className="text-muted-foreground text-sm">
          Configure as informações de contato que serão exibidas para os usuários
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp">
            <Phone className="inline mr-2 h-4 w-4" />
            Número do WhatsApp
          </Label>
          <Input
            id="whatsapp"
            placeholder="(00) 00000-0000"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Os usuários poderão clicar em um botão para falar diretamente com você pelo WhatsApp
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-gradient-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </Card>
  );
};
