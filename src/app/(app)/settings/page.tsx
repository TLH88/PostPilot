import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "./sign-out-button";
import { ThemeSetting } from "./theme-setting";
import { ChangePassword } from "./change-password";
import { ChangeEmail } from "./change-email";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings.
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="mt-1 text-sm">{user.email}</p>
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              User ID
            </label>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {user.id}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle>Email Address</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeEmail currentEmail={user.email ?? ""} />
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePassword />
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme for the interface.
          </p>
          <ThemeSetting />
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out of your PostPilot account.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
