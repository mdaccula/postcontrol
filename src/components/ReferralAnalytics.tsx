import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Share2, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReferralData {
  id: string;
  user_id: string;
  agency_id: string;
  event_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    instagram: string;
  } | null;
  events: {
    title: string;
  } | null;
}

interface ReferralAnalyticsProps {
  agencyId: string;
}

export const ReferralAnalytics = ({ agencyId }: ReferralAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<ReferralData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadReferrals();
  }, [agencyId]);

  useEffect(() => {
    if (selectedEvent === "all") {
      setFilteredReferrals(referrals);
    } else {
      setFilteredReferrals(referrals.filter(r => r.event_id === selectedEvent));
    }
  }, [selectedEvent, referrals]);

  const loadReferrals = async () => {
    try {
      setLoading(true);

      // Buscar indicações
      const { data: referralData, error: referralError } = await supabase
        .from('referral_analytics')
        .select(`
          id,
          user_id,
          agency_id,
          event_id,
          created_at
        `)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (referralError) throw referralError;

      // Buscar dados relacionados separadamente
      const enrichedReferrals = await Promise.all(
        (referralData || []).map(async (referral) => {
          // Buscar perfil do usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, instagram')
            .eq('id', referral.user_id)
            .single();

          // Buscar evento
          const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', referral.event_id)
            .single();

          return {
            ...referral,
            profiles: profile,
            events: event,
          };
        })
      );

      setReferrals(enrichedReferrals);
      setFilteredReferrals(enrichedReferrals);

      // Buscar eventos únicos para filtro
      const uniqueEvents = Array.from(
        new Map(
          enrichedReferrals
            .filter(r => r.events)
            .map(r => [r.event_id, { id: r.event_id, title: r.events!.title }])
        ).values()
      );
      setEvents(uniqueEvents);

    } catch (error: any) {
      console.error("Erro ao carregar indicações:", error);
      toast({
        title: "Erro ao carregar indicações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalReferrals = referrals.length;
  const uniqueUsers = new Set(referrals.map(r => r.user_id)).size;
  const filteredTotal = filteredReferrals.length;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Indicações</p>
              <p className="text-3xl font-bold">{totalReferrals}</p>
            </div>
            <Share2 className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Promotoras Ativas</p>
              <p className="text-3xl font-bold">{uniqueUsers}</p>
            </div>
            <Users className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Média por Promotora</p>
              <p className="text-3xl font-bold">
                {uniqueUsers > 0 ? (totalReferrals / uniqueUsers).toFixed(1) : "0"}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Filtro por Evento */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Histórico de Indicações</h3>
          <div className="w-64">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por evento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Eventos</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma indicação encontrada</p>
            <p className="text-sm">As indicações feitas pelas promotoras aparecerão aqui.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant="outline" className="text-sm">
                {filteredTotal} {filteredTotal === 1 ? "indicação" : "indicações"}
                {selectedEvent !== "all" && " neste evento"}
              </Badge>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promotora</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {referral.profiles?.full_name || "Nome não disponível"}
                      </TableCell>
                      <TableCell>
                        {referral.profiles?.instagram ? (
                          <a
                            href={`https://instagram.com/${referral.profiles.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {referral.profiles.instagram}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{referral.events?.title || "Evento não disponível"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
