"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Send, Users, Image as ImageIcon, Pencil } from "lucide-react";
import { RecipientManagerDialog } from "@/components/admin/recipient-manager-dialog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SenderKey = "support" | "hello" | "noreply" | "news";

const SENDER_OPTIONS: { key: SenderKey; label: string; description: string }[] = [
  { key: "support", label: "Support", description: "support@ — replies routed to support inbox" },
  { key: "hello", label: "Hello", description: "hello@ — warmer touch, replies to hello inbox" },
  { key: "news", label: "News", description: "news@ — marketing tone" },
  { key: "noreply", label: "Noreply", description: "noreply@ — one-way, no replies" },
];

export interface EmailRecipient {
  id: string;
  email: string;
  full_name: string | null;
}

export interface EmailUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * One or more recipients. Single = uses `/api/admin/email/send-to-user`;
   * many = batches via `/api/admin/email/send-bulk`. Each recipient gets
   * their own email with only their address in To: — no BCC, no leaks.
   */
  recipients: EmailRecipient[];
  /**
   * Full universe of users the admin can add to the recipient list via
   * the Edit Recipients modal. Pass the page-level list.
   */
  allUsers?: EmailRecipient[];
  /** Called after a successful send. */
  onSent?: () => void;
}

export function EmailUserDialog({
  open,
  onOpenChange,
  recipients,
  allUsers,
  onSent,
}: EmailUserDialogProps) {
  const [sender, setSender] = useState<SenderKey>("support");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [sending, setSending] = useState(false);
  // Editable working copy of recipients. Initialized from `recipients`
  // prop when the dialog opens; admin can add/remove via the manager.
  const [workingRecipients, setWorkingRecipients] = useState<EmailRecipient[]>(recipients);
  const [managerOpen, setManagerOpen] = useState(false);

  // Reset form when recipient set changes or dialog closes
  const recipientKey = recipients.map((r) => r.id).join(",");
  useEffect(() => {
    if (!open) return;
    setSubject("");
    setBodyHtml("");
    setSender("support");
    setShowLogo(true);
    setWorkingRecipients(recipients);
  }, [open, recipientKey]);

  const isBulk = workingRecipients.length > 1;
  const single = workingRecipients[0];

  async function handleSend() {
    if (workingRecipients.length === 0) return;
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      toast.error("Subject is required");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml.replace(/<[^>]+>/g, "").trim() === "") {
      toast.error("Message body is required");
      return;
    }

    setSending(true);
    try {
      const endpoint = isBulk
        ? "/api/admin/email/send-bulk"
        : "/api/admin/email/send-to-user";
      const body = isBulk
        ? {
            userIds: workingRecipients.map((r) => r.id),
            subject: trimmedSubject,
            bodyHtml,
            from: sender,
            showLogo,
          }
        : {
            userId: single.id,
            subject: trimmedSubject,
            bodyHtml,
            from: sender,
            showLogo,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Send failed (HTTP ${res.status})`);
        return;
      }

      const data = await res.json();
      if (isBulk) {
        const detailParts: string[] = [];
        if (data.failed) detailParts.push(`${data.failed} failed`);
        if (data.skipped) detailParts.push(`${data.skipped} skipped (no email)`);
        toast.success(`Sent to ${data.sent} of ${workingRecipients.length} users`, {
          description: detailParts.length ? detailParts.join(", ") : `Batch id: ${data.batchId}`,
        });
      } else {
        toast.success(`Email sent to ${single.email}`, {
          description: `Resend id: ${data.id}`,
        });
      }
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Send failed", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSending(false);
    }
  }

  const senderMeta = SENDER_OPTIONS.find((s) => s.key === sender) ?? SENDER_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBulk ? <Users className="size-4" /> : <Mail className="size-4" />}
            {isBulk ? "Email selected users" : "Email user"}
          </DialogTitle>
          <DialogDescription>
            {workingRecipients.length === 0 ? (
              "No recipient selected"
            ) : isBulk ? (
              <RecipientSummaryBar
                recipients={workingRecipients}
                onEdit={allUsers ? () => setManagerOpen(true) : undefined}
              />
            ) : (
              <span className="flex items-center justify-between gap-2 flex-wrap">
                <span>
                  Sending to{" "}
                  <span className="font-medium text-foreground">
                    {single.full_name ?? single.email}
                  </span>{" "}
                  <span className="text-muted-foreground">({single.email})</span>
                </span>
                {allUsers && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagerOpen(true)}
                    className="h-7 gap-1 text-xs"
                  >
                    <Pencil className="size-3" />
                    Edit recipients
                  </Button>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isBulk && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Each recipient gets their own email with only their address in the
            To: header. No recipient sees the others.
          </div>
        )}

        <div className="space-y-3">
          {/* Sender picker */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground">From</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="font-normal" />
                }
              >
                {senderMeta.label}
                <span className="ml-2 text-xs text-muted-foreground">{senderMeta.description}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Sender address</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SENDER_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.key}
                      onClick={() => setSender(opt.key)}
                      className={opt.key === sender ? "bg-accent font-semibold" : ""}
                    >
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-xs text-muted-foreground">
              Subject
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A short, clear subject line"
              maxLength={200}
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Type your message…"
              disabled={sending}
            />
            <p className="text-[10px] text-muted-foreground">
              Greeting + signoff are added automatically by the template.
              {isBulk && " Each recipient sees their own first name in the greeting."}
            </p>
          </div>

          {/* Display options */}
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <Label htmlFor="show-logo-toggle" className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <ImageIcon className="size-3.5 text-muted-foreground" />
              Show PostPilot logo at top of email
            </Label>
            <button
              id="show-logo-toggle"
              type="button"
              role="switch"
              aria-checked={showLogo}
              onClick={() => setShowLogo((v) => !v)}
              disabled={sending}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                showLogo ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  showLogo ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || workingRecipients.length === 0}>
            {sending ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="size-3.5 mr-1.5" />
                {isBulk ? `Send to ${workingRecipients.length} users` : "Send email"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {allUsers && (
        <RecipientManagerDialog
          open={managerOpen}
          onOpenChange={setManagerOpen}
          recipients={workingRecipients}
          allUsers={allUsers}
          onApply={(next) => setWorkingRecipients(next)}
        />
      )}
    </Dialog>
  );
}

function RecipientSummaryBar({
  recipients,
  onEdit,
}: {
  recipients: EmailRecipient[];
  onEdit?: () => void;
}) {
  return (
    <span className="flex items-center justify-between gap-2 flex-wrap">
      <span>
        Sending to{" "}
        <span className="font-medium text-foreground">
          {recipients.length} user{recipients.length === 1 ? "" : "s"}
        </span>
      </span>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 gap-1 text-xs"
        >
          <Pencil className="size-3" />
          Edit recipients
        </Button>
      )}
    </span>
  );
}
