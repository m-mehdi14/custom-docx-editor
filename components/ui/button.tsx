import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-paper)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--c-accent)] text-white shadow-[0_1px_3px_rgba(194,65,12,0.35)] hover:bg-[var(--c-accent-dark)]",
        outline:
          "border border-[var(--c-border)] bg-transparent text-[var(--c-ink-muted)] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-tint)] hover:text-[var(--c-accent)]",
        ghost:
          "bg-transparent text-[var(--c-ink-muted)] hover:bg-[var(--c-accent-tint)] hover:text-[var(--c-accent)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
