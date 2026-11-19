import { StrategyArrow, StrategyKeySquare } from './canvasRenderer';
import { PIECE_DB } from './pieceRegistry';
import {
  BoardPiece,
  BoardScaleId,
  PlayerSide,
  SCALE_CONFIGS,
  cloneBoard,
  getScalePromotesTo,
  inBounds,
  makePiece,
} from './shogiEngine';

function createEmptyBoard(rows: number, cols: number): (BoardPiece | null)[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

export type StrategyPhaseId = 'openers' | 'castling' | 'midgame' | 'endgame';

export interface StrategyPhaseMeta {
  id: StrategyPhaseId;
  order: 1 | 2 | 3 | 4;
  title: string;
  kanji: string;
  subtitle: string;
}

export const STRATEGY_PHASE_TRACKS: StrategyPhaseMeta[] = [
  {
    id: 'openers',
    order: 1,
    title: 'Phase 1: Openers & Joseki',
    kanji: '序盤・定跡',
    subtitle: 'Static Rook vs. Ranging Rook, Bishop diagonal opening, Vanguard pawn pushes & multi-sector deployment',
  },
  {
    id: 'castling',
    order: 2,
    title: 'Phase 2: Castling & Fortresses',
    kanji: '囲い・堅陣',
    subtitle: 'Step-by-step construction of Yagura, Mino, Anaguma, Boat, Lion Keep, War-Budget Citadel & Dual-Royal Aegis',
  },
  {
    id: 'midgame',
    order: 3,
    title: 'Phase 3: Mid-Game & Sabaki',
    kanji: '中盤・捌き',
    subtitle: 'Climbing Silver breaks, Edge Spears, Dangling Pawns, Lion Igui strikes, Star Evolution & Fire Demon hooks',
  },
  {
    id: 'endgame',
    order: 4,
    title: 'Phase 4: End-Game, Yose & Tsume',
    kanji: '終盤・寄せ',
    subtitle: 'Attacking castle weak points (Kobin), Hisshi brinkmate, Speed vs. Material, Try races & Dual-Royal mate',
  },
];

export interface CurriculumGuidedStep {
  stepNumber: number;
  title: string;
  type: 'move' | 'drop';
  fromR?: number;
  fromC?: number;
  dropCode?: string;
  toR: number;
  toC: number;
  secondToR?: number;
  secondToC?: number;
  promote?: boolean;
  coachCommentary: string;
  arrows: StrategyArrow[];
  keySquares: StrategyKeySquare[];
  opponentReply?: {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    promote?: boolean;
    replyNote: string;
  };
}

export interface CurriculumMistakeDemo {
  mistakeTitle: string;
  badMove: {
    type: 'move' | 'drop';
    fromR?: number;
    fromC?: number;
    dropCode?: string;
    toR: number;
    toC: number;
  };
  refutationMove: {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
  };
  explanation: string;
  arrows: StrategyArrow[];
  keySquares: StrategyKeySquare[];
}

export interface StrategyCurriculumModule {
  id: string;
  phase: StrategyPhaseId;
  scale: BoardScaleId;
  title: string;
  kanji: string;
  proverb: {
    jp: string;
    romaji: string;
    en: string;
  };
  championBotId: string;
  strategicOverview: string;
  winPlanSummary: string;
  pieces: {
    r: number;
    c: number;
    code: string;
    owner: PlayerSide;
    promoted?: boolean;
    stars?: number;
    tier?: number;
    citadelGuard?: boolean;
  }[];
  senteHand: string[];
  goteHand: string[];
  guidedSteps: CurriculumGuidedStep[];
  mistakeDemo: CurriculumMistakeDemo;
}

export const SHOGI_STRATEGY_CURRICULUM: StrategyCurriculumModule[] = [
  // ==========================================================================
  // PHASE 1: OPENERS & JOSEKI (序盤・定跡) — Across All 5 Board Scales
  // ==========================================================================
  {
    id: 'opener-dobutsu-vanguard',
    phase: 'openers',
    scale: 'dobutsu',
    title: '01. Dōbutsu Tempo Opening: Central Chick Exchange & Giraffe Pin',
    kanji: 'どうぶつ序盤・中央ひよこ交換',
    proverb: {
      jp: '初手は中央を制せよ',
      romaji: 'Shote wa chūō o seyo',
      en: 'Control the central file on the very first move.',
    },
    championBotId: 'bot-01',
    strategicOverview:
      'In 3×4 Dōbutsu Shōgi, every piece starts in contact. Capturing the central Chick immediately gains a piece in hand while opening the center file for your Lion and Giraffe.',
    winPlanSummary:
      'Trade the central Chick, absorb Gote’s Lion recapture by activating your Giraffe on the right file, and prepare a parachute Chick drop.',
    pieces: [
      { r: 0, c: 0, code: 'R', owner: 'gote' },
      { r: 0, c: 1, code: 'K', owner: 'gote' },
      { r: 0, c: 2, code: 'B', owner: 'gote' },
      { r: 1, c: 1, code: 'P', owner: 'gote' },
      { r: 2, c: 1, code: 'P', owner: 'sente' },
      { r: 3, c: 0, code: 'B', owner: 'sente' },
      { r: 3, c: 1, code: 'K', owner: 'sente' },
      { r: 3, c: 2, code: 'R', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Capture Central Chick (2二ひよこ)',
        type: 'move',
        fromR: 2,
        fromC: 1,
        toR: 1,
        toC: 1,
        coachCommentary:
          'Advance your Chick [P] from (2,1) to (1,1) to capture Gote’s Chick and put a reserve [P] into your hand.',
        arrows: [
          { fromR: 2, fromC: 1, toR: 1, toC: 1, color: 'emerald', label: '1. Take [P]' },
          { fromR: 0, fromC: 2, toR: 1, toC: 1, color: 'amber', label: 'Gote Reply', dashed: true },
        ],
        keySquares: [{ r: 1, c: 1, color: 'emerald', label: 'CENTER' }],
        opponentReply: {
          fromR: 0,
          fromC: 2,
          toR: 1,
          toC: 1,
          replyNote: 'Gote recaptures at (1,1) with the Elephant [B], keeping the Lion safe on rank 1.',
        },
      },
      {
        stepNumber: 2,
        title: 'Develop Giraffe to Pin the File (1三きりん)',
        type: 'move',
        fromR: 3,
        fromC: 2,
        toR: 2,
        toC: 2,
        coachCommentary:
          'Step your Giraffe [R] forward from (3,2) to (2,2), seizing the open right file and threatening to invade Gote’s back rank.',
        arrows: [
          { fromR: 3, fromC: 2, toR: 2, toC: 2, color: 'emerald', label: '2. Activate [R]' },
          { fromR: 2, fromC: 2, toR: 0, toC: 2, color: 'sky', label: 'File Pressure', dashed: true },
        ],
        keySquares: [{ r: 0, c: 2, color: 'sky', label: 'TARGET' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Exposing the Right Flank with Early Giraffe Retreat',
      badMove: { type: 'move', fromR: 3, fromC: 0, toR: 2, toC: 1 },
      refutationMove: { fromR: 1, fromC: 1, toR: 2, toC: 1 },
      explanation:
        'If you Leave the central Chick uncaptured or move into (2,1) prematurely, Gote’s Chick at (1,1) captures straight down with check on your Lion!',
      arrows: [
        { fromR: 1, fromC: 1, toR: 2, toC: 1, color: 'rose', label: 'Refutation!' },
        { fromR: 2, fromC: 1, toR: 3, toC: 1, color: 'rose', label: 'Royal Check', dashed: true },
      ],
      keySquares: [{ r: 2, c: 1, color: 'rose', label: 'BLUNDER' }],
    },
  },
  {
    id: 'opener-shogi9-ibisha',
    phase: 'openers',
    scale: 'shogi9',
    title: '02. Static Rook Opening (居飛車): Rook Pawn Push & Bishop Diagonal',
    kanji: '居飛車基本定跡（２六歩・７六歩）',
    proverb: {
      jp: '居飛車は飛車先を突け',
      romaji: 'Ibisha wa hishasaki o tsuke',
      en: 'In Static Rook, always push your Rook Pawn first to threaten a file breakthrough.',
    },
    championBotId: 'bot-06',
    strategicOverview:
      'Static Rook (Ibisha) keeps the Flying Chariot [R] on its starting 2nd file (col 7) while opening the Bishop’s long diagonal at 7六 (row 5, col 2). This dual threat forces Gote to defend both the Bishop head and the 2nd file simultaneously.',
    winPlanSummary:
      'Open the Bishop diagonal at (5,2), then advance the 2nd-file Rook Pawn from (6,7) to (5,7) and (4,7) to spearhead the Static Rook attack.',
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 0, c: 3, code: 'G', owner: 'gote' },
      { r: 0, c: 5, code: 'G', owner: 'gote' },
      { r: 0, c: 2, code: 'S', owner: 'gote' },
      { r: 0, c: 6, code: 'S', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 1, c: 7, code: 'B', owner: 'gote' },
      { r: 2, c: 1, code: 'P', owner: 'gote' },
      { r: 2, c: 5, code: 'P', owner: 'gote' },
      { r: 2, c: 6, code: 'P', owner: 'gote' },
      { r: 2, c: 7, code: 'P', owner: 'gote' },
      { r: 6, c: 2, code: 'P', owner: 'sente' },
      { r: 6, c: 6, code: 'P', owner: 'sente' },
      { r: 6, c: 7, code: 'P', owner: 'sente' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 8, c: 2, code: 'S', owner: 'sente' },
      { r: 8, c: 3, code: 'G', owner: 'sente' },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
      { r: 8, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 6, code: 'S', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Open the Bishop Diagonal (▲7六歩)',
        type: 'move',
        fromR: 6,
        fromC: 2,
        toR: 5,
        toC: 2,
        coachCommentary:
          'Push the 7th-file Pawn from (6,2) to (5,2) [▲7六歩]. Your Angle Mover [B] at (7,1) immediately beams across the entire diagonal toward Gote’s Bishop at (1,7).',
        arrows: [
          { fromR: 6, fromC: 2, toR: 5, toC: 2, color: 'emerald', label: '1. ▲7六歩' },
          { fromR: 7, fromC: 1, toR: 1, toC: 7, color: 'sky', label: 'Bishop Ray', dashed: true },
        ],
        keySquares: [
          { r: 5, c: 2, color: 'emerald', label: '7六 OPEN' },
          { r: 1, c: 7, color: 'amber', label: 'ENEMY B' },
        ],
        opponentReply: {
          fromR: 2,
          fromC: 5,
          toR: 3,
          toC: 5,
          replyNote: 'Gote plays △4四歩 (2,5→3,5) or △3四歩 to prepare defense around the Bishop head.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Advance the Rook Vanguard Pawn (▲2六歩)',
        type: 'move',
        fromR: 6,
        fromC: 7,
        toR: 5,
        toC: 7,
        coachCommentary:
          'Push the 2nd-file Pawn from (6,7) to (5,7) [▲2六歩] backed by your Rook [R] at (7,7). Next turn you threaten ▲2五歩 to crush Gote’s weak Bishop head at (2,7)!',
        arrows: [
          { fromR: 6, fromC: 7, toR: 5, toC: 7, color: 'emerald', label: '2. ▲2六歩' },
          { fromR: 7, fromC: 7, toR: 2, toC: 7, color: 'amber', label: 'Rook File Pressure', dashed: true },
        ],
        keySquares: [{ r: 2, c: 7, color: 'rose', label: 'B-HEAD' }],
        opponentReply: {
          fromR: 0,
          fromC: 3,
          toR: 1,
          toC: 6,
          replyNote: 'Gote brings a Gold General to (1,6) [△3二金] to guard the vulnerable Bishop head at (2,7).',
        },
      },
      {
        stepNumber: 3,
        title: 'Step 3: Seize Space on the 2nd File (▲2五歩)',
        type: 'move',
        fromR: 5,
        fromC: 7,
        toR: 4,
        toC: 7,
        coachCommentary:
          'Push the Rook Pawn one step further from (5,7) to (4,7) [▲2五歩], locking down the right wing and completing the classical Ibisha opening!',
        arrows: [{ fromR: 5, fromC: 7, toR: 4, toC: 7, color: 'emerald', label: '3. ▲2五歩' }],
        keySquares: [{ r: 4, c: 7, color: 'emerald', label: 'VANGUARD' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Unguarded Bishop Head & Premature Rook Slide',
      badMove: { type: 'move', fromR: 7, fromC: 7, toR: 7, toC: 6 },
      refutationMove: { fromR: 1, fromC: 7, toR: 7, toC: 1 },
      explanation:
        'Sliding the Rook off the 2nd file without preparing a Ranging Rook structure wastes tempo and lets Gote initiate the Bishop exchange on their terms.',
      arrows: [
        { fromR: 7, fromC: 7, toR: 7, toC: 6, color: 'amber', label: 'Slow Move', dashed: true },
        { fromR: 1, fromC: 7, toR: 7, toC: 1, color: 'rose', label: 'Punishment!' },
      ],
      keySquares: [{ r: 7, c: 1, color: 'rose', label: 'EXPOSED' }],
    },
  },
  {
    id: 'opener-shogi9-furibisha',
    phase: 'openers',
    scale: 'shogi9',
    title: '03. Ranging Rook Opening (四間飛車 Shikenbisha & Gokigen Nakabisha)',
    kanji: '振り飛車定跡（四間飛車・中飛車）',
    proverb: {
      jp: '振り飛車には角交換を挑め・角道を止めて飛車を振れ',
      romaji: 'Kakumichi o tomete hisha o fure',
      en: 'Close the Bishop diagonal to safely swing your Rook to the left wing.',
    },
    championBotId: 'bot-03',
    strategicOverview:
      'Ranging Rook (Furibisha) players swing their Flying Chariot [R] from the right wing (col 7) across to the 6th file (Shikenbisha, col 3) or 5th file (Nakabisha, col 4). This frees the entire right wing for building a rock-solid Mino Castle while counter-attacking down the center.',
    winPlanSummary:
      'Open your Bishop line, push the 6th-file Pawn to prepare a home for your Rook, and swing [R] from (7,7) to (7,3) [▲6八飛].',
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 1, c: 7, code: 'B', owner: 'gote' },
      { r: 3, c: 7, code: 'P', owner: 'gote' },
      { r: 6, c: 2, code: 'P', owner: 'sente' },
      { r: 6, c: 3, code: 'P', owner: 'sente' },
      { r: 6, c: 4, code: 'P', owner: 'sente' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 8, c: 2, code: 'S', owner: 'sente' },
      { r: 8, c: 3, code: 'G', owner: 'sente' },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
      { r: 8, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 6, code: 'S', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Push the 6th-File Pawn (▲6六歩)',
        type: 'move',
        fromR: 6,
        fromC: 3,
        toR: 5,
        toC: 3,
        coachCommentary:
          'Push the Pawn from (6,3) to (5,3) [▲6六歩]. This temporarily closes Gote’s Bishop diagonal so you can safely swing your Rook and develop your Silver without sudden Bishop-trade ambushes.',
        arrows: [
          { fromR: 6, fromC: 3, toR: 5, toC: 3, color: 'emerald', label: '1. ▲6六歩 (Seal)' },
          { fromR: 1, fromC: 7, toR: 5, toC: 3, color: 'amber', label: 'Diagonal Blocked', dashed: true },
        ],
        keySquares: [{ r: 5, c: 3, color: 'emerald', label: 'SEALED' }],
        opponentReply: {
          fromR: 3,
          fromC: 7,
          toR: 4,
          toC: 7,
          replyNote: 'Gote pushes △8五歩 (3,7→4,7), threatening the Static Rook breakthrough on the left edge.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Guard the Bishop Head with Bishop (▲7七角)',
        type: 'move',
        fromR: 7,
        fromC: 1,
        toR: 6,
        toC: 2,
        coachCommentary:
          'Step your Bishop from (7,1) to (6,2) [▲7七角] to defend the square (5,1) against Gote’s Rook Pawn while clearing rank 8 for your Rook.',
        arrows: [{ fromR: 7, fromC: 1, toR: 6, toC: 2, color: 'emerald', label: '2. ▲7七角' }],
        keySquares: [{ r: 6, c: 2, color: 'sky', label: 'GUARD 8六' }],
        opponentReply: {
          fromR: 0,
          fromC: 4,
          toR: 1,
          toC: 3,
          replyNote: 'Gote begins castling the King toward the left wing (0,4→1,3).',
        },
      },
      {
        stepNumber: 3,
        title: 'Step 3: Swing Rook to the 4th File (▲6八飛 — Shikenbisha!)',
        type: 'move',
        fromR: 7,
        fromC: 7,
        toR: 7,
        toC: 3,
        coachCommentary:
          'Slide your Flying Chariot [R] from (7,7) to (7,3) [▲6八飛]! Your Rook now commands the 6th file, and your King has an open runway to march right into the Mino Castle at (7,7).',
        arrows: [
          { fromR: 7, fromC: 7, toR: 7, toC: 3, color: 'emerald', label: '3. ▲6八飛 Swing!' },
          { fromR: 8, fromC: 4, toR: 7, toC: 7, color: 'sky', label: 'King → Mino', dashed: true },
        ],
        keySquares: [
          { r: 7, c: 3, color: 'emerald', label: '4TH FILE' },
          { r: 7, c: 7, color: 'sky', label: 'MINO SANCTUARY' },
        ],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Swinging Rook Before Defending the 8th File (△8六歩 Breakthrough)',
      badMove: { type: 'move', fromR: 7, fromC: 7, toR: 7, toC: 3 },
      refutationMove: { fromR: 3, fromC: 7, toR: 4, toC: 7 },
      explanation:
        'If you swing your Rook to (7,3) immediately without closing the diagonal or lifting your Bishop to (6,2), Gote pushes down the 8th file and rips open your left camp before your King can castle.',
      arrows: [
        { fromR: 3, fromC: 7, toR: 4, toC: 7, color: 'rose', label: 'Unstoppable Push' },
        { fromR: 1, fromC: 1, toR: 7, toC: 1, color: 'rose', label: 'Rook Invasion', dashed: true },
      ],
      keySquares: [{ r: 7, c: 1, color: 'rose', label: 'UNDEFENDED' }],
    },
  },
  {
    id: 'opener-chu12-lion-activation',
    phase: 'openers',
    scale: 'chu12',
    title: '04. Chū Shōgi 12×12 Opening: Go-Between Push & Central Lion Activation',
    kanji: '中将棋序盤・仲人前進と中央獅子展開',
    proverb: {
      jp: '獅子は中央に据えて睨みを利かせよ',
      romaji: 'Shishi wa chūō ni suete nirami o kikaseyo',
      en: 'Anchor the Lion in the center where its 2-square aura dominates both wings.',
    },
    championBotId: 'bot-07',
    strategicOverview:
      'In 12×12 Chū Shōgi, the Lion [LN] starts at (9,6) behind the Pawn wall, while two Go-Betweens [GB] stand in front of the Pawns at row 7. Advancing the central Pawn or leaping the Lion into row 7 unlocks a 24-square zone of control.',
    winPlanSummary:
      'Advance the central Go-Between [GB] to probe Gote’s line, then leap your Lion [LN] over the Pawn wall into the central command post at (7,6).',
    pieces: [
      { r: 0, c: 6, code: 'K', owner: 'gote' },
      { r: 2, c: 5, code: 'LN', owner: 'gote' },
      { r: 3, c: 5, code: 'P', owner: 'gote' },
      { r: 3, c: 6, code: 'P', owner: 'gote' },
      { r: 4, c: 3, code: 'GB', owner: 'gote' },
      { r: 7, c: 3, code: 'GB', owner: 'sente' },
      { r: 8, c: 5, code: 'P', owner: 'sente' },
      { r: 8, c: 6, code: 'P', owner: 'sente' },
      { r: 9, c: 6, code: 'LN', owner: 'sente' },
      { r: 10, c: 5, code: 'KR', owner: 'sente' },
      { r: 10, c: 7, code: 'PH', owner: 'sente' },
      { r: 11, c: 5, code: 'DE', owner: 'sente' },
      { r: 11, c: 6, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Advance the Vanguard Go-Between (▲9四仲人)',
        type: 'move',
        fromR: 7,
        fromC: 3,
        toR: 6,
        toC: 3,
        coachCommentary:
          'Step your Go-Between [GB] forward from (7,3) to (6,3). Go-Betweens act as early reconnaissance shields on the 12×12 board.',
        arrows: [{ fromR: 7, fromC: 3, toR: 6, toC: 3, color: 'emerald', label: '1. Advance [GB]' }],
        keySquares: [{ r: 6, c: 3, color: 'emerald', label: 'SCOUT' }],
        opponentReply: {
          fromR: 4,
          fromC: 3,
          toR: 5,
          toC: 3,
          replyNote: 'Gote advances △9六仲人 (4,3→5,3) to contest the left flank.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Vault the Lion Over the Pawn Wall (▲6八獅子)',
        type: 'move',
        fromR: 9,
        fromC: 6,
        toR: 7,
        toC: 6,
        coachCommentary:
          'Use the Lion’s 2-square jump to leap directly over your Pawn at (8,6) onto (7,6)! Your Lion now projects power across the center without needing to waste turns pushing Pawns first.',
        arrows: [
          { fromR: 9, fromC: 6, toR: 7, toC: 6, color: 'emerald', label: '2. Lion Vault!' },
          { fromR: 7, fromC: 6, toR: 5, toC: 6, color: 'sky', label: '2-Sq Aura', dashed: true },
        ],
        keySquares: [{ r: 7, c: 6, color: 'emerald', label: 'LION POST' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Jumping Lion Into an Unguarded Trade Square',
      badMove: { type: 'move', fromR: 9, fromC: 6, toR: 7, toC: 5 },
      refutationMove: { fromR: 2, fromC: 5, toR: 4, toC: 5 },
      explanation:
        'If you jump your Lion onto the 7th file (7,5) without Kirin/Phoenix cover, Gote’s Lion at (2,5) leaps to (4,5) and pins your central pawn structure.',
      arrows: [{ fromR: 2, fromC: 5, toR: 4, toC: 5, color: 'rose', label: 'Counter-Post' }],
      keySquares: [{ r: 4, c: 5, color: 'rose', label: 'ENEMY LION' }],
    },
  },
  {
    id: 'opener-war12-citadel-vanguard',
    phase: 'openers',
    scale: 'war12',
    title: '05. War-Budget 12×12 Opening: Wing Chariot & Star-Hunting Vanguard',
    kanji: '軍資金将棋序盤・飛車展開と昇格準備',
    proverb: {
      jp: '一星の差が王を生む',
      romaji: 'Issei no sa ga Ō o umu',
      en: 'A single Battle Star separates a humble Pawn from a future King.',
    },
    championBotId: 'bot-09',
    strategicOverview:
      'In War-Budget 12×12, your King [K] and Crown Prince [CP] sit inside the Locked Citadel on rank 12 while drafted units hunt for Battle Stars (★). Opening the wing files lets your drafted Tier-1 units score early captures or promotion-zone entries to evolve toward Tier 2/3/4.',
    winPlanSummary:
      'Push your right-flank Vanguard Pawn to open the promotion corridor, then slide your drafted Dragon King [DK] into the active central rank.',
    pieces: [
      { r: 0, c: 5, code: 'CP', owner: 'gote', citadelGuard: true },
      { r: 0, c: 6, code: 'K', owner: 'gote', citadelGuard: true },
      { r: 1, c: 5, code: 'G', owner: 'gote', citadelGuard: true },
      { r: 1, c: 6, code: 'G', owner: 'gote', citadelGuard: true },
      { r: 3, c: 8, code: 'P', owner: 'gote' },
      { r: 8, c: 8, code: 'P', owner: 'sente', stars: 0, tier: 1 },
      { r: 9, c: 7, code: 'DK', owner: 'sente', stars: 1, tier: 2 },
      { r: 9, c: 4, code: 'LN', owner: 'sente', stars: 2, tier: 3 },
      { r: 10, c: 5, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 10, c: 6, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 11, c: 5, code: 'CP', owner: 'sente', citadelGuard: true },
      { r: 11, c: 6, code: 'K', owner: 'sente', citadelGuard: true },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Advance Flank Pawn Toward the Star Zone',
        type: 'move',
        fromR: 8,
        fromC: 8,
        toR: 7,
        toC: 8,
        coachCommentary:
          'Advance your Pawn [P] from (8,8) to (7,8). In War-Budget 12×12, reaching the 4-rank enemy zone or making a capture grants ★1 and triggers branching evolution!',
        arrows: [{ fromR: 8, fromC: 8, toR: 7, toC: 8, color: 'emerald', label: '1. Push for ★' }],
        keySquares: [{ r: 3, c: 8, color: 'amber', label: 'STAR TARGET' }],
        opponentReply: {
          fromR: 3,
          fromC: 8,
          toR: 4,
          toC: 8,
          replyNote: 'Gote advances the opposing Pawn (3,8→4,8) to contest the file.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Deploy Drafted Dragon King to the 6th Rank',
        type: 'move',
        fromR: 9,
        fromC: 7,
        toR: 5,
        toC: 7,
        coachCommentary:
          'Slide your Dragon King [DK] from (9,7) up to (5,7), supporting the Pawn push and aiming at Gote’s Locked Citadel.',
        arrows: [
          { fromR: 9, fromC: 7, toR: 5, toC: 7, color: 'emerald', label: '2. Deploy [DK]' },
          { fromR: 5, fromC: 7, toR: 1, toC: 7, color: 'sky', label: 'Citadel Pressure', dashed: true },
        ],
        keySquares: [{ r: 5, c: 7, color: 'emerald', label: 'OUTPOST' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Overextending Drafted Lion Without Citadel Backup',
      badMove: { type: 'move', fromR: 9, fromC: 4, toR: 7, toC: 4 },
      refutationMove: { fromR: 3, fromC: 8, toR: 4, toC: 8 },
      explanation:
        'Moving your high-cost Lion randomly on the left wing leaves the right flank Pawn unsupported, delaying your Tier-2 evolution.',
      arrows: [{ fromR: 3, fromC: 8, toR: 4, toC: 8, color: 'rose', label: 'Lost Tempo' }],
      keySquares: [{ r: 8, c: 8, color: 'rose', label: 'STALLED' }],
    },
  },
  {
    id: 'opener-taikyoku36-sector-command',
    phase: 'openers',
    scale: 'taikyoku36',
    title: '06. Grand 36×36 Opening: Three-Sector Long-Range Highway Activation',
    kanji: '大局将棋序盤・三方面射線開放',
    proverb: {
      jp: '大局は飛車・大将の道を開け',
      romaji: 'Taikyoku wa Hisha-Taishō no michi o hirake',
      en: 'On the 36×36 board, open rays for your Great Generals and Hook Movers before moving steppers.',
    },
    championBotId: 'bot-18',
    strategicOverview:
      'With 804 pieces on a 1,296-square board and an adjustable per-turn commander clock, slow 1-square stepper moves waste precious turns. The winning Grand Taikyoku opening immediately activates Rank-Jumpers (Great General [GG]) and Hook Movers ([LO] Tengu, [HM] Hook Mover) across the central sector.',
    winPlanSummary:
      'Leap your Great General [GG] into the central command sector at (18,17), then pivot your Tengu [LO] onto the high diagonal to threaten Gote’s center.',
    pieces: [
      { r: 4, c: 17, code: 'K', owner: 'gote' },
      { r: 4, c: 18, code: 'CP', owner: 'gote' },
      { r: 10, c: 17, code: 'P', owner: 'gote' },
      { r: 12, c: 15, code: 'R', owner: 'gote' },
      { r: 24, c: 17, code: 'P', owner: 'sente' },
      { r: 26, c: 17, code: 'GG', owner: 'sente' },
      { r: 26, c: 15, code: 'LO', owner: 'sente' },
      { r: 30, c: 17, code: 'CP', owner: 'sente' },
      { r: 30, c: 18, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Vault Great General Over Vanguard Wall',
        type: 'move',
        fromR: 26,
        fromC: 17,
        toR: 18,
        toC: 17,
        coachCommentary:
          'Because the Great General [GG] is a Rank-Jumper, it leaps straight over your Pawn at (24,17) to seize the central meridian at (18,17) on Move 1!',
        arrows: [
          { fromR: 26, fromC: 17, toR: 18, toC: 17, color: 'emerald', label: '1. [GG] Leap!' },
          { fromR: 18, fromC: 17, toR: 4, toC: 17, color: 'sky', label: 'Direct Royal Ray', dashed: true },
        ],
        keySquares: [{ r: 18, c: 17, color: 'emerald', label: 'CENTER HUB' }],
        opponentReply: {
          fromR: 12,
          fromC: 15,
          toR: 16,
          toC: 15,
          replyNote: 'Gote slides a Rook down to (16,15) to contest the central sector.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Hook Tengu Around the Sector Flank',
        type: 'move',
        fromR: 26,
        fromC: 15,
        toR: 16,
        toC: 15,
        coachCommentary:
          'Use your Tengu [LO] at (26,15) to execute a 90° diagonal hook (via (21,10) → (16,15)) and capture Gote’s encroaching Rook in a single turn!',
        arrows: [
          { fromR: 26, fromC: 15, toR: 21, toC: 10, color: 'amber', label: 'Pivot', dashed: true },
          { fromR: 21, fromC: 10, toR: 16, toC: 15, color: 'emerald', label: '2. 90° Hook Kill!' },
        ],
        keySquares: [{ r: 16, c: 15, color: 'emerald', label: 'CAPTURED' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Crawling 1 Square at a Time in 36×36',
      badMove: { type: 'move', fromR: 24, fromC: 17, toR: 23, toC: 17 },
      refutationMove: { fromR: 12, fromC: 15, toR: 24, toC: 15 },
      explanation:
        'Pushing a single Pawn 1 square while Gote activates long-range sliders lets Gote invade your home sector 12 ranks deep on the very next turn.',
      arrows: [{ fromR: 12, fromC: 15, toR: 24, toC: 15, color: 'rose', label: '12-Sq Invasion!' }],
      keySquares: [{ r: 24, c: 15, color: 'rose', label: 'BREACHED' }],
    },
  },

  // ==========================================================================
  // PHASE 2: CASTLING & FORTRESSES (囲い・堅陣)
  // ==========================================================================
  {
    id: 'castle-shogi9-yagura',
    phase: 'castling',
    scale: 'shogi9',
    title: '07. Yagura Castle (矢倉囲い): Complete 3-Step Fortress Assembly',
    kanji: '相居飛車の王道・金矢倉完成手順',
    proverb: {
      jp: '矢倉は将棋の純文学',
      romaji: 'Yagura wa Shōgi no junbungaku',
      en: 'The Yagura castle is the classical literature of Shōgi—impenetrable from above.',
    },
    championBotId: 'bot-04',
    strategicOverview:
      'In Double Static Rook games, the opponent’s Rook attacks straight down your left wing (8th file / col 1). The Yagura Castle builds a double-layered roof of Silver at (6,2) and two Golds at (6,3) and (7,2) before tucking the King safely into the (7,1) sanctuary [8八玉].',
    winPlanSummary:
      'Step 1: Lift the left Gold to (6,3) to seal the roof. Step 2: Slide the right Gold to (7,2) to link the wall. Step 3: Enter the Yagura sanctuary with your King at (7,1)!',
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 2, c: 1, code: 'P', owner: 'gote' },
      { r: 2, c: 3, code: 'S', owner: 'gote' },
      { r: 5, c: 1, code: 'P', owner: 'sente' },
      { r: 5, c: 2, code: 'P', owner: 'sente' },
      { r: 5, c: 3, code: 'P', owner: 'sente' },
      { r: 6, c: 1, code: 'B', owner: 'sente' },
      { r: 6, c: 2, code: 'S', owner: 'sente' },
      { r: 7, c: 3, code: 'G', owner: 'sente' },
      { r: 8, c: 3, code: 'G', owner: 'sente' },
      { r: 7, c: 2, code: 'K', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 8, c: 0, code: 'L', owner: 'sente' },
      { r: 8, c: 1, code: 'N', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Raise the Gold Roof (▲6七金)',
        type: 'move',
        fromR: 7,
        fromC: 3,
        toR: 6,
        toC: 3,
        coachCommentary:
          'Move your Gold General [G] from (7,3) up to (6,3) [▲6七金]. Side-by-side with your Silver at (6,2), this forms the famous Yagura turret roof against vertical Rook attacks.',
        arrows: [
          { fromR: 7, fromC: 3, toR: 6, toC: 3, color: 'emerald', label: '1. ▲6七金 Roof' },
          { fromR: 6, fromC: 2, toR: 6, toC: 3, color: 'sky', label: 'S+G Wall', dashed: true },
        ],
        keySquares: [
          { r: 6, c: 2, color: 'sky', label: 'SILVER' },
          { r: 6, c: 3, color: 'emerald', label: 'GOLD ROOF' },
        ],
        opponentReply: {
          fromR: 2,
          fromC: 1,
          toR: 3,
          toC: 1,
          replyNote: 'Gote advances the 8th-file Pawn (2,1→3,1) preparing a vertical attack.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Pull the Bishop Back to Clear the Sanctuary (▲7九角)',
        type: 'move',
        fromR: 6,
        fromC: 1,
        toR: 8,
        toC: 2,
        coachCommentary:
          'Pull your Bishop [B] back along the diagonal from (6,1) to (8,2) [▲7九角]. This vacates the (7,1) square for your King while aiming your Bishop across at Gote’s right flank!',
        arrows: [{ fromR: 6, fromC: 1, toR: 8, toC: 2, color: 'emerald', label: '2. ▲7九角 Pullback' }],
        keySquares: [{ r: 7, c: 1, color: 'sky', label: 'VACATED' }],
        opponentReply: {
          fromR: 2,
          fromC: 3,
          toR: 3,
          toC: 2,
          replyNote: 'Gote develops Silver to (3,2).',
        },
      },
      {
        stepNumber: 3,
        title: 'Step 3: Enter the Yagura Sanctuary (▲8八玉 — Yagura Complete!)',
        type: 'move',
        fromR: 7,
        fromC: 2,
        toR: 7,
        toC: 1,
        coachCommentary:
          'Step your King [K] from (7,2) into (7,1) [▲8八玉]! Your King is now completely sheltered beneath the interlocking Silver-Gold roof.',
        arrows: [{ fromR: 7, fromC: 2, toR: 7, toC: 1, color: 'emerald', label: '3. ▲8八玉 Enter!' }],
        keySquares: [{ r: 7, c: 1, color: 'emerald', label: 'YAGURA 8八' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Entering the Castle Before Raising the Gold Roof ("Wall-Less King")',
      badMove: { type: 'move', fromR: 6, fromC: 2, toR: 5, toC: 3 },
      refutationMove: { fromR: 2, fromC: 1, toR: 3, toC: 1 },
      explanation:
        'If your Silver wanders away from (6,2), the roof collapses and Gote’s Rook on the 8th file blasts straight down onto your King’s head.',
      arrows: [{ fromR: 1, fromC: 1, toR: 7, toC: 1, color: 'rose', label: '8th File Breach!' }],
      keySquares: [{ r: 6, c: 2, color: 'rose', label: 'HOLE IN ROOF' }],
    },
  },
  {
    id: 'castle-shogi9-mino-evolution',
    phase: 'castling',
    scale: 'shogi9',
    title: '08. Mino → High Mino Castle (美濃囲い〜高美濃): Ranging Rook Shield',
    kanji: '振り飛車の守護神・本美濃から高美濃へ',
    proverb: {
      jp: '玉の囲いは金銀三枚',
      romaji: 'Gyoku no kakoi wa kingin sanmai',
      en: 'Always surround your King with three Generals—one Silver and two Golds.',
    },
    championBotId: 'bot-17',
    strategicOverview:
      'Because Ranging Rook trades or opens files on the left half of the board, the battle becomes a horizontal Rook fight. Mino Castle places the King at (7,7) [2八玉] shielded laterally by a Silver at (7,6) and two linked Golds at (8,5) and (7,5), then upgrades into High Mino (Takamino) at (6,5).',
    winPlanSummary:
      'Step 1: Tuck the King into (7,7). Step 2: Lift the right Silver to (7,6) to complete Hon-Mino. Step 3: Advance the left Gold to (6,5) to form Takamino (High Mino)!',
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 2, c: 4, code: 'P', owner: 'gote' },
      { r: 6, c: 5, code: 'P', owner: 'sente' },
      { r: 6, c: 6, code: 'P', owner: 'sente' },
      { r: 6, c: 7, code: 'P', owner: 'sente' },
      { r: 5, c: 4, code: 'P', owner: 'sente' },
      { r: 7, c: 3, code: 'R', owner: 'sente' },
      { r: 7, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 4, code: 'G', owner: 'sente' },
      { r: 7, c: 6, code: 'K', owner: 'sente' },
      { r: 8, c: 6, code: 'S', owner: 'sente' },
      { r: 8, c: 7, code: 'N', owner: 'sente' },
      { r: 8, c: 8, code: 'L', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Slide King to the Mino Throne (▲2八玉)',
        type: 'move',
        fromR: 7,
        fromC: 6,
        toR: 7,
        toC: 7,
        coachCommentary:
          'Slide your King [K] from (7,6) to (7,7) [▲2八玉]. On (7,7), the King is far away from the central Rook battleground.',
        arrows: [{ fromR: 7, fromC: 6, toR: 7, toC: 7, color: 'emerald', label: '1. ▲2八玉' }],
        keySquares: [{ r: 7, c: 7, color: 'emerald', label: 'THRONE 2八' }],
        opponentReply: {
          fromR: 2,
          fromC: 4,
          toR: 3,
          toC: 4,
          replyNote: 'Gote advances the central Pawn (2,4→3,4).',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Lock the Silver Wall (▲3八銀 — Hon-Mino Complete!)',
        type: 'move',
        fromR: 8,
        fromC: 6,
        toR: 7,
        toC: 6,
        coachCommentary:
          'Step your Silver General [S] from (8,6) up to (7,6) [▲3八銀]. Together with the Golds at (7,5) and (8,4), your King now resists any side-rank Dragon King invasion!',
        arrows: [
          { fromR: 8, fromC: 6, toR: 7, toC: 6, color: 'emerald', label: '2. ▲3八銀 Lock' },
          { fromR: 7, fromC: 5, toR: 7, toC: 7, color: 'sky', label: 'Lateral Shield', dashed: true },
        ],
        keySquares: [{ r: 7, c: 6, color: 'emerald', label: 'SILVER WALL' }],
        opponentReply: {
          fromR: 0,
          fromC: 4,
          toR: 1,
          toC: 3,
          replyNote: 'Gote castles the King to (1,3).',
        },
      },
      {
        stepNumber: 3,
        title: 'Step 3: Evolve into High Mino (▲4七金 — Takamino!)',
        type: 'move',
        fromR: 7,
        fromC: 5,
        toR: 6,
        toC: 4,
        coachCommentary:
          'Advance your left Gold from (7,5) to (6,4) [▲5七金/4七金]! High Mino adds top-down thickness and prepares to develop the right Knight.',
        arrows: [{ fromR: 7, fromC: 5, toR: 6, toC: 4, color: 'emerald', label: '3. Takamino Upgrade' }],
        keySquares: [{ r: 6, c: 4, color: 'emerald', label: 'HIGH GOLD' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Leaving the King on the 4th/3rd File (Sitting Duck King)',
      badMove: { type: 'move', fromR: 8, fromC: 6, toR: 7, toC: 5 },
      refutationMove: { fromR: 1, fromC: 1, toR: 7, toC: 1 },
      explanation:
        'If you move the Silver before sliding the King all the way to (7,7), the Silver blocks the King’s doorway (Koban-ishi), trapping your King near the center.',
      arrows: [{ fromR: 7, fromC: 6, toR: 7, toC: 7, color: 'rose', label: 'Door Blocked!' }],
      keySquares: [{ r: 7, c: 6, color: 'rose', label: 'TRAPPED KING' }],
    },
  },
  {
    id: 'castle-shogi9-anaguma',
    phase: 'castling',
    scale: 'shogi9',
    title: '09. Anaguma Castle (穴熊囲い): Bear-in-the-Hole Ultimate Bunker',
    kanji: '現代将棋の最強堅陣・穴熊完成手順',
    proverb: {
      jp: '穴熊に組めば王手がかからない',
      romaji: 'Anaguma ni kumeba ōte ga kakaranai',
      en: 'Once sealed in the Bear-in-the-Hole corner, the King cannot be checked from afar.',
    },
    championBotId: 'bot-10',
    strategicOverview:
      'Anaguma (Bear-in-the-Hole) lifts the edge Lance at (8,8) up to (7,8) so the King can crawl into the extreme corner square (8,8) [1九玉]. Then the Silver drops onto (7,7) and two Golds clamp onto (7,6) and (8,6). Because no Knight can check (8,8) and three Generals wrap the corner, Sente can attack all-out in the endgame.',
    winPlanSummary:
      'Step 1: Lift the right Lance from (8,8) to (7,8). Step 2: Tuck the King into the extreme corner (8,8) [▲1九玉]. Step 3: Seal the hatch with Silver at (7,7) [▲2八銀]!',
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 2, c: 4, code: 'P', owner: 'gote' },
      { r: 6, c: 6, code: 'P', owner: 'sente' },
      { r: 6, c: 7, code: 'P', owner: 'sente' },
      { r: 5, c: 8, code: 'P', owner: 'sente' },
      { r: 7, c: 3, code: 'R', owner: 'sente' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 8, c: 8, code: 'L', owner: 'sente' },
      { r: 8, c: 6, code: 'S', owner: 'sente' },
      { r: 7, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 5, code: 'G', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Open the Corner Burrow with Lance (▲1八香)',
        type: 'move',
        fromR: 8,
        fromC: 8,
        toR: 7,
        toC: 8,
        coachCommentary:
          'Advance your right Incense Chariot [L] 1 square from (8,8) to (7,8) [▲1八香] to vacate the corner burrow for your King.',
        arrows: [{ fromR: 8, fromC: 8, toR: 7, toC: 8, color: 'emerald', label: '1. ▲1八香 Open' }],
        keySquares: [{ r: 8, c: 8, color: 'sky', label: 'BURROW 1九' }],
        opponentReply: {
          fromR: 2,
          fromC: 4,
          toR: 3,
          toC: 4,
          replyNote: 'Gote pushes △5四歩 (2,4→3,4).',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Enter the Bear’s Den (▲1九玉)',
        type: 'move',
        fromR: 7,
        fromC: 7,
        toR: 8,
        toC: 8,
        coachCommentary:
          'Step your King [K] diagonally from (7,7) into the corner square (8,8) [▲1九玉]!',
        arrows: [{ fromR: 7, fromC: 7, toR: 8, toC: 8, color: 'emerald', label: '2. ▲1九玉 Den!' }],
        keySquares: [{ r: 8, c: 8, color: 'emerald', label: 'ANAGUMA 1九' }],
        opponentReply: {
          fromR: 0,
          fromC: 4,
          toR: 1,
          toC: 3,
          replyNote: 'Gote moves the King to (1,3).',
        },
      },
      {
        stepNumber: 3,
        title: 'Step 3: Seal the Vault Door with Silver (▲2八銀)',
        type: 'move',
        fromR: 8,
        fromC: 6,
        toR: 7,
        toC: 7,
        coachCommentary:
          'Step your Silver General [S] from (8,6) to (7,7) [▲2八銀], sealing the diagonal hatch over your King! Your Anaguma fortress is now rock-solid.',
        arrows: [
          { fromR: 8, fromC: 6, toR: 7, toC: 7, color: 'emerald', label: '3. ▲2八銀 Seal!' },
          { fromR: 7, fromC: 5, toR: 7, toC: 6, color: 'sky', label: 'Next: Gold Clamp', dashed: true },
        ],
        keySquares: [{ r: 7, c: 7, color: 'emerald', label: 'VAULT HATCH' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Leaving the Diagonal Open After Lifting the Lance',
      badMove: { type: 'move', fromR: 8, fromC: 5, toR: 7, toC: 6 },
      refutationMove: { fromR: 1, fromC: 1, toR: 7, toC: 1 },
      explanation:
        'Delaying the King’s entry after lifting the Lance leaves your King exposed at (7,7) with its escape square blocked by the Lance at (7,8)!',
      arrows: [{ fromR: 1, fromC: 1, toR: 7, toC: 1, color: 'rose', label: 'Diagonal Exposed!' }],
      keySquares: [{ r: 7, c: 7, color: 'rose', label: 'EXPOSED KING' }],
    },
  },
  {
    id: 'castle-chu12-royal-aegis',
    phase: 'castling',
    scale: 'chu12',
    title: '10. Chū Shōgi & Grand Taikyoku Castle: Dual-Royal & Kirin-Phoenix Citadel',
    kanji: '大将棋・中将棋本陣（二玉・麒麟鳳凰守護陣）',
    proverb: {
      jp: '酔象を成れば二玉不落',
      romaji: 'Suizō o nareba nigyoku furaku',
      en: 'Promote the Drunken Elephant into a Crown Prince and your twin Royals become unsinkable.',
    },
    championBotId: 'bot-15',
    strategicOverview:
      'In 12×12 Chū Shōgi and 36×36 Taikyoku Shōgi, there are no piece drops—meaning castles must defend against Leapers (Lions, Kirins) and Rank-Jumpers rather than parachute drops. Surrounding the King [K] with Golds while positioning the Kirin [KR] and Phoenix [PH] on adjacent squares creates an anti-Lion kill-zone.',
    winPlanSummary:
      'Step 1: Tuck the Gold General onto (10,6) directly in front of the King. Step 2: Position the Kirin [KR] at (9,5) to project a 2-square orthogonal anti-Lion net.',
    pieces: [
      { r: 0, c: 6, code: 'K', owner: 'gote' },
      { r: 3, c: 6, code: 'LN', owner: 'gote' },
      { r: 4, c: 4, code: 'Q', owner: 'gote' },
      { r: 10, c: 5, code: 'KR', owner: 'sente' },
      { r: 10, c: 7, code: 'PH', owner: 'sente' },
      { r: 11, c: 4, code: 'G', owner: 'sente' },
      { r: 11, c: 5, code: 'DE', owner: 'sente' },
      { r: 11, c: 6, code: 'K', owner: 'sente' },
      { r: 11, c: 7, code: 'G', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Raise the Central Gold Shield',
        type: 'move',
        fromR: 11,
        fromC: 7,
        toR: 10,
        toC: 6,
        coachCommentary:
          'Step your Gold General [G] from (11,7) to (10,6), sealing the file directly in front of your King [K] at (11,6).',
        arrows: [{ fromR: 11, fromC: 7, toR: 10, toC: 6, color: 'emerald', label: '1. Shield [K]' }],
        keySquares: [{ r: 10, c: 6, color: 'emerald', label: 'ROYAL SHIELD' }],
        opponentReply: {
          fromR: 4,
          fromC: 4,
          toR: 5,
          toC: 5,
          replyNote: 'Gote slides the Free King [Q] to (5,5) aiming toward your camp.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Anchor the Kirin Anti-Lion Net',
        type: 'move',
        fromR: 10,
        fromC: 5,
        toR: 9,
        toC: 5,
        coachCommentary:
          'Step your Kirin [KR] from (10,5) diagonally to (9,5) or orthogonally to guard the 2-square jump squares around your King and Drunken Elephant!',
        arrows: [
          { fromR: 10, fromC: 5, toR: 9, toC: 4, color: 'sky', label: 'Diagonal Cover', dashed: true },
          { fromR: 11, fromC: 5, toR: 9, toC: 5, color: 'emerald', label: '2. Advance [DE] Escort' },
        ],
        keySquares: [{ r: 11, c: 5, color: 'amber', label: 'HEIR [DE]' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Exposing the King File to a Lion Jump',
      badMove: { type: 'move', fromR: 10, fromC: 5, toR: 8, toC: 5 },
      refutationMove: { fromR: 3, fromC: 6, toR: 5, toC: 6 },
      explanation:
        'Jumping the Kirin away from the King before sealing (10,6) leaves the central file wide open for Gote’s Lion and Free King battery.',
      arrows: [{ fromR: 3, fromC: 6, toR: 5, toC: 6, color: 'rose', label: 'Lion Invasion!' }],
      keySquares: [{ r: 10, c: 6, color: 'rose', label: 'UNSHIELDED' }],
    },
  },

  // ==========================================================================
  // PHASE 3: MID-GAME STRATEGY & SABAKI (中盤・捌き)
  // ==========================================================================
  {
    id: 'midgame-shogi9-bogin',
    phase: 'midgame',
    scale: 'shogi9',
    title: '11. Climbing Silver (棒銀 Bōgin): Smashing the Opponent’s Bishop Head',
    kanji: '居飛車急戦・棒銀突破の手筋',
    proverb: {
      jp: '角頭は丸い・棒銀は飛車先と協力せよ',
      romaji: 'Kakutō wa marui',
      en: 'The Bishop’s head is rounded (blind straight ahead)—coordinate Silver and Rook to smash it.',
    },
    championBotId: 'bot-14',
    strategicOverview:
      'Because a Bishop [B] cannot move straight forward, the square directly in front of Gote’s Bishop at (2,7) is a natural blind spot. In the Climbing Silver (Bōgin) attack, Sente marches the right Silver [S] all the way up to the 5th rank alongside the Rook [R], then sacrifices the 2nd-file Pawn to rip open the file.',
    winPlanSummary:
      'Step 1: Climb your Silver from (5,7) to (4,6) threatening (3,7). Step 2: Sacrifice or push the Rook Pawn to (3,7) so your Silver and Rook overwhelm Gote’s defense!',
    pieces: [
      { r: 0, c: 3, code: 'K', owner: 'gote' },
      { r: 1, c: 7, code: 'B', owner: 'gote' },
      { r: 2, c: 6, code: 'S', owner: 'gote' },
      { r: 2, c: 7, code: 'P', owner: 'gote' },
      { r: 3, c: 6, code: 'P', owner: 'gote' },
      { r: 4, c: 7, code: 'P', owner: 'sente' },
      { r: 5, c: 7, code: 'S', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 7, c: 1, code: 'K', owner: 'sente' },
      { r: 7, c: 2, code: 'G', owner: 'sente' },
    ],
    senteHand: ['P'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Advance the Climbing Silver (▲3五銀 / ▲2五銀)',
        type: 'move',
        fromR: 5,
        fromC: 7,
        toR: 4,
        toC: 6,
        coachCommentary:
          'Step your Silver General [S] diagonally from (5,7) to (4,6)! Now both your Silver at (4,6) and your Pawn at (4,7) + Rook at (7,7) converge on the key breakthrough square (3,7) [2四].',
        arrows: [
          { fromR: 5, fromC: 7, toR: 4, toC: 6, color: 'emerald', label: '1. Climb Silver' },
          { fromR: 4, fromC: 6, toR: 3, toC: 7, color: 'sky', label: 'Double Attack on 2四', dashed: true },
          { fromR: 7, fromC: 7, toR: 3, toC: 7, color: 'amber', label: 'Rook X-Ray', dashed: true },
        ],
        keySquares: [{ r: 3, c: 7, color: 'emerald', label: 'BREAKPOINT 2四' }],
        opponentReply: {
          fromR: 2,
          fromC: 7,
          toR: 3,
          toC: 7,
          replyNote: 'Gote pushes △2四歩 (2,7→3,7) trying to block the 2nd file.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Capture on the Breakthrough Square (▲2四歩 / ▲同銀)',
        type: 'move',
        fromR: 4,
        fromC: 7,
        toR: 3,
        toC: 7,
        coachCommentary:
          'Capture Gote’s Pawn at (3,7) with your Vanguard Pawn from (4,7)! Even if Gote recaptures with Silver, your Silver at (4,6) and Rook at (7,7) crash straight into the promotion zone.',
        arrows: [
          { fromR: 4, fromC: 7, toR: 3, toC: 7, color: 'emerald', label: '2. Smash 2四!' },
          { fromR: 4, fromC: 6, toR: 3, toC: 7, color: 'sky', label: 'Silver Follow-Up', dashed: true },
        ],
        keySquares: [{ r: 2, c: 7, color: 'rose', label: 'PROMO ZONE' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Retreating the Silver Instead of Pressing 2四',
      badMove: { type: 'move', fromR: 5, fromC: 7, toR: 6, toC: 6 },
      refutationMove: { fromR: 3, fromC: 6, toR: 4, toC: 6 },
      explanation:
        'If you retreat your Silver to (6,6), Gote pushes △3五歩 (3,6→4,6) and completely shuts down your Climbing Silver attack forever.',
      arrows: [{ fromR: 3, fromC: 6, toR: 4, toC: 6, color: 'rose', label: 'Silver Locked Out!' }],
      keySquares: [{ r: 4, c: 6, color: 'rose', label: 'BLOCKED' }],
    },
  },
  {
    id: 'midgame-shogi9-hashizeme',
    phase: 'midgame',
    scale: 'shogi9',
    title: '12. Spear the Sparrow (雀刺し Hashizeme): 1st-File Edge Piercing Battery',
    kanji: '端攻め・雀刺しと桂香ロケット',
    proverb: {
      jp: '端玉には端歩・桂馬の高跳び歩の餌食に注意',
      romaji: 'Hashigyoku ni wa hashifu',
      en: 'Against a cornered King, stack Lance, Knight, and Rook on the 1st file to pierce the edge.',
    },
    championBotId: 'bot-05',
    strategicOverview:
      'When Gote castles into Yagura or Anaguma near the edge file, the 1st file (col 8) becomes the shortest path to the King. Stacking your Lance [L] at (6,8), Rook [R] at (7,8), and Knight [N] at (6,7) creates a "Spear the Sparrow" triple battery that overwhelms Gote’s corner Lance.',
    winPlanSummary:
      'Step 1: Sacrifice the 1st-file Pawn at (3,8) to strip Gote’s edge pawn cover. Step 2: Leap the Knight to (4,7) or drop a dangling Pawn at (2,8) to shatter the corner!',
    pieces: [
      { r: 0, c: 7, code: 'K', owner: 'gote' },
      { r: 0, c: 8, code: 'L', owner: 'gote' },
      { r: 1, c: 6, code: 'G', owner: 'gote' },
      { r: 1, c: 7, code: 'S', owner: 'gote' },
      { r: 2, c: 8, code: 'P', owner: 'gote' },
      { r: 3, c: 8, code: 'P', owner: 'sente' },
      { r: 6, c: 7, code: 'N', owner: 'sente' },
      { r: 6, c: 8, code: 'L', owner: 'sente' },
      { r: 7, c: 8, code: 'R', owner: 'sente' },
      { r: 8, c: 2, code: 'K', owner: 'sente' },
    ],
    senteHand: ['P'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Strike the Edge Pawn (▲1四歩 / ▲1三歩成)',
        type: 'move',
        fromR: 3,
        fromC: 8,
        toR: 2,
        toC: 8,
        promote: true,
        coachCommentary:
          'Capture Gote’s edge Pawn at (2,8) and promote to a Tokin [▲1三歩成]! Gote’s Lance at (0,8) is forced to recapture because the King at (0,7) is right next door.',
        arrows: [
          { fromR: 3, fromC: 8, toR: 2, toC: 8, color: 'emerald', label: '1. Edge Strike!' },
          { fromR: 6, fromC: 8, toR: 0, toC: 8, color: 'amber', label: 'L+R Rocket', dashed: true },
        ],
        keySquares: [{ r: 2, c: 8, color: 'emerald', label: 'PIERCE 1三' }],
        opponentReply: {
          fromR: 0,
          fromC: 8,
          toR: 2,
          toC: 8,
          replyNote: 'Gote’s Lance is dragged down from (0,8) to (2,8) to recapture.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Unleash the Lance Spearhead (▲1三同香成)',
        type: 'move',
        fromR: 6,
        fromC: 8,
        toR: 2,
        toC: 8,
        promote: true,
        coachCommentary:
          'Slide your Lance [L] from (6,8) up to (2,8) backed by your Rook at (7,8) to destroy Gote’s Lance and break directly into the castle corner!',
        arrows: [
          { fromR: 6, fromC: 8, toR: 2, toC: 8, color: 'emerald', label: '2. ▲1三香成!' },
          { fromR: 7, fromC: 8, toR: 0, toC: 8, color: 'sky', label: 'Rook Backing', dashed: true },
        ],
        keySquares: [{ r: 0, c: 7, color: 'rose', label: 'CORNER KING' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Jumping the Knight Before Stripping the Edge Pawn ("High-Jumping Knight")',
      badMove: { type: 'move', fromR: 6, fromC: 7, toR: 4, toC: 6 },
      refutationMove: { fromR: 1, fromC: 6, toR: 2, toC: 6 },
      explanation:
        'As the proverb warns ("A high-jumping Knight is prey for a Pawn"), jumping your Knight to (4,6) before breaking the edge allows Gote’s Gold or Pawn to trap and capture your Knight for free.',
      arrows: [{ fromR: 1, fromC: 6, toR: 2, toC: 6, color: 'rose', label: 'Knight Trapped!' }],
      keySquares: [{ r: 4, c: 6, color: 'rose', label: 'TRAPPED [N]' }],
    },
  },
  {
    id: 'midgame-chu12-lion-igui-senjo',
    phase: 'midgame',
    scale: 'chu12',
    title: '13. Chū Shōgi Mid-Game: Raiden’s Lion Igui & Senjō-Jishi Counter-Ban',
    kanji: '中将棋中盤・獅子の居食いと先手獅子（獅子交換禁手）',
    proverb: {
      jp: '居食いで歩を掠め取り、隣獅子は命取り',
      romaji: 'Igui de fu o kasumetori, tonari-jishi wa inochitori',
      en: 'Use Igui to graze on defended pawns for free, and never step adjacent to an enemy Lion.',
    },
    championBotId: 'bot-08',
    strategicOverview:
      'The heart of 12×12 Chū Shōgi mid-game play is the Lion [LN] duel. Using Igui (stationary capture), your Lion can eat an adjacent enemy piece at (5,6) and immediately step back to (6,6) on the same turn—staying outside the enemy Rook’s line of fire and outside the enemy Lion’s 2-square range!',
    winPlanSummary:
      'Use your Lion [LN] at (6,6) to capture Gote’s Gold General at (5,6) on Step 1, then click (6,6) on Step 2 to return home via Igui.',
    pieces: [
      { r: 0, c: 6, code: 'K', owner: 'gote' },
      { r: 2, c: 6, code: 'R', owner: 'gote' },
      { r: 3, c: 5, code: 'LN', owner: 'gote' },
      { r: 5, c: 6, code: 'G', owner: 'gote' },
      { r: 6, c: 6, code: 'LN', owner: 'sente' },
      { r: 7, c: 5, code: 'KR', owner: 'sente' },
      { r: 11, c: 6, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Execute Hit-and-Run Igui Capture (6六獅子→6五金→6六帰還)',
        type: 'move',
        fromR: 6,
        fromC: 6,
        toR: 5,
        toC: 6,
        secondToR: 6,
        secondToC: 6,
        coachCommentary:
          'Step your Lion [LN] from (6,6) to (5,6) to capture Gote’s Gold General, and immediately use its 2nd step to return to (6,6) [Igui]! You win a Gold General for free while staying out of reach of Gote’s Lion at (3,5) and Rook at (2,6)!',
        arrows: [
          { fromR: 6, fromC: 6, toR: 5, toC: 6, color: 'emerald', label: '1a. Bite [G]' },
          { fromR: 5, fromC: 6, toR: 6, toC: 6, color: 'amber', label: '1b. Return (Igui!)' },
          { fromR: 3, fromC: 5, toR: 5, toC: 6, color: 'rose', label: 'Enemy Lion Zone', dashed: true },
        ],
        keySquares: [
          { r: 5, c: 6, color: 'rose', label: 'DANGER ZONE' },
          { r: 6, c: 6, color: 'emerald', label: 'SAFE HAVEN' },
        ],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Staying on (5,6) Without Returning (Losing Your Lion!)',
      badMove: { type: 'move', fromR: 6, fromC: 6, toR: 4, toC: 6 },
      refutationMove: { fromR: 3, fromC: 5, toR: 4, toC: 6 },
      explanation:
        'If you jump your Lion to (4,6) or stay on (5,6) without returning via Igui, your Lion ends its turn inside the 2-square radius of Gote’s Lion at (3,5), allowing Gote to capture your Lion outright!',
      arrows: [{ fromR: 3, fromC: 5, toR: 4, toC: 6, color: 'rose', label: 'Lion Slain!' }],
      keySquares: [{ r: 4, c: 6, color: 'rose', label: 'FATAL SQUARE' }],
    },
  },
  {
    id: 'midgame-war12-parachute-evolution',
    phase: 'midgame',
    scale: 'war12',
    title: '14. War-Budget 12×12 Mid-Game: Once-Only Parachute Drop & Tier-4 Royal Ascension',
    kanji: '軍資金将棋中盤・一度限りの空挺打と四段階昇格',
    proverb: {
      jp: '空挺は自陣の盾と槍、再捕獲は永久追放',
      romaji: 'Kūtei wa jijin no tate to yari',
      en: 'A Parachute Drop is a one-time shield or spear on your own half; if recaptured, it banishes forever.',
    },
    championBotId: 'bot-13',
    strategicOverview:
      'In War-Budget 12×12, captured pieces can be dropped once onto your own half of the board (rows 6–11 for Sente) as Parachute units. Meanwhile, units on the board earn Battle Stars (★) from captures and zone entries to evolve all the way up to Tier 4 (King [K] or Crown Prince [CP]).',
    winPlanSummary:
      'Step 1: Parachute-drop your reserve Rook [R] onto (6,4) on your half of the board to pin Gote’s file. Step 2: Capture Gote’s Dragon Horse at (3,5) with your ★2 Lion to trigger Tier-4 Royal Ascension!',
    pieces: [
      { r: 0, c: 5, code: 'CP', owner: 'gote', citadelGuard: true },
      { r: 0, c: 6, code: 'K', owner: 'gote', citadelGuard: true },
      { r: 2, c: 4, code: 'S', owner: 'gote' },
      { r: 3, c: 5, code: 'DH', owner: 'gote' },
      { r: 5, c: 5, code: 'LN', owner: 'sente', stars: 2, tier: 3 },
      { r: 10, c: 5, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 10, c: 6, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 11, c: 5, code: 'CP', owner: 'sente', citadelGuard: true },
      { r: 11, c: 6, code: 'K', owner: 'sente', citadelGuard: true },
    ],
    senteHand: ['R'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Deploy Once-Only Parachute Rook on Row 6',
        type: 'drop',
        dropCode: 'R',
        toR: 6,
        toC: 4,
        coachCommentary:
          'Drop your reserve Rook [R] from hand onto (6,4)—the frontline rank of your own half! It enters with the Parachute flag (if recaptured later, it banishes rather than recycling endlessly).',
        arrows: [
          { fromR: 6, fromC: 4, toR: 2, toC: 4, color: 'emerald', label: '1. Parachute [R] Pin' },
        ],
        keySquares: [{ r: 6, c: 4, color: 'emerald', label: 'PARACHUTE' }],
        opponentReply: {
          fromR: 2,
          fromC: 4,
          toR: 3,
          toC: 4,
          replyNote: 'Gote steps the Silver to (3,4) to block the file.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Capture [DH] to Earn ★3 & Ascend to Tier-4 Royal!',
        type: 'move',
        fromR: 5,
        fromC: 5,
        toR: 3,
        toC: 5,
        coachCommentary:
          'Jump your ★2 Lion [LN] from (5,5) to (3,5) to capture Gote’s high-value Dragon Horse [DH]! Reaching ★3 unlocks Tier-4 Evolution into a Crown Prince [CP] or additional King [K]!',
        arrows: [{ fromR: 5, fromC: 5, toR: 3, toC: 5, color: 'emerald', label: '2. ★3 Ascension!' }],
        keySquares: [{ r: 3, c: 5, color: 'amber', label: '★3 ROYAL' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Dropping Parachute Piece Directly in Front of Enemy Slider',
      badMove: { type: 'drop', dropCode: 'R', toR: 6, toC: 5 },
      refutationMove: { fromR: 3, fromC: 5, toR: 6, toC: 2 },
      explanation:
        'Dropping your Parachute Rook onto a square where Gote can immediately trade or fork it wastes your only Parachute charge—remember, recaptured Parachute units are permanently banished!',
      arrows: [{ fromR: 3, fromC: 5, toR: 6, toC: 2, color: 'rose', label: 'Fork & Banish!' }],
      keySquares: [{ r: 6, c: 5, color: 'rose', label: 'WASTED DROP' }],
    },
  },
  {
    id: 'midgame-taikyoku36-fire-demon-aoe',
    phase: 'midgame',
    scale: 'taikyoku36',
    title: '15. Grand 36×36 Mid-Game: Kagutsuchi’s Fire Demon AoE & Suicide-Burn Shield',
    kanji: '大局将棋中盤・火鬼の八方焼却と自爆罠',
    proverb: {
      jp: '火鬼の隣に立つ者は灰となる',
      romaji: 'Kaki no tonari ni tatsu mono wa hai to naru',
      en: 'Any piece that stands beside the Fire Demon turns to ash.',
    },
    championBotId: 'bot-12',
    strategicOverview:
      'The Fire Demon [DM] (火鬼) is the supreme mid-game weapon of 36×36 Taikyoku Shōgi: (1) Active AoE Burn: when it finishes moving, it incinerates all enemy pieces on the 8 surrounding squares; (2) Passive Suicide-Burn: any enemy piece that ends its move adjacent to your Fire Demon without capturing it immediately burns itself to ash!',
    winPlanSummary:
      'Slide your Fire Demon [DM] from (16,17) to the empty square (11,17) right in the center of Gote’s 4-general cluster to incinerate all four pieces in one turn!',
    pieces: [
      { r: 5, c: 17, code: 'K', owner: 'gote' },
      { r: 5, c: 18, code: 'CP', owner: 'gote' },
      { r: 10, c: 17, code: 'G', owner: 'gote' },
      { r: 11, c: 16, code: 'S', owner: 'gote' },
      { r: 11, c: 18, code: 'R', owner: 'gote' },
      { r: 12, c: 16, code: 'B', owner: 'gote' },
      { r: 16, c: 17, code: 'DM', owner: 'sente' },
      { r: 28, c: 17, code: 'CP', owner: 'sente' },
      { r: 28, c: 18, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Slide Fire Demon into the 4-Piece Cluster Center (19十二火鬼)',
        type: 'move',
        fromR: 16,
        fromC: 17,
        toR: 11,
        toC: 17,
        coachCommentary:
          'Slide your Fire Demon [DM] from (16,17) to the empty square (11,17)! Instead of capturing just one piece, landing on (11,17) triggers its 8-square aura and burns Gote’s [G], [S], [R], and [B] simultaneously!',
        arrows: [
          { fromR: 16, fromC: 17, toR: 11, toC: 17, color: 'emerald', label: '1. Land in Cluster!' },
          { fromR: 11, fromC: 17, toR: 10, toC: 17, color: 'rose', label: 'Burn', dashed: true },
          { fromR: 11, fromC: 17, toR: 11, toC: 18, color: 'rose', label: 'Burn', dashed: true },
        ],
        keySquares: [
          { r: 11, c: 17, color: 'emerald', label: 'EPICENTER' },
          { r: 10, c: 17, color: 'rose', label: 'INCINERATE' },
          { r: 11, c: 18, color: 'rose', label: 'INCINERATE' },
        ],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Direct Capture on the Outer Edge Instead of Central AoE',
      badMove: { type: 'move', fromR: 16, fromC: 17, toR: 12, toC: 16 },
      refutationMove: { fromR: 11, fromC: 18, toR: 12, toC: 18 },
      explanation:
        'If you move slightly off-center to (12,16), Gote’s Rook at (11,18) is outside the 1-square burn radius and escapes to counter-attack.',
      arrows: [{ fromR: 11, fromC: 18, toR: 12, toC: 18, color: 'rose', label: 'Rook Escapes!' }],
      keySquares: [{ r: 11, c: 18, color: 'rose', label: 'MISSED [R]' }],
    },
  },

  // ==========================================================================
  // PHASE 4: END-GAME, YOSE & TSUME (終盤・寄せ・必至)
  // ==========================================================================
  {
    id: 'endgame-dobutsu-try-race',
    phase: 'endgame',
    scale: 'dobutsu',
    title: '16. Dōbutsu End-Game: The Unstoppable Try Rule (トライ) Sprint',
    kanji: 'どうぶつ終盤・トライ勝利と王手阻止',
    proverb: {
      jp: 'ライオンは敵陣一番奥を目指せ',
      romaji: 'Raion wa tekijin ichiban oku o mezase',
      en: 'In the endgame, race your Lion to the farthest rank onto an unattacked square.',
    },
    championBotId: 'bot-02',
    strategicOverview:
      'In Dōbutsu Shōgi, you can win even when behind in material if your Lion [K] steps onto row 0 (for Sente) without being in check (the Try Rule). Clearing or blocking the defender of row 0 sets up an unstoppable Try victory.',
    winPlanSummary:
      'Step 1: Drop your Chick [P] at (1,1) to block Gote’s Giraffe from guarding (0,2). Step 2: Step your Lion [K] from (1,2) into (0,2) for an instant Try Rule victory!',
    pieces: [
      { r: 0, c: 0, code: 'K', owner: 'gote' },
      { r: 1, c: 0, code: 'R', owner: 'gote' },
      { r: 1, c: 2, code: 'K', owner: 'sente' },
      { r: 2, c: 2, code: 'B', owner: 'sente' },
    ],
    senteHand: ['P'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Advance Lion to the Try Rank (1一ライオン — Try Win!)',
        type: 'move',
        fromR: 1,
        fromC: 2,
        toR: 0,
        toC: 2,
        coachCommentary:
          'Inspect row 0: Gote’s Lion is at (0,0) and Gote’s Giraffe is at (1,0), leaving (0,2) completely unguarded! Step your Lion [K] from (1,2) to (0,2) to win immediately by the Try Rule!',
        arrows: [{ fromR: 1, fromC: 2, toR: 0, toC: 2, color: 'emerald', label: '1. TRY VICTORY!' }],
        keySquares: [{ r: 0, c: 2, color: 'emerald', label: 'TRY GOAL' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Stepping onto a Guarded Try Square (0,1)',
      badMove: { type: 'move', fromR: 1, fromC: 2, toR: 0, toC: 1 },
      refutationMove: { fromR: 0, fromC: 0, toR: 0, toC: 1 },
      explanation:
        'Stepping your Lion onto (0,1) does NOT win by the Try Rule because Gote’s Lion at (0,0) guards (0,1) and captures your Lion!',
      arrows: [{ fromR: 0, fromC: 0, toR: 0, toC: 1, color: 'rose', label: 'Illegal / Captured!' }],
      keySquares: [{ r: 0, c: 1, color: 'rose', label: 'GUARDED' }],
    },
  },
  {
    id: 'endgame-shogi9-yose-kobin',
    phase: 'endgame',
    scale: 'shogi9',
    title: '17. 9×9 Yose Technique: Attacking the Castle Kobin (小鬢) & Belly Gold Hisshi',
    kanji: '終盤の寄せ・矢倉の小鬢攻めと腹金必至',
    proverb: {
      jp: '寄せは俗手で・金はトドメに残せ',
      romaji: 'Yose wa zokushu de, kin wa todome ni nokose',
      en: 'Dismantle the castle with direct blows to the Gold’s ear (Kobin), and save a Gold in hand for the final blow.',
    },
    championBotId: 'bot-19',
    strategicOverview:
      'Every Shōgi castle has a structural weak point. Against Yagura or Mino, the diagonal ear of the Gold General (Kobin 小鬢)—where a Gold cannot move backward diagonally—and the King’s side (Hara 腹) are fatal targets. Sacrificing a Silver to strip the defensive Gold creates Hisshi (brinkmate—a threat of mate that cannot be stopped without giving check) or direct Tsume.',
    winPlanSummary:
      'Step 1: Drop Silver [S] at (1,2) to fork Gote’s King at (0,1) and defensive Gold at (0,2). Step 2: After Gote’s Gold captures at (1,2), drop your reserve Gold [G] at (1,1) for Belly-Gold Checkmate!',
    pieces: [
      { r: 0, c: 1, code: 'K', owner: 'gote' },
      { r: 0, c: 0, code: 'L', owner: 'gote' },
      { r: 0, c: 2, code: 'G', owner: 'gote' },
      { r: 1, c: 0, code: 'P', owner: 'gote' },
      { r: 2, c: 2, code: 'DH', owner: 'sente', promoted: true },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
    ],
    senteHand: ['S', 'G'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Silver Sacrifice at the Castle Throat (▲7二銀打)',
        type: 'drop',
        dropCode: 'S',
        toR: 1,
        toC: 2,
        coachCommentary:
          'Drop your Silver General [S] from hand onto (1,2) [▲7二銀]! This checks Gote’s King at (0,1) along the diagonal and drags Gote’s defensive Gold away from (0,2).',
        arrows: [
          { fromR: 1, fromC: 2, toR: 0, toC: 1, color: 'emerald', label: '1. Drop [S] Check!' },
          { fromR: 0, fromC: 2, toR: 1, toC: 2, color: 'amber', label: 'Forced Recapture', dashed: true },
        ],
        keySquares: [{ r: 1, c: 2, color: 'emerald', label: 'SACRIFICE' }],
        opponentReply: {
          fromR: 0,
          fromC: 2,
          toR: 1,
          toC: 2,
          replyNote: 'Gote’s Gold at (0,2) is forced to capture the checking Silver at (1,2), vacating the King’s throat!',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Deliver Head/Belly Gold Checkmate (▲8二金打 — Tsume!)',
        type: 'drop',
        dropCode: 'G',
        toR: 1,
        toC: 1,
        coachCommentary:
          'Drop your Gold General [G] from hand onto (1,1) [▲8二金], supported by your Dragon Horse [DH] at (2,2)! With the defensive Gold decoyed to (1,2), Gote’s King is in checkmate!',
        arrows: [
          { fromR: 1, fromC: 1, toR: 0, toC: 1, color: 'emerald', label: '2. ▲8二金 MATE!' },
          { fromR: 2, fromC: 2, toR: 1, toC: 1, color: 'sky', label: 'DH Support', dashed: true },
        ],
        keySquares: [{ r: 0, c: 1, color: 'rose', label: 'CHECKMATE' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Dropping the Gold First Instead of Saving It for the Finishing Blow',
      badMove: { type: 'drop', dropCode: 'G', toR: 1, toC: 2 },
      refutationMove: { fromR: 0, fromC: 2, toR: 1, toC: 2 },
      explanation:
        'Remember the proverb: "Save the Gold for the finishing blow (Kin wa todome ni nokose)." If you sacrifice the Gold at (1,2) first, you only have a Silver left in hand—and a Silver dropped at (1,1) cannot cover the lateral escape square (0,2), letting Gote’s King escape!',
      arrows: [
        { fromR: 0, fromC: 2, toR: 1, toC: 2, color: 'rose', label: 'Gold Taken' },
        { fromR: 0, fromC: 1, toR: 0, toC: 2, color: 'rose', label: 'King Escapes to 7一!', dashed: true },
      ],
      keySquares: [{ r: 0, c: 2, color: 'rose', label: 'ESCAPE HOLE' }],
    },
  },
  {
    id: 'endgame-war12-citadel-breach',
    phase: 'endgame',
    scale: 'war12',
    title: '18. War-Budget 12×12 End-Game: Breaching the Locked Citadel & Dual-Royal Sweep',
    kanji: '軍資金将棋終盤・本陣二玉同時撃破',
    proverb: {
      jp: '二玉を仕留めるには獅子・飛鷲の二歩連撃',
      romaji: 'Nigyoku o shitomeru ni wa Shishi-Hijū no nifu rengeki',
      en: 'To fell both King and Crown Prince in one turn, unleash a 2-step Lion or Eagle sweep.',
    },
    championBotId: 'bot-20',
    strategicOverview:
      'In War-Budget 12×12, Gote survives as long as either the King [K] at (0,6) or the Crown Prince [CP] at (0,5) remains on the board—OR you can win immediately by marching your own King [K] onto Rank 1 (row 0). When attacking the Citadel, a 2-step Lion or Free Eagle can eliminate both Royals in a single turn!',
    winPlanSummary:
      'Use your Lion [LN] at (1,5) to capture Gote’s Crown Prince [CP] at (0,5) on Step 1, then step sideways to (0,6) on Step 2 to capture Gote’s King [K] and win the match!',
    pieces: [
      { r: 0, c: 5, code: 'CP', owner: 'gote', citadelGuard: true },
      { r: 0, c: 6, code: 'K', owner: 'gote', citadelGuard: true },
      { r: 1, c: 6, code: 'G', owner: 'gote', citadelGuard: true },
      { r: 1, c: 5, code: 'LN', owner: 'sente', stars: 3, tier: 3 },
      { r: 2, c: 4, code: 'DK', owner: 'sente', stars: 2, tier: 2 },
      { r: 11, c: 5, code: 'CP', owner: 'sente', citadelGuard: true },
      { r: 11, c: 6, code: 'K', owner: 'sente', citadelGuard: true },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Double-Royal Sweep: Capture [CP] at (0,5) → Capture [K] at (0,6)!',
        type: 'move',
        fromR: 1,
        fromC: 5,
        toR: 0,
        toC: 5,
        secondToR: 0,
        secondToC: 6,
        coachCommentary:
          'Step your Lion [LN] from (1,5) onto (0,5) to capture Gote’s Crown Prince [CP], then immediately use its 2nd step to capture Gote’s King [K] at (0,6)! Both enemy Royals fall in a single turn!',
        arrows: [
          { fromR: 1, fromC: 5, toR: 0, toC: 5, color: 'emerald', label: '1a. Slay [CP]' },
          { fromR: 0, fromC: 5, toR: 0, toC: 6, color: 'amber', label: '1b. Slay [K]!' },
        ],
        keySquares: [
          { r: 0, c: 5, color: 'emerald', label: 'ROYAL 1' },
          { r: 0, c: 6, color: 'amber', label: 'ROYAL 2' },
        ],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Capturing Only One Royal with a Single-Step Piece',
      badMove: { type: 'move', fromR: 2, fromC: 4, toR: 0, toC: 6 },
      refutationMove: { fromR: 1, fromC: 6, toR: 1, toC: 5 },
      explanation:
        'If you use the Dragon King to capture only one Royal, Gote’s surviving Royal keeps the game alive and Gote’s Citadel Gold at (1,6) captures your Lion at (1,5)!',
      arrows: [{ fromR: 1, fromC: 6, toR: 1, toC: 5, color: 'rose', label: 'Lion Lost!' }],
      keySquares: [{ r: 1, c: 5, color: 'rose', label: 'COUNTERED' }],
    },
  },
  {
    id: 'endgame-taikyoku36-imperial-convergence',
    phase: 'endgame',
    scale: 'taikyoku36',
    title: '19. Grand 36×36 End-Game: Great General & Fire Demon Imperial Convergence',
    kanji: '大局将棋終盤・大将飛び越えと火鬼終局包囲',
    proverb: {
      jp: '大局の詰めは火鬼の包囲と大将の槍',
      romaji: 'Taikyoku no tsume wa Kaki no hōi to Taishō no yari',
      en: 'Finish the 36×36 campaign by burning the Royal guard with the Fire Demon and piercing the wall with the Great General.',
    },
    championBotId: 'bot-20',
    strategicOverview:
      'In the final phase of a 36×36 Taikyoku Shōgi battle, Gote often walls the last surviving Royal behind multiple ranks of Generals. By combining the Fire Demon [DM] (which incinerates adjacent Royals and guards simultaneously) with the Great General [GG] (which jumps straight over shield walls), no fortress can survive.',
    winPlanSummary:
      'Step 1: Slide your Fire Demon [DM] from (9,17) to (6,17) to incinerate Gote’s Crown Prince [CP] at (5,17) and Gold shield at (6,18). Step 2: Leap your Great General [GG] from (12,18) over the remaining blocker to capture Gote’s final King [K] at (4,18)!',
    pieces: [
      { r: 4, c: 18, code: 'K', owner: 'gote' },
      { r: 5, c: 17, code: 'CP', owner: 'gote' },
      { r: 6, c: 18, code: 'G', owner: 'gote' },
      { r: 8, c: 18, code: 'I', owner: 'gote' },
      { r: 9, c: 17, code: 'DM', owner: 'sente' },
      { r: 12, c: 18, code: 'GG', owner: 'sente' },
      { r: 30, c: 18, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Step 1: Fire Demon AoE Burn on Crown Prince & Shield',
        type: 'move',
        fromR: 9,
        fromC: 17,
        toR: 6,
        toC: 17,
        coachCommentary:
          'Slide your Fire Demon [DM] from (9,17) to (6,17)! Its passive 8-square fire aura immediately incinerates Gote’s Crown Prince [CP] at (5,17) AND Gote’s Gold shield at (6,18)!',
        arrows: [
          { fromR: 9, fromC: 17, toR: 6, toC: 17, color: 'emerald', label: '1. [DM] Advance' },
          { fromR: 6, fromC: 17, toR: 5, toC: 17, color: 'rose', label: 'Burn [CP]!', dashed: true },
        ],
        keySquares: [{ r: 5, c: 17, color: 'rose', label: 'BURNED [CP]' }],
        opponentReply: {
          fromR: 8,
          fromC: 18,
          toR: 7,
          toC: 18,
          replyNote: 'Gote advances the Iron General (8,18→7,18) trying to block the 18th file.',
        },
      },
      {
        stepNumber: 2,
        title: 'Step 2: Great General Rank-Jump Assassination of Final King!',
        type: 'move',
        fromR: 12,
        fromC: 18,
        toR: 4,
        toC: 18,
        coachCommentary:
          'Leap your Great General [GG] from (12,18) straight over Gote’s Iron General at (7,18) to capture Gote’s final King [K] at (4,18) and win the 36×36 campaign!',
        arrows: [{ fromR: 12, fromC: 18, toR: 4, toC: 18, color: 'emerald', label: '2. [GG] Leap Mate!' }],
        keySquares: [{ r: 4, c: 18, color: 'emerald', label: 'FINAL KING' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Attacking with Great General Before Burning the Crown Prince',
      badMove: { type: 'move', fromR: 12, fromC: 18, toR: 6, toC: 18 },
      refutationMove: { fromR: 5, fromC: 17, toR: 6, toC: 18 },
      explanation:
        'If you sacrifice your Great General on the Gold shield at (6,18) first, Gote’s Crown Prince at (5,17) recaptures your Great General and survives!',
      arrows: [{ fromR: 5, fromC: 17, toR: 6, toC: 18, color: 'rose', label: '[GG] Captured!' }],
      keySquares: [{ r: 6, c: 18, color: 'rose', label: 'BLUNDER' }],
    },
  },
  {
    id: 'castle-dobutsu-triangle-guard',
    phase: 'castling',
    scale: 'dobutsu',
    title: '20. Dōbutsu Forest Guard: Elephant-Giraffe Triangle Formation',
    kanji: 'どうぶつ囲い・ぞうきりん三角陣',
    proverb: {
      jp: 'ライオンの脇はぞうときりんで固めよ',
      romaji: 'Raion no waki wa Zō to Kirin de katameyo',
      en: 'Link Elephant and Giraffe diagonals around your Lion to prevent parachute forks.',
    },
    championBotId: 'bot-01',
    strategicOverview:
      'Even on the compact 3×4 Dōbutsu board, leaving gaps beside your Lion invites an immediate parachute drop. Stepping your Elephant [B] to (2,1) while your Giraffe [R] holds (3,2) forms a mutual defense triangle covering all entry squares.',
    winPlanSummary:
      'Step your Elephant [B] from (3,0) diagonally to (2,1) so that both your Lion [K] and Giraffe [R] support it.',
    pieces: [
      { r: 0, c: 1, code: 'K', owner: 'gote' },
      { r: 1, c: 0, code: 'R', owner: 'gote' },
      { r: 3, c: 0, code: 'B', owner: 'sente' },
      { r: 3, c: 1, code: 'K', owner: 'sente' },
      { r: 3, c: 2, code: 'R', owner: 'sente' },
    ],
    senteHand: ['P'],
    goteHand: ['P'],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Form the Central Elephant Canopy (2三ぞう)',
        type: 'move',
        fromR: 3,
        fromC: 0,
        toR: 2,
        toC: 1,
        coachCommentary:
          'Move your Elephant [B] from (3,0) to (2,1) directly in front of your Lion! Now (2,1) is guarded by your Lion while the Elephant guards (1,0) and (1,2).',
        arrows: [
          { fromR: 3, fromC: 0, toR: 2, toC: 1, color: 'emerald', label: '1. Form Canopy' },
          { fromR: 2, fromC: 1, toR: 1, toC: 0, color: 'sky', label: 'Diagonal Control', dashed: true },
        ],
        keySquares: [{ r: 2, c: 1, color: 'emerald', label: 'APEX' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Leaving the Center Square (2,1) Empty for Gote’s Drop',
      badMove: { type: 'move', fromR: 3, fromC: 2, toR: 2, toC: 2 },
      refutationMove: { fromR: 1, fromC: 0, toR: 2, toC: 0 },
      explanation:
        'Advancing the Giraffe on the edge leaves the left file open for Gote’s Giraffe at (1,0) to invade (2,0) and pin your Elephant.',
      arrows: [{ fromR: 1, fromC: 0, toR: 2, toC: 0, color: 'rose', label: 'Flank Pin!' }],
      keySquares: [{ r: 2, c: 0, color: 'rose', label: 'INVADED' }],
    },
  },
  {
    id: 'castle-war12-citadel-ring',
    phase: 'castling',
    scale: 'war12',
    title: '21. War-Budget 12×12 Fortress: Locked Citadel Outer Ring & Blind Tiger Wall',
    kanji: '軍資金将棋囲い・本陣外郭リング',
    proverb: {
      jp: '固定本陣の前には盲虎と銀の二重壁を築け',
      romaji: 'Kotei honjin no mae ni wa Mōko to Gin no nijūkabe',
      en: 'Reinforce the Locked Citadel with an outer ring of Blind Tigers and Silver Generals.',
    },
    championBotId: 'bot-07',
    strategicOverview:
      'In War-Budget 12×12, your King [K] at (11,6), Crown Prince [CP] at (11,5), and Citadel Golds are locked in place. To prevent enemy Rank-Jumpers or promoted Dragons from sniping the Citadel, you must weave an outer defensive ring on rank 10 (row 9).',
    winPlanSummary:
      'Step your Blind Tiger [BT] from (10,4) diagonally to (9,5) to interlock with the Citadel Golds and seal the inner perimeter.',
    pieces: [
      { r: 0, c: 5, code: 'CP', owner: 'gote', citadelGuard: true },
      { r: 0, c: 6, code: 'K', owner: 'gote', citadelGuard: true },
      { r: 3, c: 5, code: 'DK', owner: 'gote' },
      { r: 10, c: 4, code: 'BT', owner: 'sente', stars: 0, tier: 1 },
      { r: 10, c: 5, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 10, c: 6, code: 'G', owner: 'sente', citadelGuard: true },
      { r: 10, c: 7, code: 'S', owner: 'sente', citadelGuard: true },
      { r: 11, c: 5, code: 'CP', owner: 'sente', citadelGuard: true },
      { r: 11, c: 6, code: 'K', owner: 'sente', citadelGuard: true },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Seal the Citadel Crest with Blind Tiger (7十盲虎)',
        type: 'move',
        fromR: 10,
        fromC: 4,
        toR: 9,
        toC: 5,
        coachCommentary:
          'Step your Blind Tiger [BT] diagonally from (10,4) to (9,5), shielding the head of the Citadel Gold at (10,5) and Crown Prince at (11,5)!',
        arrows: [{ fromR: 10, fromC: 4, toR: 9, toC: 5, color: 'emerald', label: '1. Seal Crest' }],
        keySquares: [{ r: 9, c: 5, color: 'emerald', label: 'OUTER RING' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Pulling the Blind Tiger Away from the Citadel File',
      badMove: { type: 'move', fromR: 10, fromC: 4, toR: 9, toC: 3 },
      refutationMove: { fromR: 3, fromC: 5, toR: 9, toC: 5 },
      explanation:
        'Moving your Blind Tiger away from the 7th file allows Gote’s Dragon King at (3,5) to crash straight down onto (9,5) directly above your Citadel!',
      arrows: [{ fromR: 3, fromC: 5, toR: 9, toC: 5, color: 'rose', label: 'Citadel Breached!' }],
      keySquares: [{ r: 9, c: 5, color: 'rose', label: 'UNDEFENDED' }],
    },
  },
  {
    id: 'castle-taikyoku36-imperial-sanctuary',
    phase: 'castling',
    scale: 'taikyoku36',
    title: '22. Grand 36×36 Fortress: Three-Royal Imperial Sanctuary (King, Prince & Promoted Elephant)',
    kanji: '大局将棋本陣・三玉帝都防衛陣',
    proverb: {
      jp: '三玉を分散配置すれば大局は不敗なり',
      romaji: 'Sangyoku o bunsan haichi sureba Taikyoku wa fuhai nari',
      en: 'Separate your Royals across protected sectors so no single Fire Demon can burn them all.',
    },
    championBotId: 'bot-16',
    strategicOverview:
      'On the 36×36 board, keeping your King [K] and Crown Prince [CP] on adjacent squares invites a single enemy Fire Demon [DM] or Lion [LN] to eliminate both in one turn. The Imperial Sanctuary separates [K] and [CP] by 3 files behind a Vice General [VG] and Great Standard [GE] screen.',
    winPlanSummary:
      'Step your King [K] laterally from (30,18) to (30,19) to create anti-Fire-Demon spacing from your Crown Prince at (30,16).',
    pieces: [
      { r: 4, c: 17, code: 'K', owner: 'gote' },
      { r: 4, c: 18, code: 'CP', owner: 'gote' },
      { r: 14, c: 18, code: 'DM', owner: 'gote' },
      { r: 28, c: 17, code: 'GE', owner: 'sente' },
      { r: 28, c: 19, code: 'VG', owner: 'sente' },
      { r: 30, c: 16, code: 'CP', owner: 'sente' },
      { r: 30, c: 18, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Establish Anti-AoE Royal Spacing (17三十一玉)',
        type: 'move',
        fromR: 30,
        fromC: 18,
        toR: 30,
        toC: 19,
        coachCommentary:
          'Slide your King [K] from (30,18) to (30,19) directly behind your Vice General [VG] at (28,19). Now your Royals at (30,16) and (30,19) are 3 files apart—completely immune to simultaneous Fire Demon incineration or Lion double-kills!',
        arrows: [
          { fromR: 30, fromC: 18, toR: 30, toC: 19, color: 'emerald', label: '1. Space Royals' },
          { fromR: 28, fromC: 19, toR: 30, toC: 19, color: 'sky', label: '[VG] Cover', dashed: true },
        ],
        keySquares: [
          { r: 30, c: 16, color: 'sky', label: 'PRINCE' },
          { r: 30, c: 19, color: 'emerald', label: 'SAFE KING' },
        ],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Clustering King Next to Crown Prince Against a Fire Demon',
      badMove: { type: 'move', fromR: 30, fromC: 18, toR: 30, toC: 17 },
      refutationMove: { fromR: 14, fromC: 18, toR: 29, toC: 17 },
      explanation:
        'Stepping your King to (30,17) right next to your Crown Prince at (30,16) allows Gote’s Fire Demon to land at (29,17) and burn BOTH Royals in a single turn!',
      arrows: [{ fromR: 14, fromC: 18, toR: 29, toC: 17, color: 'rose', label: 'Dual Royal Burn!' }],
      keySquares: [{ r: 29, c: 17, color: 'rose', label: 'FATAL AOE' }],
    },
  },
  {
    id: 'midgame-dobutsu-parachute-fork',
    phase: 'midgame',
    scale: 'dobutsu',
    title: '23. Dōbutsu Mid-Game: Parachute Elephant & Chick Double-Threat Tesuji',
    kanji: 'どうぶつ中盤・持ち駒ダブルアタック',
    proverb: {
      jp: '持ち駒は敵の利きがない急所に打て',
      romaji: 'Mochigoma wa teki no kiki ga nai kyūsho ni ute',
      en: 'Drop reserve pieces onto blind spots that fork two enemy animals at once.',
    },
    championBotId: 'bot-02',
    strategicOverview:
      'In Dōbutsu Shōgi, the Giraffe [R] only moves orthogonally—its 4 diagonal corners are completely blind! Dropping an Elephant [B] onto a diagonal square forks Gote’s Lion and Giraffe simultaneously.',
    winPlanSummary:
      'Drop your Elephant [B] from hand onto (1,1) to check Gote’s Lion at (0,0) and simultaneously attack Gote’s Giraffe at (0,2)!',
    pieces: [
      { r: 0, c: 0, code: 'K', owner: 'gote' },
      { r: 0, c: 2, code: 'R', owner: 'gote' },
      { r: 2, c: 1, code: 'P', owner: 'sente' },
      { r: 3, c: 1, code: 'K', owner: 'sente' },
    ],
    senteHand: ['B'],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Drop Elephant for a Royal-Giraffe Fork (2二ぞう打)',
        type: 'drop',
        dropCode: 'B',
        toR: 1,
        toC: 1,
        coachCommentary:
          'Drop your Elephant [B] from hand onto (1,1) supported by your Chick at (2,1)! It checks Gote’s Lion at (0,0) AND forks Gote’s Giraffe at (0,2)!',
        arrows: [
          { fromR: 1, fromC: 1, toR: 0, toC: 0, color: 'emerald', label: 'Check [K]!' },
          { fromR: 1, fromC: 1, toR: 0, toC: 2, color: 'amber', label: 'Fork [R]!' },
        ],
        keySquares: [{ r: 1, c: 1, color: 'emerald', label: 'FORK DROP' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Dropping Elephant onto an Unprotected Orthogonal Square',
      badMove: { type: 'drop', dropCode: 'B', toR: 1, toC: 2 },
      refutationMove: { fromR: 0, fromC: 2, toR: 1, toC: 2 },
      explanation:
        'Dropping the Elephant at (1,2) puts it directly in front of Gote’s Giraffe at (0,2), losing your Elephant for nothing!',
      arrows: [{ fromR: 0, fromC: 2, toR: 1, toC: 2, color: 'rose', label: 'Eaten by [R]!' }],
      keySquares: [{ r: 1, c: 2, color: 'rose', label: 'BLUNDER' }],
    },
  },
  {
    id: 'endgame-chu12-eagle-lion-mate',
    phase: 'endgame',
    scale: 'chu12',
    title: '24. Chū Shōgi End-Game: Soaring Eagle & Horned Falcon Mating Net',
    kanji: '中将棋終盤・飛鷲と角鷹の挟撃必至',
    proverb: {
      jp: '終盤の飛鷲・角鷹は獅子に勝る',
      romaji: 'Shūban no Hijū-Kakuyō wa Shishi ni masaru',
      en: 'In the endgame, the long rays + 2-step talons of the Eagle and Falcon surpass even the Lion.',
    },
    championBotId: 'bot-14',
    strategicOverview:
      'In 12×12 Chū Shōgi, promoted Dragon Kings become Soaring Eagles [EL] (with 2-step diagonal Lion talons) and Dragon Horses become Horned Falcons [HF] (with a 2-step forward Lion horn). Together they weave an inescapable mating net from long range.',
    winPlanSummary:
      'Use your Soaring Eagle [EL] at (3,4) to leap 2 squares NE over Gote’s Gold blocker at (2,5) and capture Gote’s King [K] at (1,6)!',
    pieces: [
      { r: 1, c: 6, code: 'K', owner: 'gote' },
      { r: 2, c: 5, code: 'G', owner: 'gote' },
      { r: 2, c: 6, code: 'S', owner: 'gote' },
      { r: 3, c: 4, code: 'EL', owner: 'sente' },
      { r: 4, c: 6, code: 'HF', owner: 'sente' },
      { r: 11, c: 6, code: 'K', owner: 'sente' },
    ],
    senteHand: [],
    goteHand: [],
    guidedSteps: [
      {
        stepNumber: 1,
        title: 'Soaring Eagle Diagonal Talon Jump (6二飛鷲 — Royal Capture!)',
        type: 'move',
        fromR: 3,
        fromC: 4,
        toR: 1,
        toC: 6,
        coachCommentary:
          'Because the Soaring Eagle [EL] has 2-step Lion power along its forward diagonals (NW and NE), it leaps directly over Gote’s Gold at (2,5) to capture Gote’s King at (1,6)!',
        arrows: [{ fromR: 3, fromC: 4, toR: 1, toC: 6, color: 'emerald', label: '1. Talon Jump Mate!' }],
        keySquares: [{ r: 1, c: 6, color: 'emerald', label: 'ROYAL SLAIN' }],
      },
    ],
    mistakeDemo: {
      mistakeTitle: 'Blunder: Sliding Orthogonally Instead of Using the Diagonal Talon Jump',
      badMove: { type: 'move', fromR: 3, fromC: 4, toR: 1, toC: 4 },
      refutationMove: { fromR: 1, fromC: 6, toR: 0, toC: 7 },
      explanation:
        'Sliding to (1,4) does not jump the diagonal blocker and gives Gote’s King a full turn to flee into the upper-right corner (0,7).',
      arrows: [{ fromR: 1, fromC: 6, toR: 0, toC: 7, color: 'rose', label: 'King Escapes!' }],
      keySquares: [{ r: 0, c: 7, color: 'rose', label: 'ESCAPED' }],
    },
  },
];

/**
 * Builds a clean board matrix and hand state for a given `StrategyCurriculumModule`,
 * optionally replaying `completedStepCount` guided steps so the user can step forward/backward seamlessly.
 */
export function buildCurriculumBoardState(
  mod: StrategyCurriculumModule,
  completedStepCount = 0
): {
  board: (BoardPiece | null)[][];
  hands: { sente: string[]; gote: string[] };
  lastMove: { fromR: number; fromC: number; toR: number; toC: number } | null;
  arrows: StrategyArrow[];
  keySquares: StrategyKeySquare[];
} {
  const cfg = SCALE_CONFIGS[mod.scale];
  const board = createEmptyBoard(cfg.rows, cfg.cols);
  mod.pieces.forEach(p => {
    if (inBounds(p.r, p.c, cfg.rows, cfg.cols)) {
      const piece = makePiece(p.code, p.owner, Boolean(p.promoted));
      if (p.stars !== undefined) piece.stars = p.stars;
      if (p.tier !== undefined) piece.tier = p.tier;
      if (p.citadelGuard !== undefined) piece.citadelGuard = p.citadelGuard;
      board[p.r][p.c] = piece;
    }
  });

  const hands = {
    sente: [...mod.senteHand],
    gote: [...mod.goteHand],
  };
  let lastMove: { fromR: number; fromC: number; toR: number; toC: number } | null = null;

  const stepsToRun = Math.max(0, Math.min(completedStepCount, mod.guidedSteps.length));
  for (let i = 0; i < stepsToRun; i++) {
    const step = mod.guidedSteps[i];
    if (step.type === 'drop' && step.dropCode) {
      const dropped = makePiece(step.dropCode, 'sente', false);
      if (mod.scale === 'war12') dropped.parachuted = true;
      board[step.toR][step.toC] = dropped;
      const idx = hands.sente.indexOf(step.dropCode);
      if (idx !== -1) hands.sente.splice(idx, 1);
      lastMove = { fromR: -1, fromC: -1, toR: step.toR, toC: step.toC };
    } else if (step.type === 'move' && step.fromR !== undefined && step.fromC !== undefined) {
      const moving = board[step.fromR]?.[step.fromC];
      if (moving) {
        const pieceCopy: BoardPiece = { ...moving };
        const target = board[step.toR]?.[step.toC];
        if (target && target.owner !== 'sente' && cfg.allowDrops && !PIECE_DB[target.code]?.isRoyal) {
          hands.sente.push(target.baseCode || target.code);
        }
        if (step.promote) {
          const promo = getScalePromotesTo(pieceCopy.code, mod.scale);
          if (promo && PIECE_DB[promo]) {
            pieceCopy.code = promo;
            pieceCopy.promoted = true;
          }
        }
        board[step.toR][step.toC] = pieceCopy;
        board[step.fromR][step.fromC] = null;

        let finalR = step.toR;
        let finalC = step.toC;
        if (step.secondToR !== undefined && step.secondToC !== undefined) {
          board[step.secondToR][step.secondToC] = pieceCopy;
          if (step.secondToR !== step.toR || step.secondToC !== step.toC) {
            board[step.toR][step.toC] = null;
          }
          finalR = step.secondToR;
          finalC = step.secondToC;
        }

        // Fire Demon AoE burn if moving piece is DM
        if (PIECE_DB[pieceCopy.code]?.special === 'fire') {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = finalR + dr;
              const nc = finalC + dc;
              if (inBounds(nr, nc, cfg.rows, cfg.cols) && board[nr][nc]?.owner === 'gote') {
                board[nr][nc] = null;
              }
            }
          }
        }
        lastMove = { fromR: step.fromR, fromC: step.fromC, toR: finalR, toC: finalC };
      }
    }

    if (step.opponentReply) {
      const rep = step.opponentReply;
      const gMoving = board[rep.fromR]?.[rep.fromC];
      if (gMoving) {
        const gCopy: BoardPiece = { ...gMoving };
        if (rep.promote) {
          const promo = getScalePromotesTo(gCopy.code, mod.scale);
          if (promo && PIECE_DB[promo]) {
            gCopy.code = promo;
            gCopy.promoted = true;
          }
        }
        board[rep.toR][rep.toC] = gCopy;
        board[rep.fromR][rep.fromC] = null;
        lastMove = { fromR: rep.fromR, fromC: rep.fromC, toR: rep.toR, toC: rep.toC };
      }
    }
  }

  const activeStep =
    mod.guidedSteps[Math.min(completedStepCount, mod.guidedSteps.length - 1)] || mod.guidedSteps[0];

  return {
    board,
    hands,
    lastMove,
    arrows: activeStep ? activeStep.arrows : [],
    keySquares: activeStep ? activeStep.keySquares : [],
  };
}

/**
 * Simulates the Mistake Refutation sequence on a fresh copy of `mod`'s initial position
 * so the player can see the exact blunder and the opponent's refutation on the board.
 */
export function buildMistakeRefutationBoardState(mod: StrategyCurriculumModule): {
  board: (BoardPiece | null)[][];
  hands: { sente: string[]; gote: string[] };
  lastMove: { fromR: number; fromC: number; toR: number; toC: number };
  arrows: StrategyArrow[];
  keySquares: StrategyKeySquare[];
} {
  const base = buildCurriculumBoardState(mod, 0);
  const board = cloneBoard(base.board);
  const hands = { sente: [...base.hands.sente], gote: [...base.hands.gote] };
  const bad = mod.mistakeDemo.badMove;
  const ref = mod.mistakeDemo.refutationMove;

  if (bad.type === 'drop' && bad.dropCode) {
    board[bad.toR][bad.toC] = makePiece(bad.dropCode, 'sente', false);
    const idx = hands.sente.indexOf(bad.dropCode);
    if (idx !== -1) hands.sente.splice(idx, 1);
  } else if (bad.type === 'move' && bad.fromR !== undefined && bad.fromC !== undefined) {
    const m = board[bad.fromR]?.[bad.fromC];
    if (m) {
      board[bad.toR][bad.toC] = { ...m };
      board[bad.fromR][bad.fromC] = null;
    }
  }

  const gRef = board[ref.fromR]?.[ref.fromC];
  if (gRef) {
    board[ref.toR][ref.toC] = { ...gRef };
    board[ref.fromR][ref.fromC] = null;
  }

  return {
    board,
    hands,
    lastMove: { fromR: ref.fromR, fromC: ref.fromC, toR: ref.toR, toC: ref.toC },
    arrows: mod.mistakeDemo.arrows,
    keySquares: mod.mistakeDemo.keySquares,
  };
}
