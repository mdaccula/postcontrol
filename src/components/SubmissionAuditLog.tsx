import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, ArrowRight } from "lucide-react";
import { sb } from "@/lib/supabaseSafe";

interface AuditLog {
  id: string;
  old_status: string;
  new_status: string;
  reason: string | null;
  changed_at: string;
  changed_by: string | null;
  profiles?: {
    full_name: string;
  };
}

interface SubmissionAuditLogProps {
  submissionId: string;
}

export const SubmissionAuditLog = ({ submissionId }: SubmissionAuditLogProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [submissionId]);

  const loadLogs = async () => {
    const { data: logsData, error } = await sb
      .from('submission_logs')
      .select(`
        *,
        profiles:changed_by (full_name)
      `)
      .eq('submission_id', submissionId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error loading audit logs:', error);
    } else {
      setLogs(logsData || []);
    }

    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      approved: 'bg-green-500/20 text-green-500',
      rejected: 'bg-red-500/20 text-red-500',
    };
    return colors[status] || 'bg-muted';
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">Carregando histórico...</div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">Nenhuma alteração registrada</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Histórico de Alterações
      </h3>
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border-l-2 border-muted pl-4 pb-4 relative">
              <div className="absolute -left-2 top-0 w-4 h-4 bg-primary rounded-full" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(log.old_status || 'pending')}>
                    {getStatusLabel(log.old_status || 'pending')}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge className={getStatusColor(log.new_status)}>
                    {getStatusLabel(log.new_status)}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.changed_at).toLocaleString('pt-BR')}</span>
                  </div>
                  
                  {log.profiles?.full_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>Por: {log.profiles.full_name}</span>
                    </div>
                  )}
                  
                  {log.reason && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <strong>Motivo:</strong> {log.reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
