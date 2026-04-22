"use client";

import { useEffect } from "react";
import { applyDevFlagsToWindow, readDevFlags } from "@/lib/dev-flags";

/**
 * Reads the saved dev flag map from localStorage and applies each flag to
 * `window` so consumer code (e.g. the Tutorial SDK debug logger) can read it.
 *
 * Mounted once at the top of the (app) layout. Renders nothing.
 *
 * BP-035 / Phase B
 */
export function DevFlagsApplier() {
  useEffect(() => {
    const flags = readDevFlags();
    applyDevFlagsToWindow(flags);
  }, []);

  return null;
}
