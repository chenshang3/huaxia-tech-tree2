// ============================================================
// DetailPanel.jsx
// 右侧详情面板组件
// ============================================================
// 职责:
// 1. 显示选中节点的详细信息
// 2. 显示前驱/后继节点按钮
// 3. 显示图关系(入度/出度)
// 4. 空状态提示
//
// 显示内容:
//
//   - 名称 + 英文名
//   - 标签: 时代、年份、类别、类别代码
//   - 图片
//   - 发明者
//   - 简介
//   - 历史意义
//   - 图关系统计
//   - 前驱/后继节点按钮
// ============================================================

import React from "react";
import { NodePicture } from "./NodePicture";

/**
 * 右侧详情面板
 * @param {Object} props
 * @param {Object} props.selD - 选中的节点数据
 * @param {Object} props.CAT - 类别映射
 * @param {Object} props.ADJ - 邻接表(后继)
 * @param {Object} props.RADJ - 逆邻接表(前驱)
 * @param {Object} props.NMAP - 节点映射
 * @param {Function} props.onNode - 节点点击回调
 * @param {boolean} props.isOpen - 展开状态
 * @param {Function} props.setIsOpen - 设置展开状态
 */
export const DetailPanel = React.memo(function DetailPanel({ selD, CAT, ADJ, RADJ, NMAP, onNode, isOpen, setIsOpen }) {
  // 面板样式类名
  const panelClassName = `side-panel detail-panel${isOpen ? "" : " side-panel--collapsed"}`;

  return (
    <>
      {/* 折叠按钮 */}
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
      {/* 有选中节点 */}
      {selD ? (
        <div className="detail-panel__selected">
          {/* 头部: 名称+英文名 */}
          <div className="detail-panel__header">
            <div className="detail-panel__title" style={{ "--detail-accent": CAT[selD.cat]?.color ?? "#c8a045" }}>
              {selD.name}
            </div>
            <div className="detail-panel__subtitle">{selD.en}</div>
          </div>

          {/* 标签行: 时代、年份、类别、类别代码 */}
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

          {/* 相关图片 */}
          <NodePicture
            nodeId={selD.id}
            alt={`${selD.name}相关图片`}
            figureClassName="detail-panel__image"
            frameClassName="detail-panel__image-frame"
            imageClassName="detail-panel__image-img"
            statusClassName="detail-panel__image-status"
            errorClassName="detail-panel__image-status--error"
          />

          {/* 发明者 */}
          <div className="detail-panel__block">
            <div className="detail-panel__label">发明者</div>
            <div className="detail-panel__text">{selD.inv}</div>
          </div>

          {/* 简介 */}
          <div className="detail-panel__block">
            <div className="detail-panel__label">简介</div>
            <div className="detail-panel__desc">{selD.desc}</div>
          </div>

          {/* 历史意义 */}
          <div className="detail-panel__meaning">
            <div className="detail-panel__label">历史意义</div>
            <div className="detail-panel__meaning-text">{selD.sig}</div>
          </div>

          {/* 图关系 */}
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

            {/* 前驱节点 */}
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

            {/* 后继节点 */}
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
        /* 空状态 */
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
