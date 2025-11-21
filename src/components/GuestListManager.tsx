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
  DollarSign,
  Download,
  Eye,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

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
      toast.success("Data deletada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar data: " + error.message);
    },
  });

  // Exportar para XLSX
  const handleExportXLSX = () => {
    if (!registrations || registrations.length === 0) {
      toast.error("Nenhum inscrito para exportar");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      registrations.map((reg) => ({
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Listas VIP
          </CardTitle>
          <CardDescription>
            Crie eventos de lista VIP, gerencie datas e visualize inscritos
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    <Card
                      key={event.id}
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
                              <Badge variant="outline">/lista/{event.slug}</Badge>
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
                      <DialogContent>
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
                        <TableHead>Valor Feminino</TableHead>
                        <TableHead>Valor Masculino</TableHead>
                        <TableHead>Capacidade</TableHead>
                        <TableHead>Status</TableHead>
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
                      ) : dates && dates.length > 0 ? (
                        dates.map((date) => (
                          <TableRow key={date.id}>
                            <TableCell>
                              {format(new Date(date.event_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>R$ {date.female_price.toFixed(2)}</TableCell>
                            <TableCell>R$ {date.male_price.toFixed(2)}</TableCell>
                            <TableCell>
                              {date.max_capacity ? date.max_capacity : "Ilimitado"}
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
              {selectedEventData && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Inscritos - {selectedEventData.name}
                    </h3>
                    <Button onClick={handleExportXLSX} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar XLSX
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Inscritos</p>
                            <p className="text-2xl font-bold">
                              {registrations?.length || 0}
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
                              {registrations?.filter((r) => r.gender === "feminino").length ||
                                0}
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
                              {registrations?.filter((r) => r.gender === "masculino").length ||
                                0}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : registrations && registrations.length > 0 ? (
                        registrations.map((reg) => (
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
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum inscrito ainda
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
        <Label htmlFor="name">Nome do Evento *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
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
        <Label htmlFor="agency_phone">Telefone da Agência (WhatsApp)</Label>
        <Input
          id="agency_phone"
          value={formData.agency_phone}
          onChange={(e) => setFormData({ ...formData, agency_phone: e.target.value })}
          placeholder="5511999999999"
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
    female_price: date?.female_price || 0,
    male_price: date?.male_price || 0,
    max_capacity: date?.max_capacity || null,
    is_active: date?.is_active ?? true,
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
        <Label htmlFor="event_date">Data do Evento *</Label>
        <Input
          id="event_date"
          type="date"
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          required
        />
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

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Data Ativa</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{date ? "Atualizar" : "Adicionar"} Data</Button>
      </DialogFooter>
    </form>
  );
}
