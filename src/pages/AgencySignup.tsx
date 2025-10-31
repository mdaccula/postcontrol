import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { sb } from "@/lib/supabaseSafe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogIn, UserPlus } from "lucide-react";

interface AgencySignupProps {
  tokenFromSlug?: string;
}

export default function AgencySignup({ tokenFromSlug }: AgencySignupProps = {}) {
  const { token: tokenFromParams } = useParams<{ token: string }>();
  const token = tokenFromSlug || tokenFromParams;
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
    phone: '',
    gender: ''
  });

  useEffect(() => {
    loadAgency();
  }, [token]);

  const loadAgency = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    console.log('🔍 Buscando agência com token:', token);

    const { data, error } = await sb
      .from('agencies')
      .select('*')
      .eq('signup_token', token)
      .maybeSingle();

    console.log('📊 Resultado da busca:', { data, error });

    if (error) {
      console.error('❌ Erro ao buscar agência:', error);
      toast({
        title: "Erro ao buscar agência",
        description: error.message,
        variant: "destructive"
      });
    }

    if (!data) {
      console.warn('⚠️ Agência não encontrada para token:', token);
      toast({
        title: "Agência não encontrada",
        description: "Este link de cadastro é inválido ou expirou.",
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

      // 2. Atualizar profile (COM agency_id para contagem de divulgadores)
      if (authData.user) {
        const { error: profileError } = await sb
          .from('profiles')
          .update({
            full_name: formData.fullName,
            instagram: formData.instagram,
            phone: formData.phone,
            gender: formData.gender,
            agency_id: agency.id, // Adiciona agency_id para contagem
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // 3. Criar associação na tabela user_agencies
        const { error: agencyLinkError } = await sb
          .from('user_agencies')
          .insert({
            user_id: authData.user.id,
            agency_id: agency.id,
            joined_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString()
          });

        if (agencyLinkError && agencyLinkError.code !== '23505') { // Ignora erro de duplicata
          throw agencyLinkError;
        }
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
      const { data: authData, error } = await sb.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Após login bem-sucedido, adicionar ou atualizar associação com a agência
      if (authData.user) {
        const { error: agencyLinkError } = await sb
          .from('user_agencies')
          .upsert({
            user_id: authData.user.id,
            agency_id: agency.id,
            last_accessed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,agency_id'
          });

        if (agencyLinkError) {
          console.warn('⚠️ Erro ao vincular agência:', agencyLinkError);
        }
      }

      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });

      setTimeout(() => {
        navigate(`/dashboard?agency=${agency.id}`);
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
            {mode === 'signup' ? 'Cadastre-se como usuário' : 'Faça login para continuar'}
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
                <Label htmlFor="gender">Gênero *</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  required
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="LGBTQ+">LGBTQ+</SelectItem>
                  </SelectContent>
                </Select>
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
  type="tel"
  value={formData.phone}
  onChange={(e) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, phone: cleaned });
  }}
  placeholder="11999136884"
  maxLength={11}
/>
<span className="text-xs text-muted-foreground">
  Apenas números (10 ou 11 dígitos)
</span>

                
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
