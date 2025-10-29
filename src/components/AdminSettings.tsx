import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Phone, Save, Globe } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminSettingsProps {
  isMasterAdmin?: boolean;
}

export const AdminSettings = ({ isMasterAdmin = false }: AdminSettingsProps) => {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [badgesEnabled, setBadgesEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: settings, error } = await sb
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['whatsapp_number', 'custom_domain', 'ai_insights_enabled', 'badges_enabled']);

    if (error) {
      console.error('Error loading settings:', error);
      return;
    }

    if (settings) {
      const whatsapp = settings.find(s => s.setting_key === 'whatsapp_number');
      const domain = settings.find(s => s.setting_key === 'custom_domain');
      const aiInsights = settings.find(s => s.setting_key === 'ai_insights_enabled');
      const badges = settings.find(s => s.setting_key === 'badges_enabled');
      
      setWhatsappNumber(whatsapp?.setting_value || '');
      setCustomDomain(domain?.setting_value || '');
      setAiInsightsEnabled(aiInsights?.setting_value !== 'false');
      setBadgesEnabled(badges?.setting_value !== 'false');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    // Validar formato do número
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (whatsappNumber && (cleanNumber.length < 10 || cleanNumber.length > 11)) {
      toast.error("Número de telefone inválido. Use o formato: (00) 00000-0000");
      setLoading(false);
      return;
    }

    // Validar URL customizada
    if (customDomain && !customDomain.startsWith('http')) {
      toast.error("URL deve começar com http:// ou https://");
      setLoading(false);
      return;
    }

    try {
      // Atualizar whatsapp
// DEPOIS:
await sb
  .from('admin_settings')
  .upsert({ 
    setting_key: 'whatsapp_number', 
    setting_value: whatsappNumber || '',  // Sempre salva, mesmo se vazio
    updated_at: new Date().toISOString() 
  }, { onConflict: 'setting_key' });

      // Atualizar custom domain
// DEPOIS:
if (isMasterAdmin) {  // Apenas master admin pode alterar custom domain
  await sb
    .from('admin_settings')
    .upsert({ 
      setting_key: 'custom_domain', 
      setting_value: customDomain.replace(/\/$/, ''),
      updated_at: new Date().toISOString() 
    }, { onConflict: 'setting_key' });
}

      // Atualizar AI Insights (apenas master admin)
      if (isMasterAdmin) {
        await sb
          .from('admin_settings')
          .upsert({ 
            setting_key: 'ai_insights_enabled', 
            setting_value: aiInsightsEnabled ? 'true' : 'false',
            updated_at: new Date().toISOString() 
          }, { onConflict: 'setting_key' });

        // Atualizar Badges
        await sb
          .from('admin_settings')
          .upsert({ 
            setting_key: 'badges_enabled', 
            setting_value: badgesEnabled ? 'true' : 'false',
            updated_at: new Date().toISOString() 
          }, { onConflict: 'setting_key' });
      }

      // Recarregar as configurações para confirmar o salvamento
await loadSettings();
console.log('✅ Configurações recarregadas:', {
  whatsappNumber,
  customDomain,
  aiInsightsEnabled,
  badgesEnabled
});
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error("Erro ao salvar configurações");
    }

    setLoading(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⚙️ Configurações</h2>
        <p className="text-muted-foreground text-sm">
          {isMasterAdmin 
            ? "Configure as informações globais da plataforma" 
            : "Configure o WhatsApp para suporte"}
        </p>
      </div>

      <div className="space-y-6">
        {/* URL Base - Only for Master Admin */}
        {isMasterAdmin && (
          <div className="space-y-2">
            <Label htmlFor="customDomain">
              <Globe className="inline mr-2 h-4 w-4" />
              URL Base para Links de Agência
            </Label>
            <Input
              id="customDomain"
              placeholder="https://seudominio.com.br"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Esta URL será usada para gerar links de convite das agências.
              <br />
              <strong>Exemplo:</strong> {customDomain || 'https://seudominio.com.br'}/agency/nome-agencia
            </p>
          </div>
        )}

        {/* Features Control - Only for Master Admin */}
        {isMasterAdmin && (
          <>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="font-semibold text-sm">Funcionalidades do Dashboard</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Insights com IA</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar análises de desempenho com inteligência artificial
                  </p>
                </div>
                <Switch
                  checked={aiInsightsEnabled}
                  onCheckedChange={setAiInsightsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sistema de Badges</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir sistema de conquistas e badges para usuários
                  </p>
                </div>
                <Switch
                  checked={badgesEnabled}
                  onCheckedChange={setBadgesEnabled}
                />
              </div>
            </div>
          </>
        )}

        {/* WhatsApp - Available for all admins */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp">
            <Phone className="inline mr-2 h-4 w-4" />
            Número do WhatsApp (Opcional)
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
