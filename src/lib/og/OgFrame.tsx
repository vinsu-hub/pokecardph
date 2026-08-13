import { OG_COLORS, OG_SIZE } from "./constants";

/**
 * The one shared visual piece across all `opengraph-image.tsx` routes: the
 * 1200×630 canvas, brand background, and the mark+wordmark pinned to the top
 * corner. Content composition (image side vs. text side) stays in each route
 * — Card/Shop/Auction's data shapes differ enough that a second shared
 * "two-column" component would just thread conditional props for no real
 * savings. This is a plain JSX-returning function for Satori, not a mounted
 * React component.
 */
export function OgFrame({
  children,
  markDataUri,
}: {
  children: React.ReactNode;
  markDataUri: string;
}) {
  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: OG_COLORS.bg,
        position: "relative",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 56,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri} width={40} height={40} style={{ marginRight: 12 }} alt="" />
        <span style={{ display: "flex", fontSize: 24, fontWeight: 700, color: OG_COLORS.ink }}>
          PokeCard&nbsp;
          <span style={{ color: OG_COLORS.primary }}>PH</span>
        </span>
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 112, paddingBottom: 56, paddingLeft: 56, paddingRight: 56 }}>
        {children}
      </div>
    </div>
  );
}
