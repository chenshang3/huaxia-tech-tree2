import { VIEW_BOX } from "../../utils/constants";

export const PANEL_COLLAPSE_EFFECTS = {
  SLIDE: "slide",
  FADE: "fade",
  SCALE: "scale",
  INK: "ink",
};

export const DEFAULT_PANEL_COLLAPSE_EFFECT = PANEL_COLLAPSE_EFFECTS.SLIDE;

export const VIEW_BOX_WIDTH = Number(VIEW_BOX.split(" ")[2]) || 1200;

export const RULER_VIEW_BOX_HEIGHT = 40;
export const RULER_RAIL_Y = 30;
export const RULER_MAJOR_TICK_HEIGHT = 12;
export const RULER_MINOR_TICK_HEIGHT = 6;
export const RULER_LABEL_Y = 4;
export const RULER_LABEL_FONT_SIZE = 10;

export const CATEGORY_TONE = {
  craft: { name: "工艺", tone: "#8A5F32", seal: "匠" },
  metallurgy: { name: "冶金", tone: "#6F4A2A", seal: "金" },
  culture: { name: "文教", tone: "#405A55", seal: "文" },
  science: { name: "格物", tone: "#355C63", seal: "理" },
  medicine: { name: "医药", tone: "#4D6B50", seal: "医" },
  engineering: { name: "营造", tone: "#7B5739", seal: "工" },
  military: { name: "军器", tone: "#7B2E2E", seal: "兵" },
  navigation: { name: "舟舆", tone: "#2F5B62", seal: "航" },
  textile: { name: "织造", tone: "#8D5D56", seal: "织" },
  trade: { name: "互市", tone: "#72572B", seal: "市" },
  agriculture: { name: "农政", tone: "#5F6F3A", seal: "耕" },
  math: { name: "算学", tone: "#514F64", seal: "算" },
};

export const ERA_THEMES = {
  "新石器": "取土为器，磨石成形，先民开始以双手改写自然。",
  "黄帝时期": "衣被天下的传说在此萌芽，丝与医共同进入文明记忆。",
  "夏朝": "青铜初兴，礼器与权力一同铸入火光。",
  "商朝": "甲骨有辞，文字使祭祀、政治与历史开始被保存。",
  "周朝": "礼乐成制，器物与制度共同构成文明秩序。",
  "春秋": "铁器入田，诸侯竞逐中孕育生产力的跃迁。",
  "战国": "百家争鸣，农具、兵器与方术在变法中并进。",
  "秦朝": "车同轨，书同文，工程与治理压缩成统一的尺度。",
  "西汉": "凿空西域，纸、丝、历法和道路把世界接入中原。",
  "东汉": "知识落于纸上，观天测地之器体现实证精神。",
  "三国": "乱世促成军工、水利与稻作技术的快速流动。",
  "两晋": "士人书写山水，工艺与医药在迁徙中延续。",
  "南北朝": "南北交汇，佛寺、农书与本草塑造新的技术网络。",
  "隋朝": "大运河贯通南北，帝国重新组织人力、粮食与交通。",
  "唐朝": "万国来朝，印刷、药物、织造与航路进入盛世节奏。",
  "五代十国": "山河分裂而技艺未断，地方工匠保存火种。",
  "宋朝": "市井繁盛，火药、活字、瓷器与航海迎来密集突破。",
  "元朝": "欧亚贯通，天文、农政与交通在更大尺度上流转。",
  "明朝": "海路远行，营造、医药、瓷业与百科式知识成熟。",
  "清朝": "传统技艺精细化，西学东渐带来新的观察方式。",
  "近代": "机器、铁路与新式教育打开古今交汇的门缝。",
  "现代": "古老技艺进入现代体系，文明记忆转化为新的创造力。",
};

export const ERA_ALIASES = {
  "上古": "新石器",
  "汉朝": "西汉",
  "秦汉": "东汉",
  "隋唐": "唐朝",
  "北宋": "宋朝",
  "南宋": "宋朝",
};
