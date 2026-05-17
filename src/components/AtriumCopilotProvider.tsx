"use client";

import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

export function AtriumCopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
      {children}
    </CopilotKit>
  );
}
