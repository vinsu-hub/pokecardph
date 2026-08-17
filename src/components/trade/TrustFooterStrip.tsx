import { ShieldCheck, Handshake, MessageCircle, Lock } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "Safe Trading", body: "Trade securely with our protected trade system." },
  { icon: Handshake, title: "Fair Value", body: "Card values are based on real market data." },
  { icon: MessageCircle, title: "Easy Communication", body: "Chat with your trade partner every step of the way." },
  { icon: Lock, title: "Verified Users", body: "Trade with trusted and verified members." },
];

export function TrustFooterStrip() {
  return (
    <div className="rounded-lg border border-border bg-bg-muted p-(--card-pad)">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-body font-medium">{title}</p>
              <p className="text-caption text-text-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-caption text-text-secondary">
        All trades are subject to our Trade Guidelines. Use the platform responsibly and enjoy trading!{" "}
        {/* No guidelines page exists or is specced yet — stub it inert with a
            reason, the same house rule Footer.tsx/LandingHeader.tsx apply to
            every not-yet-built link, rather than a dead link to nowhere. */}
        <span title="Coming soon" className="font-medium text-text-muted">Trade Guidelines →</span>
      </p>
    </div>
  );
}
