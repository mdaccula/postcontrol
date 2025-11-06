import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { formatPostName } from "@/lib/postNameFormatter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ✅ Sprint 2B: Importar hooks consolidados
import {
  useEventsQuery,
  useSubmissionsQuery,
  useUpdateSubmissionStatusMutation,
  useDeleteEventMutation,
  useDeleteSubmissionMutation,
} from "@/hooks/consolidated";
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
  const [submissionEventFilter, setSubmissionEventFilter] = useState<string>("all");
  const [submissionPostFilter, setSubmissionPostFilter] = useState<string>("all");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>("all");
  const [postTypeFilter, setPostTypeFilter] = useState<string>("all"); // ✅ Filtro único unificado
  const [addSubmissionDialogOpen, setAddSubmissionDialogOpen] = useState(false);
  const [postEventFilter, setPostEventFilter] = useState<string>("all");
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<{ id: string; submissionsCount: number } | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedSubmissionForRejection, setSelectedSubmissionForRejection] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTemplate, setRejectionTemplate] = useState("");
  const [kanbanView, setKanbanView] = useState(false);
  const [auditLogSubmissionId, setAuditLogSubmissionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rejectionTemplatesFromDB, setRejectionTemplatesFromDB] = useState<any[]>([]);
  const [dateFilterStart, setDateFilterStart] = useState<string>("");
  const [dateFilterEnd, setDateFilterEnd] = useState<string>("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [selectedImageForZoom, setSelectedImageForZoom] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [usersCount, setUsersCount] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomSubmissionIndex, setZoomSubmissionIndex] = useState(0);
  const [eventActiveFilter, setEventActiveFilter] = useState<string>("all");
  
  // ✅ Sprint 2B: Usar hooks consolidados ao invés de states locais + chamadas diretas
  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useEventsQuery({
    agencyId: currentAgency?.id,
    includePosts: true,
    enabled: !!user && (isAgencyAdmin || isMasterAdmin)
  });
  
  const { data: submissionsData, isLoading: submissionsLoading, refetch: refetchSubmissions } = useSubmissionsQuery({
    agencyId: currentAgency?.id,
    eventId: submissionEventFilter !== "all" ? submissionEventFilter : undefined,
    enrichProfiles: true,
    enabled: !!user && (isAgencyAdmin || isMasterAdmin) && !!currentAgency
  });
  
  // ✅ Sprint 2B: Usar mutations consolidadas
  const updateStatusMutation = useUpdateSubmissionStatusMutation();
  const deleteEventMutation = useDeleteEventMutation();
  const deleteSubmissionMutation = useDeleteSubmissionMutation();
  
  // Extrair eventos e posts dos dados do hook
  const events = eventsData?.events || [];
  const posts = eventsData?.posts || [];
  const submissions = submissionsData?.data || [];
  const loadingEvents = eventsLoading;
  const loadingSubmissions = submissionsLoading;
  
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

  // 🔧 CORREÇÃO 2: Calcular submissões por evento
  const submissionsByEvent = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(sub => {
      if (sub.post_id) {
        const post = posts.find(p => p.id === sub.post_id);
        if (post?.event_id) {
          counts[post.event_id] = (counts[post.event_id] || 0) + 1;
        }
      }
    });
    return counts;
  }, [submissions, posts]);

  // ✅ ITEM 10: Helper memoizado com useCallback para evitar re-renders
  const getEventTitle = useCallback((post: any): string => {
    // Método 1: Tentar pelo objeto events
    if (post.events?.title) return post.events.title;
    if (Array.isArray(post.events) && post.events[0]?.title) return post.events[0].title;

    // Método 2: Lookup O(1) usando Map
    if (post.event_id) {
      const foundEvent = eventsById.get(post.event_id);
      if (foundEvent) return foundEvent.title;
    }

    return "Evento não encontrado";
  }, [eventsById]);

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
      if (currentAgency.subscription_status === 'trial') {
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

    const channel = sb.channel('agency-logo-updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'agencies',
          filter: `id=eq.${currentAgency.id}`
        }, 
        (payload: any) => {
          console.log('🔄 [Realtime] Agência atualizada:', payload.new);
          if (payload.new.logo_url !== currentAgency.logo_url) {
            console.log('🖼️ [Realtime] Logo atualizado:', payload.new.logo_url);
            setCurrentAgency((prev: any) => ({ ...prev, logo_url: payload.new.logo_url }));
            toast.success("Logo atualizado!");
          }
        }
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
        status: 'approved',
        userId: user?.id || ''
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
        status: 'rejected',
        userId: user?.id || '',
        rejectionReason: rejectionReason || undefined
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
    if (zoomSubmissionIndex < getFilteredSubmissions.length - 1) {
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
        status: newStatus as 'approved' | 'rejected' | 'pending',
        userId: user?.id || ''
      });
      
      refetchSubmissions();
    } catch (error) {
      console.error("Exception:", error);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedSubmissions);
    if (ids.length === 0) {
      toast.error("Selecione pelo menos uma submissão");
      return;
    }

    try {
      // Aprovar todas em paralelo usando a mutation
      await Promise.all(
        ids.map(id => updateStatusMutation.mutateAsync({
          submissionId: id,
          status: 'approved',
          userId: user?.id || ''
        }))
      );
      
      toast.success(`${ids.length} submissões aprovadas com sucesso`);
      refetchSubmissions();
    } catch (error) {
      console.error(error);
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

  // ✅ FASE 2: Filtros memoizados para evitar recálculo desnecessário
  const getFilteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filtro de evento
    if (submissionEventFilter !== "all") {
      filtered = filtered.filter((s: any) => s.posts?.events?.id === submissionEventFilter);
    }

    // Filtro de número da postagem
    if (submissionPostFilter !== "all") {
      filtered = filtered.filter((s: any) => s.posts?.post_number?.toString() === submissionPostFilter);
    }

    // Filtro de status
    if (submissionStatusFilter !== "all") {
      filtered = filtered.filter((s: any) => s.status === submissionStatusFilter);
    }

    // ✅ Filtro único de tipo de postagem (baseado em post_type)
    if (postTypeFilter !== "all") {
      filtered = filtered.filter((s: any) => {
        const postType = s.posts?.post_type || 'divulgacao';
        return postType === postTypeFilter;
      });
    }

    // Filtro de busca (nome, email, Instagram) - usando debounced search
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter((s: any) => {
        const profile = s.profiles || {};
        return (
          profile.full_name?.toLowerCase().includes(search) ||
          profile.email?.toLowerCase().includes(search) ||
          profile.instagram?.toLowerCase().includes(search)
        );
      });
    }

    // Filtro de data inicial
    if (dateFilterStart) {
      filtered = filtered.filter((s: any) => {
        const submitDate = new Date(s.submitted_at);
        const startDate = new Date(dateFilterStart);
        return submitDate >= startDate;
      });
    }

    // Filtro de data final
    if (dateFilterEnd) {
      filtered = filtered.filter((s: any) => {
        const submitDate = new Date(s.submitted_at);
        const endDate = new Date(dateFilterEnd);
        endDate.setHours(23, 59, 59, 999); // Incluir todo o dia final
        return submitDate <= endDate;
      });
    }

    return filtered;
  }, [
    submissions,
    submissionEventFilter,
    submissionPostFilter,
    submissionStatusFilter,
    postTypeFilter,
    debouncedSearch,
    dateFilterStart,
    dateFilterEnd,
  ]);

  const getPaginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return getFilteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [getFilteredSubmissions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(getFilteredSubmissions.length / itemsPerPage);

  // ✅ Item 7: Estatísticas filtradas por agência
  const agencyFilteredStats = useMemo(() => {
    if (!currentAgency) {
      return {
        events: events.length,
        posts: posts.length,
        submissions: submissions.length,
        users: usersCount,
        sales: submissions.filter((s) => s.submission_type === "sale" && s.status === "approved").length,
      };
    }

    const agencyId = currentAgency.id;
    return {
      events: events.filter((e) => e.agency_id === agencyId).length,
      posts: posts.filter((p) => p.agency_id === agencyId).length,
      submissions: submissions.filter((s) => s.agency_id === agencyId).length,
      users: usersCount,
      sales: submissions.filter(
        (s) => s.agency_id === agencyId && s.submission_type === "sale" && s.status === "approved",
      ).length,
    };
  }, [events, posts, submissions, usersCount, currentAgency]);

  // ✅ Item 9: Filtrar eventos por ativo/inativo
  const filteredEvents = useMemo(() => {
    if (eventActiveFilter === "all") return events;
    if (eventActiveFilter === "active") return events.filter((e) => e.is_active === true);
    return events.filter((e) => e.is_active === false);
  }, [events, eventActiveFilter]);

  // ✅ Item 10: Filtrar postagens por evento
  const filteredPosts = useMemo(() => {
    if (postEventFilter === "all") return posts;
    return posts.filter((p) => p.event_id === postEventFilter);
  }, [posts, postEventFilter]);

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
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicar requisitos também
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

      toast.success("Evento duplicado com sucesso! Você pode editá-lo agora.");
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
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base px-4 py-2">
                Plano: {currentAgency.subscription_plan?.toUpperCase() || "BASIC"}
              </Badge>
              <Button
                onClick={async () => {
                  try {
                    const { data, error } = await sb.functions.invoke('create-checkout-session', {
                      body: { planKey: 'basic' }
                    });
                    if (error) throw error;
                    if (data?.url) {
                      window.open(data.url, '_blank');
                    }
                  } catch (error) {
                    console.error('Erro ao abrir checkout:', error);
                    toast.error('Erro ao abrir página de assinatura');
                  }
                }}
                variant="outline"
                size="sm"
                className="font-semibold"
              >
                {trialInfo?.inTrial ? "Assinar Agora" : "Gerenciar Assinatura"}
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
                    Você tem <strong>{trialInfo.daysRemaining} dia{trialInfo.daysRemaining !== 1 ? 's' : ''}</strong> restante{trialInfo.daysRemaining !== 1 ? 's' : ''} para testar gratuitamente!
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/#precos'}
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
                onClick={() => window.location.href = '/#precos'}
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
                  const message = encodeURIComponent(`Olá! Preciso de suporte - Agência: ${currentAgency?.name || 'Sem nome'}`);
                  window.open(`https://wa.me/5511999136884?text=${message}`, '_blank');
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
        <Tabs defaultValue="events" className="space-y-6">
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
                {isReadOnly && (
                  <span className="text-xs text-red-500">⚠️ Assine para editar</span>
                )}
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
                            📊 {submissionsByEvent[event.id] || 0} submissões | Requisitos: {event.required_posts} posts, {event.required_sales} vendas
                          </p>
                          {event.event_slug ? (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md border">
                              <span className="text-xs font-mono text-muted-foreground">🔗 {event.event_slug}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyEventUrl(currentAgency?.slug || '', event.event_slug!)}
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
                <h2 className="text-2xl font-bold">Gerenciar Postagens</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                  {isReadOnly && (
                    <span className="text-xs text-red-500">⚠️ Assine para editar</span>
                  )}
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
                          <Badge variant="outline">{eventPosts.length} post{eventPosts.length > 1 ? 's' : ''}</Badge>
                        </div>
                        
                        {/* Lista de posts do evento */}
                        <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                          {eventPosts
                            .sort((a, b) => a.post_number - b.post_number)
                            .map((post) => (
                              <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold">{formatPostName(post.post_type, post.post_number)}</h4>
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
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Submissões de Usuários</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {getFilteredSubmissions.length} submiss{getFilteredSubmissions.length === 1 ? "ão" : "ões"}
                    {submissionEventFilter !== "all" && <span className="text-xs ml-1">(filtrado por evento)</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setKanbanView(!kanbanView)}>
                    <Columns3 className="mr-2 h-4 w-4" />
                    {kanbanView ? "Ver Lista" : "Ver Kanban"}
                  </Button>
                </div>
              </div>

              {/* Filtros sempre visíveis */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <Select
                    value={submissionEventFilter}
                    onValueChange={(v) => {
                      setSubmissionEventFilter(v);
                      setSubmissionPostFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Selecione um evento</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={submissionPostFilter}
                    onValueChange={(v) => {
                      setSubmissionPostFilter(v);
                      setCurrentPage(1);
                    }}
                    disabled={submissionEventFilter === "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Número da postagem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os números</SelectItem>
                      {getAvailablePostNumbers().map((num) => {
                        // Buscar post_type das submissions filtradas
                        const submission = submissions.find(
                          s => (s.posts as any)?.post_number === num &&
                          (submissionEventFilter === "all" || (s.posts as any)?.events?.id === submissionEventFilter)
                        );
                        const postType = (submission?.posts as any)?.post_type || null;
                        return (
                          <SelectItem key={num} value={num.toString()}>
                            {formatPostName(postType, num)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select
                    value={submissionStatusFilter}
                    onValueChange={(v) => {
                      setSubmissionStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    disabled={submissionEventFilter === "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Aguardando aprovação</SelectItem>
                      <SelectItem value="approved">Aprovados</SelectItem>
                      <SelectItem value="rejected">Reprovados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={postTypeFilter}
                    onValueChange={(v) => {
                      setPostTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    disabled={submissionEventFilter === "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de Postagem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="divulgacao">📢 Divulgação</SelectItem>
                      <SelectItem value="venda">💰 Vendas</SelectItem>
                      <SelectItem value="selecao_perfil">🎯 Seleção de Perfil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {submissionEventFilter !== "all" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const XLSX = await import("xlsx");

                          // Aplicar TODOS os filtros ativos
                          let filteredSubmissions = getFilteredSubmissions;

                          if (!filteredSubmissions || filteredSubmissions.length === 0) {
                            toast.error("Nenhuma submissão encontrada com os filtros aplicados");
                            return;
                          }

                          // Buscar dados completos das submissões filtradas
                          const submissionIds = filteredSubmissions.map((s) => s.id);

                          if (submissionIds.length === 0) {
                            toast.error("Nenhuma submissão disponível para exportar");
                            return;
                          }

                          // 🔧 CORREÇÃO 1: Buscar submissions e profiles separadamente
                          const { data: submissionsData, error: submissionsError } = await sb
                            .from("submissions")
                            .select("*")
                            .in("id", submissionIds);

                          if (submissionsError) {
                            console.error("❌ Erro ao buscar submissões:", submissionsError);
                            toast.error("Erro ao buscar submissões");
                            return;
                          }

                          // Buscar perfis dos usuários
                          const userIds = [...new Set(submissionsData.map(s => s.user_id))];
                          const { data: profilesData } = await sb
                            .from("profiles")
                            .select("id, full_name, instagram, email, gender, followers_range")
                            .in("id", userIds);

                          // Criar map de profiles
                          const profilesMap: Record<string, any> = {};
                          (profilesData || []).forEach(profile => {
                            profilesMap[profile.id] = profile;
                          });

                          // Enriquecer submissions com profiles
                          const enrichedSubmissions = submissionsData.map(sub => ({
                            ...sub,
                            profiles: profilesMap[sub.user_id] || {
                              full_name: 'Usuário Desconhecido',
                              instagram: null,
                              email: null,
                              gender: null,
                              followers_range: null
                            }
                          }));

                          // 🔧 ITEM 7: Buscar informações de posts com query robusta
                          let postsMap: Record<string, any> = {};
                          
                          if (submissionIds.length > 0) {
                            console.log('🔍 Buscando posts para', submissionIds.length, 'submissões');
                            
                            // Passo 1: Buscar post_ids das submissões
                            const { data: submissionsWithPosts, error: postsIdsError } = await sb
                              .from("submissions")
                              .select("id, post_id")
                              .in("id", submissionIds)
                              .not('post_id', 'is', null);

                            if (postsIdsError) {
                              console.error('Erro ao buscar post_ids:', postsIdsError);
                            } else {
                              const postIds = (submissionsWithPosts || []).map((s: any) => s.post_id).filter(Boolean);
                              
                              if (postIds.length > 0) {
                                // Passo 2: Buscar dados dos posts
                                const { data: postsData, error: postsError } = await sb
                                  .from("posts")
                                  .select(`
                                    id,
                                    post_number,
                                    event_id,
                                    events (
                                      title
                                    )
                                  `)
                                  .in("id", postIds);

                                if (postsError) {
                                  console.error('Erro ao buscar posts:', postsError);
                                } else {
                                  // Criar map de post_id → post_data
                                  const postsDataMap: Record<string, any> = {};
                                  (postsData || []).forEach((post: any) => {
                                    if (post?.id) {
                                      postsDataMap[post.id] = {
                                        post_number: post.post_number || 0,
                                        event_title: post.events?.title || 'Evento Desconhecido'
                                      };
                                    }
                                  });

                                  // Criar map de submission_id → post_data
                                  (submissionsWithPosts || []).forEach((item: any) => {
                                    if (item?.id && item?.post_id && postsDataMap[item.post_id]) {
                                      postsMap[item.id] = postsDataMap[item.post_id];
                                    }
                                  });

                                  console.log('✅ Posts carregados:', {
                                    submissionsTotal: submissionIds.length,
                                    postsEncontrados: Object.keys(postsDataMap).length,
                                    submissoesComPosts: Object.keys(postsMap).length
                                  });
                                }
                              }
                            }
                          }

                          console.log("📊 Posts mapeados:", Object.keys(postsMap).length, "de", submissionIds.length);

                          // Preparar dados para exportação usando enrichedSubmissions
                          const exportData = (enrichedSubmissions || []).map((sub: any) => {
                            // 🔧 Buscar post data com validação extra
                            const eventTitle = postsMap[sub.id]?.event_title || 'Evento não identificado';
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
                              Status:
                                sub.status === "approved"
                                  ? "Aprovado"
                                  : sub.status === "rejected"
                                    ? "Rejeitado"
                                    : "Pendente",
                              "Data de Envio": new Date(sub.submitted_at).toLocaleString("pt-BR"),
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
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Submissões
                    </Button>
                    <Button
                      onClick={() => setAddSubmissionDialogOpen(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Submissão Manual
                    </Button>
                  </>
                )}
              </div>

              {kanbanView ? (
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SubmissionKanban submissions={getFilteredSubmissions as any} onUpdate={refetchSubmissions} userId={user?.id} />
                </Suspense>
              ) : submissionEventFilter === "all" ? (
                <Card className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold mb-2">Selecione um evento acima</p>
                    <p className="text-sm">Escolha um evento nos filtros para visualizar as submissões</p>
                  </div>
                </Card>
              ) : loadingSubmissions ? (
                <Card className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando submissões...</p>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {selectedSubmissions.size > 0 && (
                      <Button onClick={handleBulkApprove} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Aprovar {selectedSubmissions.size}
                      </Button>
                    )}

                    {/* Busca e paginação */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <Input
                        placeholder="Buscar por nome, email ou Instagram..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="max-w-sm"
                      />
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => {
                          setItemsPerPage(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 por página</SelectItem>
                          <SelectItem value="30">30 por página</SelectItem>
                          <SelectItem value="50">50 por página</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtros por data */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Label className="text-sm mb-1">Data Inicial</Label>
                        <Input
                          type="date"
                          value={dateFilterStart}
                          onChange={(e) => {
                            setDateFilterStart(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm mb-1">Data Final</Label>
                        <Input
                          type="date"
                          value={dateFilterEnd}
                          onChange={(e) => {
                            setDateFilterEnd(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                      {(dateFilterStart || dateFilterEnd) && (
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDateFilterStart("");
                              setDateFilterEnd("");
                              setCurrentPage(1);
                            }}
                          >
                            Limpar Datas
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Card className="p-6">
                    {getFilteredSubmissions.length === 0 ? (
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
                                        <p className="text-xs text-muted-foreground text-center mt-1">
                                          Print do Perfil
                                        </p>
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
                                            href={`https://instagram.com/${submission.profiles.instagram.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-primary mt-1 hover:underline cursor-pointer inline-block"
                                          >
                                            {submission.profiles.instagram.startsWith('@') ? submission.profiles.instagram : `@${submission.profiles.instagram}`}
                                          </a>
                                        )}
                                      </div>
                                      <div className="sm:text-right">
                                        <div className="flex flex-col sm:items-end gap-1">
                                          {submission.submission_type === "sale" ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 font-medium">
                                                💰 {formatPostName('venda', 0)}
                                              </span>
                                            </div>
                                          ) : (
                                            <p className="text-sm font-medium">
                                              {formatPostName(submission.posts?.post_type, submission.posts?.post_number || 0)}
                                            </p>
                                          )}
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
                              {Math.min(currentPage * itemsPerPage, getFilteredSubmissions.length)} de{" "}
                              {getFilteredSubmissions.length} submissões
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
            </div>
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
      {getFilteredSubmissions.length > 0 && (
        <SubmissionZoomDialog
          open={zoomDialogOpen}
          onOpenChange={setZoomDialogOpen}
          submission={getFilteredSubmissions[zoomSubmissionIndex] as any}
          onApprove={handleApproveSubmission}
          onReject={handleRejectSubmission}
          onNext={handleZoomNext}
          onPrevious={handleZoomPrevious}
          hasNext={zoomSubmissionIndex < getFilteredSubmissions.length - 1}
          hasPrevious={zoomSubmissionIndex > 0}
        />
      )}
    </div>
  );
};

export default Admin;
