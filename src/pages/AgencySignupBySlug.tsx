import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { sb } from "@/lib/supabaseSafe";
import AgencySignup from "./AgencySignup";

export default function AgencySignupBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>("");
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokenBySlug();
  }, [slug]);

  const loadTokenBySlug = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    // Usar função security definer para obter apenas dados públicos da agência
    const { data, error } = await sb
      .rpc('get_agency_for_signup', { agency_slug: slug });

    if (data && data.length > 0) {
      const agency = data[0];
      
      // Buscar signup_token separadamente (ainda precisa de acesso via RLS)
      const { data: tokenData } = await sb
        .from('agencies')
        .select('signup_token')
        .eq('id', agency.id)
        .maybeSingle();
      
      if (tokenData?.signup_token) {
        setToken(tokenData.signup_token);
        setAgencyName(agency.name || "");
        setAgencyLogo(agency.logo_url);
      }
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

  return (
    <div className="min-h-screen flex flex-col">
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
