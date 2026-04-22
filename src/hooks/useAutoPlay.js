// ============================================================
// useAutoPlay.js
// 自动播放定时器逻辑
// ============================================================
// 职责:
// 1. 管理步骤自动播放的定时器
// 2. 在播放时自动推进步骤索引
// 3. 推进时自动平移到当前节点位置
//
// 播放流程:
//
//   playing=true
//     |
//     v
//   setInterval(AUTO_PLAY_INTERVAL ms)
//     |
//     v
//   setSi(i => i + 1)
//     |
//     v
//   si变化触发useEffect
//     |
//     v
//   panToNode(当前节点)
//     |
//     v
//   到达最后一步时 playing=false
//
// ============================================================

import { useEffect, useRef } from "react";
import { AUTO_PLAY_INTERVAL } from "../utils/constants";

/**
 * 自动播放Hook
 * 管理步骤的自动播放逻辑
 *
 * @param {boolean} playing - 播放中标志
 * @param {number} stepsLength - 步骤总数
 * @param {Function} setSi - 设置步骤索引的方法
 * @param {Function} setPlaying - 设置播放状态的方法
 * @param {Array} steps - 步骤数组
 * @param {Function} panToNode - 平移到节点的方法
 * @param {Object} POS - 位置映射
 * @param {number} si - 当前步骤索引
 */
export function useAutoPlay(playing, stepsLength, setSi, setPlaying, steps, panToNode, POS, si) {
  // 定时器引用
  const timerRef = useRef(null);
  // 上一步索引(用于检测变化)
  const prevSiRef = useRef(null);

  // ===================== 定时器 =====================
  // 管理播放定时器
  useEffect(() => {
    if (playing) {
      // 开始播放,重置索引记录
      prevSiRef.current = null;
      // 设置定时器,定期推进步骤
      timerRef.current = setInterval(() => {
        setSi(i => {
          // 已经是最后一步,停止播放
          if (i >= stepsLength - 1) {
            setPlaying(false);
            return i;
          }
          // 推进到下一步
          return i + 1;
        });
      }, AUTO_PLAY_INTERVAL);  // 常量: 900ms
    } else {
      // 停止播放,清除定时器
      clearInterval(timerRef.current);
    }
    // 清理: 组件卸载时清除
    return () => clearInterval(timerRef.current);
  }, [playing, stepsLength, setSi, setPlaying]);

  // ===================== 自动平移 =====================
  // 当步骤索引变化时,自动平移到当前节点
  useEffect(() => {
    // 无步骤则跳过
    if (stepsLength === 0) return;
    // 获取当前步骤
    const curStep = steps[si];
    // 如果有当前节点且索引变化了
    if (curStep?.cur && si !== prevSiRef.current) {
      prevSiRef.current = si;
      // 平移到当前节点
      panToNode(curStep.cur, POS);
    }
  }, [si, steps, stepsLength, panToNode, POS]);
}
