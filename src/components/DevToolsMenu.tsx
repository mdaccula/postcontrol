import { Link } from 'react-router-dom';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Code2, Activity, Smartphone, Terminal, FileCode, Trash2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

export const DevToolsMenu = () => {
  const { isMasterAdmin, isAgencyAdmin } = useUserRole();
  const { toast } = useToast();

  // Apenas admins veem este menu
  if (!isAgencyAdmin && !isMasterAdmin) {
    return null;
  }

  const handleClearCache = async () => {
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
      
      toast({
        title: "Cache limpo com sucesso",
        description: "A página será recarregada...",
      });
      
      // 4. Recarregar após 1 segundo
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast({
        title: "Erro ao limpar cache",
        description: "Tente novamente ou recarregue a página manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Code2 className="h-5 w-5" />
          <span className="sr-only">Ferramentas de Desenvolvimento</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Dev Tools
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/push-diagnostic" className="cursor-pointer">
            <Activity className="mr-2 h-4 w-4" />
            <span>Diagnóstico Push</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/install" className="cursor-pointer">
            <Smartphone className="mr-2 h-4 w-4" />
            <span>Instalar PWA</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleClearCache} className="cursor-pointer text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Limpar Cache</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <a 
            href="chrome://serviceworker-internals" 
            target="_blank" 
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <FileCode className="mr-2 h-4 w-4" />
            <span>Service Worker Logs</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
