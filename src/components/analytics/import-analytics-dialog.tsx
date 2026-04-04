"use client";

import { useState } from "react";
import { Upload, Loader2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ParsedPost {
  excerpt: string;
  impressions: number | null;
  engagements: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
}

interface MatchedPost {
  postId: string;
  postTitle: string;
  excerpt: string;
  impressions: number | null;
  engagements: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  matched: boolean;
}

interface ImportAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

/**
 * Parse pasted LinkedIn analytics text into structured post data.
 * LinkedIn analytics pages show posts sorted by impressions or engagements.
 * Each post block ends with a number followed by "Impressions" or "Engagement".
 */
function parseLinkedInAnalytics(text: string): ParsedPost[] {
  const posts: ParsedPost[] = [];

  // Split by the metric line pattern: " N\nImpressions" or " N\nEngagement"
  const blocks = text.split(/\n\s*(\d[\d,]*)\s*\n\s*(?:Impressions?|Engagements?)\s*\n/i);

  // blocks alternate: [content, metric_value, content, metric_value, ...]
  for (let i = 0; i < blocks.length - 1; i += 2) {
    const content = blocks[i];
    const metricStr = blocks[i + 1];
    if (!content || !metricStr) continue;

    const metricValue = parseInt(metricStr.replace(/,/g, ""), 10);
    if (isNaN(metricValue)) continue;

    // Determine if this is impressions or engagements by checking next block
    const afterMetric = blocks[i + 2]?.slice(0, 50) ?? "";
    // The metric type is in the original text — check what follows the number
    const isEngagement = /engagement/i.test(
      text.slice(
        text.indexOf(metricStr, text.indexOf(content)),
        text.indexOf(metricStr, text.indexOf(content)) + metricStr.length + 30
      )
    );

    // Extract reactions count — look for pattern like "like\n5" or "likeinsightful\n4"
    const reactionMatch = content.match(/(?:like|love|support|insightful|celebrate|funny)\w*\s*\n\s*(\d+)/i);
    const reactions = reactionMatch ? parseInt(reactionMatch[1], 10) : null;

    // Extract comments count
    const commentMatch = content.match(/(\d+)\s*comments?/i);
    const comments = commentMatch ? parseInt(commentMatch[1], 10) : null;

    // Extract reposts count
    const repostMatch = content.match(/(\d+)\s*reposts?/i);
    const reposts = repostMatch ? parseInt(repostMatch[1], 10) : null;

    // Extract post excerpt — find the first substantial text line
    // Skip author name lines and UI chrome
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    let excerpt = "";
    for (const line of lines) {
      // Skip short UI lines, author names, dates, and hashtag-only lines
      if (line.length < 20) continue;
      if (/^(Tony|posted this|View analytics|show more)/i.test(line)) continue;
      if (/^hashtag#/i.test(line)) continue;
      if (/^\d+$/.test(line)) continue;
      excerpt = line.slice(0, 80);
      break;
    }

    if (!excerpt) continue;

    posts.push({
      excerpt,
      impressions: isEngagement ? null : metricValue,
      engagements: isEngagement ? metricValue : null,
      reactions,
      comments,
      reposts,
    });
  }

  return posts;
}

export function ImportAnalyticsDialog({
  open,
  onOpenChange,
  onImported,
}: ImportAnalyticsDialogProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ParsedPost[] | null>(null);
  const [matches, setMatches] = useState<MatchedPost[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"paste" | "preview">("paste");

  function handleParse() {
    const results = parseLinkedInAnalytics(pasteText);
    if (results.length === 0) {
      toast.error("Could not find any post analytics in the pasted text. Make sure you're pasting from the LinkedIn analytics page.");
      return;
    }
    setParsed(results);
    matchPosts(results);
  }

  async function matchPosts(parsedPosts: ParsedPost[]) {
    setImporting(true);
    try {
      const res = await fetch("/api/analytics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match", posts: parsedPosts }),
      });

      if (!res.ok) {
        toast.error("Failed to match posts");
        return;
      }

      const data = await res.json();
      setMatches(data.matches);
      setStep("preview");
    } catch {
      toast.error("Failed to match posts");
    } finally {
      setImporting(false);
    }
  }

  async function handleImport() {
    if (!matches) return;
    const toImport = matches.filter((m) => m.matched);
    if (toImport.length === 0) {
      toast.error("No matched posts to import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/analytics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", posts: toImport }),
      });

      if (!res.ok) {
        toast.error("Failed to save analytics");
        return;
      }

      const data = await res.json();
      toast.success(`Updated analytics for ${data.updated} post${data.updated !== 1 ? "s" : ""}`);
      onImported?.();
      handleClose();
    } catch {
      toast.error("Failed to save analytics");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setPasteText("");
    setParsed(null);
    setMatches(null);
    setStep("paste");
    onOpenChange(false);
  }

  const matchedCount = matches?.filter((m) => m.matched).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ maxWidth: "700px" }} className="max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            Import LinkedIn Analytics
          </DialogTitle>
          <DialogDescription>
            {step === "paste"
              ? "Copy your LinkedIn \"Top performing posts\" page and paste it below. We'll extract impressions, engagements, reactions, comments, and reposts."
              : `Found ${parsed?.length ?? 0} posts. ${matchedCount} matched to your PostPilot posts.`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0">
          {step === "paste" && (
            <div className="space-y-3">
              <textarea
                rows={12}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                placeholder="Paste your LinkedIn analytics page content here..."
              />
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">How to get your analytics data</p>
                  <p className="mt-0.5">
                    Go to your LinkedIn profile, click &quot;Show all analytics&quot;, select &quot;Top performing posts&quot;,
                    then select all (Ctrl+A) and copy (Ctrl+C). Paste it here.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && matches && (
            <div className="space-y-2">
              {matches.map((match, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-3 text-sm ${
                    match.matched ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30" : "border-border opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {match.matched ? (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Check className="size-3.5 text-green-600" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            Matched: {match.postTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1">
                          <X className="size-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">No match found</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{match.excerpt}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {match.impressions != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {match.impressions.toLocaleString()} impressions
                      </Badge>
                    )}
                    {match.engagements != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {match.engagements.toLocaleString()} engagements
                      </Badge>
                    )}
                    {match.reactions != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {match.reactions} reactions
                      </Badge>
                    )}
                    {match.comments != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {match.comments} comments
                      </Badge>
                    )}
                    {match.reposts != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {match.reposts} reposts
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          {step === "paste" && (
            <Button onClick={handleParse} disabled={!pasteText.trim() || importing} className="gap-1.5">
              {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Parse & Preview
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("paste")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || matchedCount === 0} className="gap-1.5">
                {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Import {matchedCount} Post{matchedCount !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
