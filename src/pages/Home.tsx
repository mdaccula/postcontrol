import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Trophy, Users, Zap, Shield, BarChart3, CheckCircle2, Calendar, Clock, Gift, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroBg from "@/assets/hero-bg.jpg";
import { sb } from "@/lib/supabaseSafe";

const Home = () => {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen">
      {/* Fixed Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PostControl
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
                    onClick={async () => {
                      const { data: userAgency } = await sb
                        .from('user_agencies')
                        .select(`
                          agency_id,
                          agencies!inner (
                            slug
                          )
                        `)
                        .eq('user_id', user.id)
                        .order('last_accessed_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      
                      const slug = userAgency?.agencies?.slug;
                      window.location.href = slug ? `/dashboard?agency=${slug}` : '/dashboard';
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
                    onClick={async () => {
                      const { data: userAgency } = await sb
                        .from('user_agencies')
                        .select(`
                          agency_id,
                          agencies!inner (
                            slug
                          )
                        `)
                        .eq('user_id', user.id)
                        .order('last_accessed_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      
                      const slug = userAgency?.agencies?.slug;
                      window.location.href = slug ? `/dashboard?agency=${slug}` : '/dashboard';
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
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-accent/80 to-secondary/70" />
        </div>
        
        <div className="relative z-10 text-center max-w-5xl mx-auto w-full">
          <Badge className="mb-4 md:mb-6 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-green-500 to-emerald-500 backdrop-blur-sm border-white/30 text-white animate-pulse shadow-glow inline-flex items-center">
            <Gift className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            🎁 7 DIAS GRÁTIS + Oferta de Lançamento
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
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-16 md:py-24 px-4 bg-gradient-to-br from-background via-muted to-background scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Recursos Premium</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent px-4">
              Tudo para Gerenciar Seus Usuários
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-4">
              Ferramentas profissionais para controlar postagens, aprovar submissões e gerar relatórios completos
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Gestão de Usuários</h3>
              <p className="text-muted-foreground">
                Gerencie todos os seus usuários em um só lugar, com perfis completos e histórico de atividades
              </p>
            </Card>

            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Relatórios Completos</h3>
              <p className="text-muted-foreground">
                Exporte estatísticas detalhadas em Excel ou PDF com um clique, perfeito para análises e apresentações
              </p>
            </Card>

            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Aprovação Inteligente</h3>
              <p className="text-muted-foreground">
                Aprove ou rejeite postagens individualmente ou em massa, com visualização completa das submissões
              </p>
            </Card>

            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Gestão de Eventos</h3>
              <p className="text-muted-foreground">
                Crie e gerencie múltiplos eventos simultâneos com prazos e requisitos personalizados
              </p>
            </Card>

            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">100% Seguro</h3>
              <p className="text-muted-foreground">
                Todos os dados protegidos com criptografia de nível bancário e controle total de acesso
              </p>
            </Card>

            <Card className="p-8 hover:shadow-glow transition-all duration-300 border-2 group">
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Interface Intuitiva</h3>
              <p className="text-muted-foreground">
                Interface moderna e fácil de usar, sem necessidade de treinamento técnico
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-16 md:py-24 px-4 bg-gradient-to-br from-muted via-background to-muted scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16 px-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Comece em 3 Passos Simples
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Configure sua plataforma em minutos e comece a gerenciar seus usuários hoje mesmo
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="relative">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-4">Crie sua Conta Admin</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cadastro rápido em menos de 2 minutos. Comece com 7 dias grátis para testar todas as funcionalidades
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-4">Configure seus Eventos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Crie eventos, defina prazos e requisitos. Seus usuários enviarão as postagens através do link de submissão
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-glow">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-4">Gerencie e Aprove</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Visualize todas as submissões, aprove em massa e gere relatórios completos. Controle total do seu time!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-16 md:py-24 px-4 bg-gradient-to-br from-background via-muted to-background scroll-mt-20">
        <div className="max-w-7xl mx-auto">
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

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {plans.map((plan, index) => {
                const isPopular = index === Math.floor(plans.length / 2); // Middle plan is most popular
                const features = Array.isArray(plan.features) ? plan.features : [];
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`p-8 relative ${
                      isPopular ? 'border-4 border-primary shadow-glow scale-105' : 'border-2'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-primary px-6 py-2 text-base shadow-lg">
                          ⭐ MAIS POPULAR
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.plan_name}</h3>
                      <div className="flex items-baseline justify-center gap-2 mb-4">
                        <span className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                          R$ {Number(plan.monthly_price).toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.max_influencers} divulgadores • {plan.max_events} eventos
                      </p>
                    </div>

                    <div className="space-y-3 mb-8">
                      {features.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

<a 
  href={`https://wa.me/5511999136884?text=Olá!%20Gostaria%20de%20contratar%20o%20plano%20${encodeURIComponent(plan.plan_name)}%20por%20R$%20${plan.monthly_price}/mês`}
  target="_blank"
  rel="noopener noreferrer"
  className="block"
>
  <Button 
    size="lg" 
    className={`w-full ${
      isPopular ? 'bg-gradient-primary' : 'bg-gradient-secondary'
    }`}
  >
    Contratar via WhatsApp
    <MessageCircle className="ml-2 h-4 w-4" />
  </Button>
</a>

                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 px-4 bg-gradient-to-br from-muted via-background to-muted scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-16 px-4">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Perguntas Frequentes</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Dúvidas? Temos as Respostas
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Tudo que você precisa saber sobre nossa plataforma
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
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

            <AccordionItem value="item-4" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Posso aprovar várias submissões de uma vez?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim! Temos a funcionalidade de aprovação em massa. Você seleciona todas as submissões que deseja 
                aprovar e faz tudo com apenas um clique. Economize horas de trabalho manual.
              </AccordionContent>
            </AccordionItem>

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

            <AccordionItem value="item-6" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                E se eu precisar de ajuda?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Nosso suporte está disponível 24/7 via chat. Além disso, você tem acesso a uma base de conhecimento 
                completa com tutoriais em vídeo e guias passo a passo. Estamos aqui para garantir seu sucesso!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-card border-2 rounded-lg px-6">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Posso cancelar quando quiser?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim, sem burocracia! Não há contratos ou fidelidade. Você pode cancelar sua assinatura a qualquer 
                momento com um clique. Seus dados ficam salvos por 30 dias caso decida voltar.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 bg-gradient-hero animate-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Gerencie Seus Usuários com Eficiência
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Junte-se a dezenas de administradores que já facilitaram o controle de postagens com nossa plataforma
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl group">
                Começar 7 Dias Grátis
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-white/70">
            ⭐ Avaliado com 4.9/5 por administradores satisfeitos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p className="mb-2">© 2025 Controle de Postagem. Todos os direitos reservados.</p>
          <p className="text-sm">Plataforma profissional para gestão de postagens e eventos</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
