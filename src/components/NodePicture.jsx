// ============================================================
// NodePicture.jsx
// 节点相关图片组件
// ============================================================
// 职责:
// 1. 加载并显示节点相关图片
// 2. 处理加载/错误状态
// 3. 使用React Portal渲染到body
//
// 图片获取:
//
//   GET /api/node-picture/:nodeId
//
// Loading 流程:
//   1. nodeId变化 -> status="loading"
//   2. img onLoad -> status="loaded"
//   3. img onError -> status="error"
// ============================================================

import { useEffect, useState } from "react";
import { getNodePictureUrl } from "../services/api";

/**
 * 合并类名工具函数
 */
function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

/**
 * 节点图片组件
 * @param {string} props.nodeId - 节点ID
 * @param {string} props.alt - 图片描述
 * @param {string} props.figureClassName - figure元素类名
 * @param {string} props.frameClassName - 容器类名
 * @param {string} props.imageClassName - img元素类名
 * @param {string} props.statusClassName - 状态文字类名
 * @param {string} props.errorClassName - 错误状态类名
 * @param {string} props.loadingText - 加载中文字
 * @param {string} props.emptyText - 无图片文字
 */
export function NodePicture({
  nodeId,
  alt,
  figureClassName = "",
  frameClassName = "",
  imageClassName = "",
  statusClassName = "",
  errorClassName = "",
  loadingText = "载入配图中…",
  emptyText = "配图待补充",
}) {
  // 状态: loading/loaded/error/idle
  const [status, setStatus] = useState(nodeId ? "loading" : "idle");

  // nodeId变化时重置状态
  useEffect(() => {
    setStatus(nodeId ? "loading" : "idle");
  }, [nodeId]);

  if (!nodeId) return null;

  const imageUrl = getNodePictureUrl(nodeId);

  return (
    <figure className={figureClassName}>
      <div className={frameClassName}>
        <img
          key={imageUrl}
          src={imageUrl}
          alt={alt}
          className={imageClassName}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          style={{
            opacity: status === "loaded" ? 1 : 0,
            display: status === "error" ? "none" : undefined,
          }}
        />
        {status !== "loaded" && (
          <div className={joinClassNames(statusClassName, status === "error" ? errorClassName : "")}>
            {status === "loading" ? loadingText : emptyText}
          </div>
        )}
      </div>
    </figure>
  );
}
