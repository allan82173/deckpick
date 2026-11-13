import { makeScene, richLines, SLIDE } from "@/lib/scene";
import type { DesignSystem, SlideSpec } from "@/lib/model";
export function SlidePreview({
  slide,
  design,
  page = 1,
  name,
  sections = [],
  hiddenTextIndex,
}: {
  slide: SlideSpec;
  design: DesignSystem;
  page?: number;
  name?: string;
  sections?: string[];
  hiddenTextIndex?:number;
}) {
  const scene = makeScene(slide, design, page, name, sections),
    px = SLIDE.px;
  return (
    <div className="slide-preview">
      <svg
        viewBox={`0 0 ${SLIDE.w * px} ${SLIDE.h * px}`}
        role="img"
        aria-label={`${page}번 슬라이드: ${slide.headline}`}
      >
        {scene.nodes.map((n, i) => {
          if (n.kind === "image") return <svg key={i} x={n.x * px} y={n.y * px} width={n.w * px} height={n.h * px} overflow="hidden"><image href={n.src} width={n.w * px} height={n.h * px} preserveAspectRatio={n.chart ? "xMidYMid meet" : "xMidYMid slice"}><title>{n.alt}</title></image></svg>;
          if (n.kind === "rect")
            return (
              <rect
                key={i}
                x={n.x * px}
                y={n.y * px}
                width={n.w * px}
                height={n.h * px}
                fill={n.fill}
                fillOpacity={n.opacity}
                stroke={n.stroke}
                strokeWidth={n.strokeWidth}
                transform={n.rotate ? `rotate(${n.rotate} ${(n.x+n.w/2)*px} ${(n.y+n.h/2)*px})` : undefined}
              />
            );
          if (n.kind === "line")
            return (
              <line
                key={i}
                x1={n.x * px}
                y1={(n.y+(n.flipV?n.h:0)) * px}
                x2={(n.x + n.w) * px}
                y2={(n.y+(n.flipV?0:n.h)) * px}
                stroke={n.stroke}
                strokeWidth={((n.strokeWidth ?? 1) * 4) / 3}
              />
            );
          if (n.kind === "ellipse")
            return (
              <ellipse
                key={i}
                cx={(n.x + n.w / 2) * px}
                cy={(n.y + n.h / 2) * px}
                rx={(n.w / 2) * px}
                ry={(n.h / 2) * px}
                fill={n.fill}
                fillOpacity={n.opacity}
              />
            );
          if (n.kind === "trapezoid")
            return (
              <polygon
                key={i}
                points={`${n.x * px},${n.y * px} ${(n.x + n.w) * px},${n.y * px} ${(n.x + n.w - 0.2) * px},${(n.y + n.h) * px} ${(n.x + 0.2) * px},${(n.y + n.h) * px}`}
                fill={n.fill}
                fillOpacity={n.opacity}
              />
            );
          if (n.kind === "triangle")
            return (
              <polygon
                key={i}
                points={
                  n.rotate === 90
                    ? `${n.x * px},${n.y * px} ${(n.x + n.w) * px},${(n.y + n.h / 2) * px} ${n.x * px},${(n.y + n.h) * px}`
                    : `${(n.x + n.w / 2) * px},${n.y * px} ${(n.x + n.w) * px},${(n.y + n.h) * px} ${n.x * px},${(n.y + n.h) * px}`
                }
                fill={n.fill}
                fillOpacity={n.opacity}
                transform={
                  n.rotate === 90
                    ? undefined
                    : `rotate(${n.rotate ?? 0} ${(n.x + n.w / 2) * px} ${(n.y + n.h / 2) * px})`
                }
              />
            );
          if (n.kind !== "text") return null;
          const lines = richLines(n.text, n.size, n.w,n.oneLine);
          return (
            <text
              visibility={i===hiddenTextIndex?"hidden":undefined}
              key={i}
              x={
                (n.x +
                  (n.align === "center"
                    ? n.w / 2
                    : n.align === "right"
                      ? n.w
                      : 0)) *
                px
              }
              y={n.y * px + ((n.size * 4) / 3) * 0.85}
              fontFamily="Pretendard"
              fontSize={(n.size * 4) / 3}
              fontWeight={n.bold ? 700 : 400}
              fill={n.color}
              textAnchor={
                n.align === "center"
                  ? "middle"
                  : n.align === "right"
                    ? "end"
                    : "start"
              }
            >
              {lines.map((runs, j) => (
                <tspan
                  key={j}
                  x={
                    (n.x +
                      (n.align === "center"
                        ? n.w / 2
                        : n.align === "right"
                          ? n.w
                          : 0)) *
                    px
                  }
                  dy={j ? ((n.size * 4) / 3) * n.lineHeight : 0}
                >
                  {runs.map((run, k) => (
                    <tspan
                      key={k}
                      fontWeight={run.bold ? 700 : undefined}
                      fill={run.bold ? design.colors.primary : undefined}
                    >
                      {run.text}
                    </tspan>
                  ))}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      {scene.warnings.length > 0 && (
        <span className="fit-warning" title={scene.warnings.join("\n")}>
          문구 길이 확인
        </span>
      )}
    </div>
  );
}
