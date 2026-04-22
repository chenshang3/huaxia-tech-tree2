// ============================================================
// App.js
// React应用根组件
// ============================================================
// 职责:
// 1. 作为整个应用的入口点
// 2. 挂载并渲染 HuaxiaTechTree 主组件
// 3. 由 ReactDOM.render() 在 index.js 中调用
//
// React组件渲染流程:
//   index.js (入口)
//     |
//     | ReactDOM.render(<App />, rootElement)
//     v
//   App.jsx (根组件 => HuaxiaTechTree 组件)
//     |
//     | return <HuaxiaScrollExperience .../>
//     v
//   HuaxiaScrollExperience.jsx (卷轴式主容器)
//     |
//     | 渲染子组件:
//     |   - ScrollContainer (卷轴头部+滚动视口)
//     |   - HybridTechTree (SVG图谱)
//     |   - Timeline (底部时代导航)
//     |   - AnnotationPanel (右侧详情面板)
//     |   - SearchSheet (搜索弹窗)
//     v
//   最终UI (华夏文明科技树可视化界面)
// ============================================================

import HuaxiaTechTree from './HuaxiaTechTree';

/**
 * 导出科技树主组件
 * 作为 React 应用根组件,在 index.js 中被 ReactDOM.render() 渲染到 DOM
 *
 * @returns {JSX.Element} 科技树主界面组件
 *
 * index.js 中的使用示例:
 *   import React from 'react';
 *   import ReactDOM from 'react-dom/client';
 *   import App from './App';
 *
 *   const root = ReactDOM.createRoot(document.getElementById('root'));
 *   root.render(<App />);
 */
export default HuaxiaTechTree;
