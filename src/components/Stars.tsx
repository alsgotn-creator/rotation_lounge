/** 별점 표시: ★★★★★ 5.0 (반 개 단위는 칠한 너비로) */
export function Stars({ value, size = 13, score = true }: { value: number; size?: number; score?: boolean }) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`별점 ${value.toFixed(1)}점`}>
      <span className="stars-bg" aria-hidden="true">★★★★★<span className="stars-fg" style={{ width: `${(value / 5) * 100}%` }}>★★★★★</span></span>
      {score && <b>{value.toFixed(1)}</b>}
    </span>
  );
}
