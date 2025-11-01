import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Award, Calendar, LogOut, MessageCircle, Building2, ChevronDown, Camera, User, Lock, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUserRoleQuery } from "@/hooks/useUserRoleQuery";
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
import { useUserAgencies, useAdminSettings, useEvents } from "@/hooks/useReactQuery";
import { useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';

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

interface EventStats {
  eventTitle: string;
  eventId: string;
  totalRequired: number;
  submitted: number;
  percentage: number;
  isApproximate: boolean;
}

const Dashboard = () => {
  const { user, signOut } = useAuthStore();
  const { isAgencyAdmin, isMasterAdmin } = useUserRoleQuery();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string;
    email: string;
    instagram: string;
    agency_id?: string;
    phone?: string;
    gender?: string;
    avatar_url?: string;
  } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [agencyName, setAgencyName] = useState<string>("");
  const [agencyPlan, setAgencyPlan] = useState<string>("");
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [userAgencies, setUserAgencies] = useState<any[]>([]);
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [badgesEnabled, setBadgesEnabled] = useState(true);

  // React Query hooks com cache
  const { data: userAgenciesData, isLoading: isLoadingAgencies } = useUserAgencies(user?.id);
  const { data: adminSettingsData, isLoading: isLoadingSettings } = useAdminSettings([
    'ai_insights_enabled',
    'badges_enabled',
    'whatsapp_number'
  ]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // ✅ Forçar refetch de roles ao carregar Dashboard
    console.log('🔄 [Dashboard] Invalidando cache de userRoles');
    queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    
    // Processar dados das agencies do cache
    if (userAgenciesData && !isLoadingAgencies) {
      setUserAgencies(userAgenciesData);
      
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
    
    // Processar settings do cache
    if (adminSettingsData && !isLoadingSettings) {
      setAiInsightsEnabled(adminSettingsData.ai_insights_enabled === 'true');
      setBadgesEnabled(adminSettingsData.badges_enabled === 'true');
      setWhatsappNumber(adminSettingsData.whatsapp_number || '');
    }
  }, [user, navigate, userAgenciesData, adminSettingsData, isLoadingAgencies, isLoadingSettings, searchParams]);

  // Hook para eventos com cache
  const { data: eventsData, isLoading: isLoadingEvents } = useEvents(currentAgencyId || undefined, true);

  useEffect(() => {
    if (eventsData) {
      setEvents(eventsData);
    }
  }, [eventsData]);

  useEffect(() => {
    if (currentAgencyId && user) {
      loadSubmissionsData();
    }
  }, [currentAgencyId, user]);

  const loadSubmissionsData = async () => {
    if (!user || !currentAgencyId) return;

    setLoading(true);

    // Carregar perfil
    const { data: profileData } = await sb
      .from("profiles")
      .select("full_name, email, instagram, phone, gender, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      setSelectedGender(profileData.gender || "");
      setAvatarPreview(profileData.avatar_url || null);
    }

    // Atualizar last_accessed_at
    await sb
      .from("user_agencies")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("agency_id", currentAgencyId);

    // Carregar submissões - Incluir vendas (LEFT JOIN em posts)
    const { data: submissionsData } = await sb
      .from("submissions")
      .select(
        `
        id,
        submitted_at,
        screenshot_url,
        screenshot_path,
        status,
        rejection_reason,
        submission_type,
        posts (
          post_number,
          deadline,
          event_id,
          agency_id,
          events (
            title,
            required_posts,
            id,
            is_active,
            agency_id
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    // Filtrar manualmente submissões da agência correta
    const filteredSubmissions = (submissionsData || []).filter((sub: any) => {
      // Se tem post, verificar agência do evento
      if (sub.posts?.events) {
        return sub.posts.events.is_active && sub.posts.events.agency_id === currentAgencyId;
      }
      // Se não tem post (venda), verificar pela agency_id do post virtual
      if (sub.posts?.agency_id) {
        return sub.posts.agency_id === currentAgencyId;
      }
      return false;
    });

    setSubmissions(filteredSubmissions);

    // Calcular estatísticas por evento - posts aprovados / total de posts do evento
    if (submissionsData) {
      const eventMap = new Map<string, { title: string; totalPosts: number; approvedCount: number; isApproximate: boolean }>();

      // Primeiro, coletar todos os eventos únicos das submissões
      const uniqueEventIds = new Set<string>();
      submissionsData.forEach((sub) => {
        if (sub.posts?.events) {
          const eventId = (sub.posts.events as any).id;
          uniqueEventIds.add(eventId);
        }
      });

      // Para cada evento, buscar o total obrigatório de posts
      for (const eventId of Array.from(uniqueEventIds)) {
        const eventData = submissionsData.find((sub) => sub.posts?.events && (sub.posts.events as any).id === eventId)
          ?.posts?.events;

        if (eventData) {
          // Buscar dados completos do evento incluindo total_required_posts
          const { data: fullEventData } = await sb
            .from("events")
            .select("total_required_posts, is_approximate_total")
            .eq("id", eventId)
            .single();

          const totalRequiredPosts = fullEventData?.total_required_posts || 0;
          const isApproximate = fullEventData?.is_approximate_total || false;

          // Contar posts aprovados do usuário neste evento
          const approvedCount = submissionsData.filter(
            (sub) => sub.status === "approved" && sub.posts?.events && (sub.posts.events as any).id === eventId,
          ).length;

          eventMap.set(eventId, {
            title: eventData.title,
            totalPosts: totalRequiredPosts,
            approvedCount: approvedCount,
            isApproximate: isApproximate,
          });
        }
      }

      const stats: EventStats[] = Array.from(eventMap.entries()).map(([eventId, data]) => ({
        eventId,
        eventTitle: data.title,
        totalRequired: data.totalPosts,
        submitted: data.approvedCount,
        percentage: data.totalPosts > 0 ? (data.approvedCount / data.totalPosts) * 100 : 0,
        isApproximate: data.isApproximate,
      }));

      setEventStats(stats);
    }

    setLoading(false);
  };

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
      
      // Atualizar perfil
      const { error: updateError } = await sb
        .from('profiles')
        .update({ avatar_url: signedData.signedUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setUploadProgress(100);
      setAvatarPreview(signedData.signedUrl);
      
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi salva com sucesso.",
      });
      
      setAvatarFile(null);
      await loadSubmissionsData();
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
    
    try {
      const { error } = await sb
        .from('profiles')
        .update({ gender: selectedGender })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Gênero atualizado!",
        description: "Suas informações foram salvas.",
      });
    } catch (error) {
      console.error('Erro ao salvar gênero:', error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive",
      });
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background py-8 px-4">
      <Suspense fallback={<div className="text-center">Carregando...</div>}>
        <TutorialGuide />
      </Suspense>

      {/* Card 1: Informações Pessoais */}
      <Card className="max-w-7xl mx-auto mb-6 p-6 bg-gradient-primary text-white">
        <div>
          <h2 className="text-2xl font-bold mb-2">{profile?.full_name || "Usuário"}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
            <span className="flex items-center gap-2">📧 {profile?.email}</span>
            {profile?.instagram && (
              <>
                <span>•</span>
                <span className="flex items-center gap-2">📷 Instagram: {profile.instagram}</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Card 2: Seletor de Agência (NOVO CARD SEPARADO) */}
      {userAgencies.length > 0 && (
        <Card className="max-w-7xl mx-auto mb-6 p-6 bg-white dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Agência Atual</p>
                <p className="text-lg font-bold text-primary">{agencyName}</p>
              </div>
            </div>

            {userAgencies.length > 1 && (
              <Select
                value={currentAgencyId || ""}
                onValueChange={(newAgencyId) => {
                  setSearchParams({ agency: newAgencyId });
                  window.location.reload();
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px] border-2">
                  <SelectValue placeholder="Trocar de agência" />
                </SelectTrigger>
                <SelectContent>
                  {userAgencies.map((agency: any) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {agency.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {agencyPlan && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                Plano: {agencyPlan.toUpperCase()}
              </Badge>
            )}
          </div>
        </Card>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {user && <NotificationBell userId={user.id} />}
            <ThemeToggle />
            {/* 🔄 Botão de debug temporário para limpar cache */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('🔄 Limpando cache manualmente');
                queryClient.invalidateQueries({ queryKey: ['userRoles'] });
                window.location.reload();
              }}
              className="border-dashed"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Roles
            </Button>
            {isMasterAdmin && (
              <Link to="/master-admin">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">🎯 Painel Master</Button>
              </Link>
            )}
            {isAgencyAdmin && (
              <Link to="/admin">
                <Button className="bg-gradient-secondary">🏢 Painel Agência</Button>
              </Link>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Perfil do Usuário */}
        <Card id="welcome-card" className="p-4 md:p-6 mb-8 border-2">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-primary/10 text-xl font-semibold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent break-words">
                  Olá, {profile?.full_name || "Usuário"}!
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mb-2 break-words">{profile?.email}</p>
                <p className="text-sm text-muted-foreground break-words">Instagram: {profile?.instagram}</p>
              </div>
            </div>
            <Link
              to={`/submit${currentAgencyId ? `?agency=${currentAgencyId}` : ""}`}
              className="w-full sm:w-auto"
              id="submit-button"
            >
              <Button className="bg-gradient-primary w-full sm:w-auto whitespace-nowrap">Enviar Nova Postagem</Button>
            </Link>
          </div>
        </Card>

        {/* Badges */}
        {badgesEnabled && (
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
            <BadgeDisplay />
          </Suspense>
        )}

        {/* Barra de progresso para próximo badge */}
        {badgesEnabled &&
          user &&
          (() => {
            const approvedCount = submissions.filter((s) => s.status === "approved").length;
            const milestones = [
              { count: 5, name: "Bronze", emoji: "🥉" },
              { count: 10, name: "Prata", emoji: "🥈" },
              { count: 25, name: "Ouro", emoji: "🥇" },
              { count: 50, name: "Diamante", emoji: "💎" },
              { count: 100, name: "Lenda", emoji: "🏆" },
            ];

            const next = milestones.find((m) => approvedCount < m.count);

            if (next) {
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-4 bg-gradient-secondary text-white mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        Próximo Badge: {next.emoji} {next.name}
                      </span>
                      <span className="text-sm">
                        {approvedCount}/{next.count}
                      </span>
                    </div>
                    <Progress value={(approvedCount / next.count) * 100} className="h-2" />
                  </Card>
                </motion.div>
              );
            }
            return null;
          })()}

        {/* AI Insights */}
        {aiInsightsEnabled && user && eventStats.length > 0 && (
          <div className="mt-6">
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
              <AIInsights eventId={eventStats[0].eventId} userId={user.id} />
            </Suspense>
          </div>
        )}

        {/* Estatísticas Gerais */}
        <div id="stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 mt-8">
          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Posts Aprovados</p>
                <p className="text-3xl font-bold">{submissions.filter((s) => s.status === "approved").length}</p>
                {submissions.filter((s) => s.status === "pending").length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {submissions.filter((s) => s.status === "pending").length} pendente(s) de aprovação
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                <p className="text-3xl font-bold">{eventStats.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Último Envio</p>
                <p className="text-lg font-bold">
                  {submissions.length > 0
                    ? new Date(submissions[0].submitted_at).toLocaleDateString("pt-BR")
                    : "Nenhum"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="cadastro" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cadastro
            </TabsTrigger>
          </TabsList>

          {/* Aba de Estatísticas */}
          <TabsContent value="stats" className="space-y-6">
            <h2 className="text-2xl font-bold">Progresso por Evento</h2>

            {eventStats.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Você ainda não enviou nenhuma postagem</p>
                <Link to="/submit">
                  <Button className="bg-gradient-primary">Enviar Primeira Postagem</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-6">
                {eventStats.map((stat) => (
                  <Card key={stat.eventId} className="p-6 border-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">{stat.eventTitle}</h3>
                        <Badge variant={stat.percentage >= 100 ? "default" : "secondary"} className="text-lg px-3 py-1">
                          {stat.submitted}/{stat.totalRequired}{stat.isApproximate && " (aproximado)"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.min(stat.percentage, 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(stat.percentage, 100)} className="h-3" />
                      </div>

                      {stat.percentage >= 100 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                          <Award className="w-5 h-5 text-green-500" />
                          <span className="text-green-500 font-medium">Meta atingida! Cortesia garantida 🎉</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba de Histórico */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Histórico de Postagens</h2>
              <Select value={selectedHistoryEvent} onValueChange={setSelectedHistoryEvent}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {submissions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhuma postagem enviada ainda</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {submissions
                    .filter((submission) => {
                      if (selectedHistoryEvent === "all") return true;
                      return submission.posts?.event_id === selectedHistoryEvent;
                    })
                    .map((submission, index) => (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden hover:shadow-glow transition-all">
                          <Suspense fallback={<Skeleton className="w-full h-48" />}>
                            <SubmissionImageDisplay
                              screenshotPath={submission.screenshot_path}
                              screenshotUrl={submission.screenshot_url}
                              alt="Screenshot da submissão"
                              className="w-full h-48 object-cover"
                            />
                          </Suspense>

                          <div className="p-4 space-y-2">
                            <h3 className="font-bold">{submission.posts?.events?.title || "Evento"}</h3>
                            {submission.submission_type === "sale" ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500">
                                💰 Comprovante de Venda
                              </Badge>
                            ) : (
                              <p className="text-sm text-muted-foreground">Post #{submission.posts?.post_number}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Enviado em {new Date(submission.submitted_at).toLocaleDateString("pt-BR")} às{" "}
                              {new Date(submission.submitted_at).toLocaleTimeString("pt-BR")}
                            </p>
                            {submission.status === "pending" && (
                              <Badge
                                variant="outline"
                                className="w-full justify-center bg-yellow-500/20 text-yellow-500 border-yellow-500"
                              >
                                Aguardando Aprovação
                              </Badge>
                            )}
                            {submission.status === "approved" && (
                              <Badge
                                variant="outline"
                                className="w-full justify-center bg-green-500/20 text-green-500 border-green-500"
                              >
                                Aprovado
                              </Badge>
                            )}
                            {submission.status === "rejected" && (
                              <div className="space-y-2">
                                <Badge
                                  variant="outline"
                                  className="w-full justify-center bg-red-500/20 text-red-500 border-red-500"
                                >
                                  Rejeitado
                                </Badge>
                                {submission.rejection_reason && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-500">
                                    <strong>Motivo:</strong> {submission.rejection_reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Aba de Cadastro */}
          <TabsContent value="cadastro" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6">Meu Cadastro</h3>
              
              {/* Avatar Upload */}
              <div className="mb-8">
                <Label className="text-base font-semibold mb-4 block">Foto de Perfil</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-primary/10 text-2xl">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      className="mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG ou WEBP. Máximo 2MB.
                    </p>
                    {avatarFile && (
                      <Button onClick={saveAvatar} size="sm" className="mt-2">
                        <Camera className="h-4 w-4 mr-2" />
                        Salvar Foto
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Dados Somente Leitura */}
              <div className="grid gap-4 mb-6">
                <div>
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input value={profile?.instagram || ''} disabled className="bg-muted" />
                </div>
                {profile?.phone && (
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={profile.phone} disabled className="bg-muted" />
                  </div>
                )}
              </div>
              
              {/* Gênero Editável */}
              <div className="mb-6">
                <Label>Gênero</Label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={saveGender} size="sm" className="mt-2">
                  Salvar Gênero
                </Button>
              </div>
              
              {/* Trocar Senha */}
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Alterar Senha
                </Label>
                <div className="grid gap-4 max-w-md">
                  <div>
                    <Label>Nova Senha</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <Label>Confirmar Senha</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite novamente"
                    />
                  </div>
                  <Button onClick={changePassword} disabled={!newPassword || !confirmPassword}>
                    Alterar Senha
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Botão flutuante do WhatsApp */}
      {whatsappNumber && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14 bg-green-500 hover:bg-green-600" asChild>
            <a
              href={`https://wa.me/55${whatsappNumber.replace(/\D/g, "")}?text=Olá, tenho uma dúvida sobre os eventos`}
              target="_blank"
              rel="noopener noreferrer"
              title="Falar com o Admin no WhatsApp"
            >
              <MessageCircle className="h-6 w-6" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
