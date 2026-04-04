import { Building2 } from "lucide-react";
import { WorkspaceSetupWizard } from "@/components/workspace/workspace-setup-wizard";

export default function WorkspaceSetupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set Up Your Workspace</h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          Create a shared workspace for your brand or team. Configure your brand voice,
          target audience, and content pillars so every team member posts with a consistent message.
        </p>
      </div>

      <WorkspaceSetupWizard />
    </div>
  );
}
