import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const koButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: 
          "text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 duration-200",
        secondary:
          "text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 duration-200", 
        outline:
          "border-2 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 duration-200",
        ghost: 
          "hover:shadow-sm transform hover:-translate-y-0.5 duration-200",
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-0.5 duration-200",
        link: 
          "underline-offset-4 hover:underline duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

const KOButton = React.forwardRef(({ className, variant, size, asChild = false, style, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  
  // Define os estilos baseados nas variantes KO
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--gradient-primary)',
          ...style
        }
      case 'secondary':
        return {
          background: 'var(--gradient-gold)',
          ...style
        }
      case 'outline':
        return {
          borderColor: 'var(--ko-primary-red)',
          color: 'var(--ko-primary-red)',
          backgroundColor: 'transparent',
          ...style
        }
      case 'ghost':
        return {
          color: 'var(--text-secondary)',
          backgroundColor: 'transparent',
          ...style
        }
      default:
        return style
    }
  }

  return (
    <Comp
      className={cn(koButtonVariants({ variant, size, className }))}
      style={getVariantStyles()}
      ref={ref}
      onMouseEnter={(e) => {
        if (variant === 'outline') {
          e.target.style.backgroundColor = 'var(--ko-red-50)';
        } else if (variant === 'ghost') {
          e.target.style.backgroundColor = 'var(--ko-neutral-100)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'outline' || variant === 'ghost') {
          e.target.style.backgroundColor = 'transparent';
        }
      }}
      {...props} 
    />
  );
})
KOButton.displayName = "KOButton"

export { KOButton, koButtonVariants }