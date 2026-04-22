// ============================================================
// useGraphData.js
// 图数据获取与状态管理
// ============================================================
// 职责:
// 1. 从后端API获取图数据(节点、位置、类别、邻接表、时代配置)
// 2. 管理加载状态和错误状态
// 3. 提供数据给消费者组件使用
//
// Hook返回的数据结构:
//
//   NODES: 节点数组
//     [{ id, name, year, era, cat, outEdges, desc, sig, inv, en }]
//     - id: 唯一标识符
//     - name: 节点名称(如"造纸术")
//     - year: 年份(负数=公元前)
//     - era: 所属时代(如"汉")
//     - cat: 类别代码(如"tech")
//     - outEdges: 出边数组(后继节点ID)
//     - desc: 描述
//     - sig: 历史意义
//     - inv: 发明者
//     - en: 英文名
//
//   POS: 节点位置映射
//     { nodeId: { x, y } }
//     - x, y: 画布坐标
//
//   CAT: 类别映射
//     { catCode: { code, name, color } }
//     - code: 类别代码
//     - name: 显示名称
//     - color: 主题色
//
//   ADJ: 邻接表(前驱→后继)
//     { nodeId: [childId, ...] }
//
//   RADJ: 逆邻接表(后继→前驱)
//     { nodeId: [parentId, ...] }
//
//   NMAP: 节点对象映射
//     { nodeId: nodeObject }
//
//   timelineConfig: 时代配置
//     [{ name, start, end, scale }]
//     - name: 时代名称
//     - start: 起始年份
//     - end: 结束年份
//     - scale: 时间轴缩放比例
//
//   uiConfig: UI配置
//
//   loading: 加载状态(true=加载中)
//   error: 错误信息(有值=出错)
// ============================================================

import { useState, useEffect } from "react";
import { fetchAllData } from "../services/api";
import { DEFAULT_UI_CONFIG } from "../config/uiConfig";

/**
 * 图数据Hook
 * 在组件中调用此Hook获取科技树数据
 *
 * @returns {Object} 包含所有图数据和状态
 *   {
 *     NODES, POS, CAT, ADJ, RADJ, NMAP,
 *     timelineConfig, uiConfig,
 *     loading, error
 *   }
 *
 * 使用示例:
 *   function MyComponent() {
 *     const { NODES, POS, loading, error } = useGraphData();
 *     
 *     if (loading) return <div>加载中...</div>;
 *     if (error) return <div>错误: {error}</div>;
 *     
 *     return <div>共 {NODES.length} 个节点</div>;
 *   }
 */
export function useGraphData() {
  // ===================== 状态定义 =====================
  // 节点数组
  const [NODES, setNODES] = useState([]);
  // 位置映射 { nodeId: { x, y } }
  const [POS, setPOS] = useState({});
  // 类别映射 { catCode: { code, name, color } }
  const [CAT, setCAT] = useState({});
  // 邻接表 { nodeId: [targetId, ...] }
  const [ADJ, setADJ] = useState({});
  // 逆邻接表 { nodeId: [sourceId, ...] }
  const [RADJ, setRADJ] = useState({});
  // 节点映射 { nodeId: nodeObject }
  const [NMAP, setNMAP] = useState({});
  // 时代配置数组
  const [timelineConfig, setTimelineConfig] = useState([]);
  // UI配置(有默认值)
  const [uiConfig, setUiConfig] = useState(DEFAULT_UI_CONFIG);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误信息
  const [error, setError] = useState(null);

  // ===================== 数据获取 =====================
  // 组件挂载时从后端获取所有数据
  useEffect(() => {
    // 使用Promise链式调用
    fetchAllData()
      .then(data => {
        // 设置节点数组
        setNODES(data.nodes);
        // 设置位置映射
        setPOS(data.positions);
        // 设置类别映射
        setCAT(data.categories);
        // 设置邻接表
        setADJ(data.adj);
        // 设置逆邻接表
        setRADJ(data.radj);
        // 设置节点映射
        setNMAP(data.nmap);
        // 设置时代配置
        setTimelineConfig(data.timelineConfig);
        // 设置UI配置(无数据时使用默认值)
        setUiConfig(data.uiConfig || DEFAULT_UI_CONFIG);
        // 加载完成
        setLoading(false);
      })
      .catch(err => {
        // 输出错误日志
        console.error("Failed to fetch data:", err);
        // 设置错误信息
        setError("Failed to load data");
        // 加载完成(即使出错也停止加载)
        setLoading(false);
      });
    // 空依赖数组: 仅在组件挂载时执行一次
  }, []);

  // ===================== 返回 =====================
  // 返回所有数据和状态供组件使用
  return { NODES, POS, CAT, ADJ, RADJ, NMAP, timelineConfig, uiConfig, loading, error };
}
