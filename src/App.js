import { useState, useCallback, useEffect, useRef } from "react";
import { fetchAllData, runBFS, runDFS } from './services/api'

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function HuaxiaTechTree() {
  const [sel,     setSel]     = useState(null)
  const [mode,    setMode]    = useState("explore")
  const [steps,   setSteps]   = useState([])
  const [si,      setSi]      = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tab,     setTab]     = useState("graph")
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Data from API
  const [NODES, setNODES] = useState([])
  const [POS,   setPOS]   = useState({})
  // Pan/Zoom state
  const [pan,          setPan]          = useState({ x: 0, y: 0 })
  const [timelinePanX, setTimelinePanX] = useState(0)
  const [scale,        setScale]        = useState(1)
  const [isDragging,   setIsDragging]   = useState(false)
  const panRef          = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 })
  const scaleRef        = useRef(1)
  const [CAT,   setCAT]   = useState({})
  const [ADJ,   setADJ]   = useState({})
  const [RADJ,  setRADJ]  = useState({})
  const [NMAP,  setNMAP]  = useState({})

  const timerRef = useRef(null)

  // Fetch data on mount
  useEffect(() => {
    fetchAllData()
      .then(data => {
        setNODES(data.nodes);
        setPOS(data.positions);
        setCAT(data.categories);
        setADJ(data.adj);
        setRADJ(data.radj);
        setNMAP(data.nmap);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data');
        setLoading(false);
      });
  }, [])

  const step = steps[si] ?? null

  const nState = (id) => {
    if(!step) return "idle"
    if(step.cur===id)                               return "current"
    if(step.visited.includes(id))                   return "visited"
    if(mode==="bfs" && step.queue?.includes(id))   return "queued"
    if(mode==="dfs" && step.stack?.includes(id))    return "stacked"
    return "idle"
  }
  const eState = (f,t) => {
    if(!step) return "idle"
    if(step.cur===f && step.fresh?.includes(t))       return "active"
    if(step.visited.includes(f)&&step.visited.includes(t)) return "done"
    return "idle"
  }

  const onNode = useCallback((id)=>{
    setSel(id)
    if(mode!=="explore"){
      const algo = mode==="bfs" ? runBFS : runDFS;
      algo(id).then(s => {
        setSteps(s); setSi(0); setPlaying(false)
      });
    }
  },[mode])

  useEffect(()=>{
    if(playing){
      timerRef.current=setInterval(()=>setSi(i=>{
        if(i>=steps.length-1){setPlaying(false);return i}
        return i+1
      }),900)
    } else clearInterval(timerRef.current)
    return ()=>clearInterval(timerRef.current)
  },[playing,steps.length])

  const selD = sel?NMAP[sel]:null
  const R = 28

  // Derive edges from adjacency list
  const EDGES = NODES.flatMap(n => (ADJ[n.id] || []).map(to => ({ from: n.id, to })))

  // Pan/Zoom handlers
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(4, scaleRef.current * delta));

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleDiff = newScale - scaleRef.current;

    const svgEl = e.currentTarget;
    const vb = svgEl.viewBox.baseVal;
    const vbMouseX = (mouseX / rect.width) * vb.width + panRef.current.x;
    const vbMouseY = (mouseY / rect.height) * vb.height + panRef.current.y;

    // Graph: zoom toward graph-coordinate point under mouse
    const newPanX = panRef.current.x - scaleDiff * vbMouseX / newScale;
    const newPanY = panRef.current.y - scaleDiff * vbMouseY / newScale;

    // Timeline: same panX as graph (same vbMouseX, same formula)
    const newTimelinePanX = panRef.current.x - scaleDiff * vbMouseX / newScale;

    scaleRef.current = newScale;
    panRef.current = { ...panRef.current, x: newPanX, y: newPanY };
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
    setTimelinePanX(newTimelinePanX);
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    panRef.current = { ...panRef.current, dragging: true, startX: e.clientX, startY: e.clientY };
    setIsDragging(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!panRef.current.dragging) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    panRef.current.startX = e.clientX;
    panRef.current.startY = e.clientY;
    const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy };
    panRef.current = { ...panRef.current, ...newPan };
    setPan(newPan);
    setTimelinePanX(newPan.x);
  }, []);

  const onMouseUp = useCallback(() => {
    panRef.current = { ...panRef.current, dragging: false };
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    panRef.current = { x: 0, y: 0, dragging: false, startX: 0, startY: 0 };
    scaleRef.current = 1;
    setPan({ x: 0, y: 0 });
    setScale(1);
    setTimelinePanX(0);
  }, []);

  const edgePath = (f,t)=>{
    const a=POS[f],b=POS[t]; if(!a||!b) return ""
    const midX=(a.x+b.x)/2
    return `M ${a.x+R+1} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x-R-1} ${b.y}`
  }

  /* ── Buttons helper ── */
  const Btn = ({active,col,children,onClick,style={}})=>(
    <button onClick={onClick} style={{
      padding:"5px 12px", fontSize:11.5, cursor:"pointer",
      background:active?`rgba(${col},.15)`:"rgba(139,105,20,.06)",
      color:active?`rgb(${col})`:"#5a4a38",
      border:`1px solid rgba(${col},${active?.5:.2})`,
      borderRadius:6, transition:"all .2s", fontFamily:"inherit", ...style
    }}>{children}</button>
  )

  const modeColor = mode==="bfs"?"74,144,217":mode==="dfs"?"46,204,113":"200,160,69"

  if (loading) {
    return (
      <div style={{
        width:"100vw",height:"100vh",background:"#f5f0e8",
        display:"flex",alignItems:"center",justifyContent:"center",
        flexDirection:"column",gap:16
      }}>
        <div style={{fontFamily:'"ZCOOL XiaoWei",serif',fontSize:24,color:"#8b6914",letterSpacing:4}}>华夏科技树</div>
        <div style={{fontSize:12,color:"rgba(139,105,20,.5)"}}>加载数据中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width:"100vw",height:"100vh",background:"#f5f0e8",
        display:"flex",alignItems:"center",justifyContent:"center",
        flexDirection:"column",gap:16
      }}>
        <div style={{fontFamily:'"ZCOOL XiaoWei",serif',fontSize:24,color:"#c0392b",letterSpacing:4}}>加载失败</div>
        <div style={{fontSize:12,color:"rgba(44,36,22,.5)"}}>{error}</div>
        <div style={{fontSize:11,color:"rgba(139,105,20,.6)",marginTop:8}}>请确保后端服务器已启动: cd server && node index.js</div>
      </div>
    )
  }

  return (
    <div style={{
      width:"100vw",height:"100vh",background:"#f5f0e8",
      color:"#2c2416",display:"flex",flexDirection:"column",
      overflow:"hidden",fontFamily:'"Noto Sans SC",sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@300;400&family=JetBrains+Mono:wght@400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;user-select:none}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#e8e0d4}::-webkit-scrollbar-thumb{background:#c8a045;border-radius:3px}
        button{cursor:pointer;border:none;font-family:inherit}
        @keyframes pulse{0%,100%{opacity:.07}50%{opacity:.02}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 20px",background:"rgba(255,252,245,.98)",
        borderBottom:"2px solid rgba(200,160,69,.25)",flexShrink:0,gap:10,
        boxShadow:"0 2px 12px rgba(139,105,20,.08)",
      }}>
        <div style={{display:"flex",alignItems:"baseline",gap:12}}>
          <h1 style={{
            fontFamily:'"ZCOOL XiaoWei",serif',fontSize:26,letterSpacing:5,
            background:"linear-gradient(135deg,#8b6914,#c8a045,#b8860b)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          }}>华夏科技树</h1>
          <span style={{fontSize:10,color:"#8b7355",letterSpacing:3}}>CHINA TECHNOLOGY DAG</span>
        </div>

        <div style={{display:"flex",gap:6}}>
          <Btn active={mode==="explore"} col="200,160,69" onClick={()=>{setMode("explore");setSteps([]);setSi(0);setPlaying(false)}}>🗺 探索</Btn>
          <Btn active={mode==="bfs"}     col="74,144,217" onClick={()=>{setMode("bfs");setSteps([]);setSi(0);setPlaying(false)}}>⬛ BFS 广度优先</Btn>
          <Btn active={mode==="dfs"}     col="46,204,113" onClick={()=>{setMode("dfs");setSteps([]);setSi(0);setPlaying(false)}}>🔺 DFS 深度优先</Btn>
        </div>

        <div style={{display:"flex",gap:6}}>
          <Btn active={tab==="graph"}   col="200,160,69" onClick={()=>setTab("graph")}>知识图谱</Btn>
          <Btn active={tab==="adjlist"} col="74,144,217" onClick={()=>setTab("adjlist")}>邻接表</Btn>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* LEFT */}
        <aside style={{
          width:172,flexShrink:0,display:"flex",flexDirection:"column",
          background:"rgba(255,252,248,.95)",borderRight:"1px solid rgba(200,160,69,.15)",
          padding:"14px 12px",gap:9,overflow:"auto",
        }}>
          <Sec title="节点类别">
            {Object.entries(CAT).map(([k,{color,label}])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:color,boxShadow:`0 0 4px ${color}50`}}/>
                <span style={{fontSize:11,color:"#5a4a38"}}>{label}</span>
              </div>
            ))}
          </Sec>

          <Sec title="遍历图例">
            {[["#e74c3c","当前节点"],["#c8a045","已访问"],["#4a90d9","队列 BFS"],["#2ecc71","栈 DFS"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:c,boxShadow:`0 0 3px ${c}40`}}/>
                <span style={{fontSize:10,color:"#5a4a38"}}>{l}</span>
              </div>
            ))}
          </Sec>

          <Sec title="图结构统计">
            <Mono color="#6b5d4d">|V| = {NODES.length} 节点{"\n"}|E| = {EDGES.length} 有向边{"\n"}类型: DAG{"\n"}存储: 邻接表</Mono>
          </Sec>

          <Sec title="复杂度">
            <Mono color="#7a8a60">BFS/DFS: O(V+E){"\n"}邻接表: O(V+E)</Mono>
          </Sec>

          {mode!=="explore" && (
            <Sec title="步骤控制">
              {steps.length===0 ? (
                <div style={{fontSize:10,color:"#8b7355",lineHeight:1.8,fontStyle:"italic"}}>
                  点击节点<br/>开始{mode==="bfs"?"广度":"深度"}优先遍历
                </div>
              ) : (
                <>
                  <div style={{display:"flex",gap:4,marginBottom:6}}>
                    {[["◀",()=>setSi(Math.max(0,si-1))],[playing?"⏸":"▶",()=>setPlaying(p=>!p)],["▶",()=>setSi(Math.min(steps.length-1,si+1))]].map(([icon,fn],i)=>(
                      <button key={i} onClick={fn} style={{
                        flex:1,padding:"5px 0",fontSize:12,
                        background:"rgba(200,160,69,.12)",color:"#8b6914",
                        border:"1px solid rgba(200,160,69,.3)",borderRadius:4,
                      }}>{icon}</button>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:"#5a4a38",textAlign:"center",marginBottom:6}}>
                    步骤 {si+1} / {steps.length}
                  </div>
                  <button onClick={()=>{setSteps([]);setSi(0);setPlaying(false)}} style={{
                    width:"100%",padding:"4px",fontSize:10,background:"transparent",
                    color:"#8b7355",border:"1px solid rgba(200,160,69,.15)",borderRadius:4,
                  }}>重置</button>
                </>
              )}
            </Sec>
          )}
        </aside>

        {/* CENTER */}
        <main style={{flex:1,overflow:"hidden",position:"relative",background:"#ebe5d8"}}>
          {tab==="graph" ? (
            <>
            <svg
              viewBox="0 0 1200 640"
              style={{width:"100%",height:"100%",cursor:isDragging?"grabbing":"grab"}}
              xmlns="http://www.w3.org/2000/svg"
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <defs>
                {/* Subtle grid pattern for light theme */}
                <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
                  <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(139,105,20,.06)" strokeWidth=".6"/>
                </pattern>
                {/* Arrow markers */}
                {[["a0","rgba(139,105,20,.35)"],["aD","rgba(139,105,20,.7)"],["aA","#e74c3c"]].map(([id,fill])=>(
                  <marker key={id} id={id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3z" fill={fill}/>
                  </marker>
                ))}
                {/* Gradient for timeline bar */}
                <linearGradient id="timelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b6914" stopOpacity="0.7"/>
                  <stop offset="50%" stopColor="#c8a045" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#b8860b" stopOpacity="0.7"/>
                </linearGradient>
              </defs>
              <rect width="1200" height="640" fill="url(#grid)"/>

              {/* ── Graph content: full pan & zoom ── */}
              <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

                {/* Edges */}
                {EDGES.map((e,i)=>{
                  const st=eState(e.from,e.to)
                  const [clr,sw,mk]=st==="active"?["#e74c3c",2.5,"aA"]:st==="done"?["rgba(139,105,20,.55)",1.8,"aD"]:["rgba(139,105,20,.18)",1.2,"a0"]
                  return <path key={i} d={edgePath(e.from,e.to)} fill="none" stroke={clr} strokeWidth={sw}
                    markerEnd={`url(#${mk})`} style={{transition:"stroke .35s,stroke-width .35s"}}/>
                })}

                {/* Nodes */}
                {NODES.map(node=>{
                  const p=POS[node.id]; const st=nState(node.id)
                  const cc=CAT[node.cat]?.color??"#c8a045"
                  const rc=st==="current"?"#e74c3c":st==="visited"?"#c8a045":st==="queued"?"#4a90d9":st==="stacked"?"#2ecc71":cc
                  const rw=st!=="idle"?2.5:1.8; const isSel=sel===node.id
                  const nm=node.name; const nl=nm.length
                  return (
                    <g key={node.id} transform={`translate(${p.x},${p.y})`} onClick={()=>onNode(node.id)} style={{cursor:"pointer"}}>
                      {st==="current"&&<circle r={R+14} fill="#e74c3c" opacity=".08">
                        <animate attributeName="r" values={`${R+10};${R+20};${R+10}`} dur=".9s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.08;0.03;0.08" dur=".9s" repeatCount="indefinite"/>
                      </circle>}
                      {(st!=="idle"||isSel)&&<circle r={R+7} fill={isSel&&st==="idle"?"#c8a045":rc} opacity=".1"/>}
                      <circle r={R} fill="#fffef8"/>
                      <circle r={R} fill="none" stroke={rc} strokeWidth={rw} style={{transition:"stroke .3s"}}/>
                      {nl<=3&&<text y="3" textAnchor="middle" fontSize="11" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">{nm}</text>}
                      {nl===4&&<text y="3" textAnchor="middle" fontSize="9.5" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">{nm}</text>}
                      {nl>4&&<>
                        <text y="-6" textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">{nm.slice(0,4)}</text>
                        <text y="5"  textAnchor="middle" fontSize="9" fill="#2c2416" fontFamily='"Noto Serif SC"' fontWeight="700">{nm.slice(4)}</text>
                      </>}
                      <text y={R+13} textAnchor="middle" fontSize="8" fill="rgba(90,74,56,.5)" fontFamily='"JetBrains Mono"'>
                        {node.year<0?`${Math.abs(node.year)}BC`:`${node.year}AD`}
                      </text>
                    </g>
                  )
                })}
              </g>

              {/* ── Timeline: Enhanced visual presentation ── */}
              <g transform={`translate(${timelinePanX},0) scale(${scale})`}>
                {/* Background timeline track */}
                <line x1="60" y1="44" x2="1140" y2="44" stroke="rgba(139,105,20,.1)" strokeWidth="14" strokeLinecap="round"/>
                {/* Era range markers with enhanced visual */}
                {[
                  { name: '先秦', start: -7000, end: -500, color: '#8b6914', lightColor: '#f5e6c8' },
                  { name: '春秋', start: -500, end: -221, color: '#a07820', lightColor: '#f8ecd4' },
                  { name: '战国', start: -221, end: -104, color: '#b89030', lightColor: '#faf0dc' },
                  { name: '秦汉', start: -104, end: 220, color: '#c8a045', lightColor: '#fdf6e8' },
                  { name: '隋唐', start: 220, end: 960, color: '#d4b055', lightColor: '#fef8ec' },
                  { name: '宋', start: 960, end: 1232, color: '#b8860b', lightColor: '#fcf3dc' },
                ].map(({ name, start, end, color, lightColor }) => {
                  const minYear = -7000;
                  const maxYear = 1232;
                  const yearRange = maxYear - minYear;
                  const x1 = Math.round(60 + ((start - minYear) / yearRange) * (1140 - 60) * 5);
                  const x2 = Math.round(60 + ((end - minYear) / yearRange) * (1140 - 60) * 5);
                  const width = x2 - x1;
                  return (
                    <g key={name}>
                      {/* Era segment background */}
                      <rect x={x1} y="36" width={width} height="16" rx="4" fill={lightColor} opacity="0.7"/>
                      {/* Era segment foreground */}
                      <line x1={x1} y1="44" x2={x2} y2="44" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.8"/>
                      {/* Era name label */}
                      <text x={x1 + 4} y="28" textAnchor="start" fontSize="11" fill={color}
                        fontFamily='"Noto Serif SC"' fontWeight="600" letterSpacing="1">{name}</text>
                      {/* Year range */}
                      <text x={x1 + 4} y="60" textAnchor="start" fontSize="8" fill="rgba(90,74,56,.55)"
                        fontFamily='"JetBrains Mono"'>{start < 0 ? `${Math.abs(start)}BC` : `${start}AD`}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
            <div style={{position:"absolute",bottom:16,right:16,display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={()=>{const ns=Math.min(4,scaleRef.current*1.2);scaleRef.current=ns;setScale(ns);setTimelinePanX(pan.x)}} style={{width:28,height:28,background:"rgba(255,252,245,.92)",color:"#8b6914",border:"1px solid rgba(200,160,69,.3)",borderRadius:4,fontSize:16,lineHeight:1,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>+</button>
              <button onClick={()=>{const ns=Math.max(0.3,scaleRef.current*0.8);scaleRef.current=ns;setScale(ns);setTimelinePanX(pan.x)}} style={{width:28,height:28,background:"rgba(255,252,245,.92)",color:"#8b6914",border:"1px solid rgba(200,160,69,.3)",borderRadius:4,fontSize:16,lineHeight:1,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>−</button>
              <button onClick={resetView} style={{width:28,height:28,background:"rgba(255,252,245,.92)",color:"#8b6914",border:"1px solid rgba(200,160,69,.3)",borderRadius:4,fontSize:11,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>⌂</button>
            </div>
            </>
          ) : (
            /* Adjacency List View */
            <div style={{padding:"20px 24px",overflow:"auto",height:"100%",fontFamily:'"JetBrains Mono",monospace',background:"#faf8f5"}}>
              <div style={{fontSize:10.5,color:"#5a4a38",letterSpacing:2,marginBottom:14,borderBottom:"1px solid rgba(139,105,20,.12)",paddingBottom:10}}>
                邻接表 · HashMap&lt;String, List&lt;String&gt;&gt;  —  空间复杂度 O(V+E)
              </div>
              {NODES.map(node=>{
                const nbrs=ADJ[node.id]; const isCur=step?.cur===node.id; const isVis=step?.visited?.has(node.id)
                return (
                  <div key={node.id} onClick={()=>onNode(node.id)} style={{
                    display:"flex",alignItems:"flex-start",gap:14,
                    padding:"6px 10px",marginBottom:3,borderRadius:5,cursor:"pointer",
                    background:isCur?"rgba(231,76,60,.08)":isVis?"rgba(200,160,69,.06)":"transparent",
                    borderLeft:`2.5px solid ${isCur?"#e74c3c":isVis?"rgba(139,105,20,.45)":"transparent"}`,
                    transition:"all .3s",
                  }}>
                    <span style={{color:CAT[node.cat]?.color,minWidth:110,fontSize:11}}>{node.id}</span>
                    <span style={{color:"rgba(139,105,20,.3)"}}>→</span>
                    <span style={{fontSize:11}}>
                      <span style={{color:"rgba(139,105,20,.25)"}}>[</span>
                      {nbrs.length===0
                        ? <span style={{color:"rgba(139,105,20,.2)"}}> ∅ </span>
                        : nbrs.map((n,i)=>(
                          <span key={n}>
                            <span style={{color:step?.fresh?.includes(n)?"#e74c3c":step?.visited?.has(n)?"#c8a045":"#4a90d9"}}>{n}</span>
                            {i<nbrs.length-1&&<span style={{color:"rgba(139,105,20,.25)"}}>, </span>}
                          </span>
                        ))
                      }
                      <span style={{color:"rgba(139,105,20,.25)"}}> ]</span>
                    </span>
                    <span style={{marginLeft:"auto",color:"rgba(90,74,56,.5)",fontSize:10}}>{node.name}</span>
                  </div>
                )
              })}
            </div>
          )}

          {mode!=="explore"&&steps.length===0&&(
            <div style={{
              position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",
              background:"rgba(255,252,245,.95)",border:`1px solid rgba(${modeColor},.4)`,
              padding:"8px 18px",borderRadius:6,fontSize:12,color:`rgb(${modeColor})`,
              pointerEvents:"none",letterSpacing:1,boxShadow:"0 2px 12px rgba(0,0,0,.08)",
            }}>
              {mode==="bfs"?"⬛ 点击任意节点，开始广度优先搜索 BFS":"🔺 点击任意节点，开始深度优先搜索 DFS"}
            </div>
          )}
        </main>

        {/* RIGHT: Detail panel */}
        <aside style={{
          width:228,flexShrink:0,background:"rgba(255,252,248,.97)",
          borderLeft:"1px solid rgba(200,160,69,.18)",
          padding:16,display:"flex",flexDirection:"column",gap:11,overflow:"auto",
        }}>
          {selD ? (
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{borderBottom:"1px solid rgba(139,105,20,.18)",paddingBottom:12,marginBottom:12}}>
                <div style={{fontFamily:'"ZCOOL XiaoWei",serif',fontSize:24,letterSpacing:2,color:CAT[selD.cat]?.color??"#c8a045",marginBottom:3}}>{selD.name}</div>
                <div style={{fontSize:10,color:"rgba(90,74,56,.5)",letterSpacing:3}}>{selD.en}</div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:11}}>
                {[[selD.era,"rgba(139,105,20,.1)","rgba(139,105,20,.25)","#8b6914"],
                  [selD.year<0?`${Math.abs(selD.year)} BC`:`${selD.year} AD`,"rgba(139,105,20,.06)","rgba(139,105,20,.15)","#7a6040"],
                  [CAT[selD.cat]?.label,`${CAT[selD.cat]?.color}15`,`${CAT[selD.cat]?.color}40`,CAT[selD.cat]?.color]
                ].map(([txt,bg,border,col],i)=>(
                  <span key={i} style={{padding:"3px 8px",background:bg,border:`1px solid ${border}`,borderRadius:3,fontSize:10.5,color:col,fontFamily:i===1?'"JetBrains Mono"':"inherit"}}>{txt}</span>
                ))}
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:"#5a4a38",letterSpacing:2,marginBottom:3}}>发明者</div>
                <div style={{fontSize:12,color:"#5a4a38"}}>{selD.inv}</div>
              </div>
              <div style={{marginBottom:11}}>
                <div style={{fontSize:9,color:"#5a4a38",letterSpacing:2,marginBottom:4}}>简介</div>
                <div style={{fontSize:10.5,color:"#6b5d4d",lineHeight:1.85}}>{selD.desc}</div>
              </div>
              <div style={{background:"rgba(200,160,69,.06)",borderLeft:"2px solid rgba(139,105,20,.45)",padding:"8px 10px",borderRadius:"0 4px 4px 0",marginBottom:12}}>
                <div style={{fontSize:9,color:"#5a4a38",letterSpacing:2,marginBottom:3}}>历史意义</div>
                <div style={{fontSize:11,color:"#8b6914",lineHeight:1.75}}>{selD.sig}</div>
              </div>
              <div>
                <div style={{fontSize:9,color:"#5a4a38",letterSpacing:2,marginBottom:6}}>图关系 Graph Relations</div>
                <div style={{fontFamily:'"JetBrains Mono"',fontSize:10,color:"#5a4a38",marginBottom:7,display:"flex",gap:14}}>
                  <span>in-deg: <span style={{color:"#4a90d9"}}>{RADJ[selD.id].length}</span></span>
                  <span>out-deg: <span style={{color:"#c8a045"}}>{ADJ[selD.id].length}</span></span>
                </div>
                {RADJ[selD.id].length>0&&<div style={{marginBottom:7}}>
                  <div style={{fontSize:9,color:"rgba(74,144,217,.65)",marginBottom:4}}>前驱节点 ←</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {RADJ[selD.id].map(id=><span key={id} onClick={()=>onNode(id)} style={{padding:"2px 6px",background:"rgba(74,144,217,.08)",border:"1px solid rgba(74,144,217,.3)",borderRadius:3,fontSize:10,color:"#4a90d9",cursor:"pointer"}}>{NMAP[id]?.name}</span>)}
                  </div>
                </div>}
                {ADJ[selD.id].length>0&&<div>
                  <div style={{fontSize:9,color:"rgba(139,105,20,.6)",marginBottom:4}}>后继节点 →</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ADJ[selD.id].map(id=><span key={id} onClick={()=>onNode(id)} style={{padding:"2px 6px",background:"rgba(200,160,69,.08)",border:"1px solid rgba(200,160,69,.3)",borderRadius:3,fontSize:10,color:"#c8a045",cursor:"pointer"}}>{NMAP[id]?.name}</span>)}
                  </div>
                </div>}
              </div>
            </div>
          ) : (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,color:"#8b7355"}}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <polygon points="28,4 52,18 52,38 28,52 4,38 4,18" fill="none" stroke="rgba(139,105,20,.15)" strokeWidth="1.2"/>
                <circle cx="28" cy="28" r="5" fill="none" stroke="rgba(139,105,20,.2)" strokeWidth="1"/>
              </svg>
              <div style={{fontSize:12,textAlign:"center",lineHeight:2,letterSpacing:1}}>点击图中节点<br/>查看发明详情</div>
              <div style={{fontSize:10,color:"#a8956f",textAlign:"center",lineHeight:1.8}}>
                {mode==="explore"&&"探索模式：自由浏览图谱"}
                {mode==="bfs"&&"BFS：点击起始节点"}
                {mode==="dfs"&&"DFS：点击起始节点"}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ══ BOTTOM: DS VISUALIZER ══ */}
      {step&&mode!=="explore"&&(
        <div style={{
          background:"rgba(255,252,245,.98)",borderTop:"1px solid rgba(200,160,69,.2)",
          padding:"8px 20px",display:"flex",gap:16,alignItems:"center",
          flexShrink:0,minHeight:66,boxShadow:"0 -2px 12px rgba(139,105,20,.06)",
        }}>
          <div style={{fontSize:10,color:"#5a4a38",letterSpacing:2,minWidth:68,flexShrink:0}}>
            {mode==="bfs"
              ?<><span style={{color:"#4a90d9",fontSize:11}}>Queue</span><br/><span style={{fontSize:9}}>FIFO 队列</span></>
              :<><span style={{color:"#2ecc71",fontSize:11}}>Stack</span><br/><span style={{fontSize:9}}>LIFO 栈</span></>
            }
          </div>
          <div style={{display:"flex",gap:5,flex:1,overflow:"auto",alignItems:"center",paddingBottom:2}}>
            {(()=>{
              const items=mode==="bfs"?step.queue:[...(step.stack??[])].reverse()
              const col=mode==="bfs"?"#4a90d9":"#2ecc71"
              if(!items||!items.length) return <span style={{fontSize:11,color:"rgba(139,105,20,.3)",fontFamily:'"JetBrains Mono"'}}>[ empty ]</span>
              return items.map((id,i)=>(
                <div key={`${id}-${i}`} style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                  padding:"4px 9px",borderRadius:4,flexShrink:0,
                  background:`${col}10`,border:`1px solid ${i===0?col+"80":col+"25"}`,
                }}>
                  <span style={{fontSize:11,color:col,fontFamily:'"Noto Sans SC"',letterSpacing:1}}>{NMAP[id]?.name}</span>
                  {i===0&&<span style={{fontSize:8,color:`${col}70`}}>{mode==="bfs"?"front":"top"}</span>}
                </div>
              ))
            })()}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:104,flexShrink:0}}>
            <div style={{fontSize:9,color:"#5a4a38",letterSpacing:2,marginBottom:2}}>正在访问</div>
            <div style={{fontSize:15,fontFamily:'"ZCOOL XiaoWei",serif',letterSpacing:2,color:"#e74c3c"}}>{NMAP[step.cur]?.name}</div>
            <div style={{fontSize:9,color:"rgba(231,76,60,.5)",fontFamily:'"JetBrains Mono"'}}>{NMAP[step.cur]?.era}</div>
          </div>
          <div style={{borderLeft:"1px solid rgba(200,160,69,.12)",paddingLeft:14,flexShrink:0,textAlign:"center"}}>
            <div style={{fontSize:22,fontFamily:'"ZCOOL XiaoWei",serif',color:"#c8a045",lineHeight:1}}>{step.visited.size}</div>
            <div style={{fontSize:9,color:"#5a4a38",letterSpacing:1}}>已访问</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helper micro-components ── */
function Sec({title,children}){
  return (
    <div style={{borderTop:"1px solid rgba(139,105,20,.12)",paddingTop:9}}>
      <div style={{fontSize:9.5,color:"#5a4a38",letterSpacing:2,marginBottom:6}}>{title}</div>
      {children}
    </div>
  )
}
function Mono({children,color="#6b5d4d"}){
  return <div style={{fontFamily:'"JetBrains Mono"',fontSize:10,color,lineHeight:2,whiteSpace:"pre"}}>{children}</div>
}
