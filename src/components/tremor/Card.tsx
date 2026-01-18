import React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cx } from "@/lib/utils";

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    return (
      <Component
        ref={forwardedRef}
        className={cx(
          "rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card, type CardProps };
