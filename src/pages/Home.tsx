import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Trophy, Users, Zap, Shield, BarChart3, CheckCircle2, Calendar, Clock, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroBg from "@/assets/hero-bg.jpg";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-accent/80 to-secondary/70" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <Badge className="mb-6 text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 backdrop-blur-sm border-white/30 text-white animate-pulse shadow-glow">
            <Gift className="w-4 h-4 mr-2" />
            🎁 7 DIAS GRÁTIS + Oferta de Lançamento
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white animate-float leading-tight">
            Gerencie os Posts dos Seus Usuários com Facilidade
          </h1>
          <p className="text-xl md:text-2xl mb-4 text-white/90 font-light max-w-3xl mx-auto">
            A plataforma definitiva para administradores controlarem e aprovarem submissões de postagens para eventos
          </p>
          <p className="text-lg mb-8 text-white/80 max-w-2xl mx-auto">
            Dashboard completo • Aprovação em massa • Controle total • Relatórios automáticos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button size="lg" variant="secondary" className="group text-lg px-8 py-6 shadow-xl">
                    Acessar Dashboard
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/submit">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                    Enviar Postagem
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="group text-lg px-8 py-6 shadow-xl">
                    Começar Agora
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                    Enviar Postagem
                  </Button>
                </Link>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/80 text-sm px-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-400" />
              <span className="font-semibold">7 dias grátis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Setup instantâneo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Suporte 24/7</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-24 px-4 bg-gradient-to-br from-background via-muted to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Recursos Premium</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Tudo para Gerenciar Seus Usuários
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ferramentas profissionais para controlar postagens, aprovar submissões e gerar relatórios completos
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="py-24 px-4 bg-gradient-to-br from-muted via-background to-muted">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Comece em 3 Passos Simples
            </h2>
            <p className="text-muted-foreground text-lg">
              Configure sua plataforma em minutos e comece a gerenciar seus usuários hoje mesmo
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
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
      <section className="py-24 px-4 bg-gradient-to-br from-background via-muted to-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none text-base px-6 py-2 shadow-glow animate-pulse">
              🎁 7 DIAS GRÁTIS + Oferta de Lançamento - Economia de R$ 50,00
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Plano Admin Completo
            </h2>
            <p className="text-muted-foreground text-lg">
              Gerencie usuários ilimitados e eventos simultâneos
            </p>
          </div>

          <Card className="p-8 md:p-12 border-4 border-primary/20 shadow-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-primary text-white px-6 py-2 text-sm font-bold">
              MELHOR OFERTA
            </div>
            
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-green-500/10 text-green-500 border-green-500/20 text-sm px-4 py-2">
                <Clock className="w-4 h-4 mr-2 inline" />
                Experimente GRÁTIS por 7 dias
              </Badge>
              <h3 className="text-3xl font-bold mb-4">Assinatura Mensal Admin</h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-4xl text-muted-foreground line-through">R$ 79,90</span>
                <span className="text-6xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  R$ 29,90
                </span>
              </div>
              <p className="text-xl text-muted-foreground mb-2">no primeiro mês (após período grátis)</p>
              <p className="text-sm text-muted-foreground">Depois R$ 79,90/mês - Cancele quando quiser</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg font-semibold text-green-600">7 dias de teste grátis - Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Usuários ilimitados no sistema</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Dashboard completo com estatísticas em tempo real</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Aprovação em massa de submissões</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Relatórios em Excel e PDF</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Gestão de múltiplos eventos simultâneos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-lg">Suporte prioritário 24/7</span>
              </div>
            </div>

            <Link to="/auth" className="block">
              <Button size="lg" className="w-full bg-gradient-primary text-lg py-6 group shadow-xl">
                Começar 7 Dias Grátis
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              🎁 7 dias grátis sem cartão • 🔒 Pagamento 100% seguro • ⚡ Setup instantâneo • 🎯 Cancele quando quiser
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-muted via-background to-muted">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Perguntas Frequentes</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Dúvidas? Temos as Respostas
            </h2>
            <p className="text-muted-foreground text-lg">
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
