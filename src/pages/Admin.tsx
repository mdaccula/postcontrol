import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Plus, Send, Pencil, Check, X, CheckCheck, Trash2, Copy, Columns3, Building2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate, Link } from "react-router-dom";
// M2: Lazy loading de componentes pesados
const EventDialog = lazy(() => import("@/components/EventDialog").then(m => ({ default: m.EventDialog })));
const PostDialog = lazy(() => import("@/components/PostDialog").then(m => ({ default: m.PostDialog })));
const AddManualSubmissionDialog = lazy(() => import("@/components/AddManualSubmissionDialog").then(m => ({ default: m.AddManualSubmissionDialog })));
const DashboardStats = lazy(() => import("@/components/DashboardStats").then(m => ({ default: m.DashboardStats })));
const UserPerformance = lazy(() => import("@/components/UserPerformance").then(m => ({ default: m.UserPerformance })));
const UserManagement = lazy(() => import("@/components/UserManagement").then(m => ({ default: m.UserManagement })));
const AdminSettings = lazy(() => import("@/components/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AgencyAdminSettings = lazy(() => import("@/components/AgencyAdminSettings").then(m => ({ default: m.AgencyAdminSettings })));
const AdminTutorialGuide = lazy(() => import("@/components/AdminTutorialGuide").then(m => ({ default: m.AdminTutorialGuide })));
const SubmissionKanban = lazy(() => import("@/components/SubmissionKanban").then(m => ({ default: m.SubmissionKanban })));
const SubmissionAuditLog = lazy(() => import("@/components/SubmissionAuditLog").then(m => ({ default: m.SubmissionAuditLog })));
const SubmissionComments = lazy(() => import("@/components/SubmissionComments").then(m => ({ default: m.SubmissionComments })));
const SubmissionImageDisplay = lazy(() => import("@/components/SubmissionImageDisplay").then(m => ({ default: m.SubmissionImageDisplay })));
import { SubmissionZoomDialog } from "@/components/SubmissionZoomDialog";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const Admin = () => {
  const { user, isAgencyAdmin, isMasterAdmin, loading, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [currentAgency, setCurrentAgency] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionEventFilter, setSubmissionEventFilter] = useState<string>("all");
  const [submissionPostFilter, setSubmissionPostFilter] = useState<string>("all");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>("all");
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState<string>("all");
  const [eventPurposeFilter, setEventPurposeFilter] = useState<string>("all");
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
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [zoomSubmissionIndex, setZoomSubmissionIndex] = useState(0);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!loading && (!user || (!isAgencyAdmin && !isMasterAdmin))) {
      navigate('/dashboard');
      toast.error("Acesso negado. Você não tem permissão para acessar esta página.");
    }
  }, [user, isAgencyAdmin, isMasterAdmin, loading, navigate]);

  // Handle Master Admin viewing specific agency via querystring agencyId
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const agencyId = urlParams.get('agencyId');
    
    if (agencyId && isMasterAdmin) {
      loadAgencyById(agencyId);
    }
  }, [isMasterAdmin]);

  const loadAgencyById = async (id: string) => {
    const { data } = await sb
      .from('agencies')
      .select('id, name, slug')
      .eq('id', id)
      .maybeSingle();
    
    if (data) {
      setCurrentAgency(data);
      console.log('🏢 Master Admin visualizando agência:', data.name);
    }
  };

  useEffect(() => {
    // Detect agency from URL query param (legacy support for slug)
    const urlParams = new URLSearchParams(window.location.search);
    const agencySlug = urlParams.get('agency');
    
    if (agencySlug && (isAgencyAdmin || isMasterAdmin)) {
      loadAgencyBySlug(agencySlug);
    }
  }, [isAgencyAdmin, isMasterAdmin]);

  useEffect(() => {
    if (user && (isAgencyAdmin || isMasterAdmin)) {
      loadCurrentAgency();
      loadEvents();
      loadRejectionTemplates();
      loadUsersCount();
    }
  }, [user, isAgencyAdmin, isMasterAdmin]);

  useEffect(() => {
    if (currentAgency) {
      loadUsersCount();
    }
  }, [currentAgency]);

  // Carregar submissions apenas quando um evento específico for selecionado
  useEffect(() => {
    if (user && (isAgencyAdmin || isMasterAdmin) && submissionEventFilter !== "all") {
      loadSubmissions();
    }
  }, [submissionEventFilter, user, isAgencyAdmin, isMasterAdmin]);

  const loadCurrentAgency = async () => {
    if (!user) return;

    // Load user profile
    const { data: profileData } = await sb
      .from('profiles')
      .select('*, agencies(*)')
      .eq('id', user.id)
      .maybeSingle();
    
    setProfile(profileData);

    // If master admin and viewing specific agency, use query param
    const urlParams = new URLSearchParams(window.location.search);
    const agencySlug = urlParams.get('agency');
    
    if (agencySlug) {
      const { data } = await sb
        .from('agencies')
        .select('*')
        .eq('slug', agencySlug)
        .maybeSingle();
      
      console.log('🏢 Loaded agency from URL:', data);
      setCurrentAgency(data);
      return;
    }

    // If agency admin, load their own agency
    if (isAgencyAdmin && !isMasterAdmin && profileData?.agencies) {
      console.log('🏢 Agency admin profile:', profileData.agencies);
      setCurrentAgency(profileData.agencies);
    }
  };

  const loadAgencyBySlug = async (slug: string) => {
    const { data } = await sb
      .from('agencies')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();
    
    setCurrentAgency(data);
  };

  const loadRejectionTemplates = async () => {
    const { data } = await sb.from('rejection_templates').select('*').order('title');
    setRejectionTemplatesFromDB(data || []);
  };

  const loadUsersCount = async () => {
    if (!user) return;

    let agencyIdFilter = null;

    const urlParams = new URLSearchParams(window.location.search);
    const queryAgencyId = urlParams.get('agencyId');

    if (queryAgencyId && isMasterAdmin) {
      agencyIdFilter = queryAgencyId;
    } else if (isMasterAdmin && !currentAgency) {
      agencyIdFilter = null;
    } else if (currentAgency) {
      agencyIdFilter = currentAgency.id;
    } else if (isAgencyAdmin) {
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();
      
      agencyIdFilter = profileData?.agency_id;
    }

    let countQuery = sb
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (agencyIdFilter) {
      countQuery = countQuery.eq('agency_id', agencyIdFilter);
    }

    const { count } = await countQuery;
    setUsersCount(count || 0);
  };

  const loadEvents = async () => {
    if (!user) return;

    let agencyIdFilter = null;

    // Check if Master Admin is viewing specific agency via agencyId querystring
    const urlParams = new URLSearchParams(window.location.search);
    const queryAgencyId = urlParams.get('agencyId');

    // Determine which agency's data to load
    if (queryAgencyId && isMasterAdmin) {
      // Master Admin viewing specific agency by ID
      agencyIdFilter = queryAgencyId;
      console.log('👑 Master Admin visualizando agência específica:', agencyIdFilter);
    } else if (isMasterAdmin && !currentAgency) {
      // Master admin without specific agency = see all data
      agencyIdFilter = null;
      console.log('👑 Master Admin - Visualizando todos os dados');
    } else if (currentAgency) {
      // Viewing specific agency (master admin or agency admin)
      agencyIdFilter = currentAgency.id;
      console.log('🏢 Visualizando agência:', currentAgency.name);
    } else if (isAgencyAdmin) {
      // Agency admin - load their own agency
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();
      
      agencyIdFilter = profileData?.agency_id;
      
      if (!agencyIdFilter) {
        console.error('❌ Agency Admin sem agency_id');
        toast.error("Erro: Usuário não está associado a nenhuma agência.");
        return;
      }
      console.log('👤 Agency Admin - agency_id:', agencyIdFilter);
    }

    console.log('🔍 DEBUG ISOLAMENTO:', {
      userId: user.id,
      isMasterAdmin,
      isAgencyAdmin,
      agencyIdFilter,
      queryAgencyId,
      currentAgency: currentAgency?.name
    });

    // Load events
    let eventsQuery = sb.from('events').select('*');
    if (agencyIdFilter) {
      eventsQuery = eventsQuery.eq('agency_id', agencyIdFilter);
    }
    const { data: eventsData } = await eventsQuery.order('created_at', { ascending: false });
    
    // Load posts
    let postsQuery = sb.from('posts').select('*, events(title)');
    if (agencyIdFilter) {
      postsQuery = postsQuery.eq('agency_id', agencyIdFilter);
    }
    const { data: postsData } = await postsQuery.order('created_at', { ascending: false });

    setEvents(eventsData || []);
    setPosts(postsData || []);
  };

  const loadSubmissions = async () => {
    if (!user) return;

    setLoadingSubmissions(true);

    let agencyIdFilter = null;

    // Check if Master Admin is viewing specific agency via agencyId querystring
    const urlParams = new URLSearchParams(window.location.search);
    const queryAgencyId = urlParams.get('agencyId');

    // Determine which agency's data to load
    if (queryAgencyId && isMasterAdmin) {
      agencyIdFilter = queryAgencyId;
    } else if (isMasterAdmin && !currentAgency) {
      agencyIdFilter = null;
    } else if (currentAgency) {
      agencyIdFilter = currentAgency.id;
    } else if (isAgencyAdmin) {
      const { data: profileData } = await sb
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();
      
      agencyIdFilter = profileData?.agency_id;
    }
    
    // Load submissions via posts.agency_id (LEFT JOIN para incluir vendas)
    let submissionsQuery = sb
      .from('submissions')
      .select(`
        *,
        posts(
          post_number, 
          deadline, 
          event_id, 
          agency_id, 
          events(title, id, event_purpose)
        )
      `);
    
    if (agencyIdFilter) {
      submissionsQuery = submissionsQuery.eq('posts.agency_id', agencyIdFilter);
    }
    
    const { data: submissionsData } = await submissionsQuery
      .order('submitted_at', { ascending: false });

    // Buscar perfis em lote (admins têm permissão para ver todos)
    const userIds = Array.from(new Set((submissionsData || []).map((s: any) => s.user_id)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profilesData } = await sb
        .from('profiles')
        .select('id, full_name, email, instagram')
        .in('id', userIds);
      (profilesData || []).forEach((p: any) => { profilesById[p.id] = p; });
    }

    // Contar postagens por usuário
    const countsById: Record<string, number> = {};
    await Promise.all(userIds.map(async (uid: string) => {
      const { count } = await sb
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);
      countsById[uid as string] = count || 0;
    }));

    // Gerar signed URLs para os screenshots
    const submissionsWithSignedUrls = await Promise.all((submissionsData || []).map(async (s: any) => {
      let signedUrl = s.screenshot_url;
      if (s.screenshot_url) {
        const path = s.screenshot_url.split('/screenshots/')[1];
        if (path) {
          const { data } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(path, 31536000); // 1 year
          if (data?.signedUrl) {
            signedUrl = data.signedUrl;
          }
        }
      }
      return {
        ...s,
        screenshot_url: signedUrl,
        profiles: profilesById[s.user_id] || null,
        total_submissions: countsById[s.user_id] || 0,
      };
    }));

    setSubmissions(submissionsWithSignedUrls);
    setSelectedSubmissions(new Set());
    setLoadingSubmissions(false);
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      console.log('Aprovando submissão:', submissionId);
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', submissionId)
        .select();

      console.log('Resultado da aprovação:', { data, error });

      if (error) {
        toast.error("Erro ao aprovar submissão");
        console.error('Erro detalhado:', error);
      } else {
        toast.success("Submissão aprovada com sucesso");
        
        // Confetti ao aprovar
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        await loadSubmissions();
      }
    } catch (error) {
      toast.error("Erro ao aprovar submissão");
      console.error('Exception:', error);
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    setSelectedSubmissionForRejection(submissionId);
    setRejectionReason("");
    setRejectionTemplate("");
    setRejectionDialogOpen(true);
  };

  // Linhas 436-481
const confirmRejection = async () => {
  if (!selectedSubmissionForRejection) return;
  
  setLoadingSubmissions(true);
  
  try {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason || undefined,
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      })
      .eq('id', selectedSubmissionForRejection)
      .select();

    if (error) {
      toast.error("Erro ao rejeitar submissão");
      console.error('Erro detalhado:', error);
      setLoadingSubmissions(false);
      return;
    }
    
    // Recarregar dados antes de fechar
    await loadSubmissions();
    
    // Fechar diálogo após sucesso
    setRejectionDialogOpen(false);
    setSelectedSubmissionForRejection(null);
    setRejectionReason("");
    setRejectionTemplate("");
    
    toast.success("Submissão rejeitada com sucesso");
  } catch (error) {
    toast.error("Erro ao rejeitar submissão");
    console.error('Exception:', error);
  } finally {
    setLoadingSubmissions(false);
  }
};

  // Funções de navegação do zoom
  const handleOpenZoom = (submissionId: string) => {
    const filtered = getFilteredSubmissions();
    const index = filtered.findIndex(s => s.id === submissionId);
    if (index !== -1) {
      setZoomSubmissionIndex(index);
      setZoomDialogOpen(true);
    }
  };

  const handleZoomNext = () => {
    const filtered = getFilteredSubmissions();
    if (zoomSubmissionIndex < filtered.length - 1) {
      setZoomSubmissionIndex(prev => prev + 1);
    }
  };

  const handleZoomPrevious = () => {
    if (zoomSubmissionIndex > 0) {
      setZoomSubmissionIndex(prev => prev - 1);
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
      console.log('Alterando status:', submissionId, newStatus);
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status: newStatus,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', submissionId)
        .select();

      console.log('Resultado da alteração:', { data, error });

      if (error) {
        toast.error("Erro ao alterar status");
        console.error('Erro detalhado:', error);
      } else {
        toast.success(`Status alterado para ${newStatus === 'approved' ? 'aprovado' : newStatus === 'rejected' ? 'rejeitado' : 'pendente'}`);
        await loadSubmissions();
      }
    } catch (error) {
      toast.error("Erro ao alterar status");
      console.error('Exception:', error);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedSubmissions);
    if (ids.length === 0) {
      toast.error("Selecione pelo menos uma submissão");
      return;
    }

    const { error } = await sb
      .from('submissions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id
      })
      .in('id', ids);

    if (error) {
      toast.error("Erro ao aprovar submissões em massa");
      console.error(error);
    } else {
      toast.success(`${ids.length} submissões aprovadas com sucesso`);
      await loadSubmissions();
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
    const paginated = getPaginatedSubmissions();
    if (selectedSubmissions.size === paginated.length && paginated.length > 0) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(paginated.map((s: any) => s.id)));
    }
  };

  const getFilteredSubmissions = () => {
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

    // Filtro de tipo de submissão
    if (submissionTypeFilter !== "all") {
      filtered = filtered.filter((s: any) => s.submission_type === submissionTypeFilter);
    }

    // Filtro de propósito do evento
    if (eventPurposeFilter !== "all") {
      filtered = filtered.filter((s: any) => s.posts?.events?.event_purpose === eventPurposeFilter);
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
  };

  const getPaginatedSubmissions = () => {
    const filtered = getFilteredSubmissions();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(getFilteredSubmissions().length / itemsPerPage);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await sb
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success("Evento excluído com sucesso");
      await loadEvents();
      setEventToDelete(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleDuplicateEvent = async (event: any) => {
    try {
      const { data: newEvent, error } = await sb
        .from('events')
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
      const { data: requirements } = await sb
        .from('event_requirements')
        .select('*')
        .eq('event_id', event.id);

      if (requirements && requirements.length > 0) {
        const newRequirements = requirements.map((req: any) => ({
          event_id: newEvent.id,
          required_posts: req.required_posts,
          required_sales: req.required_sales,
          description: req.description,
          display_order: req.display_order,
        }));

        await sb.from('event_requirements').insert(newRequirements);
      }

      toast.success("Evento duplicado com sucesso! Você pode editá-lo agora.");
      await loadEvents();
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast.error("Erro ao duplicar evento");
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      // Deletar todas as submissões associadas primeiro
      const { error: submissionsError } = await sb
        .from('submissions')
        .delete()
        .eq('post_id', postToDelete.id);

      if (submissionsError) throw submissionsError;

      // Depois deletar o post
      const { error: postError } = await sb
        .from('posts')
        .delete()
        .eq('id', postToDelete.id);

      if (postError) throw postError;

      const submissionsText = postToDelete.submissionsCount === 1 
        ? "1 submissão foi deletada" 
        : `${postToDelete.submissionsCount} submissões foram deletadas`;
      
      toast.success(`Postagem deletada com sucesso${postToDelete.submissionsCount > 0 ? `. ${submissionsText}` : ''}`);
      await loadEvents();
      await loadSubmissions();
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error("Erro ao deletar postagem");
    }
  };

  const handleDeletePostClick = async (postId: string) => {
    // Verificar quantas submissões estão associadas
    const { data: submissions, count } = await sb
      .from('submissions')
      .select('id', { count: 'exact', head: false })
      .eq('post_id', postId);

    setPostToDelete({ 
      id: postId, 
      submissionsCount: count || 0 
    });
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    try {
      const { error } = await sb
        .from('submissions')
        .delete()
        .eq('id', submissionToDelete);

      if (error) throw error;

      toast.success("Submissão deletada com sucesso");
      await loadSubmissions();
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error("Erro ao deletar submissão");
    }
  };

  const getAvailablePostNumbers = () => {
    const filtered = submissions.filter((s: any) => 
      submissionEventFilter === "all" || s.posts?.events?.id === submissionEventFilter
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
          <div>
            <h2 className="text-xl font-bold">
              {profile?.full_name || 'Admin'}
            </h2>
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
          {currentAgency && (
            <Badge variant="secondary" className="text-base px-4 py-2">
              Plano: {currentAgency.subscription_plan?.toUpperCase() || 'BASIC'}
            </Badge>
          )}
        </div>
      </div>

      {/* Agency Filter Indicator */}
      {currentAgency && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Visualizando dados de:</p>
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {currentAgency.name}
                </h3>
              </div>
              {isMasterAdmin && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigate('/master-admin');
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
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Painel Agência
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Link to="/submit" className="flex-1 sm:flex-initial">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Postagem
                </Button>
              </Link>
              <Button variant="outline" onClick={signOut} className="flex-1 sm:flex-initial">Sair</Button>
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
                <p className="text-sm text-muted-foreground">Eventos Ativos</p>
                <p className="text-2xl font-bold">{events.length}</p>
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
                <p className="text-2xl font-bold">{posts.length}</p>
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
                <p className="text-2xl font-bold">{submissions.length}</p>
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
                <p className="text-2xl font-bold">{usersCount}</p>
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
                <p className="text-2xl font-bold">
                  {submissions.filter(s => s.submission_type === 'sale' && s.status === 'approved').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 h-auto">
            <TabsTrigger value="events" className="text-xs sm:text-sm py-2">Eventos</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">Postagens</TabsTrigger>
            <TabsTrigger id="submissions-tab" value="submissions" className="text-xs sm:text-sm py-2">Submissões</TabsTrigger>
            <TabsTrigger id="users-tab" value="users" className="text-xs sm:text-sm py-2">Usuários</TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2">Dashboard</TabsTrigger>
            <TabsTrigger id="settings-tab" value="settings" className="text-xs sm:text-sm py-2">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Gerenciar Eventos</h2>
              <Button id="create-event-button" className="bg-gradient-primary w-full sm:w-auto" onClick={() => {
                setSelectedEvent(null);
                setEventDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </div>

            <Card className="p-6">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum evento cadastrado ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 w-full">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          {event.event_date && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📅 {new Date(event.event_date).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-sm text-muted-foreground">📍 {event.location}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            📊 Requisitos: {event.required_posts} posts, {event.required_sales} vendas
                          </p>
                          {event.description && (
                            <p className="text-muted-foreground mt-2">{event.description}</p>
                          )}
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
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateEvent(event)}
                            className="flex-1 sm:flex-initial"
                            title="Duplicar evento"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEventToDelete(event.id)}
                            className="text-destructive hover:text-destructive flex-1 sm:flex-initial"
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
                  <Button className="bg-gradient-primary w-full sm:w-auto" onClick={() => {
                    setSelectedPost(null);
                    setPostDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Postagem
                  </Button>
                </div>
              </div>
            </div>

            <Card className="p-6">
              {posts.filter((p) => postEventFilter === "all" || p.event_id === postEventFilter).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {postEventFilter === "all" ? "Nenhuma postagem cadastrada ainda" : "Nenhuma postagem para este evento"}
                </p>
              ) : (
                <div className="space-y-4">
                  {posts.filter((p) => postEventFilter === "all" || p.event_id === postEventFilter).map((post) => (
                    <Card key={post.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">Postagem #{post.post_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            Evento: {post.events?.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Prazo: {new Date(post.deadline).toLocaleString('pt-BR')}
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
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePostClick(post.id)}
                            className="text-destructive hover:text-destructive"
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

          <TabsContent value="submissions" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Submissões de Usuários</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKanbanView(!kanbanView)}
                >
                  <Columns3 className="mr-2 h-4 w-4" />
                  {kanbanView ? "Ver Lista" : "Ver Kanban"}
                </Button>
              </div>

              {/* Filtros sempre visíveis */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <Select value={submissionEventFilter} onValueChange={(v) => {
                    setSubmissionEventFilter(v);
                    setSubmissionPostFilter("all");
                    setCurrentPage(1);
                  }}>
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
                      {getAvailablePostNumbers().map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          Postagem #{num}
                        </SelectItem>
                      ))}
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select 
                    value={submissionTypeFilter} 
                    onValueChange={(v) => {
                      setSubmissionTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    disabled={submissionEventFilter === "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de Submissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="post">📸 Postagens</SelectItem>
                      <SelectItem value="sale">💰 Vendas</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={eventPurposeFilter} 
                    onValueChange={(v) => {
                      setEventPurposeFilter(v);
                      setCurrentPage(1);
                    }}
                    disabled={submissionEventFilter === "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Propósito do Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os propósitos</SelectItem>
                      <SelectItem value="divulgacao">📢 Divulgação</SelectItem>
                      <SelectItem value="selecao_perfil">👤 Seleção de Perfil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {submissionEventFilter !== "all" && (
                  <Button 
                    onClick={() => setAddSubmissionDialogOpen(true)}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Submissão Manual
                  </Button>
                )}
              </div>

              {kanbanView ? (
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SubmissionKanban 
                    submissions={getFilteredSubmissions()} 
                    onUpdate={loadSubmissions}
                    userId={user?.id}
                  />
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
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}>
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
                {getFilteredSubmissions().length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma submissão encontrada com os filtros selecionados
                  </p>
                ) : (
                  <>
                    <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-4 border-b">
                      <Checkbox
                        checked={selectedSubmissions.size === getPaginatedSubmissions().length && getPaginatedSubmissions().length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        Selecionar todos desta página ({getPaginatedSubmissions().length})
                      </span>
                    </div>
                    {getPaginatedSubmissions().map((submission: any) => (
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
                                  {submission.profiles?.full_name || 'Nome não disponível'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {submission.profiles?.email || 'Email não disponível'}
                                </p>
                                {submission.profiles?.instagram && (
                                  <p className="text-sm font-medium text-primary mt-1">
                                    @{submission.profiles.instagram}
                                  </p>
                                )}
                              </div>
                              <div className="sm:text-right">
                                <div className="flex flex-col sm:items-end gap-1">
                                  {submission.submission_type === "sale" ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 font-medium">
                                        💰 Comprovante de Venda
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium">
                                      Postagem #{submission.posts?.post_number}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {submission.posts?.events?.title}
                                  </p>
                                </div>
                                <div className="mt-2">
                                  {submission.status === 'pending' && (
                                    <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">
                                      Aguardando
                                    </span>
                                  )}
                                  {submission.status === 'approved' && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
                                      Aprovado
                                    </span>
                                  )}
                                  {submission.status === 'rejected' && (
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
                                    {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Prazo da Postagem:</p>
                                  <p className="font-medium">
                                    {submission.posts?.deadline 
                                      ? new Date(submission.posts.deadline).toLocaleString('pt-BR')
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total de Postagens:</p>
                                  <p className="font-medium text-primary">
                                    {submission.total_submissions} postagem{submission.total_submissions !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <label className="text-sm text-muted-foreground mb-1 block">Status da Submissão:</label>
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

                            {submission.status === 'pending' && (
                              <div className="border-t pt-3 flex flex-col sm:flex-row gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                                  onClick={() => handleApproveSubmission(submission.id)}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Aprovar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="w-full sm:w-auto"
                                  onClick={() => handleRejectSubmission(submission.id)}
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
                                onCommentAdded={loadSubmissions}
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
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, getFilteredSubmissions().length)} de {getFilteredSubmissions().length} submissões
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
              <UserManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <Tabs defaultValue="events-stats" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-2 gap-1 h-auto">
                <TabsTrigger value="events-stats" className="text-xs sm:text-sm whitespace-normal py-2">Estatísticas por Evento</TabsTrigger>
                <TabsTrigger value="user-performance" className="text-xs sm:text-sm whitespace-normal py-2">Desempenho por Usuário</TabsTrigger>
              </TabsList>

              <TabsContent value="events-stats">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <DashboardStats />
                </Suspense>
              </TabsContent>

              <TabsContent value="user-performance">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <UserPerformance />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              {isMasterAdmin ? (
                <AdminSettings isMasterAdmin={true} />
              ) : (
                <AgencyAdminSettings />
              )}
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
            loadEvents();
            if (submissionEventFilter !== "all") loadSubmissions();
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
            loadEvents();
            if (submissionEventFilter !== "all") loadSubmissions();
          }}
          post={selectedPost}
        />
      </Suspense>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Submissão</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para que o usuário possa corrigir
            </DialogDescription>
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
                    const template = rejectionTemplatesFromDB.find(t => t.id === value);
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
            <DialogDescription>
              Visualize todas as mudanças de status desta submissão
            </DialogDescription>
          </DialogHeader>
          
          {auditLogSubmissionId && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <SubmissionAuditLog submissionId={auditLogSubmissionId} />
            </Suspense>
          )}

          <DialogFooter>
            <Button onClick={() => setAuditLogSubmissionId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento e todos os seus dados relacionados serão permanentemente excluídos.
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
              Excluir {postToDelete && postToDelete.submissionsCount > 0 ? `tudo (${postToDelete.submissionsCount} submissão${postToDelete.submissionsCount > 1 ? 'ões' : ''})` : ''}
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
            loadSubmissions();
            toast.success("Submissão adicionada com sucesso!");
          }}
          selectedEventId={submissionEventFilter !== "all" ? submissionEventFilter : undefined}
        />
      </Suspense>

      {/* Zoom Dialog com navegação */}
      {getFilteredSubmissions().length > 0 && (
        <SubmissionZoomDialog
          open={zoomDialogOpen}
          onOpenChange={setZoomDialogOpen}
          submission={getFilteredSubmissions()[zoomSubmissionIndex]}
          onApprove={handleApproveSubmission}
          onReject={handleRejectSubmission}
          onNext={handleZoomNext}
          onPrevious={handleZoomPrevious}
          hasNext={zoomSubmissionIndex < getFilteredSubmissions().length - 1}
          hasPrevious={zoomSubmissionIndex > 0}
        />
      )}
    </div>
  );
};

export default Admin;
