// ============================================================
// DetailPanel.jsx
// 右侧详情面板组件
// ============================================================

export function DetailPanel({ selD, CAT, ADJ, RADJ, NMAP, onNode, isOpen, setIsOpen }) {
  return (
    <>
      <button
        onClick={() => setIsOpen(p => !p)}
        style={{
          position: "absolute",
          right: isOpen ? 228 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 40,
          background: isOpen ? "rgba(200,160,69,.15)" : "rgba(200,160,69,.3)",
          border: "1px solid rgba(200,160,69,.3)",
          borderRadius: "4px 0 0 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          transition: "right 0.25s ease, background 0.2s ease",
          padding: 0,
        }}
      >
        <span style={{ color: "#8b6914", fontSize: 10 }}>{isOpen ? "»" : "«"}</span>
      </button>
      <aside
        style={{
          width: isOpen ? 228 : 0,
          flexShrink: 0,
          background: "rgba(255,252,248,.97)",
          borderLeft: "1px solid rgba(200,160,69,.18)",
          padding: isOpen ? 16 : "16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 11,
          overflow: "hidden",
          transition: "width 0.25s ease, padding 0.25s ease",
        }}
      >
      {selD ? (
        <div style={{ animation: "fadeIn .3s ease" }}>
          <div
            style={{
              borderBottom: "1px solid rgba(139,105,20,.18)",
              paddingBottom: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: '"ZCOOL XiaoWei",serif',
                fontSize: 24,
                letterSpacing: 2,
                color: CAT[selD.cat]?.color ?? "#c8a045",
                marginBottom: 3,
              }}
            >
              {selD.name}
            </div>
            <div style={{ fontSize: 10, color: "rgba(90,74,56,.5)", letterSpacing: 3 }}>
              {selD.en}
            </div>
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
            {[
              [selD.era, "rgba(139,105,20,.1)", "rgba(139,105,20,.25)", "#8b6914"],
              [
                selD.year < 0 ? `${Math.abs(selD.year)} BC` : `${selD.year} AD`,
                "rgba(139,105,20,.06)",
                "rgba(139,105,20,.15)",
                "#7a6040",
              ],
              [
                CAT[selD.cat]?.label,
                `${CAT[selD.cat]?.color}15`,
                `${CAT[selD.cat]?.color}40`,
                CAT[selD.cat]?.color,
              ],
            ].map(([txt, bg, border, col], i) => (
              <span
                key={i}
                style={{
                  padding: "3px 8px",
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 3,
                  fontSize: 10.5,
                  color: col,
                  fontFamily: i === 1 ? '"JetBrains Mono"' : "inherit",
                }}
              >
                {txt}
              </span>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#5a4a38", letterSpacing: 2, marginBottom: 3 }}>
              发明者
            </div>
            <div style={{ fontSize: 12, color: "#5a4a38" }}>{selD.inv}</div>
          </div>

          <div style={{ marginBottom: 11 }}>
            <div style={{ fontSize: 9, color: "#5a4a38", letterSpacing: 2, marginBottom: 4 }}>
              简介
            </div>
            <div style={{ fontSize: 10.5, color: "#6b5d4d", lineHeight: 1.85 }}>
              {selD.desc}
            </div>
          </div>

          <div
            style={{
              background: "rgba(200,160,69,.06)",
              borderLeft: "2px solid rgba(139,105,20,.45)",
              padding: "8px 10px",
              borderRadius: "0 4px 4px 0",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 9, color: "#5a4a38", letterSpacing: 2, marginBottom: 3 }}>
              历史意义
            </div>
            <div style={{ fontSize: 11, color: "#8b6914", lineHeight: 1.75 }}>
              {selD.sig}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                color: "#5a4a38",
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              图关系 Graph Relations
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono"',
                fontSize: 10,
                color: "#5a4a38",
                marginBottom: 7,
                display: "flex",
                gap: 14,
              }}
            >
              <span>
                in-deg: <span style={{ color: "#4a90d9" }}>{RADJ[selD.id].length}</span>
              </span>
              <span>
                out-deg: <span style={{ color: "#c8a045" }}>{ADJ[selD.id].length}</span>
              </span>
            </div>

            {RADJ[selD.id].length > 0 && (
              <div style={{ marginBottom: 7 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(74,144,217,.65)",
                    marginBottom: 4,
                  }}
                >
                  前驱节点 ←
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {RADJ[selD.id].map(id => (
                    <span
                      key={id}
                      onClick={() => onNode(id)}
                      style={{
                        padding: "2px 6px",
                        background: "rgba(74,144,217,.08)",
                        border: "1px solid rgba(74,144,217,.3)",
                        borderRadius: 3,
                        fontSize: 10,
                        color: "#4a90d9",
                        cursor: "pointer",
                      }}
                    >
                      {NMAP[id]?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ADJ[selD.id].length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(139,105,20,.6)",
                    marginBottom: 4,
                  }}
                >
                  后继节点 →
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ADJ[selD.id].map(id => (
                    <span
                      key={id}
                      onClick={() => onNode(id)}
                      style={{
                        padding: "2px 6px",
                        background: "rgba(200,160,69,.08)",
                        border: "1px solid rgba(200,160,69,.3)",
                        borderRadius: 3,
                        fontSize: 10,
                        color: "#c8a045",
                        cursor: "pointer",
                      }}
                    >
                      {NMAP[id]?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            color: "#8b7355",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56">
            <polygon
              points="28,4 52,18 52,38 28,52 4,38 4,18"
              fill="none"
              stroke="rgba(139,105,20,.15)"
              strokeWidth="1.2"
            />
            <circle
              cx="28"
              cy="28"
              r="5"
              fill="none"
              stroke="rgba(139,105,20,.2)"
              strokeWidth="1"
            />
          </svg>
          <div style={{ fontSize: 12, textAlign: "center", lineHeight: 2, letterSpacing: 1 }}>
            点击图中节点
            <br />
            查看发明详情
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
