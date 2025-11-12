import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { formatPostName } from "@/lib/postNameFormatter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ✅ Sprint 3A: Importar componentes refatorados
import { AdminFilters } from "./Admin/AdminFilters";
import { AdminSubmissionList } from "./Admin/AdminSubmissionList";
import { AdminEventList } from "./Admin/AdminEventList";
import { useAdminFilters } from "./Admin/useAdminFilters";
import { SubmissionCardsGrid } from "@/components/SubmissionCardsGrid";

// ✅ Sprint 2B: Importar hooks consolidados
import {
  useEventsQuery,
  useSubmissionsQuery,
  useUpdateSubmissionStatusMutation,
  useBulkUpdateSubmissionStatusMutation, // 🔴 FASE 1: Import bulk mutation
  useDeleteEventMutation,
  useDeleteSubmissionMutation,
} from "@/hooks/consolidated";

// 🆕 SPRINT 2 + CACHE: Importar hook de contadores com cache
import { 
  useSubmissionCountsByEvent, 
  useSubmissionCountsByPost 
} from "@/hooks/useSubmissionCounters";
import {
  Calendar,
  Users,
  Trophy,
  Plus,
  Send,
  Pencil,
  Check,
  X,
  CheckCheck,
  Trash2,
  Copy,
  Columns3,
  Building2,
  ArrowLeft,
  Download,
  User,
  Clock,
  XCircle,
  MessageSquare,
  Lightbulb,
  CreditCard, // ✅ ITEM 1
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUserRoleQuery } from "@/hooks/useUserRoleQuery";
import { useNavigate, Link } from "react-router-dom";

// Lazy loading de componentes pesados
const EventDialog = lazy(() => import("@/components/EventDialog").then((m) => ({ default: m.EventDialog })));
const PostDialog = lazy(() => import("@/components/PostDialog").then((m) => ({ default: m.PostDialog })));
const AddManualSubmissionDialog = lazy(() =>
  import("@/components/AddManualSubmissionDialog").then((m) => ({ default: m.AddManualSubmissionDialog })),
);
const AgencyAdminSettings = lazy(() =>
  import("@/components/AgencyAdminSettings").then((m) => ({ default: m.AgencyAdminSettings })),
);
const AdminTutorialGuide = lazy(() => import("@/components/AdminTutorialGuide"));
const SubmissionKanban = lazy(() =>
  import("@/components/SubmissionKanban").then((m) => ({ default: m.SubmissionKanban })),
);
const SubmissionAuditLog = lazy(() =>
  import("@/components/SubmissionAuditLog").then((m) => ({ default: m.SubmissionAuditLog })),
);
const SubmissionComments = lazy(() =>
  import("@/components/SubmissionComments").then((m) => ({ default: m.SubmissionComments })),
);
const SubmissionImageDisplay = lazy(() =>
  import("@/components/SubmissionImageDisplay").then((m) => ({ default: m.SubmissionImageDisplay })),
);
const GuestManager = lazy(() => import("@/components/GuestManager").then((m) => ({ default: m.GuestManager })));
const GuestAuditLog = lazy(() => import("@/components/GuestAuditLog").then((m) => ({ default: m.GuestAuditLog })));
const SuggestionDialog = lazy(() =>
  import("@/components/SuggestionDialog").then((m) => ({ default: m.SuggestionDialog })),
); // ✅ ITEM 5 FASE 2

// FASE 2: Componentes memoizados para performance
const MemoizedDashboardStats = lazy(() =>
  import("@/components/memoized/MemoizedDashboardStats").then((m) => ({ default: m.MemoizedDashboardStats })),
);
const MemoizedUserManagement = lazy(() =>
  import("@/components/memoized/MemoizedUserManagement").then((m) => ({ default: m.MemoizedUserManagement })),
);
const MemoizedAdminSettings = lazy(() =>
  import("@/components/memoized/MemoizedAdminSettings").then((m) => ({ default: m.MemoizedAdminSettings })),
);
const MemoizedUserPerformance = lazy(() =>
  import("@/components/memoized/MemoizedUserPerformance").then((m) => ({ default: m.MemoizedUserPerformance })),
);

import { SubmissionZoomDialog } from "@/components/SubmissionZoomDialog";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const Admin = () => {
  const { user, loading, signOut } = useAuthStore();
  const { isAgencyAdmin, isMasterAdmin } = useUserRoleQuery();
  const navigate = useNavigate();
  const [currentAgency, setCurrentAgency] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [agencySlug, setAgencySlug] = useState<string>("");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false); // ✅ ITEM 5 FASE 2
  const [addSubmissionDialogOpen, setAddSubmissionDialogOpen] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<{ id: string; submissionsCount: number } | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedSubmissionForRejection, setSelectedSubmissionForRejection] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTemplate, setRejectionTemplate] = useState("");
  const [auditLogSubmissionId, setAuditLogSubmissionId] = useState<string | null>(null);
  const [rejectionTemplatesFromDB, setRejectionTemplatesFromDB] = useState<any[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [selectedImageForZoom, setSelectedImageForZoom] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [usersCount, setUsersCount] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomSubmissionIndex, setZoomSubmissionIndex] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ✅ SPRINT 1: Persistir índice de zoom entre filtros
  useEffect(() => {
    // Restaurar índice salvo ao montar componente
    const savedIndex = sessionStorage.getItem("adminZoomIndex");
    if (savedIndex && !isNaN(Number(savedIndex))) {
      setZoomSubmissionIndex(Number(savedIndex));
    }
  }, []);

  // ✅ SPRINT 1: Salvar índice quando diálogo abrir
  useEffect(() => {
    if (zoomDialogOpen) {
      sessionStorage.setItem("adminZoomIndex", zoomSubmissionIndex.toString());
      console.log("💾 [Zoom] Índice salvo:", zoomSubmissionIndex);
    }
  }, [zoomDialogOpen, zoomSubmissionIndex]);

  // ✅ Sprint 3A: Hook consolidado para filtros (substituindo ~12 useState)
  const {
    filters: {
      submissionEventFilter,
      submissionPostFilter,
      submissionStatusFilter,
      postTypeFilter,
      searchTerm,
      dateFilterStart,
      dateFilterEnd,
      currentPage,
      itemsPerPage,
      kanbanView,
      cardsGridView,
      eventActiveFilter,
      postEventFilter,
      postEventActiveFilter,
      eventSortOrder,
    },
    setSubmissionEventFilter,
    setSubmissionPostFilter,
    setSubmissionStatusFilter,
    setPostTypeFilter,
    setSearchTerm,
    setDateFilterStart,
    setDateFilterEnd,
    setCurrentPage,
    setItemsPerPage,
    setKanbanView,
    setCardsGridView,
    setEventActiveFilter,
    setPostEventFilter,
    setPostEventActiveFilter,
    setEventSortOrder,
    clearFilters, // ✅ ITEM 3 FASE 1: Adicionar clearFilters
  } = useAdminFilters();

  // ✅ Sprint 2B: Usar hooks consolidados ao invés de states locais + chamadas diretas
  const {
    data: eventsData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEventsQuery({
    agencyId: currentAgency?.id,
    includePosts: true,
    enabled: !!user && (isAgencyAdmin || isMasterAdmin),
  });

  // Debug: Verificar eventos carregados (incluindo inativos)
  const events = eventsData?.events || [];
  console.log("🔍 [Admin Debug] Total de eventos carregados:", events.length);
  console.log(
    "🔍 [Admin Debug] Eventos:",
    events.map((e) => ({
      title: e.title,
      active: e.is_active,
      id: e.id,
    })),
  );

  // 🆕 SPRINT 2 + CACHE: Buscar contadores com React Query (cache de 5 minutos)
  const { 
    data: submissionsByEvent = {}, 
    isLoading: loadingEventCounters 
  } = useSubmissionCountsByEvent(
    currentAgency?.id, 
    !!user && (isAgencyAdmin || isMasterAdmin)
  );

  const { 
    data: submissionsByPost = {}, 
    isLoading: loadingPostCounters 
  } = useSubmissionCountsByPost(
    currentAgency?.id, 
    !!user && (isAgencyAdmin || isMasterAdmin)
  );

  const loadingCounters = loadingEventCounters || loadingPostCounters;

  console.log("📊 [Admin] Contadores carregados do cache:", { 
    submissionsByEvent, 
    submissionsByPost,
    loadingCounters 
  });

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useSubmissionsQuery({
    agencyId: currentAgency?.id,
    eventId: submissionEventFilter !== "all" ? submissionEventFilter : undefined,
    status: submissionStatusFilter !== "all" ? submissionStatusFilter : undefined, // 🆕 CORREÇÃO 1: Filtro de status no backend
    postType: postTypeFilter !== "all" ? postTypeFilter : undefined, // 🆕 CORREÇÃO 1: Filtro de tipo de post no backend
    searchTerm: searchTerm || undefined, // 🆕 CORREÇÃO 1: Busca textual no backend
    enrichProfiles: true,
    itemsPerPage: 50, // 🔴 ITEM 2: Reduzido de 10000 para 50 (performance crítica)
    page: currentPage, // 🔴 ITEM 2: Usar currentPage para paginação real
    enabled: !!user && (isAgencyAdmin || isMasterAdmin) && !!currentAgency,
  });

  // ✅ Sprint 2B: Usar mutations consolidadas
  const updateStatusMutation = useUpdateSubmissionStatusMutation();
  const bulkUpdateStatusMutation = useBulkUpdateSubmissionStatusMutation(); // 🔴 FASE 1: Bulk mutation
  const deleteEventMutation = useDeleteEventMutation();
  const deleteSubmissionMutation = useDeleteSubmissionMutation();

  // Extrair posts e submissions dos dados do hook
  const posts = eventsData?.posts || [];
  const submissions = submissionsData?.data || [];
  const loadingEvents = eventsLoading;
  const loadingSubmissions = submissionsLoading;

  // 🆕 CORREÇÃO 3: Logs de debug expandidos
  console.log("🔍 [Admin Debug] Total de submissões carregadas:", submissions.length);
  console.log("🔍 [Admin Debug] Total count do backend:", submissionsData?.count);
  console.log("🔍 [Admin Debug] Filtros enviados ao backend:", {
    agencyId: currentAgency?.id,
    eventId: submissionEventFilter !== "all" ? submissionEventFilter : undefined,
    status: submissionStatusFilter !== "all" ? submissionStatusFilter : undefined,
    postType: postTypeFilter !== "all" ? postTypeFilter : undefined,
    searchTerm: searchTerm || undefined,
  });
  console.log("🔍 [Admin Debug] Agência atual:", currentAgency?.name);
  console.log("🔍 [Admin Debug] Página atual:", currentPage);

  // Trial state management
  const [trialInfo, setTrialInfo] = useState<{
    inTrial: boolean;
    expired: boolean;
    daysRemaining: number;
  } | null>(null);

  // Compute read-only mode based on trial expiration
  const isReadOnly = trialInfo?.expired || false;

  // ✅ FASE 2: Map memoizado para lookups O(1) de eventos
  const eventsById = useMemo(() => {
    const map = new Map();
    events.forEach((event) => map.set(event.id, event));
    return map;
  }, [events]);

  // ✅ ITEM 10: Helper memoizado com useCallback para evitar re-renders
  const getEventTitle = useCallback(
    (post: any): string => {
      // Método 1: Tentar pelo objeto events
      if (post.events?.title) return post.events.title;
      if (Array.isArray(post.events) && post.events[0]?.title) return post.events[0].title;

      // Método 2: Lookup O(1) usando Map
      if (post.event_id) {
        const foundEvent = eventsById.get(post.event_id);
        if (foundEvent) return foundEvent.title;
      }

      return "Evento não encontrado";
    },
    [eventsById],
  );

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ FASE 1: Consolidação de useEffects para evitar múltiplas chamadas
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const agencySlug = urlParams.get("agency");
    const agencyId = urlParams.get("agencyId");

    const initializeData = async () => {
      if (!user || (!isAgencyAdmin && !isMasterAdmin)) return;

      console.log("🚀 [Admin] Inicializando dados...");

      // 1. Carregar agência se houver slug/id na URL
      if (agencyId && isMasterAdmin) {
        await loadAgencyById(agencyId);
      } else if (agencySlug && (isAgencyAdmin || isMasterAdmin)) {
        await loadAgencyBySlug(agencySlug);
      } else {
        await loadCurrentAgency();
      }

      // 2. Carregar dados complementares
      loadRejectionTemplates();
      loadUsersCount();
    };

    initializeData();
  }, [user, isAgencyAdmin, isMasterAdmin]);

  // Recarregar eventos quando currentAgency estiver disponível
  useEffect(() => {
    if (currentAgency) {
      console.log("✅ [Admin] currentAgency carregado, recarregando eventos...", currentAgency.name);
      refetchEvents();
      loadUsersCount();

      // Check trial status
      if (currentAgency.subscription_status === "trial") {
        const now = new Date();
        const startDate = currentAgency.trial_start_date ? new Date(currentAgency.trial_start_date) : null;
        const endDate = currentAgency.trial_end_date ? new Date(currentAgency.trial_end_date) : null;

        if (endDate) {
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          setTrialInfo({
            inTrial: daysRemaining > 0,
            expired: daysRemaining <= 0,
            daysRemaining: Math.max(0, daysRemaining),
          });
        }
      } else {
        setTrialInfo(null);
      }
    }
  }, [currentAgency]);

  // ✅ CORREÇÃO 5: Adicionar Realtime listener para atualizar logo automaticamente
  useEffect(() => {
    if (!currentAgency?.id) return;

    const channel = sb
      .channel("agency-logo-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agencies",
          filter: `id=eq.${currentAgency.id}`,
        },
        (payload: any) => {
          console.log("🔄 [Realtime] Agência atualizada:", payload.new);
          if (payload.new.logo_url !== currentAgency.logo_url) {
            console.log("🖼️ [Realtime] Logo atualizado:", payload.new.logo_url);
            setCurrentAgency((prev: any) => ({ ...prev, logo_url: payload.new.logo_url }));
            toast.success("Logo atualizado!");
          }
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [currentAgency?.id]);

  // Carregar submissions apenas quando filtro ou agência mudarem
  useEffect(() => {
    if (user && (isAgencyAdmin || isMasterAdmin) && currentAgency) {
      console.log("🔄 [Admin] Recarregando submissões...", {
        currentAgency: currentAgency.name,
        submissionEventFilter,
      });
      refetchSubmissions();
    }
  }, [submissionEventFilter, currentAgency?.id]);

  const loadAgencyById = async (id: string) => {
    const { data } = await sb
      .from("agencies")
      .select("id, name, slug, logo_url, subscription_plan, subscription_status, trial_start_date, trial_end_date")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      setCurrentAgency(data);
      console.log("🏢 Master Admin visualizando agência:", data.name);
    }
  };

  const loadCurrentAgency = async () => {
    if (!user) return;

    console.log("🔍 [loadCurrentAgency] Iniciando...");

    // Load user profile
    const { data: profileData, error: profileError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Erro ao carregar profile:", profileError);
      return;
    }

    console.log("✅ Profile carregado:", {
      id: profileData?.id,
      email: profileData?.email,
      agency_id: profileData?.agency_id,
    });

    setProfile(profileData);

    // If master admin and viewing specific agency, use query param
    const urlParams = new URLSearchParams(window.location.search);
    const agencySlug = urlParams.get("agency");
    const agencyId = urlParams.get("agencyId");

    if (agencySlug) {
      const { data, error } = await sb
        .from("agencies")
        .select("id, name, slug, logo_url, subscription_plan, subscription_status, trial_start_date, trial_end_date")
        .eq("slug", agencySlug)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao carregar agência por slug:", error);
        return;
      }

      console.log("🏢 Loaded agency from URL (slug):", data);
      setCurrentAgency(data);
      setAgencySlug(data?.slug || "");
      return;
    }

    if (agencyId && isMasterAdmin) {
      const { data, error } = await sb
        .from("agencies")
        .select("id, name, slug, logo_url, subscription_plan, subscription_status, trial_start_date, trial_end_date")
        .eq("id", agencyId)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao carregar agência por ID:", error);
        return;
      }

      console.log("🏢 Loaded agency from URL (id):", data);
      setCurrentAgency(data);
      setAgencySlug(data?.slug || "");
      return;
    }

    // If agency admin, load their own agency
    if (isAgencyAdmin && !isMasterAdmin && profileData?.agency_id) {
      console.log("👤 Agency Admin detectado, carregando agência:", profileData.agency_id);

      const { data: agencyData, error: agencyError } = await sb
        .from("agencies")
        .select("id, name, slug, logo_url, subscription_plan, subscription_status, trial_start_date, trial_end_date")
        .eq("id", profileData.agency_id)
        .maybeSingle();

      if (agencyError) {
        console.error("❌ Erro ao carregar agência:", agencyError);
        toast.error("Erro ao carregar dados da agência");
        return;
      }

      if (!agencyData) {
        console.error("❌ Agência não encontrada para ID:", profileData.agency_id);
        toast.error("Agência não encontrada");
        return;
      }

      console.log("✅ Agência carregada:", agencyData);
      setCurrentAgency(agencyData);
      setAgencySlug(agencyData?.slug || "");
    } else if (isMasterAdmin && !agencySlug && !agencyId) {
      console.log("👑 Master Admin sem filtro de agência - visualizando todos os dados");
    }
  };

  const loadAgencyBySlug = async (slug: string) => {
    const { data } = await sb
      .from("agencies")
      .select("id, name, slug, logo_url, subscription_plan, subscription_status, trial_start_date, trial_end_date")
      .eq("slug", slug)
      .maybeSingle();

    setCurrentAgency(data);
  };

  const loadRejectionTemplates = async () => {
    const { data } = await sb.from("rejection_templates").select("*").order("title");
    setRejectionTemplatesFromDB(data || []);
  };

  const loadUsersCount = async () => {
    if (!user) return;

    let agencyIdFilter = null;

    const urlParams = new URLSearchParams(window.location.search);
    const queryAgencyId = urlParams.get("agencyId");

    if (queryAgencyId && isMasterAdmin) {
      agencyIdFilter = queryAgencyId;
    } else if (isMasterAdmin && !currentAgency) {
      agencyIdFilter = null;
    } else if (currentAgency) {
      agencyIdFilter = currentAgency.id;
    } else if (isAgencyAdmin) {
      const { data: profileData } = await sb.from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

      agencyIdFilter = profileData?.agency_id;
    }

    let countQuery = sb.from("profiles").select("*", { count: "exact", head: true });

    if (agencyIdFilter) {
      countQuery = countQuery.eq("agency_id", agencyIdFilter);
    }

    const { count } = await countQuery;
    setUsersCount(count || 0);
  };

  // ✅ ITEM 10: useCallback para evitar re-criação da função
  const copySlugUrl = useCallback(() => {
    const url = `${window.location.origin}/agencia/${agencySlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!", {
      description: "URL de cadastro copiada para a área de transferência",
    });
  }, [agencySlug]);

  const copyEventUrl = useCallback((agencySlug: string, eventSlug: string) => {
    const url = `${window.location.origin}/agencia/${agencySlug}/evento/${eventSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL do Evento Copiada!", {
      description: "A URL pública do evento foi copiada para a área de transferência.",
    });
  }, []);

  // ✅ Sprint 2B: Substituir handleApproveSubmission para usar mutation consolidada
  const handleApproveSubmission = async (submissionId: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        submissionId,
        status: "approved",
        userId: user?.id || "",
      });

      // Confetti ao aprovar
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      refetchSubmissions();
    } catch (error) {
      console.error("Exception:", error);
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    setSelectedSubmissionForRejection(submissionId);
    setRejectionReason("");
    setRejectionTemplate("");
    setRejectionDialogOpen(true);
  };

  // Linhas 436-481
  // ✅ Sprint 2B: Refatorar confirmRejection para usar mutation
  const confirmRejection = async () => {
    if (!selectedSubmissionForRejection) return;

    try {
      await updateStatusMutation.mutateAsync({
        submissionId: selectedSubmissionForRejection,
        status: "rejected",
        userId: user?.id || "",
        rejectionReason: rejectionReason || undefined,
      });

      // Recarregar dados antes de fechar
      refetchSubmissions();

      // Fechar diálogo após sucesso
      setRejectionDialogOpen(false);
      setSelectedSubmissionForRejection(null);
      setRejectionReason("");
      setRejectionTemplate("");
    } catch (error) {
      console.error("Exception:", error);
    }
  };

  // Funções de navegação do zoom
  const handleOpenZoom = (submissionId: string) => {
    const index = getFilteredSubmissions.findIndex((s) => s.id === submissionId);
    if (index !== -1) {
      setZoomSubmissionIndex(index);
      setZoomDialogOpen(true);
    }
  };

  const handleZoomNext = () => {
    if (zoomSubmissionIndex < getPaginatedSubmissions.length - 1) {
      setZoomSubmissionIndex((prev) => prev + 1);
    }
  };

  const handleZoomPrevious = () => {
    if (zoomSubmissionIndex > 0) {
      setZoomSubmissionIndex((prev) => prev - 1);
    }
  };

  const rejectionTemplates = [
    { value: "formato", label: "Imagem fora do padrão" },
    { value: "conteudo", label: "Post não relacionado ao evento" },
    { value: "prazo", label: "Prazo expirado" },
    { value: "qualidade", label: "Qualidade da imagem inadequada" },
    { value: "outro", label: "Outro (especificar abaixo)" },
  ];

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        submissionId,
        status: newStatus as "approved" | "rejected" | "pending",
        userId: user?.id || "",
      });

      refetchSubmissions();
    } catch (error) {
      console.error("Exception:", error);
    }
  };

  /**
   * 🔴 FASE 1: Aprovação em massa otimizada
   * ANTES: Usava Promise.all com múltiplas mutations individuais
   *        - 10 submissões = 10 queries SQL separadas
   *        - Lock contention no PostgreSQL
   *        - Erro 57014 (timeout) com 20+ submissões
   *        - Não invalidava cache corretamente
   *
   * DEPOIS: Usa bulk mutation com query única
   *        - 10 submissões = 1 query SQL (UPDATE ... WHERE id IN (...))
   *        - 20-30x mais rápido
   *        - Sem lock contention
   *        - Invalida cache apenas 1 vez
   *        - Toast com progresso
   *        - Limpa seleção após sucesso
   */
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedSubmissions);
    if (ids.length === 0) {
      toast.error("Selecione pelo menos uma submissão");
      return;
    }

    try {
      console.log(`🚀 [Bulk Approve] Iniciando aprovação em massa de ${ids.length} submissões...`);
      toast.loading(`Aprovando ${ids.length} submissões...`, { id: "bulk-approve" });

      // ✅ Usar bulk mutation ao invés de Promise.all
      await bulkUpdateStatusMutation.mutateAsync({
        submissionIds: ids,
        status: "approved",
        userId: user?.id || "",
      });

      toast.success(`${ids.length} submissões aprovadas com sucesso`, { id: "bulk-approve" });

      // ✅ Limpar seleção após sucesso
      setSelectedSubmissions(new Set());

      // ✅ Refetch acontece automaticamente via invalidateQueries na mutation
      console.log(`✅ [Bulk Approve] Concluído`);
    } catch (error) {
      console.error("❌ [Bulk Approve] Erro:", error);
      toast.error("Erro ao aprovar submissões em massa", { id: "bulk-approve" });
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    const newSet = new Set(selectedSubmissions);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else {
      newSet.add(submissionId);
    }
    setSelectedSubmissions(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === getPaginatedSubmissions.length && getPaginatedSubmissions.length > 0) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(getPaginatedSubmissions.map((s: any) => s.id)));
    }
  };

  // ✅ SPRINT 2: Backend já retorna dados filtrados e paginados
  // Mantemos apenas filtros client-side que são edge cases raros (postNumber, datas)
  // NOTA: Esses filtros client-side são aplicados AO LADO do backend, não em cima
  const getFilteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filtro por número de postagem específico (raro, usado principalmente em exports)
    if (submissionPostFilter !== "all") {
      filtered = filtered.filter((s: any) => s.posts?.post_number?.toString() === submissionPostFilter);
    }

    // Filtros de data (podem ser movidos para backend no futuro)
    if (dateFilterStart) {
      filtered = filtered.filter((s: any) => {
        const submitDate = new Date(s.submitted_at);
        const filterDate = new Date(dateFilterStart);
        return submitDate >= filterDate;
      });
    }

    if (dateFilterEnd) {
      filtered = filtered.filter((s: any) => {
        const submitDate = new Date(s.submitted_at);
        const filterDate = new Date(dateFilterEnd);
        return submitDate <= filterDate;
      });
    }

    return filtered;
  }, [submissions, submissionPostFilter, dateFilterStart, dateFilterEnd]);

  // ✅ SPRINT 2: Backend já retorna paginado, apenas usamos os dados filtrados
  const getPaginatedSubmissions = useMemo(() => {
    return getFilteredSubmissions;
  }, [getFilteredSubmissions]);

  // ✅ SPRINT 2: Usar count real do backend para totalPages
  const totalPages = Math.ceil((submissionsData?.count || 0) / itemsPerPage);

  // 🔴 GUARD: Validar índice do zoom quando array muda
  useEffect(() => {
    if (zoomDialogOpen) {
      // Se o índice atual está fora dos limites, fechar o diálogo
      if (zoomSubmissionIndex >= getPaginatedSubmissions.length || zoomSubmissionIndex < 0) {
        console.warn("⚠️ Zoom index out of bounds, closing dialog", {
          index: zoomSubmissionIndex,
          arrayLength: getPaginatedSubmissions.length,
        });
        setZoomDialogOpen(false);
        setZoomSubmissionIndex(0);
      }
      // Se a submissão no índice atual é undefined, fechar
      else if (!getPaginatedSubmissions[zoomSubmissionIndex]) {
        console.warn("⚠️ Submission at index is undefined, closing dialog", {
          index: zoomSubmissionIndex,
        });
        setZoomDialogOpen(false);
        setZoomSubmissionIndex(0);
      }
    }
  }, [zoomDialogOpen, zoomSubmissionIndex, getPaginatedSubmissions]);

  // ✅ Item 7: Estatísticas filtradas por agência
  const agencyFilteredStats = useMemo(() => {
    if (!currentAgency) {
      return {
        events: events.length,
        posts: posts.length,
        submissions: submissionsData?.count || 0, // ✅ SPRINT 1: Usar count real do backend
        users: usersCount,
        sales: submissions.filter((s) => s.submission_type === "sale" && s.status === "approved").length,
      };
    }

    const agencyId = currentAgency.id;
    return {
      events: events.filter((e) => e.agency_id === agencyId).length,
      posts: posts.filter((p) => p.agency_id === agencyId).length,
      submissions: submissionsData?.count || 0, // 🆕 CORREÇÃO 2: Usar count real do backend (já filtrado por agencyId)
      users: usersCount,
      sales: submissions.filter(
        (s) => s.agency_id === agencyId && s.submission_type === "sale" && s.status === "approved",
      ).length,
    };
  }, [events, posts, submissions, usersCount, currentAgency, submissionsData?.count]);

  // ✅ Item 9: Filtrar eventos por ativo/inativo
  // ✅ Item 7: Ordenar eventos por data
  const filteredEvents = useMemo(() => {
    // 1. Aplicar filtro de status
    let filtered = events;
    if (eventActiveFilter === "active") {
      filtered = events.filter((e) => e.is_active === true);
    } else if (eventActiveFilter === "inactive") {
      filtered = events.filter((e) => e.is_active === false);
    }

    // 2. Aplicar ordenação
    const sorted = [...filtered];
    switch (eventSortOrder) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.event_date || b.created_at).getTime() - new Date(a.event_date || a.created_at).getTime()
        );
      
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.event_date || a.created_at).getTime() - new Date(b.event_date || b.created_at).getTime()
        );
      
      case 'upcoming':
        return sorted
          .filter(e => e.event_date && new Date(e.event_date) >= new Date())
          .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
      
      case 'past':
        return sorted
          .filter(e => e.event_date && new Date(e.event_date) < new Date())
          .sort((a, b) => new Date(b.event_date!).getTime() - new Date(a.event_date!).getTime());
      
      default:
        return sorted;
    }
  }, [events, eventActiveFilter, eventSortOrder]);

  // ✅ Item 10 + FASE 3: Filtrar postagens por evento e status do evento
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filtrar por evento específico
    if (postEventFilter !== "all") {
      filtered = filtered.filter((p) => p.event_id === postEventFilter);
    }

    // Filtrar por status do evento (ativo/inativo)
    if (postEventActiveFilter !== "all") {
      filtered = filtered.filter((p) => {
        const event = events.find((e) => e.id === p.event_id);
        if (!event) return false;
        return postEventActiveFilter === "active" ? event.is_active === true : event.is_active === false;
      });
    }

    return filtered;
  }, [posts, postEventFilter, postEventActiveFilter, events]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      refetchEvents();
      setEventToDelete(null);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleDuplicateEvent = async (event: any) => {
    try {
      // ✅ ITEM 6 FASE 2: Incluir agency_id, created_by e todos os campos importantes
      const { data: newEvent, error } = await sb
        .from("events")
        .insert({
          title: `${event.title} - Cópia`,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          setor: event.setor,
          numero_de_vagas: event.numero_de_vagas,
          required_posts: event.required_posts,
          required_sales: event.required_sales,
          is_active: false, // Criar inativo por padrão
          require_instagram_link: event.require_instagram_link,
          event_image_url: event.event_image_url,
          agency_id: event.agency_id, // ✅ Copiar agency_id
          created_by: user?.id || event.created_by, // ✅ Usar usuário atual
          event_purpose: event.event_purpose,
          whatsapp_group_url: event.whatsapp_group_url,
          whatsapp_group_title: event.whatsapp_group_title,
          accept_posts: event.accept_posts,
          accept_sales: event.accept_sales,
          require_profile_screenshot: event.require_profile_screenshot,
          require_post_screenshot: event.require_post_screenshot,
          target_gender: event.target_gender,
          internal_notes: event.internal_notes,
          total_required_posts: event.total_required_posts,
          is_approximate_total: event.is_approximate_total,
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ Duplicar requisitos
      const { data: requirements } = await sb.from("event_requirements").select("*").eq("event_id", event.id);

      if (requirements && requirements.length > 0) {
        const newRequirements = requirements.map((req: any) => ({
          event_id: newEvent.id,
          required_posts: req.required_posts,
          required_sales: req.required_sales,
          description: req.description,
          display_order: req.display_order,
        }));

        await sb.from("event_requirements").insert(newRequirements);
      }

      // ✅ ITEM 6 FASE 2: Duplicar FAQs também
      const { data: faqs } = await sb.from("event_faqs").select("*").eq("event_id", event.id);

      if (faqs && faqs.length > 0) {
        const newFaqs = faqs.map((faq: any) => ({
          event_id: newEvent.id,
          question: faq.question,
          answer: faq.answer,
          is_visible: faq.is_visible,
          display_order: faq.display_order,
        }));

        await sb.from("event_faqs").insert(newFaqs);
      }

      toast.success("Evento duplicado com sucesso! Requisitos e FAQs foram copiados.");
      refetchEvents();
    } catch (error) {
      console.error("Error duplicating event:", error);
      toast.error("Erro ao duplicar evento");
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      // Deletar todas as submissões associadas primeiro
      const { error: submissionsError } = await sb.from("submissions").delete().eq("post_id", postToDelete.id);

      if (submissionsError) throw submissionsError;

      // Depois deletar o post
      const { error: postError } = await sb.from("posts").delete().eq("id", postToDelete.id);

      if (postError) throw postError;

      const submissionsText =
        postToDelete.submissionsCount === 1
          ? "1 submissão foi deletada"
          : `${postToDelete.submissionsCount} submissões foram deletadas`;

      toast.success(`Postagem deletada com sucesso${postToDelete.submissionsCount > 0 ? `. ${submissionsText}` : ""}`);
      refetchEvents();
      refetchSubmissions();
      setPostToDelete(null);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erro ao deletar postagem");
    }
  };

  const handleDeletePostClick = async (postId: string) => {
    // Verificar quantas submissões estão associadas
    const { data: submissions, count } = await sb
      .from("submissions")
      .select("id", { count: "exact", head: false })
      .eq("post_id", postId);

    setPostToDelete({
      id: postId,
      submissionsCount: count || 0,
    });
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    try {
      await deleteSubmissionMutation.mutateAsync(submissionToDelete);
      refetchSubmissions();
      setSubmissionToDelete(null);
    } catch (error) {
      console.error("Error deleting submission:", error);
    }
  };

  const getAvailablePostNumbers = () => {
    const filtered = submissions.filter(
      (s: any) => submissionEventFilter === "all" || s.posts?.events?.id === submissionEventFilter,
    );
    const postNumbers = new Set(filtered.map((s: any) => s.posts?.post_number).filter(Boolean));
    return Array.from(postNumbers).sort((a, b) => a - b);
  };

  // ✅ Extrair função de exportação para Excel
  const handleExportToExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");

      // ✅ FASE 2: Validação aprimorada com dados frescos
      if (submissionEventFilter === "all" || !submissionEventFilter) {
        toast.error("⚠️ Selecione um evento específico para exportar");
        return;
      }

      // Usar dados diretos do React Query (sempre frescos)
      const freshSubmissions = submissionsData?.data || [];

      if (!freshSubmissions || freshSubmissions.length === 0) {
        toast.error(`❌ Nenhuma submissão encontrada para o evento selecionado`);
        return;
      }

      // Aplicar filtros client-side (post number, dates)
      let filteredSubmissions = freshSubmissions;

      if (!filteredSubmissions || filteredSubmissions.length === 0) {
        toast.error(`❌ Nenhuma submissão encontrada para o evento selecionado com os filtros aplicados`);
        return;
      }

      // Buscar dados completos das submissões filtradas
      const submissionIds = filteredSubmissions.map((s) => s.id);

      if (submissionIds.length === 0) {
        toast.error("Nenhuma submissão disponível para exportar");
        return;
      }

      // 🔧 CORREÇÃO 1: Buscar submissions e profiles separadamente
      const { data: fullSubmissionsData, error: submissionsError } = await sb
        .from("submissions")
        .select("*")
        .in("id", submissionIds);

      if (submissionsError) {
        console.error("❌ Erro ao buscar submissões:", submissionsError);
        toast.error("Erro ao buscar submissões");
        return;
      }

      // Buscar perfis dos usuários
      const userIds = [...new Set(fullSubmissionsData.map((s) => s.user_id))];
      const { data: profilesData } = await sb
        .from("profiles")
        .select("id, full_name, instagram, email, gender, followers_range")
        .in("id", userIds);

      // Criar map de profiles
      const profilesMap: Record<string, any> = {};
      (profilesData || []).forEach((profile) => {
        profilesMap[profile.id] = profile;
      });

      // 🆕 Buscar total de submissões aprovadas por usuário no evento específico
      let approvedQuery = sb
        .from("submissions")
        .select("user_id, post_id, posts!inner(event_id)")
        .in("user_id", userIds)
        .eq("status", "approved")
        .eq("submission_type", "post");

      // Filtrar por evento específico se não for "all"
      if (submissionEventFilter !== "all") {
        approvedQuery = approvedQuery.eq("posts.event_id", submissionEventFilter);
      }

      const { data: approvedCountsData } = await approvedQuery;

      // Criar map: user_id => total de submissões aprovadas
      const approvedCountsMap: Record<string, number> = {};
      (approvedCountsData || []).forEach((item) => {
        approvedCountsMap[item.user_id] = (approvedCountsMap[item.user_id] || 0) + 1;
      });

      console.log("✅ Contagens de aprovados carregadas:", {
        usuariosComAprovados: Object.keys(approvedCountsMap).length,
        totalUsuarios: userIds.length,
        eventoFiltrado: submissionEventFilter !== "all" ? submissionEventFilter : "todos",
      });

      // Enriquecer submissions com profiles
      const enrichedSubmissions = fullSubmissionsData.map((sub) => ({
        ...sub,
        profiles: profilesMap[sub.user_id] || {
          full_name: "Usuário Desconhecido",
          instagram: null,
          email: null,
          gender: null,
          followers_range: null,
        },
      }));

      // 🔧 ITEM 7: Buscar informações de posts com query robusta
      let postsMap: Record<string, any> = {};

      if (submissionIds.length > 0) {
        console.log("🔍 Buscando posts para", submissionIds.length, "submissões");

        // Passo 1: Buscar post_ids das submissões
        const { data: submissionsWithPosts, error: postsIdsError } = await sb
          .from("submissions")
          .select("id, post_id")
          .in("id", submissionIds)
          .not("post_id", "is", null);

        if (postsIdsError) {
          console.error("Erro ao buscar post_ids:", postsIdsError);
        } else {
          const postIds = (submissionsWithPosts || []).map((s: any) => s.post_id).filter(Boolean);

          if (postIds.length > 0) {
            // Passo 2: Buscar dados dos posts
            const { data: postsData, error: postsError } = await sb
              .from("posts")
              .select(
                `
                id,
                post_number,
                event_id,
                events (
                  title
                )
              `,
              )
              .in("id", postIds);

            if (postsError) {
              console.error("Erro ao buscar posts:", postsError);
            } else {
              // Criar map de post_id → post_data
              const postsDataMap: Record<string, any> = {};
              (postsData || []).forEach((post: any) => {
                if (post?.id) {
                  postsDataMap[post.id] = {
                    post_number: post.post_number || 0,
                    event_title: post.events?.title || "Evento Desconhecido",
                  };
                }
              });

              // Criar map de submission_id → post_data
              (submissionsWithPosts || []).forEach((item: any) => {
                if (item?.id && item?.post_id && postsDataMap[item.post_id]) {
                  postsMap[item.id] = postsDataMap[item.post_id];
                }
              });

              console.log("✅ Posts carregados:", {
                submissionsTotal: submissionIds.length,
                postsEncontrados: Object.keys(postsDataMap).length,
                submissoesComPosts: Object.keys(postsMap).length,
              });
            }
          }
        }
      }

      console.log("📊 Posts mapeados:", Object.keys(postsMap).length, "de", submissionIds.length);

      // Preparar dados para exportação usando enrichedSubmissions
      const exportData = (enrichedSubmissions || []).map((sub: any) => {
        // 🔧 Buscar post data com validação extra
        const eventTitle = postsMap[sub.id]?.event_title || "Evento não identificado";
        const postNumber = postsMap[sub.id]?.post_number || 0;

        return {
          Tipo: sub.submission_type === "post" ? "Postagem" : "Venda",
          Evento: eventTitle,
          "Número da Postagem": postNumber,
          Nome: sub.profiles?.full_name || "N/A",
          Instagram: sub.profiles?.instagram
            ? `https://instagram.com/${sub.profiles.instagram.replace("@", "")}`
            : "N/A",
          Email: sub.profiles?.email || "N/A",
          Gênero: sub.profiles?.gender || "N/A",
          Seguidores: sub.profiles?.followers_range || "N/A",
          Status: sub.status === "approved" ? "Aprovado" : sub.status === "rejected" ? "Rejeitado" : "Pendente",
          "Data de Envio": new Date(sub.submitted_at).toLocaleString("pt-BR"),
          "Total de Submissões Aprovadas": approvedCountsMap[sub.user_id] || 0,
          "Motivo Rejeição": sub.rejection_reason || "N/A",
        };
      });

      // Criar worksheet e workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Submissões");

      // Download
      const eventName = events.find((e) => e.id === submissionEventFilter)?.title || "filtradas";
      XLSX.writeFile(wb, `submissoes_${eventName}_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success(`${exportData.length} submissão(ões) exportada(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar submissões");
    }
  }, [getFilteredSubmissions, submissionEventFilter, events]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || (!isAgencyAdmin && !isMasterAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Suspense fallback={null}>
        <AdminTutorialGuide />
      </Suspense>
      {/* Admin Context Header */}
      <div className="bg-gradient-primary text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.avatar_url} alt={`Avatar ${profile.full_name}`} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            ) : currentAgency?.name ? (
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">{currentAgency.name.charAt(0).toUpperCase()}</span>
              </div>
            ) : null}
            <div>
              <h2 className="text-xl font-bold">{profile?.full_name || "Admin"}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                <span>{profile?.email}</span>
                {currentAgency && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {currentAgency.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {currentAgency && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Badge variant="secondary" className="text-base px-4 py-2 w-full sm:w-auto text-center">
                Plano: {currentAgency.subscription_plan?.toUpperCase() || "BASIC"}
              </Badge>
              {/* 🔴 FASE 3: Botões visíveis em todas as telas (removido hidden md:flex) */}
              <Button
                onClick={() => {
                  window.location.href = "/#precos";
                }}
                variant="secondary"
                size="sm"
                className="font-semibold w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {trialInfo?.inTrial ? "Assinar Agora" : "Gerenciar Assinatura"}
              </Button>
              <Button
                onClick={() => setSuggestionDialogOpen(true)}
                size="sm"
                className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5 w-full sm:w-auto"
              >
                <Lightbulb className="h-5 w-5" />
                Enviar Sugestão
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Trial Banners */}
      {trialInfo?.inTrial && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">🎉 Trial Ativo</h3>
                  <p className="text-white/90">
                    Você tem{" "}
                    <strong>
                      {trialInfo.daysRemaining} dia{trialInfo.daysRemaining !== 1 ? "s" : ""}
                    </strong>{" "}
                    restante{trialInfo.daysRemaining !== 1 ? "s" : ""} para testar gratuitamente!
                  </p>
                </div>
              </div>
              <Button
                onClick={() => (window.location.href = "/#precos")}
                className="bg-white text-green-600 hover:bg-white/90"
              >
                Ver Planos
              </Button>
            </div>
          </div>
        </div>
      )}

      {trialInfo?.expired && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">⚠️ Trial Expirado</h3>
                  <p className="text-white/90">
                    Seu período de teste acabou. <strong>Assine agora</strong> para continuar editando!
                  </p>
                </div>
              </div>
              <Button
                onClick={() => (window.location.href = "/#precos")}
                className="bg-white text-red-600 hover:bg-white/90 font-bold"
              >
                Assinar Agora
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Agency Filter Indicator */}
      {currentAgency && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentAgency.logo_url && (
                  <img
                    src={currentAgency.logo_url}
                    alt={`Logo ${currentAgency.name}`}
                    className="h-10 w-10 object-contain rounded-lg bg-card p-1"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Visualizando dados de:</p>
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {currentAgency.name}
                  </h3>
                </div>
              </div>
              {isMasterAdmin && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate("/master-admin");
                    setCurrentAgency(null);
                  }}
                >
                  ← Voltar ao Painel Master
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {isMasterAdmin && !currentAgency && (
                <Link to="/master-admin">
                  <Button variant="outline" size="sm">
                    🎯 Painel Master
                  </Button>
                </Link>
              )}
              <div className="flex flex-col gap-2">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Painel Agência
                </h1>
                {agencySlug && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Link da sua agência:</span>
                    <Badge variant="outline" className="text-sm">
                      <Building2 className="h-3 w-3 mr-1" />
                      {agencySlug}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copySlugUrl}
                      className="h-6 w-6 p-0"
                      title="Copiar link de cadastro"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => {
                  const message = encodeURIComponent(
                    `Olá! Preciso de suporte - Agência: ${currentAgency?.name || "Sem nome"}`,
                  );
                  window.open(`https://wa.me/5511999136884?text=${message}`, "_blank");
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg transition-all hover:scale-105 flex items-center gap-2 flex-1 sm:flex-initial"
                size="sm"
              >
                <MessageSquare className="h-5 w-5" />
                Suporte WhatsApp
              </Button>
              <Link to="/submit" className="flex-1 sm:flex-initial">
                <Button variant="outline" className="w-full sm:w-auto" size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Postagem
                </Button>
              </Link>
              <Button variant="outline" onClick={signOut} className="flex-1 sm:flex-initial" size="sm">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div id="stats-cards" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos Totais</p>
                <p className="text-2xl font-bold">{agencyFilteredStats.events}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Postagens</p>
                <p className="text-2xl font-bold">{agencyFilteredStats.posts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submissões</p>
                <p className="text-2xl font-bold">{agencyFilteredStats.submissions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuários</p>
                <p className="text-2xl font-bold">{agencyFilteredStats.users}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas Totais</p>
                <p className="text-2xl font-bold">{agencyFilteredStats.sales}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs
          defaultValue="events"
          className="space-y-6"
          onValueChange={(value) => {
            // ✅ ITEM 3 FASE 1: Limpar filtros de submissões ao sair da aba
            if (value !== "submissions") {
              clearFilters();
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1 h-auto">
            <TabsTrigger value="events" className="text-xs sm:text-sm py-2">
              Eventos
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">
              Postagens
            </TabsTrigger>
            <TabsTrigger id="submissions-tab" value="submissions" className="text-xs sm:text-sm py-2">
              Submissões
            </TabsTrigger>
            <TabsTrigger id="users-tab" value="users" className="text-xs sm:text-sm py-2">
              Usuários
            </TabsTrigger>
            <TabsTrigger value="guests" className="text-xs sm:text-sm py-2">
              Convidados
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs sm:text-sm py-2">
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm py-2">
              Estatísticas
            </TabsTrigger>
            <TabsTrigger id="settings-tab" value="settings" className="text-xs sm:text-sm py-2">
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Gerenciar Eventos</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""} encontrado
                  {filteredEvents.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={eventActiveFilter} onValueChange={setEventActiveFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    <SelectItem value="active">✅ Apenas Ativos</SelectItem>
                    <SelectItem value="inactive">❌ Apenas Inativos</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={eventSortOrder} onValueChange={setEventSortOrder}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Ordenar eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">📅 Mais Recentes</SelectItem>
                    <SelectItem value="oldest">📅 Mais Antigos</SelectItem>
                    <SelectItem value="upcoming">⏰ Próximos Eventos</SelectItem>
                    <SelectItem value="past">📜 Eventos Passados</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  id="create-event-button"
                  className="bg-gradient-primary w-full sm:w-auto"
                  onClick={() => {
                    setSelectedEvent(null);
                    setEventDialogOpen(true);
                  }}
                  disabled={isReadOnly}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Evento
                </Button>
                {isReadOnly && <span className="text-xs text-red-500">⚠️ Assine para editar</span>}
              </div>
            </div>

            <Card className="p-6">
              {filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {eventActiveFilter === "all"
                    ? "Nenhum evento cadastrado ainda"
                    : "Nenhum evento encontrado com este filtro"}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 w-full">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          {event.event_date && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📅 {new Date(event.event_date).toLocaleString("pt-BR")}
                            </p>
                          )}
                          {event.location && <p className="text-sm text-muted-foreground">📍 {event.location}</p>}
                          <p className="text-sm text-muted-foreground mt-1">
                            📊 {submissionsByEvent[event.id] || 0} submissões | Requisitos: {event.required_posts}{" "}
                            posts, {event.required_sales} vendas
                          </p>
                          {event.event_slug ? (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md border">
                              <span className="text-xs font-mono text-muted-foreground">🔗 {event.event_slug}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyEventUrl(currentAgency?.slug || "", event.event_slug!)}
                                className="h-6 px-2 text-xs"
                              >
                                Copiar URL Pública
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                              <span className="text-xs text-amber-600 dark:text-amber-400">⚠️ Slug não definido</span>
                            </div>
                          )}
                          {event.description && <p className="text-muted-foreground mt-2">{event.description}</p>}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setEventDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-initial"
                            disabled={isReadOnly}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateEvent(event)}
                            className="flex-1 sm:flex-initial"
                            title="Duplicar evento"
                            disabled={isReadOnly}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventToDelete(event.id)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial"
                            disabled={isReadOnly}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Gerenciar Postagens</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredPosts.length} postage{filteredPosts.length !== 1 ? "ns" : "m"} encontrada
                    {filteredPosts.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {/* ✅ FASE 3: Filtro de status do evento */}
                  <Select value={postEventActiveFilter} onValueChange={setPostEventActiveFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Status do evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">✅ Eventos Ativos</SelectItem>
                      <SelectItem value="inactive">⏸️ Eventos Inativos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={postEventFilter} onValueChange={setPostEventFilter}>
                    <SelectTrigger className="w-full sm:w-64">
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
                  <Button
                    className="bg-gradient-primary w-full sm:w-auto"
                    onClick={() => {
                      setSelectedPost(null);
                      setPostDialogOpen(true);
                    }}
                    disabled={isReadOnly}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Postagem
                  </Button>
                  {isReadOnly && <span className="text-xs text-red-500">⚠️ Assine para editar</span>}
                </div>
              </div>
            </div>

            <Card className="p-6">
              {filteredPosts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {postEventFilter === "all"
                    ? "Nenhuma postagem cadastrada ainda"
                    : "Nenhuma postagem para este evento"}
                </p>
              ) : (
                /* ✅ ITEM 3: Agrupar posts por evento */
                <div className="space-y-6">
                  {(() => {
                    // Agrupar posts por evento
                    const postsByEvent: Record<string, typeof filteredPosts> = {};
                    filteredPosts.forEach((post) => {
                      const eventTitle = getEventTitle(post);
                      if (!postsByEvent[eventTitle]) {
                        postsByEvent[eventTitle] = [];
                      }
                      postsByEvent[eventTitle].push(post);
                    });

                    return Object.entries(postsByEvent).map(([eventTitle, eventPosts]) => (
                      <div key={eventTitle} className="space-y-3">
                        {/* Cabeçalho do grupo de evento */}
                        <div className="flex items-center gap-2 px-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-lg">{eventTitle}</h3>
                          <Badge variant="outline">
                            {eventPosts.length} post{eventPosts.length > 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Lista de posts do evento */}
                        <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                          {eventPosts
                            .sort((a, b) => a.post_number - b.post_number)
                            .map((post) => (
                              <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold">{formatPostName(post.post_type, post.post_number)}</h4>
                                      {/* ✅ ITEM 2: Badge com contador de submissões */}
                                      <Badge variant="secondary" className="text-xs">
                                        {submissionsByPost[post.id] || 0} submiss
                                        {(submissionsByPost[post.id] || 0) === 1 ? "ão" : "ões"}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Prazo: {new Date(post.deadline).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPost(post);
                                        setPostDialogOpen(true);
                                      }}
                                      disabled={isReadOnly}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePostClick(post.id)}
                                      className="text-destructive hover:text-destructive"
                                      disabled={isReadOnly}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            {/* ✅ Sprint 3A: Usar componente AdminFilters refatorado */}
            <AdminFilters
              submissionEventFilter={submissionEventFilter}
              submissionPostFilter={submissionPostFilter}
              submissionStatusFilter={submissionStatusFilter}
              postTypeFilter={postTypeFilter}
              searchTerm={searchTerm}
              dateFilterStart={dateFilterStart}
              dateFilterEnd={dateFilterEnd}
              kanbanView={kanbanView}
              cardsGridView={cardsGridView}
              events={events}
              submissions={submissions}
              onSubmissionEventFilterChange={setSubmissionEventFilter}
              onSubmissionPostFilterChange={setSubmissionPostFilter}
              onSubmissionStatusFilterChange={setSubmissionStatusFilter}
              onPostTypeFilterChange={setPostTypeFilter}
              onSearchTermChange={setSearchTerm}
              onDateFilterStartChange={setDateFilterStart}
              onDateFilterEndChange={setDateFilterEnd}
              onKanbanViewToggle={() => setKanbanView(!kanbanView)}
              onCardsGridViewToggle={() => setCardsGridView(!cardsGridView)}
              onExport={handleExportToExcel}
              filteredCount={getPaginatedSubmissions.length}
              totalCount={submissionsData?.count || 0} // ✅ SPRINT 1: Usar count real do backend
              isLoadingSubmissions={loadingSubmissions}
            />

            {/* ✅ SPRINT 2: Indicador de filtros ativos */}
            {(submissionStatusFilter !== "all" ||
              postTypeFilter !== "all" ||
              debouncedSearch ||
              submissionEventFilter !== "all") && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-md mb-4">
                <span className="text-sm font-medium">🔍 Filtros ativos:</span>
                <span className="text-sm text-muted-foreground">
                  {submissionsData?.count || 0} resultado(s) encontrado(s)
                </span>
              </div>
            )}

            {kanbanView ? (
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <SubmissionKanban
                  submissions={getPaginatedSubmissions as any}
                  onUpdate={refetchSubmissions}
                  userId={user?.id}
                />
              </Suspense>
            ) : cardsGridView ? (
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <SubmissionCardsGrid
                  submissions={getFilteredSubmissions as any}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalPages={totalPages}
                  selectedSubmissions={selectedSubmissions}
                  imageUrls={imageUrls}
                  isReadOnly={isReadOnly}
                  onPageChange={setCurrentPage}
                  onApprove={handleApproveSubmission}
                  onReject={handleRejectSubmission}
                  onToggleSelection={toggleSubmissionSelection}
                  onImageZoom={handleOpenZoom}
                  SubmissionImageDisplay={SubmissionImageDisplay}
                />
              </Suspense>
            ) : loadingSubmissions ? (
              <Card className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando submissões...</p>
              </Card>
            ) : (
              <>
                {selectedSubmissions.size > 0 && (
                  <Button onClick={handleBulkApprove} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto mb-4">
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Aprovar {selectedSubmissions.size}
                  </Button>
                )}

                <Card className="p-6">
                  {getPaginatedSubmissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma submissão encontrada com os filtros selecionados
                    </p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-4 border-b">
                          <Checkbox
                            checked={
                              selectedSubmissions.size === getPaginatedSubmissions.length &&
                              getPaginatedSubmissions.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm text-muted-foreground">
                            Selecionar todos desta página ({getPaginatedSubmissions.length})
                          </span>
                        </div>
                        {getPaginatedSubmissions.map((submission: any) => (
                          <Card key={submission.id} className="p-4 sm:p-6">
                            <div className="space-y-4">
                              {/* Layout Mobile e Desktop */}
                              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                {/* Checkbox de seleção */}
                                <div className="flex items-start pt-2 order-1 sm:order-1">
                                  <Checkbox
                                    checked={selectedSubmissions.has(submission.id)}
                                    onCheckedChange={() => toggleSubmissionSelection(submission.id)}
                                  />
                                </div>

                                {/* Screenshots */}
                                <div className="w-full sm:w-48 flex-shrink-0 order-2 sm:order-2 space-y-2">
                                  {/* Screenshot principal (post/venda) */}
                                  <div
                                    className="h-64 sm:h-48 cursor-pointer"
                                    onClick={() => handleOpenZoom(submission.id)}
                                  >
                                    <Suspense fallback={<Skeleton className="w-full h-full rounded-lg" />}>
                                      <SubmissionImageDisplay
                                        screenshotPath={submission.screenshot_path}
                                        screenshotUrl={submission.screenshot_url}
                                        alt="Screenshot da postagem"
                                        className="w-full h-full object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                      />
                                    </Suspense>
                                  </div>

                                  {/* 🆕 Screenshot do perfil (se existir) */}
                                  {submission.profile_screenshot_path && (
                                    <div className="h-40 sm:h-32">
                                      <Suspense fallback={<Skeleton className="w-full h-full rounded-lg" />}>
                                        <SubmissionImageDisplay
                                          screenshotPath={submission.profile_screenshot_path}
                                          alt="Screenshot do perfil"
                                          className="w-full h-full object-cover rounded-lg border opacity-80"
                                        />
                                      </Suspense>
                                      <p className="text-xs text-muted-foreground text-center mt-1">Print do Perfil</p>
                                    </div>
                                  )}

                                  {/* 🆕 Faixa de seguidores (se existir) */}
                                  {submission.followers_range && (
                                    <div className="bg-primary/10 rounded px-2 py-1 text-center">
                                      <p className="text-xs font-medium text-primary">
                                        👥 {submission.followers_range}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Informações do usuário */}
                                <div className="flex-1 space-y-3 order-3 sm:order-3">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                    <div>
                                      <h3 className="font-bold text-lg">
                                        {submission.profiles?.full_name || "Nome não disponível"}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {submission.profiles?.email || "Email não disponível"}
                                      </p>
                                      {submission.profiles?.instagram && (
                                        <a
                                          href={`https://instagram.com/${submission.profiles.instagram.replace("@", "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm font-medium text-primary mt-1 hover:underline cursor-pointer inline-block"
                                        >
                                          {submission.profiles.instagram.startsWith("@")
                                            ? submission.profiles.instagram
                                            : `@${submission.profiles.instagram}`}
                                        </a>
                                      )}
                                    </div>
                                     <div className="sm:text-right">
                                       <div className="flex flex-col sm:items-end gap-2">
                                         {/* ✅ FASE 5: Dropdown para trocar evento */}
                                         <div className="space-y-1">
                                           <label className="text-sm text-muted-foreground">
                                             Evento:
                                           </label>
                                           <Select
                                             value={submission.event_id || "none"}
                                             onValueChange={async (newEventId) => {
                                               if (newEventId === "none") return;

                                               const currentEvent = events.find((e) => e.id === submission.event_id);
                                               const newEvent = events.find((e) => e.id === newEventId);

                                               const confirma = window.confirm(
                                                 `Deseja mover esta submissão de:\n"${currentEvent?.title}" → "${newEvent?.title}"?\n\nO post será resetado e deverá ser selecionado novamente.\n\nEsta ação não pode ser desfeita.`,
                                               );

                                               if (!confirma) return;

                                               try {
                                                 const { error } = await sb
                                                   .from("submissions")
                                                   .update({ 
                                                     event_id: newEventId,
                                                     post_id: null,
                                                     submission_type: "post"
                                                   })
                                                   .eq("id", submission.id);

                                                 if (error) throw error;

                                                 toast.success(`✅ Submissão movida para: ${newEvent?.title}`);
                                                 refetchSubmissions();
                                               } catch (err: any) {
                                                 console.error("Erro ao trocar evento:", err);
                                                 toast.error(`❌ Erro: ${err.message}`);
                                               }
                                             }}
                                             disabled={isReadOnly}
                                           >
                                             <SelectTrigger className="w-48 h-8 text-xs">
                                               <SelectValue>
                                                 {events.find((e) => e.id === submission.event_id)?.title || "Selecione evento"}
                                               </SelectValue>
                                             </SelectTrigger>
                                             <SelectContent>
                                               {events
                                                 .filter((e) => e.is_active)
                                                 .map((event) => (
                                                   <SelectItem key={event.id} value={event.id}>
                                                     📅 {event.title}
                                                   </SelectItem>
                                                 ))}
                                             </SelectContent>
                                           </Select>
                                         </div>

                                         {/* ✅ ITEM 4: Dropdown editável para trocar post_id */}
                                         <div className="flex items-center gap-2">
                                           <Select
                                            value={submission.post_id || "none"}
                                            onValueChange={async (newPostId) => {
                                              if (newPostId === "none") return;

                                              // 🆕 FASE 4: Tratar seleção de venda especial
                                              if (newPostId === "__SALE__") {
                                                const confirma = window.confirm(
                                                  `Deseja alterar para "Comprovante de Venda"?\n\nEsta ação não pode ser desfeita.`,
                                                );

                                                if (!confirma) return;

                                                 try {
                                                   // ✅ FASE 4: Buscar event_id do post atual para manter rastreabilidade
                                                   const currentPost = posts.find((p) => p.id === submission.post_id);
                                                   const eventId = currentPost?.event_id || null;

                                                   const { error } = await sb
                                                     .from("submissions")
                                                     .update({ 
                                                       post_id: null,
                                                       submission_type: "sale",
                                                       event_id: eventId // ✅ Manter event_id mesmo sem post_id
                                                     })
                                                     .eq("id", submission.id);

                                                   if (error) throw error;

                                                   toast.success(`✅ Post alterado para: Comprovante de Venda`);
                                                   refetchSubmissions();
                                                 } catch (err: any) {
                                                   console.error("Erro ao atualizar post:", err);
                                                   toast.error(`❌ Erro: ${err.message}`);
                                                 }
                                                 return;
                                               }

                                              // Para posts normais
                                              const postAtual = posts.find((p) => p.id === submission.post_id);
                                              const postNovo = posts.find((p) => p.id === newPostId);

                                              const nomeAtual = postAtual
                                                ? formatPostName(postAtual.post_type, postAtual.post_number)
                                                : "Comprovante de Venda";
                                              const nomeNovo = postNovo
                                                ? formatPostName(postNovo.post_type, postNovo.post_number)
                                                : "Comprovante de Venda";

                                              const confirma = window.confirm(
                                                `Deseja alterar o post de "${nomeAtual}" para "${nomeNovo}"?\n\nEsta ação não pode ser desfeita.`,
                                              );

                                              if (!confirma) return;

                                              try {
                                                // Atualizar post_id e submission_type automaticamente
                                                const updates: any = { 
                                                  post_id: newPostId,
                                                  submission_type: "post"
                                                };

                                                const { error } = await sb
                                                  .from("submissions")
                                                  .update(updates)
                                                  .eq("id", submission.id);

                                                if (error) throw error;

                                                toast.success(`✅ Post alterado para: ${nomeNovo}`);
                                                refetchSubmissions();
                                              } catch (err: any) {
                                                console.error("Erro ao atualizar post:", err);
                                                toast.error(`❌ Erro: ${err.message}`);
                                              }
                                            }}
                                            disabled={isReadOnly}
                                          >
                                            <SelectTrigger className="w-48 h-8 text-xs">
                                              <SelectValue>
                                                {submission.submission_type === "sale"
                                                  ? "💰 Comprovante de Venda"
                                                  : `📱 ${formatPostName(submission.posts?.post_type, submission.posts?.post_number || 0)}`}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {(() => {
                                                // Buscar evento da submissão atual
                                                const currentPost = posts.find((p) => p.id === submission.post_id);
                                                const eventId = currentPost?.event_id;
                                                const currentEvent = events.find((e) => e.id === eventId);
                                                const items = [];

                                                // 🆕 FASE 4: Se evento aceita vendas, adicionar opção especial
                                                if (currentEvent?.accept_sales) {
                                                  items.push(
                                                    <SelectItem key="sale-option" value="__SALE__">
                                                      💰 Comprovante de Venda
                                                    </SelectItem>
                                                  );
                                                }

                                                // Adicionar posts normais (filtrar posts de venda para evitar duplicata)
                                                const eventPosts = posts
                                                  .filter((p) => p.event_id === eventId)
                                                  .filter((post) => post.post_type !== 'venda'); // 🆕 FASE 4: Filtrar posts de venda

                                                eventPosts.forEach((post) => {
                                                  items.push(
                                                    <SelectItem key={post.id} value={post.id}>
                                                      📱 {formatPostName(post.post_type, post.post_number)}
                                                    </SelectItem>
                                                  );
                                                });

                                                return items;
                                              })()}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                          {
                                            // Suporte para events como objeto ou array
                                            Array.isArray(submission.posts?.events)
                                              ? submission.posts?.events[0]?.title || "N/A"
                                              : submission.posts?.events?.title || "N/A"
                                          }
                                        </p>
                                      </div>
                                      <div className="mt-2">
                                        {submission.status === "pending" && (
                                          <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">
                                            Aguardando
                                          </span>
                                        )}
                                        {submission.status === "approved" && (
                                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
                                            Aprovado
                                          </span>
                                        )}
                                        {submission.status === "rejected" && (
                                          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500">
                                            Rejeitado
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t pt-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Data de Envio:</p>
                                        <p className="font-medium">
                                          {new Date(submission.submitted_at).toLocaleString("pt-BR")}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Prazo da Postagem:</p>
                                        <p className="font-medium">
                                          {submission.posts?.deadline
                                            ? new Date(submission.posts.deadline).toLocaleString("pt-BR")
                                            : "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Total de Postagens:</p>
                                        <p className="font-medium text-primary">
                                          {submission.total_submissions} postagem
                                          {submission.total_submissions !== 1 ? "s" : ""}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                                    <div className="flex-1">
                                      <label className="text-sm text-muted-foreground mb-1 block">
                                        Status da Submissão:
                                      </label>
                                      <Select
                                        value={submission.status}
                                        onValueChange={(newStatus) => handleStatusChange(submission.id, newStatus)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Aguardando aprovação</SelectItem>
                                          <SelectItem value="approved">Aprovado</SelectItem>
                                          <SelectItem value="rejected">Rejeitado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAuditLogSubmissionId(submission.id)}
                                      >
                                        Ver Histórico
                                      </Button>
                                    </div>
                                  </div>

                                  {submission.status === "pending" && (
                                    <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                                        onClick={() => handleApproveSubmission(submission.id)}
                                        disabled={isReadOnly}
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        Aprovar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full sm:w-auto"
                                        onClick={() => handleRejectSubmission(submission.id)}
                                        disabled={isReadOnly}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Rejeitar
                                      </Button>
                                    </div>
                                  )}

                                  {/* Botão de deletar sempre visível */}
                                  <div className="border-t pt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                                      onClick={() => setSubmissionToDelete(submission.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Deletar Submissão
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Seção de Comentários */}
                              <div className="border-t pt-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedComments);
                                    if (newExpanded.has(submission.id)) {
                                      newExpanded.delete(submission.id);
                                    } else {
                                      newExpanded.add(submission.id);
                                    }
                                    setExpandedComments(newExpanded);
                                  }}
                                  className="mb-3"
                                >
                                  {expandedComments.has(submission.id) ? "Ocultar" : "Mostrar"} Comentários
                                </Button>

                                {expandedComments.has(submission.id) && (
                                  <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                                    <SubmissionComments
                                      submissionId={submission.id}
                                      onCommentAdded={refetchSubmissions}
                                    />
                                  </Suspense>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                            {Math.min(currentPage * itemsPerPage, submissionsData?.count || 0)} de{" "}
                            {submissionsData?.count || 0} submissões
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <MemoizedUserManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="guests" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              {currentAgency && <GuestManager agencyId={currentAgency.id} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              {currentAgency && <GuestAuditLog agencyId={currentAgency.id} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <Tabs defaultValue="events-stats" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-2 gap-1 h-auto">
                <TabsTrigger value="events-stats" className="text-xs sm:text-sm whitespace-normal py-2">
                  Estatísticas por Evento
                </TabsTrigger>
                <TabsTrigger value="user-performance" className="text-xs sm:text-sm whitespace-normal py-2">
                  Desempenho por Usuário
                </TabsTrigger>
              </TabsList>

              <TabsContent value="events-stats">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <MemoizedDashboardStats />
                </Suspense>
              </TabsContent>

              <TabsContent value="user-performance">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <MemoizedUserPerformance />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              {isMasterAdmin ? <MemoizedAdminSettings isMasterAdmin={true} /> : <AgencyAdminSettings />}
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
        <EventDialog
          open={eventDialogOpen}
          onOpenChange={(open) => {
            setEventDialogOpen(open);
            if (!open) setSelectedEvent(null);
          }}
          onEventCreated={() => {
            refetchEvents();
            if (submissionEventFilter !== "all") refetchSubmissions();
          }}
          event={selectedEvent}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PostDialog
          open={postDialogOpen}
          onOpenChange={(open) => {
            setPostDialogOpen(open);
            if (!open) setSelectedPost(null);
          }}
          onPostCreated={() => {
            refetchEvents();
            if (submissionEventFilter !== "all") refetchSubmissions();
          }}
          post={selectedPost}
        />
      </Suspense>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Submissão</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição para que o usuário possa corrigir</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template de Resposta</Label>
              <Select
                value={rejectionTemplate}
                onValueChange={(value) => {
                  setRejectionTemplate(value);
                  if (value === "custom") {
                    setRejectionReason("");
                  } else {
                    const template = rejectionTemplatesFromDB.find((t) => t.id === value);
                    if (template) {
                      setRejectionReason(template.message);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Template customizado</SelectItem>
                  {rejectionTemplatesFromDB.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Rejeição</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmRejection}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={!!auditLogSubmissionId} onOpenChange={(open) => !open && setAuditLogSubmissionId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações</DialogTitle>
            <DialogDescription>Visualize todas as mudanças de status desta submissão</DialogDescription>
          </DialogHeader>

          {auditLogSubmissionId && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <SubmissionAuditLog submissionId={auditLogSubmissionId} />
            </Suspense>
          )}

          <DialogFooter>
            <Button onClick={() => setAuditLogSubmissionId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento e todos os seus dados relacionados serão permanentemente
              excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventToDelete && handleDeleteEvent(eventToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir postagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A postagem será permanentemente excluída.
              {postToDelete && postToDelete.submissionsCount > 0 && (
                <span className="block mt-2 font-semibold text-destructive">
                  ⚠️ Atenção: {postToDelete.submissionsCount} submissão(ões) associada(s) também será(ão) deletada(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir{" "}
              {postToDelete && postToDelete.submissionsCount > 0
                ? `tudo (${postToDelete.submissionsCount} submissão${postToDelete.submissionsCount > 1 ? "ões" : ""})`
                : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir submissão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A submissão será permanentemente excluída do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Zoom nas Imagens */}
      <Dialog open={!!selectedImageForZoom} onOpenChange={() => setSelectedImageForZoom(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <DialogHeader>
            <DialogTitle>Imagem da Submissão</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full">
            {selectedImageForZoom && (
              <img
                src={selectedImageForZoom}
                alt="Screenshot ampliado"
                className="max-w-full max-h-[85vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Manual Submission Dialog */}
      <Suspense fallback={null}>
        <AddManualSubmissionDialog
          open={addSubmissionDialogOpen}
          onOpenChange={setAddSubmissionDialogOpen}
          onSuccess={() => {
            refetchSubmissions();
            toast.success("Submissão adicionada com sucesso!");
          }}
          selectedEventId={submissionEventFilter !== "all" ? submissionEventFilter : undefined}
        />
      </Suspense>

      {/* Zoom Dialog com navegação */}
      {getPaginatedSubmissions.length > 0 &&
        zoomSubmissionIndex < getPaginatedSubmissions.length &&
        getPaginatedSubmissions[zoomSubmissionIndex] && (
          <SubmissionZoomDialog
            open={zoomDialogOpen}
            onOpenChange={setZoomDialogOpen}
            submission={getPaginatedSubmissions[zoomSubmissionIndex] as any}
            onApprove={handleApproveSubmission}
            onReject={handleRejectSubmission}
            onNext={handleZoomNext}
            onPrevious={handleZoomPrevious}
            hasNext={zoomSubmissionIndex < getPaginatedSubmissions.length - 1}
            hasPrevious={zoomSubmissionIndex > 0}
          />
        )}

      {/* ✅ ITEM 5 FASE 2: Dialog de Sugestões */}
      <Suspense fallback={null}>
        <SuggestionDialog
          open={suggestionDialogOpen}
          onOpenChange={setSuggestionDialogOpen}
          userId={user?.id || ""}
          agencyId={currentAgency?.id}
        />
      </Suspense>
    </div>
  );
};

export default Admin;
