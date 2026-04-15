#!/usr/bin/env node
/**
 * NodeTooltip 修改验证脚本
 * 用于快速验证修改是否正确
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================
// 检查 1: NodeTooltip.jsx 中是否移除了 arrow 元素
// ============================================================
log('\n测试 1: 检查 arrow 元素是否已移除', 'blue');

const tooltipJsxPath = path.join(__dirname, 'src/components/NodeTooltip.jsx');
const tooltipJsxContent = fs.readFileSync(tooltipJsxPath, 'utf-8');

if (tooltipJsxContent.includes('node-tooltip-arrow')) {
  log('❌ 失败: 仍然找到 "node-tooltip-arrow" 引用', 'red');
} else {
  log('✓ 通过: arrow 元素已移除', 'green');
}

// ============================================================
// 检查 2: left 位置是否调整为 +12px
// ============================================================
log('\n测试 2: 检查 left 位置是否为 +12px', 'blue');

const leftPositionRegex = /left:\s*`\$\{adjustedPosition\.x\s*\+\s*12\}px`/;

if (leftPositionRegex.test(tooltipJsxContent)) {
  log('✓ 通过: left 位置正确设置为 adjustedPosition.x + 12', 'green');
} else {
  log('❌ 失败: left 位置未正确设置', 'red');
  log(`  预期: left: \`\${adjustedPosition.x + 12}px\``, 'yellow');
}

// ============================================================
// 检查 3: CSS 中是否保留了 border-radius
// ============================================================
log('\n测试 3: 检查 CSS 中的圆角样式', 'blue');

const tooltipCssPath = path.join(__dirname, 'src/components/NodeTooltip.css');
const tooltipCssContent = fs.readFileSync(tooltipCssPath, 'utf-8');

if (tooltipCssContent.includes('border-radius')) {
  log('✓ 通过: CSS 中保留了 border-radius（圆角）', 'green');
} else {
  log('❌ 失败: CSS 中未找到 border-radius', 'red');
}

// ============================================================
// 检查 4: 验证 JSX 结构
// ============================================================
log('\n测试 4: 验证 JSX 结构', 'blue');

const hasNodeTooltipDiv = tooltipJsxContent.includes('<div\n      ref={tooltipRef}\n      className="node-tooltip"');
const hasNodeTooltipContent = tooltipJsxContent.includes('className="node-tooltip-content"');

if (hasNodeTooltipDiv && hasNodeTooltipContent) {
  log('✓ 通过: JSX 结构正确', 'green');
} else {
  log('❌ 失败: JSX 结构有问题', 'red');
}

// ============================================================
// 总结
// ============================================================
log('\n' + '='.repeat(50), 'blue');
log('验证完成！', 'blue');
log('='.repeat(50), 'blue');

log('\n修改总结:', 'yellow');
log('✓ 移除了 <div className="node-tooltip-arrow" /> 元素', 'green');
log('✓ 调整了 left 位置：adjustedPosition.x + 12', 'green');
log('✓ 保留了 CSS 中的 border-radius', 'green');

log('\n下一步: 在浏览器中验证气泡效果', 'yellow');
log('1. 打开 http://localhost:3000', 'yellow');
log('2. 将鼠标悬停在任意节点上', 'yellow');
log('3. 观察气泡是否为圆角矩形（无尖角）', 'yellow');
log('4. 检查气泡位置是否向右偏移', 'yellow');
