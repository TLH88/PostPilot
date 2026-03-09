"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function OnboardingGuard({
  onboardingCompleted,
}: {
  onboardingCompleted: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [onboardingCompleted, pathname, router]);

  return null;
}
