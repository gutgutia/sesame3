"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";

type InvitationStatus = "loading" | "valid" | "invalid" | "expired" | "already_accepted";

interface InvitationData {
  studentName: string;
  inviterName: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<InvitationStatus>("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.error === "expired") {
            setStatus("expired");
          } else if (data.error === "already_accepted") {
            setStatus("already_accepted");
          } else {
            setStatus("invalid");
          }
          return;
        }

        setInvitation(data);
        setStatus("valid");
      } catch {
        setStatus("invalid");
      }
    };

    validateInvitation();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // If user needs to authenticate, redirect to auth with the token
      if (data.requiresAuth) {
        router.push(`/auth?redirect=/invite/${token}/complete`);
        return;
      }

      // Already authenticated - go to the profile
      router.push(data.redirectTo || "/");
    } catch (error) {
      console.error("Accept error:", error);
      setIsAccepting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Invalid Invitation
          </h1>
          <p className="text-text-muted mb-6">
            This invitation link is not valid. It may have been revoked or the link is incorrect.
          </p>
          <Button onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Invitation Expired
          </h1>
          <p className="text-text-muted mb-6">
            This invitation has expired. Please ask the person who invited you to send a new invitation.
          </p>
          <Button onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (status === "already_accepted") {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Already Accepted
          </h1>
          <p className="text-text-muted mb-6">
            You&apos;ve already accepted this invitation. Log in to view the profile.
          </p>
          <Button onClick={() => router.push("/auth")}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  // Valid invitation
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-secondary rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-accent-surface rounded-full flex items-center justify-center mx-auto mb-6">
          <UserPlus className="w-8 h-8 text-accent-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          You&apos;re Invited!
        </h1>
        <p className="text-text-muted mb-6">
          <strong className="text-text-primary">{invitation?.inviterName}</strong> has invited you to view{" "}
          <strong className="text-text-primary">{invitation?.studentName}&apos;s</strong> college prep profile on Sesame3.
        </p>
        <p className="text-sm text-text-muted mb-8">
          You&apos;ll be able to follow along with their college preparation journey, including their profile, school list, and goals.
        </p>
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
      </div>
    </div>
  );
}
