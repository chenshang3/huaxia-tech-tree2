import { useEffect, useState } from "react";
import { getNodePictureUrl } from "../services/api";

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

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
  const [status, setStatus] = useState(nodeId ? "loading" : "idle");

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
