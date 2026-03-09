import Link from "next/link";
import { Send } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
        >
          <Send className="size-6 text-primary" />
          <span className="text-2xl font-bold tracking-tight">PostPilot</span>
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
