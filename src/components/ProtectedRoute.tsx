import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type UserRole = 'user' | 'agency_admin' | 'master_admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireAgencyAdmin?: boolean;
  requireMasterAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  requireAgencyAdmin,
  requireMasterAdmin,
}: ProtectedRouteProps) => {
  const { hasRole, isAgencyAdmin, isMasterAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      let hasAccess = true;

      if (requireMasterAdmin && !isMasterAdmin) {
        hasAccess = false;
      } else if (requireAgencyAdmin && !isAgencyAdmin && !isMasterAdmin) {
        hasAccess = false;
      } else if (requiredRole && !hasRole(requiredRole) && !isMasterAdmin) {
        hasAccess = false;
      }

      if (!hasAccess) {
        toast.error('Acesso negado. Você não tem permissão para acessar esta página.');
        navigate('/dashboard');
      }
    }
  }, [loading, requiredRole, requireAgencyAdmin, requireMasterAdmin, hasRole, isAgencyAdmin, isMasterAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
