import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { sb } from '@/lib/supabaseSafe';

export const GTMDiagnostic = () => {
  const [status, setStatus] = useState<'checking' | 'configured' | 'not_configured' | 'error'>('checking');
  const [gtmId, setGtmId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkGTM = async () => {
    setChecking(true);
    try {
      // 1. Verificar se GTM ID está no banco
      const { data: settings, error } = await sb
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'gtm_id')
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar GTM ID:', error);
        setStatus('error');
        return;
      }

      const gtmIdValue = settings?.setting_value?.trim();

      if (!gtmIdValue || gtmIdValue === '') {
        setStatus('not_configured');
        setGtmId('');
        setIsLoaded(false);
        return;
      }

      setGtmId(gtmIdValue);

      // 2. Verificar se script GTM está no código-fonte
      const scriptExists = document.querySelector(`script[data-gtm-id="${gtmIdValue}"]`);
      const dataLayerExists = typeof (window as any).dataLayer !== 'undefined';

      if (scriptExists && dataLayerExists) {
        setStatus('configured');
        setIsLoaded(true);
      } else {
        setStatus('not_configured');
        setIsLoaded(false);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar GTM:', error);
      setStatus('error');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkGTM();
  }, []);

  const StatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
      case 'configured':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not_configured':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const StatusBadge = () => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Verificando...</Badge>;
      case 'configured':
        return <Badge variant="default" className="bg-green-500">✓ Configurado</Badge>;
      case 'not_configured':
        return <Badge variant="secondary">Não Configurado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Google Tag Manager</CardTitle>
              <CardDescription>
                Diagnóstico de integração GTM
              </CardDescription>
            </div>
          </div>
          <StatusBadge />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <StatusIcon />
            <div>
              <p className="text-sm font-medium">Status de Configuração</p>
              <p className="text-xs text-muted-foreground">
                {status === 'checking' && 'Verificando banco de dados...'}
                {status === 'configured' && 'GTM está ativo e funcionando'}
                {status === 'not_configured' && 'GTM não está configurado'}
                {status === 'error' && 'Erro ao verificar GTM'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            {isLoaded ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Script Carregado</p>
              <p className="text-xs text-muted-foreground">
                {isLoaded ? 'Script GTM detectado no HTML' : 'Script GTM não encontrado'}
              </p>
            </div>
          </div>
        </div>

        {/* GTM ID */}
        {gtmId && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">GTM Container ID:</p>
            <code className="text-sm font-mono">{gtmId}</code>
          </div>
        )}

        {/* Mensagem de Status */}
        {status === 'configured' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-sm">
              ✅ Google Tag Manager está configurado e funcionando corretamente.
              Os eventos estão sendo rastreados.
            </AlertDescription>
          </Alert>
        )}

        {status === 'not_configured' && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-sm space-y-2">
              <p>⚠️ GTM não está configurado. Para ativar:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2 text-xs">
                <li>Acesse Master Admin → Settings → Admin Settings</li>
                <li>Preencha o campo "Google Tag Manager ID" (ex: GTM-XXXXXXX)</li>
                <li>Salve e recarregue a página</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ❌ Erro ao verificar configuração do GTM. Verifique as permissões de acesso ao banco.
            </AlertDescription>
          </Alert>
        )}

        {/* Checklist Técnico */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium">Checklist Técnico:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              {status === 'configured' ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              )}
              <span className={status === 'configured' ? 'text-foreground' : 'text-muted-foreground'}>
                GTM ID configurado no banco de dados
              </span>
            </li>
            <li className="flex items-start gap-2">
              {isLoaded ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              )}
              <span className={isLoaded ? 'text-foreground' : 'text-muted-foreground'}>
                Script GTM injetado no HTML (data-gtm-id)
              </span>
            </li>
            <li className="flex items-start gap-2">
              {isLoaded ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              )}
              <span className={isLoaded ? 'text-foreground' : 'text-muted-foreground'}>
                dataLayer disponível (window.dataLayer)
              </span>
            </li>
          </ul>
        </div>

        {/* Botão Recarregar */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={checkGTM}
          disabled={checking}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando...' : 'Verificar Novamente'}
        </Button>

        {/* Instruções para Teste */}
        {status === 'configured' && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-primary hover:underline">
              Como verificar se está rastreando eventos?
            </summary>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground pl-2">
              <li>Abra o Google Tag Manager: <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="underline">tagmanager.google.com</a></li>
              <li>Selecione seu container ({gtmId})</li>
              <li>Clique em "Preview" (canto superior direito)</li>
              <li>Conecte ao site e navegue pelo app</li>
              <li>Tag Assistant mostrará eventos sendo disparados</li>
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
