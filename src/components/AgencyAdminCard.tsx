import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Settings, ExternalLink, Trash2, Building2, Mail, Phone, Instagram } from "lucide-react";

interface AgencyAdminCardProps {
  agency: {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    subscription_plan: string;
    max_influencers: number;
    max_events: number;
  };
  admin: {
    full_name?: string;
    email?: string;
    phone?: string;
    instagram?: string;
  } | null;
  planDetails?: {
    plan_name: string;
    monthly_price: number;
  } | null;
  stats?: {
    totalInfluencers: number;
    totalEvents: number;
    totalSubmissions: number;
  };
  onEdit: () => void;
  onDelete: () => void;
  onViewDashboard: () => void;
  onCopyLink: () => void;
  fullUrl: string;
  alternativeUrl?: string;
}

export const AgencyAdminCard = ({
  agency,
  admin,
  planDetails,
  stats,
  onEdit,
  onDelete,
  onViewDashboard,
  onCopyLink,
  fullUrl,
  alternativeUrl,
}: AgencyAdminCardProps) => {
  const getStatusBadge = () => {
    switch (agency.subscription_status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial (10 dias)</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">Inativo</Badge>;
    }
  };

  const getPlanBadge = () => {
    const planMap: Record<string, string> = {
      basic: 'Básico',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return <Badge variant="outline">{planMap[agency.subscription_plan] || agency.subscription_plan}</Badge>;
  };

  return (
    <Card className="p-6 border-2 hover:shadow-glow transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{agency.name}</h3>
            <div className="flex gap-2 mt-1">
              {getStatusBadge()}
              {getPlanBadge()}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Info */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold text-muted-foreground mb-2">👤 Administrador:</p>
        {admin ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{admin.full_name || 'Nome não definido'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{admin.email || 'Email não definido'}</span>
            </div>
            {admin.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{admin.phone}</span>
              </div>
            )}
            {admin.instagram && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Instagram className="w-4 h-4" />
                <span>@{admin.instagram}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum admin vinculado</p>
        )}
      </div>

      {/* Plan Details */}
      {planDetails && (
        <div className="bg-primary/5 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold mb-2">📋 Plano: {planDetails.plan_name}</p>
          <p className="text-lg font-bold text-primary mb-2">
            R$ {planDetails.monthly_price.toFixed(0)}/mês
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Divulgadores:</p>
              <p className="font-semibold">
                {stats?.totalInfluencers || 0} / {agency.max_influencers === 99999 ? '∞' : agency.max_influencers}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Eventos:</p>
              <p className="font-semibold">
                {stats?.totalEvents || 0} / {agency.max_events === 99999 ? '∞' : agency.max_events}
              </p>
            </div>
          </div>
          {stats && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                📤 {stats.totalSubmissions} submissões totais
              </p>
            </div>
          )}
        </div>
      )}

      {/* Agency URL */}
      <div className="bg-background rounded-lg p-3 mb-4 border space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">🔗 URL da Agência:</p>
          <code className="text-xs break-all font-medium text-primary">{fullUrl}</code>
        </div>
        {alternativeUrl && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Link alternativo:</p>
            <code className="text-xs break-all text-muted-foreground">{alternativeUrl}</code>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onCopyLink} className="flex-1">
          <Copy className="w-4 h-4 mr-2" />
          Copiar Link
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Settings className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={onViewDashboard}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
