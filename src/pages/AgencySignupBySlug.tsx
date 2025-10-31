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

    const { data, error } = await sb
      .from('agencies')
      .select('signup_token, name, logo_url')
      .eq('slug', slug)
      .maybeSingle();

    if (data?.signup_token) {
      setToken(data.signup_token);
      setAgencyName(data.name || "");
      setAgencyLogo(data.logo_url);
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
            {agencyLogo && (
              <img 
                src={agencyLogo} 
                alt={`Logo ${agencyName}`}
                className="h-16 w-auto object-contain drop-shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
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
