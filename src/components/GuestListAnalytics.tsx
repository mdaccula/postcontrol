import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Eye, UserPlus, TrendingUp, Share2, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function GuestListAnalytics() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  // Fetch events
  const { data: events } = useQuery({
    queryKey: ["guest-list-events-analytics"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id!)
        .single();

      const { data, error } = await supabase
        .from("guest_list_events")
        .select("*")
        .eq("agency_id", profile?.agency_id!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["guest-list-analytics", selectedEventId, timeRange],
    queryFn: async () => {
      const now = new Date();
      let startDate = new Date();
      
      if (timeRange === "7d") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === "30d") {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate = new Date(0); // All time
      }

      // Fetch analytics events
      let analyticsQuery = supabase
        .from("guest_list_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (selectedEventId !== "all") {
        analyticsQuery = analyticsQuery.eq("event_id", selectedEventId);
      }

      const { data: analytics, error: analyticsError } = await analyticsQuery;
      if (analyticsError) throw analyticsError;

      // Fetch registrations
      let registrationsQuery = supabase
        .from("guest_list_registrations")
        .select(`
          *,
          guest_list_dates (
            event_date,
            event_id
          )
        `)
        .gte("registered_at", startDate.toISOString());

      if (selectedEventId !== "all") {
        registrationsQuery = registrationsQuery.eq("event_id", selectedEventId);
      }

      const { data: registrations, error: registrationsError } = await registrationsQuery;
      if (registrationsError) throw registrationsError;

      return { analytics: analytics || [], registrations: registrations || [] };
    },
  });

  // Calculate metrics
  const metrics = {
    views: analyticsData?.analytics.filter(a => a.event_type === "view").length || 0,
    formStarts: analyticsData?.analytics.filter(a => a.event_type === "form_start").length || 0,
    submissions: analyticsData?.registrations.length || 0,
    shares: analyticsData?.analytics.filter(a => a.event_type === "share_click").length || 0,
    conversionRate: 0,
    formCompletionRate: 0,
  };

  if (metrics.views > 0) {
    metrics.conversionRate = (metrics.submissions / metrics.views) * 100;
  }

  if (metrics.formStarts > 0) {
    metrics.formCompletionRate = (metrics.submissions / metrics.formStarts) * 100;
  }

  // Group by date for timeline
  const timelineData = analyticsData?.registrations.reduce((acc: any[], reg) => {
    const date = format(new Date(reg.registered_at!), "dd/MMM", { locale: ptBR });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.registrations += 1;
    } else {
      acc.push({ date, registrations: 1 });
    }
    return acc;
  }, []) || [];

  // Gender breakdown
  const genderData = [
    { name: "Feminino", value: analyticsData?.registrations.filter(r => r.gender === "female").length || 0 },
    { name: "Masculino", value: analyticsData?.registrations.filter(r => r.gender === "male").length || 0 },
  ];

  // UTM Source breakdown
  const utmSourceData = analyticsData?.registrations.reduce((acc: any[], reg) => {
    const source = reg.utm_source || "Direto";
    const existing = acc.find(item => item.name === source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: source, value: 1 });
    }
    return acc;
  }, []) || [];

  // Event breakdown
  const eventBreakdown = events?.map(event => {
    const eventRegistrations = analyticsData?.registrations.filter(
      r => r.event_id === event.id
    ).length || 0;
    return {
      name: event.name,
      registrations: eventRegistrations,
    };
  }).filter(e => e.registrations > 0) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecionar evento" />
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

        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.views}</div>
            <p className="text-xs text-muted-foreground">
              Acessos à página
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.submissions}</div>
            <p className="text-xs text-muted-foreground">
              Cadastros completos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Visualizações → Inscrições
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compartilhamentos</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.shares}</div>
            <p className="text-xs text-muted-foreground">
              Cliques em compartilhar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline de Inscrições
            </CardTitle>
            <CardDescription>Evolução diária de cadastros</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="registrations" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Inscrições"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gender Distribution */}
        {genderData.some(d => d.value > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribuição por Gênero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* UTM Source Breakdown */}
        {utmSourceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Origem do Tráfego (UTM Source)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={utmSourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Inscrições" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Event Performance */}
        {eventBreakdown.length > 0 && selectedEventId === "all" && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Performance por Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={eventBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={150} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="registrations" fill="hsl(var(--primary))" name="Inscrições" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Funnel Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
          <CardDescription>Análise do comportamento dos usuários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Visualizações da página</p>
              <p className="text-2xl font-bold">{metrics.views}</p>
            </div>
            <Badge variant="outline">100%</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Iniciaram o formulário</p>
              <p className="text-2xl font-bold">{metrics.formStarts}</p>
            </div>
            <Badge variant="outline">
              {metrics.views > 0 ? ((metrics.formStarts / metrics.views) * 100).toFixed(1) : 0}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Completaram a inscrição</p>
              <p className="text-2xl font-bold">{metrics.submissions}</p>
            </div>
            <Badge variant="outline">
              {metrics.formCompletionRate.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
