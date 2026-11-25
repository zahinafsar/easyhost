import { Outlet } from "react-router";
import { Check } from "lucide-react";
import { Box } from "@/components/ui/box";
import { Frame } from "@/components/ui/frame";
import { Heading } from "@/components/ui/heading";
import { Logo } from "@/components/ui/image";
import { Link } from "@/components/ui/link";
import { List, ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Accent, Text } from "@/components/ui/text";

const FACTS = ["Deploy any Node.js app with ezhst deploy", "A Postgres database for every project", "S3 compatible storage buckets", "Free plan with 3 projects and 2 apps each"];

export const AuthScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box className="grid min-h-dvh grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Box as="main" className="relative flex min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border bg-surface px-4 py-6 sm:px-8">
        <Box
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_320px_at_20%_0%,color-mix(in_srgb,var(--accent-green)_14%,transparent),transparent_70%),radial-gradient(520px_300px_at_100%_100%,color-mix(in_srgb,var(--info)_10%,transparent),transparent_70%)]"
        />
        <Box className="relative">
          <Link to="/" variant="plain" aria-label="Reverhost home">
            <Logo beta />
          </Link>
        </Box>
        <Box className="relative mx-auto my-auto w-full max-w-sm py-10">{children}</Box>
        <Text size="xs" tone="muted" className="relative">
          &copy; {new Date().getFullYear()} Reverhost
        </Text>
      </Box>
      <Frame variant="inverse" padding="none" className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] flex-col justify-between overflow-hidden p-10 lg:flex">
        <Stack gap={6} className="max-w-md">
          <Heading level={2} display tone="inverse">
            Your app, database and storage in one <Accent>project</Accent>.
          </Heading>
          <List variant="check" gap={3}>
            {FACTS.map((fact) => (
              <ListItem key={fact} icon={Check} className="text-white/75">
                {fact}
              </ListItem>
            ))}
          </List>
        </Stack>
        <Text as="span" aria-hidden className="-mb-6 text-[clamp(72px,9vw,150px)] leading-[0.85] font-medium tracking-[-0.06em] text-white select-none">
          Reverhost
        </Text>
      </Frame>
    </Box>
  );
};

export const AuthLayout = () => {
  return (
    <AuthScreen>
      <Outlet />
    </AuthScreen>
  );
};
