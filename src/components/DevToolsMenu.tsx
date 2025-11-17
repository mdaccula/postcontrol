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
import { Code2, Activity, Smartphone, Terminal, FileCode } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export const DevToolsMenu = () => {
  const { isMasterAdmin, isAgencyAdmin } = useUserRole();

  // Apenas admins veem este menu
  if (!isAgencyAdmin && !isMasterAdmin) {
    return null;
  }

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
