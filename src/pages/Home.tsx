import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Trophy, Users, Zap, Shield, BarChart3, CheckCircle2, Calendar, Clock, Gift, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";
import { sb } from "@/lib/supabaseSafe";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// Componente para elementos flutuantes
const FloatingElement = ({ children, delay = 0, duration = 4, x = 0, y = 0 }: any) => (
  <motion.div
    className="absolute pointer-events-none"
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.1, 1],
      x: [x, x + 20, x],
      y: [y, y - 30, y],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {children}
  </motion.div>
);

// Componente para seções animadas
const AnimatedSection = ({ children, delay = 0 }: any) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const Home = () => {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [agencySlug, setAgencySlug] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Parallax scroll effects
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const textY = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await sb
      .from('subscription_plans')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });
    
    setPlans(data || []);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ FASE 1 - Item 1.4: Corrigir lógica "Teste 7 Dias Grátis"
  const handleTrialClick = async (planKey: string) => {
    // Se não estiver logado, redirecionar para página de autenticação
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    // Se estiver logado, abrir checkout direto com o plano selecionado
    setIsLoading(true);
    try {
      console.log('🛒 [HOME] Abrindo checkout para plano:', planKey);
      
      const { data, error } = await sb.functions.invoke('create-checkout-session', {
        body: { planKey }
      });
      
      if (error) {
        console.error('❌ [HOME] Erro ao criar checkout:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log('✅ [HOME] Abrindo checkout na URL:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('❌ [HOME] Erro ao processar checkout:', error);
      toast.error('Erro ao abrir página de assinatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!agencyName.trim()) {
      toast.error("Por favor, preencha o nome da agência");
      return;
    }

    if (!agencySlug.trim()) {
      toast.error("Por favor, preencha o slug da agência");
      return;
    }

    // Validate slug format (lowercase, no spaces, no special chars except -)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(agencySlug)) {
      toast.error("Slug inválido. Use apenas letras minúsculas, números e hífens");
      return;
    }

    setSubmittingRequest(true);
    try {
      console.log('📝 [HOME] Enviando solicitação de agência');

      const { error } = await sb
        .from('agency_requests')
        .insert({
          user_id: user!.id,
          agency_name: agencyName,
          agency_slug: agencySlug,
          status: 'pending',
        });

      if (error) {
        console.error('❌ [HOME] Erro ao criar solicitação:', error);
        
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          toast.error("Você já tem uma solicitação pendente ou este slug já está em uso");
        } else {
          toast.error("Erro ao enviar solicitação. Tente novamente.");
        }
        return;
      }

      console.log('✅ [HOME] Solicitação enviada com sucesso');
      toast.success("Solicitação enviada! Aguarde aprovação do Master Admin.");
      
      // Reset form
      setAgencyName("");
      setAgencySlug("");
      setRequestDialogOpen(false);
    } catch (error) {
      console.error('❌ [HOME] Erro ao enviar solicitação:', error);
      toast.error("Erro ao enviar solicitação. Por favor, tente novamente.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  return (
    <div className="min-h-screen">
      {/* Fixed Navigation Header - ✅ ITEM 2: Logo adicionado */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                PostControl
              </span>
            </Link>
            
            {/* Menu Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('recursos')} className="text-sm hover:text-primary transition-colors">
                Recursos
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-sm hover:text-primary transition-colors">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('precos')} className="text-sm hover:text-primary transition-colors">
                Preços
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-sm hover:text-primary transition-colors">
                FAQ
              </button>
              {user ? (
                <>
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary" 
                    onClick={() => {
                      window.location.href = '/dashboard';
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={async () => {
                      await sb.auth.signOut();
                      window.location.href = '/';
                    }}
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-primary">Entrar</Button>
                </Link>
              )}
            </div>
            
            {/* Menu Mobile - Hamburguer */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-20">
            <div className="flex flex-col space-y-6">
              <button 
                onClick={() => { scrollToSection('recursos'); setMobileMenuOpen(false); }} 
                className="text-lg hover:text-primary transition-colors text-left"
              >
                Recursos
              </button>
              <button 
                onClick={() => { scrollToSection('como-funciona'); setMobileMenuOpen(false); }} 
                className="text-lg hover:text-primary transition-colors text-left"
              >
                Como Funciona
              </button>
              <button 
                onClick={() => { scrollToSection('precos'); setMobileMenuOpen(false); }} 
                className="text-lg hover:text-primary transition-colors text-left"
              >
                Preços
              </button>
              <button 
                onClick={() => { scrollToSection('faq'); setMobileMenuOpen(false); }} 
                className="text-lg hover:text-primary transition-colors text-left"
              >
                FAQ
              </button>
              {user ? (
                <>
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary w-full" 
                    onClick={() => {
                      window.location.href = '/dashboard';
                      setMobileMenuOpen(false);
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await sb.auth.signOut();
                      window.location.href = '/';
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <Link to="/auth" className="w-full">
                  <Button size="lg" className="bg-gradient-primary w-full">Entrar</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 px-4">
        {/* Parallax Background */}
        <motion.div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroBg})`,
            y: backgroundY
          }}
        >
          {/* Gradiente Pulsante */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "linear-gradient(135deg, hsl(280 85% 60% / 0.9) 0%, hsl(320 90% 65% / 0.8) 100%)",
                "linear-gradient(135deg, hsl(290 90% 70% / 0.9) 0%, hsl(280 85% 60% / 0.8) 100%)",
                "linear-gradient(135deg, hsl(280 85% 60% / 0.9) 0%, hsl(320 90% 65% / 0.8) 100%)",
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Elementos Flutuantes - Ícones */}
        <FloatingElement delay={0} x={100} y={150}>
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white/60" />
          </div>
        </FloatingElement>
        <FloatingElement delay={0.5} duration={5} x={window.innerWidth - 200} y={100}>
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white/60" />
          </div>
        </FloatingElement>
        <FloatingElement delay={1} duration={6} x={150} y={window.innerHeight - 300}>
          <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Users className="w-7 h-7 text-white/60" />
          </div>
        </FloatingElement>
        <FloatingElement delay={1.5} duration={4.5} x={window.innerWidth - 150} y={window.innerHeight - 250}>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-white/60" />
          </div>
        </FloatingElement>
        <FloatingElement delay={2} duration={5.5} x={80} y={window.innerHeight / 2}>
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white/60" />
          </div>
        </FloatingElement>
        <FloatingElement delay={2.5} duration={4.8} x={window.innerWidth - 180} y={window.innerHeight - 400}>
          <div className="w-18 h-18 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <BarChart3 className="w-9 h-9 text-white/60" />
          </div>
        </FloatingElement>

        {/* Formas Geométricas Decorativas */}
        <FloatingElement delay={0.3} duration={6} x={window.innerWidth * 0.2} y={window.innerHeight * 0.3}>
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md" />
        </FloatingElement>
        <FloatingElement delay={1.2} duration={5} x={window.innerWidth * 0.75} y={window.innerHeight * 0.2}>
          <div className="w-20 h-20 bg-gradient-to-br from-accent/30 to-accent/10 backdrop-blur-md" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
        </FloatingElement>
        <FloatingElement delay={1.8} duration={5.5} x={window.innerWidth * 0.1} y={window.innerHeight * 0.6}>
          <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
        </FloatingElement>
        
        <motion.div 
          className="relative z-10 text-center max-w-5xl mx-auto w-full"
          style={{ y: textY, opacity }}
        >
          <Badge className="mb-4 md:mb-6 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-green-500 to-emerald-500 backdrop-blur-sm border-white/30 text-white animate-pulse shadow-glow inline-flex items-center">
            <Gift className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            🎁 Experimente por 7 dias gratuitamente !
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 text-white animate-float leading-tight px-4">
            Gerencie os Posts dos Seus Usuários com Facilidade
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-3 md:mb-4 text-white/90 font-light max-w-3xl mx-auto px-4">
            A plataforma definitiva para administradores controlarem e aprovarem submissões de postagens para eventos
          </p>
          <p className="text-sm sm:text-base md:text-lg mb-6 md:mb-8 text-white/80 max-w-2xl mx-auto px-4">
            Dashboard completo • Aprovação em massa • Controle total • Relatórios automáticos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center mb-8 md:mb-12 px-4">
            {user ? (
              <>
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="group text-base md:text-lg px-6 md:px-8 py-4 md:py-6 shadow-xl w-full sm:w-auto">
                    Acessar Dashboard
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/submit" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 w-full sm:w-auto">
                    Enviar Postagem
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="group text-base md:text-lg px-6 md:px-8 py-4 md:py-6 shadow-xl w-full sm:w-auto">
                    Começar Agora
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 w-full sm:w-auto">
                    Enviar Postagem
                  </Button>
                </Link>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-white/80 text-xs sm:text-sm px-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0" />
              <span className="font-semibold">7 dias grátis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Setup instantâneo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Suporte 24/7</span>
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-16 md:py-24 px-4 bg-gradient-to-br from-background via-muted to-background scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-12 md:mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Recursos Premium</Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent px-4">
                Tudo para Gerenciar Seus Usuários
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-4">
                Ferramentas profissionais para controlar postagens, aprovar submissões e gerar relatórios completos
              </p>
            </div>
          </AnimatedSection>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.2
                }
              }
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(280 85% 60% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Gestão de Usuários</h3>
                  <p className="text-muted-foreground">
                    Gerencie todos os seus usuários em um só lugar, com perfis completos e histórico de atividades
                  </p>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(320 90% 65% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Relatórios Completos</h3>
                  <p className="text-muted-foreground">
                    Exporte estatísticas detalhadas em Excel ou PDF com um clique, perfeito para análises e apresentações
                  </p>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(280 85% 60% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Aprovação Inteligente</h3>
                  <p className="text-muted-foreground">
                    Aprove ou rejeite postagens individualmente ou em massa, com visualização completa das submissões
                  </p>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(280 85% 60% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Gestão de Eventos</h3>
                  <p className="text-muted-foreground">
                    Crie e gerencie múltiplos eventos simultâneos com prazos e requisitos personalizados
                  </p>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(320 90% 65% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">100% Seguro</h3>
                  <p className="text-muted-foreground">
                    Todos os dados protegidos com criptografia de nível bancário e controle total de acesso
                  </p>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: "easeOut" }
                }
              }}
            >
              <motion.div whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, boxShadow: "0 25px 50px -12px hsl(280 85% 60% / 0.3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
                <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
                  <div className="w-16 h-16 mb-6 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Interface Intuitiva</h3>
                  <p className="text-muted-foreground">
                    Interface moderna e fácil de usar, sem necessidade de treinamento técnico
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-16 md:py-24 px-4 bg-gradient-to-br from-muted via-background to-muted scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-12 md:mb-16 px-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Comece em 3 Passos Simples
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Configure sua plataforma em minutos e comece a gerenciar seus usuários hoje mesmo
              </p>
            </div>
          </AnimatedSection>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Linha conectando os passos */}
            <motion.div 
              className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            <AnimatedSection delay={0.2}>
              <div className="relative">
                <div className="text-center">
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow relative z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
                  >
                    1
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">Crie sua Conta Admin</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Cadastro rápido em menos de 2 minutos. Comece com 7 dias grátis para testar todas as funcionalidades
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="relative">
                <div className="text-center">
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow relative z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.5 }}
                  >
                    2
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">Configure seus Eventos</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Crie eventos, defina prazos e requisitos. Seus usuários enviarão as postagens através do link de submissão
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.6}>
              <div className="relative">
                <div className="text-center">
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow relative z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", bounce: 0.5, delay: 0.7 }}
                  >
                    3
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">Gerencie e Aprove</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Visualize todas as submissões, aprove em massa e gere relatórios completos. Controle total do seu time!
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-16 md:py-24 px-4 bg-gradient-to-br from-background via-muted to-background scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-8 md:mb-12 px-4">
            <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none text-sm md:text-base px-4 md:px-6 py-2 shadow-glow">
              🎁 Escolha o melhor plano para você
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Planos Flexíveis
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Escolha o plano ideal para o tamanho da sua operação
            </p>
            </div>
          </AnimatedSection>

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15,
                    delayChildren: 0.1
                  }
                }
              }}
            >
              {plans.map((plan) => {
                const isPopular = plan.is_popular === true; // ✅ Usa campo do banco
                const features = Array.isArray(plan.features) ? plan.features : [];
                
                return (
                  <motion.div
                    key={plan.id}
                    variants={{
                      hidden: { opacity: 0, y: 30, scale: 0.9 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.5, ease: "easeOut" }
                      }
                    }}
                  >
                    <motion.div whileHover={{ scale: 1.03, y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                      <Card 
                        className={`p-6 relative flex flex-col ${
                          isPopular ? 'border-4 border-primary shadow-glow scale-105 z-10' : 'border-2'
                        }`}
                      >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-primary px-6 py-2 text-sm shadow-lg whitespace-nowrap">
                          ⭐ MAIS POPULAR
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">{plan.plan_name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          R$ {Number(plan.monthly_price).toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan.max_influencers === 99999 ? 'Ilimitado' : plan.max_influencers} divulgadores • {plan.max_events === 99999 ? 'Ilimitado' : plan.max_events} eventos
                      </p>
                    </div>

                    <div className="space-y-2 mb-6 flex-grow">
                      {features.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      size="lg" 
                      className={`w-full ${
                        isPopular ? 'bg-gradient-primary' : 'bg-gradient-secondary'
                      }`}
                      onClick={() => handleTrialClick(plan.plan_key)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processando...' : 'Teste 7 dias grátis'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                      </Card>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 px-4 bg-gradient-to-br from-muted via-background to-muted scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-12 md:mb-16 px-4">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Perguntas Frequentes</Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Dúvidas? Temos as Respostas
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Tudo que você precisa saber sobre nossa plataforma
              </p>
            </div>
          </AnimatedSection>

          <Accordion type="single" collapsible className="space-y-4">
            <AnimatedSection delay={0.1}>
              <AccordionItem value="item-1" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Como funciona o período de teste gratuito?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Você tem 7 dias completos para testar todas as funcionalidades da plataforma sem pagar nada. 
                Não pedimos cartão de crédito no cadastro. Após o período, você decide se quer continuar com o 
                plano promocional de R$ 29,90 no primeiro mês.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.15}>
              <AccordionItem value="item-2" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Quantos usuários posso gerenciar?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sem limites! Você pode cadastrar quantos usuários precisar. Nossa plataforma foi criada para 
                escalar com seu negócio, seja você um pequeno promoter ou uma grande agência gerenciando centenas 
                de influenciadores.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <AccordionItem value="item-3" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Como meus usuários enviam as postagens?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Muito simples! Você compartilha o link de submissão com seus usuários. Eles acessam, fazem login, 
                fazem upload do print da postagem no Instagram e pronto. Você visualiza tudo no painel admin e 
                aprova com um clique.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.25}>
              <AccordionItem value="item-4" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Posso aprovar várias submissões de uma vez?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim! Temos a funcionalidade de aprovação em massa. Você seleciona todas as submissões que deseja 
                aprovar e faz tudo com apenas um clique. Economize horas de trabalho manual.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <AccordionItem value="item-5" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Quais relatórios estão disponíveis?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Você pode exportar relatórios completos em Excel ou PDF com todas as estatísticas: usuários mais 
                ativos, taxa de aprovação, progresso por evento, histórico completo e muito mais. Perfeito para 
                apresentações e análises.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.35}>
              <AccordionItem value="item-6" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                E se eu precisar de ajuda?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Nosso suporte está disponível 24/7 via chat. Além disso, você tem acesso a uma base de conhecimento 
                completa com tutoriais em vídeo e guias passo a passo. Estamos aqui para garantir seu sucesso!
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <AccordionItem value="item-7" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Posso cancelar quando quiser?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim, sem burocracia! Não há contratos ou fidelidade. Você pode cancelar sua assinatura a qualquer 
                momento com um clique. Seus dados ficam salvos por 30 dias caso decida voltar.
              </AccordionContent>
              </AccordionItem>
            </AnimatedSection>
          </Accordion>

          {/* Suporte via WhatsApp */}
          <AnimatedSection delay={0.5}>
            <div className="mt-12 text-center">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
              <h3 className="text-2xl font-bold mb-4">Ainda tem dúvidas?</h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está pronta para ajudar! Entre em contato via WhatsApp para suporte personalizado.
              </p>
              <a
                href="https://wa.me/5511999136884?text=Olá!%20Preciso%20de%20ajuda%20com%20a%20plataforma"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="default" className="bg-gradient-primary">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Falar no WhatsApp
                </Button>
              </a>
              </Card>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 bg-gradient-hero animate-gradient relative overflow-hidden">
        {/* Gradiente Animado de Fundo */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "linear-gradient(135deg, hsl(280 85% 60% / 0.95) 0%, hsl(320 90% 65% / 0.85) 100%)",
              "linear-gradient(135deg, hsl(290 90% 70% / 0.95) 0%, hsl(280 85% 60% / 0.85) 100%)",
              "linear-gradient(135deg, hsl(280 85% 60% / 0.95) 0%, hsl(320 90% 65% / 0.85) 100%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-6 text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Gerencie Seus Usuários com Eficiência
            </motion.h2>
            <motion.p 
              className="text-xl mb-8 text-white/90 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Junte-se a dezenas de administradores que já facilitaram o controle de postagens com nossa plataforma
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl group">
                    Começar 7 Dias Grátis
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
            <motion.p 
              className="mt-8 text-white/70"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              ⭐ Avaliado com 4.9/5 por administradores satisfeitos
            </motion.p>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p className="mb-2">© 2025 Controle de Postagem. Todos os direitos reservados.</p>
          <p className="text-sm">Plataforma profissional para gestão de postagens e eventos</p>
        </div>
      </footer>

      {/* Agency Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Solicitar Criação de Agência</DialogTitle>
            <DialogDescription>
              Preencha os dados da sua agência. Após enviar, você receberá uma resposta do Master Admin em breve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Nome da Agência</Label>
              <Input
                id="agency-name"
                placeholder="Ex: Minha Agência Digital"
                value={agencyName}
                onChange={(e) => {
                  setAgencyName(e.target.value);
                  // Auto-generate slug
                  setAgencySlug(generateSlugFromName(e.target.value));
                }}
                disabled={submittingRequest}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-slug">
                Slug da Agência
                <span className="text-xs text-muted-foreground ml-2">
                  (usado na URL)
                </span>
              </Label>
              <Input
                id="agency-slug"
                placeholder="minha-agencia-digital"
                value={agencySlug}
                onChange={(e) => setAgencySlug(e.target.value.toLowerCase())}
                disabled={submittingRequest}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              disabled={submittingRequest}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={submittingRequest}
              className="flex-1 bg-gradient-primary"
            >
              {submittingRequest ? "Enviando..." : "Solicitar Agência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
