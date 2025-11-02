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
      const { data, error } = await supabase
        .from('agency_guests')
        .select(`
          *,
          agencies(name, logo_url),
          guest_event_permissions(
            event_id,
            permission_level,
            events(title)
          )
        `)
        .eq('invite_token', token)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Convite não encontrado');
        return;
      }

      if (data.status === 'accepted') {
        setError('Este convite já foi aceito');
        return;
      }

      if (data.status === 'expired') {
        setError('Este convite expirou');
        return;
      }

      if (data.status === 'revoked') {
        setError('Este convite foi revogado');
        return;
      }

      // Verificar se ainda está dentro do período de validade
      const now = new Date();
      const endDate = new Date(data.access_end_date);

      if (now > endDate) {
        setError('Este convite expirou');
        return;
      }

      setInvite(data);
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

    if (!invite || !token) return;

    setAccepting(true);

    try {
      // Chamar função RPC com validação server-side completa
      const { data, error } = await supabase.rpc('accept_guest_invite', {
        p_invite_token: token
      });

      if (error) {
        // Mensagens de erro genéricas para não expor estrutura do sistema
        if (error.message.includes('não autenticado')) {
          toast.error('Sessão expirada. Faça login novamente.');
          navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
        } else if (error.message.includes('outro endereço')) {
          toast.error('Este convite não corresponde à sua conta.');
        } else if (error.message.includes('já foi processado')) {
          toast.error('Este convite já foi utilizado.');
        } else if (error.message.includes('expirou')) {
          toast.error('Este convite não é mais válido.');
        } else {
          toast.error('Não foi possível aceitar o convite. Tente novamente.');
        }
        throw error;
      }

      toast.success('Convite aceito com sucesso!');
      
      // Redirecionar para o dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting invite:', err);
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
                Você precisa fazer login com o email do convite
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
                Este convite foi enviado para outro endereço de email.
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
