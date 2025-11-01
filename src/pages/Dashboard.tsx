import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Award, Calendar, LogOut, MessageCircle, Building2, ChevronDown, Camera, User, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserAgencies, useAdminSettings } from "@/hooks/useReactQuery";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { useDashboard } from "@/hooks/useDashboard";

// Lazy loading para componentes pesados
const TutorialGuide = lazy(() => import("@/components/TutorialGuide").then(m => ({ default: m.TutorialGuide })));
const BadgeDisplay = lazy(() => import("@/components/BadgeDisplay").then(m => ({ default: m.BadgeDisplay })));
const AIInsights = lazy(() => import("@/components/AIInsights").then(m => ({ default: m.AIInsights })));
const SubmissionImageDisplay = lazy(() => import("@/components/SubmissionImageDisplay").then(m => ({ default: m.SubmissionImageDisplay })));

interface Submission {
  id: string;
  submitted_at: string;
  screenshot_url: string;
  screenshot_path?: string;
  status: string;
  rejection_reason?: string;
  submission_type?: string;
  posts: {
    post_number: number;
    deadline: string;
    event_id: string;
    events: {
      title: string;
      required_posts: number;
    } | null;
  } | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados locais
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<string>("all");
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>("");
  const [agencyPlan, setAgencyPlan] = useState<string>("");
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [badgesEnabled, setBadgesEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  // React Query hooks
  const { data: userAgenciesData, isLoading: isLoadingAgencies } = useUserAgencies(user?.id);
  const { data: adminSettingsData, isLoading: isLoadingSettings } = useAdminSettings([
    'ai_insights_enabled',
    'badges_enabled',
    'whatsapp_number'
  ]);

  // ✅ Hook unificado para todos os dados do dashboard
  const { data: dashboardData, isLoading: isLoadingDashboard, refetch } = useDashboard(currentAgencyId);

  // ✅ Derivar dados do hook unificado
  const profile = dashboardData?.profile;
  const submissions = dashboardData?.submissions || [];
  const eventStats = dashboardData?.eventStats || [];
  const events = dashboardData?.events || [];
  const isMasterAdmin = dashboardData?.isMasterAdmin || false;
  const isAgencyAdmin = dashboardData?.isAgencyAdmin || false;

  // Loading consolidado
  const loading = isLoadingAgencies || isLoadingSettings || isLoadingDashboard;

  // ✅ Setup inicial e atualização de agência
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Processar agencies
    if (userAgenciesData && !isLoadingAgencies) {
      let contextAgency = searchParams.get("agency");
      if (!contextAgency && userAgenciesData.length > 0) {
        contextAgency = userAgenciesData[0].id;
      }
      
      if (contextAgency) {
        setCurrentAgencyId(contextAgency);
        const currentAgency = userAgenciesData.find((a: any) => a.id === contextAgency);
        if (currentAgency) {
          setAgencyName(currentAgency.name);
          setAgencyPlan(currentAgency.subscription_plan);
        }
      }
    }
    
    // Processar settings
    if (adminSettingsData && !isLoadingSettings) {
      setAiInsightsEnabled(adminSettingsData.ai_insights_enabled === 'true');
      setBadgesEnabled(adminSettingsData.badges_enabled === 'true');
      setWhatsappNumber(adminSettingsData.whatsapp_number || '');
    }
  }, [user, navigate, userAgenciesData, adminSettingsData, isLoadingAgencies, isLoadingSettings, searchParams]);

  // ✅ Atualizar estados locais quando perfil carrega
  useEffect(() => {
    if (profile) {
      setSelectedGender(profile.gender || "");
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  // ✅ Background: Atualizar last_accessed_at (não bloqueia carregamento)
  useEffect(() => {
    if (user && currentAgencyId) {
      sb.from('user_agencies')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('agency_id', currentAgencyId)
        .then(() => console.log('✅ last_accessed_at atualizado em background'));
    }
  }, [user, currentAgencyId]);

  // ✅ Mutação otimista para salvar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (newData: Partial<typeof profile>) => {
      const { error } = await sb
        .from('profiles')
        .update(newData)
        .eq('id', user!.id);
      
      if (error) throw error;
      return newData;
    },
    onMutate: async (newData) => {
      // Atualizar cache local imediatamente
      queryClient.setQueryData(['dashboard', user?.id, currentAgencyId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profile: { ...old.profile, ...newData }
        };
      });
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      refetch(); // Recarregar em caso de erro
    }
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
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
          toast({
            title: "Arquivo inválido",
            description: validation.data?.error || "Erro ao validar imagem",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Erro ao validar imagem:', error);
      }
      
      // Comprimir avatar
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        
        const compressedFile = await imageCompression(file, options);
        console.log(`📦 Avatar comprimido: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
        
        setAvatarFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Erro ao comprimir:', error);
        toast({
          title: "Erro ao processar imagem",
          description: "Tente novamente",
          variant: "destructive",
        });
      }
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile || !user) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('📸 Iniciando upload de avatar...');
      
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
      
      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      // Deletar arquivos antigos
      const { data: oldFiles } = await sb.storage
        .from('screenshots')
        .list('avatars', { search: user.id });
      
      if (oldFiles && oldFiles.length > 0) {
        await Promise.all(
          oldFiles.map(file => 
            sb.storage
              .from('screenshots')
              .remove([`avatars/${file.name}`])
          )
        );
      }
      
      // Upload
      const { error: uploadError } = await sb.storage
        .from('screenshots')
        .upload(fileName, avatarFile, { upsert: true });
      
      clearInterval(progressInterval);
      setUploadProgress(95);
      
      if (uploadError) throw uploadError;
      
      // Gerar URL assinada
      const { data: signedData, error: signedError } = await sb.storage
        .from('screenshots')
        .createSignedUrl(fileName, 31536000);
      
      if (signedError) throw signedError;
      
      // Atualizar perfil com mutação otimista
      await updateProfileMutation.mutateAsync({ avatar_url: signedData.signedUrl });
      
      setUploadProgress(100);
      setAvatarFile(null);
    } catch (error: any) {
      console.error('❌ Erro ao salvar avatar:', error);
      toast({
        title: "Erro ao salvar foto",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const saveGender = async () => {
    if (!user) return;
    await updateProfileMutation.mutateAsync({ gender: selectedGender });
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Senha alterada!",
        description: "Sua nova senha já está ativa.",
      });
      
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Erro ao mudar senha:', error);
      toast({
        title: "Erro ao alterar senha",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Fallback UI para usuários sem agência
  if (!currentAgencyId || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-8">
        <Card className="max-w-7xl mx-auto p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma Agência Vinculada</h2>
          <p className="text-muted-foreground mb-6">
            Você precisa estar vinculado a uma agência para ver os eventos e enviar postagens.
          </p>
          <Button onClick={() => navigate("/")}>
            Voltar para Home
          </Button>
        </Card>
      </div>
    );
  }

  // Cálculos de estatísticas
  const approvedSubmissionsCount = submissions.filter(s => s.status === "approved").length;
  const activeEventsCount = events.length;
  const lastSubmission = submissions[0];

  // Filtrar submissões por evento (inline, sem useMemo para evitar problemas com early returns)
  const filteredSubmissions = selectedHistoryEvent === "all" 
    ? submissions 
    : submissions.filter(s => s.posts?.event_id === selectedHistoryEvent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-card/80 backdrop-blur-lg border-primary/20 shadow-xl overflow-hidden">
            <div className="relative p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-lg">
                    <AvatarImage src={avatarPreview || undefined} alt={profile.full_name} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10">
                      {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Olá, {profile.full_name || "Usuário"}!
                      </h1>
                      {isMasterAdmin && (
                        <Badge variant="default" className="bg-purple-500">Master Admin</Badge>
                      )}
                      {isAgencyAdmin && !isMasterAdmin && (
                        <Badge variant="default" className="bg-blue-500">Agency Admin</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {profile.email}
                    </p>
                    {profile.instagram && (
                      <p className="text-sm text-muted-foreground">
                        📱 @{profile.instagram}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {userAgenciesData && userAgenciesData.length > 1 && (
                    <Select value={currentAgencyId || undefined} onValueChange={setCurrentAgencyId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar agência" />
                      </SelectTrigger>
                      <SelectContent>
                        {userAgenciesData.map((agency: any) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <ThemeToggle />
                  <NotificationBell userId={user!.id} />
                  
                  <Button
                    onClick={() => navigate("/submit")}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Enviar Nova Postagem
                  </Button>
                  
                  {isMasterAdmin && (
                    <Button onClick={() => navigate("/master-admin")} variant="outline">
                      Master Admin
                    </Button>
                  )}
                  
                  {isAgencyAdmin && (
                    <Button onClick={() => navigate("/admin")} variant="outline">
                      Painel Admin
                    </Button>
                  )}
                  
                  <Button onClick={handleSignOut} variant="ghost" size="icon">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Badges */}
        {badgesEnabled && (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <BadgeDisplay />
          </Suspense>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Postagens Aprovadas</p>
                  <h3 className="text-3xl font-bold mt-2">{approvedSubmissionsCount}</h3>
                </div>
                <div className="p-4 bg-green-500/10 rounded-full">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                  <h3 className="text-3xl font-bold mt-2">{activeEventsCount}</h3>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-full">
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Última Submissão</p>
                  <h3 className="text-lg font-bold mt-2">
                    {lastSubmission 
                      ? new Date(lastSubmission.submitted_at).toLocaleDateString('pt-BR')
                      : "Nenhuma"}
                  </h3>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-full">
                  <Award className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="statistics" className="text-base">
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="history" className="text-base">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="cadastro" className="text-base">
              Meu Cadastro
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Progresso dos Eventos</h2>
              <div className="space-y-6">
                {eventStats.length > 0 ? (
                  eventStats.map((stat) => (
                    <div key={stat.eventId} className="space-y-3 p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{stat.eventTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {stat.submitted} de {stat.isApproximate ? '~' : ''}{stat.totalRequired} posts aprovados
                          </p>
                        </div>
                        <Badge variant={stat.percentage >= 100 ? "default" : "secondary"} className="text-lg px-4 py-2">
                          {stat.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={stat.percentage} className="h-3" />
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum evento ativo no momento
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Histórico de Submissões</h2>
                <Select value={selectedHistoryEvent} onValueChange={setSelectedHistoryEvent}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Filtrar por evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((submission) => (
                    <Card key={submission.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                submission.status === "approved"
                                  ? "default"
                                  : submission.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {submission.status === "approved"
                                ? "Aprovado"
                                : submission.status === "rejected"
                                ? "Rejeitado"
                                : "Pendente"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="font-medium">
                            {submission.posts?.events?.title} - Post #{submission.posts?.post_number}
                          </p>
                          {submission.rejection_reason && (
                            <p className="text-sm text-destructive">
                              Motivo: {submission.rejection_reason}
                            </p>
                          )}
                        </div>
                        {submission.screenshot_url && (
                          <Suspense fallback={<Skeleton className="h-20 w-20" />}>
                            <SubmissionImageDisplay
                              screenshotPath={submission.screenshot_path}
                              screenshotUrl={submission.screenshot_url}
                              className="h-20 w-20 object-cover rounded"
                            />
                          </Suspense>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma submissão encontrada
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="cadastro" className="space-y-6">
            <Card className="p-6">
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="senha">Alterar Senha</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6 mt-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4 pb-6 border-b">
                    <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                      <AvatarImage src={avatarPreview || undefined} />
                      <AvatarFallback className="text-3xl">
                        {profile.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                          <Camera className="h-4 w-4" />
                          <span>Alterar Foto</span>
                        </div>
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </Label>
                      {avatarFile && (
                        <Button onClick={saveAvatar} disabled={uploading}>
                          {uploading ? `${uploadProgress}%` : "Salvar Foto"}
                        </Button>
                      )}
                    </div>
                    {uploading && (
                      <Progress value={uploadProgress} className="w-full max-w-xs" />
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-4">
                    <div>
                      <Label>Nome Completo</Label>
                      <Input value={profile.full_name || ""} disabled />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={profile.email || ""} disabled />
                    </div>
                    <div>
                      <Label>Instagram</Label>
                      <Input value={profile.instagram || ""} disabled />
                    </div>
                    {profile.phone && (
                      <div>
                        <Label>Telefone</Label>
                        <Input value={profile.phone} disabled />
                      </div>
                    )}
                    <div>
                      <Label>Gênero</Label>
                      <Select value={selectedGender} onValueChange={setSelectedGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefiro não dizer</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedGender !== (profile.gender || "") && (
                        <Button onClick={saveGender} className="mt-2" size="sm">
                          Salvar Gênero
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="senha" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirmar Senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                    <Button
                      onClick={changePassword}
                      disabled={!newPassword || !confirmPassword}
                      className="w-full"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>

        {/* WhatsApp Button */}
        {whatsappNumber && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <Button
              onClick={() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`, '_blank')}
              size="lg"
              className="rounded-full h-16 w-16 shadow-lg bg-green-500 hover:bg-green-600"
            >
              <MessageCircle className="h-8 w-8" />
            </Button>
          </motion.div>
        )}

        {/* Tutorial Guide */}
        <Suspense fallback={null}>
          <TutorialGuide />
        </Suspense>
      </div>
    </div>
  );
};

export default Dashboard;
