import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  User, 
  Mail, 
  DollarSign,
  Users,
  CalendarDays,
  Copy,
  Edit,
  Trash2,
  Eye
} from "lucide-react";

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

  const adminName = admin?.full_name || 'Sem admin';
  const adminEmail = admin?.email || 'N/A';
  const planPrice = planDetails?.monthly_price?.toFixed(0) || '0';
  const influencersCount = stats?.totalInfluencers || 0;
  const maxInfluencers = agency.max_influencers === 99999 ? '∞' : agency.max_influencers;
  const eventsCount = stats?.totalEvents || 0;
  const maxEvents = agency.max_events === 99999 ? '∞' : agency.max_events;
  const agencyUrl = fullUrl;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base leading-tight truncate">{agency.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {getStatusBadge()}
                {getPlanBadge()}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onViewDashboard}
              title="Ver Dashboard"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {/* Admin Info - Compact horizontal layout */}
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[120px]">{adminName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[150px]">{adminEmail}</span>
          </div>
        </div>

        {/* Compact stats row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span>R$ {planPrice}/mês</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{influencersCount}/{maxInfluencers} divulg.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{eventsCount}/{maxEvents} evt</span>
          </div>
        </div>

        {/* URL with copy button */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <a
            href={agencyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate flex-1"
            title={agencyUrl}
          >
            {agency.slug}
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="h-6 px-2 shrink-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};