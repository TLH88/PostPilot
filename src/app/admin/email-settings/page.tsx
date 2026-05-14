"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GreetingsTab } from "@/components/admin/email-settings/greetings-tab";
import { SignaturesTab } from "@/components/admin/email-settings/signatures-tab";
import { FootersTab } from "@/components/admin/email-settings/footers-tab";
import { TemplatesTab } from "@/components/admin/email-settings/templates-tab";

export default function AdminEmailSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">
          Reusable building blocks for system + admin-sent email. Edit a template and the
          next automated email of that type uses the updated content.
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="greetings">Greetings</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="footers">Footers</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-2">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="greetings" className="pt-2">
          <GreetingsTab />
        </TabsContent>
        <TabsContent value="signatures" className="pt-2">
          <SignaturesTab />
        </TabsContent>
        <TabsContent value="footers" className="pt-2">
          <FootersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
