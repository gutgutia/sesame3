"use client";

/**
 * /auth/callback
 *
 * Client-side callback page for OAuth.
 * Handles the hash fragment from Supabase OAuth redirect,
 * then calls our API to create the session.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function CallbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary mx-auto mb-4" />
        <p className="text-text-muted">Completing sign in...</p>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Check for error in URL params (from Supabase)
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        if (errorParam) {
          console.error("[Auth Callback] OAuth error:", errorParam, errorDescription);
          router.replace(`/auth?error=auth_failed`);
          return;
        }

        // Get the session - Supabase client will automatically extract tokens from hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[Auth Callback] Session error:", sessionError);
          router.replace(`/auth?error=auth_failed`);
          return;
        }

        if (!session) {
          // Try to exchange code if present (PKCE flow)
          const code = searchParams.get("code");
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error("[Auth Callback] Code exchange error:", exchangeError);
              router.replace(`/auth?error=auth_failed`);
              return;
            }
            // Get session after exchange
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (!newSession) {
              router.replace(`/auth?error=no_session`);
              return;
            }
            await completeAuth(newSession.access_token);
          } else {
            console.error("[Auth Callback] No session or code found");
            router.replace(`/auth?error=no_code`);
          }
          return;
        }

        // We have a session, complete the auth
        await completeAuth(session.access_token);
      } catch (err) {
        console.error("[Auth Callback] Unexpected error:", err);
        router.replace(`/auth?error=unexpected`);
      }
    };

    const completeAuth = async (accessToken: string) => {
      // Get redirect from URL params
      const redirect = searchParams.get("redirect") || "/";

      // Call our API to create/update user and set session cookies
      const response = await fetch("/api/auth/google-callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken, redirect }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Auth Callback] API error:", data.error);
        router.replace(`/auth?error=auth_failed`);
        return;
      }

      // Redirect to the appropriate page
      router.replace(data.redirectTo || redirect);
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth" className="text-accent-primary hover:underline">
            Return to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary mx-auto mb-4" />
        <p className="text-text-muted">Completing sign in...</p>
      </div>
    </div>
  );
}
