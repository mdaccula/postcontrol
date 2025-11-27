import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  clearAllCache = async () => {
    try {
      // 1. Limpar localStorage (exceto auth)
      const authKeys = ['sb-vrcqnhksybtrfpagnwdq-auth-token'];
      Object.keys(localStorage).forEach(key => {
        if (!authKeys.some(ak => key.includes(ak))) {
          localStorage.removeItem(key);
        }
      });
      
      // 2. Unregister Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      
      // 3. Limpar caches do SW
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      
      // 4. Recarregar página
      window.location.reload();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-6 w-6" />
                <CardTitle>Algo deu errado</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro inesperado ao carregar a página. Isso pode ter sido causado por dados corrompidos no cache.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error && (
                <div className="bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button onClick={this.clearAllCache} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Limpar cache e recarregar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Apenas recarregar
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
