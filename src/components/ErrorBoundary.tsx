import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    // Limpar cache e recarregar
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="p-8 max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold text-center">
                Erro ao Carregar Página
              </h2>
              <p className="text-center text-muted-foreground text-sm">
                Ocorreu um erro ao carregar os recursos da página. 
                Isso pode ser causado por cache desatualizado.
              </p>
              <Button onClick={this.handleReload} className="w-full">
                Limpar Cache e Recarregar
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
