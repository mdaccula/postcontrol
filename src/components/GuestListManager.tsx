import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Download,
  BarChart3,
  Copy,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { parseEventDateBRT } from "@/lib/dateUtils";
import { GuestListAnalytics } from "./GuestListAnalytics";
import { Checkbox } from "@/components/ui/checkbox";
import { EventDialogForm } from "./GuestList/EventDialogForm";
import { DateDialogForm } from "./GuestList/DateDialogForm";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface GuestListEvent {
  id: string;
  name: string;
  slug: string;
  location: string;
  extra_info: string | null;
  whatsapp_link: string | null;
  agency_phone: string | null;
  is_active: boolean;
  created_at: string;
  agencies?: {
    slug: string;
  };
}

interface GuestListDate {
  id: string;
  event_id: string;
  event_date: string;
  female_price: number;
  male_price: number;
  max_capacity: number | null;
  is_active: boolean;
  name?: string | null;
  image_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  auto_deactivate_after_start?: boolean;
  price_type?: string;
  price_types?: string[];
  price_details?: Record<string, { female: number; male: number }>;
  important_info?: string | null;
  created_at?: string;
}

interface GuestListRegistration {
  id: string;
  event_id: string;
  date_id: string;
  full_name: string;
  email: string;
  gender: string;
  registered_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  shared_via_whatsapp: boolean;
  is_bot_suspected: boolean;
  guest_list_events?: {
    id: string;
    name: string;
  };
  guest_list_dates?: {
    id: string;
    event_date: string;
    name?: string | null;
  };
}

export default function GuestListManager() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GuestListEvent | null>(null);
  const [editingDate, setEditingDate] = useState<GuestListDate | null>(null);
  
  // Filtros para inscritos
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [filterDateId, setFilterDateId] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterDateTimePeriod, setFilterDateTimePeriod] = useState<string>("all");
  
  // Filtro para período de datas
  const [filterDatePeriod, setFilterDatePeriod] = useState<string>("all");
  
  // Seleção múltipla de inscritos
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  
  // Ordenação de datas
  const [sortConfig, setSortConfig] = useState<{
    key: keyof GuestListDate;
    direction: "asc" | "desc";
  }>({ key: "event_date", direction: "desc" });
  
  const queryClient = useQueryClient();

  // Query: Buscar eventos
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["guest-list-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_list_events")
        .select(`
          *,
          agencies!inner (slug)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GuestListEvent[];
    },
  });

  // Query: Buscar datas de um evento
  const { data: dates, isLoading: datesLoading } = useQuery({
    queryKey: ["guest-list-dates", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from("guest_list_dates")
        .select("*")
        .eq("event_id", selectedEvent)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as unknown as GuestListDate[];
    },
    enabled: !!selectedEvent,
  });

  // Query: Buscar todas as datas (para filtros)
  const { data: allDates } = useQuery({
    queryKey: ["guest-list-all-dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_list_dates")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as unknown as GuestListDate[];
    },
  });

  // Query: Buscar inscritos (funciona com ou sem selectedEvent)
  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["guest-list-registrations", selectedEvent || "all"],
    queryFn: async () => {
      let query = supabase
        .from("guest_list_registrations")
        .select(`
          *,
          guest_list_events!inner (
            id,
            name
          ),
          guest_list_dates!inner (
            id,
            event_date,
            name
          )
        `)
        .order("registered_at", { ascending: false });
      
      // Só filtrar por evento se houver seleção
      if (selectedEvent) {
        query = query.eq("event_id", selectedEvent);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as GuestListRegistration[];
    },
  });

  // Mutation: Criar/Editar evento
  const createOrUpdateEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      if (editingEvent) {
        const { data, error } = await supabase
          .from("guest_list_events")
          .update(eventData)
          .eq("id", editingEvent.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Get current user's agency_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", user.id)
          .single();

        if (!profile?.agency_id) throw new Error("Agency not found");

        const { data, error } = await supabase
          .from("guest_list_events")
          .insert({ ...eventData, agency_id: profile.agency_id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-list-events"] });
      setEventDialogOpen(false);
      setEditingEvent(null);
      toast.success(editingEvent ? "Evento atualizado!" : "Evento criado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar evento: " + error.message);
    },
  });

  // Mutation: Deletar evento
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("guest_list_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-list-events"] });
      toast.success("Evento deletado!");
      if (selectedEvent === selectedEvent) {
        setSelectedEvent(null);
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar evento: " + error.message);
    },
  });

  // Mutation: Criar/Editar data
  const createOrUpdateDateMutation = useMutation({
    mutationFn: async (dateData: any) => {
      if (editingDate?.id) {
        const { data, error } = await supabase
          .from("guest_list_dates")
          .update(dateData)
          .eq("id", editingDate.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        if (!selectedEvent) throw new Error("No event selected");
        const { data, error } = await supabase
          .from("guest_list_dates")
          .insert({ ...dateData, event_id: selectedEvent })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-list-dates", selectedEvent] });
      queryClient.invalidateQueries({ queryKey: ["guest-list-all-dates"] });
      setDateDialogOpen(false);
      setEditingDate(null);
      toast.success(editingDate ? "Data atualizada!" : "Data criada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar data: " + error.message);
    },
  });

  // Mutation: Deletar data
  const deleteDateMutation = useMutation({
    mutationFn: async (dateId: string) => {
      const { error } = await supabase
        .from("guest_list_dates")
        .delete()
        .eq("id", dateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-list-dates", selectedEvent] });
      queryClient.invalidateQueries({ queryKey: ["guest-list-all-dates"] });
      toast.success("Data deletada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar data: " + error.message);
    },
  });

  // Copiar slug para clipboard
  const copySlugToClipboard = (event: GuestListEvent) => {
    const agencySlug = event.agencies?.slug || 'agencia';
    const url = `${window.location.origin}/${agencySlug}/lista/${event.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para clipboard!");
  };

  // Filtrar e ordenar datas
  const filteredDates = dates?.filter((date) => {
    if (filterDatePeriod === "all") return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = parseEventDateBRT(date.event_date);
    if (filterDatePeriod === "future") return eventDate >= today;
    if (filterDatePeriod === "past") return eventDate < today;
    return true;
  }) || [];

  const sortedDates = [...filteredDates].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue == null || bValue == null) return 0;
    
    if (sortConfig.key === "event_date") {
      const dateA = new Date(aValue as string).getTime();
      const dateB = new Date(bValue as string).getTime();
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    const strA = String(aValue).toLowerCase();
    const strB = String(bValue).toLowerCase();
    return sortConfig.direction === "asc" 
      ? strA.localeCompare(strB) 
      : strB.localeCompare(strA);
  });

  const handleSort = (key: keyof GuestListDate) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortableHeader = ({ 
    columnKey, 
    children 
  }: { 
    columnKey: keyof GuestListDate; 
    children: React.ReactNode 
  }) => (
    <TableHead 
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortConfig.key === columnKey && (
          sortConfig.direction === "asc" 
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  // Aplicar filtros em cascata (incluindo filtro de período)
  const filteredRegistrations = registrations?.filter((reg) => {
    if (filterEventId !== "all" && reg.event_id !== filterEventId) return false;
    if (filterDateId !== "all" && reg.date_id !== filterDateId) return false;
    if (filterGender !== "all" && reg.gender !== filterGender) return false;
    
    // Filtro por período da data do evento
    if (filterDateTimePeriod !== "all" && reg.guest_list_dates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = parseEventDateBRT(reg.guest_list_dates.event_date);
      if (filterDateTimePeriod === "future" && eventDate < today) return false;
      if (filterDateTimePeriod === "past" && eventDate >= today) return false;
    }
    
    return true;
  }) || [];

  // Paginação para inscritos
  const ITEMS_PER_PAGE = 20;
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedRegistrations,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    resetPage,
  } = usePagination({ items: filteredRegistrations, itemsPerPage: ITEMS_PER_PAGE });

  // Reset página quando filtros mudam
  useEffect(() => {
    resetPage();
  }, [filterEventId, filterDateId, filterGender, filterDateTimePeriod, resetPage]);

  // Copiar nomes filtrados (usa TODOS os filtrados, não só a página atual)
  const copyFilteredNames = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Nenhum nome para copiar");
      return;
    }
    
    const names = filteredRegistrations
      .map((r) => r.full_name)
      .join("\n");
    
    navigator.clipboard.writeText(names);
    toast.success(`${filteredRegistrations.length} nomes copiados!`);
  };

  // Mutation: Deletar inscrição
  const deleteRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("guest_list_registrations")
        .delete()
        .eq("id", registrationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-list-registrations"] });
      toast.success("Inscrição deletada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao deletar inscrição:", error);
      toast.error("Erro ao deletar inscrição.");
    },
  });

  const handleDeleteRegistration = (registrationId: string, guestName: string) => {
    if (confirm(`Tem certeza que deseja deletar a inscrição de ${guestName}?`)) {
      deleteRegistrationMutation.mutate(registrationId);
    }
  };

  // Funções de seleção múltipla
  const toggleRegistration = (id: string) => {
    setSelectedRegistrations(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllRegistrations = () => {
    setSelectedRegistrations(prev =>
      prev.length === filteredRegistrations.length 
        ? [] 
        : filteredRegistrations.map(r => r.id)
    );
  };

  const exportSelectedToExcel = () => {
    const selected = filteredRegistrations.filter(r => 
      selectedRegistrations.includes(r.id)
    );
    
    if (selected.length === 0) {
      toast.error("Nenhum inscrito selecionado");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      selected.map((reg) => ({
        Nome: reg.full_name,
        Evento: reg.guest_list_events?.name || "-",
        "Data do Evento": reg.guest_list_dates 
          ? `${format(parseEventDateBRT(reg.guest_list_dates.event_date), "dd/MM/yyyy")}${reg.guest_list_dates.name ? ` - ${reg.guest_list_dates.name}` : ''}`
          : "-",
        Email: reg.email,
        Sexo: reg.gender,
        "Data de Registro": format(new Date(reg.registered_at), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),
        "UTM Source": reg.utm_source || "-",
        "UTM Medium": reg.utm_medium || "-",
        "UTM Campaign": reg.utm_campaign || "-",
        "Compartilhou WhatsApp": reg.shared_via_whatsapp ? "Sim" : "Não",
        "Bot Suspeito": reg.is_bot_suspected ? "Sim" : "Não",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selecionados");
    XLSX.writeFile(
      workbook,
      `inscritos-selecionados-${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );

    toast.success("Arquivo exportado com sucesso!");
  };

  const deleteSelectedRegistrations = () => {
    if (!confirm(`Deletar ${selectedRegistrations.length} inscrições selecionadas?`)) return;
    
    selectedRegistrations.forEach(id => {
      deleteRegistrationMutation.mutate(id);
    });
    setSelectedRegistrations([]);
  };

  // Exportar para XLSX (com filtros aplicados)
  const handleExportXLSX = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Nenhum inscrito para exportar");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredRegistrations.map((reg) => ({
        Nome: reg.full_name,
        Evento: reg.guest_list_events?.name || "-",
        "Data do Evento": reg.guest_list_dates 
          ? `${format(parseEventDateBRT(reg.guest_list_dates.event_date), "dd/MM/yyyy")}${reg.guest_list_dates.name ? ` - ${reg.guest_list_dates.name}` : ''}`
          : "-",
        Email: reg.email,
        Sexo: reg.gender,
        "Data de Registro": format(new Date(reg.registered_at), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),
        "UTM Source": reg.utm_source || "-",
        "UTM Medium": reg.utm_medium || "-",
        "UTM Campaign": reg.utm_campaign || "-",
        "Compartilhou WhatsApp": reg.shared_via_whatsapp ? "Sim" : "Não",
        "Bot Suspeito": reg.is_bot_suspected ? "Sim" : "Não",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(
      workbook,
      `inscritos-${events?.find((e) => e.id === selectedEvent)?.slug}-${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );

    toast.success("Arquivo exportado com sucesso!");
  };

  const selectedEventData = events?.find((e) => e.id === selectedEvent);

  // Função para duplicar data
  const handleDuplicateDate = (originalDate: GuestListDate) => {
    const { id, created_at, ...dataWithoutId } = originalDate;
    const duplicatedData = {
      ...dataWithoutId,
      event_date: format(new Date(), "yyyy-MM-dd"),
      is_active: true,
    } as any;
    setEditingDate(duplicatedData);
    setDateDialogOpen(true);
  };

  // Datas filtradas por evento selecionado no filtro
  const datesForFilteredEvent = allDates?.filter((d) => 
    filterEventId === "all" ? true : d.event_id === filterEventId
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Listas VIP</h2>
          <p className="text-muted-foreground">
            Gerencie eventos, datas, inscrições e visualize analytics
          </p>
        </div>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList>
          <TabsTrigger value="manage">Gerenciar</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="events" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                  <TabsTrigger value="dates" disabled={!selectedEvent}>
                    Datas e Valores
                  </TabsTrigger>
                  <TabsTrigger value="registrations">
                    Inscritos
                  </TabsTrigger>
                </TabsList>

            {/* TAB: Eventos */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Eventos de Lista VIP</h3>
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingEvent(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEvent ? "Editar Evento" : "Criar Novo Evento"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure os detalhes do evento de lista VIP
                      </DialogDescription>
                    </DialogHeader>
                    <EventDialogForm
                      event={editingEvent}
                      onSubmit={(data) => createOrUpdateEventMutation.mutate(data)}
                      onCancel={() => {
                        setEventDialogOpen(false);
                        setEditingEvent(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {eventsLoading ? (
                  <p className="text-muted-foreground">Carregando eventos...</p>
                ) : events && events.length > 0 ? (
                  events.map((event) => (
                    <div key={event.id} className="space-y-2">
                      {/* Slug fora do card */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          /{event.agencies?.slug || 'agencia'}/lista/{event.slug}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => copySlugToClipboard(event)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Card
                        className={`cursor-pointer transition-all hover:border-primary ${
                          selectedEvent === event.id ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => setSelectedEvent(event.id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-lg">{event.name}</CardTitle>
                              <CardDescription>{event.location}</CardDescription>
                              <div className="flex gap-2 mt-2">
                                <Badge variant={event.is_active ? "default" : "secondary"}>
                                  {event.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(event);
                                  setEventDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm("Tem certeza que deseja deletar este evento?")
                                  ) {
                                    deleteEventMutation.mutate(event.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Nenhum evento criado ainda
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* TAB: Datas e Valores */}
            <TabsContent value="dates" className="space-y-4">
              {selectedEventData && (
                <>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-lg font-semibold">
                      Datas e Valores - {selectedEventData.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <Select value={filterDatePeriod} onValueChange={setFilterDatePeriod}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filtrar período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as datas</SelectItem>
                          <SelectItem value="future">Datas futuras</SelectItem>
                          <SelectItem value="past">Datas retroativas</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setEditingDate(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Data
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingDate?.id ? "Editar Data" : editingDate ? "Duplicar Data" : "Adicionar Nova Data"}
                            </DialogTitle>
                          </DialogHeader>
                          <DateDialogForm
                            date={editingDate}
                            onSubmit={(data) => createOrUpdateDateMutation.mutate(data)}
                            onCancel={() => {
                              setDateDialogOpen(false);
                              setEditingDate(null);
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader columnKey="event_date">Data</SortableHeader>
                        <SortableHeader columnKey="name">Nome</SortableHeader>
                        <TableHead>Horários</TableHead>
                        <TableHead>Valores por Tipo</TableHead>
                        <SortableHeader columnKey="is_active">Status</SortableHeader>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : sortedDates && sortedDates.length > 0 ? (
                        sortedDates.map((date) => (
                          <TableRow key={date.id}>
                            <TableCell>
                              {(() => {
                                const [year, month, day] = date.event_date.split('-');
                                return `${day}/${month}/${year}`;
                              })()}
                            </TableCell>
                            <TableCell>
                              {date.name || "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {date.start_time || date.end_time ? (
                                <>
                                  {date.start_time && <div>{date.start_time}</div>}
                                  {date.end_time && <div>até {date.end_time}</div>}
                                </>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-2">
                                {(date.price_types || (date.price_type ? [date.price_type] : ["entry_only"])).map((type) => {
                                  const prices = date.price_details?.[type] || { female: date.female_price, male: date.male_price };
                                  return (
                                    <div key={type} className="flex flex-col gap-0.5 border-l-2 border-primary/30 pl-2">
                                      <div className="font-medium text-foreground">
                                        {type === "entry_only" && "Valor Seco"}
                                        {type === "consumable_only" && "Consumível"}
                                        {type === "entry_plus_half" && "Entrada + ½ Consome"}
                                        {type === "entry_plus_full" && "Entrada + Consome Total"}
                                      </div>
                                      <div className="text-muted-foreground">
                                        F: R$ {prices.female.toFixed(2)} • M: R$ {prices.male.toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={date.is_active ? "default" : "secondary"}>
                                {date.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Duplicar"
                                onClick={() => handleDuplicateDate(date)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingDate(date);
                                  setDateDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (
                                    confirm("Tem certeza que deseja deletar esta data?")
                                  ) {
                                    deleteDateMutation.mutate(date.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma data cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </TabsContent>

            {/* TAB: Inscritos */}
            <TabsContent value="registrations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {selectedEventData ? `Inscritos - ${selectedEventData.name}` : 'Todos os Inscritos'}
                </h3>
                <div className="flex gap-2">
                  <Button onClick={copyFilteredNames} variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Copiar Nomes
                  </Button>
                  <Button onClick={handleExportXLSX} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar XLSX
                  </Button>
                </div>
              </div>
              
              {selectedRegistrations.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedRegistrations.length} selecionado(s)
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportSelectedToExcel}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Selecionados
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedRegistrations}
                      disabled={deleteRegistrationMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar Selecionados
                    </Button>
                  </div>
                </div>
              )}

                  {/* Filtros em Cascata */}
                  <Card className="p-4">
                    <div className="space-y-2">
                      <Label>Filtros</Label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="filter-event" className="text-xs">Evento</Label>
                          <Select
                            value={filterEventId}
                            onValueChange={(value) => {
                              setFilterEventId(value);
                              setFilterDateId("all"); // Reset filtro de data
                            }}
                          >
                            <SelectTrigger id="filter-event">
                              <SelectValue placeholder="Todos os eventos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os eventos</SelectItem>
                              {events?.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-date" className="text-xs">Data</Label>
                          <Select
                            value={filterDateId}
                            onValueChange={setFilterDateId}
                            disabled={filterEventId === "all"}
                          >
                            <SelectTrigger id="filter-date">
                              <SelectValue placeholder="Todas as datas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas as datas</SelectItem>
                              {datesForFilteredEvent.map((date) => (
                                <SelectItem key={date.id} value={date.id}>
                                  {(() => {
                                    const [year, month, day] = date.event_date.split('-');
                                    return `${day}/${month}/${year}`;
                                  })()}
                                  {date.name && ` - ${date.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-gender" className="text-xs">Sexo</Label>
                          <Select value={filterGender} onValueChange={setFilterGender}>
                            <SelectTrigger id="filter-gender">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="masculino">Masculino</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-period" className="text-xs">Período</Label>
                          <Select value={filterDateTimePeriod} onValueChange={setFilterDateTimePeriod}>
                            <SelectTrigger id="filter-period">
                              <SelectValue placeholder="Todos os períodos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os períodos</SelectItem>
                              <SelectItem value="future">Eventos futuros</SelectItem>
                              <SelectItem value="past">Eventos passados</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Inscritos</p>
                            <p className="text-2xl font-bold">
                              {filteredRegistrations.length}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Feminino</p>
                            <p className="text-2xl font-bold">
                              {filteredRegistrations.filter((r) => r.gender === "feminino").length}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-pink-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Masculino</p>
                            <p className="text-2xl font-bold">
                              {filteredRegistrations.filter((r) => r.gender === "masculino").length}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedRegistrations.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                            onCheckedChange={toggleAllRegistrations}
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Data do Evento</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Data Inscrição</TableHead>
                        <TableHead>UTM</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : paginatedRegistrations.length > 0 ? (
                        paginatedRegistrations.map((reg) => (
                          <TableRow key={reg.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRegistrations.includes(reg.id)}
                                onCheckedChange={() => toggleRegistration(reg.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{reg.full_name}</TableCell>
                            <TableCell>{reg.guest_list_events?.name || "-"}</TableCell>
                            <TableCell>
                              {reg.guest_list_dates ? (
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {format(parseEventDateBRT(reg.guest_list_dates.event_date), "dd/MM/yyyy")}
                                  </div>
                                  {reg.guest_list_dates.name && (
                                    <div className="text-xs text-muted-foreground">
                                      {reg.guest_list_dates.name}
                                    </div>
                                  )}
                                </div>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{reg.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  reg.gender === "feminino" ? "default" : "secondary"
                                }
                              >
                                {reg.gender}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(reg.registered_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {reg.utm_source || reg.utm_medium || reg.utm_campaign ? (
                                <div>
                                  {reg.utm_source && <div>Source: {reg.utm_source}</div>}
                                  {reg.utm_medium && <div>Medium: {reg.utm_medium}</div>}
                                  {reg.utm_campaign && <div>Campaign: {reg.utm_campaign}</div>}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRegistration(reg.id, reg.full_name)}
                                disabled={deleteRegistrationMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">
                            Nenhum inscrito encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  {filteredRegistrations.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {paginatedRegistrations.length} de {filteredRegistrations.length} inscritos
                      </p>
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                      />
                    </div>
                  )}
            </TabsContent>
          </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <GuestListAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
