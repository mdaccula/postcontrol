import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { sb } from "@/lib/supabaseSafe";
import { useAuthStore } from "@/stores/authStore";
import AgencySignup from "./AgencySignup";

export default function AgencySignupBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>("");
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokenBySlug();
  }, [slug]);

  // ✅ B1: Se usuário já está logado, associar à agência e redirecionar
  useEffect(() => {
    const associateAndRedirect = async () => {
      if (user && agencyId && !loading) {
        console.log("🔗 Usuário logado detectado, associando à agência:", {
          user_id: user.id,
          agency_id: agencyId,
          agency_name: agencyName,
        });

        // Associar usuário à agência
        const { error: agencyLinkError } = await sb.from("user_agencies").upsert(
          {
            user_id: user.id,
            agency_id: agencyId,
            last_accessed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,agency_id",
          },
        );

        if (agencyLinkError) {
          console.error("❌ Erro ao vincular agência:", agencyLinkError);
        } else {
          console.log("✅ Agência vinculada! Redirecionando para /submit");
        }

        // Redirecionar para submit
        navigate('/submit', { replace: true });
      }
    };

    associateAndRedirect();
  }, [user, agencyId, loading, navigate, agencyName]);

  const loadTokenBySlug = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    // Usar nova função security definer que expõe signup_token publicamente
    const { data, error } = await sb
      .rpc('get_agency_signup_data', { agency_slug_or_token: slug });

    if (error) {
      console.error('❌ Erro ao buscar agência:', error);
    }

    if (data && data.length > 0) {
      const agency = data[0];
      setToken(agency.signup_token);
      setAgencyId(agency.id);
      setAgencyName(agency.name || "");
      setAgencyLogo(agency.logo_url);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/404" replace />;
  }

  // Se usuário está logado, o useEffect acima vai redirecionar
  // Mas enquanto isso, mostrar loading
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Associando você à {agencyName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Meta Tags para Link Preview */}
      {agencyLogo && (
        <Helmet>
          <title>Cadastro - {agencyName}</title>
          <meta name="description" content={`Faça seu cadastro na ${agencyName} e comece a divulgar eventos`} />
          
          {/* Open Graph */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:title" content={`Cadastro - ${agencyName}`} />
          <meta property="og:description" content={`Faça seu cadastro na ${agencyName} e comece a divulgar eventos`} />
          <meta property="og:image" content={agencyLogo} />
          <meta property="og:image:secure_url" content={agencyLogo} />
          <meta property="og:image:width" content="400" />
          <meta property="og:image:height" content="400" />
          <meta property="og:site_name" content={agencyName} />
          
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={`Cadastro - ${agencyName}`} />
          <meta name="twitter:description" content={`Faça seu cadastro na ${agencyName} e comece a divulgar eventos`} />
          <meta name="twitter:image" content={agencyLogo} />
          <meta name="twitter:image:alt" content={`Logo ${agencyName}`} />
        </Helmet>
      )}
      
      {/* Agency Branding Header */}
      <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            {agencyLogo ? (
              <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                <img 
                  src={agencyLogo} 
                  alt={`Logo ${agencyName}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      // Use textContent instead of innerHTML to prevent XSS
                      const fallback = document.createElement('span');
                      fallback.className = 'text-2xl font-bold text-muted-foreground';
                      fallback.textContent = agencyName.charAt(0).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{agencyName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
              {agencyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Faça seu cadastro e comece a divulgar
            </p>
          </div>
        </div>
      </div>
      
      <AgencySignup tokenFromSlug={token} />
    </div>
  );
}
