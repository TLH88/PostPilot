"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2, Mail, Send, Users, Image as ImageIcon, Pencil } from "lucide-react";
import { RecipientManagerDialog } from "@/components/admin/recipient-manager-dialog";
import { AttachmentsField, PAYLOAD_MAX_BYTES, type ComposerAttachment } from "@/components/admin/attachments-field";
import { EmailPreviewDialog } from "@/components/admin/email-preview-dialog";
import type { EmailGreeting, EmailSignature, EmailFooter } from "@/lib/email/settings-types";
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

  // Email settings — fetched lazily when dialog opens
  const [greetings, setGreetings] = useState<EmailGreeting[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [footers, setFooters] = useState<EmailFooter[]>([]);
  const [greetingId, setGreetingId] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [selectedFooterIds, setSelectedFooterIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Reset form when recipient set changes or dialog closes
  const recipientKey = recipients.map((r) => r.id).join(",");
  useEffect(() => {
    if (!open) return;
    setSubject("");
    setBodyHtml("");
    setSender("support");
    setShowLogo(true);
    setAttachments([]);
    setSelectedFooterIds(new Set());
    setWorkingRecipients(recipients);
  }, [open, recipientKey]);

  // Fetch greetings + signatures + footers on open
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      const [gRes, sRes, fRes] = await Promise.all([
        fetch("/api/admin/email-settings/greetings"),
        fetch("/api/admin/email-settings/signatures"),
        fetch("/api/admin/email-settings/footers"),
      ]);
      if (!active) return;
      if (gRes.ok) {
        const data = await gRes.json();
        const list: EmailGreeting[] = data.greetings ?? [];
        setGreetings(list);
        const def = list.find((g) => g.is_default) ?? list[0];
        setGreetingId(def?.id ?? null);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        const list: EmailSignature[] = data.signatures ?? [];
        setSignatures(list);
        const def = list.find((s) => s.is_default) ?? list[0];
        setSignatureId(def?.id ?? null);
      }
      if (fRes.ok) {
        const data = await fRes.json();
        const list: EmailFooter[] = data.footers ?? [];
        setFooters(list);
        // No footers selected by default — admin opts in
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const isBulk = workingRecipients.length > 1;
  const single = workingRecipients[0];

  async function handlePreview() {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      toast.error("Subject is required");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml.replace(/<[^>]+>/g, "").trim() === "") {
      toast.error("Message body is required");
      return;
    }

    // Sample recipient: first staged recipient if any, else "Sample User"
    const sample = workingRecipients[0];
    const sampleName = sample?.full_name ?? sample?.email?.split("@")[0] ?? "Sample User";

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);

    try {
      const res = await fetch("/api/admin/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: trimmedSubject,
          bodyHtml,
          from: sender,
          showLogo,
          greetingId,
          signatureId,
          footerIds: Array.from(selectedFooterIds),
          recipientName: sampleName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPreviewError(data.error || `Preview failed (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setPreviewHtml(data.html);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPreviewLoading(false);
    }
  }

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
    const totalAttachmentBytes = attachments.reduce((s, a) => s + a.sizeBytes, 0);
    if (totalAttachmentBytes > PAYLOAD_MAX_BYTES) {
      toast.error("Attachments exceed the 25 MB limit — remove some before sending");
      return;
    }

    setSending(true);
    try {
      const endpoint = isBulk
        ? "/api/admin/email/send-bulk"
        : "/api/admin/email/send-to-user";
      const shared = {
        subject: trimmedSubject,
        bodyHtml,
        from: sender,
        showLogo,
        greetingId,
        signatureId,
        footerIds: Array.from(selectedFooterIds),
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };
      const body = isBulk
        ? { userIds: workingRecipients.map((r) => r.id), ...shared }
        : { userId: single.id, ...shared };

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
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

        {/* Middle row — flex column, no scroll. The Message editor takes
            all leftover vertical space via flex-1 and scrolls internally.
            Other fields stay shrink-0 around it. The composer itself
            never grows; only the message body content scrolls. */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          {isBulk && (
            <div className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Each recipient gets their own email with only their address in the
              To: header. No recipient sees the others.
            </div>
          )}

          {/* Top fields (above body) — fixed height, no shrink */}
          <div className="shrink-0 space-y-3">
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

          {/* Greeting selector */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground">Greeting</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="font-normal" />
                }
              >
                {greetings.find((g) => g.id === greetingId)?.name ?? "None"}
                <span className="ml-2 text-xs text-muted-foreground font-mono truncate max-w-48">
                  {greetings.find((g) => g.id === greetingId)?.content ?? "(no greeting)"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-sm">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Greeting</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGreetingId(null)} className={greetingId === null ? "bg-accent font-semibold" : ""}>
                    <div className="flex flex-col">
                      <span>None</span>
                      <span className="text-[10px] text-muted-foreground">No greeting line</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {greetings.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => setGreetingId(g.id)}
                      className={greetingId === g.id ? "bg-accent font-semibold" : ""}
                    >
                      <div className="flex flex-col">
                        <span>{g.name}{g.is_default ? " (default)" : ""}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">{g.content}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>{/* end top fields */}

          {/* Body — flex-1 takes all remaining vertical space inside the
              dialog's middle row. The editor scrolls internally; the
              composer dimensions never change with content. */}
          <div className="flex flex-col flex-1 min-h-0 gap-1.5">
            <Label className="shrink-0 text-xs text-muted-foreground">Message</Label>
            <RichTextEditor
              fillParent
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Type your message…"
              disabled={sending}
            />
            <p className="shrink-0 text-[10px] text-muted-foreground">
              {isBulk && "Each recipient sees their own first name in the greeting. "}
              Greeting + signature are inserted automatically. Long messages scroll within the box.
            </p>
          </div>

          {/* Bottom fields (below body) — fixed height, no shrink */}
          <div className="shrink-0 space-y-3">
          {/* Signature selector */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground">Signature</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="font-normal" />
                }
              >
                {signatures.find((s) => s.id === signatureId)?.name ?? "None"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-sm">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Signature</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSignatureId(null)} className={signatureId === null ? "bg-accent font-semibold" : ""}>
                    <div className="flex flex-col">
                      <span>None</span>
                      <span className="text-[10px] text-muted-foreground">Default signoff</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {signatures.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => setSignatureId(s.id)}
                      className={signatureId === s.id ? "bg-accent font-semibold" : ""}
                    >
                      {s.name}{s.is_default ? " (default)" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Footers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">Footers</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="font-normal" />
                  }
                >
                  {selectedFooterIds.size === 0
                    ? "Add footer…"
                    : `${selectedFooterIds.size} attached`}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Toggle footers</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {footers.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No footers configured — add some in Email Settings
                      </DropdownMenuItem>
                    ) : (
                      footers.map((f) => {
                        const checked = selectedFooterIds.has(f.id);
                        return (
                          <DropdownMenuItem
                            key={f.id}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFooterIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(f.id)) next.delete(f.id);
                                else next.add(f.id);
                                return next;
                              });
                            }}
                            className={checked ? "bg-accent" : ""}
                          >
                            <div className="flex items-start gap-2 w-full">
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="mt-0.5 size-3.5 rounded border-input accent-primary pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{f.name}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{f.kind.replace(/_/g, " ")}</p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {selectedFooterIds.size > 0 && (
              <div className="flex flex-wrap gap-1">
                {footers
                  .filter((f) => selectedFooterIds.has(f.id))
                  .map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() =>
                        setSelectedFooterIds((prev) => {
                          const next = new Set(prev);
                          next.delete(f.id);
                          return next;
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                    >
                      {f.name}
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <AttachmentsField
            value={attachments}
            onChange={setAttachments}
            disabled={sending}
          />

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
          </div>{/* end bottom fields */}
        </div>{/* end middle row */}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={sending || previewLoading}
            className="gap-1.5"
          >
            <Eye className="size-3.5" />
            Preview
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

      <EmailPreviewDialog
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) {
            setPreviewHtml(null);
            setPreviewError(null);
          }
        }}
        html={previewHtml}
        loading={previewLoading}
        error={previewError}
        subject={subject}
        fromLabel={`${senderMeta.label} <${sender}@mypostpilot.app>`}
        recipientLabel={
          workingRecipients.length === 0
            ? "(no recipients yet)"
            : workingRecipients.length === 1
              ? `${workingRecipients[0].full_name ?? workingRecipients[0].email} <${workingRecipients[0].email}>`
              : `${workingRecipients.length} recipients — preview rendered for ${workingRecipients[0].full_name ?? workingRecipients[0].email}`
        }
        attachments={attachments.map((a) => ({ filename: a.filename, sizeBytes: a.sizeBytes }))}
      />
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
