import { useState } from "react";
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
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  Download,
  BarChart3,
  Copy,
  Upload,
  Clock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { GuestListAnalytics } from "./GuestListAnalytics";
import imageCompression from "browser-image-compression";

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
  
  const queryClient = useQueryClient();

  // Query: Buscar eventos
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["guest-list-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_list_events")
        .select("*")
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
      return data as GuestListDate[];
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
      return data as GuestListDate[];
    },
  });

  // Query: Buscar inscritos
  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["guest-list-registrations", selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const { data, error } = await supabase
        .from("guest_list_registrations")
        .select("*")
        .eq("event_id", selectedEvent)
        .order("registered_at", { ascending: false });

      if (error) throw error;
      return data as GuestListRegistration[];
    },
    enabled: !!selectedEvent,
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
      if (editingDate) {
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
  const copySlugToClipboard = (slug: string) => {
    const url = `${window.location.origin}/lista/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para clipboard!");
  };

  // Aplicar filtros em cascata
  const filteredRegistrations = registrations?.filter((reg) => {
    if (filterEventId !== "all" && reg.event_id !== filterEventId) return false;
    if (filterDateId !== "all" && reg.date_id !== filterDateId) return false;
    if (filterGender !== "all" && reg.gender !== filterGender) return false;
    return true;
  }) || [];

  // Copiar nomes filtrados
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

  // Exportar para XLSX (com filtros aplicados)
  const handleExportXLSX = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Nenhum inscrito para exportar");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredRegistrations.map((reg) => ({
        Nome: reg.full_name,
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
                  <TabsTrigger value="registrations" disabled={!selectedEvent}>
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
                          /lista/{event.slug}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => copySlugToClipboard(event.slug)}
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
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Datas e Valores - {selectedEventData.name}
                    </h3>
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
                            {editingDate ? "Editar Data" : "Adicionar Nova Data"}
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

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Horários</TableHead>
                        <TableHead>Valor F</TableHead>
                        <TableHead>Valor M</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : dates && dates.length > 0 ? (
                        dates.map((date) => (
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
                            <TableCell>R$ {date.female_price.toFixed(2)}</TableCell>
                            <TableCell>R$ {date.male_price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={date.is_active ? "default" : "secondary"}>
                                {date.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
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
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
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
              {selectedEventData && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Inscritos - {selectedEventData.name}
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

                  {/* Filtros em Cascata */}
                  <Card className="p-4">
                    <div className="space-y-2">
                      <Label>Filtros</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Sexo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>UTM</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : filteredRegistrations.length > 0 ? (
                        filteredRegistrations.map((reg) => (
                          <TableRow key={reg.id}>
                            <TableCell className="font-medium">{reg.full_name}</TableCell>
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum inscrito encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
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

// Componente: Form de Evento
function EventDialogForm({
  event,
  onSubmit,
  onCancel,
}: {
  event: GuestListEvent | null;
  onSubmit: (data: Partial<GuestListEvent>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: event?.name || "",
    slug: event?.slug || "",
    location: event?.location || "",
    extra_info: event?.extra_info || "",
    whatsapp_link: event?.whatsapp_link || "",
    agency_phone: event?.agency_phone || "",
    is_active: event?.is_active ?? true,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Local *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: DEDGE Club"
          required
        />
        <p className="text-xs text-muted-foreground">
          Nome do estabelecimento/local onde acontecem os eventos
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL) *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) =>
            setFormData({
              ...formData,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            })
          }
          placeholder="exemplo-festa"
          required
        />
        <p className="text-xs text-muted-foreground">
          URL: /lista/{formData.slug || "slug-aqui"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Localização *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="extra_info">Informações Extras</Label>
        <Textarea
          id="extra_info"
          value={formData.extra_info}
          onChange={(e) => setFormData({ ...formData, extra_info: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp_link">Link Grupo WhatsApp</Label>
        <Input
          id="whatsapp_link"
          value={formData.whatsapp_link}
          onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
          placeholder="https://chat.whatsapp.com/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agency_phone">Telefone da Agência</Label>
        <Input
          id="agency_phone"
          value={formData.agency_phone}
          onChange={(e) => setFormData({ ...formData, agency_phone: e.target.value })}
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Evento Ativo</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{event ? "Atualizar" : "Criar"} Evento</Button>
      </DialogFooter>
    </form>
  );
}

// Componente: Form de Data
function DateDialogForm({
  date,
  onSubmit,
  onCancel,
}: {
  date: GuestListDate | null;
  onSubmit: (data: Partial<GuestListDate>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    event_date: date?.event_date || format(new Date(), "yyyy-MM-dd"),
    name: date?.name || "",
    female_price: date?.female_price || 0,
    male_price: date?.male_price || 0,
    max_capacity: date?.max_capacity || null,
    is_active: date?.is_active ?? true,
    image_url: date?.image_url || "",
    start_time: date?.start_time?.slice(0, 5) || "",
    end_time: date?.end_time?.slice(0, 5) || "",
    auto_deactivate_after_start: date?.auto_deactivate_after_start ?? false,
    price_type: date?.price_type || "entry_only",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(date?.image_url || "");
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    // Se não há novo arquivo E já existe imagem prévia, manter a existente
    if (!imageFile && date?.image_url) {
      return date.image_url;
    }
    
    if (!imageFile) return formData.image_url;

    setUploading(true);
    try {
      const compressedFile = await imageCompression(imageFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      const fileExt = compressedFile.name.split(".").pop();
      const fileName = `guest-list-dates/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-og-images")
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("agency-og-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da imagem");
      return formData.image_url;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const imageUrl = await uploadImage();
    
    onSubmit({
      ...formData,
      image_url: imageUrl || null,
      name: formData.name || null,
      start_time: formData.start_time ? `${formData.start_time}:00` : null,
      end_time: formData.end_time ? `${formData.end_time}:00` : null,
      auto_deactivate_after_start: formData.auto_deactivate_after_start,
      price_type: formData.price_type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="event_date">Data do Evento *</Label>
        <Input
          id="event_date"
          type="date"
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome da Festa (opcional)</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Noite das Estrelas"
        />
        <p className="text-xs text-muted-foreground">
          Nome específico da festa deste dia (deixe vazio para usar apenas a data)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Foto do Evento (opcional)</Label>
        <div className="space-y-2">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-40 object-cover rounded border"
            />
          )}
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="text-xs text-muted-foreground">
            Imagem específica para esta data/festa
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">
            <Clock className="inline h-3 w-3 mr-1" />
            Horário de Início
          </Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">
            <Clock className="inline h-3 w-3 mr-1" />
            Horário de Término
          </Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="female_price">Valor Feminino (R$) *</Label>
          <Input
            id="female_price"
            type="number"
            step="0.01"
            value={formData.female_price}
            onChange={(e) =>
              setFormData({ ...formData, female_price: parseFloat(e.target.value) })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="male_price">Valor Masculino (R$) *</Label>
          <Input
            id="male_price"
            type="number"
            step="0.01"
            value={formData.male_price}
            onChange={(e) =>
              setFormData({ ...formData, male_price: parseFloat(e.target.value) })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price_type">Tipo de Valor *</Label>
        <Select
          value={formData.price_type}
          onValueChange={(value) => setFormData({ ...formData, price_type: value })}
        >
          <SelectTrigger id="price_type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry_only">Valor Seco (Apenas Entrada)</SelectItem>
            <SelectItem value="consumable_only">Consumível (Entrada Grátis)</SelectItem>
            <SelectItem value="entry_plus_half">Entrada + Consome Metade</SelectItem>
            <SelectItem value="entry_plus_full">Entrada + Consome Valor Integral</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Como o valor será cobrado/utilizado no evento
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_capacity">Capacidade Máxima (opcional)</Label>
        <Input
          id="max_capacity"
          type="number"
          value={formData.max_capacity || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              max_capacity: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          placeholder="Deixe vazio para ilimitado"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Data Ativa</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_deactivate"
              checked={formData.auto_deactivate_after_start}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, auto_deactivate_after_start: checked })
              }
            />
            <Label htmlFor="auto_deactivate">
              Desativar automaticamente após início
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-9">
            A data será desativada automaticamente quando o evento iniciar
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>{date ? "Atualizar" : "Adicionar"} Data</>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
