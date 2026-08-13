import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getOgFonts } from "@/lib/og/fonts";
import { loadMarkDataUri, loadRemoteOrLocalImage, hashGradientHex } from "@/lib/og/assets";
import { OgFrame } from "@/lib/og/OgFrame";
import { OG_SIZE, OG_COLORS } from "@/lib/og/constants";
import { primaryPhoto } from "@/lib/photos";
import { conditionLabel, type ListingCard } from "@/lib/supabase/types";
import { php } from "@/lib/utils";

export const alt = "Card details on PokeCard PH";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data } = await supabase
    .from("listings")
    .select("*, cards(*), shops(*)")
    .eq("id", id)
    .maybeSingle();

  const listing = data as unknown as ListingCard | null;
  const card = listing?.cards;
  const shop = listing?.shops;

  const [fonts, markDataUri, photoDataUri] = await Promise.all([
    getOgFonts(),
    loadMarkDataUri(),
    loadRemoteOrLocalImage(listing ? (primaryPhoto(listing.photos) ?? card!.image_url) : null),
  ]);

  const gradient = hashGradientHex(card?.name ?? "PokeCard PH");
  const showCompare =
    listing?.compare_price != null && Number(listing.compare_price) > Number(listing?.price ?? 0);

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
                {card?.name ?? "PokeCard PH"}
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
          <span style={{ display: "flex", fontSize: 22, fontWeight: 400, color: OG_COLORS.textSecondary, textTransform: "uppercase" }}>
            {card?.set_name ?? "PokeCard PH"}
          </span>
          <span style={{ display: "flex", marginTop: 8, fontSize: 52, fontWeight: 700, color: OG_COLORS.ink, lineHeight: 1.1 }}>
            {card?.name ?? "Card listing"}
          </span>

          {listing && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 20, gap: 10 }}>
              <span
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  borderRadius: 999,
                  backgroundColor: "#EEF2F6",
                  color: "#334155",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {conditionLabel(listing)}
              </span>
            </div>
          )}

          {listing && (
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 24, gap: 14 }}>
              <span style={{ display: "flex", fontSize: 48, fontWeight: 700, color: OG_COLORS.primary }}>
                {php(Number(listing.price))}
              </span>
              {showCompare && (
                <span
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 400,
                    color: OG_COLORS.textSecondary,
                    textDecoration: "line-through",
                  }}
                >
                  {php(Number(listing.compare_price))}
                </span>
              )}
            </div>
          )}

          {shop && (
            <span style={{ display: "flex", marginTop: 20, fontSize: 22, fontWeight: 400, color: OG_COLORS.textSecondary }}>
              Sold by {shop.name}
            </span>
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
