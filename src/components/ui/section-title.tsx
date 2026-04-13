import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps extends React.ComponentProps<"h3"> {
  divider?: boolean;
}

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, divider = true, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "sticky top-0 z-10 -ml-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500",
        divider && "mb-2 border-b border-stone-100 dark:border-stone-800/50",
        className
      )}
      {...props}
    />
  )
);
SectionTitle.displayName = "SectionTitle";

export { SectionTitle };
