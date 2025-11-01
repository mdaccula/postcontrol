import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/supabaseSafe";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  gender: z.string().min(1, "Selecione um gênero"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // SEMPRE redirecionar para dashboard após login (sem verificar isAdmin)
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

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

        const { error } = await supabase.auth.signInWithPassword({
          email,
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
          signupSchema.parse({ email, password, fullName, gender });
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

        // Rate limit: 3 cadastros por hora por IP (simulado por email)
        const { data: rateLimitCheck } = await sb.rpc('check_rate_limit', {
          p_user_id: '00000000-0000-0000-0000-000000000000', // Usuário genérico para cadastros
          p_action_type: 'signup',
          p_max_count: 3,
          p_window_minutes: 60
        });

        if (!rateLimitCheck) {
          toast({
            title: "Limite atingido",
            description: "Muitas tentativas de cadastro. Tente novamente em 1 hora.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              gender: gender,
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
              {isLogin ? "Login" : "Criar Conta"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? "Acesse seu painel" : "Registre-se para continuar"}
            </p>
          </div>

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
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              )}
            </div>

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

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={loading}
            >
              {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Entre"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
