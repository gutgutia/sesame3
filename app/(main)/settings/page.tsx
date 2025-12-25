"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Settings, 
  User, 
  CreditCard, 
  Sparkles,
  Check,
  Crown,
  Zap,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Receipt,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";

// =============================================================================
// TYPES
// =============================================================================

type SubscriptionTier = "free" | "standard" | "premium";
type SubscriptionStatus = "none" | "active" | "canceling" | "past_due";

type SubscriptionData = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  interval: "month" | "year" | null;
  amount: number | null;
};

type UserSettings = {
  email: string;
  subscription: SubscriptionData;
};

type UsageData = {
  dailyCost: number;
  dailyLimit: number;
  weeklyCost: number;
  weeklyLimit: number;
  messageCount: number;
  messageLimit: number;
};

type Invoice = {
  id: string;
  date: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
};

type ProrationPreview = {
  isNewSubscription: boolean;
  prorationAmount?: number;
  totalAmount: number;
  currency: string;
  message: string;
  periodEnd?: string;
};

// =============================================================================
// PRICING DATA
// =============================================================================

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: 0,
    priceYearly: 0,
    description: "Get started with AI-powered college counseling",
    features: [
      "20 messages per day",
      "Basic advisor (Haiku)",
      "Profile building",
      "School list management",
      "Goal tracking",
    ],
    icon: Zap,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  {
    id: "standard" as const,
    name: "Standard",
    price: 9.99,
    priceYearly: 99,
    description: "Deep, personalized guidance for serious students",
    features: [
      "100 messages per day",
      "Advanced advisor (Sonnet)",
      "Detailed chances analysis",
      "Priority support",
      "Everything in Free",
    ],
    icon: Sparkles,
    color: "text-accent-primary",
    bgColor: "bg-accent-surface",
    popular: true,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: 24.99,
    priceYearly: 249,
    description: "The most powerful AI counselor available",
    features: [
      "500 messages per day",
      "Expert advisor (Opus)",
      "Comprehensive strategy sessions",
      "Essay feedback (coming soon)",
      "Everything in Standard",
    ],
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
];

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
};

// =============================================================================
// CONFIRMATION MODAL
// =============================================================================

function ConfirmationModal({
  isOpen,
  title,
  message,
  details,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  details?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          {title}
        </h2>
        
        <p className="text-text-secondary mb-4">
          {message}
        </p>
        
        {details && (
          <div className="mb-6">
            {details}
          </div>
        )}
        
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "flex-1",
              confirmVariant === "danger" && "bg-red-600 hover:bg-red-700"
            )}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUCCESS TOAST
// =============================================================================

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 z-50">
      <Check className="w-5 h-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SettingsPage() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"profile" | "subscription">("subscription");
  const [isYearly, setIsYearly] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: React.ReactNode;
    confirmLabel: string;
    confirmVariant: "primary" | "danger";
    action: () => Promise<void>;
  } | null>(null);

  // Load user settings, usage, and invoices
  const loadData = useCallback(async () => {
    try {
      const [settingsRes, usageRes, invoicesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/usage"),
        fetch("/api/invoices"),
      ]);
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
      
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data);
      }
      
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const plan = params.get("plan");
      setSuccessMessage(plan ? `Successfully subscribed to ${plan}!` : "Subscription updated!");
      window.history.replaceState({}, "", "/settings");
      loadData();
    }
    if (params.get("canceled") === "true") {
      window.history.replaceState({}, "", "/settings");
    }
  }, [loadData]);

  // Subscription helpers
  const subscription = settings?.subscription;
  const currentTier = subscription?.tier || "free";
  const isActive = subscription?.status === "active";
  const isCanceling = subscription?.status === "canceling";
  const hasSubscription = currentTier !== "free" && subscription?.status !== "none";

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  const handleUpgrade = async (planId: SubscriptionTier) => {
    if (planId === "free") return;
    
    // First, get proration preview
    setActionLoading(`preview-${planId}`);
    
    try {
      const previewRes = await fetch("/api/subscription/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, yearly: isYearly }),
      });
      
      if (!previewRes.ok) {
        throw new Error("Failed to get preview");
      }
      
      const preview: ProrationPreview = await previewRes.json();
      setActionLoading(null);
      
      // Show confirmation modal with proration info
      const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
      
      setConfirmModal({
        isOpen: true,
        title: `Upgrade to ${planName}?`,
        message: preview.isNewSubscription
          ? `You'll get access to all ${planName} features immediately.`
          : `Your upgrade will take effect immediately.`,
        details: (
          <div className="bg-surface-secondary rounded-xl p-4 space-y-2">
            {!preview.isNewSubscription && preview.prorationAmount !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Proration adjustment</span>
                <span className="text-text-primary">
                  {preview.prorationAmount >= 0 ? "+" : "-"}${Math.abs(preview.prorationAmount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-border-subtle">
              <span className="text-text-primary">Charge today</span>
              <span className="text-text-primary">${preview.totalAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-text-muted pt-2">
              {preview.isNewSubscription
                ? `Then $${isYearly ? (planId === "premium" ? "249" : "99") : (planId === "premium" ? "24.99" : "9.99")}/${isYearly ? "year" : "month"} starting ${isYearly ? "next year" : "next month"}.`
                : `Your billing cycle remains unchanged.`}
            </p>
          </div>
        ),
        confirmLabel: `Pay $${preview.totalAmount.toFixed(2)}`,
        confirmVariant: "primary",
        action: async () => {
          setActionLoading(planId);
          try {
            const res = await fetch("/api/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                action: "upgrade", 
                plan: planId, 
                yearly: isYearly 
              }),
            });
            
            const data = await res.json();
            
            if (res.ok) {
              if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else if (data.immediate) {
                setSuccessMessage(data.message);
                await loadData();
              }
            } else {
              alert(data.error || "Failed to upgrade");
            }
          } catch (error) {
            console.error("Upgrade error:", error);
            alert("Failed to upgrade. Please try again.");
          } finally {
            setActionLoading(null);
            setConfirmModal(null);
          }
        },
      });
    } catch (error) {
      console.error("Preview error:", error);
      setActionLoading(null);
      alert("Failed to calculate upgrade cost. Please try again.");
    }
  };

  const handleDowngrade = async (planId: SubscriptionTier) => {
    const periodEnd = subscription?.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : "the end of your billing period";
    
    setConfirmModal({
      isOpen: true,
      title: "Switch to Standard?",
      message: `You'll keep Premium access until ${periodEnd}. After that, you'll be switched to Standard.`,
      details: (
        <div className="bg-blue-50 text-blue-800 rounded-xl p-4 text-sm">
          <p className="font-medium mb-1">No charge today</p>
          <p className="text-blue-600">
            The switch will happen automatically at your next billing date. 
            You&apos;ll continue to enjoy Premium features until then.
          </p>
        </div>
      ),
      confirmLabel: "Schedule Switch",
      confirmVariant: "primary",
      action: async () => {
        setActionLoading(planId);
        try {
          const res = await fetch("/api/subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              action: "downgrade", 
              plan: planId, 
              yearly: isYearly 
            }),
          });
          
          const data = await res.json();
          
          if (res.ok) {
            setSuccessMessage(data.message);
            await loadData();
          } else {
            alert(data.error || "Failed to switch plan");
          }
        } catch (error) {
          console.error("Downgrade error:", error);
          alert("Failed to switch plan. Please try again.");
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleCancel = async () => {
    const periodEnd = subscription?.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : "the end of your billing period";
    
    setConfirmModal({
      isOpen: true,
      title: "Cancel subscription?",
      message: `You'll keep access to ${currentTier} features until ${periodEnd}. After that, you'll be on the Free plan.`,
      details: (
        <div className="bg-yellow-50 text-yellow-800 rounded-xl p-4 text-sm">
          <p className="font-medium mb-1">No refund for remaining time</p>
          <p className="text-yellow-700">
            You can continue using all features until your access ends. 
            You can reactivate anytime before then.
          </p>
        </div>
      ),
      confirmLabel: "Cancel Subscription",
      confirmVariant: "danger",
      action: async () => {
        setActionLoading("cancel");
        try {
          const res = await fetch("/api/subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel" }),
          });
          
          const data = await res.json();
          
          if (res.ok) {
            setSuccessMessage(data.message);
            await loadData();
          } else {
            alert(data.error || "Failed to cancel");
          }
        } catch (error) {
          console.error("Cancel error:", error);
          alert("Failed to cancel. Please try again.");
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccessMessage(data.message);
        await loadData();
      } else {
        alert(data.error || "Failed to reactivate");
      }
    } catch (error) {
      console.error("Reactivate error:", error);
      alert("Failed to reactivate. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderPlanButton = (plan: typeof PLANS[0]) => {
    const planLevel = TIER_LEVELS[plan.id];
    const currentLevel = TIER_LEVELS[currentTier];
    const isCurrentPlan = plan.id === currentTier;

    if (isCurrentPlan) {
      return (
        <Button variant="secondary" className="w-full" disabled>
          Current Plan
        </Button>
      );
    }

    if (plan.id === "free") {
      if (hasSubscription) {
        return null;
      }
      return (
        <Button variant="secondary" className="w-full" disabled>
          Free Forever
        </Button>
      );
    }

    if (isCanceling) {
      return (
        <Button variant="secondary" className="w-full" disabled>
          {planLevel > currentLevel ? "Upgrade" : "Switch Plan"}
        </Button>
      );
    }

    if (planLevel > currentLevel) {
      const isLoadingPreview = actionLoading === `preview-${plan.id}`;
      return (
        <Button
          className="w-full"
          onClick={() => handleUpgrade(plan.id)}
          disabled={isLoadingPreview || actionLoading === plan.id}
        >
          {isLoadingPreview || actionLoading === plan.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Upgrade
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      );
    }

    if (planLevel < currentLevel && plan.id !== "free") {
      return (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => handleDowngrade(plan.id)}
          disabled={actionLoading === plan.id}
        >
          {actionLoading === plan.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Switch Plan"
          )}
        </Button>
      );
    }

    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Success Toast */}
      {successMessage && (
        <SuccessToast 
          message={successMessage} 
          onClose={() => setSuccessMessage(null)} 
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          details={confirmModal.details}
          confirmLabel={confirmModal.confirmLabel}
          confirmVariant={confirmModal.confirmVariant}
          onConfirm={confirmModal.action}
          onCancel={() => setConfirmModal(null)}
          isLoading={actionLoading !== null}
        />
      )}

      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-secondary/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Settings
            </h1>
          </div>
          <p className="text-text-secondary">
            Manage your account and subscription
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "subscription"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Subscription
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "profile"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Subscription Tab */}
            {activeTab === "subscription" && (
              <div className="space-y-8">
                {/* Current Plan Card */}
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">
                    Current Plan
                  </h2>
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Plan Name & Status */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-text-primary capitalize">
                          {currentTier}
                        </span>
                        {isActive && (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        {isCanceling && (
                          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Canceling
                          </span>
                        )}
                      </div>
                      
                      {/* Plan Details for paid subscribers */}
                      {hasSubscription && subscription && (
                        <div className="text-sm text-text-muted mb-3">
                          {subscription.amount && subscription.interval && (
                            <span>
                              ${subscription.amount.toFixed(2)}/{subscription.interval === "year" ? "year" : "month"}
                              {subscription.interval === "year" && " (Annual)"}
                              {subscription.interval === "month" && " (Monthly)"}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Cancellation notice */}
                      {isCanceling && subscription?.currentPeriodEnd && (
                        <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-4 py-3 mb-3">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Subscription ending</p>
                            <p>
                              Your access will end on{" "}
                              <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
                              After that, you&apos;ll be switched to the Free plan.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Next billing for active subscribers */}
                      {isActive && subscription?.currentPeriodEnd && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Calendar className="w-4 h-4 text-text-muted" />
                          <span>
                            Next charge: <strong>${subscription.amount?.toFixed(2)}</strong> on{" "}
                            <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                          </span>
                        </div>
                      )}
                      
                      {/* Free tier message */}
                      {currentTier === "free" && !hasSubscription && (
                        <p className="text-sm text-text-muted">
                          Upgrade to unlock more messages and advanced AI advisors.
                        </p>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isCanceling && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={handleReactivate}
                          disabled={actionLoading === "reactivate"}
                        >
                          {actionLoading === "reactivate" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1.5" />
                              Reactivate
                            </>
                          )}
                        </Button>
                      )}
                      
                      {isActive && hasSubscription && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={handleCancel}
                          disabled={actionLoading === "cancel"}
                          className="text-text-muted hover:text-red-600 hover:bg-red-50"
                        >
                          {actionLoading === "cancel" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Cancel Subscription"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Usage Stats */}
                  {usage && (
                    <div className="mt-6 pt-4 border-t border-border-subtle">
                      <button
                        onClick={() => setShowUsage(!showUsage)}
                        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                      >
                        {showUsage ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span>View usage details</span>
                      </button>
                      
                      {showUsage && (
                        <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="bg-surface-primary rounded-xl p-4">
                            <div className="text-sm text-text-muted mb-1">Messages Today</div>
                            <div className="text-xl font-semibold text-text-primary">
                              {usage.messageCount} / {usage.messageLimit}
                            </div>
                            <div className="mt-2 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent-primary rounded-full transition-all"
                                style={{ width: `${Math.min(100, (usage.messageCount / usage.messageLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-surface-primary rounded-xl p-4">
                            <div className="text-sm text-text-muted mb-1">Daily Cost</div>
                            <div className="text-xl font-semibold text-text-primary">
                              ${usage.dailyCost.toFixed(2)} / ${usage.dailyLimit.toFixed(2)}
                            </div>
                            <div className="mt-2 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent-primary rounded-full transition-all"
                                style={{ width: `${Math.min(100, (usage.dailyCost / usage.dailyLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing Toggle */}
                <div className="flex items-center justify-center gap-3">
                  <span className={cn("text-sm font-medium", !isYearly ? "text-text-primary" : "text-text-muted")}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors",
                      isYearly ? "bg-accent-primary" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        isYearly ? "translate-x-7" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className={cn("text-sm font-medium", isYearly ? "text-text-primary" : "text-text-muted")}>
                    Yearly
                  </span>
                  <span className="text-xs text-accent-primary font-medium bg-accent-surface px-2 py-0.5 rounded-full">
                    Save 17%
                  </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLANS.map((plan) => {
                    const isCurrentPlan = currentTier === plan.id;
                    const price = isYearly ? plan.priceYearly : plan.price;
                    const Icon = plan.icon;
                    
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "relative bg-surface-secondary border rounded-2xl p-6 transition-all",
                          plan.popular && !isCurrentPlan
                            ? "border-accent-primary shadow-lg scale-[1.02]" 
                            : "border-border-subtle",
                          isCurrentPlan && "ring-2 ring-accent-primary ring-offset-2"
                        )}
                      >
                        {plan.popular && !isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-primary text-white text-xs font-medium rounded-full">
                            Most Popular
                          </div>
                        )}
                        
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", plan.bgColor)}>
                          <Icon className={cn("w-5 h-5", plan.color)} />
                        </div>
                        
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                          {plan.name}
                        </h3>
                        
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-bold text-text-primary">
                            ${price}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-text-muted text-sm">
                              /{isYearly ? "year" : "month"}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-text-muted mb-4">
                          {plan.description}
                        </p>
                        
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.color)} />
                              <span className="text-text-secondary">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {renderPlanButton(plan)}
                      </div>
                    );
                  })}
                </div>

                {/* Billing History */}
                {invoices.length > 0 && (
                  <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt className="w-5 h-5 text-text-muted" />
                      <h2 className="text-lg font-semibold text-text-primary">
                        Billing History
                      </h2>
                    </div>
                    
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between py-3 px-4 bg-surface-primary rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-sm font-medium text-text-primary">
                                {invoice.date ? formatDate(invoice.date) : "—"}
                              </div>
                              <div className="text-xs text-text-muted">
                                {invoice.description}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-text-primary">
                                ${invoice.amount.toFixed(2)}
                              </div>
                              <div className={cn(
                                "text-xs",
                                invoice.status === "paid" ? "text-green-600" : "text-yellow-600"
                              )}>
                                {invoice.status === "paid" ? "Paid" : invoice.status}
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              {invoice.invoiceUrl && (
                                <a
                                  href={invoice.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                                  title="View invoice"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {invoice.pdfUrl && (
                                <a
                                  href={invoice.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-6">
                    Your Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Name
                      </label>
                      <div className="text-text-primary">
                        {profile?.firstName} {profile?.lastName}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Email
                      </label>
                      <div className="text-text-primary">
                        {settings?.email || "Not available"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Grade
                      </label>
                      <div className="text-text-primary">
                        {profile?.grade || "Not set"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        High School
                      </label>
                      <div className="text-text-primary">
                        {profile?.highSchoolName || "Not set"}
                        {profile?.highSchoolCity && profile?.highSchoolState && (
                          <span className="text-text-muted">
                            {" "}• {profile.highSchoolCity}, {profile.highSchoolState}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border-subtle">
                    <p className="text-sm text-text-muted">
                      To update your profile information, go to the{" "}
                      <a href="/profile" className="text-accent-primary hover:underline">
                        Profile page
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
