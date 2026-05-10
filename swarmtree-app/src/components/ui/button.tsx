import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        // Shadows tinted with the brand green so they match the primary fill.
        // Hover swaps to a clearly darker shade (luminance shift) — important
        // for colorblind users, who can't rely on hue alone.
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_rgb(39_174_96/0.45)] hover:shadow-[0_6px_22px_-4px_rgb(26_122_66/0.6)] hover:bg-swarm-green-dark hover:-translate-y-px dark:hover:bg-swarm-green",
        destructive:
          "bg-destructive text-white shadow-sm hover:brightness-90 hover:shadow-md focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-2 border-swarm-green-dark bg-white text-swarm-green-dark shadow-sm hover:bg-swarm-green-dark hover:text-white hover:shadow-md dark:bg-input/30 dark:border-swarm-green-light dark:text-swarm-green-light dark:hover:bg-swarm-green-light dark:hover:text-swarm-bg-card",
        secondary:
          "bg-secondary text-secondary-foreground border border-swarm-green-dark/30 hover:bg-swarm-green-dark hover:text-white hover:border-swarm-green-dark",
        ghost:
          "text-swarm-green-dark hover:bg-swarm-green-tint hover:text-swarm-green-dark dark:text-swarm-green-light dark:hover:bg-swarm-green-dark dark:hover:text-swarm-text-on-dark",
        link: "text-primary underline-offset-4 hover:underline hover:text-swarm-green-dark rounded-none",
        accent:
          "bg-swarm-amber text-white shadow-[0_4px_14px_-4px_rgb(232_149_26/0.5)] hover:shadow-[0_6px_22px_-4px_rgb(168_102_16/0.6)] hover:bg-swarm-amber-dark hover:-translate-y-px",
      },
      size: {
        default: "h-9 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-11 px-7 has-[>svg]:px-5 text-[0.95rem]",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
