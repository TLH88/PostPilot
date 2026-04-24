/**
 * BP-117 Phase D — Admin CRUD for the system_ai_config singleton.
 *
 * GET  — return the current default provider + model (also who set it and when)
 * POST — update the default provider + model. Validates the value is
 *        allowed (from PROVIDER_CONFIG) before writing.
 *
 * Both routes are admin-gated via verifyAdmin(). Writes use the
 * service_role client (bypasses RLS) — end users can only read, never write.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase/admin";
import { PROVIDER_CONFIG, type AIProvider } from "@/lib/ai/providers";
import { logApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("system_ai_config")
      .select("default_provider, default_model, updated_at, updated_by")
      .eq("id", 1)
      .single();

    if (error) {
      logApiError("api/admin/system-ai-config GET", error);
      return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logApiError("api/admin/system-ai-config GET", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const provider = body.provider as AIProvider | undefined;
    const model = body.model as string | undefined;

    if (!provider || !model) {
      return NextResponse.json(
        { error: "provider and model are required" },
        { status: 400 }
      );
    }

    // Validate provider
    const providerConfig = PROVIDER_CONFIG[provider];
    if (!providerConfig) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    // Validate model is a known option for that provider
    const validModel = providerConfig.availableModels.some((m) => m.value === model);
    if (!validModel) {
      return NextResponse.json(
        { error: `Model '${model}' is not a valid option for ${provider}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("system_ai_config")
      .update({
        default_provider: provider,
        default_model: model,
        updated_at: new Date().toISOString(),
        updated_by: admin.id,
      })
      .eq("id", 1);

    if (error) {
      logApiError("api/admin/system-ai-config POST", error);
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }

    console.log(JSON.stringify({
      level: "info",
      context: "admin/system-ai-config",
      adminEmail: admin.email,
      newProvider: provider,
      newModel: model,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      default_provider: provider,
      default_model: model,
    });
  } catch (error) {
    logApiError("api/admin/system-ai-config POST", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
