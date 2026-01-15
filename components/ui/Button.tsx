import React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot"; // We need to install this or just standard button

// Keeping it simple for prototype without radix for now
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
    
    const variants = {
      primary: "bg-text-main text-white shadow-sm hover:-translate-y-px hover:shadow-md active:translate-y-0",
      secondary: "bg-white border border-border-medium text-text-main hover:bg-bg-app hover:border-text-muted",
      ghost: "bg-transparent text-text-muted hover:bg-black/5 hover:text-text-main",
      outline: "border border-border-subtle bg-transparent hover:bg-white",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-11 px-6 text-[15px]",
      lg: "h-14 px-8 text-base",
      icon: "h-10 w-10 p-0",
    };

    const Comp = "button";

    return (
      <Comp
        type="button"
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
