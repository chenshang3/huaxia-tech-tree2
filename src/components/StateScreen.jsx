// ============================================================
// StateScreen.jsx
// 加载与错误状态屏幕
// ============================================================
// 职责:
// 1. LoadingScreen: 数据加载中显示
// 2. ErrorScreen: 数据加载失败显示
//
// 使用场景:
//   - useGraphData 返回 loading=true -> 显示LoadingScreen
//   - useGraphData 返回 error有值 -> 显示ErrorScreen
// ============================================================

/**
 * 加载中屏幕
 * 显示品牌名和加载提示
 */
export function LoadingScreen() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f0e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: '"ZCOOL XiaoWei",serif',
          fontSize: 24,
          color: "#8b6914",
          letterSpacing: 4,
        }}
      >
        华夏科技树
      </div>
      <div style={{ fontSize: 12, color: "rgba(139,105,20,.5)" }}>加载数据中...</div>
    </div>
  );
}

/**
 * 错误屏幕
 * 显示错误信息和解决提示
 * @param {string} props.error - 错误信息
 */
export function ErrorScreen({ error }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f0e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: '"ZCOOL XiaoWei",serif',
          fontSize: 24,
          color: "#c0392b",
          letterSpacing: 4,
        }}
      >
        加载失败
      </div>
      <div style={{ fontSize: 12, color: "rgba(44,36,22,.5)" }}>{error}</div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(139,105,20,.6)",
          marginTop: 8,
        }}
      >
        请确保后端服务器已启动: cd server && node index.js
      </div>
    </div>
  );
}
