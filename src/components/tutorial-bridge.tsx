"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  TutorialProvider,
  TutorialGate,
  SupabaseAdapter,
} from "@postpilot/tutorial-sdk";
import type { TutorialTheme } from "@postpilot/tutorial-sdk";
import { createClient } from "@/lib/supabase/client";
import { TUTORIAL_REGISTRY } from "@/lib/tutorials/definitions";

interface TutorialBridgeProps {
  children: React.ReactNode;
  userId: string;
}

/**
 * Bridge component that connects the framework-agnostic tutorial SDK
 * to Next.js routing and Supabase storage.
 */
export function TutorialBridge({ children, userId }: TutorialBridgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const storage = useMemo(
    () => new SupabaseAdapter(supabase as any, userId),
    [supabase, userId]
  );

  // Map app theme CSS variables to tutorial SDK theme
  const theme = useMemo<TutorialTheme>(
    () => ({
      "--tutorial-primary": "var(--primary)",
      "--tutorial-primary-foreground": "var(--primary-foreground)",
      "--tutorial-bg": "var(--card)",
      "--tutorial-bg-foreground": "var(--card-foreground)",
      "--tutorial-border": "var(--border)",
      "--tutorial-muted": "var(--muted)",
      "--tutorial-muted-foreground": "var(--muted-foreground)",
      "--tutorial-radius": "12px",
      "--tutorial-overlay-opacity": "0.65",
    }),
    []
  );

  // Use the overview-app tutorial for first-login gate
  const overviewTutorial = TUTORIAL_REGISTRY["overview-app"];

  return (
    <TutorialProvider
      storage={storage}
      onNavigate={(path) => router.push(path)}
      currentPath={pathname}
      theme={theme}
      tutorialRegistry={TUTORIAL_REGISTRY}
    >
      {overviewTutorial && (
        <TutorialGate
          tutorial={overviewTutorial}
          storage={storage}
          userId={userId}
        />
      )}
      {children}
    </TutorialProvider>
  );
}
