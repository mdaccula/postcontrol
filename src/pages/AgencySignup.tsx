import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { sb } from "@/lib/supabaseSafe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogIn, UserPlus } from "lucide-react";

export default function AgencySignup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    instagram: '',
    phone: ''
  });

  useEffect(() => {
    loadAgency();
  }, [slug]);

  const loadAgency = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const { data, error } = await sb
      .from('agencies')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Agência não encontrada",
        description: "Esta agência não existe ou foi removida.",
        variant: "destructive"
      });
    }

    setAgency(data);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;

      // 2. Atualizar profile com agency_id
      if (authData.user) {
        const { error: profileError } = await sb
          .from('profiles')
          .update({
            full_name: formData.fullName,
            instagram: formData.instagram,
            phone: formData.phone,
            agency_id: agency.id
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Cadastro realizado!",
        description: `Bem-vindo à ${agency.name}`,
      });

      // Redirecionar para dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await sb.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <Card className="p-8 text-center max-w-md">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Agência não encontrada</h1>
          <p className="text-muted-foreground mb-4">
            Verifique o link e tente novamente ou entre em contato com o administrador.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar para Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {agency.name}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'signup' ? 'Cadastre-se como influencer' : 'Faça login para continuar'}
          </p>
        </div>

        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@seu_usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                {mode === 'signup' ? 'Cadastrando...' : 'Entrando...'}
              </div>
            ) : (
              <>
                {mode === 'signup' ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-sm text-primary hover:underline"
          >
            {mode === 'signup' ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Ao se cadastrar, você será automaticamente vinculado à {agency.name}
          </p>
        </div>
      </Card>
    </div>
  );
}
