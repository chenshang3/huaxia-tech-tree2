/* ============================================================
 * WelcomeGuide.jsx
 * 新用户引导组件
 * 
 * 功能：
 * - 首次用户访问时显示 4 步引导
 * - 使用 SVG mask 创建透明孔洞效果
 * - localStorage 存储是否已看过引导
 * ============================================================ */

import React, { useState, useEffect } from 'react';
import './WelcomeGuide.css';

const WELCOME_STORAGE_KEY = 'huaxia_tech_tree_welcome_shown';

export function WelcomeGuide({ isOpen = false, onClose }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isVisible && !isOpen) {
      const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
      if (!hasSeenWelcome) {
        setIsVisible(true);
      }
    }
  }, [isVisible, isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    if (onClose) onClose();
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isVisible && !isOpen) return null;

  const steps = [
    {
      title: '欢迎来到华夏科技树',
      description: '这是一个展示中国古代科技发明及其传承关系的知识图谱。',
      tip: '这个庞大的网络展示了科技之间的依赖关系。',
      highlights: ['graph-area'],
    },
    {
      title: '点击节点，探索科技',
      description: '每个圆形代表一项科技发明。点击任意节点查看详细信息。',
      tip: '选中后会在右侧面板显示详情。',
      highlights: [],
    },
    {
      title: '使用搜索快速定位',
      description: '按 Cmd+K 或 Ctrl+K 打开搜索框，快速查找感兴趣的科技。',
      tip: '支持节点名称、英文名、描述的模糊搜索。',
      highlights: ['search-btn'],
    },
    {
      title: '开始探索',
      description: '现在您已经了解了基本操作，开始探索这棵科技树吧！',
      tip: '左侧可按分类筛选，BFS/DFS 模式展示遍历过程。',
      highlights: [],
    },
  ];

  const currentStep = steps[step];

  return (
    <>
      {/* 背景遮罩 */}
      <div className="welcome-overlay" onClick={() => {}} />

      {/* 引导卡片 */}
      <div className="welcome-card welcome-card--visible">
        <button
          className="welcome-close"
          onClick={handleSkip}
          aria-label="关闭引导"
        >
          ✕
        </button>

        <div className="welcome-content">
          <div className="welcome-step">
            <button
              className="step-arrow"
              onClick={handlePrev}
              disabled={step === 0}
              aria-label="上一步"
            >
              ‹
            </button>
            <span className="step-text">第 {step + 1} / 4</span>
            <button
              className="step-arrow"
              onClick={handleNext}
              aria-label="下一步"
            >
              ›
            </button>
          </div>
          <h2 className="welcome-title">{currentStep.title}</h2>
          <p className="welcome-description">{currentStep.description}</p>
          <p className="welcome-tip">💡 {currentStep.tip}</p>
        </div>

        <div className="welcome-footer">
          <button
            className="welcome-button welcome-button--secondary"
            onClick={handleSkip}
          >
            跳过
          </button>
          <div className="welcome-dots">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`welcome-dot ${i === step ? 'welcome-dot--active' : ''}`}
              />
            ))}
          </div>
          <button
            className="welcome-button welcome-button--primary"
            onClick={handleNext}
          >
            {step === 3 ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </>
  );
}
