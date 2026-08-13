import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getOgFonts } from "@/lib/og/fonts";
import { loadMarkDataUri, loadRemoteOrLocalImage, hashGradientHex } from "@/lib/og/assets";
import { timeRemainingLabel } from "@/lib/og/countdown";
import { OgFrame } from "@/lib/og/OgFrame";
import { OG_SIZE, OG_COLORS } from "@/lib/og/constants";
import { php } from "@/lib/utils";

export const alt = "Auction on PokeCard PH";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

// Wider than the auction page's own inline cast (page.tsx only needs
// name/set_name/rarity off cards, no logo_url off shops) — this route needs
// image_url and logo_url too, so it carries its own type rather than
// reaching for a shared one that would need widening anyway.
type AuctionOgRow = {
  current_bid: number | null;
  starting_bid: number;
  bid_count: number;
  end_time: string;
  status: string;
  listings: {
    description: string | null;
    cards: { name: string; image_url: string | null } | null;
  } | null;
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data } = await supabase
    .from("auctions")
    .select("current_bid, starting_bid, bid_count, end_time, status, listings(description, cards(name, image_url))")
    .eq("id", id)
    .maybeSingle();

  const auction = data as unknown as AuctionOgRow | null;
  const card = auction?.listings?.cards ?? null;
  const title = card?.name ?? auction?.listings?.description?.split("\n")[0] ?? "Auction item";

  const [fonts, markDataUri, photoDataUri] = await Promise.all([
    getOgFonts(),
    loadMarkDataUri(),
    loadRemoteOrLocalImage(card?.image_url ?? null),
  ]);

  const gradient = hashGradientHex(title);

  const hasCurrentBid = auction?.current_bid != null;
  const bidLabel = hasCurrentBid ? "Current bid" : "Starting bid";
  const bidAmount = hasCurrentBid ? auction!.current_bid! : (auction?.starting_bid ?? 0);

  const timeLabel = !auction
    ? ""
    : auction.status === "live"
      ? timeRemainingLabel(auction.end_time)
      : auction.status === "scheduled"
        ? "Starts soon"
        : "Auction ended";

  return new ImageResponse(
    (
      <OgFrame markDataUri={markDataUri}>
        <div
          style={{
            display: "flex",
            width: "58%",
            height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            backgroundColor: OG_COLORS.bgMuted,
          }}
        >
          {photoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUri}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                padding: 32,
                textAlign: "center",
                background: `linear-gradient(150deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              <span style={{ fontSize: 30, fontWeight: 700, color: OG_COLORS.ink, opacity: 0.6 }}>
                {title}
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            height: "100%",
            paddingLeft: 48,
            justifyContent: "center",
          }}
        >
          <span style={{ display: "flex", fontSize: 48, fontWeight: 700, color: OG_COLORS.ink, lineHeight: 1.15 }}>
            {title}
          </span>

          {auction && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ display: "flex", marginTop: 24, fontSize: 22, fontWeight: 400, color: OG_COLORS.textSecondary, textTransform: "uppercase" }}>
                {bidLabel}
              </span>
              <span style={{ display: "flex", marginTop: 4, fontSize: 48, fontWeight: 700, color: OG_COLORS.primary }}>
                {php(Number(bidAmount))}
              </span>
              {hasCurrentBid && (
                <span style={{ display: "flex", marginTop: 6, fontSize: 22, fontWeight: 400, color: OG_COLORS.textSecondary }}>
                  {auction.bid_count} bids
                </span>
              )}
              <span
                style={{
                  display: "flex",
                  marginTop: 20,
                  padding: "6px 16px",
                  borderRadius: 999,
                  backgroundColor: "#EEF2F6",
                  color: "#334155",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {timeLabel}
              </span>
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
