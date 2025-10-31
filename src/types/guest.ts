export type GuestPermission = 'viewer' | 'moderator' | 'manager';

export type GuestStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface AgencyGuest {
  id: string;
  agency_id: string;
  invited_by: string;
  guest_email: string;
  guest_user_id: string | null;
  invite_token: string;
  status: GuestStatus;
  access_start_date: string;
  access_end_date: string;
  accepted_at: string | null;
  last_accessed_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  notify_new_submissions: boolean;
  notify_before_expiry: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestEventPermission {
  id: string;
  guest_id: string;
  event_id: string;
  permission_level: GuestPermission;
  daily_approval_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface GuestAuditLog {
  id: string;
  guest_id: string;
  event_id: string | null;
  submission_id: string | null;
  action: string;
  action_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateGuestInvite {
  guest_email: string;
  access_end_date: string;
  event_permissions: Array<{
    event_id: string;
    permission_level: GuestPermission;
    daily_approval_limit?: number;
  }>;
  notify_new_submissions?: boolean;
  notify_before_expiry?: boolean;
}

export const PERMISSION_LABELS: Record<GuestPermission, string> = {
  viewer: 'Visualizador',
  moderator: 'Moderador',
  manager: 'Gerente',
};

export const PERMISSION_DESCRIPTIONS: Record<GuestPermission, string> = {
  viewer: 'Pode apenas visualizar estatísticas e submissões',
  moderator: 'Pode visualizar, aprovar e reprovar submissões',
  manager: 'Acesso total: gerenciar posts, editar evento e aprovar submissões',
};

export const STATUS_LABELS: Record<GuestStatus, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  expired: 'Expirado',
  revoked: 'Revogado',
};
