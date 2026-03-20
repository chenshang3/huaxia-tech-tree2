// ============================================================
// useGraphData.js
// 图数据获取与状态管理
// ============================================================

import { useState, useEffect } from "react";
import { fetchAllData } from "../services/api";

export function useGraphData() {
  const [NODES, setNODES] = useState([]);
  const [POS, setPOS] = useState({});
  const [CAT, setCAT] = useState({});
  const [ADJ, setADJ] = useState({});
  const [RADJ, setRADJ] = useState({});
  const [NMAP, setNMAP] = useState({});
  const [timelineConfig, setTimelineConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllData()
      .then(data => {
        setNODES(data.nodes);
        setPOS(data.positions);
        setCAT(data.categories);
        setADJ(data.adj);
        setRADJ(data.radj);
        setNMAP(data.nmap);
        setTimelineConfig(data.timelineConfig);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  return { NODES, POS, CAT, ADJ, RADJ, NMAP, timelineConfig, loading, error };
}
