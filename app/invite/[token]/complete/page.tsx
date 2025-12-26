"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function InviteCompletePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeInvitation = async () => {
      try {
        const res = await fetch(`/api/invite/${token}/accept`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to accept invitation");
        }

        if (data.requiresAuth) {
          // Still not authenticated - redirect to auth
          router.push(`/auth?redirect=/invite/${token}/complete`);
          return;
        }

        setStatus("success");

        // Redirect after a short delay
        setTimeout(() => {
          router.push(data.redirectTo || "/");
        }, 2000);
      } catch (err) {
        console.error("Complete error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    };

    completeInvitation();
  }, [token, router]);

  if (status === "processing") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Setting up your access...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Something Went Wrong
          </h1>
          <p className="text-text-muted mb-6">
            {error || "We couldn't complete your invitation. Please try again."}
          </p>
          <Button onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          You&apos;re All Set!
        </h1>
        <p className="text-text-muted mb-6">
          You now have access to view the profile. Redirecting you now...
        </p>
        <Loader2 className="w-5 h-5 text-accent-primary animate-spin mx-auto" />
      </div>
    </div>
  );
}
