import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de convite não encontrado');
      setLoading(false);
      return;
    }

    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      // Query 1: Buscar convite e agência
   const { data: inviteData, error: inviteError } = await supabase
  .from('agency_guests')
  .select(`
    *,
    agencies(name, logo_url)
  `)
  .eq('invite_token', token)
  .maybeSingle();

// 🛡️ 1. Primeiro: trate erro real da query (ex: sintaxe, permissões)
if (inviteError) {
  throw inviteError;
}

// ❗ 2. Depois: verifique se não encontrou resultado
if (!inviteData) {
  setError('Convite não encontrado ou já foi utilizado/expirado');
  return;
}

// 🚫 3. Agora validamos o status do convite:
const invalidStatuses = {
  accepted: 'Este convite já foi aceito',
  expired: 'Este convite expirou',
  revoked: 'Este convite foi revogado',
};

if (invalidStatuses[inviteData.status]) {
  setError(invalidStatuses[inviteData.status]);
  return;
}

// 📅 4. Verifique validade de data
const now = new Date();
const endDate = new Date(inviteData.access_end_date);
if (now > endDate) {
  setError('Este convite expirou');
  return;
}

      // Query 2: Buscar permissões com eventos
      const { data: permissions, error: permError } = await supabase
        .from('guest_event_permissions')
        .select(`
          event_id,
          permission_level,
          events(title)
        `)
        .eq('guest_id', inviteData.id);

      if (permError) {
        console.error('Error loading permissions:', permError);
        // Não falhar se não houver permissões
      }

      // Combinar dados
      const fullInvite = {
        ...inviteData,
        guest_event_permissions: permissions || []
      };

      setInvite(fullInvite);
    } catch (err: any) {
      console.error('Error loading invite:', err);
      setError('Erro ao carregar convite: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para aceitar o convite');
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    if (!invite) return;

    // Verificar se o email do usuário logado corresponde ao email do convite
    if (user.email !== invite.guest_email) {
      toast.error('Este convite foi enviado para ' + invite.guest_email);
      return;
    }

    setAccepting(true);

    try {
      const { error } = await supabase
        .from('agency_guests')
        .update({
          guest_user_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (error) throw error;

      toast.success('Convite aceito com sucesso!');
      
      // Redirecionar para o dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      toast.error('Erro ao aceitar convite: ' + err.message);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando convite...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Erro</h2>
            <p className="text-center text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          {invite.agencies?.logo_url && (
            <img 
              src={invite.agencies.logo_url} 
              alt={invite.agencies.name}
              className="h-16 w-auto object-contain"
            />
          )}
          
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold">Convite para Acesso</h1>
            <p className="text-muted-foreground">
              Você foi convidado por <strong>{invite.agencies?.name}</strong>
            </p>
          </div>

          <div className="w-full space-y-4 bg-muted/50 p-4 rounded-lg">
            <div>
              <p className="text-sm font-medium">Email convidado:</p>
              <p className="text-sm text-muted-foreground">{invite.guest_email}</p>
            </div>

            <div>
              <p className="text-sm font-medium">Acesso válido até:</p>
              <p className="text-sm text-muted-foreground">
                {new Date(invite.access_end_date).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {invite.guest_event_permissions && invite.guest_event_permissions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Eventos com acesso:</p>
                <div className="space-y-1">
                  {invite.guest_event_permissions.map((perm: any) => (
                    <div key={perm.event_id} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>• {perm.events?.title}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {perm.permission_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!user ? (
            <div className="w-full space-y-2">
              <Button 
                onClick={() => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}
                className="w-full"
              >
                Fazer Login para Aceitar
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Você precisa fazer login com o email {invite.guest_email}
              </p>
            </div>
          ) : user.email === invite.guest_email ? (
            <Button 
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aceitando...
                </>
              ) : (
                'Aceitar Convite'
              )}
            </Button>
          ) : (
            <div className="w-full space-y-2">
              <p className="text-sm text-destructive text-center">
                Você está logado com {user.email}, mas este convite foi enviado para {invite.guest_email}
              </p>
              <Button 
                onClick={() => {
                  // Logout and redirect to login
                  supabase.auth.signOut().then(() => {
                    navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
                  });
                }}
                variant="outline"
                className="w-full"
              >
                Fazer Login com Outra Conta
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
