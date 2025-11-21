import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Save, Building2, User, Lock, Calendar, CreditCard, Upload, Image as ImageIcon } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "./ui/progress";
import imageCompression from 'browser-image-compression';

export const AgencyAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Agency Data
  const [agencyName, setAgencyName] = useState("");
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyLogoUrl, setAgencyLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  
  // Agency URLs
  const [instagramUrl, setInstagramUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [ticketsGroupUrl, setTicketsGroupUrl] = useState("");
  
  // Personal Data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  
  // Plan Data (readonly)
  const [planType, setPlanType] = useState("");
  const [planExpiry, setPlanExpiry] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  
  // Password Change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    console.log('[LOAD] Carregando dados da agência...');
    
    const { data: { user } } = await sb.auth.getUser();
    
    if (!user) {
      console.error('[LOAD] ❌ Usuário não encontrado');
      toast.error("Usuário não encontrado");
      return;
    }

    console.log('[LOAD] User ID:', user.id);
    setUserId(user.id);
    setEmail(user.email || "");

    // Load profile data
    const { data: profileData, error: profileError } = await sb
      .from('profiles')
      .select('full_name, instagram, phone, agency_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[LOAD] Erro ao buscar perfil:', profileError);
    }

    if (profileData) {
      console.log('[LOAD] Perfil carregado:', {
        full_name: profileData.full_name,
        agency_id: profileData.agency_id
      });
      
      setFullName(profileData.full_name || "");
      setInstagram(profileData.instagram || "");
      setPhone(profileData.phone || "");
      setAgencyId(profileData.agency_id);

      // Load agency data
      if (profileData.agency_id) {
        console.log('[LOAD] Carregando dados da agência:', profileData.agency_id);
        
        const { data: agencyData, error: agencyError } = await sb
          .from('agencies')
          .select('name, subscription_plan, plan_expiry_date, subscription_status, logo_url, og_image_url, instagram_url, website_url, whatsapp_group_url, tickets_group_url')
          .eq('id', profileData.agency_id)
          .maybeSingle();

        if (agencyError) {
          console.error('[LOAD] Erro ao buscar agência:', agencyError);
        }

        if (agencyData) {
          console.log('[LOAD] ✅ Agência carregada:', {
            name: agencyData.name,
            instagram_url: agencyData.instagram_url,
            website_url: agencyData.website_url,
            whatsapp_group_url: agencyData.whatsapp_group_url,
            tickets_group_url: agencyData.tickets_group_url
          });
          
          setAgencyName(agencyData.name);
          setPlanType(agencyData.subscription_plan || "basic");
          setPlanExpiry(agencyData.plan_expiry_date);
          setSubscriptionStatus(agencyData.subscription_status || "active");
          setAgencyLogoUrl(agencyData.logo_url);
          setLogoPreview(agencyData.logo_url);
          setOgImageUrl(agencyData.og_image_url);
          setInstagramUrl(agencyData.instagram_url || "");
          setWebsiteUrl(agencyData.website_url || "");
          setWhatsappGroupUrl(agencyData.whatsapp_group_url || "");
          setTicketsGroupUrl(agencyData.tickets_group_url || "");
        } else {
          console.warn('[LOAD] ⚠️ Dados da agência não encontrados');
        }
      } else {
        console.warn('[LOAD] ⚠️ Usuário não possui agency_id associado');
      }
    } else {
      console.warn('[LOAD] ⚠️ Perfil não encontrado');
    }

    console.log('[LOAD] ✅ Carregamento concluído');
    setLoading(false);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar com backend
      try {
        const validation = await sb.functions.invoke('validate-image', {
          body: {
            fileSize: file.size,
            fileType: file.type,
            fileName: file.name
          }
        });

        if (validation.error || !validation.data?.valid) {
          toast.error(validation.data?.error || "Erro ao validar imagem");
          return;
        }
      } catch (error) {
        console.error('Erro ao validar imagem:', error);
      }
      
      // Comprimir logo
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
          fileType: 'image/png'
        };
        
        const compressedFile = await imageCompression(file, options);
        console.log(`📦 Logo comprimido: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
        
        setLogoFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Erro ao comprimir:', error);
        toast.error("Erro ao processar imagem");
      }
    }
  };

  const saveLogo = async () => {
    if (!logoFile || !agencyId) return;
    
    setUploadProgress(0);
    
    try {
      console.log('[LOGO] 📸 Iniciando upload de logo...');
      
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${agencyId}/logo.${fileExt}`;
      const filePath = `agency-logos/${fileName}`;
      
      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      console.log('[LOGO] Fazendo upload para:', filePath);
      
      // Upload para o bucket agency-logos
      const { error: uploadError } = await supabase.storage
        .from('agency-logos')
        .upload(fileName, logoFile, { 
          cacheControl: '3600',
          upsert: true 
        });
      
      clearInterval(progressInterval);
      setUploadProgress(95);
      
      if (uploadError) {
        console.error('[LOGO] ❌ Erro no upload:', uploadError);
        toast.error(`Erro no upload: ${uploadError.message}`);
        throw uploadError;
      }
      
      console.log('[LOGO] ✅ Upload concluído');
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('agency-logos')
        .getPublicUrl(fileName);
      
      console.log('[LOGO] URL pública:', publicUrl);
      
      // Atualizar agencies table
      const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: publicUrl })
        .eq('id', agencyId);
      
      if (updateError) {
        console.error('[LOGO] ❌ Erro ao atualizar agencies:', updateError);
        toast.error(`Erro ao atualizar banco: ${updateError.message}`);
        throw updateError;
      }
      
      console.log('[LOGO] ✅ Logo salvo com sucesso no banco');
      
      setUploadProgress(100);
      setAgencyLogoUrl(publicUrl);
      setLogoPreview(publicUrl);
      
      // Verificar se URL está acessível (apenas log, não gerar erro)
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('[LOGO] ⚠️ Logo URL retornou status', response.status);
        } else {
          console.log('[LOGO] ✅ Logo acessível publicamente');
        }
      } catch (e) {
        console.warn('[LOGO] ⚠️ Não foi possível verificar acessibilidade:', e);
      }
      
      toast.success("Logo salvo com sucesso!");
      setLogoFile(null);
      
      // Recarregar dados para atualizar preview
      await loadData();
      
      // Resetar progresso após 1s
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error: any) {
      console.error('[LOGO] ❌ Erro ao salvar logo:', error);
      // Toasts específicos já foram mostrados acima
      setUploadProgress(0);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      toast.error("Usuário não identificado");
      return;
    }
    
    setSaving(true);
    try {
      console.log('[SAVE] Iniciando salvamento de dados...');
      console.log('[SAVE] User ID:', userId);
      console.log('[SAVE] Agency ID:', agencyId);
      
      // Limpar telefone antes de salvar
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      
      // Preparar dados para salvar
      const profileData = {
        full_name: fullName,
        instagram: instagram,
        phone: cleanPhone,
      };
      
      console.log('[SAVE] Salvando dados pessoais:', profileData);
      
      // Update profile
      const { error: profileError } = await sb
        .from('profiles')
        .update(profileData)
        .eq('id', userId);

      if (profileError) {
        console.error('[SAVE] Erro ao salvar perfil:', profileError);
        throw profileError;
      }
      
      console.log('[SAVE] ✅ Dados pessoais salvos com sucesso');

      // Update agency data if changed
      if (agencyId) {
        const agencyData = { 
          name: agencyName,
          instagram_url: instagramUrl || null,
          website_url: websiteUrl || null,
          whatsapp_group_url: whatsappGroupUrl || null,
          tickets_group_url: ticketsGroupUrl || null,
        };
        
        console.log('[SAVE] Salvando dados da agência:', agencyData);
        
        const { error: agencyError } = await sb
          .from('agencies')
          .update(agencyData)
          .eq('id', agencyId);

        if (agencyError) {
          console.error('[SAVE] Erro ao salvar agência:', agencyError);
          throw agencyError;
        }
        
        console.log('[SAVE] ✅ Dados da agência salvos com sucesso');
      } else {
        console.warn('[SAVE] ⚠️ AgencyId não encontrado - dados da agência não foram salvos');
      }

      toast.success("Dados salvos com sucesso!");
      
      // Recarregar dados do banco para confirmar salvamento
      console.log('[SAVE] Recarregando dados do banco...');
      await loadData();
      console.log('[SAVE] ✅ Dados recarregados com sucesso');
      
    } catch (error: any) {
      console.error('[SAVE] ❌ Erro ao salvar dados:', error);
      toast.error(error.message || "Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await sb.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error("Erro ao alterar senha");
    }
    setSaving(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⚙️ Configurações da Agência</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie seus dados e configurações da conta
        </p>
      </div>

      {/* Agency Data */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">Dados da Agência</h3>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="agencyName">Nome da Agência</Label>
          <Input
            id="agencyName"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Nome da sua agência"
            disabled={saving}
          />
        </div>
        
        {/* Logo Upload Section */}
        <div className="space-y-2">
          <Label htmlFor="logoUpload">Logo da Agência</Label>
          <p className="text-xs text-muted-foreground">
            Faça upload do logo que aparecerá na página de confirmação da lista VIP
          </p>
          
          {/* Logo Preview */}
          {logoPreview && (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
              <Avatar className="h-20 w-20">
                <AvatarImage src={logoPreview} alt="Logo da agência" />
                <AvatarFallback>
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Logo atual</p>
                <p className="text-xs text-muted-foreground">
                  {agencyLogoUrl ? "Sincronizado com o banco de dados" : "Pronto para salvar"}
                </p>
              </div>
            </div>
          )}
          
          {/* File Input */}
          <div className="flex gap-2">
            <Input
              id="logoUpload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={saving}
              className="flex-1"
            />
            {logoFile && (
              <Button 
                onClick={saveLogo}
                disabled={saving || !logoFile}
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Salvar Logo
              </Button>
            )}
          </div>
          
          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Fazendo upload... {uploadProgress}%
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PNG, JPG, WEBP. Tamanho máximo: 5MB
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram da Agência</Label>
            <Input
              id="instagramUrl"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/suaagencia"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://suaagencia.com.br"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappGroupUrl">Grupo WhatsApp da Agência</Label>
            <Input
              id="whatsappGroupUrl"
              type="url"
              value={whatsappGroupUrl}
              onChange={(e) => setWhatsappGroupUrl(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketsGroupUrl">Grupo Compra e Venda de Ingressos</Label>
            <Input
              id="ticketsGroupUrl"
              type="url"
              value={ticketsGroupUrl}
              onChange={(e) => setTicketsGroupUrl(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              disabled={saving}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ogImage">Imagem de Preview (Open Graph)</Label>
          <p className="text-xs text-muted-foreground">
            Imagem que aparece ao compartilhar o link de cadastro no WhatsApp, Facebook, etc.
          </p>
          {ogImageUrl && (
            <img src={ogImageUrl} alt="Preview OG" className="w-full h-32 object-cover rounded-md" />
          )}
          <Input
            id="ogImage"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !agencyId) return;
              
              const fileExt = file.name.split('.').pop();
              const fileName = `${agencyId}-og-${Date.now()}.${fileExt}`;
              
              const { error: uploadError } = await sb.storage
                .from('agency-og-images')
                .upload(fileName, file);
              
              if (uploadError) {
                toast.error('Erro ao fazer upload');
                return;
              }
              
              const { data: { publicUrl } } = sb.storage
                .from('agency-og-images')
                .getPublicUrl(fileName);
              
              const { error: updateError } = await sb
                .from('agencies')
                .update({ og_image_url: publicUrl })
                .eq('id', agencyId);
              
              if (updateError) {
                toast.error('Erro ao salvar');
                return;
              }
              
              setOgImageUrl(publicUrl);
              toast.success('Imagem de preview atualizada!');
            }}
          />
        </div>

        <Button 
          onClick={handleSaveProfile} 
          disabled={saving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Dados da Agência"}
        </Button>
      </Card>

      {/* Personal Data */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">Dados Pessoais</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@seu_usuario"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (apenas números)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                setPhone(cleaned);
              }}
              placeholder="11999999999"
              maxLength={11}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Digite apenas números (10 ou 11 dígitos)</p>
          </div>
        </div>

        <Button 
          onClick={handleSaveProfile} 
          disabled={saving}
          className="bg-gradient-primary"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Dados"}
        </Button>
      </Card>

      {/* Plan Info */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">Informações do Plano</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Plano Atual</Label>
            <div className="flex items-center gap-2">
              <Badge className="text-base px-4 py-2 bg-gradient-primary">
                {planType.toUpperCase()}
              </Badge>
              {getStatusBadge(subscriptionStatus)}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vencimento do Plano
            </Label>
            <p className="text-lg font-semibold">
              {planExpiry 
                ? new Date(planExpiry).toLocaleDateString('pt-BR')
                : "Não definido"}
            </p>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Para alterar seu plano ou renovar sua assinatura, entre em contato com o suporte.
          </p>
        </div>
      </Card>

      {/* Password Change */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">Alterar Senha</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              disabled={saving}
            />
          </div>
        </div>

        <Button 
          onClick={handleChangePassword} 
          disabled={saving || !newPassword || !confirmPassword}
          variant="secondary"
        >
          <Lock className="mr-2 h-4 w-4" />
          {saving ? "Alterando..." : "Alterar Senha"}
        </Button>
      </Card>
    </div>
  );
};