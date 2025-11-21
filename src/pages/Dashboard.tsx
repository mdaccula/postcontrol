import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ✅ Sprint 3B: Importar componentes refatorados
import { DashboardStats } from "./Dashboard/DashboardStats";
import { DashboardSubmissionHistory } from "./Dashboard/DashboardSubmissionHistory";
import { DashboardProfile } from "./Dashboard/DashboardProfile";
import { useDashboardFilters } from "./Dashboard/useDashboardFilters";
import {
  ArrowLeft,
  TrendingUp,
  Award,
  Calendar,
  LogOut,
  MessageCircle,
  Building2,
  ChevronDown,
  Camera,
  User,
  Lock,
  Send,
  Users, // ✅ ITEM 7: Ícone para Guest Dashboard
  ClipboardCheck, // ✅ R2: Ícone para Análise Manual
} from "lucide-react";
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
import { useUserAgenciesQuery, useAdminSettingsQuery } from "@/hooks/consolidated";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { useDashboard } from "@/hooks/useDashboard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
// ✅ ITEM 7: Importar hook para verificar se é guest
import { useIsGuest } from "@/hooks/useIsGuest";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { GoalProgressBadge } from "@/components/GoalProgressBadge";

// Lazy loading para componentes pesados
const TutorialGuide = lazy(() => import("@/components/TutorialGuide"));
const BadgeDisplay = lazy(() => import("@/components/BadgeDisplay").then((m) => ({ default: m.BadgeDisplay })));
const AIInsights = lazy(() => import("@/components/AIInsights").then((m) => ({ default: m.AIInsights })));
const SubmissionImageDisplay = lazy(() =>
  import("@/components/SubmissionImageDisplay").then((m) => ({ default: m.SubmissionImageDisplay })),
);

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
  const [agencyName, setAgencyName] = useState<string>("");
  const [agencyPlan, setAgencyPlan] = useState<string>("");
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [badgesEnabled, setBadgesEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [submissionToDelete, setSubmissionToDelete] = useState<{ id: string; status: string } | null>(null);
  // ✅ B2: Estado para agência selecionada
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  // ✅ ITEM 3: Estado para Instagram editável
  const [instagram, setInstagram] = useState<string>("");

  // ✅ ITEM 7: Hook para verificar se usuário é guest
  const { isGuest, guestData } = useIsGuest();

  // ✅ Sprint 3B: Hook consolidado para filtros
  const {
    filters: { selectedHistoryEvent },
    setSelectedHistoryEvent,
  } = useDashboardFilters();

  // React Query hooks
  const { data: userAgenciesData, isLoading: isLoadingAgencies } = useUserAgenciesQuery(user?.id);
  const { data: adminSettingsData, isLoading: isLoadingSettings } = useAdminSettingsQuery([
    "ai_insights_enabled",
    "badges_enabled",
    "whatsapp_number",
  ]);

  // ✅ Hook unificado para todos os dados do dashboard (sem agencyId)
  const { data: dashboardData, isLoading: isLoadingDashboard, refetch } = useDashboard();

  // ✅ Derivar dados do hook unificado
  const profile = dashboardData?.profile;
  const submissions = dashboardData?.submissions || [];
  const eventStats = dashboardData?.eventStats || [];
  const events = dashboardData?.events || [];
  const isMasterAdmin = dashboardData?.isMasterAdmin || false;
  const isAgencyAdmin = dashboardData?.isAgencyAdmin || false;

  // Loading consolidado (sem isLoadingAgencies)
  const loading = isLoadingSettings || isLoadingDashboard;

  // ✅ B2: Filtrar dados por agência selecionada (ANTES de early returns)
  const filteredSubmissions = useMemo(() => {
    if (!selectedAgencyId || !submissions) return submissions;
    return submissions.filter((s) => {
      const eventAgencyId = s.posts?.events && typeof s.posts.events === 'object' 
        ? (s.posts.events as any).agency_id 
        : null;
      return eventAgencyId === selectedAgencyId;
    });
  }, [submissions, selectedAgencyId]);

  const filteredEvents = useMemo(() => {
    if (!selectedAgencyId || !events) return events;
    return events.filter((e) => e.agency_id === selectedAgencyId);
  }, [events, selectedAgencyId]);

  const filteredEventStats = useMemo(() => {
    if (!selectedAgencyId || !eventStats || !events) return eventStats;
    return eventStats.filter((stat) => {
      const event = events.find(e => e.id === stat.eventId);
      return event?.agency_id === selectedAgencyId;
    });
  }, [eventStats, events, selectedAgencyId]);

  // Filtrar submissões por evento (usar filteredSubmissions)
  const filteredSubmissionsByEvent = useMemo(() => {
    if (!filteredSubmissions) return [];
    return selectedHistoryEvent === "all"
      ? filteredSubmissions
      : filteredSubmissions.filter((s) => s.posts?.event_id === selectedHistoryEvent);
  }, [filteredSubmissions, selectedHistoryEvent]);

  // Variável para última submissão
  const lastSubmission = filteredSubmissions && filteredSubmissions.length > 0 ? filteredSubmissions[0] : null;

  // ✅ Logs de debug do estado do Dashboard
  useEffect(() => {
    console.log("📊 [Dashboard] Estado atual:", {
      user: user?.id,
      loading,
      hasData: !!dashboardData,
      hasAgencies: dashboardData?.hasAgencies,
      profile: dashboardData?.profile?.full_name || "(sem perfil)",
      agencies: dashboardData?.userAgencyIds?.length || 0,
    });
  }, [user, loading, dashboardData]);

  // ✅ Setup inicial
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Atualizar nome e plano da agência quando mudar
    if (userAgenciesData && userAgenciesData.length > 0) {
      const firstAgency = userAgenciesData[0];
      if (firstAgency) {
        setAgencyName(firstAgency.name || "");
        setAgencyPlan(firstAgency.subscription_plan || "");
      }
    }

    // Processar settings (agora é objeto direto)
    if (adminSettingsData && !isLoadingSettings) {
      setAiInsightsEnabled(adminSettingsData['ai_insights_enabled'] === "true");
      setBadgesEnabled(adminSettingsData['badges_enabled'] === "true");
      setWhatsappNumber(adminSettingsData['whatsapp_number'] || "");
    }
  }, [user, navigate, userAgenciesData, adminSettingsData, isLoadingSettings]);

  // ✅ Atualizar estados locais quando perfil carrega
  useEffect(() => {
    if (profile) {
      setSelectedGender(profile.gender || "");
      setAvatarPreview(profile.avatar_url || null);
      setInstagram(profile.instagram || "");
    }
  }, [profile]);

  // ✅ B2: Inicializar agência selecionada (primeira agência ou do localStorage)
  useEffect(() => {
    if (userAgenciesData && userAgenciesData.length > 0) {
      const savedAgencyId = localStorage.getItem('preferred_agency');
      const validSavedAgency = savedAgencyId && userAgenciesData.some(a => a.id === savedAgencyId);
      
      setSelectedAgencyId(
        validSavedAgency ? savedAgencyId : userAgenciesData[0].id
      );
    }
  }, [userAgenciesData]);

  // ✅ B2: Salvar preferência no localStorage
  useEffect(() => {
    if (selectedAgencyId) {
      localStorage.setItem('preferred_agency', selectedAgencyId);
    }
  }, [selectedAgencyId]);

  // ✅ Background: Atualizar last_accessed_at (não bloqueia carregamento)
  useEffect(() => {
    if (user && dashboardData?.userAgencyIds && dashboardData.userAgencyIds.length > 0) {
      const firstAgencyId = dashboardData.userAgencyIds[0];
      sb.from("user_agencies")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("agency_id", firstAgencyId)
        .then(() => console.log("✅ last_accessed_at atualizado em background"));
    }
  }, [user, dashboardData?.userAgencyIds]);

  // ✅ Mutação otimista para salvar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (newData: Partial<typeof profile>) => {
      const { error } = await sb.from("profiles").update(newData).eq("id", user!.id);

      if (error) throw error;
      return newData;
    },
    onMutate: async (newData) => {
      // Atualizar cache local imediatamente
      queryClient.setQueryData(["dashboard", user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profile: { ...old.profile, ...newData },
        };
      });
    },
    onSuccess: async (newData) => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      
      // ✅ ITEM 4: Invalidar cache de avatares para forçar recarga
      if (newData.avatar_url) {
        console.log('🔄 [Dashboard] Invalidando cache de avatar...');
        
        // Invalidar query do dashboard para recarregar avatar
        await queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
        
        // Sincronizar com logo da agência se aplicável
        if (profile?.agency_id) {
          const { error: agencyError } = await sb
            .from('agencies')
            .update({ logo_url: newData.avatar_url })
            .eq('id', profile.agency_id);
          
          if (!agencyError) {
            console.log('✅ Logo da agência sincronizado automaticamente com avatar');
            // Invalidar cache de agências também
            await queryClient.invalidateQueries({ queryKey: ['userAgencies', user?.id] });
          }
        }
        
        // Forçar recarga do preview do avatar
        setAvatarPreview(newData.avatar_url);
      }
    },
    onError: (error) => {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      refetch(); // Recarregar em caso de erro
    },
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
        const validation = await sb.functions.invoke("validate-image", {
          body: {
            fileSize: file.size,
            fileType: file.type,
            fileName: file.name,
          },
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
        console.error("Erro ao validar imagem:", error);
      }

      // Comprimir avatar
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
          fileType: "image/jpeg",
        };

        const compressedFile = await imageCompression(file, options);
        console.log(
          `📦 Avatar comprimido: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`,
        );

        setAvatarFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Erro ao comprimir:", error);
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
      console.log("📸 Iniciando upload de avatar...");

      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Deletar arquivos antigos
      const { data: oldFiles } = await sb.storage.from("screenshots").list("avatars", { search: user.id });

      if (oldFiles && oldFiles.length > 0) {
        await Promise.all(oldFiles.map((file) => sb.storage.from("screenshots").remove([`avatars/${file.name}`])));
      }

      // Upload
      const { error: uploadError } = await sb.storage
        .from("screenshots")
        .upload(fileName, avatarFile, { upsert: true });

      clearInterval(progressInterval);
      setUploadProgress(95);

      if (uploadError) throw uploadError;

      // Gerar URL assinada
      const { data: signedData, error: signedError } = await sb.storage
        .from("screenshots")
        .createSignedUrl(fileName, 31536000);

      if (signedError) throw signedError;

      // Atualizar perfil com mutação otimista
      await updateProfileMutation.mutateAsync({ avatar_url: signedData.signedUrl });

      setUploadProgress(100);
      setAvatarFile(null);
    } catch (error: any) {
      console.error("❌ Erro ao salvar avatar:", error);
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
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua nova senha já está ativa.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  // 🆕 ITEM NOVO: Função para excluir submissão pendente
  const handleDeleteSubmission = async (submissionId: string, status: string) => {
    if (status !== 'pending') {
      toast({
        title: "Não permitido",
        description: "Apenas submissões pendentes podem ser excluídas",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId)
        .eq('user_id', user?.id) // Segurança: só pode deletar próprias submissões
        .eq('status', 'pending'); // Segurança: só pode deletar pendentes
      
      if (error) throw error;
      
      toast({
        title: "Submissão excluída!",
        description: "A postagem pendente foi removida do histórico."
      });
      
      refetch(); // Recarregar dashboard
    } catch (error: any) {
      console.error('Erro ao excluir submissão:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
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

  // Fallback UI para usuários sem agência (só exibir se confirmado pelo hook)
  if (dashboardData && dashboardData.hasAgencies === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-8">
        <Card className="max-w-7xl mx-auto p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma Agência Vinculada</h2>
          <p className="text-muted-foreground mb-6">
            Você precisa estar vinculado a uma agência para ver os eventos e enviar postagens.
          </p>
          <Button onClick={() => navigate("/")}>Voltar para Home</Button>
        </Card>
      </div>
    );
  }

  // Se ainda não carregou dados, não renderizar (aguardar loading)
  if (!dashboardData || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-card/80 backdrop-blur-lg border-primary/20 shadow-xl overflow-hidden">
            <div className="relative p-4 sm:p-6 md:p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full overflow-hidden">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 ring-4 ring-primary/20 shadow-lg flex-shrink-0">
                    <AvatarImage src={avatarPreview || undefined} alt={profile.full_name} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10">
                      {profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                   </Avatar>
                   <div className="space-y-2 min-w-0 flex-1">
                     <div className="flex items-center gap-2 flex-wrap">
                       <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                         Olá, {profile.full_name || "Usuário"}!
                       </h1>
                       {isMasterAdmin && (
                         <Badge variant="default" className="bg-purple-500">
                           Master Admin
                         </Badge>
                       )}
                       {isAgencyAdmin && !isMasterAdmin && (
                         <Badge variant="default" className="bg-blue-500">
                           Agency Admin
                         </Badge>
                       )}
                     </div>
                     <p className="text-muted-foreground text-sm sm:text-base break-all">{profile.email}</p>
                     {profile.instagram && (
                       <p className="text-xs sm:text-sm text-muted-foreground">📱 @{profile.instagram}</p>
                     )}
                     {/* ✅ B2: Seletor de Agência (apenas se tiver mais de uma) */}
                     {userAgenciesData && userAgenciesData.length > 1 && (
                        <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                          <SelectTrigger className="w-full sm:w-[280px] bg-background/50">
                            <SelectValue placeholder="Selecione a agência" />
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
                   </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-3">
                   <ThemeToggle />
                   <NotificationBell userId={user!.id} />

                   <Button
                     onClick={() => navigate("/submit")}
                     className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                   >
                     Enviar Nova Postagem
                   </Button>

                   {/* ✅ ITEM 7: Botão para Guest Dashboard */}
                   {isGuest && guestData && (
                     <Button 
                       onClick={() => navigate("/guest-dashboard")} 
                       variant="outline"
                       className="gap-2"
                     >
                       <Users className="h-4 w-4" />
                       Painel Convidado
                     </Button>
                   )}

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

        {/* Stats Cards e Event Progress */}
        <DashboardStats
          approvedCount={filteredSubmissions.filter(s => s.status === 'approved').length}
          totalSubmissions={filteredSubmissions.length}
          activeEventsCount={filteredEventStats.length}
          lastSubmissionDate={lastSubmission?.submitted_at || null}
          eventStats={filteredEventStats}
        />

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
                {filteredEventStats.length > 0 ? (
                  filteredEventStats.map((stat) => {
                    // ✅ Verificar se evento é de análise manual (sem metas definidas)
                    const isManualReview = (!stat.totalRequired || stat.totalRequired === 0);
                    
                    return (
                      <div key={stat.eventId} className="space-y-3">
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{stat.eventTitle}</h3>
                                {isManualReview && (
                                  <Badge variant="outline" className="border-purple-500 text-purple-700 dark:text-purple-400 text-xs">
                                    <ClipboardCheck className="w-3 h-3 mr-1" />
                                    Análise Manual
                                  </Badge>
                                )}
                              </div>
                              {!isManualReview ? (
                                <p className="text-sm text-muted-foreground">
                                  {stat.submitted} de {stat.isApproximate ? "~" : ""}
                                  {stat.totalRequired} posts aprovados
                                </p>
                              ) : (
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                  Este evento não possui metas automáticas
                                </p>
                              )}
                            </div>
                            {!isManualReview && (
                              <Badge variant={stat.percentage >= 100 ? "default" : "secondary"} className="text-lg px-4 py-2">
                                {stat.percentage.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          {!isManualReview && (
                            <Progress value={stat.percentage} className="h-3" />
                          )}
                        </div>
                      
                      {/* Goal Progress Badge */}
                      {user && !isManualReview && (
                        <GoalProgressBadge 
                          eventId={stat.eventId} 
                          userId={user.id}
                          variant="detailed"
                        />
                      )}
                    </div>
                  );
                })
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum evento ativo no momento</p>
                )}
                {filteredEventStats.length === 0 && eventStats.length > 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sem eventos nesta agência</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <DashboardSubmissionHistory
              submissions={filteredSubmissionsByEvent}
              events={filteredEvents}
              selectedEvent={selectedHistoryEvent}
              onEventChange={setSelectedHistoryEvent}
              onDeleteSubmission={setSubmissionToDelete}
              SubmissionImageDisplay={SubmissionImageDisplay}
            />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="cadastro" className="space-y-6">
            <DashboardProfile
              profile={profile}
              avatarPreview={avatarPreview}
              avatarFile={avatarFile}
              uploading={uploading}
              uploadProgress={uploadProgress}
              instagram={instagram}
              selectedGender={selectedGender}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              isAgencyAdmin={isAgencyAdmin}
              user={user}
              onAvatarChange={handleAvatarChange}
              onSaveAvatar={saveAvatar}
              onInstagramChange={setInstagram}
              onSaveInstagram={async () => {
                if (!user) return;
                try {
                  const { error } = await sb
                    .from('profiles')
                    .update({ instagram })
                    .eq('id', user.id);
                  
                  if (error) throw error;
                  
                  toast({
                    title: 'Instagram atualizado!',
                    description: 'Seu Instagram foi salvo com sucesso.',
                  });
                  
                  refetch();
                } catch (error: any) {
                  toast({
                    title: 'Erro ao salvar',
                    description: error.message,
                    variant: 'destructive',
                  });
                }
              }}
              onGenderChange={setSelectedGender}
              onSaveGender={saveGender}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onChangePassword={changePassword}
              onFollowersRangeChange={async (value) => {
                await updateProfileMutation.mutateAsync({ followers_range: value });
              }}
              onFullNameChange={async (newName) => {
                await updateProfileMutation.mutateAsync({ full_name: newName });
              }}
            />
            
            {/* Push Notifications Settings */}
            <PushNotificationSettings />
            
            {/* Notification Preferences */}
            <NotificationPreferences />
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
              onClick={() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`, "_blank")}
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

        {/* 🆕 AlertDialog de Confirmação para Exclusão */}
        <AlertDialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta submissão pendente? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (submissionToDelete) {
                    handleDeleteSubmission(submissionToDelete.id, submissionToDelete.status);
                    setSubmissionToDelete(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Dashboard;
