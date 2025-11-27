import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  gender: z.string().min(1, "Selecione um gênero"),
  phone: z.string().optional().transform(val => val?.replace(/\D/g, '')),
  instagram: z.string().optional().transform(val => val?.replace('@', '')),
  followersRange: z.string().optional(),
  confirmPassword: z.string().min(6, "Confirmação de senha obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isResettingPassword = searchParams.get('reset') === 'true';
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [followersRange, setFollowersRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ FASE 5: NÃO redirecionar se está resetando senha
    // ✅ FASE 3: Verificar contexto de evento e redirecionar apropriadamente
    if (user && !authLoading && !isResettingPassword) {
      const eventContextStr = localStorage.getItem('event_context');
      
      if (eventContextStr) {
        try {
          const eventContext = JSON.parse(eventContextStr);
          console.log("🎯 Contexto de evento detectado após login:", eventContext);
          
          // Vincular usuário à agência
          sb.from("user_agencies").upsert({
            user_id: user.id,
            agency_id: eventContext.agencyId,
            last_accessed_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,agency_id",
          }).then(({ error }) => {
            if (error) {
              console.error("❌ Erro ao vincular agência:", error);
            } else {
              console.log("✅ Usuário vinculado à agência após login!");
              toast({
                title: "Vinculado com sucesso!",
                description: `Você está vinculado à ${eventContext.agencyName}`,
              });
            }
          });
          
          // ✅ ITEM 1: NÃO remover event_context aqui - deixar para Submit.tsx usar
          // ✅ ITEM 1: Redirecionar sempre para /submit quando há contexto de evento
          navigate('/submit');
        } catch (err) {
          console.error("Erro ao processar contexto do evento:", err);
          navigate('/dashboard');
        }
      } else {
        // Fluxo normal: vai para dashboard
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, isResettingPassword, navigate]);

  // ✅ ITEM 5: Função de recuperação de senha
  const handlePasswordRecovery = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar email
      if (!email || !email.includes('@')) {
        toast({
          title: "Email inválido",
          description: "Por favor, digite um email válido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsRecoveringPassword(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ITEM 5: Função para definir nova senha
  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação
      if (newPassword.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter no mínimo 6 caracteres",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Senhas não coincidem",
          description: "As senhas digitadas não são iguais",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
        });
        
        // Fazer logout e redirecionar para login
        await supabase.auth.signOut();
        navigate('/auth', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      if (isLogin) {
        try {
          loginSchema.parse({ email, password });
        } catch (error) {
          if (error instanceof z.ZodError) {
            toast({
              title: "Dados inválidos",
              description: error.errors[0].message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        // 🆕 SPRINT 3: Normalizar email para lowercase antes de fazer login
        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Erro ao fazer login",
              description: "Email ou senha incorretos. Verifique suas credenciais.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao fazer login",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Login realizado!",
            description: "Redirecionando...",
          });
          // O redirecionamento será feito pelo useEffect
        }
      } else {
        try {
          signupSchema.parse({ email, password, fullName, gender, phone, instagram, followersRange, confirmPassword });
        } catch (error) {
          if (error instanceof z.ZodError) {
            toast({
              title: "Dados inválidos",
              description: error.errors[0].message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        // 🆕 SPRINT 3: Normalizar email para lowercase antes de criar conta
        const { error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName.trim(),
              gender: gender,
              phone: phone.replace(/\D/g, ''),
              instagram: instagram.replace('@', ''),
              followers_range: followersRange || null,
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Email já cadastrado",
              description: "Este email já está em uso. Faça login ou use outro email.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao criar conta",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Sua conta foi criada com sucesso. Redirecionando...",
          });
          // O redirecionamento será feito pelo useEffect automaticamente
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero animate-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <Card className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              {isResettingPassword 
                ? "Definir Nova Senha" 
                : isRecoveringPassword 
                  ? "Recuperar Senha" 
                  : isLogin 
                    ? "Login" 
                    : "Criar Conta"}
            </h1>
            <p className="text-muted-foreground">
              {isResettingPassword
                ? "Digite sua nova senha abaixo"
                : isRecoveringPassword 
                  ? "Enviaremos um link para redefinir sua senha"
                  : isLogin 
                    ? "Acesse seu painel" 
                    : "Registre-se para continuar"}
            </p>
          </div>

          {/* ✅ ITEM 5: Formulário de Redefinição de Senha */}
          {isResettingPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Definir Nova Senha"
                )}
              </Button>
            </form>
          ) : isRecoveringPassword ? (
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Email de Recuperação"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsRecoveringPassword(false);
                  setEmail("");
                }}
              >
                Voltar para Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input 
                      id="name" 
                      placeholder="Seu nome completo" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero *</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      disabled={loading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="LGBTQ+">LGBTQ+</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="(11) 99999-9999" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input 
                      id="instagram" 
                      placeholder="@seu_usuario" 
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="followersRange">Faixa de Seguidores</Label>
                    <select
                      id="followersRange"
                      value={followersRange}
                      onChange={(e) => setFollowersRange(e.target.value)}
                      disabled={loading}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      <option value="0-1k">0 - 1k</option>
                      <option value="1k-5k">1k - 5k</option>
                      <option value="5k-10k">5k - 10k</option>
                      <option value="10k-50k">10k - 50k</option>
                      <option value="50k-100k">50k - 100k</option>
                      <option value="100k+">100k+</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPasswordSignup">Confirme sua Senha *</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPasswordSignup" 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  isLogin ? "Entrar" : "Criar Conta"
                )}
              </Button>
            </form>
          )}

          {/* ✅ ITEM 5: Links de navegação */}
          {!isRecoveringPassword && (
            <div className="mt-6 space-y-2">
              {isLogin && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsRecoveringPassword(true)}
                    className="text-sm text-primary hover:underline transition-colors"
                    disabled={loading}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword("");
                    setFullName("");
                    setGender("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  disabled={loading}
                >
                  {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Entre"}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
