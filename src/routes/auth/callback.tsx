import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Erreur échange du code :", error);
            navigate({ to: "/" });
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          navigate({ to: "/tableau-de-bord" });
        } else {
          navigate({ to: "/" });
        }
      } catch (error) {
        console.error("Erreur authentification :", error);
        navigate({ to: "/" });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      Connexion en cours...
    </div>
  );
}