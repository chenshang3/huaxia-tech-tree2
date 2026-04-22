import React from "react";
import { NodePicture } from "./NodePicture";

// ============================================================
// DetailPanel.jsx
// 右侧详情面板组件
// ============================================================

export const DetailPanel = React.memo(function DetailPanel({ selD, CAT, ADJ, RADJ, NMAP, onNode, isOpen, setIsOpen }) {
  const panelClassName = `side-panel detail-panel${isOpen ? "" : " side-panel--collapsed"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="side-panel-toggle side-panel-toggle--right"
        aria-label={isOpen ? "收起右侧边栏" : "展开右侧边栏"}
        aria-expanded={isOpen}
        style={{
          "--toggle-offset": isOpen ? "228px" : "0px",
          "--toggle-bg": isOpen ? "rgba(200,160,69,.15)" : "rgba(200,160,69,.3)",
        }}
      />
      <aside className={panelClassName} style={{ "--panel-width": "228px" }}>
        <div className="side-panel__content detail-panel__content">
      {selD ? (
        <div className="detail-panel__selected">
          <div className="detail-panel__header">
            <div className="detail-panel__title" style={{ "--detail-accent": CAT[selD.cat]?.color ?? "#c8a045" }}>
              {selD.name}
            </div>
            <div className="detail-panel__subtitle">{selD.en}</div>
          </div>

          <div className="detail-panel__tags">
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
              [
                `cat: ${selD.cat}`,
                "rgba(139,105,20,.04)",
                "rgba(139,105,20,.1)",
                "#a08060",
              ],
            ].map(([txt, bg, border, col], i) => (
              <span
                key={i}
                className="detail-panel__tag"
                style={{
                  "--tag-bg": bg,
                  "--tag-border": border,
                  "--tag-color": col,
                  "--tag-font": i === 1 ? '"JetBrains Mono"' : "inherit",
                }}
              >
                {txt}
              </span>
            ))}
          </div>

          <NodePicture
            nodeId={selD.id}
            alt={`${selD.name}相关图片`}
            figureClassName="detail-panel__image"
            frameClassName="detail-panel__image-frame"
            imageClassName="detail-panel__image-img"
            statusClassName="detail-panel__image-status"
            errorClassName="detail-panel__image-status--error"
          />

          <div className="detail-panel__block">
            <div className="detail-panel__label">发明者</div>
            <div className="detail-panel__text">{selD.inv}</div>
          </div>

          <div className="detail-panel__block">
            <div className="detail-panel__label">简介</div>
            <div className="detail-panel__desc">{selD.desc}</div>
          </div>

          <div className="detail-panel__meaning">
            <div className="detail-panel__label">历史意义</div>
            <div className="detail-panel__meaning-text">{selD.sig}</div>
          </div>

          <div>
            <div className="detail-panel__label">图关系 Graph Relations</div>
            <div className="detail-panel__stats">
              <span>
                in-deg: <span style={{ color: "#4a90d9" }}>{RADJ[selD.id].length}</span>
              </span>
              <span>
                out-deg: <span style={{ color: "#c8a045" }}>{ADJ[selD.id].length}</span>
              </span>
            </div>

            {RADJ[selD.id].length > 0 && (
              <div className="detail-panel__block">
                <div className="detail-panel__label" style={{ color: "rgba(74,144,217,.65)" }}>
                  前驱节点 ←
                </div>
                <div className="detail-panel__pill-list">
                  {RADJ[selD.id].map(id => (
                    <span
                      key={id}
                      onClick={() => onNode(id)}
                      className="detail-panel__pill"
                      style={{
                        "--pill-bg": "rgba(74,144,217,.08)",
                        "--pill-border": "rgba(74,144,217,.3)",
                        "--pill-color": "#4a90d9",
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
                <div className="detail-panel__label" style={{ color: "rgba(139,105,20,.6)" }}>
                  后继节点 →
                </div>
                <div className="detail-panel__pill-list">
                  {ADJ[selD.id].map(id => (
                    <span
                      key={id}
                      onClick={() => onNode(id)}
                      className="detail-panel__pill"
                      style={{
                        "--pill-bg": "rgba(200,160,69,.08)",
                        "--pill-border": "rgba(200,160,69,.3)",
                        "--pill-color": "#c8a045",
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
          className="detail-panel__empty"
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
          <div className="detail-panel__empty-text">
            点击图中节点
            <br />
            查看发明详情
          </div>
        </div>
      )}
        </div>
      </aside>
    </>
  );
});
