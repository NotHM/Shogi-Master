import JSZip from 'jszip';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AI_MASTERS, AIMasterProfile, SHOGI_STRATEGIES_AND_CASTLES, chooseAIMasterAction } from './engine/aiMasters';
import { LabelMode, drawCompassMatrix, renderShogiBoardCanvas } from './engine/canvasRenderer';
import { ACADEMY_LESSONS_40, CURATED_PUZZLES, TsumePuzzle } from './engine/dojoAndAcademy';
import { DIRS_8, PIECE_DB, PROMOTED_ONLY_LEGEND, RAW_LEGEND } from './engine/pieceRegistry';
import {
  BlockedSquare,
  BlindSquare,
  BoardPiece,
  BoardScaleId,
  DEFAULT_WAR_BUDGET_KOKU,
  EvolutionBranchOption,
  LegalMove,
  PlayerSide,
  SCALE_CONFIGS,
  ThreatSource,
  analyzePieceMovesOnBoard,
  applyFireDemonEffects,
  calculateBoardArmyCost,
  cloneBoard,
  computeBoardThreatMap,
  computePositionHash,
  create36x36TacticalClashBoard,
  createInitialBoard,
  createWarBudgetCitadelBoard,
  evaluateMatchWinConditions,
  getEvolutionBranches,
  getLegalDropsForHandPiece,
  getPieceWarBudgetCost,
  getRoyalStatus,
  getScalePromotesTo,
  getStrictLegalMovesForSquare,
  inBounds,
  makePiece,
} from './engine/shogiEngine';
import { Sound } from './engine/sound';
import {
  InteractiveBoardPreset,
  TestCategory,
  TestSuiteSummary,
  runAllUserTests,
} from './engine/userTestSuite';
import {
  AgentTeamSuiteReport,
  STUDIO_AGENT_TEAM,
  runAllStudioAgents,
  runStudioAgentSimulation,
} from './agents/agentTeam';
import {
  SHOGI_STRATEGY_CURRICULUM,
  STRATEGY_PHASE_TRACKS,
  StrategyCurriculumModule,
  StrategyPhaseId,
  buildCurriculumBoardState,
  buildMistakeRefutationBoardState,
} from './engine/strategyCurriculum';

type PrimaryTab = 'match' | 'strategies' | 'dojo' | 'academy' | 'tournaments' | 'legend' | 'tests';
type OpponentMode = 'ai' | 'pass' | 'ws_online' | 'webrtc_p2p';
type TimeControlId = 'blitz' | 'rapid' | 'classical' | 'correspondence_2d';

const TIME_CONTROL_SPECS: Record<TimeControlId, { label: string; initialMs: number; incrementMs: number }> = {
  blitz: { label: 'Blitz 3+2', initialMs: 3 * 60 * 1000, incrementMs: 2000 },
  rapid: { label: 'Rapid 10+5', initialMs: 10 * 60 * 1000, incrementMs: 5000 },
  classical: { label: 'Classical 30+10', initialMs: 30 * 60 * 1000, incrementMs: 10000 },
  correspondence_2d: { label: '2 Days (48:00:00)', initialMs: 48 * 3600 * 1000, incrementMs: 5000 },
};

interface UndoSnapshot {
  board: (BoardPiece | null)[][];
  hands: { sente: string[]; gote: string[] };
  banishedPieces?: { sente: string[]; gote: string[] };
  turn: PlayerSide;
  moveNumber: number;
  moveLog: { id: number; text: string; owner: PlayerSide }[];
  lionTradeBan: { bannedOwner: PlayerSide } | null;
}

interface PlayerProgression {
  name: string;
  xp: number;
  level: number;
  elo: number;
  selectedBadge: string;
  missions: {
    playMatch: number;
    solveTsume: number;
    completeLesson: number;
  };
}

export default function App() {
  // Navigation & Primary View State (4 Top Tabs: Play ['match'], Training Hub ['dojo'/'academy'/'legend'], Online ['tournaments'], Settings ['tests'])
  const [activeTab, setActiveTab] = useState<PrimaryTab>('match');
  const [leftInspectorOpen, setLeftInspectorOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
  );
  const [rightPanelOpenMobile, setRightPanelOpenMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
  );
  const [matchSetupOpen, setMatchSetupOpen] = useState<boolean>(false);
  const [warDrawerOpen, setWarDrawerOpen] = useState<boolean>(false);
  const [royalsDrawerOpen, setRoyalsDrawerOpen] = useState<boolean>(false);
  const [trainingSidebarOpen, setTrainingSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [labelMode, setLabelMode] = useState<LabelMode>('western');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMatchVectorTags, setShowMatchVectorTags] = useState<boolean>(false);
  const [showThreatCircles, setShowThreatCircles] = useState<boolean>(true);
  const [wheelMode, setWheelMode] = useState<'pan' | 'zoom'>('pan');
  const [taikyokuAutoPromote, setTaikyokuAutoPromote] = useState<boolean>(true);
  const [matchStatusNotice, setMatchStatusNotice] = useState<string | null>(null);

  // Settings Tab State (Houses Multi-Agent Team, 327 Automated User Tests, and App Preferences)
  const [settingsSubTab, setSettingsSubTab] = useState<'agents' | 'tests' | 'prefs'>('agents');
  const [agentSuiteReport, setAgentSuiteReport] = useState<AgentTeamSuiteReport>(() => runAllStudioAgents());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('tester-warbudget');
  const [testCategoryFilter, setTestCategoryFilter] = useState<TestCategory | 'all'>('all');
  const [testSearchQuery, setTestSearchQuery] = useState<string>('');
  const [testSuiteSummary, setTestSuiteSummary] = useState<TestSuiteSummary>(() => runAllUserTests('war_budget_agents'));
  const [expandedTestId, setExpandedTestId] = useState<string | null>('WB-01');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');

  // Match Configuration & Board State
  const [scale, setScale] = useState<BoardScaleId>('war12');
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ai');
  const [selectedBotId, setSelectedBotId] = useState<string>('bot-08');
  const [timeControl, setTimeControl] = useState<TimeControlId>('correspondence_2d');
  const [board, setBoard] = useState<(BoardPiece | null)[][]>(() => createInitialBoard('war12'));
  const [hands, setHands] = useState<{ sente: string[]; gote: string[] }>({ sente: [], gote: [] });
  const [banishedPieces, setBanishedPieces] = useState<{ sente: string[]; gote: string[] }>({ sente: [], gote: [] });
  const [turn, setTurn] = useState<PlayerSide>('sente');
  const [moveNumber, setMoveNumber] = useState<number>(1);
  const [moveLog, setMoveLog] = useState<{ id: number; text: string; owner: PlayerSide }[]>([]);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [, setPositionHistory] = useState<Record<string, number>>({});
  const [lionTradeBan, setLionTradeBan] = useState<{ bannedOwner: PlayerSide } | null>(null);

  // War-Budget 12x12 Draft & 4-Tier Evolution State
  const [warDraftPreset, setWarDraftPreset] = useState<'balanced' | 'cavalry' | 'siege' | 'ascension'>('balanced');
  const [warDraftCustomMode, setWarDraftCustomMode] = useState<boolean>(false);
  const [warDraftBrushCode, setWarDraftBrushCode] = useState<string>('LN');
  const [pendingEvolution, setPendingEvolution] = useState<{
    r: number;
    c: number;
    pieceCode: string;
    newStars: number;
    currentTier: number;
    options: EvolutionBranchOption[];
    nextBoard: (BoardPiece | null)[][];
    nextHands: { sente: string[]; gote: string[] };
    completedBy: PlayerSide;
    nextLionBan: { bannedOwner: PlayerSide } | null;
  } | null>(null);

  // Grand 36x36 Adjustable Turn Timer & Non-Game-Ending Timeout State
  const [autoMove36Enabled, setAutoMove36Enabled] = useState<boolean>(true);
  const [grandTurnLimitSeconds, setGrandTurnLimitSeconds] = useState<number>(5);
  const [grandTimeoutAction, setGrandTimeoutAction] = useState<'force_move' | 'pass_turn'>('force_move');
  const [autoMoveCountdownTenths, setAutoMoveCountdownTenths] = useState<number>(50);

  // Selection, Threat Inspection, Multi-step Lion/Eagle, Drops & Promotion Prompt
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedIsEnemy, setSelectedIsEnemy] = useState<boolean>(false);
  const [selectedDropCode, setSelectedDropCode] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [enemyMovesOverlay, setEnemyMovesOverlay] = useState<LegalMove[]>([]);
  const [attackersOfSelected, setAttackersOfSelected] = useState<ThreatSource[]>([]);
  const [blockedOverlay, setBlockedOverlay] = useState<BlockedSquare[]>([]);
  const [blindOverlay, setBlindOverlay] = useState<BlindSquare[]>([]);
  const [multiStepOrigin, setMultiStepOrigin] = useState<{ r: number; c: number } | null>(null);
  const [multiStepCurrent, setMultiStepCurrent] = useState<{ r: number; c: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    fromR: number;
    fromC: number;
    move: LegalMove;
  } | null>(null);
  const [lastMove, setLastMove] = useState<{ fromR: number; fromC: number; toR: number; toC: number } | null>(null);
  const [locatedPieceCode, setLocatedPieceCode] = useState<string | null>(null);
  const [hoverCoords, setHoverCoords] = useState<string>('--');
  const [victoryBanner, setVictoryBanner] = useState<{ title: string; reason: string } | null>(null);

  // Clocks (Default to 48-hour / 2-day correspondence clock)
  const [senteMs, setSenteMs] = useState<number>(TIME_CONTROL_SPECS.correspondence_2d.initialMs);
  const [goteMs, setGoteMs] = useState<number>(TIME_CONTROL_SPECS.correspondence_2d.initialMs);

  // Piece Inspector State
  const [inspectedCode, setInspectedCode] = useState<string>('K');
  const [inspectPromoted, setInspectPromoted] = useState<boolean>(false);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [legendSearch, setLegendSearch] = useState<string>('');

  // Camera & Viewport Refs
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compassCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef({
    x: 0,
    y: 0,
    cellSize: 48,
    isDragging: false,
    startX: 0,
    startY: 0,
    downClientX: 0,
    downClientY: 0,
    moved: false,
  });
  const [cellSizeState, setCellSizeState] = useState<number>(48);
  const [, forceCanvasTick] = useState(0);

  // Live Board Threat Map & Multi-Royal Status (knows every piece in reach & all surviving Royals!)
  const threatMap = useMemo(
    () => computeBoardThreatMap(board, scale, lionTradeBan),
    [board, scale, lionTradeBan]
  );
  const royalStatus = useMemo(
    () => getRoyalStatus(board, scale, threatMap),
    [board, scale, threatMap]
  );

  // Dojo State (208 Sandbox + Real Multi-Move Tsume + 3-Min Puzzle Rush)
  const [dojoSubTab, setDojoSubTab] = useState<'sandbox' | 'tsume' | 'rush'>('tsume');
  const [sandboxCode, setSandboxCode] = useState<string>('AB');
  const [sandboxDrillMode, setSandboxDrillMode] = useState<'offense' | 'blindspot' | 'sandbox'>('offense');
  const [sandboxTestPromo, setSandboxTestPromo] = useState<boolean>(false);
  const [sandboxShowVectors, setSandboxShowVectors] = useState<boolean>(true);
  const [sandboxBoard, setSandboxBoard] = useState<(BoardPiece | null)[][]>([]);
  const [sandboxPlayerPos, setSandboxPlayerPos] = useState<{ r: number; c: number }>({ r: 7, c: 5 });
  const [sandboxDangerSquares, setSandboxDangerSquares] = useState<Set<string>>(new Set());
  const [, setSandboxMovesUsed] = useState<number>(0);
  const [, setSandboxParMoves] = useState<number>(2);
  const [sandboxTargetsLeft, setSandboxTargetsLeft] = useState<number>(1);
  const [sandboxStatusMsg, setSandboxStatusMsg] = useState<string>('');
  const [sandboxSearch, setSandboxSearch] = useState<string>('');
  const [sandboxFilter, setSandboxFilter] = useState<string>('all');
  const [solvedPiecesMap, setSolvedPiecesMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('taikyoku_208_tactics_solved');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const dojoCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Curated Multi-Move Tsume & Puzzle Rush State
  const [activePuzzleId, setActivePuzzleId] = useState<string>('tsume-02');
  const [puzzleBoard, setPuzzleBoard] = useState<(BoardPiece | null)[][]>([]);
  const [puzzleHands, setPuzzleHands] = useState<{ sente: string[]; gote: string[] }>({ sente: [], gote: [] });
  const [puzzleStepIdx, setPuzzleStepIdx] = useState<number>(0);
  const [puzzleSelectedCell, setPuzzleSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [puzzleSelectedDrop, setPuzzleSelectedDrop] = useState<string | null>(null);
  const [puzzleLegalMoves, setPuzzleLegalMoves] = useState<LegalMove[]>([]);
  const [puzzleStatus, setPuzzleStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [puzzleFeedback, setPuzzleFeedback] = useState<string>('');
  const [puzzleShowHint, setPuzzleShowHint] = useState<boolean>(false);
  const [solvedPuzzlesMap, setSolvedPuzzlesMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('taikyoku_tsume_solved');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // 3-Minute Puzzle Rush State
  const [rushActive, setRushActive] = useState<boolean>(false);
  const [rushSecondsLeft, setRushSecondsLeft] = useState<number>(180);
  const [rushScore, setRushScore] = useState<number>(0);
  const [rushStrikes, setRushStrikes] = useState<number>(0);
  const [rushBestScore, setRushBestScore] = useState<number>(() => {
    return Number(localStorage.getItem('taikyoku_rush_best') || 0);
  });

  // Academy 40 Interactive Lessons State
  const [activeLessonId, setActiveLessonId] = useState<number>(1);
  const [academyChapterFilter, setAcademyChapterFilter] = useState<number>(0);
  const [lessonBoard, setLessonBoard] = useState<(BoardPiece | null)[][]>([]);
  const [lessonHands, setLessonHands] = useState<{ sente: string[]; gote: string[] }>({ sente: [], gote: [] });
  const [lessonSelectedCell, setLessonSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [lessonSelectedDrop, setLessonSelectedDrop] = useState<string | null>(null);
  const [lessonLegalMoves, setLessonLegalMoves] = useState<LegalMove[]>([]);
  const [lessonMultiOrigin, setLessonMultiOrigin] = useState<{ r: number; c: number } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState<boolean>(false);
  const [lessonFeedback, setLessonFeedback] = useState<string>('');
  const [lessonShowHint, setLessonShowHint] = useState<boolean>(false);
  const [completedLessonsMap, setCompletedLessonsMap] = useState<Record<number, boolean>>(() => {
    try {
      const raw = localStorage.getItem('taikyoku_academy_completed');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const academyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 4-Phase Interactive Strategy Curriculum State (Openers · Castling · Mid-Game · End-Game across all 5 scales)
  const [strategyPhaseFilter, setStrategyPhaseFilter] = useState<'all' | StrategyPhaseId>('all');
  const [strategyScaleFilter, setStrategyScaleFilter] = useState<'all' | BoardScaleId>('all');
  const [activeCurriculumId, setActiveCurriculumId] = useState<string>('opener-shogi9-ibisha');
  const [curriculumStepIdx, setCurriculumStepIdx] = useState<number>(0);
  const [curriculumMistakeMode, setCurriculumMistakeMode] = useState<boolean>(false);
  const [curriculumSelectedCell, setCurriculumSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [curriculumSelectedDrop, setCurriculumSelectedDrop] = useState<string | null>(null);
  const [curriculumLegalMoves, setCurriculumLegalMoves] = useState<LegalMove[]>([]);
  const [curriculumFeedback, setCurriculumFeedback] = useState<string>('');
  const [completedCurriculumMap, setCompletedCurriculumMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('taikyoku_strategy_curriculum_completed');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const strategyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Progression State
  const [progression, setProgression] = useState<PlayerProgression>(() => {
    try {
      const raw = localStorage.getItem('taikyoku_player_progression');
      if (raw) return JSON.parse(raw);
    } catch {
      // default
    }
    return {
      name: 'Samurai Tactician',
      xp: 350,
      level: 2,
      elo: 1250,
      selectedBadge: '初段 • Shodan',
      missions: { playMatch: 0, solveTsume: 0, completeLesson: 0 },
    };
  });

  const addPlayerXP = useCallback((amount: number, missionKey?: 'playMatch' | 'solveTsume' | 'completeLesson') => {
    setProgression(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 500) + 1;
      const updated: PlayerProgression = {
        ...prev,
        xp: newXp,
        level: newLevel,
        missions: {
          ...prev.missions,
          ...(missionKey ? { [missionKey]: prev.missions[missionKey] + 1 } : {}),
        },
      };
      try {
        localStorage.setItem('taikyoku_player_progression', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Online WebSocket & WebRTC P2P State
  const wsRef = useRef<WebSocket | null>(null);
  const [, setWsConnected] = useState<boolean>(false);
  const [myClientId, setMyClientId] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [queueSearching, setQueueSearching] = useState<string | null>(null);
  const [lobbyRooms, setLobbyRooms] = useState<
    { id: string; name: string; mode: string; scale: string; timeControl: string; senteName: string; goteName: string; status: string }[]
  >([]);
  const [tournamentsList, setTournamentsList] = useState<
    {
      id: string;
      title: string;
      size: number;
      scale: string;
      timeControl: string;
      status: string;
      participants: { id: string; name: string; elo: number; isBot: boolean; botId?: string }[];
      matches: {
        slotId: string;
        round: number;
        p1: { id: string; name: string; elo: number; isBot: boolean; botId?: string } | null;
        p2: { id: string; name: string; elo: number; isBot: boolean; botId?: string } | null;
        winner: { id: string; name: string; elo: number } | null;
        status: string;
      }[];
      champion: { id: string; name: string; elo: number } | null;
    }[]
  >([]);
  const [activeTournamentMatch, setActiveTournamentMatch] = useState<{
    tournamentId: string;
    slotId: string;
  } | null>(null);
  const [onlineMySide, setOnlineMySide] = useState<PlayerSide>('sente');
  const [, setChatLog] = useState<{ sender: string; text: string }[]>([]);

  // PeerJS / Manual WebRTC SDP State
  const [p2pStatus, setP2pStatus] = useState<string>('Ready to host or join');
  const [p2pRoomCode, setP2pRoomCode] = useState<string>('');
  const [p2pJoinInput, setP2pJoinInput] = useState<string>('');
  const [manualOfferOut, setManualOfferOut] = useState<string>('');
  const [manualOfferIn, setManualOfferIn] = useState<string>('');
  const [manualAnswerOut, setManualAnswerOut] = useState<string>('');
  const [manualAnswerIn, setManualAnswerIn] = useState<string>('');
  const peerRef = useRef<any>(null);
  const peerConnRef = useRef<any>(null);
  const manualPcRef = useRef<RTCPeerConnection | null>(null);
  const manualDcRef = useRef<RTCDataChannel | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  const selectedBot: AIMasterProfile = useMemo(
    () => AI_MASTERS.find(b => b.id === selectedBotId) || AI_MASTERS[7],
    [selectedBotId]
  );

  // ============================================================================
  // RETHOUGHT CAMERA & PRECISION VIEWPORT ENGINE (CLAMPED, SMOOTH, SECTOR-AWARE)
  // ============================================================================
  const clampCameraPosition = useCallback(
    (nx: number, ny: number, cs: number, targetScale: BoardScaleId = scale) => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return { x: nx, y: ny };
      const cfg = SCALE_CONFIGS[targetScale];
      const boardW = cfg.cols * cs;
      const boardH = cfg.rows * cs;
      const margin = 48;

      let clampedX = nx;
      let clampedY = ny;

      if (boardW + margin * 2 <= canvas.width) {
        clampedX = Math.floor((canvas.width - boardW) / 2);
      } else {
        const minX = canvas.width - boardW - margin;
        const maxX = margin;
        clampedX = Math.max(minX, Math.min(maxX, Math.round(nx)));
      }

      if (boardH + margin * 2 <= canvas.height) {
        clampedY = Math.floor((canvas.height - boardH) / 2);
      } else {
        const minY = canvas.height - boardH - margin;
        const maxY = margin;
        clampedY = Math.max(minY, Math.min(maxY, Math.round(ny)));
      }

      return { x: clampedX, y: clampedY };
    },
    [scale]
  );

  const setCameraZoomAroundPoint = useCallback(
    (newCs: number, pivotClientX?: number, pivotClientY?: number, targetScale: BoardScaleId = scale) => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      const minCs = targetScale === 'taikyoku36' ? 16 : 28;
      const maxCs = targetScale === 'dobutsu' ? 120 : targetScale === 'shogi9' ? 76 : 64;
      const clampedCs = Math.max(minCs, Math.min(maxCs, Math.round(newCs)));

      const rect = canvas.getBoundingClientRect();
      const px = pivotClientX !== undefined ? pivotClientX - rect.left : canvas.width / 2;
      const py = pivotClientY !== undefined ? pivotClientY - rect.top : canvas.height / 2;

      const oldCs = camRef.current.cellSize;
      const worldCol = (px - camRef.current.x) / oldCs;
      const worldRow = (py - camRef.current.y) / oldCs;

      const rawX = px - worldCol * clampedCs;
      const rawY = py - worldRow * clampedCs;
      const clamped = clampCameraPosition(rawX, rawY, clampedCs, targetScale);

      camRef.current.cellSize = clampedCs;
      camRef.current.x = clamped.x;
      camRef.current.y = clamped.y;
      setCellSizeState(clampedCs);
      forceCanvasTick(t => t + 1);
    },
    [scale, clampCameraPosition]
  );

  const fitBoardCamera = useCallback(
    (targetScale: BoardScaleId = scale) => {
      const vp = viewportRef.current;
      const canvas = mainCanvasRef.current;
      if (!vp || !canvas) return;
      canvas.width = vp.clientWidth;
      canvas.height = vp.clientHeight;

      const cfg = SCALE_CONFIGS[targetScale];
      const pad = 36;
      const availW = Math.max(200, canvas.width - pad * 2);
      const availH = Math.max(200, canvas.height - pad * 2);
      const cs = Math.max(
        16,
        Math.min(
          targetScale === 'dobutsu'
            ? 110
            : targetScale === 'shogi9'
            ? 64
            : targetScale === 'chu12' || targetScale === 'war12'
            ? 54
            : 36,
          Math.floor(Math.min(availW / cfg.cols, availH / cfg.rows))
        )
      );
      camRef.current.cellSize = cs;
      const clamped = clampCameraPosition(
        Math.floor((canvas.width - cfg.cols * cs) / 2),
        Math.floor((canvas.height - cfg.rows * cs) / 2),
        cs,
        targetScale
      );
      camRef.current.x = clamped.x;
      camRef.current.y = clamped.y;
      setCellSizeState(cs);
      forceCanvasTick(t => t + 1);
    },
    [scale, clampCameraPosition]
  );

  /**
   * 9-Sector Tactical Jump for Grand 36x36 (or any board scale)
   * Smoothly frames any 12x12 sector at a crisp, comfortable 38px cell size!
   */
  const focusBoardSector = useCallback(
    (rowFrac: number, colFrac: number, zoomCs?: number, targetScale: BoardScaleId = scale) => {
      const vp = viewportRef.current;
      const canvas = mainCanvasRef.current;
      if (!vp || !canvas) return;
      canvas.width = vp.clientWidth;
      canvas.height = vp.clientHeight;

      const cfg = SCALE_CONFIGS[targetScale];
      const cs = zoomCs || (targetScale === 'taikyoku36' ? 38 : camRef.current.cellSize);
      const targetCol = cfg.cols * colFrac;
      const targetRow = cfg.rows * rowFrac;

      const rawX = canvas.width / 2 - targetCol * cs;
      const rawY = canvas.height / 2 - targetRow * cs;
      const clamped = clampCameraPosition(rawX, rawY, cs, targetScale);

      camRef.current.cellSize = cs;
      camRef.current.x = clamped.x;
      camRef.current.y = clamped.y;
      setCellSizeState(cs);
      forceCanvasTick(t => t + 1);
    },
    [scale, clampCameraPosition]
  );

  // Keyboard Arrow / WASD smooth panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'match') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName || '')) return;
      const stepPx = camRef.current.cellSize * 3;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft' || e.key === 'a') dx = stepPx;
      else if (e.key === 'ArrowRight' || e.key === 'd') dx = -stepPx;
      else if (e.key === 'ArrowUp' || e.key === 'w') dy = stepPx;
      else if (e.key === 'ArrowDown' || e.key === 's') dy = -stepPx;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const clamped = clampCameraPosition(
          camRef.current.x + dx,
          camRef.current.y + dy,
          camRef.current.cellSize,
          scale
        );
        camRef.current.x = clamped.x;
        camRef.current.y = clamped.y;
        forceCanvasTick(t => t + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, scale, clampCameraPosition]);

  const startNewMatch = useCallback(
    (
      newScale: BoardScaleId = scale,
      newTimeControl?: TimeControlId,
      presetOverride?: 'balanced' | 'cavalry' | 'siege' | 'ascension'
    ) => {
      const effectiveTc: TimeControlId =
        newTimeControl || (newScale === 'taikyoku36' ? 'correspondence_2d' : timeControl);
      const freshBoard =
        newScale === 'war12'
          ? createWarBudgetCitadelBoard(presetOverride || warDraftPreset)
          : createInitialBoard(newScale);
      setScale(newScale);
      setTimeControl(effectiveTc);
      setBoard(freshBoard);
      setHands({ sente: [], gote: [] });
      setBanishedPieces({ sente: [], gote: [] });
      setTurn('sente');
      setMoveNumber(1);
      setMoveLog([]);
      setUndoStack([]);
      setPositionHistory({});
      setLionTradeBan(null);
      setSelectedCell(null);
      setSelectedIsEnemy(false);
      setSelectedDropCode(null);
      setLegalMoves([]);
      setEnemyMovesOverlay([]);
      setAttackersOfSelected([]);
      setBlockedOverlay([]);
      setBlindOverlay([]);
      setMultiStepOrigin(null);
      setMultiStepCurrent(null);
      setPendingPromotion(null);
      setPendingEvolution(null);
      setLastMove(null);
      setVictoryBanner(null);
      setAutoMoveCountdownTenths(grandTurnLimitSeconds * 10);

      const tc = TIME_CONTROL_SPECS[effectiveTc];
      setSenteMs(tc.initialMs);
      setGoteMs(tc.initialMs);

      setTimeout(() => {
        if (newScale === 'taikyoku36') {
          focusBoardSector(0.78, 0.5, 36, 'taikyoku36');
        } else {
          fitBoardCamera(newScale);
        }
      }, 25);
    },
    [scale, timeControl, warDraftPreset, grandTurnLimitSeconds, fitBoardCamera, focusBoardSector]
  );

  useEffect(() => {
    const onResize = () => {
      if (scale === 'taikyoku36') {
        const vp = viewportRef.current;
        const canvas = mainCanvasRef.current;
        if (vp && canvas) {
          canvas.width = vp.clientWidth;
          canvas.height = vp.clientHeight;
          const clamped = clampCameraPosition(camRef.current.x, camRef.current.y, camRef.current.cellSize, scale);
          camRef.current.x = clamped.x;
          camRef.current.y = clamped.y;
          forceCanvasTick(t => t + 1);
        }
      } else {
        fitBoardCamera(scale);
      }
    };
    window.addEventListener('resize', onResize);
    setTimeout(() => {
      if (scale === 'taikyoku36') {
        focusBoardSector(0.78, 0.5, 36, 'taikyoku36');
      } else {
        fitBoardCamera(scale);
      }
    }, 35);
    return () => window.removeEventListener('resize', onResize);
  }, [
    scale,
    leftInspectorOpen,
    rightPanelOpenMobile,
    matchSetupOpen,
    warDrawerOpen,
    royalsDrawerOpen,
    activeTab,
    fitBoardCamera,
    focusBoardSector,
    clampCameraPosition,
  ]);

  // Update Compass Canvas whenever inspected piece changes
  useEffect(() => {
    const baseSpec = PIECE_DB[inspectedCode];
    if (!baseSpec) return;
    const promoCode = getScalePromotesTo(inspectedCode, scale) || baseSpec.promotesTo;
    const activeSpec = inspectPromoted && promoCode && PIECE_DB[promoCode] ? PIECE_DB[promoCode] : baseSpec;
    drawCompassMatrix(compassCanvasRef.current, activeSpec);
  }, [inspectedCode, inspectPromoted, scale, leftInspectorOpen, activeTab]);

  // ============================================================================
  // MATCH EXECUTION & TURN TRANSITION ENGINE
  // ============================================================================
  const finalizeTurn = useCallback(
    (
      nextBoard: (BoardPiece | null)[][],
      nextHands: { sente: string[]; gote: string[] },
      completedBy: PlayerSide,
      nextLionBan: { bannedOwner: PlayerSide } | null
    ) => {
      const nextTurn: PlayerSide = completedBy === 'sente' ? 'gote' : 'sente';

      setMultiStepOrigin(null);
      setMultiStepCurrent(null);
      setSelectedCell(null);
      setSelectedIsEnemy(false);
      setSelectedDropCode(null);
      setLegalMoves([]);
      setEnemyMovesOverlay([]);
      setAttackersOfSelected([]);
      setBlockedOverlay([]);
      setBlindOverlay([]);
      setLionTradeBan(nextLionBan);

      // Fischer Clock Increment
      const inc = TIME_CONTROL_SPECS[timeControl].incrementMs;
      if (completedBy === 'sente') setSenteMs(ms => ms + inc);
      else setGoteMs(ms => ms + inc);

      // Unified Win Condition Evaluation (3x4 Try Rule, 36x36 Dual-Royal Survival & Total Elimination, 9x9/12x12 Checkmate)
      const winEval = evaluateMatchWinConditions(nextBoard, completedBy, nextTurn, scale, nextHands);
      setMatchStatusNotice(winEval.statusBanner || null);

      if (winEval.winner) {
        Sound.playSolvedChime();
        const winnerTitle =
          winEval.winner === 'draw'
            ? 'Match Drawn!'
            : winEval.winType === 'try_rule'
            ? `${winEval.winner === 'sente' ? '▲ Sente' : '△ Gote'} Wins by Try Rule (トライ)!`
            : winEval.winType === 'checkmate'
            ? `Checkmate (詰み)! ${winEval.winner === 'sente' ? '▲ Sente' : '△ Gote'} Wins!`
            : `${winEval.winner === 'sente' ? '▲ Sente (Black)' : '△ Gote (White)'} Wins!`;

        setVictoryBanner({
          title: winnerTitle,
          reason: winEval.reason || 'Victory achieved.',
        });
        addPlayerXP(150, 'playMatch');

        if (activeTournamentMatch && wsRef.current && winEval.winner === 'sente') {
          wsRef.current.send(
            JSON.stringify({
              type: 'tournament:report_win',
              tournamentId: activeTournamentMatch.tournamentId,
              slotId: activeTournamentMatch.slotId,
              winnerId: myClientId,
            })
          );
          setActiveTournamentMatch(null);
        }
        return;
      }

      if (winEval.inCheckSide) {
        Sound.playCheckAlert();
      }

      // Sennichite (千日手 4-Fold Repetition) check
      const hash = computePositionHash(nextBoard, nextTurn, nextHands);
      setPositionHistory(prev => {
        const count = (prev[hash] || 0) + 1;
        if (count >= 4) {
          setVictoryBanner({
            title: 'Draw by Sennichite (千日手 • 4-Fold Repetition)',
            reason: 'The exact same board position, turn, and captured hands have occurred 4 times.',
          });
        }
        return { ...prev, [hash]: count };
      });

      setTurn(nextTurn);
      setMoveNumber(m => m + 1);
    },
    [scale, timeControl, addPlayerXP, activeTournamentMatch, myClientId]
  );

  const performBoardMove = useCallback(
    (
      fromR: number,
      fromC: number,
      moveObj: LegalMove,
      promoteDecision: boolean,
      isRemote = false,
      autoSecondStep?: LegalMove | null
    ) => {
      const moving = board[fromR]?.[fromC];
      if (!moving) return;

      const cfg = SCALE_CONFIGS[scale];
      const nextBoard = cloneBoard(board);
      const nextHands = { sente: [...hands.sente], gote: [...hands.gote] };

      if (!multiStepCurrent) {
        setUndoStack(prev => [
          ...prev.slice(-30),
          {
            board: cloneBoard(board),
            hands: { sente: [...hands.sente], gote: [...hands.gote] },
            banishedPieces: { sente: [...banishedPieces.sente], gote: [...banishedPieces.gote] },
            turn,
            moveNumber,
            moveLog: [...moveLog],
            lionTradeBan,
          },
        ]);
      }

      const target = nextBoard[moveObj.r][moveObj.c];
      const movingPiece: BoardPiece = { ...moving };

      if (promoteDecision && !movingPiece.promoted && scale !== 'war12') {
        const promoTarget = getScalePromotesTo(movingPiece.code, scale);
        if (promoTarget && PIECE_DB[promoTarget]) {
          movingPiece.code = promoTarget;
          movingPiece.promoted = true;
        }
      }

      let banishedThisTurn: string | null = null;
      if (target && target.owner !== movingPiece.owner && cfg.allowDrops && !PIECE_DB[target.code]?.isRoyal) {
        const demotedCode = target.baseCode || PIECE_DB[target.code]?.unpromotedCode || target.code;
        if (scale === 'war12' && target.parachuted) {
          // Once-Per-Piece Parachute Rule: recapturing a parachuted piece banishes it permanently!
          banishedThisTurn = demotedCode;
          setBanishedPieces(prev => ({
            ...prev,
            [movingPiece.owner]: [...prev[movingPiece.owner], demotedCode],
          }));
        } else {
          nextHands[movingPiece.owner].push(demotedCode);
        }
      }

      let nextLionBan: { bannedOwner: PlayerSide } | null = null;
      if ((scale === 'chu12' || scale === 'war12') && target && target.code === 'LN' && movingPiece.code !== 'LN') {
        nextLionBan = { bannedOwner: target.owner };
      }

      nextBoard[moveObj.r][moveObj.c] = movingPiece;
      nextBoard[fromR][fromC] = null;

      let finalR = moveObj.r;
      let finalC = moveObj.c;
      if (autoSecondStep) {
        const t2 = nextBoard[autoSecondStep.r][autoSecondStep.c];
        if (t2 && t2.owner !== movingPiece.owner && cfg.allowDrops && !PIECE_DB[t2.code]?.isRoyal) {
          const demoted2 = t2.baseCode || t2.code;
          if (scale === 'war12' && t2.parachuted) {
            setBanishedPieces(prev => ({
              ...prev,
              [movingPiece.owner]: [...prev[movingPiece.owner], demoted2],
            }));
          } else {
            nextHands[movingPiece.owner].push(demoted2);
          }
        }
        nextBoard[autoSecondStep.r][autoSecondStep.c] = movingPiece;
        if (autoSecondStep.r !== moveObj.r || autoSecondStep.c !== moveObj.c) {
          nextBoard[moveObj.r][moveObj.c] = null;
        }
        finalR = autoSecondStep.r;
        finalC = autoSecondStep.c;
      }

      // Apply Fire Demon (DM) Active 8-Square AoE Burn AND Passive Suicide-Burn Trap
      const fireResult = applyFireDemonEffects(nextBoard, finalR, finalC, movingPiece.owner);
      const burnedCount = fireResult.burned.length;

      // War-Budget 12x12: 4-Tier XP/Capture Star Evolution (Pawn -> Tier 2 -> Tier 3 -> Tier 4 King/Prince)
      const isHumanTurn =
        !isRemote &&
        (opponentMode === 'pass' ||
          (opponentMode === 'ai' && movingPiece.owner === 'sente') ||
          ((opponentMode === 'ws_online' || opponentMode === 'webrtc_p2p') && movingPiece.owner === onlineMySide));

      let evolvedLabel = '';
      let triggeredHumanEvolution = false;
      if (scale === 'war12' && !fireResult.selfBurned && nextBoard[finalR]?.[finalC] && !PIECE_DB[movingPiece.code]?.isRoyal) {
        const inEnemyPromoZone =
          movingPiece.owner === 'sente' ? finalR < cfg.promoRanks : finalR >= cfg.rows - cfg.promoRanks;
        const captureStars = target
          ? (PIECE_DB[target.code]?.value || 2) >= 10
            ? 2
            : 1
          : burnedCount > 0
          ? 1
          : 0;
        const zoneStar = inEnemyPromoZone && (movingPiece.stars || 0) === 0 ? 1 : 0;
        const gainedStars = captureStars + zoneStar;

        if (gainedStars > 0) {
          const prevStars = movingPiece.stars || 0;
          const prevTier = movingPiece.tier || 1;
          const newStars = Math.min(3, prevStars + gainedStars);
          movingPiece.stars = newStars;

          if (newStars >= prevTier && prevTier < 4) {
            const branches = getEvolutionBranches(movingPiece.code, prevTier);
            if (branches.length > 0) {
              if (isHumanTurn) {
                triggeredHumanEvolution = true;
                setPendingEvolution({
                  r: finalR,
                  c: finalC,
                  pieceCode: movingPiece.code,
                  newStars,
                  currentTier: prevTier,
                  options: branches,
                  nextBoard,
                  nextHands,
                  completedBy: movingPiece.owner,
                  nextLionBan,
                });
              } else {
                // AI automatically picks its highest-value evolution branch!
                const chosen = branches[0];
                movingPiece.code = chosen.code;
                movingPiece.promoted = true;
                movingPiece.tier = chosen.tier;
                evolvedLabel = ` ★Evolved→[${chosen.code}]`;
              }
            }
          }
        }
      }

      Sound.playKomaClack(Boolean(target) || burnedCount > 0);
      setBoard(nextBoard);
      setHands(nextHands);
      setLastMove({
        fromR: multiStepOrigin ? multiStepOrigin.r : fromR,
        fromC: multiStepOrigin ? multiStepOrigin.c : fromC,
        toR: finalR,
        toC: finalC,
      });

      const sideSym = movingPiece.owner === 'sente' ? '▲' : '△';
      const fileNum = cfg.cols - finalC;
      const rankNum = finalR + 1;
      const iguiTag = moveObj.kind === 'igui' || autoSecondStep?.kind === 'igui' ? ' (Igui 居食い)' : '';
      const capSym = target
        ? banishedThisTurn
          ? `x[${target.code}](Banished!)`
          : `x[${target.code}]`
        : '-';
      const promoSym = promoteDecision && scale !== 'war12' ? ` +(${movingPiece.code})` : evolvedLabel;
      const burnSym = fireResult.selfBurned
        ? ' [Suicide-Burned by Enemy DM!]'
        : burnedCount > 0
        ? ` [AoE Burned ${burnedCount}: ${fireResult.burned.map(b => b.code).join(',')}]`
        : '';
      const logLine = `${moveNumber}. ${sideSym}[${moving.code}] ${fileNum}-${rankNum}${capSym}${promoSym}${iguiTag}${burnSym}`;

      setMoveLog(prev => [{ id: Date.now() + Math.random(), text: logLine, owner: movingPiece.owner }, ...prev]);

      if (triggeredHumanEvolution) {
        return;
      }

      if (!fireResult.selfBurned && isHumanTurn && moveObj.allowsSecondStep && !multiStepCurrent && !autoSecondStep) {
        const secondAnalysis = analyzePieceMovesOnBoard(nextBoard, moveObj.r, moveObj.c, {
          isSecondStep: true,
          originSquare: { r: fromR, c: fromC },
          scale,
        });
        if (secondAnalysis.moves.length > 0) {
          setMultiStepOrigin({ r: fromR, c: fromC });
          setMultiStepCurrent({ r: moveObj.r, c: moveObj.c });
          setSelectedCell({ r: moveObj.r, c: moveObj.c });
          setSelectedIsEnemy(false);
          setLegalMoves(secondAnalysis.moves);
          setEnemyMovesOverlay([]);
          setAttackersOfSelected([]);
          return;
        }
      }

      if (!isRemote) {
        const payload = {
          kind: 'move',
          fromR,
          fromC,
          moveObj,
          promoteDecision,
        };
        if (opponentMode === 'ws_online' && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'room:move', action: payload, finishTurn: true }));
        } else if (opponentMode === 'webrtc_p2p') {
          if (peerConnRef.current?.open) peerConnRef.current.send(payload);
          else if (manualDcRef.current?.readyState === 'open') manualDcRef.current.send(JSON.stringify(payload));
        }
      }

      finalizeTurn(nextBoard, nextHands, movingPiece.owner, nextLionBan);
    },
    [board, hands, banishedPieces, scale, turn, moveNumber, moveLog, lionTradeBan, multiStepCurrent, multiStepOrigin, opponentMode, onlineMySide, finalizeTurn]
  );

  const performHandDrop = useCallback(
    (code: string, toR: number, toC: number, owner: PlayerSide, isRemote = false) => {
      const cfg = SCALE_CONFIGS[scale];
      if (board[toR]?.[toC]) return;

      setUndoStack(prev => [
        ...prev.slice(-30),
        {
          board: cloneBoard(board),
          hands: { sente: [...hands.sente], gote: [...hands.gote] },
          banishedPieces: { sente: [...banishedPieces.sente], gote: [...banishedPieces.gote] },
          turn,
          moveNumber,
          moveLog: [...moveLog],
          lionTradeBan,
        },
      ]);

      const nextBoard = cloneBoard(board);
      const droppedPiece = makePiece(code, owner, false, code);
      if (scale === 'war12') {
        droppedPiece.parachuted = true;
      }
      nextBoard[toR][toC] = droppedPiece;

      const nextHands = { sente: [...hands.sente], gote: [...hands.gote] };
      const idx = nextHands[owner].indexOf(code);
      if (idx !== -1) nextHands[owner].splice(idx, 1);

      Sound.playKomaClack(false);
      setBoard(nextBoard);
      setHands(nextHands);
      setLastMove({ fromR: -1, fromC: -1, toR, toC });

      const sideSym = owner === 'sente' ? '▲' : '△';
      const dropLabel = scale === 'war12' ? 'Parachute Drop — Once Only' : 'Drop';
      const logLine = `${moveNumber}. ${sideSym}[${code}]*${cfg.cols - toC}-${toR + 1} (${dropLabel})`;
      setMoveLog(prev => [{ id: Date.now() + Math.random(), text: logLine, owner }, ...prev]);

      if (!isRemote) {
        const payload = { kind: 'drop', code, toR, toC, owner };
        if (opponentMode === 'ws_online' && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'room:move', action: payload, finishTurn: true }));
        } else if (opponentMode === 'webrtc_p2p') {
          if (peerConnRef.current?.open) peerConnRef.current.send(payload);
          else if (manualDcRef.current?.readyState === 'open') manualDcRef.current.send(JSON.stringify(payload));
        }
      }

      finalizeTurn(nextBoard, nextHands, owner, null);
    },
    [board, hands, banishedPieces, scale, turn, moveNumber, moveLog, lionTradeBan, opponentMode, finalizeTurn]
  );

  // Trigger AI Master Move when it is Gote's turn in 'ai' mode
  useEffect(() => {
    if (activeTab !== 'match' || opponentMode !== 'ai' || turn !== 'gote' || victoryBanner || multiStepCurrent || pendingEvolution) {
      return;
    }
    const timer = setTimeout(() => {
      const action = chooseAIMasterAction(board, 'gote', scale, selectedBot, hands, lionTradeBan);
      if (!action) {
        setVictoryBanner({
          title: '▲ Sente (Black) Wins!',
          reason: `${selectedBot.name} has no legal moves remaining.`,
        });
        return;
      }
      if (action.type === 'drop' && action.dropCode) {
        performHandDrop(action.dropCode, action.move.r, action.move.c, 'gote', true);
      } else if (action.type === 'move' && action.fromR !== undefined && action.fromC !== undefined) {
        performBoardMove(
          action.fromR,
          action.fromC,
          action.move,
          Boolean(action.promote),
          true,
          action.secondStepMove
        );
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [activeTab, opponentMode, turn, victoryBanner, multiStepCurrent, pendingEvolution, board, scale, selectedBot, hands, lionTradeBan, performBoardMove, performHandDrop]);

  // GRAND 36x36 ADJUSTABLE TURN TIMER (Forces a move OR passes/gives up turn — NEVER ends the game!)
  const passTurnNow = useCallback(
    (fromTimerExpiry = false) => {
      if (victoryBanner || pendingPromotion || pendingEvolution) return;
      const sideLabel = turn === 'sente' ? '▲ Sente' : '△ Gote';
      const nextSide: PlayerSide = turn === 'sente' ? 'gote' : 'sente';
      setSelectedCell(null);
      setSelectedIsEnemy(false);
      setSelectedDropCode(null);
      setLegalMoves([]);
      setEnemyMovesOverlay([]);
      setAttackersOfSelected([]);
      setBlockedOverlay([]);
      setBlindOverlay([]);
      setMultiStepOrigin(null);
      setMultiStepCurrent(null);

      const logLine = `${moveNumber}. ${
        turn === 'sente' ? '▲' : '△'
      } [TURN PASSED — ${fromTimerExpiry ? `${grandTurnLimitSeconds}s Turn Timer Expired` : 'Voluntary Turn Yield'}]`;
      setMoveLog(prev => [{ id: Date.now() + Math.random(), text: logLine, owner: turn }, ...prev]);
      setMoveNumber(m => m + 1);
      setTurn(nextSide);
      setAutoMoveCountdownTenths(grandTurnLimitSeconds * 10);
      setMatchStatusNotice(
        fromTimerExpiry
          ? `⏱️ [${grandTurnLimitSeconds}s Turn Timer Expired] ${sideLabel} gave up their turn — game continues (${
              nextSide === 'sente' ? '▲ Sente' : '△ Gote'
            } to move).`
          : `⏭ ${sideLabel} yielded their turn to ${nextSide === 'sente' ? '▲ Sente' : '△ Gote'} — game continues.`
      );
      Sound.playKomaClack(false);
    },
    [victoryBanner, pendingPromotion, pendingEvolution, turn, moveNumber, grandTurnLimitSeconds]
  );

  const executeAutoCommanderMoveNow = useCallback(() => {
    if (victoryBanner || multiStepCurrent || pendingPromotion || pendingEvolution) return;
    const commanderProfile = AI_MASTERS[17] || selectedBot;
    const action = chooseAIMasterAction(board, turn, scale, commanderProfile, hands, lionTradeBan);
    if (!action) {
      passTurnNow(true);
      return;
    }
    setMatchStatusNotice(
      `⚡ [${grandTurnLimitSeconds}s Turn Timer] Forced move for ${
        turn === 'sente' ? '▲ Sente' : '△ Gote'
      } and gave up turn — game continues!`
    );
    if (action.type === 'drop' && action.dropCode) {
      performHandDrop(action.dropCode, action.move.r, action.move.c, turn, false);
    } else if (action.type === 'move' && action.fromR !== undefined && action.fromC !== undefined) {
      performBoardMove(
        action.fromR,
        action.fromC,
        action.move,
        Boolean(action.promote),
        false,
        action.secondStepMove
      );
    }
  }, [
    victoryBanner,
    multiStepCurrent,
    pendingPromotion,
    pendingEvolution,
    selectedBot,
    board,
    turn,
    scale,
    hands,
    lionTradeBan,
    grandTurnLimitSeconds,
    passTurnNow,
    performHandDrop,
    performBoardMove,
  ]);

  useEffect(() => {
    setAutoMoveCountdownTenths(grandTurnLimitSeconds * 10);
  }, [turn, moveNumber, scale, grandTurnLimitSeconds]);

  useEffect(() => {
    if (
      activeTab !== 'match' ||
      scale !== 'taikyoku36' ||
      !autoMove36Enabled ||
      victoryBanner ||
      multiStepCurrent ||
      pendingPromotion ||
      pendingEvolution
    ) {
      return;
    }
    // Only count down during a human-controlled turn (Sente in AI mode, or both sides in Pass & Play)
    if (opponentMode === 'ai' && turn !== 'sente') return;

    const timer = setInterval(() => {
      setAutoMoveCountdownTenths(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [activeTab, scale, autoMove36Enabled, victoryBanner, multiStepCurrent, pendingPromotion, pendingEvolution, opponentMode, turn]);

  useEffect(() => {
    if (
      activeTab === 'match' &&
      scale === 'taikyoku36' &&
      autoMove36Enabled &&
      autoMoveCountdownTenths === 0 &&
      !victoryBanner
    ) {
      setAutoMoveCountdownTenths(grandTurnLimitSeconds * 10);
      if (grandTimeoutAction === 'pass_turn') {
        passTurnNow(true);
      } else {
        executeAutoCommanderMoveNow();
      }
    }
  }, [
    activeTab,
    scale,
    autoMove36Enabled,
    autoMoveCountdownTenths,
    victoryBanner,
    grandTurnLimitSeconds,
    grandTimeoutAction,
    passTurnNow,
    executeAutoCommanderMoveNow,
  ]);

  // Local Countdown Clock Tick (On Grand 36x36, clock expiration NEVER ends the game — it forces a move or turn pass!)
  useEffect(() => {
    if (activeTab !== 'match' || victoryBanner) return;
    const interval = setInterval(() => {
      if (turn === 'sente') {
        setSenteMs(prev => {
          if (prev <= 1000) {
            if (scale === 'taikyoku36') {
              if (grandTimeoutAction === 'pass_turn') passTurnNow(true);
              else executeAutoCommanderMoveNow();
              return TIME_CONTROL_SPECS[timeControl].initialMs;
            }
            setVictoryBanner({ title: '△ Gote Wins on Time!', reason: 'Sente’s match clock expired.' });
            return 0;
          }
          return prev - 1000;
        });
      } else {
        setGoteMs(prev => {
          if (prev <= 1000) {
            if (scale === 'taikyoku36') {
              if (grandTimeoutAction === 'pass_turn') passTurnNow(true);
              else executeAutoCommanderMoveNow();
              return TIME_CONTROL_SPECS[timeControl].initialMs;
            }
            setVictoryBanner({ title: '▲ Sente Wins on Time!', reason: 'Gote’s match clock expired.' });
            return 0;
          }
          return prev - 1000;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab, turn, victoryBanner, scale, timeControl, grandTimeoutAction, passTurnNow, executeAutoCommanderMoveNow]);

  // ============================================================================
  // MAIN CANVAS RENDER LOOP & MINIMAP
  // ============================================================================
  useEffect(() => {
    if (activeTab !== 'match') return;
    const canvas = mainCanvasRef.current;
    const vp = viewportRef.current;
    if (!canvas) return;
    if (vp && vp.clientWidth > 0 && vp.clientHeight > 0 && (canvas.width !== vp.clientWidth || canvas.height !== vp.clientHeight)) {
      canvas.width = vp.clientWidth;
      canvas.height = vp.clientHeight;
      if (scale === 'taikyoku36') {
        const clamped = clampCameraPosition(camRef.current.x, camRef.current.y, camRef.current.cellSize, scale);
        camRef.current.x = clamped.x;
        camRef.current.y = clamped.y;
      } else {
        const cfg = SCALE_CONFIGS[scale];
        const pad = 36;
        const cs = Math.max(
          16,
          Math.min(
            scale === 'dobutsu' ? 110 : scale === 'shogi9' ? 58 : 46,
            Math.floor(Math.min((canvas.width - pad * 2) / cfg.cols, (canvas.height - pad * 2) / cfg.rows))
          )
        );
        camRef.current.cellSize = cs;
        camRef.current.x = Math.floor((canvas.width - cfg.cols * cs) / 2);
        camRef.current.y = Math.floor((canvas.height - cfg.rows * cs) / 2);
      }
    }

    renderShogiBoardCanvas(canvas, {
      board,
      scale,
      camX: camRef.current.x,
      camY: camRef.current.y,
      cellSize: camRef.current.cellSize,
      labelMode,
      selectedCell,
      selectedIsEnemy,
      legalMoves,
      enemyMovesOverlay,
      attackersOfSelected,
      threatMap,
      showThreatCircles,
      blockedOverlay,
      blindOverlay,
      showVectorTags: showMatchVectorTags,
      locatedPieceCode,
      lastMove,
    });

    // Draw Minimap
    const mini = minimapCanvasRef.current;
    if (mini) {
      const mCtx = mini.getContext('2d');
      if (mCtx) {
        const mw = mini.width;
        const mh = mini.height;
        mCtx.clearRect(0, 0, mw, mh);
        const rows = board.length;
        const cols = board[0]?.length || rows;
        const tw = mw / cols;
        const th = mh / rows;

        mCtx.fillStyle = '#c89d54';
        mCtx.fillRect(0, 0, mw, mh);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = board[r][c];
            if (!p) continue;
            const enemyAtt =
              p.owner === 'sente' ? threatMap[r]?.[c]?.goteAttackers : threatMap[r]?.[c]?.senteAttackers;
            if (locatedPieceCode && p.code === locatedPieceCode) {
              mCtx.fillStyle = '#0284c7';
            } else if (enemyAtt && enemyAtt.length > 0) {
              mCtx.fillStyle = '#ef4444';
            } else if (PIECE_DB[p.code]?.isRoyal) {
              mCtx.fillStyle = '#eab308';
            } else {
              mCtx.fillStyle = p.owner === 'sente' ? '#0f172a' : '#fffbeb';
            }
            mCtx.fillRect(c * tw, r * th, Math.max(2, tw - 0.5), Math.max(2, th - 0.5));
          }
        }

        const totalW = cols * camRef.current.cellSize;
        const totalH = rows * camRef.current.cellSize;
        const vx = (-camRef.current.x / totalW) * mw;
        const vy = (-camRef.current.y / totalH) * mh;
        const vw = (canvas.width / totalW) * mw;
        const vh = (canvas.height / totalH) * mh;
        mCtx.strokeStyle = '#dc2626';
        mCtx.lineWidth = 2;
        mCtx.strokeRect(vx, vy, vw, vh);
      }
    }
  });

  /**
   * Selects ANY piece on the board (friendly OR enemy) to show:
   * - Its moves (green if friendly, RED if enemy!)
   * - Which opposing pieces can take it right now (`attackersOfSelected` with red circles & arrows)
   * - If friendly piece is threatened by enemy piece(s), also overlays the threatening enemy pieces' attack moves in red!
   */
  const selectAndInspectBoardSquare = useCallback(
    (r: number, c: number) => {
      const p = board[r]?.[c];
      if (!p) {
        setSelectedCell(null);
        setSelectedIsEnemy(false);
        setSelectedDropCode(null);
        setLegalMoves([]);
        setEnemyMovesOverlay([]);
        setAttackersOfSelected([]);
        setBlockedOverlay([]);
        setBlindOverlay([]);
        return;
      }

      setInspectedCode(p.code);
      setInspectPromoted(false);
      setSelectedDropCode(null);
      setSelectedCell({ r, c });

      const analysis = getStrictLegalMovesForSquare(board, r, c, scale, { lionTradeBan });
      const attackers =
        p.owner === 'sente' ? threatMap[r]?.[c]?.goteAttackers || [] : threatMap[r]?.[c]?.senteAttackers || [];
      setAttackersOfSelected(attackers);

      if (p.owner === turn) {
        // Friendly piece selected
        setSelectedIsEnemy(false);
        setLegalMoves(analysis.moves);
        setBlockedOverlay(analysis.blockedSquares);
        setBlindOverlay(analysis.blindSquares);

        // Also gather the enemy moves of any enemy pieces that can take this selected piece!
        const combinedEnemyMoves: LegalMove[] = [];
        attackers.forEach(att => {
          const attMoves = getStrictLegalMovesForSquare(board, att.r, att.c, scale, { lionTradeBan }).moves;
          combinedEnemyMoves.push(...attMoves);
        });
        setEnemyMovesOverlay(combinedEnemyMoves);
      } else {
        // Enemy piece selected -> Show ALL of its moves in RED, and show which of OUR pieces can take it!
        setSelectedIsEnemy(true);
        setLegalMoves([]);
        setEnemyMovesOverlay(analysis.moves);
        setBlockedOverlay(analysis.blockedSquares);
        setBlindOverlay(analysis.blindSquares);
      }

      Sound.playKomaClack(false);
    },
    [board, scale, lionTradeBan, threatMap, turn]
  );

  // Main Board Click Handler
  const handleMainBoardCellClick = (r: number, c: number) => {
    setLocatedPieceCode(null);
    if (victoryBanner || pendingPromotion || pendingEvolution) return;

    // War-Budget 12x12 Custom Pre-Game Draft Mode: Place/Replace pieces on rows 8..11 (outside Locked Citadel)
    if (scale === 'war12' && warDraftCustomMode) {
      if (r < 8) {
        setMatchStatusNotice('War-Budget Draft: Place pieces on your starting 4 ranks (Ranks 9–12, rows 8–11).');
        return;
      }
      const existing = board[r]?.[c];
      if (existing?.citadelGuard) {
        setMatchStatusNotice('Locked Royal Citadel: King [K], Crown Prince [CP], and Citadel Guard cannot be removed.');
        Sound.playCheckAlert();
        return;
      }
      const next = cloneBoard(board);
      const newPiece = makePiece(warDraftBrushCode, 'sente', false, warDraftBrushCode);
      newPiece.stars = 0;
      newPiece.tier = 1;
      next[r][c] = newPiece;
      const newCost = calculateBoardArmyCost(next, 'sente');
      if (newCost > DEFAULT_WAR_BUDGET_KOKU) {
        setMatchStatusNotice(
          `War Budget Exceeded (${newCost} / ${DEFAULT_WAR_BUDGET_KOKU} Koku)! Right-click a drafted unit to refund Koku or pick a lighter piece.`
        );
        Sound.playCheckAlert();
        return;
      }
      // Mirror onto Gote's corresponding square if not a Citadel square
      const gr = 11 - r;
      const gc = 11 - c;
      if (!next[gr]?.[gc]?.citadelGuard) {
        const gPiece = makePiece(warDraftBrushCode, 'gote', false, warDraftBrushCode);
        gPiece.stars = 0;
        gPiece.tier = 1;
        next[gr][gc] = gPiece;
      }
      setBoard(next);
      setInspectedCode(warDraftBrushCode);
      setMatchStatusNotice(
        `Drafted [${warDraftBrushCode}] ${PIECE_DB[warDraftBrushCode]?.name} (${getPieceWarBudgetCost(
          warDraftBrushCode
        )} Koku) at ${12 - c}-${r + 1}. Budget: ${newCost} / ${DEFAULT_WAR_BUDGET_KOKU} Koku.`
      );
      Sound.playKomaClack(false);
      return;
    }

    const canActThisTurn =
      opponentMode === 'pass' ||
      (opponentMode === 'ai' && turn === 'sente') ||
      ((opponentMode === 'ws_online' || opponentMode === 'webrtc_p2p') && turn === onlineMySide);

    // 1. If in sequential 2nd-step Lion/Eagle mode
    if (multiStepCurrent && canActThisTurn) {
      if (r === multiStepCurrent.r && c === multiStepCurrent.c) {
        // Clicking the Lion itself stays in place and finishes the 1-step move
        finalizeTurn(board, hands, turn, lionTradeBan);
        return;
      }
      const mv = legalMoves.find(m => m.r === r && m.c === c);
      if (mv) {
        performBoardMove(multiStepCurrent.r, multiStepCurrent.c, mv, false, false);
        return;
      }
      // If user clicked outside the 2nd-step radius, finish the 1-step Lion move cleanly so the board never locks
      finalizeTurn(board, hands, turn, lionTradeBan);
      return;
    }

    // 2. If dropping a piece from hand
    if (selectedDropCode && canActThisTurn) {
      const dropMv = legalMoves.find(m => m.r === r && m.c === c);
      if (dropMv) {
        performHandDrop(selectedDropCode, r, c, turn, false);
        return;
      }
    }

    // 3. If moving an already-selected friendly board piece to a valid destination
    if (selectedCell && !selectedIsEnemy && canActThisTurn) {
      const mv = legalMoves.find(m => m.r === r && m.c === c);
      if (mv) {
        if (
          scale !== 'war12' &&
          mv.canPromote &&
          !mv.mustPromote &&
          (scale !== 'taikyoku36' || !taikyokuAutoPromote)
        ) {
          setPendingPromotion({ fromR: selectedCell.r, fromC: selectedCell.c, move: mv });
        } else {
          performBoardMove(selectedCell.r, selectedCell.c, mv, Boolean(mv.mustPromote || mv.canPromote), false);
        }
        return;
      }
    }

    // 4. Otherwise, select/inspect the clicked piece (whether friendly OR enemy!)
    selectAndInspectBoardSquare(r, c);
  };

  /**
   * Loads any curated scenario or User Test preset directly onto the Match Board
   * and focuses the camera on the action square.
   */
  const loadInteractivePresetOnBoard = useCallback(
    (preset: InteractiveBoardPreset) => {
      const cloned = cloneBoard(preset.board);
      setScale(preset.scale);
      setBoard(cloned);
      setHands(preset.hands ? { sente: [...preset.hands.sente], gote: [...preset.hands.gote] } : { sente: [], gote: [] });
      setTurn(preset.turn);
      setMoveNumber(1);
      setMoveLog([{ id: Date.now(), text: `Loaded Scenario: ${preset.label}`, owner: preset.turn }]);
      setUndoStack([]);
      setPositionHistory({});
      setLionTradeBan(null);
      setMultiStepOrigin(null);
      setMultiStepCurrent(null);
      setPendingPromotion(null);
      setLastMove(null);
      setVictoryBanner(null);
      setMatchStatusNotice(preset.description);
      if (preset.botId) {
        setOpponentMode('ai');
        setSelectedBotId(preset.botId);
      }
      setActiveTab('match');

      setTimeout(() => {
        if (preset.scale === 'taikyoku36') {
          const sq = preset.selectSquare || { r: 14, c: 17 };
          focusBoardSector((sq.r + 0.5) / 36, (sq.c + 0.5) / 36, 38, 'taikyoku36');
        } else {
          fitBoardCamera(preset.scale);
        }
        if (preset.selectSquare) {
          const sq = preset.selectSquare;
          const p = cloned[sq.r]?.[sq.c];
          if (p) {
            setInspectedCode(p.code);
            setSelectedCell(sq);
            setSelectedIsEnemy(p.owner !== preset.turn);
            const analysis = getStrictLegalMovesForSquare(cloned, sq.r, sq.c, preset.scale);
            setLegalMoves(p.owner === preset.turn ? analysis.moves : []);
            setEnemyMovesOverlay(p.owner !== preset.turn ? analysis.moves : []);
          }
        }
      }, 40);
    },
    [fitBoardCamera, focusBoardSector]
  );

  const handleSelectHandDrop = (code: string, owner: PlayerSide) => {
    if (owner !== turn || multiStepCurrent) return;
    setSelectedCell(null);
    setSelectedIsEnemy(false);
    setEnemyMovesOverlay([]);
    setAttackersOfSelected([]);
    setSelectedDropCode(code);
    setInspectedCode(code);
    const { drops, illegalReasons } = getLegalDropsForHandPiece(board, owner, code, scale, hands);
    setLegalMoves(drops);
    setBlockedOverlay(illegalReasons);
    setBlindOverlay([]);
    Sound.playKomaClack(false);
  };

  // Compute Capturable Targets for the currently selected square (for the Threat & Capture Radar UI)
  const selectedTargetsInReach = useMemo(() => {
    if (!selectedCell) return [];
    const activeList = selectedIsEnemy ? enemyMovesOverlay : legalMoves;
    return activeList
      .filter(m => m.kind === 'capture' && board[m.r]?.[m.c])
      .map(m => ({
        r: m.r,
        c: m.c,
        code: board[m.r][m.c]!.code,
        owner: board[m.r][m.c]!.owner,
      }));
  }, [selectedCell, selectedIsEnemy, legalMoves, enemyMovesOverlay, board]);

  // ============================================================================
  // DOJO PART 1: 208-PIECE SANDBOX & LIMITS TRAINER (11x11)
  // ============================================================================
  const initSandboxBoard = useCallback(
    (code: string = sandboxCode, mode: 'offense' | 'blindspot' | 'sandbox' = sandboxDrillMode, promo: boolean = sandboxTestPromo) => {
      const N = 11;
      const b: (BoardPiece | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
      const danger = new Set<string>();
      const baseSpec = PIECE_DB[code];
      const activeCode = promo && baseSpec?.promotesTo && PIECE_DB[baseSpec.promotesTo] ? baseSpec.promotesTo : code;
      const spec = PIECE_DB[activeCode] || PIECE_DB.AB;

      if (mode === 'offense') {
        const sr = 7;
        const sc = 5;
        b[sr][sc] = makePiece(activeCode, 'sente', promo);
        if (spec.special !== 'knight') {
          b[6][4] = makePiece('P', 'sente');
        }
        const step1 = analyzePieceMovesOnBoard(b, sr, sc).moves;
        let chosen1 = step1[0] || { r: 6, c: 5, kind: 'step' as const };
        step1.forEach(m => {
          const d = Math.abs(m.r - sr) + Math.abs(m.c - sc);
          const bestD = Math.abs(chosen1.r - sr) + Math.abs(chosen1.c - sc);
          if (d > bestD || m.kind === 'hook' || m.kind === 'jump') chosen1 = m;
        });

        const temp = cloneBoard(b);
        temp[chosen1.r][chosen1.c] = temp[sr][sc];
        temp[sr][sc] = null;
        const step2 = analyzePieceMovesOnBoard(temp, chosen1.r, chosen1.c).moves;
        let chosen2 = step2.find(m => m.r !== sr || m.c !== sc) || chosen1;
        step2.forEach(m => {
          if (m.r < chosen2.r) chosen2 = m;
        });

        if (chosen2.r === chosen1.r && chosen2.c === chosen1.c) {
          b[chosen1.r][chosen1.c] = makePiece('K', 'gote');
          setSandboxTargetsLeft(1);
          setSandboxParMoves(1);
        } else {
          b[chosen1.r][chosen1.c] = makePiece('G', 'gote');
          b[chosen2.r][chosen2.c] = makePiece('K', 'gote');
          setSandboxTargetsLeft(2);
          setSandboxParMoves(2);
        }
        setSandboxPlayerPos({ r: sr, c: sc });
        setSandboxStatusMsg(`Capture all target tokens using [${spec.code}] ${spec.name}'s exact movement vectors.`);
      } else if (mode === 'blindspot') {
        b[5][5] = makePiece(activeCode, 'gote', promo);
        const bossMoves = analyzePieceMovesOnBoard(b, 5, 5).moves;
        bossMoves.forEach(m => danger.add(`${m.r},${m.c}`));
        const safeStart = danger.has('8,5') ? { r: 8, c: 3 } : { r: 8, c: 5 };
        b[safeStart.r][safeStart.c] = makePiece('G', 'sente');
        setSandboxPlayerPos(safeStart);
        setSandboxTargetsLeft(1);
        setSandboxParMoves(4);
        setSandboxStatusMsg(
          `BLIND-SPOT EXPLOIT: Enemy [${spec.code}] guards the red squares! Guide your Gold General [G] through its unguarded blind spot to capture [${spec.code}] in ≤4 moves.`
        );
      } else {
        b[5][5] = makePiece(activeCode, 'sente', promo);
        b[3][5] = makePiece('P', 'sente');
        b[3][3] = makePiece('G', 'gote');
        b[5][8] = makePiece('S', 'gote');
        setSandboxPlayerPos({ r: 5, c: 5 });
        setSandboxTargetsLeft(0);
        setSandboxParMoves(99);
        setSandboxStatusMsg(
          `FREE SANDBOX: Click any green square to move [${spec.code}]. Right-click any square to place/cycle test blockers and inspect BLIND & MAX tags.`
        );
      }

      setSandboxBoard(b);
      setSandboxDangerSquares(danger);
      setSandboxMovesUsed(0);
    },
    [sandboxCode, sandboxDrillMode, sandboxTestPromo]
  );

  useEffect(() => {
    initSandboxBoard(sandboxCode, sandboxDrillMode, sandboxTestPromo);
  }, [sandboxCode, sandboxDrillMode, sandboxTestPromo, initSandboxBoard]);

  // Render Dojo Canvas
  useEffect(() => {
    if (activeTab !== 'dojo') return;
    const canvas = dojoCanvasRef.current;
    if (!canvas) return;

    if (dojoSubTab === 'sandbox') {
      const analysis = analyzePieceMovesOnBoard(sandboxBoard, sandboxPlayerPos.r, sandboxPlayerPos.c);
      const sbThreat = computeBoardThreatMap(sandboxBoard, 'chu12');
      renderShogiBoardCanvas(canvas, {
        board: sandboxBoard,
        scale: 'chu12',
        camX: 20,
        camY: 20,
        cellSize: 40,
        labelMode,
        selectedCell: sandboxPlayerPos,
        legalMoves: analysis.moves,
        threatMap: sbThreat,
        showThreatCircles: true,
        blockedOverlay: analysis.blockedSquares,
        blindOverlay: analysis.blindSquares,
        showVectorTags: sandboxShowVectors,
        locatedPieceCode: null,
        lastMove: null,
        dangerSquares: sandboxDangerSquares,
      });
    } else {
      const activePuz = CURATED_PUZZLES.find(p => p.id === activePuzzleId) || CURATED_PUZZLES[0];
      const cfg = SCALE_CONFIGS[activePuz.scale];
      const cs = activePuz.scale === 'dobutsu' ? 96 : activePuz.scale === 'shogi9' ? 46 : 36;
      const ox = Math.floor((canvas.width - cfg.cols * cs) / 2);
      const oy = Math.floor((canvas.height - cfg.rows * cs) / 2);
      const puzThreat = computeBoardThreatMap(puzzleBoard, activePuz.scale);
      renderShogiBoardCanvas(canvas, {
        board: puzzleBoard,
        scale: activePuz.scale,
        camX: ox,
        camY: oy,
        cellSize: cs,
        labelMode,
        selectedCell: puzzleSelectedCell,
        legalMoves: puzzleLegalMoves,
        threatMap: puzThreat,
        showThreatCircles: true,
        blockedOverlay: [],
        blindOverlay: [],
        showVectorTags: false,
        locatedPieceCode: null,
        lastMove: null,
      });
    }
  });

  // ============================================================================
  // DOJO PART 2: AUTHENTIC MULTI-MOVE TSUME-SHOGI & PUZZLE RUSH
  // ============================================================================
  const loadCuratedPuzzle = useCallback((puzzleId: string) => {
    const puz = CURATED_PUZZLES.find(p => p.id === puzzleId) || CURATED_PUZZLES[0];
    const cfg = SCALE_CONFIGS[puz.scale];
    const b: (BoardPiece | null)[][] = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null));
    puz.pieces.forEach(item => {
      b[item.r][item.c] = makePiece(item.code, item.owner, Boolean(item.promoted));
    });
    setActivePuzzleId(puz.id);
    setPuzzleBoard(b);
    setPuzzleHands({ sente: [...puz.senteHand], gote: [...puz.goteHand] });
    setPuzzleStepIdx(0);
    setPuzzleSelectedCell(null);
    setPuzzleSelectedDrop(null);
    setPuzzleLegalMoves([]);
    setPuzzleStatus('playing');
    setPuzzleFeedback(puz.description);
    setPuzzleShowHint(false);
  }, []);

  useEffect(() => {
    loadCuratedPuzzle(activePuzzleId);
  }, [activePuzzleId, loadCuratedPuzzle]);

  useEffect(() => {
    if (!rushActive) return;
    const timer = setInterval(() => {
      setRushSecondsLeft(sec => {
        if (sec <= 1) {
          setRushActive(false);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rushActive]);

  const advancePuzzleStepOrWin = (puz: TsumePuzzle, _currentBoard: (BoardPiece | null)[][], stepIndex: number) => {
    const expected = puz.solutionSteps[stepIndex];
    if (expected?.defenderReply) {
      setPuzzleFeedback(`Defender Reply: ${expected.defenderReply.explanation}`);
      setTimeout(() => {
        setPuzzleBoard(prev => {
          const next = cloneBoard(prev);
          const rep = expected.defenderReply!;
          const defPiece = next[rep.fromR]?.[rep.fromC];
          if (defPiece) {
            next[rep.toR][rep.toC] = defPiece;
            next[rep.fromR][rep.fromC] = null;
          }
          return next;
        });
        Sound.playKomaClack(true);
        setPuzzleStepIdx(stepIndex + 1);
      }, 480);
    } else if (stepIndex + 1 < puz.solutionSteps.length) {
      setPuzzleStepIdx(stepIndex + 1);
    } else {
      setPuzzleStatus('solved');
      Sound.playSolvedChime();
      setPuzzleFeedback(`★ SOLVED: ${puz.title}! Authentic forced tactical sequence complete.`);
      setSolvedPuzzlesMap(prev => {
        const next = { ...prev, [puz.id]: true };
        try {
          localStorage.setItem('taikyoku_tsume_solved', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      addPlayerXP(80, 'solveTsume');

      if (rushActive) {
        setRushScore(s => {
          const nextScore = s + 1;
          if (nextScore > rushBestScore) {
            setRushBestScore(nextScore);
            localStorage.setItem('taikyoku_rush_best', String(nextScore));
          }
          const nextPuz = CURATED_PUZZLES[nextScore % CURATED_PUZZLES.length];
          setTimeout(() => loadCuratedPuzzle(nextPuz.id), 650);
          return nextScore;
        });
      }
    }
  };

  // ============================================================================
  // ACADEMY (40 BESPOKE INTERACTIVE LESSONS)
  // ============================================================================
  const loadAcademyLesson = useCallback((lessonId: number) => {
    const les = ACADEMY_LESSONS_40.find(l => l.id === lessonId) || ACADEMY_LESSONS_40[0];
    const cfg = SCALE_CONFIGS[les.scale];
    const b: (BoardPiece | null)[][] = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null));
    les.pieces.forEach(p => {
      b[p.r][p.c] = makePiece(p.code, p.owner, Boolean(p.promoted));
    });
    setActiveLessonId(les.id);
    setLessonBoard(b);
    setLessonHands({ sente: [...les.senteHand], gote: [...les.goteHand] });
    setLessonSelectedCell(null);
    setLessonSelectedDrop(null);
    setLessonLegalMoves([]);
    setLessonMultiOrigin(null);
    setLessonCompleted(false);
    setLessonFeedback(les.taskPrompt);
    setLessonShowHint(false);
  }, []);

  useEffect(() => {
    loadAcademyLesson(activeLessonId);
  }, [activeLessonId, loadAcademyLesson]);

  useEffect(() => {
    if (activeTab !== 'academy') return;
    const canvas = academyCanvasRef.current;
    if (!canvas) return;
    const les = ACADEMY_LESSONS_40.find(l => l.id === activeLessonId) || ACADEMY_LESSONS_40[0];
    const cfg = SCALE_CONFIGS[les.scale];
    const cs = les.scale === 'dobutsu' ? 96 : les.scale === 'shogi9' ? 46 : 36;
    const ox = Math.floor((canvas.width - cfg.cols * cs) / 2);
    const oy = Math.floor((canvas.height - cfg.rows * cs) / 2);
    const lesThreat = computeBoardThreatMap(lessonBoard, les.scale);

    renderShogiBoardCanvas(canvas, {
      board: lessonBoard,
      scale: les.scale,
      camX: ox,
      camY: oy,
      cellSize: cs,
      labelMode,
      selectedCell: lessonSelectedCell,
      legalMoves: lessonLegalMoves,
      threatMap: lesThreat,
      showThreatCircles: true,
      blockedOverlay: [],
      blindOverlay: [],
      showVectorTags: false,
      locatedPieceCode: null,
      lastMove: null,
    });
  });

  // ============================================================================
  // 4-PHASE SHŌGI STRATEGY CURRICULUM (OPENERS · CASTLING · MID-GAME · END-GAME)
  // ============================================================================
  const activeCurriculumModule: StrategyCurriculumModule = useMemo(
    () => SHOGI_STRATEGY_CURRICULUM.find(m => m.id === activeCurriculumId) || SHOGI_STRATEGY_CURRICULUM[0],
    [activeCurriculumId]
  );

  const curriculumBoardSnapshot = useMemo(() => {
    if (curriculumMistakeMode) {
      return buildMistakeRefutationBoardState(activeCurriculumModule);
    }
    return buildCurriculumBoardState(activeCurriculumModule, curriculumStepIdx);
  }, [activeCurriculumModule, curriculumStepIdx, curriculumMistakeMode]);

  const loadCurriculumModule = useCallback((modId: string) => {
    const mod = SHOGI_STRATEGY_CURRICULUM.find(m => m.id === modId) || SHOGI_STRATEGY_CURRICULUM[0];
    setActiveCurriculumId(mod.id);
    setCurriculumStepIdx(0);
    setCurriculumMistakeMode(false);
    setCurriculumSelectedCell(null);
    setCurriculumSelectedDrop(null);
    setCurriculumLegalMoves([]);
    const step0 = mod.guidedSteps[0];
    setCurriculumFeedback(step0 ? `Step 1: ${step0.title} — ${step0.coachCommentary}` : mod.winPlanSummary);
  }, []);

  useEffect(() => {
    loadCurriculumModule(activeCurriculumId);
  }, [activeCurriculumId, loadCurriculumModule]);

  const advanceCurriculumStep = useCallback(
    (mod: StrategyCurriculumModule, nextIdx: number) => {
      Sound.playKomaClack(true);
      if (nextIdx >= mod.guidedSteps.length) {
        setCurriculumStepIdx(mod.guidedSteps.length);
        Sound.playSolvedChime();
        setCurriculumFeedback(
          `★ MASTERED: ${mod.title}! All ${mod.guidedSteps.length} guided strategy steps completed. Click "Spar vs. AI Master from Here" to test this formation live!`
        );
        setCompletedCurriculumMap(prev => {
          const updated = { ...prev, [mod.id]: true };
          try {
            localStorage.setItem('taikyoku_strategy_curriculum_completed', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
        addPlayerXP(90, 'completeLesson');
      } else {
        setCurriculumStepIdx(nextIdx);
        const nextStep = mod.guidedSteps[nextIdx];
        const prevStep = mod.guidedSteps[nextIdx - 1];
        const replyPrefix = prevStep?.opponentReply ? `Opponent Reply: ${prevStep.opponentReply.replyNote} · ` : '';
        setCurriculumFeedback(`${replyPrefix}Next — ${nextStep.title}: ${nextStep.coachCommentary}`);
      }
    },
    [addPlayerXP]
  );

  const sparFromCurriculumPosition = useCallback(
    (mod: StrategyCurriculumModule) => {
      const snap = curriculumMistakeMode
        ? buildMistakeRefutationBoardState(mod)
        : buildCurriculumBoardState(mod, curriculumStepIdx);
      const firstStep = mod.guidedSteps[Math.min(curriculumStepIdx, mod.guidedSteps.length - 1)];
      const selectSq =
        firstStep && firstStep.fromR !== undefined && firstStep.fromC !== undefined
          ? { r: firstStep.fromR, c: firstStep.fromC }
          : { r: firstStep?.toR ?? 0, c: firstStep?.toC ?? 0 };
      loadInteractivePresetOnBoard({
        label: `${mod.title} (${mod.kanji})`,
        scale: mod.scale,
        turn: 'sente',
        board: cloneBoard(snap.board),
        hands: { sente: [...snap.hands.sente], gote: [...snap.hands.gote] },
        selectSquare: selectSq,
        botId: mod.championBotId,
        description: `Live Strategy Sparring — ${mod.title}: ${mod.winPlanSummary}`,
      });
    },
    [curriculumMistakeMode, curriculumStepIdx, loadInteractivePresetOnBoard]
  );

  // Render Strategy Curriculum Canvas with Tactical Plan Arrows & Key Squares
  useEffect(() => {
    if (activeTab !== 'strategies') return;
    const canvas = strategyCanvasRef.current;
    if (!canvas) return;
    const mod = activeCurriculumModule;
    const cfg = SCALE_CONFIGS[mod.scale];

    // For 36x36 curriculum modules, auto-focus camera around the active tactical cluster!
    let cs = mod.scale === 'dobutsu' ? 102 : mod.scale === 'shogi9' ? 48 : mod.scale === 'taikyoku36' ? 28 : 38;
    let ox = Math.floor((canvas.width - cfg.cols * cs) / 2);
    let oy = Math.floor((canvas.height - cfg.rows * cs) / 2);

    if (mod.scale === 'taikyoku36') {
      const focusStep = mod.guidedSteps[Math.min(curriculumStepIdx, mod.guidedSteps.length - 1)] || mod.guidedSteps[0];
      const centerR = focusStep ? focusStep.toR : 15;
      const centerC = focusStep ? focusStep.toC : 17;
      cs = 32;
      ox = Math.floor(canvas.width / 2 - (centerC + 0.5) * cs);
      oy = Math.floor(canvas.height / 2 - (centerR + 0.5) * cs);
    }

    const activeStep =
      !curriculumMistakeMode && curriculumStepIdx < mod.guidedSteps.length
        ? mod.guidedSteps[curriculumStepIdx]
        : mod.guidedSteps[mod.guidedSteps.length - 1];

    const arrows = curriculumMistakeMode ? mod.mistakeDemo.arrows : activeStep?.arrows || [];
    const keySquares = curriculumMistakeMode ? mod.mistakeDemo.keySquares : activeStep?.keySquares || [];
    const stratThreat = computeBoardThreatMap(curriculumBoardSnapshot.board, mod.scale);

    renderShogiBoardCanvas(canvas, {
      board: curriculumBoardSnapshot.board,
      scale: mod.scale,
      camX: ox,
      camY: oy,
      cellSize: cs,
      labelMode,
      selectedCell: curriculumSelectedCell,
      legalMoves: curriculumLegalMoves,
      threatMap: stratThreat,
      showThreatCircles: true,
      blockedOverlay: [],
      blindOverlay: [],
      showVectorTags: false,
      locatedPieceCode: null,
      lastMove: curriculumBoardSnapshot.lastMove,
      strategyArrows: arrows,
      strategyKeySquares: keySquares,
    });
  });

  // ============================================================================
  // WEBSOCKET SERVER CONNECTION (MATCHMAKING, CLOCKS & TOURNAMENTS)
  // ============================================================================
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws?.send(JSON.stringify({ type: 'profile:update', name: progression.name, elo: progression.elo }));
      };

      ws.onmessage = ev => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'welcome') {
            setMyClientId(data.clientId);
          } else if (data.type === 'lobby:update') {
            setOnlineCount(data.onlineCount || 1);
            setLobbyRooms(data.rooms || []);
            setTournamentsList(data.tournaments || []);
          } else if (data.type === 'queue:searching') {
            setQueueSearching(`${data.mode.toUpperCase()} (${data.scale} • ${data.timeControl})`);
          } else if (data.type === 'room:created') {
            setOnlineMySide(data.mySide);
          } else if (data.type === 'room:start') {
            setQueueSearching(null);
            setOnlineMySide(data.mySide);
            setOpponentMode('ws_online');
            const rScale = (data.room.scale as BoardScaleId) || 'shogi9';
            const rTc = (data.room.timeControl as TimeControlId) || 'rapid';
            setTimeControl(rTc);
            startNewMatch(rScale, rTc);
            setSenteMs(data.room.senteMs);
            setGoteMs(data.room.goteMs);
            setActiveTab('match');
          } else if (data.type === 'room:move') {
            setSenteMs(data.senteMs);
            setGoteMs(data.goteMs);
            if (data.senderId !== myClientId && data.action) {
              if (data.action.kind === 'move') {
                performBoardMove(
                  data.action.fromR,
                  data.action.fromC,
                  data.action.moveObj,
                  Boolean(data.action.promoteDecision),
                  true
                );
              } else if (data.action.kind === 'drop') {
                performHandDrop(data.action.code, data.action.toR, data.action.toC, data.action.owner, true);
              }
            }
          } else if (data.type === 'room:chat') {
            setChatLog(prev => [...prev, { sender: data.sender, text: data.text }]);
          } else if (data.type === 'room:timeout') {
            setVictoryBanner({
              title: `${data.winner === 'sente' ? '▲ Sente' : '△ Gote'} Wins on Time!`,
              reason: 'Server-synchronized match clock reached 0:00.',
            });
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => setWsConnected(false);
    } catch {
      // ignore offline
    }
    return () => {
      ws?.close();
    };
  }, []);

  // ============================================================================
  // SYNCHRONIZED MULTI-FILE .ZIP PROJECT EXPORTER
  // ============================================================================
  const exportFullProjectZip = async () => {
    setIsExportingZip(true);
    try {
      const res = await fetch('/api/project-files');
      const data = await res.json();
      const zip = new JSZip();
      if (data.files) {
        Object.entries(data.files).forEach(([relPath, content]) => {
          zip.file(relPath, String(content));
        });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taikyoku-shogi-complete-suite.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    } finally {
      setIsExportingZip(false);
    }
  };

  // ============================================================================
  // WEBRTC P2P HANDLERS (PeerJS + Manual SDP)
  // ============================================================================
  const hostPeerRoom = () => {
    const PeerCls = (window as any).Peer;
    if (!PeerCls) {
      setP2pStatus('PeerJS script loading — or use Manual SDP below.');
      return;
    }
    const code = 'taikyoku-' + Math.floor(1000 + Math.random() * 9000);
    if (peerRef.current) peerRef.current.destroy();
    const peer = new PeerCls(code);
    peerRef.current = peer;
    setOnlineMySide('sente');
    setP2pStatus(`Creating Room ${code}...`);

    peer.on('open', (id: string) => {
      setP2pRoomCode(id);
      setP2pStatus(`Hosting [${id}] as ▲ Sente. Share code with friend!`);
    });
    peer.on('connection', (conn: any) => {
      peerConnRef.current = conn;
      conn.on('open', () => {
        setOpponentMode('webrtc_p2p');
        setP2pStatus('Connected P2P! You play ▲ Sente.');
        setActiveTab('match');
      });
      conn.on('data', (payload: any) => {
        if (payload?.kind === 'move') {
          performBoardMove(payload.fromR, payload.fromC, payload.moveObj, Boolean(payload.promoteDecision), true);
        } else if (payload?.kind === 'drop') {
          performHandDrop(payload.code, payload.toR, payload.toC, payload.owner, true);
        }
      });
    });
  };

  const joinPeerRoom = () => {
    const PeerCls = (window as any).Peer;
    if (!PeerCls || !p2pJoinInput.trim()) return;
    if (peerRef.current) peerRef.current.destroy();
    const peer = new PeerCls();
    peerRef.current = peer;
    setOnlineMySide('gote');
    setP2pStatus(`Joining ${p2pJoinInput.trim()}...`);

    peer.on('open', () => {
      const conn = peer.connect(p2pJoinInput.trim(), { reliable: true });
      peerConnRef.current = conn;
      conn.on('open', () => {
        setOpponentMode('webrtc_p2p');
        setP2pStatus('Connected P2P! You play △ Gote.');
        setActiveTab('match');
      });
      conn.on('data', (payload: any) => {
        if (payload?.kind === 'move') {
          performBoardMove(payload.fromR, payload.fromC, payload.moveObj, Boolean(payload.promoteDecision), true);
        } else if (payload?.kind === 'drop') {
          performHandDrop(payload.code, payload.toR, payload.toC, payload.owner, true);
        }
      });
    });
  };

  const generateManualOffer = async () => {
    setOnlineMySide('sente');
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    manualPcRef.current = pc;
    const dc = pc.createDataChannel('taikyoku');
    manualDcRef.current = dc;
    dc.onopen = () => {
      setOpponentMode('webrtc_p2p');
      setP2pStatus('Manual WebRTC Connected! You play ▲ Sente.');
      setActiveTab('match');
    };
    dc.onmessage = ev => {
      const payload = JSON.parse(ev.data);
      if (payload?.kind === 'move') {
        performBoardMove(payload.fromR, payload.fromC, payload.moveObj, Boolean(payload.promoteDecision), true);
      } else if (payload?.kind === 'drop') {
        performHandDrop(payload.code, payload.toR, payload.toC, payload.owner, true);
      }
    };
    pc.onicecandidate = e => {
      if (!e.candidate && pc.localDescription) {
        setManualOfferOut(btoa(JSON.stringify(pc.localDescription)));
        setP2pStatus('Offer token ready — copy and send to opponent.');
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  };

  const generateManualAnswer = async () => {
    if (!manualOfferIn.trim()) return;
    setOnlineMySide('gote');
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    manualPcRef.current = pc;
    pc.ondatachannel = ev => {
      manualDcRef.current = ev.channel;
      ev.channel.onopen = () => {
        setOpponentMode('webrtc_p2p');
        setP2pStatus('Manual WebRTC Connected! You play △ Gote.');
        setActiveTab('match');
      };
      ev.channel.onmessage = msgEv => {
        const payload = JSON.parse(msgEv.data);
        if (payload?.kind === 'move') {
          performBoardMove(payload.fromR, payload.fromC, payload.moveObj, Boolean(payload.promoteDecision), true);
        } else if (payload?.kind === 'drop') {
          performHandDrop(payload.code, payload.toR, payload.toC, payload.owner, true);
        }
      };
    };
    pc.onicecandidate = e => {
      if (!e.candidate && pc.localDescription) {
        setManualAnswerOut(btoa(JSON.stringify(pc.localDescription)));
        setP2pStatus('Answer token ready — copy and send back to Host.');
      }
    };
    const offerDesc = JSON.parse(atob(manualOfferIn.trim()));
    await pc.setRemoteDescription(offerDesc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  };

  const completeManualHandshake = async () => {
    if (!manualAnswerIn.trim() || !manualPcRef.current) return;
    const ansDesc = JSON.parse(atob(manualAnswerIn.trim()));
    await manualPcRef.current.setRemoteDescription(ansDesc);
  };

  const formatClock = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const senteWarKoku = useMemo(
    () => (scale === 'war12' ? calculateBoardArmyCost(board, 'sente') : 0),
    [board, scale]
  );

  const activeInspectedSpec = useMemo(() => {
    const base = PIECE_DB[inspectedCode] || PIECE_DB.K;
    const promoCode = getScalePromotesTo(inspectedCode, scale) || base.promotesTo;
    if (inspectPromoted && promoCode && PIECE_DB[promoCode]) {
      return PIECE_DB[promoCode];
    }
    return base;
  }, [inspectedCode, inspectPromoted, scale]);

  const allLegendEntries = useMemo(() => {
    return [
      ...RAW_LEGEND.map(([c, n, k]) => ({ code: c, name: n, kanji: k, promotedOnly: false })),
      ...PROMOTED_ONLY_LEGEND.map(([c, n, k]) => ({ code: c, name: n, kanji: k, promotedOnly: true })),
    ];
  }, []);

  const isTrainingTab =
    activeTab === 'strategies' || activeTab === 'dojo' || activeTab === 'academy' || activeTab === 'legend';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0e14] text-slate-100 overflow-hidden">
      {/* ==================== MOBILE-FIRST TOPBAR (MAIN VIEW & COLLAPSIBLE MENU HUB) ==================== */}
      <header className="min-h-12 shrink-0 bg-slate-950 border-b border-slate-800 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 z-30 overflow-x-auto">
        {/* Zone 1: Compact Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#play"
            onClick={e => {
              e.preventDefault();
              setActiveTab('match');
            }}
            className="font-kanji font-black text-sm sm:text-base tracking-wide text-amber-200 whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>大局将棋</span>
            <span className="hidden lg:inline text-amber-300/90 font-sans font-bold text-xs">· Taikyoku Shōgi</span>
          </a>
        </div>

        {/* Zone 2: Main 4 Navigation Tabs (Always Visible & Responsive in Topbar) */}
        <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('match')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'match'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span>Play</span>
            <span
              className={`hidden xl:inline text-[10px] px-1.5 py-0.2 rounded ${
                activeTab === 'match' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
              }`}
            >
              5 Scales
            </span>
          </button>

          <button
            onClick={() => setActiveTab('strategies')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isTrainingTab
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span>Training</span>
            <span
              className={`hidden xl:inline text-[10px] px-1.5 py-0.2 rounded ${
                isTrainingTab ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Strategies·Dojo·208
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'tournaments'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span>Online</span>
            <span
              className={`hidden xl:inline text-[10px] px-1.5 py-0.2 rounded ${
                activeTab === 'tournaments' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              P2P & Events
            </span>
          </button>

          <button
            onClick={() => {
              setTestSuiteSummary(runAllUserTests(testCategoryFilter === 'all' ? undefined : testCategoryFilter));
              setActiveTab('tests');
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                : 'text-emerald-300 hover:text-emerald-200 hover:bg-slate-800/70'
            }`}
          >
            <span>Settings</span>
            <span
              className={`hidden xl:inline text-[10px] px-1.5 py-0.2 rounded font-mono-code ${
                activeTab === 'tests' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-950 text-emerald-300'
              }`}
            >
              Agents·331
            </span>
          </button>
        </nav>

        {/* Zone 3: Topbar Collapsible Area Toggles & Export Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === 'match' && (
            <>
              <button
                onClick={() => setLeftInspectorOpen(o => !o)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  leftInspectorOpen
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Collapsible Left Piece Inspector & 208 Directory"
              >
                {leftInspectorOpen ? '◀ Inspector' : '▶ Inspector'}
              </button>

              <button
                onClick={() => setMatchSetupOpen(o => !o)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  matchSetupOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
                }`}
                title="Toggle Collapsible Match Setup, AI Master, Castles & Display Options"
              >
                {matchSetupOpen ? '▴ Setup & Bot' : '▾ Setup & Bot'}
              </button>

              <button
                onClick={() => setRightPanelOpenMobile(o => !o)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  rightPanelOpenMobile
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Collapsible Radar Minimap & Move Record (Kifu)"
              >
                {rightPanelOpenMobile ? '▶ Kifu' : '◀ Kifu'}
              </button>
            </>
          )}

          {(activeTab === 'strategies' || activeTab === 'dojo' || activeTab === 'academy') && (
            <button
              onClick={() => setTrainingSidebarOpen(o => !o)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 ${
                trainingSidebarOpen
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-700 text-amber-300'
              }`}
            >
              {trainingSidebarOpen ? '◀ Hide List' : '▶ Modules / Lessons'}
            </button>
          )}

          <button
            onClick={exportFullProjectZip}
            disabled={isExportingZip}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
            title="Download Complete Standalone Project .ZIP"
          >
            {isExportingZip ? '...' : '.ZIP'}
          </button>
        </div>
      </header>

      {/* ==================== UNIFIED TRAINING HUB SUB-NAVIGATION BAR ==================== */}
      {isTrainingTab && (
        <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 z-20 text-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                activeTab === 'strategies' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-300 hover:text-white'
              }`}
            >
              1. Strategy Curriculum (Openers · Castles · Mid · End)
            </button>
            <button
              onClick={() => setActiveTab('dojo')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                activeTab === 'dojo' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Dojo (Tsume, Rush & 208 Sandbox)
            </button>
            <button
              onClick={() => setActiveTab('academy')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                activeTab === 'academy' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Academy (40 Lessons)
            </button>
            <button
              onClick={() => setActiveTab('legend')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors whitespace-nowrap ${
                activeTab === 'legend' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              4. 208+ Piece Legend
            </button>
          </div>
          <span className="text-slate-400 hidden xl:inline truncate">
            4-Phase Strategy Curriculum: Guided moves with board arrows, Mistake Refutation demos & 1-Click AI Master Sparring.
          </span>
        </div>
      )}

      {/* ==================== VIEW 1: 5-SCALE MATCH BOARD (INCL. WAR-BUDGET 12x12 & GRAND 36x36) ==================== */}
      {activeTab === 'match' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* COMPACT SINGLE-LINE TOP COMMAND STRIP (Always Visible, Keeps ≥80% Viewport for Board!) */}
          <div className="bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 z-20 text-xs overflow-x-auto">
            {/* Left: 5 Board Scale Pills */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0">
              {(['dobutsu', 'shogi9', 'chu12', 'war12', 'taikyoku36'] as BoardScaleId[]).map(sId => (
                <button
                  key={sId}
                  onClick={() => startNewMatch(sId, sId === 'taikyoku36' ? 'correspondence_2d' : timeControl)}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    scale === sId
                      ? sId === 'war12'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {sId === 'dobutsu'
                    ? '3×4'
                    : sId === 'shogi9'
                    ? '9×9'
                    : sId === 'chu12'
                    ? 'Chū 12×12'
                    : sId === 'war12'
                    ? '★ War 12×12'
                    : 'Grand 36×36'}
                </button>
              ))}
            </div>

            {/* Center: Contextual Collapsible Drawer Triggers (War-Budget, Royals Radar, 36x36 Auto-Move) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {scale === 'war12' && (
                <button
                  onClick={() => setWarDrawerOpen(o => !o)}
                  className={`px-2.5 py-1 rounded-lg border font-mono-code font-bold whitespace-nowrap transition-colors ${
                    warDrawerOpen || warDraftCustomMode
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                  }`}
                  title="Expand/Collapse War-Budget 12×12 Army Presets, 208-Piece Draft & Citadel Rules"
                >
                  ★ {senteWarKoku}/{DEFAULT_WAR_BUDGET_KOKU} Koku {warDrawerOpen ? '▴' : '▾ Draft & Rules'}
                </button>
              )}

              {(scale === 'chu12' || scale === 'war12' || scale === 'taikyoku36') && (
                <button
                  onClick={() => setRoyalsDrawerOpen(o => !o)}
                  className={`px-2.5 py-1 rounded-lg border font-semibold whitespace-nowrap transition-colors ${
                    royalsDrawerOpen
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-950 border-slate-700 text-sky-300 hover:border-amber-500/50'
                  }`}
                  title="Expand/Collapse Multi-Royal Survival Radar & Sector Jump Bar"
                >
                  👑 Royals ▲{royalStatus.sente.royals.length}:△{royalStatus.gote.royals.length}{' '}
                  {royalsDrawerOpen ? '▴' : '▾'}
                </button>
              )}

              {scale === 'taikyoku36' && (
                <div className="flex items-center gap-1 bg-amber-950/90 border border-amber-500/60 rounded-lg px-2 py-0.5 shrink-0">
                  <select
                    value={grandTurnLimitSeconds}
                    onChange={e => {
                      const sec = Number(e.target.value);
                      setGrandTurnLimitSeconds(sec);
                      setAutoMoveCountdownTenths(sec * 10);
                    }}
                    className="bg-slate-950 border border-amber-500/50 rounded px-1.5 py-0.5 text-[11px] font-mono-code font-bold text-amber-200 focus:outline-none"
                    title="Adjustable Grand 36×36 Turn Time Limit (Never ends game on timeout!)"
                  >
                    <option value={3}>Turn: 3s</option>
                    <option value={5}>Turn: 5s</option>
                    <option value={10}>Turn: 10s</option>
                    <option value={15}>Turn: 15s</option>
                    <option value={30}>Turn: 30s</option>
                    <option value={60}>Turn: 60s</option>
                  </select>
                  <select
                    value={grandTimeoutAction}
                    onChange={e => setGrandTimeoutAction(e.target.value as 'force_move' | 'pass_turn')}
                    className="bg-slate-950 border border-amber-500/50 rounded px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300 focus:outline-none"
                    title="Choose what happens when the turn timer expires (Never ends the game)"
                  >
                    <option value="force_move">On 0s: Force Move</option>
                    <option value="pass_turn">On 0s: Give Up Turn</option>
                  </select>
                  <span className="font-mono-code font-bold text-amber-300 whitespace-nowrap tabular-nums px-1">
                    {autoMove36Enabled ? `${(autoMoveCountdownTenths / 10).toFixed(1)}s` : 'Paused'}
                  </span>
                  <button
                    onClick={executeAutoCommanderMoveNow}
                    className="px-1.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold whitespace-nowrap"
                    title="Force an automatic legal move immediately and yield turn"
                  >
                    ⚡ Move
                  </button>
                  <button
                    onClick={() => passTurnNow(false)}
                    className="px-1.5 py-0.5 rounded bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold whitespace-nowrap"
                    title="Give up / Pass this turn to the opponent without ending the game"
                  >
                    ⏭ Pass
                  </button>
                  <button
                    onClick={() => {
                      setAutoMove36Enabled(a => !a);
                      setAutoMoveCountdownTenths(grandTurnLimitSeconds * 10);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-200 font-semibold whitespace-nowrap"
                    title="Pause or Resume the per-turn timer"
                  >
                    {autoMove36Enabled ? '⏸' : '▶'}
                  </button>
                </div>
              )}

              <button
                onClick={() => setMatchSetupOpen(o => !o)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap"
                title="Click to configure Opponent, AI Master, Castles, Clock & Overlays"
              >
                <span className="truncate max-w-[160px]">
                  {opponentMode === 'ai' ? `#${selectedBot.rank} ${selectedBot.name}` : opponentMode}
                </span>
                <span className="text-amber-400">{matchSetupOpen ? '▴' : '▾'}</span>
              </button>
            </div>

            {/* Right: Turn Indicator + Fit / Undo / Reset */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-amber-300 font-mono-code whitespace-nowrap px-1">
                M{moveNumber} · {turn === 'sente' ? '▲ Sente' : '△ Gote'}
              </span>
              <button
                onClick={() => fitBoardCamera(scale)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold whitespace-nowrap"
                title="Fit Board to Viewport"
              >
                Fit
              </button>
              <button
                onClick={() => {
                  if (undoStack.length === 0) return;
                  const last = undoStack[undoStack.length - 1];
                  setUndoStack(s => s.slice(0, -1));
                  setBoard(last.board);
                  setHands(last.hands);
                  setTurn(last.turn);
                  setMoveNumber(last.moveNumber);
                  setMoveLog(last.moveLog);
                  setLionTradeBan(last.lionTradeBan);
                  setMultiStepOrigin(null);
                  setMultiStepCurrent(null);
                  setSelectedCell(null);
                  setSelectedIsEnemy(false);
                  setLegalMoves([]);
                  setEnemyMovesOverlay([]);
                  setAttackersOfSelected([]);
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold whitespace-nowrap"
              >
                Undo
              </button>
              <button
                onClick={() => startNewMatch(scale, timeControl)}
                className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-semibold whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE DRAWER 1: MATCH SETUP, 20 AI MASTERS, 16 CASTLES, CLOCK & DISPLAY OPTIONS */}
          {matchSetupOpen && (
            <div className="bg-slate-950/98 border-b border-amber-500/40 px-3 sm:px-4 py-2.5 flex flex-col gap-2.5 z-20 text-xs shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                    Match & Bot Setup:
                  </span>
                  <select
                    value={opponentMode}
                    onChange={e => setOpponentMode(e.target.value as OpponentMode)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ai">vs. AI Master (20 Bots)</option>
                    <option value="pass">Local Pass & Play</option>
                    <option value="ws_online">Online Server Match</option>
                    <option value="webrtc_p2p">WebRTC P2P Direct</option>
                  </select>

                  {opponentMode === 'ai' && (
                    <select
                      value={selectedBotId}
                      onChange={e => setSelectedBotId(e.target.value)}
                      className="bg-slate-900 border border-amber-600/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400 max-w-full"
                    >
                      {AI_MASTERS.map(bot => (
                        <option key={bot.id} value={bot.id}>
                          #{bot.rank} {bot.name} ({bot.elo} ELO · {bot.styleTag})
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={selectedStrategyId}
                    onChange={e => {
                      const sId = e.target.value;
                      setSelectedStrategyId(sId);
                      const sc = SHOGI_STRATEGIES_AND_CASTLES.find(item => item.id === sId);
                      if (!sc) return;
                      const rows =
                        sc.scale === 'dobutsu' ? 4 : sc.scale === 'shogi9' ? 9 : sc.scale === 'chu12' ? 12 : 36;
                      const cols = sc.scale === 'dobutsu' ? 3 : rows;
                      const b: (BoardPiece | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
                      sc.pieces.forEach(sp => {
                        b[sp.r][sp.c] = makePiece(sp.code, sp.owner, Boolean(sp.promoted));
                      });
                      loadInteractivePresetOnBoard({
                        label: `${sc.name} (${sc.kanji})`,
                        scale: sc.scale,
                        turn: 'sente',
                        board: b,
                        hands: { sente: sc.senteHand ? [...sc.senteHand] : [], gote: [] },
                        selectSquare: sc.keyMoveFrom,
                        botId: sc.championBotId,
                        description: `${sc.name} (${sc.kanji}): ${sc.summary}`,
                      });
                    }}
                    className="bg-slate-900 border border-emerald-600/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 font-semibold focus:outline-none focus:border-emerald-400 max-w-full"
                    title="Load famous Shōgi Castles (Kakoi) & Strategies (Senpō)"
                  >
                    <option value="">戦法・囲い Castles & Strategies (16)...</option>
                    {SHOGI_STRATEGIES_AND_CASTLES.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        [{sc.category}] {sc.name} ({sc.kanji}) · {sc.scale}
                      </option>
                    ))}
                  </select>

                  <select
                    value={timeControl}
                    onChange={e => {
                      const tc = e.target.value as TimeControlId;
                      setTimeControl(tc);
                      setSenteMs(TIME_CONTROL_SPECS[tc].initialMs);
                      setGoteMs(TIME_CONTROL_SPECS[tc].initialMs);
                    }}
                    className="bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono-code focus:outline-none focus:border-amber-400"
                  >
                    <option value="correspondence_2d">2 Days (48:00:00 Match Clock)</option>
                    <option value="classical">Classical 30+10</option>
                    <option value="rapid">Rapid 10+5</option>
                    <option value="blitz">Blitz 3+2</option>
                  </select>

                  <button
                    onClick={() => setActiveTab('strategies')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                    title="Open the 4-Phase Interactive Shōgi Strategy Curriculum (Openers, Castling, Mid-Games, End-Games)"
                  >
                    📚 Learn Strategies (24 Modules)
                  </button>
                </div>

                <button
                  onClick={() => setMatchSetupOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold shrink-0"
                >
                  ✕ Collapse Setup
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowThreatCircles(c => !c)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                      showThreatCircles
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {showThreatCircles ? 'Red Threat Circles: On' : 'Red Threat Circles: Off'}
                  </button>
                  <button
                    onClick={() => setShowMatchVectorTags(v => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                      showMatchVectorTags
                        ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {showMatchVectorTags ? 'Blind/Max Tags: On' : 'Blind/Max Tags: Off'}
                  </button>
                  <button
                    onClick={() =>
                      setLabelMode(m => (m === 'western' ? 'hybrid' : m === 'hybrid' ? 'kanji' : 'western'))
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 whitespace-nowrap"
                  >
                    {labelMode === 'western'
                      ? 'Western + Pips'
                      : labelMode === 'hybrid'
                      ? 'Hybrid (A–Z + 漢字)'
                      : 'Kanji (漢字)'}
                  </button>
                  <button
                    onClick={() => {
                      Sound.enabled = !soundEnabled;
                      setSoundEnabled(!soundEnabled);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap"
                  >
                    {soundEnabled ? 'Sound: On' : 'Muted'}
                  </button>
                </div>

                {/* Camera Zoom & Scroll Mode */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                    <span className="text-slate-400">Cell Size:</span>
                    <input
                      type="range"
                      min={scale === 'taikyoku36' ? 16 : 28}
                      max={scale === 'dobutsu' ? 120 : scale === 'shogi9' ? 76 : 64}
                      value={cellSizeState}
                      onChange={e => setCameraZoomAroundPoint(Number(e.target.value))}
                      className="w-24 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono-code text-amber-300 w-9">{cellSizeState}px</span>
                  </div>
                  <button
                    onClick={() => setWheelMode(w => (w === 'pan' ? 'zoom' : 'pan'))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap"
                  >
                    Scroll: {wheelMode === 'pan' ? 'Smooth Pan (Ctrl=Zoom)' : 'Cursor Zoom'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COLLAPSIBLE DRAWER 2: WAR-BUDGET 12×12 DRAFT, PRESETS & RULES (Collapsed by default!) */}
          {scale === 'war12' && (warDrawerOpen || warDraftCustomMode) && (
            <div className="bg-emerald-950/95 border-b border-emerald-500/50 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-black font-mono-code">
                  WAR BUDGET: {senteWarKoku} / {DEFAULT_WAR_BUDGET_KOKU} KOKU
                </span>
                <span className="text-emerald-100">
                  <strong>Citadel Guard Locked:</strong> Take <strong>both [K] & [CP]</strong> OR reach row 1 with{' '}
                  <strong>[K]</strong> to win · <strong>Parachute Drops:</strong> Once on own half (banishes if recaptured) ·{' '}
                  <strong>★ Evolution:</strong> Pawn → Tier 2 → Tier 3 → King/Prince!
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={warDraftPreset}
                  onChange={e => {
                    const p = e.target.value as 'balanced' | 'cavalry' | 'siege' | 'ascension';
                    setWarDraftPreset(p);
                    startNewMatch('war12', timeControl, p);
                  }}
                  className="bg-slate-950 border border-emerald-500/60 rounded px-2 py-1 text-emerald-200 font-semibold"
                >
                  <option value="balanced">Army Preset: 1. Balanced Imperial</option>
                  <option value="cavalry">Army Preset: 2. Raiden Lion Cavalry</option>
                  <option value="siege">Army Preset: 3. Fire Demon & Hook Siege</option>
                  <option value="ascension">Army Preset: 4. Royal Ascension Corps</option>
                </select>

                <button
                  onClick={() => setWarDraftCustomMode(m => !m)}
                  className={`px-2.5 py-1 rounded font-bold border whitespace-nowrap ${
                    warDraftCustomMode
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950 text-emerald-300 border-emerald-500/60 hover:bg-slate-900'
                  }`}
                >
                  {warDraftCustomMode ? '✓ Finish Custom Draft' : 'Customize Draft (208 Pieces)'}
                </button>

                {warDraftCustomMode && (
                  <select
                    value={warDraftBrushCode}
                    onChange={e => setWarDraftBrushCode(e.target.value)}
                    className="bg-slate-950 border border-amber-400 rounded px-2 py-1 text-amber-200 font-mono-code font-bold max-w-xs"
                    title="Select any of the 208 Taikyoku pieces and click Ranks 9–12 to deploy (Right-click to remove)"
                  >
                    {RAW_LEGEND.filter(([code]) => code !== 'K' && code !== 'CP').map(([code, name, kanji]) => (
                      <option key={code} value={code}>
                        [{code}] {name} ({kanji}) — {getPieceWarBudgetCost(code)} Koku
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => {
                    setWarDrawerOpen(false);
                    setWarDraftCustomMode(false);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-200 font-bold"
                >
                  ✕ Hide
                </button>
              </div>
            </div>
          )}

          {/* COLLAPSIBLE DRAWER 3: ROYALS RADAR & 36×36 SECTOR JUMP BAR */}
          {royalsDrawerOpen && (scale === 'taikyoku36' || scale === 'chu12' || scale === 'war12') && (
            <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sky-300">▲ Sente Royals ({royalStatus.sente.royals.length}):</span>
                  {royalStatus.sente.royals.map((r, i) => (
                    <button
                      key={`sr-${i}`}
                      onClick={() => {
                        selectAndInspectBoardSquare(r.r, r.c);
                        focusBoardSector(
                          (r.r + 0.5) / SCALE_CONFIGS[scale].rows,
                          (r.c + 0.5) / SCALE_CONFIGS[scale].cols,
                          40,
                          scale
                        );
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono-code font-bold border ${
                        r.threatened
                          ? 'bg-rose-950 border-rose-500 text-rose-200 animate-pulse'
                          : 'bg-slate-950 border-amber-500/50 text-amber-300 hover:bg-slate-800'
                      }`}
                    >
                      [{r.code}] {SCALE_CONFIGS[scale].cols - r.c}-{r.r + 1}
                    </button>
                  ))}
                  {royalStatus.sente.royalCandidates.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Heirs: {royalStatus.sente.royalCandidates.map(c => `[${c.code}→${c.promotesTo}]`).join(' ')}
                    </span>
                  )}
                </div>

                <span className="text-slate-700">|</span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-rose-300">△ Gote Royals ({royalStatus.gote.royals.length}):</span>
                  {royalStatus.gote.royals.map((r, i) => (
                    <button
                      key={`gr-${i}`}
                      onClick={() => {
                        selectAndInspectBoardSquare(r.r, r.c);
                        focusBoardSector(
                          (r.r + 0.5) / SCALE_CONFIGS[scale].rows,
                          (r.c + 0.5) / SCALE_CONFIGS[scale].cols,
                          40,
                          scale
                        );
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono-code font-bold border ${
                        r.threatened
                          ? 'bg-rose-950 border-rose-500 text-rose-200 animate-pulse'
                          : 'bg-slate-950 border-slate-700 text-rose-200 hover:bg-slate-800'
                      }`}
                    >
                      [{r.code}] {SCALE_CONFIGS[scale].cols - r.c}-{r.r + 1}
                    </button>
                  ))}
                  {royalStatus.gote.royalCandidates.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Heirs: {royalStatus.gote.royalCandidates.map(c => `[${c.code}→${c.promotesTo}]`).join(' ')}
                    </span>
                  )}
                </div>
              </div>

              {scale === 'taikyoku36' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex-wrap">
                    <span className="text-[11px] text-amber-400 font-semibold px-1.5">Sectors:</span>
                    <button onClick={() => focusBoardSector(0.18, 0.22, 38)} className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-rose-300">
                      △NW
                    </button>
                    <button onClick={() => focusBoardSector(0.16, 0.5, 40)} className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-rose-200 font-bold">
                      △Royals
                    </button>
                    <button onClick={() => focusBoardSector(0.18, 0.78, 38)} className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-rose-300">
                      △NE
                    </button>
                    <button onClick={() => focusBoardSector(0.5, 0.5, 38)} className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-emerald-200 font-bold">
                      Center
                    </button>
                    <button onClick={() => focusBoardSector(0.84, 0.5, 40)} className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-sky-200 font-bold">
                      ▲Royals
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      loadInteractivePresetOnBoard({
                        label: '36×36 Tactical Royal Clash',
                        scale: 'taikyoku36',
                        turn: 'sente',
                        board: create36x36TacticalClashBoard(),
                        selectSquare: { r: 13, c: 17 },
                        description:
                          'Dual-Royal Clash loaded: Move Fire Demon [DM] at 19-14 to AoE-burn Gote units, promote [DE] at 23-12 to a 3rd Royal [CP], or jump with [GG]!',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold whitespace-nowrap"
                  >
                    Load 36×36 Clash
                  </button>
                </div>
              )}

              <button
                onClick={() => setRoyalsDrawerOpen(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main 3-Column Match Body */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* LEFT COLLAPSIBLE SIDEBAR: PIECE INSPECTOR, THREAT RADAR & LEGEND (Overlay on mobile/tablet, docked on desktop) */}
            {leftInspectorOpen && (
              <aside className="fixed lg:static inset-y-12 left-0 w-80 max-w-[88vw] shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-3.5 overflow-y-auto z-30 shadow-2xl lg:shadow-none space-y-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-1">
                    <span className="text-xs font-semibold text-amber-300 truncate">
                      {selectedIsEnemy ? 'Enemy Threat Inspector' : 'Piece Inspector'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {(getScalePromotesTo(inspectedCode, scale) || PIECE_DB[inspectedCode]?.promotesTo) && (
                        <button
                          onClick={() => setInspectPromoted(p => !p)}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium whitespace-nowrap"
                        >
                          {inspectPromoted ? 'Base' : 'Promoted'}
                        </button>
                      )}
                      <button
                        onClick={() => setLeftInspectorOpen(false)}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                        title="Collapse Piece Inspector"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Piece Title & Code */}
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <div className="truncate pr-2">
                      <div className="font-bold text-sm text-amber-100 truncate">{activeInspectedSpec.name}</div>
                      <div className="text-xs text-slate-400 font-mono-code">
                        Code: [{activeInspectedSpec.code}] · {activeInspectedSpec.kanji}
                      </div>
                    </div>
                    <span className="font-mono-code font-black text-sm text-amber-400 shrink-0">
                      [{activeInspectedSpec.code}]
                    </span>
                  </div>

                  {/* LIVE THREAT & CAPTURE RADAR FOR SELECTED PIECE */}
                  {selectedCell && (
                    <div className="bg-slate-950 border border-rose-500/40 rounded-lg p-2.5 space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-rose-400 block">
                          {selectedIsEnemy
                            ? 'Your Pieces That Can Take This Enemy:'
                            : 'Enemy Pieces That Can Take This Piece:'}
                        </span>
                        {attackersOfSelected.length === 0 ? (
                          <span className="text-emerald-400 font-medium">
                            Safe — No opposing piece has this square in reach.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {attackersOfSelected.map((att, idx) => (
                              <button
                                key={`${att.r}-${att.c}-${idx}`}
                                onClick={() => {
                                  selectAndInspectBoardSquare(att.r, att.c);
                                  if (scale === 'taikyoku36') {
                                    focusBoardSector(
                                      (att.r + 0.5) / SCALE_CONFIGS[scale].rows,
                                      (att.c + 0.5) / SCALE_CONFIGS[scale].cols,
                                      camRef.current.cellSize,
                                      scale
                                    );
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-200 font-mono-code font-bold hover:bg-rose-900"
                              >
                                [{att.code}] at {SCALE_CONFIGS[scale].cols - att.c}-{att.r + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-800 pt-1.5">
                        <span className="font-bold text-amber-300 block">Pieces This Piece Can Take Now:</span>
                        {selectedTargetsInReach.length === 0 ? (
                          <span className="text-slate-400">No opposing pieces currently in 1-move reach.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {selectedTargetsInReach.map((tgt, idx) => (
                              <button
                                key={`${tgt.r}-${tgt.c}-${idx}`}
                                onClick={() => selectAndInspectBoardSquare(tgt.r, tgt.c)}
                                className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500 text-amber-200 font-mono-code font-bold hover:bg-amber-900"
                              >
                                x[{tgt.code}] at {SCALE_CONFIGS[scale].cols - tgt.c}-{tgt.r + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chess Analogy Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs">
                    <span className="text-sky-400 font-semibold block mb-0.5">Chess Analogy:</span>
                    <p className="text-slate-200 leading-snug">{activeInspectedSpec.chessAnalogy}</p>
                  </div>

                  {/* Koma Visual + 5x5 Movement Matrix */}
                  <div className="grid grid-cols-2 gap-2.5 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    <div className="flex flex-col items-center justify-center bg-slate-900 rounded-lg p-2 border border-slate-800">
                      <div className="w-16 h-20 shogi-koma flex flex-col items-center justify-center border border-amber-800">
                        <span className="font-mono-code font-extrabold text-xs text-amber-900 leading-none mb-0.5">
                          {activeInspectedSpec.code}
                        </span>
                        <span className="font-kanji font-black text-xl text-slate-950 leading-none">
                          {activeInspectedSpec.kanji.slice(0, 2)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[11px] text-amber-300 font-medium text-center truncate w-full">
                        Val: {activeInspectedSpec.value}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-[11px] text-slate-400 mb-1 font-medium">Vectors (5×5)</div>
                      <canvas
                        ref={compassCanvasRef}
                        width={105}
                        height={105}
                        className="rounded border border-slate-700 bg-slate-950"
                      />
                    </div>
                  </div>

                  {/* Movement & Limits */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
                    <div>
                      <span className="text-amber-400 font-semibold block">Movement Rule:</span>
                      <p className="text-slate-200 leading-snug mt-0.5">{activeInspectedSpec.moveSummary}</p>
                    </div>
                    <div className="border-t border-slate-800 pt-1.5">
                      <span className="text-rose-400 font-semibold block">Tactical Limits & Blind Spots:</span>
                      <p className="text-slate-300 leading-snug mt-0.5">
                        {activeInspectedSpec.limitBullets.join(' ')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setLocatedPieceCode(activeInspectedSpec.code);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap"
                    >
                      Highlight on Board
                    </button>
                    <button
                      onClick={() => {
                        setSandboxCode(inspectedCode);
                        setDojoSubTab('sandbox');
                        setActiveTab('dojo');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap"
                    >
                      Train in Dojo
                    </button>
                  </div>
                </div>

                {/* Searchable 208+ Piece Legend List */}
                <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-3 min-h-[160px] overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-300">208+ Piece Directory</span>
                    <span className="font-mono-code text-xs text-slate-400">{hoverCoords}</span>
                  </div>
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    placeholder="Filter code or name (e.g. RO, FCr, LN)..."
                    className="w-full px-2.5 py-1.5 mb-2 rounded bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
                    {allLegendEntries
                      .filter(
                        item =>
                          !sidebarSearch.trim() ||
                          item.code.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                          item.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                          item.kanji.includes(sidebarSearch)
                      )
                      .map(item => (
                        <div
                          key={item.code}
                          onClick={() => {
                            setInspectedCode(item.code);
                            setInspectPromoted(false);
                            setLocatedPieceCode(item.code);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer border transition-colors ${
                            inspectedCode === item.code
                              ? 'bg-amber-500/20 border-amber-500/60 text-white'
                              : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono-code font-bold text-amber-300 w-8 shrink-0">[{item.code}]</span>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-kanji text-slate-400 shrink-0 ml-2">{item.kanji}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </aside>
            )}

            {/* CENTER STAGE: INTERACTIVE KAYA-WOOD SHOGI BOARD */}
            <main className="flex-1 flex flex-col relative kaya-surface overflow-hidden">
              {/* Floating Multi-Step Lion / Eagle Igui Banner OR Selected Threat Summary */}
              {multiStepCurrent ? (
                <div className="bg-amber-950 border-b border-amber-400 px-3 py-1 flex items-center justify-between z-20 text-xs">
                  <span className="font-semibold text-amber-100">
                    Lion 2nd Step Active: Click an adjacent square (double capture), click golden [IGUI] to return, or stay in place:
                  </span>
                  <button
                    onClick={() => finalizeTurn(board, hands, turn, lionTradeBan)}
                    className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold whitespace-nowrap"
                  >
                    Stay Here (Jitto)
                  </button>
                </div>
              ) : (
                selectedCell && (
                  <div
                    className={`border-b px-3 py-1 flex flex-wrap items-center justify-between gap-2 z-20 text-xs ${
                      selectedIsEnemy
                        ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                        : attackersOfSelected.length > 0
                        ? 'bg-rose-950/75 border-rose-500/40 text-slate-100'
                        : 'bg-slate-900/90 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-amber-300">
                        {selectedIsEnemy ? '△ Enemy' : '▲ Friendly'} [
                        {board[selectedCell.r]?.[selectedCell.c]?.code}] at{' '}
                        {SCALE_CONFIGS[scale].cols - selectedCell.c}-{selectedCell.r + 1}
                      </span>
                      <span>·</span>
                      {attackersOfSelected.length > 0 ? (
                        <span className="font-bold text-rose-300">
                          {selectedIsEnemy ? 'Can Be Taken By:' : '⚠ In Reach Of:'}{' '}
                          {attackersOfSelected
                            .map(a => `[${a.code}] (${SCALE_CONFIGS[scale].cols - a.c}-${a.r + 1})`)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-emerald-300 font-medium">Safe (0 attackers)</span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedCell(null)}
                      className="text-slate-400 hover:text-white font-bold px-1.5"
                      title="Dismiss selection bar"
                    >
                      ✕
                    </button>
                  </div>
                )
              )}

              {/* Optional Promotion Modal */}
              {pendingPromotion && (
                <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-30">
                  <div className="bg-slate-900 border border-amber-500 rounded-xl p-5 max-w-sm w-full space-y-4 text-center shadow-2xl">
                    <h3 className="font-bold text-base text-amber-200">Promote Piece (成 / 不成)?</h3>
                    <p className="text-xs text-slate-300">
                      Would you like to promote{' '}
                      <strong className="text-white">
                        [{board[pendingPromotion.fromR]?.[pendingPromotion.fromC]?.code}]
                      </strong>{' '}
                      to{' '}
                      <strong className="text-amber-300">
                        [
                        {getScalePromotesTo(
                          board[pendingPromotion.fromR]?.[pendingPromotion.fromC]?.code || 'P',
                          scale
                        )}
                        ]
                      </strong>
                      ?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const p = pendingPromotion;
                          setPendingPromotion(null);
                          performBoardMove(p.fromR, p.fromC, p.move, true, false);
                        }}
                        className="py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        Promote (成)
                      </button>
                      <button
                        onClick={() => {
                          const p = pendingPromotion;
                          setPendingPromotion(null);
                          performBoardMove(p.fromR, p.fromC, p.move, false, false);
                        }}
                        className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                      >
                        Decline (不成)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* War-Budget 12×12 4-Tier XP/Capture Star (★) Evolution Modal (Pawn -> Tier 2 -> Tier 3 -> King/Prince) */}
              {pendingEvolution && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-30 p-4">
                  <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-xs font-mono-code font-bold text-emerald-400">
                          ★ BATTLE EVOLUTION UNLOCKED (TIER {pendingEvolution.currentTier} → TIER{' '}
                          {pendingEvolution.currentTier + 1})
                        </span>
                        <h3 className="font-bold text-base text-white">
                          Choose Ascension Path for [{pendingEvolution.pieceCode}]{' '}
                          {PIECE_DB[pendingEvolution.pieceCode]?.name}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400 text-amber-300 font-mono-code font-bold text-xs">
                        ★{pendingEvolution.newStars}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      In War-Budget 12×12, units evolve through 4 tiers all the way up to a new{' '}
                      <strong className="text-amber-300">King [K]</strong> or{' '}
                      <strong className="text-amber-300">Crown Prince [CP]</strong>. Select your branch:
                    </p>

                    <div className="space-y-2">
                      {pendingEvolution.options.map(opt => {
                        const spec = PIECE_DB[opt.code];
                        return (
                          <button
                            key={opt.code}
                            onClick={() => {
                              const evo = pendingEvolution;
                              const updatedBoard = cloneBoard(evo.nextBoard);
                              const targetPiece = updatedBoard[evo.r]?.[evo.c];
                              if (targetPiece) {
                                targetPiece.code = opt.code;
                                targetPiece.promoted = true;
                                targetPiece.tier = opt.tier;
                              }
                              setBoard(updatedBoard);
                              setPendingEvolution(null);
                              Sound.playSolvedChime();
                              finalizeTurn(updatedBoard, evo.nextHands, evo.completedBy, evo.nextLionBan);
                            }}
                            className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-400 transition-colors flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-emerald-300">
                                {opt.branchLabel} → [{opt.code}] {spec?.name} ({spec?.kanji})
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{opt.description}</div>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs shrink-0">
                              Evolve →
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const evo = pendingEvolution;
                        setPendingEvolution(null);
                        finalizeTurn(evo.nextBoard, evo.nextHands, evo.completedBy, evo.nextLionBan);
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Keep Current Form ([{pendingEvolution.pieceCode}])
                    </button>
                  </div>
                </div>
              )}

              {/* Canvas Viewport with Clamped Pan & Damped Cursor-Centered Zoom */}
              <div
                ref={viewportRef}
                className="flex-1 w-full h-full relative overflow-hidden cursor-pointer"
                onContextMenu={e => {
                  if (scale === 'war12' && warDraftCustomMode && mainCanvasRef.current) {
                    e.preventDefault();
                    const rect = mainCanvasRef.current.getBoundingClientRect();
                    const c = Math.floor((e.clientX - rect.left - camRef.current.x) / camRef.current.cellSize);
                    const r = Math.floor((e.clientY - rect.top - camRef.current.y) / camRef.current.cellSize);
                    if (inBounds(r, c, 12, 12) && r >= 8) {
                      const existing = board[r]?.[c];
                      if (existing && !existing.citadelGuard) {
                        const next = cloneBoard(board);
                        next[r][c] = null;
                        if (!next[11 - r]?.[11 - c]?.citadelGuard) {
                          next[11 - r][11 - c] = null;
                        }
                        setBoard(next);
                        Sound.playKomaClack(false);
                      }
                    }
                  }
                }}
                onMouseDown={e => {
                  camRef.current.isDragging = true;
                  camRef.current.startX = e.clientX - camRef.current.x;
                  camRef.current.startY = e.clientY - camRef.current.y;
                  camRef.current.downClientX = e.clientX;
                  camRef.current.downClientY = e.clientY;
                  camRef.current.moved = false;
                }}
                onMouseMove={e => {
                  const canvas = mainCanvasRef.current;
                  if (!canvas) return;
                  if (camRef.current.isDragging) {
                    const dist = Math.hypot(
                      e.clientX - camRef.current.downClientX,
                      e.clientY - camRef.current.downClientY
                    );
                    // Require > 9px drag distance so clicking pieces never accidentally drags the board
                    if (dist > 9) {
                      camRef.current.moved = true;
                      const rawX = e.clientX - camRef.current.startX;
                      const rawY = e.clientY - camRef.current.startY;
                      const clamped = clampCameraPosition(rawX, rawY, camRef.current.cellSize, scale);
                      camRef.current.x = clamped.x;
                      camRef.current.y = clamped.y;
                      forceCanvasTick(t => t + 1);
                    }
                  }
                  const rect = canvas.getBoundingClientRect();
                  const c = Math.floor((e.clientX - rect.left - camRef.current.x) / camRef.current.cellSize);
                  const r = Math.floor((e.clientY - rect.top - camRef.current.y) / camRef.current.cellSize);
                  const cfg = SCALE_CONFIGS[scale];
                  if (inBounds(r, c, cfg.rows, cfg.cols)) {
                    const p = board[r]?.[c];
                    const attCount = p
                      ? (p.owner === 'sente'
                          ? threatMap[r]?.[c]?.goteAttackers.length
                          : threatMap[r]?.[c]?.senteAttackers.length) || 0
                      : 0;
                    setHoverCoords(
                      `${cfg.cols - c}-${r + 1}${
                        p
                          ? ` · [${p.code}] ${PIECE_DB[p.code]?.name || ''}${
                              p.stars ? ` (★${p.stars})` : ''
                            }${p.parachuted ? ' [Parachuted]' : ''}${
                              attCount > 0 ? ` (Threatened by ${attCount})` : ''
                            }`
                          : ''
                      }`
                    );
                  }
                }}
                onMouseUp={e => {
                  if (!camRef.current.isDragging) return;
                  camRef.current.isDragging = false;
                  if (!camRef.current.moved && e.button === 0 && mainCanvasRef.current) {
                    const rect = mainCanvasRef.current.getBoundingClientRect();
                    const c = Math.floor((e.clientX - rect.left - camRef.current.x) / camRef.current.cellSize);
                    const r = Math.floor((e.clientY - rect.top - camRef.current.y) / camRef.current.cellSize);
                    const cfg = SCALE_CONFIGS[scale];
                    if (inBounds(r, c, cfg.rows, cfg.cols)) {
                      handleMainBoardCellClick(r, c);
                    }
                  }
                }}
                onWheel={e => {
                  e.preventDefault();
                  // If Ctrl/Cmd pressed OR wheelMode === 'zoom', do gentle cursor-centered zoom
                  if (e.ctrlKey || e.metaKey || wheelMode === 'zoom') {
                    const step = e.deltaY < 0 ? 2 : -2;
                    setCameraZoomAroundPoint(camRef.current.cellSize + step, e.clientX, e.clientY, scale);
                  } else {
                    // Smooth clamped panning (great for trackpads and large 36x36 boards)
                    const dampedDx = Math.max(-48, Math.min(48, -e.deltaX * 0.65));
                    const dampedDy = Math.max(-48, Math.min(48, -e.deltaY * 0.65));
                    const clamped = clampCameraPosition(
                      camRef.current.x + dampedDx,
                      camRef.current.y + dampedDy,
                      camRef.current.cellSize,
                      scale
                    );
                    camRef.current.x = clamped.x;
                    camRef.current.y = clamped.y;
                    forceCanvasTick(t => t + 1);
                  }
                }}
              >
                <canvas ref={mainCanvasRef} className="block" />
              </div>

              {/* Bottom Captured Hands (including War-Budget 12×12 Parachute Hand & Banished Graveyard) & Clocks Bar */}
              <div className="bg-slate-950 border-t border-slate-800 px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
                {/* Sente Clock & Captured Hand */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div
                    className={`px-3 py-1 rounded border font-mono-code font-bold ${
                      turn === 'sente'
                        ? 'bg-sky-950 border-sky-500 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    ▲ Sente · {formatClock(senteMs)}
                  </div>
                  {SCALE_CONFIGS[scale].allowDrops && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400">
                        {scale === 'war12' ? 'Parachute Reserve (Own Half):' : 'Hand:'}
                      </span>
                      {hands.sente.length === 0 ? (
                        <span className="text-slate-600">Empty</span>
                      ) : (
                        hands.sente.map((code, idx) => (
                          <button
                            key={`${code}-${idx}`}
                            onClick={() => handleSelectHandDrop(code, 'sente')}
                            className={`px-2 py-0.5 rounded font-mono-code font-bold border ${
                              selectedDropCode === code && turn === 'sente'
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-900 text-amber-200 border-slate-700 hover:border-amber-500'
                            }`}
                          >
                            [{code}]
                          </button>
                        ))
                      )}
                      {scale === 'war12' && banishedPieces.sente.length > 0 && (
                        <span className="text-violet-400 font-mono-code text-[11px] ml-1">
                          Banished ({banishedPieces.sente.length}): {banishedPieces.sente.map(c => `[${c}]`).join('')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Scale Legend & Red Circle Key */}
                <div className="flex items-center gap-3 text-slate-400 hidden xl:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-red-500 inline-block" />
                    <span>Red Circle = Piece in reach of capture</span>
                  </span>
                  <span>·</span>
                  <span>
                    {scale === 'war12'
                      ? '★ Stars = Evolution Tier · [P] Badge = Parachuted (Banishes if recaptured)'
                      : 'Click any Friendly or Enemy piece to inspect threats & enemy moves in Red'}
                  </span>
                </div>

                {/* Gote Clock & Captured Hand */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {SCALE_CONFIGS[scale].allowDrops && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400">
                        {scale === 'war12' ? 'Gote Parachute:' : 'Gote Hand:'}
                      </span>
                      {hands.gote.length === 0 ? (
                        <span className="text-slate-600">Empty</span>
                      ) : (
                        hands.gote.map((code, idx) => (
                          <button
                            key={`${code}-${idx}`}
                            onClick={() => handleSelectHandDrop(code, 'gote')}
                            className={`px-2 py-0.5 rounded font-mono-code font-bold border ${
                              selectedDropCode === code && turn === 'gote'
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-slate-900 text-rose-200 border-slate-700 hover:border-rose-500'
                            }`}
                          >
                            [{code}]
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <div
                    className={`px-3 py-1 rounded border font-mono-code font-bold ${
                      turn === 'gote'
                        ? 'bg-rose-950 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    △ {opponentMode === 'ai' ? selectedBot.name : 'Gote'} · {formatClock(goteMs)}
                  </div>
                </div>
              </div>
            </main>

            {/* RIGHT COLLAPSIBLE SIDEBAR: RADAR MINIMAP, AI MASTER CARD & MOVE RECORD (KIFU) */}
            {rightPanelOpenMobile && (
              <aside className="fixed lg:static inset-y-12 right-0 w-76 max-w-[88vw] shrink-0 bg-slate-950 border-l border-slate-800 flex flex-col justify-between p-3.5 overflow-y-auto z-30 shadow-2xl lg:shadow-none space-y-3">
                {/* 1. Interactive Radar Minimap (Click or drag to jump smoothly) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-300">Radar Minimap (Click to Jump)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono-code text-slate-400">
                        {SCALE_CONFIGS[scale].cols}×{SCALE_CONFIGS[scale].rows}
                      </span>
                      <button
                        onClick={() => setRightPanelOpenMobile(false)}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                        title="Collapse Radar & Kifu Sidebar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={minimapCanvasRef}
                    width={184}
                    height={184}
                    onMouseDown={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = (e.clientX - rect.left) / rect.width;
                      const ny = (e.clientY - rect.top) / rect.height;
                      focusBoardSector(ny, nx, camRef.current.cellSize, scale);
                    }}
                    onMouseMove={e => {
                      if (e.buttons !== 1) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = (e.clientX - rect.left) / rect.width;
                      const ny = (e.clientY - rect.top) / rect.height;
                      focusBoardSector(ny, nx, camRef.current.cellSize, scale);
                    }}
                    className="rounded border border-slate-700 bg-slate-950 cursor-crosshair"
                  />
                </div>

                {/* 2. Active AI Master Profile (if in AI mode) */}
                {opponentMode === 'ai' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-200">{selectedBot.name}</span>
                      <span className="font-mono-code text-emerald-400 font-semibold">{selectedBot.elo} ELO</span>
                    </div>
                    <div className="text-slate-400 font-kanji">
                      {selectedBot.kanjiTitle} · {selectedBot.styleTag}
                    </div>
                    <p className="text-slate-300 leading-snug pt-1 border-t border-slate-800">{selectedBot.motto}</p>
                  </div>
                )}

                {/* 3. Official Move Record (Kifu 棋譜) */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col min-h-[180px] overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-300">Move Record (棋譜)</span>
                    <span className="text-xs font-mono-code text-slate-400">{moveLog.length} plies</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 text-xs font-mono-code pr-1">
                    {moveLog.length === 0 ? (
                      <div className="text-slate-500">
                        Click any piece on the board to see its moves, red threat circles, and attackers.
                      </div>
                    ) : (
                      moveLog.map(item => (
                        <div
                          key={item.id}
                          className={`border-b border-slate-800/70 pb-1 ${
                            item.owner === 'sente' ? 'text-sky-300' : 'text-rose-300'
                          }`}
                        >
                          {item.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 1B: 4-PHASE SHŌGI STRATEGY CURRICULUM (OPENERS · CASTLING · MID-GAME · END-GAME) ==================== */}
      {activeTab === 'strategies' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14]">
          {/* Phase Track & Scale Filter Strip */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTrainingSidebarOpen(o => !o)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-amber-300 whitespace-nowrap"
              >
                {trainingSidebarOpen ? '◀ Hide Curriculum List' : '▶ Select Strategy Module'}
              </button>

              {/* 4 Phase Track Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 overflow-x-auto">
                <button
                  onClick={() => setStrategyPhaseFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    strategyPhaseFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  All 4 Phases ({SHOGI_STRATEGY_CURRICULUM.length})
                </button>
                {STRATEGY_PHASE_TRACKS.map(track => (
                  <button
                    key={track.id}
                    onClick={() => setStrategyPhaseFilter(track.id)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                      strategyPhaseFilter === track.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {track.order}. {track.id === 'openers' ? 'Openers (序盤)' : track.id === 'castling' ? 'Castling (囲い)' : track.id === 'midgame' ? 'Mid-Game (中盤)' : 'End-Game (終盤)'}
                  </button>
                ))}
              </div>

              {/* 5 Board Scale Filter */}
              <select
                value={strategyScaleFilter}
                onChange={e => setStrategyScaleFilter(e.target.value as 'all' | BoardScaleId)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-semibold"
              >
                <option value="all">All 5 Board Scales</option>
                <option value="dobutsu">Dōbutsu 3×4</option>
                <option value="shogi9">Standard 9×9</option>
                <option value="chu12">Chū Shōgi 12×12</option>
                <option value="war12">★ War-Budget 12×12</option>
                <option value="taikyoku36">Grand Taikyoku 36×36</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-mono-code text-xs text-emerald-400">
              <span>Mastered: {Object.keys(completedCurriculumMap).length} / {SHOGI_STRATEGY_CURRICULUM.length}</span>
            </div>
          </div>

          {/* Two-Zone Educational Sandbox Layout */}
          <div className="flex-1 flex overflow-hidden relative">
            {trainingSidebarOpen && (
              <aside className="fixed md:static inset-y-24 left-0 w-96 max-w-[88vw] shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col p-4 space-y-2.5 overflow-y-auto z-30 shadow-2xl md:shadow-none">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">Strategy Modules (Openers → End-Games)</span>
                  <button
                    onClick={() => setTrainingSidebarOpen(false)}
                    className="md:hidden px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {SHOGI_STRATEGY_CURRICULUM.filter(
                    m =>
                      (strategyPhaseFilter === 'all' || m.phase === strategyPhaseFilter) &&
                      (strategyScaleFilter === 'all' || m.scale === strategyScaleFilter)
                  ).map(mod => {
                    const champ = AI_MASTERS.find(b => b.id === mod.championBotId);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => loadCurriculumModule(mod.id)}
                        className={`p-3 rounded-xl cursor-pointer border transition-colors ${
                          activeCurriculumId === mod.id
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="truncate">{mod.title}</span>
                          <span className="text-emerald-400 shrink-0 font-mono-code">
                            {completedCurriculumMap[mod.id] ? '✓' : `${mod.guidedSteps.length} steps`}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200/90 font-kanji mt-0.5">{mod.kanji}</div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>
                            {mod.phase.toUpperCase()} · {SCALE_CONFIGS[mod.scale].name}
                          </span>
                          {champ && <span className="text-sky-300">#{champ.rank} {champ.name}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            )}

            {/* Main Interactive Stage + Concept & Control Deck */}
            <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-between p-3 sm:p-6 gap-5 kaya-surface overflow-y-auto">
              {/* Left/Center Stage: Interactive Board Canvas with Plan Arrows & Key Squares */}
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/90 border border-slate-800 rounded-xl p-4 gap-3">
                <div className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="text-xs font-semibold text-emerald-400">
                      {STRATEGY_PHASE_TRACKS.find(t => t.id === activeCurriculumModule.phase)?.title} ·{' '}
                      {SCALE_CONFIGS[activeCurriculumModule.scale].name}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {activeCurriculumModule.title}{' '}
                      <span className="font-kanji text-amber-300 text-sm">({activeCurriculumModule.kanji})</span>
                    </h2>
                  </div>

                  <button
                    onClick={() => sparFromCurriculumPosition(activeCurriculumModule)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap shadow-md"
                  >
                    ⚔ Spar This Position vs. AI Master
                  </button>
                </div>

                <canvas
                  ref={strategyCanvasRef}
                  width={480}
                  height={480}
                  onMouseDown={e => {
                    if (e.button !== 0 || curriculumMistakeMode) return;
                    const mod = activeCurriculumModule;
                    if (curriculumStepIdx >= mod.guidedSteps.length) return;
                    const expected = mod.guidedSteps[curriculumStepIdx];
                    const canvas = e.currentTarget;
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    const cfg = SCALE_CONFIGS[mod.scale];

                    let cs =
                      mod.scale === 'dobutsu' ? 102 : mod.scale === 'shogi9' ? 48 : mod.scale === 'taikyoku36' ? 28 : 38;
                    let ox = Math.floor((canvas.width - cfg.cols * cs) / 2);
                    let oy = Math.floor((canvas.height - cfg.rows * cs) / 2);
                    if (mod.scale === 'taikyoku36') {
                      const focusStep =
                        mod.guidedSteps[Math.min(curriculumStepIdx, mod.guidedSteps.length - 1)] || mod.guidedSteps[0];
                      cs = 32;
                      ox = Math.floor(canvas.width / 2 - ((focusStep?.toC ?? 17) + 0.5) * cs);
                      oy = Math.floor(canvas.height / 2 - ((focusStep?.toR ?? 15) + 0.5) * cs);
                    }

                    const c = Math.floor(((e.clientX - rect.left) * scaleX - ox) / cs);
                    const r = Math.floor(((e.clientY - rect.top) * scaleY - oy) / cs);
                    if (!inBounds(r, c, cfg.rows, cfg.cols)) return;

                    // Check if user is dropping a selected hand piece
                    if (curriculumSelectedDrop) {
                      if (
                        expected.type === 'drop' &&
                        expected.dropCode === curriculumSelectedDrop &&
                        expected.toR === r &&
                        expected.toC === c
                      ) {
                        setCurriculumSelectedDrop(null);
                        setCurriculumLegalMoves([]);
                        advanceCurriculumStep(mod, curriculumStepIdx + 1);
                      } else if (
                        mod.mistakeDemo.badMove.type === 'drop' &&
                        mod.mistakeDemo.badMove.dropCode === curriculumSelectedDrop &&
                        mod.mistakeDemo.badMove.toR === r &&
                        mod.mistakeDemo.badMove.toC === c
                      ) {
                        Sound.playCheckAlert();
                        setCurriculumMistakeMode(true);
                        setCurriculumFeedback(
                          `⚠ Common Mistake Triggered (${mod.mistakeDemo.mistakeTitle}): ${mod.mistakeDemo.explanation}`
                        );
                      } else {
                        Sound.playCheckAlert();
                        setCurriculumFeedback(
                          `Follow the green arrow for Step ${expected.stepNumber}: ${expected.title} — or click "▶ Play Guided Step".`
                        );
                      }
                      return;
                    }

                    // Check if user is moving a selected board piece
                    if (curriculumSelectedCell) {
                      const targetR = expected.secondToR !== undefined ? expected.toR : expected.toR;
                      const targetC = expected.secondToC !== undefined ? expected.toC : expected.toC;
                      if (
                        expected.type === 'move' &&
                        expected.fromR === curriculumSelectedCell.r &&
                        expected.fromC === curriculumSelectedCell.c &&
                        ((r === targetR && c === targetC) ||
                          (expected.secondToR === r && expected.secondToC === c))
                      ) {
                        setCurriculumSelectedCell(null);
                        setCurriculumLegalMoves([]);
                        advanceCurriculumStep(mod, curriculumStepIdx + 1);
                        return;
                      }

                      if (
                        mod.mistakeDemo.badMove.type === 'move' &&
                        mod.mistakeDemo.badMove.fromR === curriculumSelectedCell.r &&
                        mod.mistakeDemo.badMove.fromC === curriculumSelectedCell.c &&
                        mod.mistakeDemo.badMove.toR === r &&
                        mod.mistakeDemo.badMove.toC === c
                      ) {
                        setCurriculumSelectedCell(null);
                        setCurriculumLegalMoves([]);
                        Sound.playCheckAlert();
                        setCurriculumMistakeMode(true);
                        setCurriculumFeedback(
                          `⚠ Common Mistake Triggered (${mod.mistakeDemo.mistakeTitle}): ${mod.mistakeDemo.explanation}`
                        );
                        return;
                      }
                    }

                    const clicked = curriculumBoardSnapshot.board[r]?.[c];
                    if (clicked && clicked.owner === 'sente') {
                      setCurriculumSelectedDrop(null);
                      setCurriculumSelectedCell({ r, c });
                      const analysis = analyzePieceMovesOnBoard(curriculumBoardSnapshot.board, r, c, {
                        scale: mod.scale,
                      });
                      setCurriculumLegalMoves(analysis.moves);
                      Sound.playKomaClack(false);
                    }
                  }}
                  className="max-w-full h-auto rounded-xl border-2 border-amber-600/60 shadow-2xl cursor-pointer"
                />

                {/* Reserve Hand & Step Playback Controls */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-amber-300">▲ Sente Hand:</span>
                    {curriculumBoardSnapshot.hands.sente.length === 0 ? (
                      <span className="text-slate-500">Empty</span>
                    ) : (
                      curriculumBoardSnapshot.hands.sente.map((code, i) => (
                        <button
                          key={`${code}-${i}`}
                          onClick={() => {
                            setCurriculumMistakeMode(false);
                            setCurriculumSelectedCell(null);
                            setCurriculumSelectedDrop(code);
                            const { drops } = getLegalDropsForHandPiece(
                              curriculumBoardSnapshot.board,
                              'sente',
                              code,
                              activeCurriculumModule.scale
                            );
                            setCurriculumLegalMoves(drops);
                          }}
                          className={`px-2.5 py-1 rounded font-mono-code font-bold border ${
                            curriculumSelectedDrop === code
                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                              : 'bg-slate-950 text-amber-200 border-slate-700'
                          }`}
                        >
                          [{code}] {PIECE_DB[code]?.name}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setCurriculumMistakeMode(false);
                        setCurriculumStepIdx(idx => Math.max(0, idx - 1));
                      }}
                      disabled={curriculumStepIdx === 0 && !curriculumMistakeMode}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold whitespace-nowrap"
                    >
                      ◀ Prev Step
                    </button>
                    <button
                      onClick={() => {
                        setCurriculumMistakeMode(false);
                        if (curriculumStepIdx < activeCurriculumModule.guidedSteps.length) {
                          advanceCurriculumStep(activeCurriculumModule, curriculumStepIdx + 1);
                        } else {
                          loadCurriculumModule(activeCurriculumModule.id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold whitespace-nowrap"
                    >
                      {curriculumStepIdx < activeCurriculumModule.guidedSteps.length
                        ? `▶ Play Step ${curriculumStepIdx + 1} / ${activeCurriculumModule.guidedSteps.length}`
                        : '↺ Replay Guided Line'}
                    </button>
                    <button
                      onClick={() => {
                        const nextMode = !curriculumMistakeMode;
                        setCurriculumMistakeMode(nextMode);
                        if (nextMode) {
                          Sound.playCheckAlert();
                          setCurriculumFeedback(
                            `⚠ MISTAKE REFUTATION DEMO — ${activeCurriculumModule.mistakeDemo.mistakeTitle}: ${activeCurriculumModule.mistakeDemo.explanation}`
                          );
                        } else {
                          loadCurriculumModule(activeCurriculumModule.id);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold border whitespace-nowrap ${
                        curriculumMistakeMode
                          ? 'bg-rose-500 text-slate-950 border-rose-300'
                          : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {curriculumMistakeMode ? '✓ Exit Mistake Demo' : '⚠ Watch Mistake Refutation'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Concept Deck: Proverb, Strategic Plan, Guided Steps & Refutation Analysis */}
              <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col gap-3 bg-slate-950/95 border border-slate-800 rounded-xl p-4 text-xs">
                {/* Traditional Shogi Proverb (Kakugen) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-400">
                    Shōgi Proverb (将棋格言 · Kakugen)
                  </div>
                  <div className="font-kanji font-bold text-sm text-amber-200">
                    「{activeCurriculumModule.proverb.jp}」
                  </div>
                  <div className="text-slate-400 italic">{activeCurriculumModule.proverb.romaji}</div>
                  <div className="text-slate-200 font-medium pt-0.5">{activeCurriculumModule.proverb.en}</div>
                </div>

                {/* Strategic Overview & Win Plan */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-200">Strategic Theory & Formation Breakdown</div>
                  <p className="text-slate-300 leading-relaxed">{activeCurriculumModule.strategicOverview}</p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-medium">
                    <strong>Winning Plan:</strong> {activeCurriculumModule.winPlanSummary}
                  </div>
                </div>

                {/* Interactive Step-by-Step Checklist */}
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                  <div className="font-bold text-amber-300">
                    Guided Move Sequence ({curriculumStepIdx}/{activeCurriculumModule.guidedSteps.length} Completed)
                  </div>
                  {activeCurriculumModule.guidedSteps.map((st, idx) => {
                    const isDone = !curriculumMistakeMode && idx < curriculumStepIdx;
                    const isCurrent = !curriculumMistakeMode && idx === curriculumStepIdx;
                    return (
                      <div
                        key={st.stepNumber}
                        onClick={() => {
                          setCurriculumMistakeMode(false);
                          setCurriculumStepIdx(idx);
                          setCurriculumFeedback(`Step ${st.stepNumber}: ${st.title} — ${st.coachCommentary}`);
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : isDone
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{st.title}</span>
                          <span className="font-mono-code">{isDone ? '✓ Done' : isCurrent ? '● Active' : `Step ${st.stepNumber}`}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{st.coachCommentary}</p>
                        {st.opponentReply && (
                          <div className="text-[11px] text-amber-300/90 mt-1 pt-1 border-t border-slate-800/80">
                            ↳ Book Reply: {st.opponentReply.replyNote}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Mistake Refutation Box */}
                  <div
                    onClick={() => {
                      setCurriculumMistakeMode(true);
                      Sound.playCheckAlert();
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      curriculumMistakeMode
                        ? 'bg-rose-950/90 border-rose-400 text-rose-100'
                        : 'bg-slate-900/90 border-rose-500/30 text-rose-200 hover:border-rose-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-rose-300">
                      <span>⚠ {activeCurriculumModule.mistakeDemo.mistakeTitle}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200">
                        Click to Demo
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed">
                      {activeCurriculumModule.mistakeDemo.explanation}
                    </p>
                  </div>
                </div>

                {/* Live Coach Feedback Banner */}
                <div
                  className={`p-3 rounded-xl border font-medium leading-relaxed ${
                    curriculumMistakeMode
                      ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                      : 'bg-slate-900 border-amber-500/40 text-amber-200'
                  }`}
                >
                  {curriculumFeedback}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: DOJO (TSUME, TACTICS, PUZZLE RUSH & 208 SANDBOX) ==================== */}
      {activeTab === 'dojo' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14]">
          <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTrainingSidebarOpen(o => !o)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-amber-300 whitespace-nowrap"
              >
                {trainingSidebarOpen ? '◀ Hide Selector' : '▶ Select Problem / Piece'}
              </button>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 overflow-x-auto">
                <button
                  onClick={() => {
                    setRushActive(false);
                    setDojoSubTab('tsume');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    dojoSubTab === 'tsume' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Tsume & Tactics ({Object.keys(solvedPuzzlesMap).length}/{CURATED_PUZZLES.length})
                </button>
                <button
                  onClick={() => {
                    setDojoSubTab('rush');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    dojoSubTab === 'rush' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  3-Min Rush (Best: {rushBestScore})
                </button>
                <button
                  onClick={() => {
                    setRushActive(false);
                    setDojoSubTab('sandbox');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    dojoSubTab === 'sandbox' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  208 Sandbox ({Object.keys(solvedPiecesMap).length}/208)
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 hidden xl:block">
              In Multi-Move Tsume & Tactics, the Defender AI actively plays the strongest legal resistance after each move.
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {trainingSidebarOpen && (
              <aside className="fixed md:static inset-y-24 left-0 w-84 max-w-[88vw] shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col p-4 space-y-3 overflow-y-auto z-30 shadow-2xl md:shadow-none">
              {dojoSubTab === 'sandbox' ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-300">208-Piece Drill Selector</span>
                      <button
                        onClick={() => {
                          setTestCategoryFilter('piece_drills');
                          setTestSuiteSummary(runAllUserTests('piece_drills'));
                          setActiveTab('tests');
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-mono-code text-[11px] font-bold"
                        title="Run automated User Tests on all 220 pieces in the Piece Drill Selector"
                      >
                        Run All 220 Drill Tests ✓
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sandboxSearch}
                        onChange={e => setSandboxSearch(e.target.value)}
                        placeholder="Search 208 pieces..."
                        className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                      <select
                        value={sandboxFilter}
                        onChange={e => setSandboxFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="all">All (208)</option>
                        <option value="special">Lion / Hook / Fire</option>
                        <option value="jump">Jumping</option>
                        <option value="blind">Has Blind Spots</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
                    {RAW_LEGEND.filter(([code, name, kanji]) => {
                      if (
                        sandboxSearch &&
                        !code.toLowerCase().includes(sandboxSearch.toLowerCase()) &&
                        !name.toLowerCase().includes(sandboxSearch.toLowerCase()) &&
                        !kanji.includes(sandboxSearch)
                      ) {
                        return false;
                      }
                      const spec = PIECE_DB[code];
                      if (sandboxFilter === 'special' && !spec?.special) return false;
                      if (sandboxFilter === 'jump' && (!spec?.extraJumps || spec.extraJumps.length === 0)) return false;
                      if (sandboxFilter === 'blind' && (!spec?.blindSpots || spec.blindSpots.length === 0)) return false;
                      return true;
                    }).map(([code, name, kanji]) => (
                      <div
                        key={code}
                        onClick={() => setSandboxCode(code)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                          sandboxCode === code
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-mono-code font-bold text-amber-300 mr-2">[{code}]</span>
                          <span>{name}</span>
                          <span className="font-kanji text-slate-400 ml-2">{kanji}</span>
                        </div>
                        <span className="font-mono-code text-xs text-emerald-400">
                          {solvedPiecesMap[code] ? '✓' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {dojoSubTab === 'rush' && (
                    <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">3-Minute Puzzle Rush</span>
                        <span className="font-mono-code font-bold text-base text-emerald-400">
                          {formatClock(rushSecondsLeft * 1000)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Score: {rushScore}</span>
                        <span className="text-rose-400">Strikes: {rushStrikes} / 3</span>
                        <span className="text-amber-300">Best: {rushBestScore}</span>
                      </div>
                      <button
                        onClick={() => {
                          setRushActive(true);
                          setRushSecondsLeft(180);
                          setRushScore(0);
                          setRushStrikes(0);
                          loadCuratedPuzzle(CURATED_PUZZLES[0].id);
                        }}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        {rushActive ? 'Restart 3:00 Rush' : 'Start 3-Minute Puzzle Rush'}
                      </button>
                    </div>
                  )}

                  <div className="text-xs font-semibold text-amber-300">Curated Tsume & Tactical Problems</div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {CURATED_PUZZLES.map(puz => (
                      <div
                        key={puz.id}
                        onClick={() => loadCuratedPuzzle(puz.id)}
                        className={`p-3 rounded-xl cursor-pointer border transition-colors ${
                          activePuzzleId === puz.id
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{puz.title}</span>
                          <span className="text-emerald-400">{solvedPuzzlesMap[puz.id] ? 'Solved ✓' : ''}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {puz.difficulty} · {SCALE_CONFIGS[puz.scale].name}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              </aside>
            )}

            <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 kaya-surface overflow-y-auto">
              {dojoSubTab === 'sandbox' ? (
                <div className="w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-amber-200">
                        [{sandboxCode}] {PIECE_DB[sandboxCode]?.name} ({PIECE_DB[sandboxCode]?.kanji})
                      </h3>
                      <p className="text-xs text-slate-400">{sandboxStatusMsg}</p>
                    </div>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
                      {(['offense', 'blindspot', 'sandbox'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setSandboxDrillMode(m)}
                          className={`px-3 py-1 rounded-md font-semibold ${
                            sandboxDrillMode === m ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                          }`}
                        >
                          {m === 'offense' ? '1. Capture Drill' : m === 'blindspot' ? '2. Blind-Spot' : '3. Sandbox'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-xl p-4 space-y-2">
                  {(() => {
                    const puz = CURATED_PUZZLES.find(p => p.id === activePuzzleId) || CURATED_PUZZLES[0];
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-base text-amber-200">{puz.title}</h3>
                            <div className="text-xs text-slate-400">{puz.japaneseSubtitle}</div>
                          </div>
                          <button
                            onClick={() => setPuzzleShowHint(h => !h)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold"
                          >
                            {puzzleShowHint ? 'Hide Hint' : 'Show Solution Hint'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{puzzleFeedback}</p>
                        {puzzleShowHint && (
                          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
                            Hint: {puz.hint}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="my-2 flex flex-col items-center gap-3 w-full">
                <canvas
                  ref={dojoCanvasRef}
                  width={480}
                  height={480}
                  onContextMenu={e => {
                    e.preventDefault();
                    if (dojoSubTab !== 'sandbox' || sandboxDrillMode !== 'sandbox') return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;
                    const c = Math.floor(((e.clientX - rect.left) * scaleX - 20) / 40);
                    const r = Math.floor(((e.clientY - rect.top) * scaleY - 20) / 40);
                    if (!inBounds(r, c, 11, 11)) return;
                    if (r === sandboxPlayerPos.r && c === sandboxPlayerPos.c) return;
                    setSandboxBoard(prev => {
                      const next = cloneBoard(prev);
                      const cur = next[r][c];
                      if (!cur) next[r][c] = makePiece('SG', 'sente');
                      else if (cur.owner === 'sente') next[r][c] = makePiece('G', 'gote');
                      else next[r][c] = null;
                      return next;
                    });
                  }}
                  onMouseDown={e => {
                    if (e.button !== 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = e.currentTarget.width / rect.width;
                    const scaleY = e.currentTarget.height / rect.height;

                    if (dojoSubTab === 'sandbox') {
                      const c = Math.floor(((e.clientX - rect.left) * scaleX - 20) / 40);
                      const r = Math.floor(((e.clientY - rect.top) * scaleY - 20) / 40);
                      if (!inBounds(r, c, 11, 11)) return;
                      const analysis = analyzePieceMovesOnBoard(sandboxBoard, sandboxPlayerPos.r, sandboxPlayerPos.c);
                      const legal = analysis.moves.find(m => m.r === r && m.c === c);
                      if (!legal) return;

                      if (sandboxDrillMode === 'blindspot' && sandboxDangerSquares.has(`${r},${c}`)) {
                        setSandboxStatusMsg('Stepped onto a guarded danger square! Approach via the piece’s Blind Spot.');
                        Sound.playCheckAlert();
                        setTimeout(() => initSandboxBoard(), 800);
                        return;
                      }

                      const next = cloneBoard(sandboxBoard);
                      const target = next[r][c];
                      const moving = next[sandboxPlayerPos.r][sandboxPlayerPos.c]!;
                      next[r][c] = moving;
                      next[sandboxPlayerPos.r][sandboxPlayerPos.c] = null;

                      let rem = sandboxTargetsLeft - (target && target.owner === 'gote' ? 1 : 0);
                      if (PIECE_DB[moving.code]?.special === 'fire') {
                        Object.values(DIRS_8).forEach(([dr, dc]) => {
                          const nr = r + dr;
                          const nc = c + dc;
                          if (inBounds(nr, nc, 11, 11) && next[nr][nc]?.owner === 'gote') {
                            next[nr][nc] = null;
                            rem = Math.max(0, rem - 1);
                          }
                        });
                      }

                      Sound.playKomaClack(Boolean(target));
                      setSandboxBoard(next);
                      setSandboxPlayerPos({ r, c });
                      setSandboxMovesUsed(m => m + 1);
                      setSandboxTargetsLeft(rem);

                      if (sandboxDrillMode !== 'sandbox' && rem <= 0) {
                        Sound.playSolvedChime();
                        setSandboxStatusMsg(`★ MASTERED [${sandboxCode}]! All targets captured.`);
                        setSolvedPiecesMap(prev => {
                          const updated = { ...prev, [sandboxCode]: true };
                          localStorage.setItem('taikyoku_208_tactics_solved', JSON.stringify(updated));
                          return updated;
                        });
                      }
                      return;
                    }

                    if (puzzleStatus !== 'playing') return;
                    const puz = CURATED_PUZZLES.find(p => p.id === activePuzzleId) || CURATED_PUZZLES[0];
                    const cfg = SCALE_CONFIGS[puz.scale];
                    const cs = puz.scale === 'dobutsu' ? 96 : puz.scale === 'shogi9' ? 46 : 36;
                    const ox = Math.floor((e.currentTarget.width - cfg.cols * cs) / 2);
                    const oy = Math.floor((e.currentTarget.height - cfg.rows * cs) / 2);
                    const c = Math.floor(((e.clientX - rect.left) * scaleX - ox) / cs);
                    const r = Math.floor(((e.clientY - rect.top) * scaleY - oy) / cs);
                    if (!inBounds(r, c, cfg.rows, cfg.cols)) return;

                    const expected = puz.solutionSteps[puzzleStepIdx];
                    if (!expected) return;

                    if (puzzleSelectedDrop) {
                      if (
                        expected.type === 'drop' &&
                        expected.dropCode === puzzleSelectedDrop &&
                        expected.toR === r &&
                        expected.toC === c
                      ) {
                        const next = cloneBoard(puzzleBoard);
                        next[r][c] = makePiece(puzzleSelectedDrop, 'sente');
                        setPuzzleBoard(next);
                        setPuzzleHands(h => ({
                          ...h,
                          sente: h.sente.filter((_item, i) => i !== h.sente.indexOf(puzzleSelectedDrop)),
                        }));
                        setPuzzleSelectedDrop(null);
                        setPuzzleLegalMoves([]);
                        Sound.playKomaClack(false);
                        advancePuzzleStepOrWin(puz, next, puzzleStepIdx);
                      } else {
                        Sound.playCheckAlert();
                        setPuzzleFeedback('Not the sharpest Tsume move! Check how the Defender King can escape or check the Hint.');
                        if (rushActive) {
                          setRushStrikes(st => {
                            if (st + 1 >= 3) setRushActive(false);
                            return st + 1;
                          });
                        }
                      }
                      return;
                    }

                    if (puzzleSelectedCell) {
                      const mv = puzzleLegalMoves.find(m => m.r === r && m.c === c);
                      if (mv) {
                        const matchesDirect =
                          expected.type === 'move' &&
                          expected.fromR === puzzleSelectedCell.r &&
                          expected.fromC === puzzleSelectedCell.c &&
                          expected.toR === r &&
                          expected.toC === c;

                        if (matchesDirect) {
                          const next = cloneBoard(puzzleBoard);
                          const moving = { ...next[puzzleSelectedCell.r][puzzleSelectedCell.c]! };
                          if (expected.promote) {
                            const promo = getScalePromotesTo(moving.code, puz.scale);
                            if (promo) {
                              moving.code = promo;
                              moving.promoted = true;
                            }
                          }
                          next[r][c] = moving;
                          next[puzzleSelectedCell.r][puzzleSelectedCell.c] = null;

                          if (PIECE_DB[moving.code]?.special === 'fire') {
                            Object.values(DIRS_8).forEach(([dr, dc]) => {
                              const nr = r + dr;
                              const nc = c + dc;
                              if (inBounds(nr, nc, cfg.rows, cfg.cols) && next[nr][nc]?.owner === 'gote') {
                                next[nr][nc] = null;
                              }
                            });
                          }

                          if (expected.secondToR !== undefined && expected.secondToC !== undefined) {
                            next[expected.secondToR][expected.secondToC] = moving;
                            if (expected.secondToR !== r || expected.secondToC !== c) {
                              next[r][c] = null;
                            }
                          }

                          setPuzzleBoard(next);
                          setPuzzleSelectedCell(null);
                          setPuzzleLegalMoves([]);
                          Sound.playKomaClack(true);
                          advancePuzzleStepOrWin(puz, next, puzzleStepIdx);
                          return;
                        } else {
                          Sound.playCheckAlert();
                          setPuzzleFeedback('That move allows Gote to defend! Look for the forced checkmate or tactical line.');
                          if (rushActive) {
                            setRushStrikes(st => {
                              if (st + 1 >= 3) setRushActive(false);
                              return st + 1;
                            });
                          }
                        }
                      }
                    }

                    const clicked = puzzleBoard[r]?.[c];
                    if (clicked && clicked.owner === 'sente') {
                      setPuzzleSelectedDrop(null);
                      setPuzzleSelectedCell({ r, c });
                      const analysis = analyzePieceMovesOnBoard(puzzleBoard, r, c, { scale: puz.scale });
                      setPuzzleLegalMoves(analysis.moves);
                    }
                  }}
                  className="max-w-full h-auto rounded-xl border-2 border-amber-600/60 shadow-2xl cursor-pointer"
                />

                {dojoSubTab !== 'sandbox' && (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                    <span className="font-semibold text-amber-300">▲ Sente Hand (Click to Drop):</span>
                    {puzzleHands.sente.length === 0 ? (
                      <span className="text-slate-500">None</span>
                    ) : (
                      puzzleHands.sente.map((code, i) => (
                        <button
                          key={`${code}-${i}`}
                          onClick={() => {
                            setPuzzleSelectedCell(null);
                            setPuzzleSelectedDrop(code);
                            const puz = CURATED_PUZZLES.find(p => p.id === activePuzzleId) || CURATED_PUZZLES[0];
                            const { drops } = getLegalDropsForHandPiece(puzzleBoard, 'sente', code, puz.scale);
                            setPuzzleLegalMoves(drops);
                          }}
                          className={`px-3 py-1 rounded font-mono-code font-bold border ${
                            puzzleSelectedDrop === code
                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                              : 'bg-slate-900 text-amber-200 border-slate-700'
                          }`}
                        >
                          [{code}] {PIECE_DB[code]?.name}
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => loadCuratedPuzzle(activePuzzleId)}
                      className="ml-auto px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                    >
                      Reset Problem
                    </button>
                  </div>
                )}

                {dojoSubTab === 'sandbox' && (
                  <div className="flex flex-wrap items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sandboxShowVectors}
                        onChange={e => setSandboxShowVectors(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>Show BLIND / MAX / BLOCK Vector Tags</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sandboxTestPromo}
                        onChange={e => setSandboxTestPromo(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>Test Promoted Form</span>
                    </label>
                    <button
                      onClick={() => initSandboxBoard()}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                    >
                      Reset Sandbox
                    </button>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* ==================== VIEW 3: ACADEMY (ALL 40 INTERACTIVE LESSONS) ==================== */}
      {activeTab === 'academy' && (
        <div className="flex-1 flex overflow-hidden bg-[#0b0e14] relative">
          {trainingSidebarOpen && (
            <aside className="fixed md:static inset-y-24 left-0 w-96 max-w-[88vw] shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col p-4 space-y-3 overflow-hidden z-30 shadow-2xl md:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">40-Lesson Interactive Syllabus</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-code text-xs text-emerald-400">
                    {Object.keys(completedLessonsMap).length} / 40
                  </span>
                  <button
                    onClick={() => setTrainingSidebarOpen(false)}
                    className="md:hidden text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-lg text-xs">
                {[
                  { ch: 0, label: 'All' },
                  { ch: 1, label: 'Ch.1' },
                  { ch: 2, label: 'Ch.2' },
                  { ch: 3, label: 'Ch.3' },
                  { ch: 4, label: 'Ch.4' },
                ].map(tab => (
                  <button
                    key={tab.ch}
                    onClick={() => setAcademyChapterFilter(tab.ch)}
                    className={`py-1 rounded font-semibold ${
                      academyChapterFilter === tab.ch ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {ACADEMY_LESSONS_40.filter(l => academyChapterFilter === 0 || l.chapter === academyChapterFilter).map(
                  les => (
                    <div
                      key={les.id}
                      onClick={() => loadAcademyLesson(les.id)}
                      className={`p-2.5 rounded-xl cursor-pointer border transition-colors ${
                        activeLessonId === les.id
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="truncate">{les.title}</span>
                        <span className="text-emerald-400 shrink-0 ml-2">
                          {completedLessonsMap[les.id] ? '✓' : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                        <span className="font-kanji">{les.kanjiSubtitle}</span>
                        <span>{SCALE_CONFIGS[les.scale].name}</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </aside>
          )}

          <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 kaya-surface overflow-y-auto">
            {(() => {
              const les = ACADEMY_LESSONS_40.find(l => l.id === activeLessonId) || ACADEMY_LESSONS_40[0];
              return (
                <>
                  <div className="w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-amber-400 font-semibold">{les.chapterName}</div>
                        <h2 className="font-bold text-base text-white">
                          {les.title} · <span className="font-kanji text-amber-200">{les.kanjiSubtitle}</span>
                        </h2>
                      </div>
                      <button
                        onClick={() => setLessonShowHint(h => !h)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold"
                      >
                        {lessonShowHint ? 'Hide Hint' : 'Show Hint'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{les.conceptSummary}</p>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-200">
                      Objective: {lessonFeedback}
                    </div>
                    {lessonShowHint && (
                      <div className="p-2 rounded bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200">
                        Hint: {les.hint}
                      </div>
                    )}
                  </div>

                  <div className="my-2 flex flex-col items-center gap-3 w-full">
                    <canvas
                      ref={academyCanvasRef}
                      width={460}
                      height={460}
                      onMouseDown={e => {
                        if (e.button !== 0 || lessonCompleted) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const scaleX = e.currentTarget.width / rect.width;
                        const scaleY = e.currentTarget.height / rect.height;
                        const cfg = SCALE_CONFIGS[les.scale];
                        const cs = les.scale === 'dobutsu' ? 96 : les.scale === 'shogi9' ? 46 : 36;
                        const ox = Math.floor((e.currentTarget.width - cfg.cols * cs) / 2);
                        const oy = Math.floor((e.currentTarget.height - cfg.rows * cs) / 2);
                        const c = Math.floor(((e.clientX - rect.left) * scaleX - ox) / cs);
                        const r = Math.floor(((e.clientY - rect.top) * scaleY - oy) / cs);
                        if (!inBounds(r, c, cfg.rows, cfg.cols)) return;

                        const t = les.targetMove;

                        if (lessonMultiOrigin && lessonSelectedCell) {
                          if (t.secondToR === r && t.secondToC === c) {
                            const next = cloneBoard(lessonBoard);
                            const moving = next[lessonSelectedCell.r][lessonSelectedCell.c]!;
                            next[r][c] = moving;
                            if (r !== lessonSelectedCell.r || c !== lessonSelectedCell.c) {
                              next[lessonSelectedCell.r][lessonSelectedCell.c] = null;
                            }
                            setLessonBoard(next);
                            setLessonMultiOrigin(null);
                            setLessonSelectedCell(null);
                            setLessonLegalMoves([]);
                            setLessonCompleted(true);
                            Sound.playSolvedChime();
                            setLessonFeedback(`★ LESSON ${les.id} COMPLETE! Multi-step Lion maneuver mastered.`);
                            setCompletedLessonsMap(prev => {
                              const updated = { ...prev, [les.id]: true };
                              localStorage.setItem('taikyoku_academy_completed', JSON.stringify(updated));
                              return updated;
                            });
                            addPlayerXP(60, 'completeLesson');
                          } else {
                            Sound.playCheckAlert();
                            setLessonFeedback('Click the target second-step square to complete the Lion maneuver!');
                          }
                          return;
                        }

                        if (lessonSelectedDrop) {
                          if (t.type === 'drop' && t.dropCode === lessonSelectedDrop && t.toR === r && t.toC === c) {
                            const next = cloneBoard(lessonBoard);
                            next[r][c] = makePiece(lessonSelectedDrop, 'sente');
                            setLessonBoard(next);
                            setLessonHands({ sente: [], gote: [] });
                            setLessonSelectedDrop(null);
                            setLessonLegalMoves([]);
                            setLessonCompleted(true);
                            Sound.playSolvedChime();
                            setLessonFeedback(`★ LESSON ${les.id} COMPLETE! Click "Next Lesson →" below.`);
                            setCompletedLessonsMap(prev => {
                              const updated = { ...prev, [les.id]: true };
                              localStorage.setItem('taikyoku_academy_completed', JSON.stringify(updated));
                              return updated;
                            });
                            addPlayerXP(60, 'completeLesson');
                          } else {
                            Sound.playCheckAlert();
                            setLessonFeedback(`Try dropping [${t.dropCode}] onto the highlighted target square (${t.toR}, ${t.toC}).`);
                          }
                          return;
                        }

                        if (lessonSelectedCell) {
                          if (
                            t.type === 'move' &&
                            t.fromR === lessonSelectedCell.r &&
                            t.fromC === lessonSelectedCell.c &&
                            t.toR === r &&
                            t.toC === c
                          ) {
                            const next = cloneBoard(lessonBoard);
                            const moving = { ...next[lessonSelectedCell.r][lessonSelectedCell.c]! };
                            const promo = getScalePromotesTo(moving.code, les.scale);
                            if (promo && r < cfg.promoRanks) {
                              moving.code = promo;
                              moving.promoted = true;
                            }
                            next[r][c] = moving;
                            next[lessonSelectedCell.r][lessonSelectedCell.c] = null;

                            if (PIECE_DB[moving.code]?.special === 'fire') {
                              Object.values(DIRS_8).forEach(([dr, dc]) => {
                                const nr = r + dr;
                                const nc = c + dc;
                                if (inBounds(nr, nc, cfg.rows, cfg.cols) && next[nr][nc]?.owner === 'gote') {
                                  next[nr][nc] = null;
                                }
                              });
                            }

                            if (t.secondToR !== undefined && t.secondToC !== undefined) {
                              setLessonBoard(next);
                              setLessonMultiOrigin(lessonSelectedCell);
                              setLessonSelectedCell({ r, c });
                              const step2 = analyzePieceMovesOnBoard(next, r, c, {
                                isSecondStep: true,
                                originSquare: lessonSelectedCell,
                                scale: les.scale,
                              });
                              setLessonLegalMoves(step2.moves);
                              Sound.playKomaClack(true);
                              setLessonFeedback('Step 1 complete! Now click the second-step destination square.');
                              return;
                            }

                            setLessonBoard(next);
                            setLessonSelectedCell(null);
                            setLessonLegalMoves([]);
                            setLessonCompleted(true);
                            Sound.playSolvedChime();
                            setLessonFeedback(`★ LESSON ${les.id} COMPLETE! Click "Next Lesson →" below.`);
                            setCompletedLessonsMap(prev => {
                              const updated = { ...prev, [les.id]: true };
                              localStorage.setItem('taikyoku_academy_completed', JSON.stringify(updated));
                              return updated;
                            });
                            addPlayerXP(60, 'completeLesson');
                            return;
                          }
                        }

                        const clicked = lessonBoard[r]?.[c];
                        if (clicked && clicked.owner === 'sente') {
                          setLessonSelectedDrop(null);
                          setLessonSelectedCell({ r, c });
                          const analysis = analyzePieceMovesOnBoard(lessonBoard, r, c, { scale: les.scale });
                          setLessonLegalMoves(analysis.moves);
                          Sound.playKomaClack(false);
                        }
                      }}
                      className="max-w-full h-auto rounded-xl border-2 border-amber-600/60 shadow-2xl cursor-pointer"
                    />

                    <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                      {lessonHands.sente.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-semibold">Hand:</span>
                          {lessonHands.sente.map((code, i) => (
                            <button
                              key={`${code}-${i}`}
                              onClick={() => {
                                setLessonSelectedCell(null);
                                setLessonSelectedDrop(code);
                                const { drops } = getLegalDropsForHandPiece(lessonBoard, 'sente', code, les.scale);
                                setLessonLegalMoves(drops);
                              }}
                              className={`px-3 py-1 rounded font-mono-code font-bold border ${
                                lessonSelectedDrop === code
                                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                                  : 'bg-slate-900 text-amber-200 border-slate-700'
                              }`}
                            >
                              [{code}]
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => loadAcademyLesson(les.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                      >
                        Reset Lesson
                      </button>
                      <button
                        onClick={() => loadAcademyLesson(les.id < 40 ? les.id + 1 : 1)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                      >
                        Next Lesson →
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </main>
        </div>
      )}

      {/* ==================== VIEW 4: ONLINE MATCHMAKING, TOURNAMENTS & PROGRESSION ==================== */}
      {activeTab === 'tournaments' && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#0b0e14]">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-amber-400 font-semibold">{progression.selectedBadge}</div>
                    <h3 className="font-bold text-lg text-white">{progression.name}</h3>
                    <div className="text-xs text-slate-400 font-mono-code">
                      Level {progression.level} · {progression.xp} XP · {progression.elo} ELO
                    </div>
                  </div>
                  <select
                    value={progression.selectedBadge}
                    onChange={e => {
                      const updated = { ...progression, selectedBadge: e.target.value };
                      setProgression(updated);
                      localStorage.setItem('taikyoku_player_progression', JSON.stringify(updated));
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300"
                  >
                    <option value="初段 • Shodan">初段 • Shodan</option>
                    <option value="獅子使い • Lion Tamer">獅子使い • Lion Tamer</option>
                    <option value="火鬼将軍 • Fire Demon">火鬼将軍 • Fire Demon</option>
                    <option value="大局名人 • Taikyoku Meijin">大局名人 • Taikyoku Meijin</option>
                  </select>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(progression.xp % 500) / 5}%` }}
                  />
                </div>

                <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
                  <div className="font-semibold text-slate-300">Daily Missions</div>
                  <div className="flex justify-between text-slate-400">
                    <span>Complete Matches</span>
                    <span className="font-mono-code text-emerald-400">{progression.missions.playMatch} / 3</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Solve Multi-Move Tsume Problems</span>
                    <span className="font-mono-code text-emerald-400">{progression.missions.solveTsume} / 5</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Complete Academy Lessons</span>
                    <span className="font-mono-code text-emerald-400">{progression.missions.completeLesson} / 5</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white">
                      Live Server Matchmaking & Open Lobby ({onlineCount} Online)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time WebSocket matchmaking with server-authoritative Fischer clocks ({TIME_CONTROL_SPECS[timeControl].label}).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        wsRef.current?.send(
                          JSON.stringify({ type: 'queue:join', mode: 'casual', scale, timeControl })
                        );
                      }}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
                    >
                      Join Casual Queue
                    </button>
                    <button
                      onClick={() => {
                        wsRef.current?.send(
                          JSON.stringify({ type: 'queue:join', mode: 'ranked', scale, timeControl })
                        );
                      }}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Join Ranked Queue
                    </button>
                    <button
                      onClick={() => {
                        wsRef.current?.send(
                          JSON.stringify({
                            type: 'room:create',
                            name: `${progression.name}'s ${SCALE_CONFIGS[scale].name}`,
                            scale,
                            timeControl,
                          })
                        );
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                    >
                      Create Open Room
                    </button>
                  </div>
                </div>

                {queueSearching && (
                  <div className="flex items-center justify-between bg-amber-950/50 border border-amber-500/40 rounded-lg px-4 py-2.5 text-xs">
                    <span className="text-amber-200 font-semibold">
                      Searching for live opponent in {queueSearching}... (Open a second browser tab to match instantly, or play AI Master now)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'queue:leave' }));
                          setQueueSearching(null);
                          setOpponentMode('ai');
                          setActiveTab('match');
                        }}
                        className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold"
                      >
                        Play vs. AI Master Now
                      </button>
                      <button
                        onClick={() => {
                          wsRef.current?.send(JSON.stringify({ type: 'queue:leave' }));
                          setQueueSearching(null);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Open Lobby Rooms</div>
                  {lobbyRooms.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-lg p-3">
                      No open rooms waiting. Click "Create Open Room" or "Join Ranked Queue" above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {lobbyRooms.map(rm => (
                        <div
                          key={rm.id}
                          className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-200">{rm.name}</div>
                            <div className="text-slate-400">
                              {rm.scale} · {rm.timeControl} · Host: {rm.senteName}
                            </div>
                          </div>
                          {rm.status === 'waiting' && (
                            <button
                              onClick={() => wsRef.current?.send(JSON.stringify({ type: 'room:join', roomId: rm.id }))}
                              className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                            >
                              Join Match
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tournamentsList.map(t => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-amber-200">{t.title}</h3>
                      <div className="text-xs text-slate-400">
                        {t.size}-Player Bracket · {SCALE_CONFIGS[t.scale as BoardScaleId]?.name || t.scale} ·{' '}
                        {t.participants.length}/{t.size} Seated
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'registering' && (
                        <button
                          onClick={() =>
                            wsRef.current?.send(JSON.stringify({ type: 'tournament:join', tournamentId: t.id }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
                        >
                          Join Seat
                        </button>
                      )}
                      <button
                        onClick={() =>
                          wsRef.current?.send(JSON.stringify({ type: 'tournament:fill_bots', tournamentId: t.id }))
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                      >
                        {t.status === 'completed' ? 'Restart & Seed Bracket' : 'Fill Empty Seats & Start'}
                      </button>
                      <button
                        onClick={() =>
                          wsRef.current?.send(JSON.stringify({ type: 'tournament:reset', tournamentId: t.id }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {t.champion && (
                    <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-400 text-xs font-bold text-amber-200 text-center">
                      ★ Tournament Champion: {t.champion.name} ({t.champion.elo} ELO)
                    </div>
                  )}

                  <div className="space-y-2">
                    {t.matches.map(m => {
                      const isMyMatch =
                        m.status === 'active' && (m.p1?.id === myClientId || m.p2?.id === myClientId);
                      return (
                        <div
                          key={m.slotId}
                          className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono-code uppercase text-slate-400 w-12">{m.slotId}</span>
                            <div>
                              <span className={m.winner && m.winner.id === m.p1?.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                                {m.p1 ? `${m.p1.name}` : 'TBD'}
                              </span>
                              <span className="text-slate-500 mx-2">vs</span>
                              <span className={m.winner && m.winner.id === m.p2?.id ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                                {m.p2 ? `${m.p2.name}` : 'TBD'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.winner ? (
                              <span className="text-emerald-400 font-semibold">Winner: {m.winner.name}</span>
                            ) : isMyMatch ? (
                              <button
                                onClick={() => {
                                  const opp = m.p1?.id === myClientId ? m.p2 : m.p1;
                                  if (opp?.botId) setSelectedBotId(opp.botId);
                                  setOpponentMode('ai');
                                  setActiveTournamentMatch({ tournamentId: t.id, slotId: m.slotId });
                                  startNewMatch((t.scale as BoardScaleId) || 'shogi9', (t.timeControl as TimeControlId) || 'blitz');
                                  setActiveTab('match');
                                }}
                                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                              >
                                Play Match on Board
                              </button>
                            ) : (
                              <span className="text-slate-500">{m.status}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">
                    Direct Browser-to-Browser WebRTC P2P (PeerJS & Serverless SDP)
                  </h3>
                  <p className="text-xs text-slate-400">{p2pStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5">
                  <div className="font-bold text-emerald-400">1. Host PeerJS Room (▲ Sente)</div>
                  <button
                    onClick={hostPeerRoom}
                    className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold"
                  >
                    Generate Room Code
                  </button>
                  {p2pRoomCode && (
                    <div className="p-2 rounded bg-slate-900 border border-emerald-500/40 font-mono-code text-center font-bold text-emerald-300">
                      {p2pRoomCode}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5">
                  <div className="font-bold text-sky-400">2. Join PeerJS Room (△ Gote)</div>
                  <input
                    type="text"
                    value={p2pJoinInput}
                    onChange={e => setP2pJoinInput(e.target.value)}
                    placeholder="Enter Room Code (e.g. taikyoku-4821)"
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono-code"
                  />
                  <button
                    onClick={joinPeerRoom}
                    className="w-full py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                  >
                    Connect to Room
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-amber-300">3. Zero-Broker Manual SDP</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={generateManualOffer}
                      className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                    >
                      1. Host Offer
                    </button>
                    <button
                      onClick={generateManualAnswer}
                      className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                    >
                      2. Guest Answer
                    </button>
                    <button
                      onClick={completeManualHandshake}
                      className="flex-1 py-1.5 rounded bg-amber-500 text-slate-950 font-bold"
                    >
                      3. Link
                    </button>
                  </div>
                  <input
                    type="text"
                    value={manualOfferOut || manualOfferIn}
                    onChange={e => setManualOfferIn(e.target.value)}
                    placeholder="Offer SDP token (copy or paste here)..."
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono-code text-[10px]"
                  />
                  <input
                    type="text"
                    value={manualAnswerOut || manualAnswerIn}
                    onChange={e => setManualAnswerIn(e.target.value)}
                    placeholder="Answer SDP token (copy or paste here)..."
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono-code text-[10px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 5: COMPLETE 208+ PIECE LEGEND & PROMOTED-ONLY CATALOG ==================== */}
      {activeTab === 'legend' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14] p-6">
          <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg text-amber-200">
                  Complete 208 Starting Legend (AB–YA) + Historical Promoted-Only Pieces
                </h2>
                <p className="text-xs text-slate-400">
                  Every piece has an explicit, deterministic movement table, Chess analogy, and promotion target (including Flying Crocodile [FCr] 飛鰐, Free Boar [FBo] 奔猪, Heavenly Tetrarch [HT] 四天王, and Great Whale [GW] 大鯨).
                </p>
              </div>
              <input
                type="text"
                value={legendSearch}
                onChange={e => setLegendSearch(e.target.value)}
                placeholder="Search code, English name, or Kanji..."
                className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white w-72 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
              {allLegendEntries
                .filter(
                  item =>
                    !legendSearch.trim() ||
                    item.code.toLowerCase().includes(legendSearch.toLowerCase()) ||
                    item.name.toLowerCase().includes(legendSearch.toLowerCase()) ||
                    item.kanji.includes(legendSearch)
                )
                .map(item => {
                  const spec = PIECE_DB[item.code];
                  if (!spec) return null;
                  return (
                    <div
                      key={item.code}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-12 shogi-koma flex flex-col items-center justify-center shrink-0">
                              <span className="font-mono-code font-black text-[10px] text-amber-900 leading-none">
                                {spec.code}
                              </span>
                              <span className="font-kanji font-black text-sm text-slate-950 leading-none mt-0.5">
                                {spec.kanji.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-sm text-amber-200">{spec.name}</div>
                              <div className="text-xs font-mono-code text-slate-400">
                                [{spec.code}] · {spec.kanji} {item.promotedOnly ? '· Promoted-Only' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-sky-300 font-medium">{spec.chessAnalogy}</div>
                        <p className="text-xs text-slate-300 leading-snug">{spec.moveSummary}</p>
                        <div className="flex items-center justify-between text-[11px] text-emerald-300 font-mono-code">
                          <span>War-Budget Cost: {getPieceWarBudgetCost(spec.code)} Koku</span>
                          <span>
                            Tier 1 → [{getEvolutionBranches(spec.code, 1)[0]?.code || 'G'}] → [K/CP]
                          </span>
                        </div>
                        {spec.promotesTo && PIECE_DB[spec.promotesTo] && (
                          <div className="text-[11px] text-amber-300 font-mono-code">
                            Promotes → [{spec.promotesTo}] {PIECE_DB[spec.promotesTo].name} ({PIECE_DB[spec.promotesTo].kanji})
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setInspectedCode(spec.code);
                            setLocatedPieceCode(spec.code);
                            setActiveTab('match');
                          }}
                          className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          Locate on Board
                        </button>
                        <button
                          onClick={() => {
                            setSandboxCode(spec.isPromotedOnly && spec.unpromotedCode ? spec.unpromotedCode : spec.code);
                            setSandboxTestPromo(Boolean(spec.isPromotedOnly));
                            setDojoSubTab('sandbox');
                            setActiveTab('dojo');
                          }}
                          className="py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                        >
                          Train in Dojo
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 4: SETTINGS TAB (MULTI-AGENT STUDIO TEAM, 327 USER TESTS & PREFS) ==================== */}
      {activeTab === 'tests' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14] p-4 md:p-6">
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col overflow-hidden space-y-3.5">
            {/* Settings Sub-Navigation Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setSettingsSubTab('agents')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                    settingsSubTab === 'agents'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1. Multi-Agent Studio Team (8 Agents: Testers, Designers, Gamers)
                </button>
                <button
                  onClick={() => {
                    setTestSuiteSummary(runAllUserTests(testCategoryFilter === 'all' ? undefined : testCategoryFilter));
                    setSettingsSubTab('tests');
                  }}
                  className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                    settingsSubTab === 'tests'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2. Automated & Interactive User Tests (327 Suites)
                </button>
                <button
                  onClick={() => setSettingsSubTab('prefs')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                    settingsSubTab === 'prefs'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  3. Display, Audio & .ZIP Export
                </button>
              </div>

              <span className="text-xs text-slate-400">
                Settings Hub: User Tests and the Multi-Agent Studio Team live exclusively here.
              </span>
            </div>

            {/* SUB-TAB 1: MULTI-AGENT STUDIO TEAM (QA TESTERS, DESIGNERS & SIMULATED GAMERS) */}
            {settingsSubTab === 'agents' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3.5">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-base text-emerald-300">
                      Multi-Agent Studio Team (/src/agents/agentTeam.ts) — QA Testers, Game Designers & Simulated Gamers
                    </h2>
                    <p className="text-xs text-slate-400">
                      8 autonomous agents continuously stress-test 36×36 Dual-Royal survival, 12×12 War-Budget economy, Parachute drop limits, 4-Tier Pawn→King evolution, and responsive layout ergonomics.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2 text-xs font-mono-code">
                      <span className="text-emerald-400 font-bold">
                        {agentSuiteReport.passedAgents}/{agentSuiteReport.totalAgents} Agents Passing
                      </span>
                      <span className="text-slate-600 mx-2">·</span>
                      <span className="text-amber-300 font-bold">
                        {agentSuiteReport.totalGamesSimulated} Simulated Matches
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setAgentSuiteReport(runAllStudioAgents());
                        Sound.playSolvedChime();
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                    >
                      Run All 8 Studio Agents ⚡
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                  {/* Left: 8 Agent Cards */}
                  <div className="lg:col-span-2 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                    {STUDIO_AGENT_TEAM.map(agent => {
                      const rep = agentSuiteReport.reports.find(r => r.agentId === agent.id);
                      const isSel = selectedAgentId === agent.id;
                      const roleBadge =
                        agent.division === 'tester'
                          ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                          : agent.division === 'designer'
                          ? 'bg-sky-950 border-sky-500/50 text-sky-300'
                          : 'bg-amber-950 border-amber-500/50 text-amber-300';
                      return (
                        <div
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between space-y-2.5 ${
                            isSel
                              ? 'bg-slate-800/90 border-amber-400'
                              : 'bg-slate-900 hover:bg-slate-800/50 border-slate-800'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-mono-code font-bold uppercase ${roleBadge}`}>
                                {agent.division} · {agent.badge}
                              </span>
                              <span className="text-xs font-mono-code text-emerald-400 font-bold">
                                {rep?.passed ? 'PASS ✓' : 'READY'}
                              </span>
                            </div>
                            <div className="font-bold text-sm text-white">
                              {agent.name} <span className="font-kanji text-amber-300 text-xs">({agent.kanjiTitle})</span>
                            </div>
                            <div className="text-xs text-amber-200/90 font-medium">{agent.specialty}</div>
                            <p className="text-xs text-slate-400 leading-snug">{agent.manifesto}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                            <span className="font-mono-code text-slate-400">
                              {rep ? `${rep.metrics.assertionsPassed}/${rep.metrics.assertionsTotal} checks` : ''}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const single = runStudioAgentSimulation(agent.id);
                                setAgentSuiteReport(prev => ({
                                  ...prev,
                                  reports: prev.reports.map(r => (r.agentId === agent.id ? single : r)),
                                }));
                                setSelectedAgentId(agent.id);
                                Sound.playKomaClack(false);
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                            >
                              Simulate Agent
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Selected Agent Live Telemetry & Playtest Report */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto space-y-3">
                    {(() => {
                      const agent = STUDIO_AGENT_TEAM.find(a => a.id === selectedAgentId) || STUDIO_AGENT_TEAM[0];
                      const rep = agentSuiteReport.reports.find(r => r.agentId === agent.id);
                      return (
                        <>
                          <div className="space-y-2">
                            <div className="text-xs font-mono-code text-emerald-400 font-bold uppercase">
                              Agent Simulation Report · {agent.id}
                            </div>
                            <h3 className="font-bold text-base text-amber-200">
                              {agent.name} ({agent.kanjiTitle})
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{rep?.headline}</p>
                          </div>

                          {rep && (
                            <div className="space-y-2 flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono-code text-xs">
                              {rep.findings.map((line, i) => (
                                <div key={i} className="text-emerald-300 border-b border-slate-900 pb-1">
                                  ✓ {line}
                                </div>
                              ))}
                            </div>
                          )}

                          {rep && (
                            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200">
                              <strong>Agent Recommendation:</strong> {rep.recommendation}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: AUTOMATED & INTERACTIVE USER TEST SUITE (327 TESTS) */}
            {settingsSubTab === 'tests' && (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-bold text-base text-amber-200">
                      Complete 327-Test Automated & Interactive User Suite (War-Budget 12×12, 36×36 5s Auto-Move & 48h Clock, 8 Agents, 16 Castles, 20 AI Masters, 220 Piece Drills, Dojo & 40 Lessons)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Every feature, War-Budget rule, Parachute drop limit, 4-Tier Evolution path, AI Master, Castle, Piece Drill, Dojo Puzzle, and Academy Lesson is verified here.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2 text-xs font-mono-code">
                      <span className="text-emerald-400 font-bold">
                        {testSuiteSummary.passedTests}/{testSuiteSummary.totalTests} Tests Passed
                      </span>
                      <span className="text-slate-600 mx-2">·</span>
                      <span className="text-amber-300 font-bold">
                        {testSuiteSummary.passedAssertions}/{testSuiteSummary.totalAssertions} Assertions
                      </span>
                      <span className="text-slate-600 mx-2">·</span>
                      <span className="text-slate-400">{testSuiteSummary.durationMs}ms</span>
                    </div>
                    <button
                      onClick={() => {
                        const fresh = runAllUserTests(testCategoryFilter === 'all' ? undefined : testCategoryFilter);
                        setTestSuiteSummary(fresh);
                        Sound.playSolvedChime();
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                    >
                      Run Active Suite
                    </button>
                  </div>
                </div>

                {/* Category Filter Bar + Search Input */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All 327 User Tests' },
                        { id: 'war_budget_agents', label: '★ War-Budget 12×12, 36×36 5s & Agents (6)' },
                        { id: 'match_board', label: '1. Match & 36×36 (9)' },
                        { id: 'strategies_castles', label: '2. Strategies & Castles (16)' },
                        { id: 'ai_masters', label: '3. 20 AI Masters — Raiden & All (20)' },
                        { id: 'piece_drills', label: '4. Piece Drill Selector (220)' },
                        { id: 'dojo', label: '5. Dojo Tsume & Sandbox (14)' },
                        { id: 'academy', label: '6. Academy Lessons (40)' },
                        { id: 'online_tournament', label: '7. Online & Tourney (2)' },
                      ] as { id: TestCategory | 'all'; label: string }[]
                    ).map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setTestCategoryFilter(cat.id);
                          setTestSuiteSummary(runAllUserTests(cat.id === 'all' ? undefined : cat.id));
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
                          testCategoryFilter === cat.id
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={testSearchQuery}
                    onChange={e => setTestSearchQuery(e.target.value)}
                    placeholder="Search test (e.g. WB-01, Parachute, Raiden, Yagura, PD-LN)..."
                    className="w-72 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Test Results List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {testSuiteSummary.results
                    .filter(test => {
                      if (!testSearchQuery.trim()) return true;
                      const q = testSearchQuery.toLowerCase();
                      return (
                        test.id.toLowerCase().includes(q) ||
                        test.title.toLowerCase().includes(q) ||
                        test.description.toLowerCase().includes(q)
                      );
                    })
                    .map(test => {
                      const isExpanded = expandedTestId === test.id;
                      return (
                        <div
                          key={test.id}
                          className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${
                            test.passed ? 'border-slate-800' : 'border-rose-500'
                          }`}
                        >
                          <div
                            onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                            className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/60"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`px-2 py-0.5 rounded font-mono-code font-bold text-xs shrink-0 ${
                                  test.passed
                                    ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                                    : 'bg-rose-950 border border-rose-500 text-rose-200'
                                }`}
                              >
                                {test.passed ? 'PASS' : 'FAIL'} · {test.id}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-slate-100 truncate">{test.title}</div>
                                <div className="text-xs text-slate-400 truncate">{test.description}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {test.drillCode && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const spec = PIECE_DB[test.drillCode!];
                                    setSandboxCode(
                                      spec?.isPromotedOnly && spec.unpromotedCode ? spec.unpromotedCode : test.drillCode!
                                    );
                                    setSandboxTestPromo(Boolean(spec?.isPromotedOnly));
                                    setDojoSubTab('sandbox');
                                    setActiveTab('dojo');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                                >
                                  Open in Training Hub
                                </button>
                              )}
                              {test.puzzleId && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    loadCuratedPuzzle(test.puzzleId!);
                                    setDojoSubTab('tsume');
                                    setActiveTab('dojo');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                                >
                                  Solve in Dojo
                                </button>
                              )}
                              {test.lessonId !== undefined && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    loadAcademyLesson(test.lessonId!);
                                    setActiveTab('academy');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                                >
                                  Open in Academy
                                </button>
                              )}
                              {test.boardPreset && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    loadInteractivePresetOnBoard(test.boardPreset!);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap"
                                >
                                  {test.botId ? 'Challenge Bot on Board' : 'Load on Match Board'}
                                </button>
                              )}
                              <span className="font-mono-code text-xs text-slate-400">
                                {test.assertionsPassed}/{test.assertionsTotal} · {test.durationMs}ms
                              </span>
                              <span className="text-xs text-amber-300 font-semibold">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 space-y-2 text-xs font-mono-code">
                              {test.boardPreset && (
                                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 font-sans flex items-center justify-between gap-2">
                                  <span>
                                    <strong>Interactive Board Scenario:</strong> {test.boardPreset.description}
                                  </span>
                                  <button
                                    onClick={() => loadInteractivePresetOnBoard(test.boardPreset!)}
                                    className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold whitespace-nowrap shrink-0"
                                  >
                                    Play This Scenario on Match Board
                                  </button>
                                </div>
                              )}
                              {test.details.map((line, i) => (
                                <div
                                  key={i}
                                  className={
                                    line.startsWith('PASS:') ? 'text-emerald-300' : 'text-rose-400 font-bold'
                                  }
                                >
                                  ✓ {line}
                                </div>
                              ))}
                              {test.error && <div className="text-rose-400 font-bold">Error: {test.error}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* SUB-TAB 3: DISPLAY, AUDIO & PROJECT EXPORT PREFERENCES */}
            {settingsSubTab === 'prefs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-amber-200">Board Display, Timers & Ergonomics</h3>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span>Piece Tile Label Style</span>
                    <button
                      onClick={() =>
                        setLabelMode(m => (m === 'western' ? 'hybrid' : m === 'hybrid' ? 'kanji' : 'western'))
                      }
                      className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-semibold"
                    >
                      {labelMode === 'western'
                        ? 'Western + Pips'
                        : labelMode === 'hybrid'
                        ? 'Hybrid (A–Z + 漢字)'
                        : 'Traditional Kanji (漢字)'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span>Grand 36×36 5-Second Auto-Move Commander</span>
                    <button
                      onClick={() => setAutoMove36Enabled(a => !a)}
                      className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-emerald-300 font-semibold"
                    >
                      {autoMove36Enabled ? 'Enabled (5.0s Countdown)' : 'Paused'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span>Synthesized Hinoki & Kaya Wood Sound</span>
                    <button
                      onClick={() => {
                        Sound.enabled = !soundEnabled;
                        setSoundEnabled(!soundEnabled);
                      }}
                      className="px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-semibold"
                    >
                      {soundEnabled ? 'Sound: On' : 'Muted'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-amber-200">Complete Source Code .ZIP Archive</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Download the full standalone project including all 5 board scales (Dōbutsu 3×4, Standard 9×9, Chū 12×12, War-Budget 12×12, Grand 36×36), the 208+ piece engine, Multi-Agent Studio Team, and 327 User Tests.
                  </p>
                  <button
                    onClick={exportFullProjectZip}
                    disabled={isExportingZip}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    {isExportingZip ? 'Packaging .ZIP Archive...' : 'Download Complete Project .ZIP'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VICTORY / END OF GAME MODAL ==================== */}
      {victoryBanner && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-20 mx-auto shogi-koma flex flex-col items-center justify-center border border-amber-800">
              <span className="font-mono-code font-black text-xs text-amber-900">K</span>
              <span className="font-kanji font-black text-2xl text-slate-950">勝負</span>
            </div>
            <h2 className="font-kanji font-black text-2xl text-amber-300">{victoryBanner.title}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{victoryBanner.reason}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => startNewMatch(scale, timeControl)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Play Again ({SCALE_CONFIGS[scale].name})
              </button>
              <button
                onClick={() => setVictoryBanner(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
              >
                Inspect Final Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
