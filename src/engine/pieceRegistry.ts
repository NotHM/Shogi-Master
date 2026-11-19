export type DirKey = 'NW' | 'N' | 'NE' | 'W' | 'E' | 'SW' | 'S' | 'SE';
export type MoveVectorType = 'none' | 'step' | 'range' | 'slide' | 'jump' | 'hook';

export interface DirCapability {
  type: MoveVectorType;
  max: number;
}

export interface PieceSpec {
  code: string;
  name: string;
  kanji: string;
  isRoyal: boolean;
  isPromotedOnly?: boolean;
  promotesTo: string | null;
  unpromotedCode?: string;
  value: number;
  chessAnalogy: string;
  dirs: Record<DirKey, DirCapability>;
  special: 'lion' | 'fire' | 'hook_diag' | 'hook_ortho' | 'knight' | 'range_jump' | null;
  extraJumps: [number, number][];
  blindSpots: DirKey[];
  moveSummary: string;
  limitBullets: string[];
  compass: number[][];
}

export const DIRS_8: Record<DirKey, [number, number]> = {
  NW: [-1, -1],
  N: [-1, 0],
  NE: [-1, 1],
  W: [0, -1],
  E: [0, 1],
  SW: [1, -1],
  S: [1, 0],
  SE: [1, 1],
};

// Complete 208 Starting Legend (AB - YA)
export const RAW_LEGEND: [string, string, string][] = [
  ["AB", "Angry boar", "嗔猪"],
  ["B", "Angle mover", "角行"],
  ["BA", "Running bear", "走熊"],
  ["BB", "Blind bear", "盲熊"],
  ["BC", "Beast cadet", "獣曹"],
  ["BD", "Buddhist devil", "仏鬼"],
  ["BE", "Bear soldier", "熊兵"],
  ["BG", "Angle general", "角将"],
  ["BI", "Blind dog", "盲犬"],
  ["BL", "Blue dragon", "青龍"],
  ["BM", "Blind monkey", "盲猿"],
  ["BN", "Cannon soldier", "砲兵"],
  ["BO", "Beast officer", "獣吏"],
  ["BS", "Boar soldier", "猪兵"],
  ["BT", "Blind tiger", "盲虎"],
  ["C", "Copper general", "銅将"],
  ["CA", "Capricorn", "摩羯"],
  ["CC", "Huai chicken", "淮鶏"],
  ["CD", "Ceramic dove", "鳩槃"],
  ["CE", "Cloud eagle", "雲鷲"],
  ["CG", "Chicken general", "鶏将"],
  ["CH", "Chariot soldier", "車兵"],
  ["CI", "Stone chariot", "石車"],
  ["CK", "Flying chicken", "飛鶏"],
  ["CL", "Cloud dragon", "雲龍"],
  ["CM", "Climbing monkey", "登猿"],
  ["CN", "Center standard", "中旗"],
  ["CO", "Fowl officer", "禽吏"],
  ["CP", "Crown prince", "太子"],
  ["CR", "Copper chariot", "銅車"],
  ["CS", "Cat sword", "猫刄"],
  ["CT", "Fowl cadet", "禽曹"],
  ["D", "Dog", "犬"],
  ["DE", "Drunken elephant", "酔象"],
  ["DG", "Roaring dog", "吼犬"],
  ["DH", "Dragon horse", "龍馬"],
  ["DK", "Dragon king", "龍王"],
  ["DL", "Howling dog (left)", "犬左"],
  ["DM", "Fire demon", "火鬼"],
  ["DO", "Donkey", "驢馬"],
  ["DR", "Howling dog (right)", "犬右"],
  ["DS", "Dark spirit", "闇鬼"],
  ["DV", "Deva", "提婆"],
  ["EA", "Earth general", "土将"],
  ["EB", "Enchanted badger", "変狸"],
  ["EC", "Earth chariot", "土車"],
  ["ED", "Earth dragon", "地龍"],
  ["EG", "Fierce eagle", "猛鷲"],
  ["EL", "Flying eagle", "飛鷲"],
  ["ES", "Eastern barbarian", "東夷"],
  ["EW", "Evil wolf", "悪狼"],
  ["F", "Fire general", "火将"],
  ["FC", "Flying cat", "飛猫"],
  ["FD", "Flying dragon", "飛龍"],
  ["FE", "Free eagle", "奔鷲"],
  ["FG", "Fragrant elephant", "香象"],
  ["FH", "Flying horse", "飛馬"],
  ["FI", "Fire dragon", "火龍"],
  ["FL", "Fierce leopard", "猛豹"],
  ["FO", "Forest demon", "林鬼"],
  ["FP", "Free pup", "奔犬"],
  ["FR", "Free demon", "奔鬼"],
  ["FS", "Flying swallow", "飛燕"],
  ["FT", "Free dream-eater", "奔獏"],
  ["FY", "Flying goose", "飛鵝"],
  ["G", "Gold general", "金将"],
  ["GB", "Go-between", "仲人"],
  ["GC", "Gold chariot", "金車"],
  ["GD", "Great dragon", "大龍"],
  ["GE", "Great standard", "大旗"],
  ["GG", "Great general", "大将"],
  ["GL", "Gold stag", "金鹿"],
  ["GM", "Great master", "大師"],
  ["GN", "Wood general", "木将"],
  ["GO", "Gold bird", "金鳥"],
  ["GR", "Great dove", "大鳩"],
  ["GS", "Great stag", "大鹿"],
  ["GT", "Great turtle", "大亀"],
  ["GU", "Guardian of the gods", "金剛"],
  ["H", "Horse general", "馬将"],
  ["HE", "Ram's-head soldier", "羊兵"],
  ["HF", "Horned hawk", "角鷹"],
  ["HM", "Hook mover", "鉤行"],
  ["HO", "Horseman", "騎士"],
  ["HR", "Running horse", "走馬"],
  ["HS", "Horse soldier", "馬兵"],
  ["I", "Iron general", "鉄将"],
  ["K", "King", "玉将"],
  ["KM", "Kirin master", "麟師"],
  ["KR", "Kirin", "麒麟"],
  ["L", "Incense chariot", "香車"],
  ["LB", "Longbow soldier", "弩兵"],
  ["LC", "Left chariot", "左車"],
  ["LD", "Lion dog", "狛犬"],
  ["LE", "Left dragon", "左龍"],
  ["LG", "Left general", "左将"],
  ["LI", "Lion hawk", "獅鷹"],
  ["LL", "Little turtle", "小亀"],
  ["LN", "Lion", "獅子"],
  ["LO", "Tengu", "天狗"],
  ["LP", "Leopard soldier", "豹兵"],
  ["LS", "Little standard", "小旗"],
  ["LT", "Left tiger", "左虎"],
  ["M", "Mountain general", "山将"],
  ["MF", "Mountain hawk", "山鷹"],
  ["MK", "Side monkey", "横猿"],
  ["ML", "Left mountain eagle", "左山鷲"],
  ["MR", "Right mountain eagle", "右山鷲"],
  ["MS", "Mountain stag", "山鹿"],
  ["MT", "Center master", "中師"],
  ["N", "Cassia horse", "桂馬"],
  ["NB", "Northern barbarian", "北狄"],
  ["NK", "Neighboring king", "近王"],
  ["NT", "Fierce wolf", "猛狼"],
  ["O", "Ox general", "牛将"],
  ["OC", "Ox chariot", "牛車"],
  ["OK", "Old kite", "古鵄"],
  ["OM", "Old monkey", "古猿"],
  ["OR", "Old rat", "古鼠"],
  ["OS", "Ox soldier", "牛兵"],
  ["OW", "Swooping owl", "梟"],
  ["OX", "Flying ox", "飛牛"],
  ["P", "Pawn", "歩兵"],
  ["PC", "Peacock", "孔雀"],
  ["PE", "Peng master", "鵬師"],
  ["PG", "Pup general", "犬将"],
  ["PH", "Phoenix", "鳳凰"],
  ["PI", "Pig general", "豚将"],
  ["PM", "Phoenix master", "鳳師"],
  ["PR", "Prancing stag", "踊鹿"],
  ["PS", "Poisonous serpent", "毒蛇"],
  ["Q", "Free king", "奔王"],
  ["R", "Flying chariot", "飛車"],
  ["RA", "Rain dragon", "雨龍"],
  ["RB", "Rushing bird", "行鳥"],
  ["RC", "Right chariot", "右車"],
  ["RD", "Reclining dragon", "臥龍"],
  ["RE", "River general", "川将"],
  ["RG", "Right general", "右将"],
  ["RH", "Running chariot", "走車"],
  ["RI", "Right dragon", "右龍"],
  ["RN", "Running stag", "走鹿"],
  ["RO", "Flying general", "飛将"],
  ["RP", "Running pup", "走犬"],
  ["RR", "Running rabbit", "走兎"],
  ["RS", "Rear standard", "後旗"],
  ["RT", "Running tiger", "走虎"],
  ["RU", "Running serpent", "走蛇"],
  ["RV", "Reverse chariot", "反車"],
  ["RW", "Running wolf", "走狼"],
  ["S", "Silver general", "銀将"],
  ["SA", "Side boar", "横猪"],
  ["SC", "Crossbow soldier", "弓兵"],
  ["SD", "Front standard", "前旗"],
  ["SE", "Sword soldier", "刀兵"],
  ["SF", "Side flyer", "横飛"],
  ["SG", "Stone general", "石将"],
  ["SI", "Side dragon", "横龍"],
  ["SL", "Side soldier", "横兵"],
  ["SM", "Side mover", "横行"],
  ["SN", "Coiled serpent", "蟠蛇"],
  ["SO", "Soldier", "兵士"],
  ["SP", "Spear soldier", "槍兵"],
  ["SQ", "Square mover", "方行"],
  ["SR", "Silver rabbit", "銀兎"],
  ["SS", "Side serpent", "横蛇"],
  ["ST", "Strutting crow", "烏行"],
  ["SU", "Southern barbarian", "南蛮"],
  ["SV", "Silver chariot", "銀車"],
  ["SW", "Swallow's wings", "燕羽"],
  ["SX", "Side ox", "横牛"],
  ["T", "Tile general", "瓦将"],
  ["TC", "Tile chariot", "瓦車"],
  ["TD", "Turtle dove", "山鳩"],
  ["TF", "Treacherous fox", "妖狐"],
  ["TG", "Fierce tiger", "猛虎"],
  ["TS", "Turtle-snake", "玄武"],
  ["TT", "Right tiger", "右虎"],
  ["VB", "Fierce bear", "猛熊"],
  ["VD", "Fierce dragon", "猛龍"],
  ["VE", "Vertical bear", "竪熊"],
  ["VG", "Vice general", "副将"],
  ["VH", "Vertical horse", "竪馬"],
  ["VI", "Vermillion sparrow", "朱雀"],
  ["VL", "Vertical leopard", "竪豹"],
  ["VM", "Vertical mover", "竪行"],
  ["VO", "Fierce ox", "猛牛"],
  ["VP", "Vertical pup", "竪犬"],
  ["VR", "Vertical soldier", "竪兵"],
  ["VS", "Fierce stag", "猛鹿"],
  ["VT", "Vertical tiger", "竪虎"],
  ["VW", "Vertical wolf", "竪狼"],
  ["W", "Whale", "鯨鯢"],
  ["WA", "Water dragon", "水龍"],
  ["WB", "Water ox", "水牛"],
  ["WC", "Wood chariot", "木車"],
  ["WD", "Wind dragon", "風龍"],
  ["WE", "White elephant", "白象"],
  ["WF", "Side wolf", "横狼"],
  ["WG", "Water general", "水将"],
  ["WH", "White foal", "白駒"],
  ["WI", "Wind horse", "風馬"],
  ["WL", "Woodland demon", "森鬼"],
  ["WN", "Wind general", "風将"],
  ["WO", "Wooden dove", "木鳩"],
  ["WR", "Sumo wrestler", "力士"],
  ["WS", "Western barbarian", "西戎"],
  ["WT", "White tiger", "白虎"],
  ["YA", "Nature spirit", "山神"],
];

// Promoted-only historical Taikyoku / Standard / Dobutsu pieces
export const PROMOTED_ONLY_LEGEND: [string, string, string, string][] = [
  ["FCr", "Flying crocodile", "飛鰐", "RO"],
  ["FBo", "Free boar", "奔猪", "AB"],
  ["HT", "Heavenly tetrarch", "四天王", "BD"],
  ["GW", "Great whale", "大鯨", "W"],
  ["TK", "Teaching king", "教王", "LD"],
  ["BSpi", "Buddhist spirit", "法性", "DV"],
  ["TH", "Tokin (Promoted Pawn)", "と金", "P"],
  ["PL", "Promoted Lance", "成香", "L"],
  ["PN", "Promoted Knight", "成桂", "N"],
  ["PSv", "Promoted Silver", "成銀", "S"],
  ["HEN", "Hen (Promoted Chick)", "成ひよこ", "P"],
];

interface CompactDef {
  s?: DirKey[];           // step 1
  r?: [DirKey[], number][]; // range N
  sl?: DirKey[];          // slide infinity
  hk?: DirKey[];          // 90-degree hook slide
  jp?: DirKey[];          // jump 2 along compass ray
  ej?: [number, number][]; // extra jumps [dr, dc]
  sp?: 'lion' | 'fire' | 'hook_diag' | 'hook_ortho' | 'knight' | 'range_jump';
  pr: string | null;      // promotesTo
  val: number;            // base material value
  ca: string;             // Chess analogy
}

// EXPLICIT DETERMINISTIC MOVEMENT TABLE FOR ALL 208 STARTING PIECES + PROMOTED-ONLY PIECES
const EXPLICIT_DEFS: Record<string, CompactDef> = {
  // Royals
  K:   { s: ['NW','N','NE','W','E','SW','S','SE'], pr: null, val: 10000, ca: "Chess King (Royal Commander)" },
  CP:  { s: ['NW','N','NE','W','E','SW','S','SE'], pr: null, val: 9500,  ca: "Second Royal King (Crown Prince)" },
  NK:  { s: ['NW','N','NE','W','E','SW','S','SE'], pr: 'SD', val: 360,   ca: "Non-Royal King → Promotes to Front Standard" },
  DE:  { s: ['NW','N','NE','W','E','SW','SE'],     pr: 'CP', val: 420,   ca: "King without backward step → Promotes to Royal Crown Prince!" },

  // Standard & Classic Step Movers
  P:   { s: ['N'], pr: 'G', val: 100, ca: "Chess Pawn (captures 1 step straight forward)" },
  GB:  { s: ['N','S'], pr: 'DE', val: 130, ca: "Vertical shuttle (1 step N/S) → Promotes to Drunken Elephant" },
  D:   { s: ['NW','N','NE'], pr: 'G', val: 150, ca: "Forward 3-way vanguard scout" },
  I:   { s: ['NW','N','NE'], pr: 'VR', val: 170, ca: "Forward-only shield (cannot retreat)" },
  SG:  { s: ['NW','NE'], pr: 'GO', val: 140, ca: "Forward diagonal pair (2 squares only)" },
  EA:  { s: ['N','S'], pr: 'BT', val: 150, ca: "Vertical step general (N/S)" },
  T:   { s: ['NW','NE','S'], pr: 'RT', val: 165, ca: "Diagonal-forward + 1 step back" },
  C:   { s: ['NW','N','NE','S'], pr: 'SM', val: 210, ca: "Forward 3 + 1 step back → Promotes to Side Mover" },
  S:   { s: ['NW','N','NE','SW','SE'], pr: 'VM', val: 260, ca: "5-way diagonal + forward striker → Promotes to Vertical Mover" },
  G:   { s: ['NW','N','NE','W','E','S'], pr: 'R', val: 310, ca: "6-way fortress defender (blind SW/SE) → Promotes to Rook" },
  FL:  { s: ['NW','N','NE','SW','S','SE'], pr: 'B', val: 280, ca: "King without E/W side steps → Promotes to Bishop" },
  BT:  { s: ['NW','NE','W','E','SW','S','SE'], pr: 'FD', val: 290, ca: "King blind directly ahead (N) → Promotes to Flying Dragon" },
  AB:  { s: ['N','W','E','S'], pr: 'FBo', val: 240, ca: "1-step Orthogonal Wazir → Promotes to Free Boar" },
  CS:  { s: ['NW','NE','SW','SE'], pr: 'DH', val: 230, ca: "1-step Diagonal Ferz → Promotes to Dragon Horse" },
  EW:  { s: ['NW','N','NE','W','E'], pr: 'FE', val: 260, ca: "5-way forward/sideways pack hunter (cannot retreat)" },
  BM:  { s: ['NW','NE','W','E','SW','SE'], pr: 'FD', val: 250, ca: "6-way diagonal + lateral step (blind N/S)" },
  BB:  { s: ['NW','NE','SW','SE','S'], pr: 'FD', val: 245, ca: "4 diagonals + 1 step S" },
  BI:  { s: ['NW','NE','W','E','S'], pr: 'NT', val: 235, ca: "Forward diagonals + sides + S (blind N)" },
  CM:  { s: ['NW','N','NE','S'], pr: 'TG', val: 215, ca: "Copper-pattern agile climber → Promotes to Fierce Tiger" },
  SN:  { s: ['N','SW','S','SE'], pr: 'DK', val: 225, ca: "Rear-heavy step mover → Promotes to Dragon King" },
  RD:  { s: ['N','W','E','SW','S','SE'], pr: 'GD', val: 270, ca: "6-way rear/orthogonal guardian → Promotes to Great Dragon" },
  OM:  { s: ['NW','NE','SW','S','SE'], pr: 'MF', val: 230, ca: "Inverted Silver General → Promotes to Mountain Hawk" },
  ST:  { s: ['N','SW','SE'], pr: 'FC', val: 195, ca: "Forward point + rear diagonals → Promotes to Flying Cat" },
  SW:  { s: ['NW','N','NE','W','E'], r: [[['S'], 2]], pr: 'FY', val: 275, ca: "Forward/sideways step + 2-step retreat" },

  // Jumping & Leaping Pieces
  N:   { ej: [[-2,-1],[-2,1]], sp: 'knight', pr: 'G', val: 220, ca: "Forward-only Chess Knight (2N, 1E/W)" },
  DO:  { s: ['W','E'], jp: ['N','S'], ej: [[-2,0],[2,0]], pr: 'G', val: 240, ca: "Steps E/W, jumps 2 squares N or S" },
  KR:  { s: ['NW','NE','SW','SE'], jp: ['N','S','W','E'], ej: [[-2,0],[2,0],[0,-2],[0,2]], pr: 'LN', val: 460, ca: "Diagonal step + Orthogonal Dabbaba jump-2 → Promotes to Lion!" },
  KM:  { s: ['NW','NE','SW','SE'], r: [[['N','S'], 3]], jp: ['W','E'], ej: [[0,-3],[0,3],[-2,0],[2,0]], pr: 'GD', val: 580, ca: "Master Kirin with 3-square jumps + diagonal steps" },
  PH:  { s: ['N','S','W','E'], jp: ['NW','NE','SW','SE'], ej: [[-2,-2],[-2,2],[2,-2],[2,2]], pr: 'Q', val: 470, ca: "Orthogonal step + Diagonal Alfil jump-2 → Promotes to Queen!" },
  PM:  { s: ['N','S','W','E'], r: [[['NW','NE','SW','SE'], 3]], ej: [[-3,-3],[-3,3],[3,-3],[3,3]], pr: 'FE', val: 600, ca: "Master Phoenix with 3-square diagonal jumps" },
  FC:  { s: ['SW','S','SE'], ej: [[-3,-3],[-3,0],[-3,3]], pr: 'R', val: 380, ca: "Leaps 3 squares forward/diagonal-forward" },
  TF:  { s: ['NW','N','NE','SW','S','SE'], ej: [[-2,-2],[-2,0],[-2,2],[2,-2],[2,0],[2,2]], pr: 'MF', val: 520, ca: "Steps or jumps 2/3 squares forward, back, or diagonally" },
  PR:  { s: ['NW','N','NE','SW','SE'], r: [[['W','E'], 2]], pr: 'SQ', val: 360, ca: "Steps 5-way + ranges 2 squares E/W" },

  // Multi-Step Lion & Eagle Dynasty
  LN:  { s: ['NW','N','NE','W','E','SW','S','SE'], sp: 'lion', ej: [[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-1,-2],[-1,2],[0,-2],[0,2],[1,-2],[1,2],[2,-2],[2,-1],[2,0],[2,1],[2,2]], pr: 'FE', val: 1100, ca: "Double-Move King (2 steps per turn, double capture, Igui, or 2-square jump)" },
  LD:  { r: [[['NW','N','NE','W','E','SW','S','SE'], 3]], sp: 'lion', ej: [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]], pr: 'TK', val: 1050, ca: "3-Step Lion Guardian → Promotes to Teaching King" },
  FE:  { sl: ['NW','N','NE','W','E','SW','S','SE'], sp: 'lion', ej: [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]], pr: null, val: 1450, ca: "Chess Queen + Double-Step Lion Power in all 8 directions" },
  LI:  { sl: ['NW','NE','SW','SE'], s: ['N','S','W','E'], sp: 'lion', ej: [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]], pr: null, val: 1380, ca: "Lion + Diagonal Bishop Slider" },
  EL:  { sl: ['N','S','W','E','SW','SE'], s: ['NW','NE'], sp: 'lion', ej: [[-2,-2],[-2,2]], pr: 'FE', val: 1220, ca: "Soaring Eagle: Rook + forward Lion double-step diagonally" },
  HF:  { sl: ['NW','NE','SW','SE','W','E','S'], s: ['N'], sp: 'lion', ej: [[-2,0]], pr: 'FE', val: 1200, ca: "Horned Falcon: Queen except forward is a 2-step Lion horn" },

  // Hook Movers & Fire Demon & Apex Generals
  DM:  { sl: ['NW','N','NE','W','E','SW','S','SE'], sp: 'fire', pr: null, val: 1750, ca: "Queen + Area Burn (incinerates all 8 adjacent enemies after moving!)" },
  LO:  { hk: ['NW','NE','SW','SE'], s: ['N','S','W','E'], sp: 'hook_diag', pr: null, val: 1550, ca: "Two-step 90° Diagonal Hook Bishop (can turn corners mid-move!)" },
  PC:  { hk: ['NW','NE'], r: [[['SW','SE'], 2]], sp: 'hook_diag', pr: 'LO', val: 980, ca: "Forward 90° Diagonal Hook Mover + 2-step rear diagonals" },
  CA:  { hk: ['NW','NE','SW','SE'], sp: 'hook_diag', pr: 'LO', val: 1120, ca: "Pure 4-way 90° Diagonal Hook Bishop" },
  HM:  { hk: ['N','S','W','E'], s: ['NW','NE','SW','SE'], sp: 'hook_ortho', pr: 'GG', val: 1500, ca: "Two-step 90° Orthogonal Hook Rook (turns corners along ranks/files!)" },
  GG:  { sl: ['NW','N','NE','W','E','SW','S','SE'], sp: 'range_jump', pr: null, val: 1850, ca: "Supreme Queen that can leap over intervening pieces along all 8 rays" },
  VG:  { sl: ['NW','NE','SW','SE'], r: [[['N','S','W','E'], 3]], sp: 'range_jump', pr: 'GG', val: 1520, ca: "Rank-Jumping Diagonal Slider + 3-step Orthogonal Leaper" },
  GM:  { sl: ['NW','N','NE','W','E','S'], r: [[['SW','SE'], 5]], sp: 'range_jump', pr: 'GG', val: 1480, ca: "Great Master: 6-way jumping slider + 5-step rear diagonals" },
  PE:  { sl: ['NW','NE','SW','SE','N','S'], r: [[['W','E'], 5]], sp: 'range_jump', pr: 'GG', val: 1460, ca: "Peng Master: Jumping vertical/diagonal slider + 5-step side rays" },
  MT:  { sl: ['N','S','NW','NE','SW','SE'], r: [[['W','E'], 3]], sp: 'lion', pr: 'GG', val: 1350, ca: "Center Master: 6-way slider with close-quarters Lion strike" },

  // Major Sliders (Rooks, Bishops, Queens, Chariots, Dragons, Oxen)
  Q:   { sl: ['NW','N','NE','W','E','SW','S','SE'], pr: 'FE', val: 1000, ca: "Chess Queen (slides infinitely in all 8 directions)" },
  R:   { sl: ['N','S','W','E'], pr: 'DK', val: 650, ca: "Chess Rook (slides N/S/E/W) → Promotes to Dragon King" },
  B:   { sl: ['NW','NE','SW','SE'], pr: 'DH', val: 620, ca: "Chess Bishop (slides 4 diagonals) → Promotes to Dragon Horse" },
  DK:  { sl: ['N','S','W','E'], s: ['NW','NE','SW','SE'], pr: 'FD', val: 820, ca: "Crowned Rook (Chess Rook + 1-step King diagonals)" },
  DH:  { sl: ['NW','NE','SW','SE'], s: ['N','S','W','E'], pr: 'HF', val: 800, ca: "Crowned Bishop (Chess Bishop + 1-step King orthogonals)" },
  L:   { sl: ['N'], pr: 'W', val: 300, ca: "Forward-only Spear/Rook → Promotes to Whale" },
  RV:  { sl: ['N','S'], pr: 'W', val: 380, ca: "Vertical Rook (slides N and S) → Promotes to Whale" },
  W:   { sl: ['N','S','SW','SE'], pr: 'GW', val: 540, ca: "Slides N, S, and backward diagonals → Promotes to Great Whale" },
  WH:  { sl: ['N','S','NW','NE'], pr: 'Q', val: 560, ca: "Slides N, S, and forward diagonals → Promotes to Free King" },
  VM:  { sl: ['N','S'], s: ['W','E'], pr: 'OX', val: 520, ca: "Slides vertically N/S + 1 step E/W → Promotes to Flying Ox" },
  SM:  { sl: ['W','E'], s: ['N','S'], pr: 'WB', val: 520, ca: "Slides horizontally E/W + 1 step N/S → Promotes to Water Ox" },
  SF:  { sl: ['W','E'], s: ['NW','NE','SW','SE'], pr: 'DK', val: 550, ca: "Slides E/W + steps on all 4 diagonals" },
  OX:  { sl: ['NW','N','NE','SW','S','SE'], pr: 'FBo', val: 780, ca: "Queen without horizontal E/W movement" },
  WB:  { sl: ['NW','NE','W','E','SW','SE'], r: [[['N','S'], 2]], pr: 'FT', val: 810, ca: "Queen with N/S capped at 2 squares" },
  SQ:  { sl: ['N','S','W','E'], s: ['NW','NE'], pr: 'GD', val: 700, ca: "Chess Rook + forward diagonal steps" },
  FD:  { r: [[['NW','NE','SW','SE'], 2]], pr: 'DK', val: 390, ca: "2-square diagonal ranger → Promotes to Dragon King" },
  VO:  { r: [[['N','S','W','E'], 2]], pr: 'OX', val: 390, ca: "2-square orthogonal ranger → Promotes to Flying Ox" },

  // Remaining Explicit 208 Piece Definitions (Alphabetical & Complete)
  BA:  { sl: ['N','S','W','E'], r: [[['NW','NE'], 2]], pr: 'FT', val: 680, ca: "Rook + 2-step forward diagonals" },
  BC:  { r: [[['NW','N','NE','W','E'], 2]], s: ['S'], pr: 'BO', val: 380, ca: "2-square forward/sideways ranger + 1 step S" },
  BD:  { r: [[['NW','NE'], 3]], s: ['W','E','S'], pr: 'HT', val: 410, ca: "3-square forward diagonal striker → Promotes to Heavenly Tetrarch" },
  BE:  { sl: ['N'], r: [[['NW','NE','W','E'], 2]], s: ['S'], pr: 'VB', val: 480, ca: "Forward lance + 2-step forward/sideways" },
  BG:  { sl: ['NW','NE','SW','SE'], sp: 'range_jump', pr: 'FE', val: 890, ca: "Jumping Bishop (leaps over obstacles on diagonals)" },
  BL:  { sl: ['N','S','NE','NW'], r: [[['W','E'], 2]], pr: 'GD', val: 740, ca: "Azure Dragon: Slides N/S/NW/NE + 2 steps E/W" },
  BN:  { sl: ['N'], r: [[['NW','NE'], 3], [['W','E'], 2]], s: ['S'], pr: 'GD', val: 560, ca: "Artillery lance + 3-step forward diagonals" },
  BO:  { r: [[['NW','N','NE','SW','SE'], 3], [['W','E'], 2]], pr: 'LD', val: 520, ca: "3-square 5-way beast commander → Promotes to Lion Dog" },
  BS:  { sl: ['N'], r: [[['W','E'], 2]], s: ['S'], pr: 'SA', val: 420, ca: "Forward slider + 2-step lateral charger" },
  CC:  { r: [[['NW','NE'], 2]], s: ['N','S'], pr: 'FE', val: 310, ca: "2-step forward diagonals + 1 step N/S" },
  CD:  { sl: ['NW','NE'], r: [[['N','S','W','E'], 2]], pr: 'GR', val: 540, ca: "Forward diagonal slider + 2-step orthogonal" },
  CE:  { sl: ['N','S'], r: [[['NW','NE'], 3]], s: ['W','E'], pr: 'EL', val: 640, ca: "Vertical slider + 3-step forward diagonal eagle" },
  CG:  { r: [[['N'], 4]], s: ['SW','SE'], pr: 'FT', val: 340, ca: "4-square forward charger + rear diagonal steps" },
  CH:  { sl: ['N','S','SW','SE'], r: [[['W','E'], 2]], pr: 'HT', val: 690, ca: "Vertical & rear-diagonal chariot + 2-step sides" },
  CI:  { sl: ['N','S'], s: ['NW','NE','W','E'], pr: 'RH', val: 540, ca: "Vertical slider + forward/side steps" },
  CK:  { r: [[['NW','N','NE'], 3]], s: ['W','E'], pr: 'RB', val: 390, ca: "3-square forward fan + lateral steps" },
  CL:  { sl: ['NW','NE','SW','SE','S'], s: ['N','W','E'], pr: 'GD', val: 760, ca: "Bishop + backward slider + forward/side steps" },
  CN:  { sl: ['NW','N','NE','SW','S','SE'], r: [[['W','E'], 3]], pr: 'GE', val: 820, ca: "6-way slider + 3-step horizontal standard" },
  CO:  { r: [[['NW','NE','SW','SE'], 3], [['N','S'], 2]], pr: 'LI', val: 510, ca: "3-step diagonal & 2-step vertical officer → Promotes to Lion Hawk" },
  CR:  { sl: ['N','S'], r: [[['NW','NE'], 3]], pr: 'CR', val: 570, ca: "Vertical slider + 3-step forward diagonal horns" },
  CT:  { r: [[['NW','NE','SW','SE'], 2]], s: ['N','W','E'], pr: 'CO', val: 370, ca: "2-step diagonal cadet + forward/side steps" },
  DG:  { sl: ['NW','N','NE','SW','S','SE'], r: [[['W','E'], 3]], pr: 'LD', val: 830, ca: "Roaring Dog: 6-way slider + 3-step lateral → Promotes to Lion Dog" },
  DL:  { sl: ['N'], r: [[['NW','SW'], 3]], s: ['S','E'], pr: 'LE', val: 450, ca: "Left-biased hound: slides N, 3-step left diagonals" },
  DR:  { sl: ['N'], r: [[['NE','SE'], 3]], s: ['S','W'], pr: 'RI', val: 450, ca: "Right-biased hound: slides N, 3-step right diagonals" },
  DS:  { r: [[['NW','NE','E','SE'], 5]], s: ['N','W','SW','S'], pr: 'BSpi', val: 640, ca: "5-square asymmetric spirit → Promotes to Buddhist Spirit" },
  DV:  { r: [[['NW','NE','W','SW'], 5]], s: ['N','E','SE','S'], pr: 'TK', val: 640, ca: "5-square Deva guardian → Promotes to Teaching King" },
  EB:  { r: [[['N','W','E'], 2]], pr: 'CD', val: 280, ca: "2-square forward & lateral trickster" },
  EC:  { sl: ['N','S'], r: [[['W','E'], 2]], s: ['NW','NE'], pr: 'RB', val: 530, ca: "Vertical chariot + 2-step E/W" },
  ED:  { sl: ['SW','SE'], r: [[['NW','N','NE'], 2]], s: ['W','E','S'], pr: 'RA', val: 520, ca: "Rear-diagonal slider + 2-step forward fan" },
  EG:  { sl: ['NW','NE'], r: [[['W','E','SW','SE'], 2]], s: ['N'], pr: 'EL', val: 610, ca: "Forward diagonal slider + 2-step lateral/rear" },
  ES:  { r: [[['N','S','W','E'], 2]], s: ['NW','NE'], pr: 'LN', val: 410, ca: "2-step orthogonal + forward diagonals → Promotes to Lion" },
  F:   { r: [[['NW','NE'], 3]], s: ['N','S'], pr: 'GD', val: 360, ca: "3-step forward diagonal fire rays + vertical step" },
  FG:  { sl: ['NW','NE'], r: [[['N','S','W','E','SW','SE'], 2]], pr: 'Q', val: 670, ca: "Forward diagonal slider + 2-square all-around aura" },
  FH:  { sl: ['NW','NE'], r: [[['N','S'], 2]], s: ['W','E'], pr: 'Q', val: 580, ca: "Forward diagonal slider + 2-step vertical" },
  FI:  { sl: ['NW','NE','SW','SE'], r: [[['N'], 4], [['S'], 2]], pr: 'GD', val: 790, ca: "Bishop + 4-step forward & 2-step rear flame" },
  FO:  { sl: ['NW','NE','S'], r: [[['N','W','E'], 3]], pr: 'PM', val: 710, ca: "Forward-diagonal & rear slider + 3-step N/E/W" },
  FP:  { sl: ['N','S'], r: [[['NW','NE','W','E','SW','SE'], 2]], pr: 'FR', val: 640, ca: "Vertical slider + 2-square 6-way nimble hound" },
  FR:  { sl: ['NW','NE','W','E','SW','SE'], r: [[['N','S'], 5]], pr: 'Q', val: 880, ca: "Slides 6 ways + 5-square N/S range" },
  FS:  { sl: ['NW','NE'], s: ['S'], pr: 'R', val: 490, ca: "Forward diagonal slider + 1 step S → Promotes to Rook" },
  FT:  { sl: ['NW','N','NE','SW','S','SE'], r: [[['W','E'], 5]], pr: 'Q', val: 900, ca: "6-way slider + 5-square lateral reach" },
  FY:  { r: [[['N'], 3]], s: ['NW','NE','SW','S','SE'], pr: 'R', val: 350, ca: "3-step forward dart + 5-way step" },
  GC:  { sl: ['N','S','W','E'], r: [[['NW','NE'], 2]], pr: 'PE', val: 720, ca: "Chess Rook + 2-step forward diagonals" },
  GD:  { sl: ['NW','NE','W','E','SW','SE'], r: [[['N','S'], 3]], pr: 'MT', val: 850, ca: "Bishop + horizontal Rook + 3-step vertical" },
  GE:  { sl: ['NW','N','NE','W','E','SW','S','SE'], r: [[['W','E'], 36]], pr: 'GG', val: 960, ca: "8-way Great Standard commander" },
  GL:  { sl: ['NW','NE'], r: [[['SW','SE'], 2]], s: ['N','S','W','E'], pr: 'RN', val: 600, ca: "Forward diagonal slider + 2-step rear diagonals" },
  GN:  { r: [[['NW','NE'], 2]], pr: 'WE', val: 210, ca: "2-square forward diagonal ranger" },
  GO:  { sl: ['NW','N','NE','SW','S','SE'], r: [[['W','E'], 3]], pr: 'FE', val: 840, ca: "Golden Bird: 6-way slider + 3-step wings" },
  GR:  { sl: ['NW','NE','SW','SE'], r: [[['N','S','W','E'], 3]], pr: 'WO', val: 830, ca: "Bishop + 3-square orthogonal wings" },
  GS:  { sl: ['N','S','W','E'], r: [[['NW','NE'], 3]], s: ['SW','SE'], pr: 'FR', val: 750, ca: "Rook + 3-step forward antlers" },
  GT:  { sl: ['N','S','NW','NE','SW','SE'], r: [[['W','E'], 3]], jp: ['N','S'], pr: 'BSpi', val: 870, ca: "6-way slider + 3-step lateral + vertical jump" },
  GU:  { r: [[['N','S','W','E'], 3]], s: ['NW','NE'], pr: 'HT', val: 450, ca: "3-square orthogonal guardian → Promotes to Heavenly Tetrarch" },
  H:   { r: [[['N'], 3]], s: ['NW','NE','S'], pr: 'Q', val: 330, ca: "3-square forward charger + forward diagonals" },
  HE:  { sl: ['NW','NE'], s: ['S'], pr: 'RT', val: 480, ca: "Forward diagonal ram horns + 1 step S" },
  HO:  { sl: ['NW','N','NE','S'], r: [[['W','E'], 2]], pr: 'HR', val: 650, ca: "Cavalry slider N/S/NW/NE + 2-step sides" },
  HR:  { sl: ['NW','N','NE'], r: [[['S'], 2]], s: ['SW','SE'], pr: 'FR', val: 630, ca: "3-way forward slider + 2-step S" },
  HS:  { sl: ['N','NW','NE'], r: [[['W','E'], 3]], s: ['S'], pr: 'HR', val: 660, ca: "3-way forward slider + 3-step lateral" },
  LB:  { sl: ['N','NW','NE'], r: [[['W','E'], 5], [['S'], 2]], pr: 'LB', val: 740, ca: "Longbow sniper: 3 forward slides + 5-step lateral" },
  LC:  { sl: ['N','NW','SW'], s: ['E','S'], pr: 'LE', val: 590, ca: "Asymmetric Left Chariot (slides N, NW, SW)" },
  LE:  { sl: ['W','NW','SW'], r: [[['N','S','NE','SE'], 2]], pr: 'GD', val: 680, ca: "Asymmetric Left Dragon (slides leftward 3 rays)" },
  LG:  { s: ['NW','N','NE','W','SW','S','SE'], pr: 'LA', val: 280, ca: "King that cannot step right (E)" },
  LL:  { sl: ['N','S'], r: [[['NW','NE','SW','SE'], 2], [['W','E'], 2]], pr: 'GT', val: 620, ca: "Vertical slider + 2-step 6-way shell" },
  LP:  { sl: ['N'], r: [[['NW','NE','W','E'], 2]], s: ['SW','S','SE'], pr: 'VL', val: 500, ca: "Forward lance + 2-step upper fan" },
  LS:  { sl: ['N','S','W','E'], r: [[['NW','NE'], 2]], s: ['SW','SE'], pr: 'RS', val: 710, ca: "Rook + 2-step forward diagonals + 1-step rear" },
  LT:  { sl: ['W','NW','SW'], s: ['NE','SE'], pr: 'WT', val: 570, ca: "Left Tiger: slides W, NW, SW + steps right diagonals" },
  M:   { r: [[['NW','NE'], 3], [['N'], 2]], s: ['S'], pr: 'TG', val: 380, ca: "3-step forward diagonals + 2-step N" },
  MF:  { sl: ['NW','N','NE','W','E','S'], r: [[['SW','SE'], 2]], pr: 'HF', val: 810, ca: "6-way slider + 2-step rear diagonals" },
  MK:  { sl: ['W','E'], s: ['NW','NE','S'], pr: 'SL', val: 490, ca: "Horizontal slider + forward diagonals & S" },
  ML:  { sl: ['NW','SW','N'], r: [[['NE','SE','W','E'], 2]], s: ['S'], pr: 'FE', val: 720, ca: "Left Mountain Eagle: slides left diagonals & N" },
  MR:  { sl: ['NE','SE','N'], r: [[['NW','SW','W','E'], 2]], s: ['S'], pr: 'FE', val: 720, ca: "Right Mountain Eagle: slides right diagonals & N" },
  MS:  { sl: ['N'], r: [[['W','E'], 2], [['S'], 3]], s: ['NW','NE'], pr: 'GS', val: 520, ca: "Forward slider + 3-step S + 2-step E/W" },
  NB:  { r: [[['NW','NE'], 2]], s: ['W','E','SW','SE'], pr: 'FG', val: 310, ca: "2-step forward diagonals + lateral/rear steps" },
  NT:  { r: [[['N','S','W','E'], 2]], s: ['NW','NE'], pr: 'BE', val: 370, ca: "2-step orthogonal wolf + forward diagonal steps" },
  O:   { r: [[['N'], 3]], s: ['NW','NE','S'], pr: 'Q', val: 330, ca: "3-step forward horn + forward diagonals" },
  OC:  { sl: ['N'], s: ['NW','NE','S'], pr: 'PL', val: 350, ca: "Forward lance + forward diagonal steps" },
  OK:  { r: [[['NW','NE','SW','SE'], 2]], s: ['N','W','E'], pr: 'LI', val: 410, ca: "2-step diagonal kite → Promotes to Lion Hawk" },
  OR:  { r: [[['NW','NE','S'], 2]], pr: 'RB', val: 260, ca: "2-square Y-shaped ranger (NW, NE, S)" },
  OS:  { sl: ['N','NW','NE'], r: [[['W','E'], 2]], s: ['S'], pr: 'OX', val: 620, ca: "3-way forward slider + 2-step E/W" },
  OW:  { s: ['N','SW','SE'], r: [[['NW','NE'], 2]], pr: 'CE', val: 270, ca: "2-step forward diagonals + N/SW/SE steps" },
  PG:  { r: [[['N'], 4]], s: ['NW','NE'], pr: 'FP', val: 340, ca: "4-square forward hound + forward diagonal steps" },
  PI:  { r: [[['NW','NE'], 4], [['S'], 2]], pr: 'FT', val: 380, ca: "4-square forward diagonal charger + 2-step S" },
  PS:  { s: ['N','W','E'], ej: [[-2,-2],[-2,2],[2,0]], pr: 'HM', val: 460, ca: "Jumps 2 squares NW/NE/S → Promotes to Hook Mover!" },
  RA:  { sl: ['W','E','SW','SE','S'], r: [[['NW','N','NE'], 2]], pr: 'GD', val: 760, ca: "Slides sideways & backward + 2-step forward fan" },
  RB:  { sl: ['NW','N','NE','W','E','SW','SE'], pr: 'FR', val: 850, ca: "Queen that cannot slide directly south (blind S)" },
  RC:  { sl: ['N','NE','SE'], s: ['W','S'], pr: 'RI', val: 590, ca: "Asymmetric Right Chariot (slides N, NE, SE)" },
  RE:  { r: [[['N'], 3], [['S'], 2]], s: ['NW','NE'], pr: 'WA', val: 330, ca: "3-step N, 2-step S + forward diagonals" },
  RG:  { s: ['NW','N','NE','E','SW','S','SE'], pr: 'RA', val: 280, ca: "King that cannot step left (W)" },
  RH:  { sl: ['N','S','W','E'], r: [[['NW','NE','SW','SE'], 2]], pr: 'Q', val: 760, ca: "Chess Rook + 2-square diagonal rays" },
  RI:  { sl: ['E','NE','SE'], r: [[['N','S','NW','SW'], 2]], pr: 'GD', val: 680, ca: "Asymmetric Right Dragon (slides rightward 3 rays)" },
  RN:  { sl: ['N','S'], r: [[['NW','NE','W','E','SW','SE'], 2]], pr: 'FR', val: 660, ca: "Vertical slider + 2-step 6-way antlers" },
  RO:  { sl: ['N','S','W','E'], r: [[['NW','NE'], 3]], pr: 'FCr', val: 740, ca: "Rook + 3-step forward diagonals → Promotes to Flying Crocodile (飛鰐)!" },
  RP:  { sl: ['N','S'], r: [[['NW','NE'], 2]], s: ['W','E'], pr: 'FP', val: 560, ca: "Vertical slider + 2-step forward diagonals" },
  RR:  { sl: ['N'], r: [[['NW','NE'], 2]], s: ['SW','S','SE'], pr: 'TF', val: 480, ca: "Forward slider + 2-step forward diagonals → Promotes to Treacherous Fox" },
  RS:  { sl: ['N','S','W','E'], r: [[['NW','NE','SW','SE'], 2]], pr: 'CN', val: 750, ca: "Chess Rook + 2-square all-4 diagonals" },
  RT:  { sl: ['N','S'], r: [[['W','E'], 2]], s: ['NW','NE'], pr: 'FT', val: 570, ca: "Vertical slider + 2-step lateral" },
  RU:  { sl: ['N','S'], s: ['NW','NE','W','E','SW','SE'], pr: 'FS', val: 550, ca: "Vertical slider + 1-step King aura" },
  RW:  { sl: ['W','E','NW','NE'], s: ['N','S'], pr: 'FR', val: 670, ca: "Slides E, W, NW, NE + 1-step N/S" },
  SA:  { sl: ['W','E'], r: [[['N','S'], 2]], s: ['NW','NE'], pr: 'FBo', val: 580, ca: "Horizontal slider + 2-step vertical → Promotes to Free Boar" },
  SC:  { sl: ['N'], r: [[['NW','NE','W','E'], 3]], s: ['S'], pr: 'LB', val: 610, ca: "Crossbow: forward slider + 3-step lateral & diagonal bolts" },
  SD:  { sl: ['NW','N','NE','W','E'], r: [[['SW','S','SE'], 3]], pr: 'GE', val: 840, ca: "5-way forward/side slider + 3-step rear" },
  SE:  { r: [[['NW','N','NE'], 2]], s: ['S','SW','SE'], pr: 'SE', val: 320, ca: "2-step forward blade + rear steps" },
  SI:  { sl: ['W','E','N'], s: ['S','NW','NE'], pr: 'RD', val: 630, ca: "Slides E, W, and N + 3 steps" },
  SL:  { sl: ['W','E'], r: [[['N'], 2]], s: ['S'], pr: 'WB', val: 510, ca: "Horizontal slider + 2-step N, 1-step S" },
  SO:  { sl: ['N','S','W','E'], pr: 'HO', val: 600, ca: "Orthogonal Chariot/Rook → Promotes to Horseman" },
  SP:  { sl: ['N'], r: [[['W','E'], 2]], s: ['NW','NE','S'], pr: 'SO', val: 460, ca: "Forward spear slider + 2-step lateral" },
  SR:  { sl: ['SW','SE'], r: [[['NW','NE'], 2]], pr: 'WH', val: 500, ca: "Rear diagonal slider + 2-step forward diagonals" },
  SS:  { sl: ['W','E'], r: [[['N'], 3]], s: ['S','NW','NE'], pr: 'WA', val: 540, ca: "Horizontal slider + 3-step forward strike" },
  SU:  { r: [[['SW','SE'], 2]], s: ['N','W','E','S'], pr: 'WE', val: 310, ca: "2-step rear diagonals + orthogonal steps" },
  SV:  { sl: ['N','S'], r: [[['NW','NE'], 2]], s: ['SW','SE'], pr: 'W', val: 560, ca: "Vertical slider + 2-step forward diagonals" },
  SX:  { sl: ['W','E'], s: ['NE','SW','N','S'], pr: 'OX', val: 520, ca: "Horizontal slider + asymmetric diagonal steps" },
  TC:  { sl: ['N','S'], s: ['NW','NE','SW','SE'], pr: 'RH', val: 550, ca: "Vertical slider + 4 diagonal steps" },
  TD:  { r: [[['NW','NE'], 5]], s: ['N','W','E','SW','S','SE'], pr: 'CD', val: 530, ca: "5-square forward diagonal dove + 1-step King aura" },
  TG:  { r: [[['N'], 2]], s: ['NW','NE','W','E','SW','S','SE'], pr: 'GE', val: 340, ca: "King with 2-square forward pounce" },
  TS:  { sl: ['NW','SE'], r: [[['N','S','W','E','NE','SW'], 2]], pr: 'GW', val: 650, ca: "Black Tortoise: slides NW/SE + 2-step aura" },
  TT:  { sl: ['E','NE','SE'], s: ['NW','SW'], pr: 'WT', val: 570, ca: "Right Tiger: slides E, NE, SE + steps left diagonals" },
  VB:  { sl: ['N'], r: [[['NW','NE','W','E'], 2]], s: ['SW','S','SE'], pr: 'GE', val: 540, ca: "Forward slider + 2-step upper fan + rear steps" },
  VD:  { sl: ['NW','NE','SW','SE'], r: [[['N','S','W','E'], 2]], pr: 'GD', val: 780, ca: "Chess Bishop + 2-square orthogonal aura" },
  VE:  { sl: ['N'], r: [[['W','E','S'], 2]], pr: 'FT', val: 490, ca: "Forward slider + 2-step E/W/S" },
  VH:  { sl: ['N'], r: [[['NW','NE'], 2]], s: ['W','E','S'], pr: 'DH', val: 500, ca: "Forward slider + 2-step forward diagonals" },
  VI:  { sl: ['NE','SW'], r: [[['N','S','W','E','NW','SE'], 2]], pr: 'FE', val: 650, ca: "Vermillion Bird: slides NE/SW + 2-step aura" },
  VL:  { sl: ['N'], s: ['NW','NE','W','E','S'], pr: 'GD', val: 480, ca: "Gold General that slides infinitely straight ahead (N)" },
  VP:  { sl: ['N'], s: ['SW','S','SE'], pr: 'LP', val: 410, ca: "Forward slider + 3 rear steps" },
  VR:  { sl: ['N'], r: [[['W','E'], 2]], s: ['S'], pr: 'CH', val: 470, ca: "Forward slider + 2-step sides + 1-step S" },
  VS:  { r: [[['NW','N','NE'], 2]], s: ['SW','S','SE','W','E'], pr: 'RN', val: 380, ca: "2-step forward fan + 1-step sides/rear" },
  VT:  { sl: ['N'], r: [[['S'], 2]], pr: 'TG', val: 420, ca: "Slides N + 2 steps S" },
  VW:  { sl: ['N'], r: [[['S'], 3]], s: ['NW','NE','W','E'], pr: 'RW', val: 510, ca: "Slides N + 3 steps S + forward/side steps" },
  WA:  { sl: ['NW','NE','SW','SE'], r: [[['N'], 2], [['S'], 4], [['W','E'], 2]], pr: 'PH', val: 790, ca: "Bishop + 4-step S & 2-step N/E/W" },
  WC:  { sl: ['N','S'], s: ['NW','SE','NE','SW'], pr: 'WI', val: 540, ca: "Vertical slider + diagonal steps" },
  WD:  { sl: ['NW','NE','W','E'], r: [[['SW','SE'], 2]], s: ['N','S'], pr: 'FD', val: 700, ca: "Slides NW, NE, E, W + 2-step rear diagonals" },
  WE:  { r: [[['NW','N','NE','W','E','SW','S','SE'], 2]], pr: 'K', val: 520, ca: "2-square 8-way elephant" },
  WF:  { sl: ['W','E'], r: [[['NW','NE'], 2]], s: ['N','S'], pr: 'FW', val: 540, ca: "Horizontal slider + 2-step forward diagonals" },
  WG:  { r: [[['NW','NE'], 3]], s: ['N','S'], pr: 'VG', val: 400, ca: "3-step forward diagonals → Promotes to Vice General!" },
  WI:  { sl: ['N','S','NW','NE'], r: [[['W','E'], 2]], pr: 'TK', val: 730, ca: "Slides N, S, NW, NE + 2-step sides" },
  WL:  { sl: ['NW','NE','W','E'], r: [[['N','S'], 3]], s: ['SW','SE'], pr: 'PE', val: 770, ca: "Slides NW, NE, E, W + 3-step vertical" },
  WN:  { r: [[['N'], 3]], s: ['NW','NE','S'], pr: 'FBo', val: 340, ca: "3-step forward gale + forward diagonals" },
  WO:  { sl: ['NW','NE','SW','SE'], r: [[['N','S','W','E'], 2]], pr: 'BL', val: 760, ca: "Diagonal slider + 2-step orthogonal" },
  WR:  { r: [[['NW','NE','SW','SE'], 3]], s: ['N','S','W','E'], pr: 'HT', val: 490, ca: "3-step diagonal grappler → Promotes to Heavenly Tetrarch" },
  WS:  { r: [[['W','E'], 2]], s: ['NW','N','NE','S'], pr: 'LD', val: 350, ca: "2-step lateral + Copper steps → Promotes to Lion Dog" },
  WT:  { sl: ['W','E','NW','SW'], r: [[['N','S'], 2]], s: ['NE','SE'], pr: 'BSpi', val: 740, ca: "White Tiger: slides W, E, NW, SW + 2-step N/S" },
  YA:  { r: [[['NW','N','NE','SW','S','SE'], 3]], s: ['W','E'], pr: 'HT', val: 520, ca: "3-step 6-way Nature Spirit → Promotes to Heavenly Tetrarch" },

  // Promoted-Only Historical Pieces & Standard/Dobutsu Promotions
  FCr:  { sl: ['N','S','W','E'], r: [[['NW','NE','SW','SE'], 3]], sp: 'lion', ej: [[-2,-2],[-2,2],[2,-2],[2,2]], pr: null, val: 1350, ca: "Promoted Flying General (飛鰐): Rook + 3-step diagonal crocodile jaws!" },
  FBo:  { sl: ['NW','NE','W','E','SW','SE'], pr: null, val: 860, ca: "Promoted Angry Boar (奔猪): Slides along all 4 diagonals and E/W!" },
  HT:   { sl: ['NW','N','NE','W','E','SW','S','SE'], r: [[['NW','N','NE','W','E','SW','S','SE'], 4]], sp: 'lion', pr: null, val: 1400, ca: "Heavenly Tetrarch (四天王): Igui guardian + 4-range / slide vectors" },
  GW:   { sl: ['N','S','NW','NE','SW','SE'], pr: null, val: 920, ca: "Promoted Whale (大鯨): Slides N, S, and all 4 diagonals" },
  TK:   { sl: ['NW','N','NE','W','E','SW','S','SE'], sp: 'range_jump', pr: null, val: 1650, ca: "Teaching King (教王): All-direction slider + 3-rank jumping mastery" },
  BSpi: { sl: ['NW','N','NE','W','E','SW','S','SE'], sp: 'lion', ej: [[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]], pr: null, val: 1600, ca: "Buddhist Spirit (法性): Lion + 8-way Free King combined!" },
  TH:   { s: ['NW','N','NE','W','E','S'], pr: null, val: 310, ca: "Tokin (Promoted Pawn): Moves identically to a Gold General" },
  PL:   { s: ['NW','N','NE','W','E','S'], pr: null, val: 310, ca: "Promoted Lance: Moves identically to a Gold General" },
  PN:   { s: ['NW','N','NE','W','E','S'], pr: null, val: 310, ca: "Promoted Knight: Moves identically to a Gold General" },
  PSv:  { s: ['NW','N','NE','W','E','S'], pr: null, val: 310, ca: "Promoted Silver: Moves identically to a Gold General" },
  HEN:  { s: ['NW','N','NE','W','E','S'], pr: null, val: 320, ca: "Dōbutsu Hen (Promoted Chick): Moves 6 ways like a Gold General" },
};

function buildSpecFromCompact(
  code: string,
  name: string,
  kanji: string,
  def: CompactDef,
  isPromotedOnly = false,
  unpromotedCode?: string
): PieceSpec {
  const dirs: Record<DirKey, DirCapability> = {
    NW: { type: 'none', max: 0 },
    N: { type: 'none', max: 0 },
    NE: { type: 'none', max: 0 },
    W: { type: 'none', max: 0 },
    E: { type: 'none', max: 0 },
    SW: { type: 'none', max: 0 },
    S: { type: 'none', max: 0 },
    SE: { type: 'none', max: 0 },
  };

  if (def.s) {
    def.s.forEach(k => { dirs[k] = { type: 'step', max: 1 }; });
  }
  if (def.r) {
    def.r.forEach(([keys, max]) => {
      keys.forEach(k => { dirs[k] = { type: 'range', max }; });
    });
  }
  if (def.jp) {
    def.jp.forEach(k => { dirs[k] = { type: 'jump', max: 2 }; });
  }
  if (def.sl) {
    def.sl.forEach(k => { dirs[k] = { type: 'slide', max: 36 }; });
  }
  if (def.hk) {
    def.hk.forEach(k => { dirs[k] = { type: 'hook', max: 36 }; });
  }

  const blindSpots: DirKey[] = [];
  const slideVectors: string[] = [];
  const rangeVectors: string[] = [];
  const stepVectors: string[] = [];

  (Object.keys(DIRS_8) as DirKey[]).forEach(dirKey => {
    const info = dirs[dirKey];
    if (info.type === 'none') blindSpots.push(dirKey);
    else if (info.type === 'slide') slideVectors.push(dirKey);
    else if (info.type === 'hook') slideVectors.push(`${dirKey} (90° Hook)`);
    else if (info.type === 'range') rangeVectors.push(`${dirKey} (1–${info.max})`);
    else if (info.type === 'jump') rangeVectors.push(`${dirKey} (Jump 2)`);
    else if (info.type === 'step') stepVectors.push(dirKey);
  });

  const parts: string[] = [];
  if (def.sp === 'knight') {
    parts.push('Jumps 2 squares forward and 1 square left or right (NNE / NNW), leaping over any intervening pieces');
  } else {
    if (slideVectors.length) parts.push(`Slides along [${slideVectors.join(', ')}]`);
    if (rangeVectors.length) parts.push(`Ranges [${rangeVectors.join(', ')}]`);
    if (stepVectors.length) parts.push(`Steps 1 square [${stepVectors.join(', ')}]`);
    if (def.ej && def.ej.length && def.sp !== 'lion') {
      parts.push('Can leap over obstacles to designated jump squares');
    }
    if (def.sp === 'lion') {
      parts.push('MULTI-STEP LION POWER: Can step twice per turn (double capture or stationary Igui strike-and-return) or jump 2 squares');
    }
    if (def.sp === 'fire') {
      parts.push('FIRE DEMON AURA: Automatically burns and removes all adjacent enemy pieces at the end of its move');
    }
    if (def.sp === 'range_jump') {
      parts.push('APEX RANK-JUMPER: Can jump over intervening pieces along its slide lines');
    }
  }
  const moveSummary = parts.join('. ') + '.';

  const limitBullets: string[] = [];
  if (blindSpots.length > 0) {
    limitBullets.push(`Blind Spots: Cannot move or attack along [${blindSpots.join(', ')}]. Enemy pieces can approach safely along these rays.`);
  } else {
    limitBullets.push('Full 8-Direction Perimeter: Covers all 8 surrounding vectors, though distance and blocking rules differ by ray.');
  }
  if (rangeVectors.length > 0) {
    limitBullets.push(`Range Cap: Limited-range rays terminate after their max step count (${rangeVectors.join(', ')}) and are blocked by obstacles.`);
  }
  if (slideVectors.length > 0 && def.sp !== 'range_jump') {
    limitBullets.push('Ray Obstruction: Sliding rays stop at the first friendly or enemy piece in their path.');
  }
  if (def.sp === 'knight') {
    limitBullets.push('Forward Lock: Cannot move sideways or backward; mandatory promotion applies on the last 2 ranks.');
  }

  const compass = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 9, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  (Object.keys(DIRS_8) as DirKey[]).forEach(dirKey => {
    const info = dirs[dirKey];
    const [dr, dc] = DIRS_8[dirKey];
    if (info.type === 'step') {
      compass[2 + dr][2 + dc] = 1;
    } else if (info.type === 'range') {
      compass[2 + dr][2 + dc] = 1;
      compass[2 + dr * 2][2 + dc * 2] = 3;
    } else if (info.type === 'jump') {
      compass[2 + dr * 2][2 + dc * 2] = 3;
    } else if (info.type === 'slide') {
      compass[2 + dr][2 + dc] = 2;
      compass[2 + dr * 2][2 + dc * 2] = 2;
    } else if (info.type === 'hook') {
      compass[2 + dr][2 + dc] = 4;
      compass[2 + dr * 2][2 + dc * 2] = 4;
    }
  });

  if (def.ej) {
    def.ej.forEach(([dr, dc]) => {
      const r = 2 + dr;
      const c = 2 + dc;
      if (r >= 0 && r < 5 && c >= 0 && c < 5 && compass[r][c] === 0) {
        compass[r][c] = 3;
      }
    });
  }

  // Ensure promotesTo points to a valid piece code
  const safePromo = def.pr && EXPLICIT_DEFS[def.pr] ? def.pr : (def.pr ? 'Q' : null);

  return {
    code,
    name,
    kanji,
    isRoyal: code === 'K' || code === 'CP',
    isPromotedOnly,
    promotesTo: safePromo,
    unpromotedCode,
    value: def.val,
    chessAnalogy: def.ca,
    dirs,
    special: def.sp || null,
    extraJumps: def.ej || [],
    blindSpots,
    moveSummary,
    limitBullets,
    compass,
  };
}

export const PIECE_DB: Record<string, PieceSpec> = {};

RAW_LEGEND.forEach(([code, name, kanji]) => {
  const def = EXPLICIT_DEFS[code];
  PIECE_DB[code] = buildSpecFromCompact(code, name, kanji, def, false);
});

PROMOTED_ONLY_LEGEND.forEach(([code, name, kanji, baseCode]) => {
  const def = EXPLICIT_DEFS[code];
  PIECE_DB[code] = buildSpecFromCompact(code, name, kanji, def, true, baseCode);
});
