import nodesData from './nodes.json'
import edgesData from './edges.json'
import categoriesData from './categories.json'
import positionsData from './positions.json'

// 导出原始数据
export const NODES = nodesData
export const EDGES = edgesData
export const CAT = categoriesData
export const POS = positionsData

// 构建邻接表 (ADJ: from -> to[])
export const ADJ = Object.fromEntries(NODES.map(n => [n.id, []]))
const RADJ_temp = Object.fromEntries(NODES.map(n => [n.id, []]))

edgesData.forEach(e => {
  if (ADJ[e.from]) {
    ADJ[e.from].push(e.to)
  }
  if (RADJ_temp[e.to]) {
    RADJ_temp[e.to].push(e.from)
  }
})

export const RADJ = RADJ_temp

// 构建节点映射
export const NMAP = Object.fromEntries(NODES.map(n => [n.id, n]))

// 图遍历算法：广度优先搜索
export function bfsFrom(start) {
  const steps = []
  const vis = new Set([start])
  const q = [start]

  while (q.length) {
    const cur = q.shift()
    const snap = new Set(vis)
    const fresh = (ADJ[cur] || []).filter(n => !vis.has(n))
    fresh.forEach(n => {
      vis.add(n)
      q.push(n)
    })
    steps.push({ cur, queue: [...q], visited: snap, fresh, ds: 'queue' })
  }
  return steps
}

// 图遍历算法：深度优先搜索
export function dfsFrom(start) {
  const steps = []
  const vis = new Set()
  const stk = [start]

  while (stk.length) {
    const cur = stk.pop()
    if (vis.has(cur)) continue
    vis.add(cur)
    const snap = new Set(vis)
    const fresh = [...(ADJ[cur] || [])].reverse().filter(n => !vis.has(n))
    fresh.forEach(n => stk.push(n))
    steps.push({ cur, stack: [...stk], visited: snap, fresh, ds: 'stack' })
  }
  return steps
}