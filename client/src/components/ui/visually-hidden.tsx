import * as React from "react";
import { VisuallyHidden as VisuallyHiddenPrimitive } from "radix-ui";

export const VisuallyHidden = (props: React.ComponentProps<typeof VisuallyHiddenPrimitive.Root>) => {
  return <VisuallyHiddenPrimitive.Root {...props} />;
};
