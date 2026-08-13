import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getOgFonts } from "@/lib/og/fonts";
import { loadMarkDataUri, loadRemoteOrLocalImage } from "@/lib/og/assets";
import { OgFrame } from "@/lib/og/OgFrame";
import { OG_SIZE, OG_COLORS } from "@/lib/og/constants";
import type { Shop } from "@/lib/supabase/types";

export const alt = "Shop on PokeCard PH";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const supabase = createPublicClient();

  const { data } = await supabase.from("shops").select("*").eq("id", shopId).maybeSingle();
  const shop = data as unknown as Shop | null;

  const [fonts, markDataUri, logoDataUri] = await Promise.all([
    getOgFonts(),
    loadMarkDataUri(),
    loadRemoteOrLocalImage(shop?.logo_url ?? null),
  ]);

  const initials = (shop?.name ?? "PokeCard PH")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return new ImageResponse(
    (
      <OgFrame markDataUri={markDataUri}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38%",
            height: "100%",
          }}
        >
          {logoDataUri ? (
            <div style={{ display: "flex", width: 260, height: 260, borderRadius: 24, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 220,
                height: 220,
                borderRadius: "50%",
                backgroundColor: OG_COLORS.primarySubtle,
              }}
            >
              <span style={{ display: "flex", fontSize: 84, fontWeight: 700, color: OG_COLORS.primary }}>
                {initials}
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "62%",
            height: "100%",
            paddingLeft: 32,
            justifyContent: "center",
          }}
        >
          <span style={{ display: "flex", fontSize: 54, fontWeight: 700, color: OG_COLORS.ink, lineHeight: 1.15 }}>
            {shop?.name ?? "Shop"}
          </span>

          {shop && (
            <span style={{ display: "flex", marginTop: 14, fontSize: 26, fontWeight: 400, color: OG_COLORS.textSecondary }}>
              {`★ ${shop.rating} (${shop.review_count})`}
            </span>
          )}

          {shop && (shop.tier === "premium" || shop.is_beta_vendor) && (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {shop.tier === "premium" && (
                <span
                  style={{
                    display: "flex",
                    padding: "6px 16px",
                    borderRadius: 999,
                    backgroundColor: "#EDE9FE",
                    color: "#7C3AED",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  Premium Shop
                </span>
              )}
              {shop.is_beta_vendor && (
                <span
                  style={{
                    display: "flex",
                    padding: "6px 16px",
                    borderRadius: 999,
                    backgroundColor: OG_COLORS.primarySubtle,
                    color: OG_COLORS.primaryOnSubtle,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  Founding Vendor
                </span>
              )}
            </div>
          )}

          {shop?.description && (
            <span
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 24,
                fontWeight: 400,
                color: OG_COLORS.textSecondary,
                lineHeight: 1.4,
              }}
            >
              {shop.description.length > 90 ? `${shop.description.slice(0, 90)}…` : shop.description}
            </span>
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
