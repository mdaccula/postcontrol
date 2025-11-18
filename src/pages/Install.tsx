import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, Smartphone, Check, Chrome, Apple, Wifi, Bell, Zap, HardDrive, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Install = () => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const navigate = useNavigate();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  const [prerequisites, setPrerequisites] = useState({
    https: window.location.protocol === 'https:',
    serviceWorker: false,
    manifest: false,
    browser: true,
  });

  useEffect(() => {
    checkPrerequisites();
  }, []);

  const checkPrerequisites = async () => {
    // Check Service Worker
    const swSupported = 'serviceWorker' in navigator;
    let swActive = false;
    if (swSupported) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        swActive = !!registration?.active;
      } catch (e) {
        swActive = false;
      }
    }

    // Check Manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const hasManifest = !!manifestLink;

    // Check Browser
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const supportedBrowser = isChrome || isEdge || isSafari;

    setPrerequisites({
      https: window.location.protocol === 'https:',
      serviceWorker: swActive,
      manifest: hasManifest,
      browser: supportedBrowser,
    });
  };

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      toast.success('App instalado com sucesso!');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full p-4 mb-4 w-fit">
              <Check className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Instalado!</CardTitle>
            <CardDescription>
              O PostControl já está instalado no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Hero Card */}
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto bg-primary/10 rounded-full p-6 mb-4 w-fit">
              <Smartphone className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Instale o PostControl</CardTitle>
            <CardDescription className="text-base">
              Acesse mais rápido e trabalhe offline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstallable && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full max-w-xs gap-2"
              >
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
            )}

            {/* Benefícios Visuais */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">3x Mais Rápido</h4>
                <p className="text-xs text-muted-foreground">
                  Carregamento instantâneo
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">Funciona Offline</h4>
                <p className="text-xs text-muted-foreground">
                  Trabalhe sem internet
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">Notificações Push</h4>
                <p className="text-xs text-muted-foreground">
                  Receba atualizações
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">Salva Dados</h4>
                <p className="text-xs text-muted-foreground">
                  Cache inteligente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status e Pré-requisitos */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Instalação</CardTitle>
            <CardDescription>Verifique os requisitos para instalar o PWA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {prerequisites.https ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">HTTPS Habilitado</span>
                </div>
                <Badge variant={prerequisites.https ? "default" : "destructive"}>
                  {prerequisites.https ? "OK" : "Falha"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {prerequisites.browser ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Navegador Compatível</span>
                </div>
                <Badge variant={prerequisites.browser ? "default" : "destructive"}>
                  {prerequisites.browser ? "OK" : "Incompatível"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {prerequisites.serviceWorker ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Service Worker Ativo</span>
                </div>
                <Badge variant={prerequisites.serviceWorker ? "default" : "destructive"}>
                  {prerequisites.serviceWorker ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {prerequisites.manifest ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Manifest Configurado</span>
                </div>
                <Badge variant={prerequisites.manifest ? "default" : "destructive"}>
                  {prerequisites.manifest ? "OK" : "Ausente"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Solução de Problemas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Botão de instalar não aparece</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Possíveis causas:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>App já está instalado</li>
                    <li>Navegador não suporta PWA</li>
                    <li>Site não está em HTTPS</li>
                    <li>Manifest.json com erro</li>
                  </ul>
                  <p className="mt-3"><strong>Solução:</strong></p>
                  <p>Verifique o status acima. Se todos estiverem OK, tente limpar o cache do navegador.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Instalei mas não vejo o ícone</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>No Android:</strong> Verifique a gaveta de apps ou tela inicial</p>
                  <p><strong>No iOS:</strong> Procure na tela inicial onde você adicionou</p>
                  <p><strong>No Desktop:</strong> Abra chrome://apps ou procure nos aplicativos instalados</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>App não funciona offline</AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Certifique-se de que o Service Worker está ativo (verifique o status acima).</p>
                  <p>Navegue pelo app online primeiro para fazer cache das páginas.</p>
                  <p>Se o problema persistir, reinstale o aplicativo.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Instruções Android */}
        {isAndroid && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Chrome className="h-6 w-6 text-primary" />
                <CardTitle>Instalar no Android</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Toque no menu (⋮) no canto superior direito</li>
                <li>Selecione "Instalar app" ou "Adicionar à tela inicial"</li>
                <li>Confirme tocando em "Instalar"</li>
                <li>O app aparecerá na sua tela inicial</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Instruções iOS */}
        {isIOS && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Apple className="h-6 w-6 text-primary" />
                <CardTitle>Instalar no iPhone/iPad</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Toque no botão "Compartilhar" (□↑) na barra inferior</li>
                <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                <li>Toque em "Adicionar" no canto superior direito</li>
                <li>O app aparecerá na sua tela inicial</li>
              </ol>
              <p className="text-xs text-muted-foreground italic">
                Nota: A instalação automática não é suportada pelo Safari. 
                Use o método manual acima.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Install;
