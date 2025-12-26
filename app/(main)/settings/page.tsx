"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  User,
  CreditCard,
  Check,
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
  ArrowLeftRight,
  Pencil,
  Save,
  MessageSquare,
  Users,
  Mail,
  Trash2,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { PLANS, TIER_LEVELS, type SubscriptionTier } from "@/lib/subscription/plans";

// =============================================================================
// TYPES
// =============================================================================
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
// PLAN SELECTOR MODAL
// =============================================================================

function PlanSelectorModal({
  isOpen,
  currentTier,
  isYearly,
  setIsYearly,
  onSelect,
  onClose,
  actionLoading,
}: {
  isOpen: boolean;
  currentTier: SubscriptionTier;
  isYearly: boolean;
  setIsYearly: (yearly: boolean) => void;
  onSelect: (planId: SubscriptionTier, isUpgrade: boolean) => void;
  onClose: () => void;
  actionLoading: string | null;
}) {
  if (!isOpen) return null;

  const currentLevel = TIER_LEVELS[currentTier];

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Switch Your Plan
        </h2>
        <p className="text-text-secondary mb-6">
          Choose the plan that works best for you
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
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

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentTier === plan.id;
            const planLevel = TIER_LEVELS[plan.id];
            const isUpgrade = planLevel > currentLevel;
            const isDowngrade = planLevel < currentLevel;
            const price = isYearly ? plan.priceYearly : plan.price;
            const Icon = plan.icon;
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative bg-surface-secondary border rounded-2xl p-5 transition-all flex flex-col",
                  plan.popular && !isCurrentPlan
                    ? "border-accent-primary shadow-lg"
                    : "border-border-subtle",
                  isCurrentPlan && "ring-2 ring-accent-primary ring-offset-2"
                )}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-primary text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", plan.bgColor)}>
                  <Icon className={cn("w-4 h-4", plan.color)} />
                </div>
                
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  {plan.name}
                </h3>
                
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-text-primary">
                    ${price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-text-muted text-sm">
                      /{isYearly ? "year" : "month"}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-text-muted mb-4 line-clamp-2">
                  {plan.description}
                </p>
                
                {/* Flex-grow to push button to bottom */}
                <div className="flex-1">
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.color)} />
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button always at bottom */}
                <div className="mt-auto pt-2">
                {isCurrentPlan ? (
                  <Button variant="secondary" className="w-full" disabled size="sm">
                    Current Plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button 
                    variant="secondary" 
                    className="w-full" 
                    size="sm"
                    onClick={() => onClose()}
                  >
                    Cancel to switch
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    variant={isUpgrade ? "primary" : "secondary"}
                    onClick={() => onSelect(plan.id, isUpgrade)}
                    disabled={actionLoading === plan.id || actionLoading === `preview-${plan.id}`}
                  >
                    {actionLoading === plan.id || actionLoading === `preview-${plan.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isUpgrade ? (
                      <>Upgrade <ArrowRight className="w-3 h-3 ml-1" /></>
                    ) : isDowngrade ? (
                      "Switch to this"
                    ) : (
                      "Select"
                    )}
                  </Button>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SettingsPage() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"profile" | "subscription" | "advisor">("profile");
  const [isYearly, setIsYearly] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // Advisor preferences state
  const [accountabilityLevel, setAccountabilityLevel] = useState<"light" | "moderate" | "high">("moderate");
  const [advisorPreferences, setAdvisorPreferences] = useState("");
  const [isSavingAdvisor, setIsSavingAdvisor] = useState(false);
  const [advisorLoaded, setAdvisorLoaded] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolCity, setEditSchoolCity] = useState("");
  const [editSchoolState, setEditSchoolState] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editResidencyStatus, setEditResidencyStatus] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
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

  // Get current plan info
  const currentPlan = PLANS.find(p => p.id === currentTier) || PLANS[0];
  const CurrentPlanIcon = currentPlan.icon;

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  const handlePlanSelect = async (planId: SubscriptionTier, isUpgrade: boolean) => {
    if (planId === "free") return;
    
    if (isUpgrade) {
      // Get proration preview for upgrades
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
        setShowPlanSelector(false);
        
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
    } else {
      // Downgrade - schedule for end of period
      const periodEnd = subscription?.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
        : "the end of your billing period";
      
      setShowPlanSelector(false);
      
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
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Profile editing handlers
  const startEditingProfile = () => {
    setEditFirstName(profile?.firstName || "");
    setEditLastName(profile?.lastName || "");
    setEditGrade(profile?.grade || "");
    setEditSchoolName(profile?.highSchoolName || "");
    setEditSchoolCity(profile?.highSchoolCity || "");
    setEditSchoolState(profile?.highSchoolState || "");
    // Format date as YYYY-MM-DD for input[type="date"]
    setEditBirthDate(profile?.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : "");
    setEditResidencyStatus(profile?.residencyStatus || "");
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          grade: editGrade,
          highSchoolName: editSchoolName,
          highSchoolCity: editSchoolCity,
          highSchoolState: editSchoolState,
          birthDate: editBirthDate || null,
          residencyStatus: editResidencyStatus || null,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Profile updated!");
        setIsEditingProfile(false);
        // Reload to get updated profile
        window.location.reload();
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Save profile error:", error);
      alert("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const GRADE_OPTIONS = ["9th", "10th", "11th", "12th"];

  const RESIDENCY_OPTIONS = [
    { value: "us_citizen", label: "U.S. Citizen" },
    { value: "us_permanent_resident", label: "U.S. Permanent Resident (Green Card)" },
    { value: "international", label: "International Student" },
  ];

  const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
  ];

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

      {/* Plan Selector Modal */}
      <PlanSelectorModal
        isOpen={showPlanSelector}
        currentTier={currentTier}
        isYearly={isYearly}
        setIsYearly={setIsYearly}
        onSelect={handlePlanSelect}
        onClose={() => setShowPlanSelector(false)}
        actionLoading={actionLoading}
      />

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
            onClick={() => setActiveTab("advisor")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "advisor"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Advisor
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-text-primary">
                      Your Information
                    </h2>
                    {!isEditingProfile ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={startEditingProfile}
                      >
                        <Pencil className="w-4 h-4 mr-1.5" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={cancelEditingProfile}
                          disabled={isSavingProfile}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveProfile}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-1.5" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">
                          First Name
                        </label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                          />
                        ) : (
                          <div className="text-text-primary py-2">
                            {profile?.firstName || "—"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">
                          Last Name
                        </label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                          />
                        ) : (
                          <div className="text-text-primary py-2">
                            {profile?.lastName || "—"}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Email - Read only */}
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Email
                      </label>
                      <div className="text-text-primary py-2">
                        {settings?.email || "Not available"}
                      </div>
                    </div>
                    
                    {/* Grade */}
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Grade
                      </label>
                      {isEditingProfile ? (
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        >
                          <option value="">Select grade</option>
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-text-primary py-2">
                          {profile?.grade || "Not set"}
                        </div>
                      )}
                    </div>
                    
                    {/* High School */}
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        High School
                      </label>
                      {isEditingProfile ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editSchoolName}
                            onChange={(e) => setEditSchoolName(e.target.value)}
                            placeholder="School name"
                            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editSchoolCity}
                              onChange={(e) => setEditSchoolCity(e.target.value)}
                              placeholder="City"
                              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                            />
                            <select
                              value={editSchoolState}
                              onChange={(e) => setEditSchoolState(e.target.value)}
                              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                            >
                              <option value="">State</option>
                              {US_STATES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="text-text-primary py-2">
                          {profile?.highSchoolName || "Not set"}
                          {profile?.highSchoolCity && profile?.highSchoolState && (
                            <span className="text-text-muted">
                              {" "}• {profile.highSchoolCity}, {profile.highSchoolState}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Birth Date */}
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Date of Birth
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="date"
                          value={editBirthDate}
                          onChange={(e) => setEditBirthDate(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        />
                      ) : (
                        <div className="text-text-primary py-2">
                          {profile?.birthDate
                            ? new Date(profile.birthDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                            : "Not set"}
                        </div>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        Used to determine eligibility for age-restricted programs
                      </p>
                    </div>

                    {/* Residency Status */}
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Residency Status
                      </label>
                      {isEditingProfile ? (
                        <select
                          value={editResidencyStatus}
                          onChange={(e) => setEditResidencyStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        >
                          <option value="">Select status</option>
                          {RESIDENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-text-primary py-2">
                          {RESIDENCY_OPTIONS.find(opt => opt.value === profile?.residencyStatus)?.label || "Not set"}
                        </div>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        Some programs are only open to U.S. citizens or permanent residents
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Access Section */}
                <AccountAccessSection />
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === "subscription" && (
              <div className="space-y-6">
                {/* Current Plan Card */}
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    {/* Plan Icon */}
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", currentPlan.bgColor)}>
                      <CurrentPlanIcon className={cn("w-6 h-6", currentPlan.color)} />
                    </div>
                    
                    {/* Plan Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold text-text-primary">
                          {currentPlan.name}
                        </h2>
                        {isActive && (
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        {isCanceling && (
                          <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Canceling
                          </span>
                        )}
                      </div>
                      
                      {/* Pricing info */}
                      {hasSubscription && subscription && (
                        <p className="text-sm text-text-muted mb-2">
                          {subscription.amount && subscription.interval && (
                            <>
                              ${subscription.amount.toFixed(2)}/{subscription.interval === "year" ? "year" : "month"}
                              <span className="text-text-muted/60">
                                {subscription.interval === "year" ? " (Annual)" : " (Monthly)"}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      
                      {/* Billing info */}
                      {isCanceling && subscription?.currentPeriodEnd && (
                        <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mt-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Access ends on <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                          </span>
                        </div>
                      )}
                      
                      {isActive && subscription?.currentPeriodEnd && (
                        <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Next charge: <strong className="text-text-secondary">${subscription.amount?.toFixed(2)}</strong> on{" "}
                            <strong className="text-text-secondary">{formatDate(subscription.currentPeriodEnd)}</strong>
                          </span>
                        </div>
                      )}
                      
                      {currentTier === "free" && !hasSubscription && (
                        <p className="text-sm text-text-muted">
                          Upgrade to unlock more messages and advanced AI advisors.
                        </p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {isCanceling ? (
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
                      ) : (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => setShowPlanSelector(true)}
                          >
                            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                            Switch Plan
                          </Button>
                          
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
                                "Cancel"
                              )}
                            </Button>
                          )}
                        </>
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

            {/* Advisor Tab */}
            {activeTab === "advisor" && (
              <AdvisorPreferencesTab
                accountabilityLevel={accountabilityLevel}
                setAccountabilityLevel={setAccountabilityLevel}
                advisorPreferences={advisorPreferences}
                setAdvisorPreferences={setAdvisorPreferences}
                isSaving={isSavingAdvisor}
                setIsSaving={setIsSavingAdvisor}
                advisorLoaded={advisorLoaded}
                setAdvisorLoaded={setAdvisorLoaded}
                setSuccessMessage={setSuccessMessage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ADVISOR PREFERENCES TAB
// =============================================================================

function AdvisorPreferencesTab({
  accountabilityLevel,
  setAccountabilityLevel,
  advisorPreferences,
  setAdvisorPreferences,
  isSaving,
  setIsSaving,
  advisorLoaded,
  setAdvisorLoaded,
  setSuccessMessage,
}: {
  accountabilityLevel: "light" | "moderate" | "high";
  setAccountabilityLevel: (level: "light" | "moderate" | "high") => void;
  advisorPreferences: string;
  setAdvisorPreferences: (prefs: string) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  advisorLoaded: boolean;
  setAdvisorLoaded: (loaded: boolean) => void;
  setSuccessMessage: (msg: string | null) => void;
}) {
  const [isLoading, setIsLoading] = useState(!advisorLoaded);

  // Load preferences on mount
  useEffect(() => {
    if (advisorLoaded) return;

    const loadPreferences = async () => {
      try {
        const res = await fetch("/api/advisor-preferences");
        if (res.ok) {
          const data = await res.json();
          setAccountabilityLevel(data.accountabilityLevel || "moderate");
          setAdvisorPreferences(data.advisorPreferences || "");
        }
      } catch (error) {
        console.error("Failed to load advisor preferences:", error);
      } finally {
        setIsLoading(false);
        setAdvisorLoaded(true);
      }
    };

    loadPreferences();
  }, [advisorLoaded, setAccountabilityLevel, setAdvisorPreferences, setAdvisorLoaded]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/advisor-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountabilityLevel,
          advisorPreferences,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Advisor preferences saved!");
      } else {
        alert("Failed to save preferences");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accountability Level */}
      <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Coaching Style
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Choose how proactive you want your advisor to be about follow-ups and accountability.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              level: "light" as const,
              title: "Light Touch",
              description: "Gentle suggestions without pushing. Good for independent students who prefer to set their own pace.",
              emoji: "🌱",
            },
            {
              level: "moderate" as const,
              title: "Balanced",
              description: "Helpful reminders and encouragement. A good mix of support and autonomy.",
              emoji: "⚖️",
            },
            {
              level: "high" as const,
              title: "High Accountability",
              description: "Proactive follow-ups and direct challenges. Best for students who want to be pushed toward their goals.",
              emoji: "🔥",
            },
          ].map((option) => (
            <button
              key={option.level}
              onClick={() => setAccountabilityLevel(option.level)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all",
                accountabilityLevel === option.level
                  ? "border-accent-primary bg-accent-surface"
                  : "border-border-subtle bg-surface-primary hover:border-border-medium"
              )}
            >
              <div className="text-2xl mb-2">{option.emoji}</div>
              <h3 className="font-medium text-text-primary mb-1">
                {option.title}
              </h3>
              <p className="text-sm text-text-muted">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Preferences */}
      <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Custom Instructions
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Tell your advisor anything specific about how you like to work or communicate.
        </p>

        <textarea
          value={advisorPreferences}
          onChange={(e) => setAdvisorPreferences(e.target.value)}
          placeholder="Example: I'm an early bird so morning check-ins work best. I prefer direct feedback over sugarcoating..."
          className="w-full h-32 px-4 py-3 border border-border-subtle rounded-xl text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
        />

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-medium text-blue-900 mb-2">
          How this affects your advisor
        </h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>• Your preferences are included in every conversation</li>
          <li>• The advisor will adapt its communication style accordingly</li>
          <li>• High accountability enables proactive check-ins on commitments</li>
          <li>• You can change these settings anytime</li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// ACCOUNT ACCESS SECTION
// =============================================================================

type AccessEntry = {
  id: string;
  type: "active" | "pending";
  email: string;
  name: string | null;
  permission: string;
  createdAt: string;
  expiresAt?: string;
};

function AccountAccessSection() {
  const [accessList, setAccessList] = useState<AccessEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadAccessList = useCallback(async () => {
    try {
      const res = await fetch("/api/account-access");
      if (res.ok) {
        const data = await res.json();
        setAccessList(data.accessList || []);
      }
    } catch (err) {
      console.error("Failed to load access list:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccessList();
  }, [loadAccessList]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || isAdding) return;

    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/account-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add email");
      }

      setSuccessMessage(data.message || "Invitation sent!");
      setNewEmail("");
      loadAccessList();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string, type: "active" | "pending") => {
    if (removingId) return;

    setRemovingId(id);

    try {
      const res = await fetch(`/api/account-access?id=${id}&type=${type}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove");
      }

      loadAccessList();
    } catch (err) {
      console.error("Remove error:", err);
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-text-muted" />
        <h2 className="text-lg font-semibold text-text-primary">
          Account Access
        </h2>
      </div>
      <p className="text-sm text-text-muted mb-6">
        Allow others to view your profile. They&apos;ll be able to see your progress, goals, and school list.
      </p>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add email form */}
      <form onSubmit={handleAddEmail} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address"
            className="w-full pl-10 pr-3 py-2 border border-border-subtle rounded-lg text-text-primary bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>
        <Button type="submit" disabled={isAdding || !newEmail.trim()}>
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </>
          )}
        </Button>
      </form>

      {/* Access list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : accessList.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No one else has access to your account yet.</p>
          <p className="text-xs mt-1">Add an email above to share access with a parent, counselor, or tutor.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accessList.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-3 px-4 bg-surface-primary rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  entry.type === "active" ? "bg-green-100" : "bg-yellow-100"
                )}>
                  {entry.type === "active" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {entry.email}
                  </div>
                  <div className="text-xs text-text-muted">
                    {entry.type === "active" ? (
                      <span className="text-green-600">Has access</span>
                    ) : (
                      <span className="text-yellow-600">Invitation pending</span>
                    )}
                    {entry.name && ` • ${entry.name}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(entry.id, entry.type)}
                disabled={removingId === entry.id}
                className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title={entry.type === "active" ? "Revoke access" : "Cancel invitation"}
              >
                {removingId === entry.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
