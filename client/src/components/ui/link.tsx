import * as React from "react";
import { Link as RouterLink, NavLink as RouterNavLink } from "react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva(
  "rounded-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "font-medium text-foreground underline-offset-4 hover:underline",
        muted: "text-muted-foreground hover:text-foreground",
        accent: "font-medium text-accent-green underline-offset-4 hover:underline",
        underline: "text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground",
        plain: "",
      },
      inline: {
        true: "inline-flex items-center gap-1",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      inline: true,
    },
  },
);

type BaseProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & VariantProps<typeof linkVariants>;

type RouterLinkProps = BaseProps & { to: React.ComponentProps<typeof RouterLink>["to"]; replace?: boolean; state?: unknown; href?: never; external?: never };

type AnchorLinkProps = BaseProps & { href: string; external?: boolean; to?: never; replace?: never; state?: never };

export type LinkProps = RouterLinkProps | AnchorLinkProps;

export const Link = ({ className, variant, inline, ...props }: LinkProps) => {
  const classes = cn(linkVariants({ variant, inline }), className);
  if (props.to !== undefined) {
    const { to, replace, state, ...rest } = props as Omit<RouterLinkProps, "className" | "variant" | "inline">;
    return <RouterLink to={to} replace={replace} state={state} className={classes} {...rest} />;
  }
  const { href, external, ...rest } = props as Omit<AnchorLinkProps, "className" | "variant" | "inline">;
  let isExternal = /^https?:\/\//.test(href);
  if (external !== undefined) {
    isExternal = external;
  }
  if (isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest} />;
  }
  return <a href={href} className={classes} {...rest} />;
};

export const NavItem = ({
  to,
  icon: IconComponent,
  children,
  end,
  badge,
  className,
  onClick,
}: {
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  end?: boolean;
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <RouterNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex h-10 shrink-0 items-center gap-3 rounded-md px-3.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
          isActive && "bg-sidebar-primary font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
          className,
        )
      }
    >
      {IconComponent && <IconComponent className="size-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge}
    </RouterNavLink>
  );
};
