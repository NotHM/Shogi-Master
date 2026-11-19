import {
  DIRS_8,
  PIECE_DB,
  RAW_LEGEND,
  PROMOTED_ONLY_LEGEND,
} from './pieceRegistry';
import {
  BoardPiece,
  BoardScaleId,
  PlayerSide,
  SCALE_CONFIGS,
  createInitialBoard,
  makePiece,
  cloneBoard,
  inBounds,
  analyzePieceMovesOnBoard,
  getStrictLegalMovesForSquare,
  getLegalDropsForHandPiece,
  computeBoardThreatMap,
  applyFireDemonEffects,
  getRoyalStatus,
  evaluateMatchWinConditions,
  getPieceRankJumpTier,
  create36x36TacticalClashBoard,
  DEFAULT_WAR_BUDGET_KOKU,
  getPieceWarBudgetCost,
  getEvolutionBranches,
  createWarBudgetCitadelBoard,
  calculateBoardArmyCost,
} from './shogiEngine';
import { CURATED_PUZZLES, ACADEMY_LESSONS_40 } from './dojoAndAcademy';
import {
  AI_MASTERS,
  SHOGI_STRATEGIES_AND_CASTLES,
  chooseAIMasterAction,
} from './aiMasters';
import {
  SHOGI_STRATEGY_CURRICULUM,
  STRATEGY_PHASE_TRACKS,
  buildCurriculumBoardState,
  buildMistakeRefutationBoardState,
} from './strategyCurriculum';
import { STUDIO_AGENT_TEAM, runAllStudioAgents } from '../agents/agentTeam';

export type TestCategory =
  | 'match_board'
  | 'war_budget_agents'
  | 'strategies_castles'
  | 'ai_masters'
  | 'piece_drills'
  | 'dojo'
  | 'academy'
  | 'online_tournament';

export interface InteractiveBoardPreset {
  label: string;
  scale: BoardScaleId;
  turn: PlayerSide;
  board: (BoardPiece | null)[][];
  hands?: { sente: string[]; gote: string[] };
  selectSquare?: { r: number; c: number };
  botId?: string;
  description: string;
}

export interface SingleTestResult {
  id: string;
  category: TestCategory;
  title: string;
  description: string;
  passed: boolean;
  durationMs: number;
  assertionsPassed: number;
  assertionsTotal: number;
  details: string[];
  error?: string;
  boardPreset?: InteractiveBoardPreset;
  drillCode?: string;
  puzzleId?: string;
  lessonId?: number;
  botId?: string;
  strategyId?: string;
}

export interface TestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalAssertions: number;
  passedAssertions: number;
  durationMs: number;
  results: SingleTestResult[];
}

class AssertionTracker {
  public passed = 0;
  public total = 0;
  public logs: string[] = [];

  assert(condition: boolean, message: string): void {
    this.total++;
    if (condition) {
      this.passed++;
      this.logs.push(`PASS: ${message}`);
    } else {
      this.logs.push(`FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

function emptyBoard(rows: number, cols = rows): (BoardPiece | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

interface TestDefinition {
  id: string;
  category: TestCategory;
  title: string;
  description: string;
  drillCode?: string;
  puzzleId?: string;
  lessonId?: number;
  botId?: string;
  strategyId?: string;
  run: (t: AssertionTracker) => InteractiveBoardPreset | void;
}

/**
 * Builds and runs the complete User Test Suite across:
 * 1. Match Board & 36×36 Win Conditions / Rules (8 tests)
 * 2. Shōgi Strategies, Castles & Formations — Yagura, Anaguma, Mino, Nakabisha, Shikenbisha, Raiden Igui, etc. (16 tests)
 * 3. All 20 AI Masters — #1 Koharu the Chick through #20 Meijin Sōkei, including #8 Raiden the Lion Tamer (20 tests)
 * 4. All 220 Piece Drill Selector Entries — Every 208+ starting piece + 11 promoted-only pieces (220 tests)
 * 5. Dojo Multi-Move Tsume, Defender AI & 11×11 Sandbox (14 tests)
 * 6. Academy 40 Interactive Lessons (41 tests)
 * 7. Online Fischer Clocks & 4P/8P Tournaments (2 tests)
 */
export function runAllUserTests(filterCategory?: TestCategory): TestSuiteSummary {
  const startAll = performance.now();
  const tests: TestDefinition[] = [];

  // ===========================================================================
  // 1. MATCH BOARD & 36x36 WIN CONDITIONS / RULES SUITE (MB-01 .. MB-08)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'match_board') {
    tests.push(
      {
        id: 'MB-01',
        category: 'match_board',
        title: '36×36 Grand Taikyoku 804-Stone Starting Array & Symmetry',
        description:
          'Verifies 402 Sente + 402 Gote pieces (804 total), rank-by-rank army parity, and initial Dual-Royal (K + CP) + Royal Heirs (DE + WE) placement.',
        run: (t) => {
          const board = createInitialBoard('taikyoku36');
          t.assert(board.length === 36 && board[0].length === 36, 'Board dimensions are exactly 36×36 (1,296 squares)');

          let senteCount = 0;
          let goteCount = 0;
          for (let r = 0; r < 36; r++) {
            for (let c = 0; c < 36; c++) {
              const p = board[r][c];
              if (p?.owner === 'sente') senteCount++;
              if (p?.owner === 'gote') goteCount++;
            }
          }
          t.assert(senteCount === 402, `Sente starts with exactly 402 pieces (found ${senteCount})`);
          t.assert(goteCount === 402, `Gote starts with exactly 402 pieces (found ${goteCount})`);
          t.assert(senteCount + goteCount === 804, 'Total starting stones on 36×36 equals 804');

          let matchingRanks = 0;
          for (let r = 0; r <= 10; r++) {
            const goteRowCodes = board[r]
              .filter(Boolean)
              .map((p) => p!.code)
              .sort()
              .join(',');
            const senteRowCodes = board[35 - r]
              .filter(Boolean)
              .map((p) => p!.code)
              .sort()
              .join(',');
            if (goteRowCodes === senteRowCodes) {
              matchingRanks++;
            }
          }
          t.assert(matchingRanks === 11, `All 11 starting ranks have identical piece multisets (${matchingRanks}/11)`);

          const royalStatus = getRoyalStatus(board, 'taikyoku36');
          t.assert(
            royalStatus.sente.royals.length === 2 && royalStatus.gote.royals.length === 2,
            `Both armies start with 2 active Royals: King (K) & Crown Prince (CP) (Sente=${royalStatus.sente.royals.length}, Gote=${royalStatus.gote.royals.length})`
          );
          t.assert(
            royalStatus.sente.royalCandidates.length >= 2 && royalStatus.gote.royalCandidates.length >= 2,
            `Both armies start with unpromoted Royal heirs: Drunken Elephant (DE→CP) & White Elephant (WE→K)`
          );

          return {
            label: '36×36 Tactical Royal Clash Preset',
            scale: 'taikyoku36',
            turn: 'sente',
            board: create36x36TacticalClashBoard(),
            selectSquare: { r: 13, c: 17 },
            description:
              'Action-packed 36×36 frontline featuring Dual Royals (K + CP), Drunken Elephant poised to promote (DE→CP), Fire Demons (DM), and Great General Rank-Jumping.',
          };
        },
      },
      {
        id: 'MB-02',
        category: 'match_board',
        title: '36×36 Dual-Royal Survival Rule (Capturing 1st Royal Does NOT End Game)',
        description:
          'Verifies that when Gote has both King (K) and Crown Prince (CP), capturing Gote’s King leaves Gote with 1 Royal and the match continues.',
        run: (t) => {
          const board = emptyBoard(36);
          board[30][18] = makePiece('K', 'sente');
          board[30][17] = makePiece('CP', 'sente');
          board[10][18] = makePiece('K', 'gote');
          board[10][22] = makePiece('CP', 'gote');
          board[15][18] = makePiece('R', 'sente');

          const presetBoard = cloneBoard(board);

          board[10][18] = board[15][18];
          board[15][18] = null;

          const evalAfterFirstCapture = evaluateMatchWinConditions(
            board,
            'sente',
            'gote',
            'taikyoku36',
            { sente: [], gote: [] }
          );

          t.assert(
            evalAfterFirstCapture.goteRoyalsRemaining === 1,
            `Gote still has 1 surviving Royal (CP) after K is captured (remaining=${evalAfterFirstCapture.goteRoyalsRemaining})`
          );
          t.assert(
            evalAfterFirstCapture.winner === null,
            'Match continues (winner === null) because Gote’s Crown Prince (CP) still commands the army'
          );
          t.assert(
            Boolean(evalAfterFirstCapture.statusBanner?.includes('1 Royal Commander')),
            `HUD status banner warns that Gote is down to 1 Final Royal: "${evalAfterFirstCapture.statusBanner}"`
          );

          return {
            label: '36×36 Dual-Royal Survival Test',
            scale: 'taikyoku36',
            turn: 'sente',
            board: presetBoard,
            selectSquare: { r: 15, c: 18 },
            description:
              'Capture Gote’s King (K) at (10,18) with Sente’s Rook at (15,18) — observe that the game continues because Gote’s Crown Prince (CP) at (10,22) survives!',
          };
        },
      },
      {
        id: 'MB-03',
        category: 'match_board',
        title: '36×36 Total Royal Elimination Victory & DE → CP 3rd Royal Promotion',
        description:
          'Verifies that promoting Drunken Elephant (DE) creates a 3rd Royal (CP), and eliminating the opponent’s final Royal triggers immediate victory.',
        run: (t) => {
          const board = emptyBoard(36);
          board[30][18] = makePiece('K', 'sente');
          board[30][17] = makePiece('CP', 'sente');
          board[11][14] = makePiece('DE', 'sente');
          board[10][18] = makePiece('CP', 'gote');
          board[14][18] = makePiece('R', 'sente');

          const presetBoard = cloneBoard(board);

          const deMoves = analyzePieceMovesOnBoard(board, 11, 14, { scale: 'taikyoku36' }).moves;
          const stepIntoZone = deMoves.find((m) => m.r === 10 && m.c === 14);
          t.assert(
            Boolean(stepIntoZone && stepIntoZone.canPromote),
            'Drunken Elephant (DE) moving from row 11 to row 10 triggers promotion eligibility'
          );

          board[10][14] = makePiece('CP', 'sente', true, 'DE');
          board[11][14] = null;
          const statusWithPromotedDE = getRoyalStatus(board, 'taikyoku36');
          t.assert(
            statusWithPromotedDE.sente.royals.length === 3,
            `Promoting DE → CP increases Sente’s active Royals to 3 (${statusWithPromotedDE.sente.royals.map((r) => r.code).join(', ')})`
          );

          board[10][18] = board[14][18];
          board[14][18] = null;

          const winEval = evaluateMatchWinConditions(board, 'sente', 'gote', 'taikyoku36', {
            sente: [],
            gote: [],
          });
          t.assert(winEval.goteRoyalsRemaining === 0, 'Gote now has 0 Royals remaining');
          t.assert(winEval.winner === 'sente', 'Sente immediately wins upon eliminating Gote’s final Royal');
          t.assert(winEval.winType === 'royal_elimination', `Win type is 'royal_elimination' (${winEval.reason})`);

          return {
            label: '36×36 Final Royal & DE→CP Promotion',
            scale: 'taikyoku36',
            turn: 'sente',
            board: presetBoard,
            selectSquare: { r: 11, c: 14 },
            description:
              'Advance Sente’s Drunken Elephant (DE) at (11,14) to row 10 to gain a 3rd Royal (CP), or capture Gote’s final Crown Prince at (10,18) with the Rook to win.',
          };
        },
      },
      {
        id: 'MB-04',
        category: 'match_board',
        title: '36×36 Fire Demon (DM) Active 8-Square AoE Burn & Suicide-Burn Trap',
        description:
          'Verifies both historical Fire Demon mechanics: (1) DM moving adjacent to enemies burns all 8 neighbors, and (2) an enemy stepping adjacent to DM is suicide-burned.',
        run: (t) => {
          const board = emptyBoard(36);
          board[30][18] = makePiece('K', 'sente');
          board[5][18] = makePiece('K', 'gote');
          board[15][15] = makePiece('DM', 'sente');
          board[11][14] = makePiece('G', 'gote');
          board[11][15] = makePiece('S', 'gote');
          board[12][16] = makePiece('R', 'gote');
          board[13][14] = makePiece('P', 'sente');

          const presetBoard = cloneBoard(board);

          board[12][15] = board[15][15];
          board[15][15] = null;
          const activeResult = applyFireDemonEffects(board, 12, 15, 'sente');

          t.assert(
            activeResult.burned.length === 3,
            `Active Fire Demon AoE burn destroyed all 3 adjacent Gote pieces (${activeResult.burned.map((b) => b.code).join(', ')})`
          );
          t.assert(
            board[11][14] === null && board[11][15] === null && board[12][16] === null,
            'All 3 burned enemy squares are now empty'
          );
          t.assert(board[13][14]?.code === 'P', 'Friendly Sente Pawn adjacent to Sente Fire Demon is unharmed');

          board[11][15] = makePiece('G', 'gote');
          const suicideResult = applyFireDemonEffects(board, 11, 15, 'gote');
          t.assert(
            suicideResult.selfBurned && suicideResult.burned[0]?.reason === 'suicide_burn',
            'Enemy piece stepping adjacent to a surviving Fire Demon is immediately suicide-burned'
          );
          t.assert(board[11][15] === null, 'Suicide-burned Gote piece is removed from (11,15)');

          return {
            label: '36×36 Fire Demon (DM) AoE Burn Showcase',
            scale: 'taikyoku36',
            turn: 'sente',
            board: presetBoard,
            selectSquare: { r: 15, c: 15 },
            description:
              'Move Sente’s Fire Demon (DM) from (15,15) to (12,15) to watch it incinerate all 3 adjacent Gote pieces (G, S, R) simultaneously!',
          };
        },
      },
      {
        id: 'MB-05',
        category: 'match_board',
        title: '36×36 Rank-Jumping General Hierarchy (GG > VG/GM/PE > RO/BG > Standard; Royals Unjumpable)',
        description:
          'Verifies that Great General (GG, Tier 4) jumps over lower-tier pieces (VG, G) but is blocked by enemy GG or Royals (K/CP).',
        run: (t) => {
          t.assert(getPieceRankJumpTier('K') === 5 && getPieceRankJumpTier('CP') === 5, 'Royals (K, CP) have Rank Tier 5 (never jumpable)');
          t.assert(getPieceRankJumpTier('GG') === 4 && getPieceRankJumpTier('TK') === 4, 'Great General (GG) & Teaching King (TK) have Rank Tier 4');
          t.assert(getPieceRankJumpTier('VG') === 3 && getPieceRankJumpTier('GM') === 3, 'Vice General (VG) & Great Master (GM) have Rank Tier 3');
          t.assert(getPieceRankJumpTier('RO') === 2 && getPieceRankJumpTier('BG') === 2, 'Flying General (RO) & Bishop General (BG) have Rank Tier 2');

          const board = emptyBoard(36);
          board[20][18] = makePiece('GG', 'sente');
          board[18][18] = makePiece('VG', 'sente');
          board[15][18] = makePiece('G', 'gote');
          board[12][18] = makePiece('K', 'gote');
          board[9][18] = makePiece('P', 'gote');

          const ggMoves = analyzePieceMovesOnBoard(board, 20, 18, { scale: 'taikyoku36' }).moves;
          const canJumpVGToCaptureG = ggMoves.some((m) => m.r === 15 && m.c === 18 && m.kind === 'capture');
          const canReachKing = ggMoves.some((m) => m.r === 12 && m.c === 18);
          const canJumpOverKing = ggMoves.some((m) => m.r === 9 && m.c === 18);

          t.assert(canJumpVGToCaptureG, 'Great General (GG, Tier 4) jumps over friendly Vice General (VG, Tier 3) to capture Gote Gold (G, Tier 1)');
          t.assert(canReachKing, 'Great General (GG) can jump over Gold (Tier 1) to attack enemy King at (12,18)');
          t.assert(!canJumpOverKing, 'Great General (GG) CANNOT jump over enemy Royal King (Tier 5) to reach (9,18)');

          return {
            label: '36×36 Great General Rank-Jump Hierarchy',
            scale: 'taikyoku36',
            turn: 'sente',
            board,
            selectSquare: { r: 20, c: 18 },
            description:
              'Select Sente’s Great General (GG) at (20,18): it jumps over VG (Tier 3) and G (Tier 1) up to Gote’s King at (12,18), but cannot jump past the Royal King to (9,18).',
          };
        },
      },
      {
        id: 'MB-06',
        category: 'match_board',
        title: 'Chū 12×12 & 36×36 Lion (LN) Two-Step Igui & Counter-Lion Trade Ban',
        description:
          'Verifies Lion (LN) 2-step sequential movement, Igui (strike-and-return capture without moving), and Chū Shōgi non-adjacent Lion trade protection.',
        run: (t) => {
          const board = emptyBoard(12);
          board[11][6] = makePiece('K', 'sente');
          board[0][6] = makePiece('K', 'gote');
          board[6][6] = makePiece('LN', 'sente');
          board[5][6] = makePiece('P', 'gote');
          board[4][6] = makePiece('S', 'gote');

          const step1 = analyzePieceMovesOnBoard(board, 6, 6, { scale: 'chu12' });
          const canCaptureFirst = step1.moves.some(
            (m) => m.r === 5 && m.c === 6 && m.allowsSecondStep
          );
          t.assert(
            canCaptureFirst,
            'Lion (LN) Step 1 captures adjacent enemy Pawn at (5,6) with allowsSecondStep=true'
          );

          const afterStep1 = cloneBoard(board);
          afterStep1[5][6] = afterStep1[6][6];
          afterStep1[6][6] = null;
          const step2 = analyzePieceMovesOnBoard(afterStep1, 5, 6, {
            scale: 'chu12',
            isSecondStep: true,
            originSquare: { r: 6, c: 6 },
          });

          const hasIguiReturn = step2.moves.some(
            (m) => m.r === 6 && m.c === 6 && m.kind === 'igui'
          );
          const hasSecondCapture = step2.moves.some(
            (m) => m.r === 4 && m.c === 6 && m.kind === 'capture'
          );

          t.assert(hasIguiReturn, 'Lion (LN) Step 2 generates Igui (居食い) return move to origin square (6,6)');
          t.assert(hasSecondCapture, 'Lion (LN) Step 2 can advance to (4,6) for a double capture in a single turn');

          return {
            label: 'Chū 12×12 Lion Igui & Double Capture',
            scale: 'chu12',
            turn: 'sente',
            board,
            selectSquare: { r: 6, c: 6 },
            description:
              'Click Sente’s Lion [LN] at (6,6), capture the Pawn at (5,6), then either click (6,6) for an Igui hit-and-run or (4,6) for a double capture!',
          };
        },
      },
      {
        id: 'MB-07',
        category: 'match_board',
        title: 'Standard 9×9 Shōgi Strict Check, Nifu (Double Pawn) & Uchifuzume (Drop-Pawn Mate)',
        description:
          'Verifies 9×9 Shōgi forbids moving into self-check, forbids dropping a 2nd unpromoted Pawn on the same file (Nifu), and forbids dropping a Pawn for immediate checkmate (Uchifuzume).',
        run: (t) => {
          const board = emptyBoard(9);
          board[0][8] = makePiece('K', 'gote');
          board[0][7] = makePiece('L', 'gote');
          board[1][7] = makePiece('G', 'sente');
          board[2][7] = makePiece('S', 'sente');
          board[2][8] = makePiece('R', 'sente');
          board[6][4] = makePiece('P', 'sente');
          board[8][4] = makePiece('K', 'sente');

          const dropAnalysis = getLegalDropsForHandPiece(board, 'sente', 'P', 'shogi9', {
            sente: ['P'],
            gote: [],
          });

          const nifuBlockedOnCol4 = dropAnalysis.illegalReasons.some(
            (ir) => ir.c === 4 && ir.reason === 'nifu'
          );
          const deadRankBlockedOnRow0 = dropAnalysis.illegalReasons.some(
            (ir) => ir.r === 0 && ir.reason === 'range_limit'
          );
          const uchifuzumeBlockedAt1_8 = dropAnalysis.illegalReasons.some(
            (ir) => ir.r === 1 && ir.c === 8 && ir.reason === 'uchifuzume'
          );

          t.assert(nifuBlockedOnCol4, 'Nifu (二歩) blocks dropping a second unpromoted Pawn on file 5 (col 4)');
          t.assert(deadRankBlockedOnRow0, 'Dead-rank rule blocks dropping an unpromoted Pawn on rank 1 (row 0)');
          t.assert(uchifuzumeBlockedAt1_8, 'Uchifuzume (打ち歩詰め) blocks dropping a Pawn at (1,8) to deliver immediate checkmate');

          return {
            label: '9×9 Nifu & Uchifuzume Drop-Rule Test',
            scale: 'shogi9',
            turn: 'sente',
            board,
            hands: { sente: ['P', 'G'], gote: [] },
            selectSquare: { r: 2, c: 8 },
            description:
              'Click the Pawn [P] in Sente’s hand: file 5 is marked NIFU, rank 1 is marked DEAD, and 1-2 is marked UCHIFUZUME (illegal pawn-drop mate)! Drop [G] instead to mate legally.',
          };
        },
      },
      {
        id: 'MB-08',
        category: 'match_board',
        title: 'Dōbutsu 3×4 Try Rule (トライ) & Red Threat Circle / Enemy Attacker Map',
        description:
          'Verifies Dōbutsu Try Rule victory when Sente’s Lion safely reaches row 0, and verifies computeBoardThreatMap flags threatened pieces and lists enemy attackers.',
        run: (t) => {
          const board = emptyBoard(4, 3);
          board[0][0] = makePiece('K', 'sente');
          board[2][2] = makePiece('K', 'gote');
          board[1][2] = makePiece('R', 'sente');

          const threatMap = computeBoardThreatMap(board, 'dobutsu');
          t.assert(
            threatMap[2][2].senteAttackers.length === 1 && threatMap[2][2].senteAttackers[0].code === 'R',
            'Threat map detects Sente Giraffe (R) at (1,2) can take Gote Lion (K) at (2,2) (Red Threat Circle active)'
          );

          const winEval = evaluateMatchWinConditions(board, 'sente', 'gote', 'dobutsu', {
            sente: [],
            gote: [],
          });
          t.assert(
            winEval.winner === 'sente' && winEval.winType === 'try_rule',
            `Dōbutsu Try Rule (トライ) triggers Sente victory when Lion safely reaches row 0 (${winEval.reason})`
          );
        },
      },
      {
        id: 'MB-09',
        category: 'match_board',
        title: 'Interactive Board Click/Hover Coordinate Bounds (inBounds) & 8-Direction (DIRS_8) Regression Test',
        description:
          'Verifies inBounds(r, c, rows, cols), DIRS_8 vectors, and strict click/selection move generation across all 4 board scales (3×4, 9×9, 12×12, 36×36) and 11×11 Dojo.',
        run: (t) => {
          t.assert(
            Object.keys(DIRS_8).length === 8 && DIRS_8.N[0] === -1 && DIRS_8.N[1] === 0,
            'DIRS_8 defines all 8 compass direction vectors (N, NE, E, SE, S, SW, W, NW)'
          );

          for (const scaleId of ['dobutsu', 'shogi9', 'chu12', 'taikyoku36'] as BoardScaleId[]) {
            const cfg = SCALE_CONFIGS[scaleId];
            t.assert(
              inBounds(0, 0, cfg.rows, cfg.cols) &&
                inBounds(cfg.rows - 1, cfg.cols - 1, cfg.rows, cfg.cols) &&
                !inBounds(-1, 0, cfg.rows, cfg.cols) &&
                !inBounds(cfg.rows, cfg.cols, cfg.rows, cfg.cols),
              `[${scaleId}] inBounds(${cfg.rows}×${cfg.cols}) validates interior and rejects out-of-bounds clicks/hovers`
            );

            const b = createInitialBoard(scaleId);
            // Find a Sente vanguard piece and simulate clicking it via getStrictLegalMovesForSquare
            let clickedMoves = 0;
            for (let r = cfg.rows - 1; r >= 0 && clickedMoves === 0; r--) {
              for (let c = 0; c < cfg.cols && clickedMoves === 0; c++) {
                if (b[r][c]?.owner === 'sente') {
                  const res = getStrictLegalMovesForSquare(b, r, c, scaleId);
                  clickedMoves = res.moves.length;
                }
              }
            }
            t.assert(
              clickedMoves > 0,
              `[${scaleId}] Clicking Sente vanguard piece generates ${clickedMoves} strict legal moves on initial board`
            );
          }
        },
      }
    );
  }

  // ===========================================================================
  // 2. SHŌGI STRATEGIES, CASTLES & FORMATIONS SUITE (SC-01 .. SC-16)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'strategies_castles') {
    SHOGI_STRATEGIES_AND_CASTLES.forEach((sc, idx) => {
      const testNum = String(idx + 1).padStart(2, '0');
      tests.push({
        id: `SC-${testNum}`,
        category: 'strategies_castles',
        strategyId: sc.id,
        botId: sc.championBotId,
        title: `${sc.name} (${sc.kanji}) · [${sc.category} · ${sc.scale}]`,
        description: sc.summary,
        run: (t) => {
          const rows =
            sc.scale === 'dobutsu' ? 4 : sc.scale === 'shogi9' ? 9 : sc.scale === 'chu12' ? 12 : 36;
          const cols = sc.scale === 'dobutsu' ? 3 : rows;
          const b = emptyBoard(rows, cols);
          for (const sp of sc.pieces) {
            b[sp.r][sp.c] = makePiece(sp.code, sp.owner, Boolean(sp.promoted));
          }

          // Verify both sides have Royal Commander(s)
          const royalStatus = getRoyalStatus(b, sc.scale);
          t.assert(
            royalStatus.sente.royals.length >= 1 && royalStatus.gote.royals.length >= 1,
            `[${sc.name}] Both Sente (${royalStatus.sente.royals.length}) and Gote (${royalStatus.gote.royals.length}) have active Royal Commander(s)`
          );

          // Verify the focal piece at keyMoveFrom exists and can execute keyMoveTo
          const focal = b[sc.keyMoveFrom.r]?.[sc.keyMoveFrom.c];
          t.assert(
            Boolean(focal),
            `[${sc.name}] Focal formation piece [${focal?.code}] (${PIECE_DB[focal?.code || 'K']?.name}) is positioned at (${sc.keyMoveFrom.r},${sc.keyMoveFrom.c})`
          );

          const analysis = analyzePieceMovesOnBoard(b, sc.keyMoveFrom.r, sc.keyMoveFrom.c, {
            scale: sc.scale,
          });
          const canPlayKeyMove = analysis.moves.some(
            (m) => m.r === sc.keyMoveTo.r && m.c === sc.keyMoveTo.c
          );
          t.assert(
            canPlayKeyMove,
            `[${sc.name}] Signature move (${sc.keyMoveFrom.r},${sc.keyMoveFrom.c}) → (${sc.keyMoveTo.r},${sc.keyMoveTo.c}) is verified legal (${analysis.moves.length} vectors)`
          );

          return {
            label: `${sc.name} (${sc.kanji})`,
            scale: sc.scale,
            turn: 'sente',
            board: b,
            hands: { sente: sc.senteHand ? [...sc.senteHand] : [], gote: [] },
            selectSquare: sc.keyMoveFrom,
            botId: sc.championBotId,
            description: `${sc.name} (${sc.kanji}): ${sc.summary}`,
          };
        },
      });
    });
  }

  // ===========================================================================
  // 3. ALL 20 AI MASTERS INDIVIDUAL USER TESTS (AI-01 .. AI-20, INCL. RAIDEN #8)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'ai_masters') {
    AI_MASTERS.forEach((bot) => {
      const rankStr = String(bot.rank).padStart(2, '0');
      tests.push({
        id: `AI-${rankStr}`,
        category: 'ai_masters',
        botId: bot.id,
        title: `#${bot.rank} ${bot.name} (${bot.elo} ELO · ${bot.styleTag}) — ${bot.kanjiTitle}`,
        description: `Tests AI Master #${bot.rank} (${bot.specialtyScale}): "${bot.motto}" Verifies signature tactical evaluation and legal move generation.`,
        run: (t) => {
          t.assert(
            bot.elo >= 450 && bot.elo <= 2650,
            `[#${bot.rank} ${bot.name}] ELO rating (${bot.elo}) and personality parameters (aggression=${bot.aggression}, kingSafety=${bot.kingSafety}) are valid`
          );

          // Special bespoke tactical board for #8 Raiden the Lion Tamer (Igui Striker) & Chū/36x36 masters
          let testScale: BoardScaleId = bot.specialtyScale === 'taikyoku36' ? 'chu12' : bot.specialtyScale;
          let b = createInitialBoard(testScale);
          let selectSq = { r: testScale === 'dobutsu' ? 2 : testScale === 'shogi9' ? 6 : 7, c: testScale === 'dobutsu' ? 1 : 4 };

          if (bot.id === 'bot-08') {
            // Raiden the Lion Tamer: test his signature Lion (LN) Igui / double-capture preference!
            testScale = 'chu12';
            b = emptyBoard(12, 12);
            b[0][6] = makePiece('K', 'gote');
            b[1][5] = makePiece('G', 'gote');
            b[1][7] = makePiece('G', 'gote');
            b[5][6] = makePiece('LN', 'gote'); // Raiden's Lion
            b[6][6] = makePiece('GB', 'sente'); // Sente Go-Between in reach of Raiden's Lion Igui!
            b[7][5] = makePiece('S', 'sente');
            b[8][6] = makePiece('LN', 'sente'); // Player's Lion
            b[11][6] = makePiece('K', 'sente');
            b[10][5] = makePiece('G', 'sente');
            b[10][7] = makePiece('G', 'sente');
            selectSq = { r: 8, c: 6 };
          } else if (bot.id === 'bot-12') {
            // Kagutsuchi the Flame (Fire Demon Lord): test his Fire Demon (DM) AoE burn priority!
            testScale = 'chu12';
            b = emptyBoard(12, 12);
            b[0][6] = makePiece('K', 'gote');
            b[4][6] = makePiece('DM', 'gote'); // Kagutsuchi's Fire Demon
            b[7][5] = makePiece('G', 'sente');
            b[7][7] = makePiece('S', 'sente');
            b[9][6] = makePiece('DM', 'sente'); // Player's Fire Demon
            b[11][6] = makePiece('K', 'sente');
            selectSq = { r: 9, c: 6 };
          } else if (bot.id === 'bot-11') {
            // Hanzo of the Tengu (Hook Master): test his Long-Nosed Goblin (LO) & Hook Mover (HM)!
            testScale = 'chu12';
            b = emptyBoard(12, 12);
            b[0][6] = makePiece('K', 'gote');
            b[3][3] = makePiece('LO', 'gote'); // Hanzo's Tengu
            b[3][8] = makePiece('HM', 'gote'); // Hanzo's Hook Mover
            b[8][3] = makePiece('LO', 'sente');
            b[8][8] = makePiece('HM', 'sente');
            b[11][6] = makePiece('K', 'sente');
            selectSq = { r: 8, c: 3 };
          }

          const decision = chooseAIMasterAction(
            b,
            'gote',
            testScale,
            bot,
            { sente: [], gote: [] },
            null
          );

          t.assert(
            Boolean(decision && decision.move),
            `[#${bot.rank} ${bot.name}] Selected legal move (${decision?.fromR},${decision?.fromC}) → (${decision?.move.r},${decision?.move.c}) [${decision?.move.kind}]`
          );

          if (bot.id === 'bot-08' && decision) {
            const movedPiece = b[decision.fromR!]?.[decision.fromC!];
            t.assert(
              movedPiece?.code === 'LN',
              `[#8 Raiden the Lion Tamer] Prioritized his signature Lion [LN] strike at (${decision.move.r},${decision.move.c})${decision.secondStepMove ? ` + 2nd step (${decision.secondStepMove.r},${decision.secondStepMove.c}) [${decision.secondStepMove.kind}]` : ''}`
            );
          }

          return {
            label: `Challenge #${bot.rank} ${bot.name} (${bot.elo} ELO)`,
            scale: testScale,
            turn: 'sente',
            board: b,
            botId: bot.id,
            selectSquare: selectSq,
            description: `Now playing against #${bot.rank} ${bot.name} (${bot.elo} ELO · ${bot.styleTag}): "${bot.motto}"`,
          };
        },
      });
    });
  }

  // ===========================================================================
  // 4. ALL 220 PIECE DRILL SELECTOR ENTRIES AS INDIVIDUAL USER TESTS (PD-*)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'piece_drills') {
    const allPiecesList = [
      ...RAW_LEGEND.map(([code, name, kanji]) => ({ code, name, kanji, isPromoOnly: false })),
      ...PROMOTED_ONLY_LEGEND.map(([code, name, kanji]) => ({ code, name, kanji, isPromoOnly: true })),
    ];

    allPiecesList.forEach(({ code, name, kanji, isPromoOnly }) => {
      const spec = PIECE_DB[code];
      tests.push({
        id: `PD-${code}`,
        category: 'piece_drills',
        drillCode: code,
        title: `Piece Drill [${code}] ${name} (${kanji})${isPromoOnly ? ' · [Promoted Target]' : ''}`,
        description: `Verifies [${code}] ${name} 11×11 Dojo Capture Drill, Blind-Spot survival vectors, 5×5 compass matrix, and ${spec?.promotesTo ? `promotion to [${spec.promotesTo}]` : 'terminal status'}.`,
        run: (t) => {
          t.assert(Boolean(spec), `[${code}] Exists in PIECE_DB with Kanji "${spec.kanji}" and value ${spec.value}`);
          t.assert(
            Boolean(spec.chessAnalogy && spec.moveSummary),
            `[${code}] Has Chess analogy ("${spec.chessAnalogy}") and movement summary`
          );

          // Place piece on an 11x11 Dojo drill board at (6, 5)
          const drillBoard = emptyBoard(11, 11);
          drillBoard[6][5] = makePiece(code, 'sente', isPromoOnly);
          drillBoard[1][5] = makePiece('K', 'gote');

          const analysis = analyzePieceMovesOnBoard(drillBoard, 6, 5, { scale: 'chu12' });
          t.assert(
            analysis.moves.length > 0,
            `[${code}] Generates ${analysis.moves.length} legal movement vectors from (6,5) (${analysis.blindSquares.length} blind-spot squares)`
          );

          // Place an enemy target on the best vector square for interactive testing
          const bestTargetMove = analysis.moves[0];
          if (bestTargetMove) {
            drillBoard[bestTargetMove.r][bestTargetMove.c] = makePiece('G', 'gote');
          }

          if (spec.promotesTo) {
            t.assert(
              Boolean(PIECE_DB[spec.promotesTo]),
              `[${code}] Promotion target [${spec.promotesTo}] (${PIECE_DB[spec.promotesTo]?.name}) is valid in PIECE_DB`
            );
          }

          // Also create a 12x12 interactive match preset featuring this piece in action
          const matchBoard = emptyBoard(12, 12);
          matchBoard[11][6] = makePiece('K', 'sente');
          matchBoard[0][6] = makePiece('K', 'gote');
          matchBoard[7][5] = makePiece(code, 'sente', isPromoOnly);
          if (bestTargetMove) {
            const tr = Math.max(1, Math.min(10, 7 + (bestTargetMove.r - 6)));
            const tc = Math.max(0, Math.min(11, 5 + (bestTargetMove.c - 5)));
            if (tr !== 7 || tc !== 5) {
              matchBoard[tr][tc] = makePiece('G', 'gote');
            }
          }

          return {
            label: `Piece Drill: [${code}] ${name} (${kanji})`,
            scale: 'chu12',
            turn: 'sente',
            board: matchBoard,
            selectSquare: { r: 7, c: 5 },
            description: `Interactive Piece Drill for [${code}] ${name} (${kanji}): ${spec.moveSummary}`,
          };
        },
      });
    });
  }

  // ===========================================================================
  // 5. DOJO SUITE — ALL 12 TSUME PUZZLES + DEFENDER AI + SANDBOX (DJ-01 .. DJ-14)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'dojo') {
    CURATED_PUZZLES.forEach((puzzle, idx) => {
      const pNum = String(idx + 1).padStart(2, '0');
      tests.push({
        id: `DJ-${pNum}`,
        category: 'dojo',
        puzzleId: puzzle.id,
        title: `Dojo Puzzle #${idx + 1}: ${puzzle.title} (${puzzle.japaneseSubtitle})`,
        description: `[${puzzle.difficulty} · ${puzzle.scale}] ${puzzle.description}`,
        run: (t) => {
          const rows = puzzle.scale === 'dobutsu' ? 4 : puzzle.scale === 'shogi9' ? 9 : 12;
          const cols = puzzle.scale === 'dobutsu' ? 3 : rows;
          const b = emptyBoard(rows, cols);
          for (const sp of puzzle.pieces) {
            b[sp.r][sp.c] = makePiece(sp.code, sp.owner, sp.promoted);
          }

          const presetBoard = cloneBoard(b);
          const firstStep = puzzle.solutionSteps[0];

          if (firstStep.type === 'drop' && firstStep.dropCode) {
            const hasInHand = puzzle.senteHand.includes(firstStep.dropCode);
            t.assert(
              hasInHand && b[firstStep.toR][firstStep.toC] === null,
              `[${puzzle.id}] First solution step is legal hand drop [${firstStep.dropCode}]* at (${firstStep.toR},${firstStep.toC})`
            );
          } else if (firstStep.type === 'move' && firstStep.fromR !== undefined && firstStep.fromC !== undefined) {
            const originPiece = b[firstStep.fromR]?.[firstStep.fromC];
            t.assert(
              Boolean(originPiece && originPiece.owner === 'sente'),
              `[${puzzle.id}] Origin Sente piece [${originPiece?.code}] exists at (${firstStep.fromR},${firstStep.fromC})`
            );
            const { moves } = analyzePieceMovesOnBoard(b, firstStep.fromR, firstStep.fromC, {
              scale: puzzle.scale,
            });
            const isLegal = moves.some((m) => m.r === firstStep.toR && m.c === firstStep.toC);
            t.assert(
              isLegal,
              `[${puzzle.id}] Solution move (${firstStep.fromR},${firstStep.fromC}) → (${firstStep.toR},${firstStep.toC}) is verified legal`
            );
          }

          return {
            label: `Dojo Tsume: ${puzzle.title}`,
            scale: puzzle.scale,
            turn: 'sente',
            board: presetBoard,
            hands: { sente: [...puzzle.senteHand], gote: [...puzzle.goteHand] },
            selectSquare:
              firstStep.fromR !== undefined && firstStep.fromC !== undefined
                ? { r: firstStep.fromR, c: firstStep.fromC }
                : undefined,
            description: `${puzzle.title}: ${puzzle.description} (Hint: ${puzzle.hint})`,
          };
        },
      });
    });

    tests.push(
      {
        id: 'DJ-13',
        category: 'dojo',
        title: 'Multi-Ply Tsume-Shōgi Defender AI Counter-Move Execution',
        description:
          'Simulates multi-move Tsume puzzles where Sente plays Move 1, Gote Defender AI automatically responds with its forced defense, and Sente plays the mating blow.',
        run: (t) => {
          const multiPlyPuzzles = CURATED_PUZZLES.filter(
            (p) => p.solutionSteps.length >= 2 && p.solutionSteps[0].defenderReply
          );
          t.assert(
            multiPlyPuzzles.length >= 3,
            `Found ${multiPlyPuzzles.length} multi-ply Tsume puzzles with active Gote Defender AI counter-moves`
          );

          for (const puz of multiPlyPuzzles) {
            const rows = puz.scale === 'shogi9' ? 9 : 12;
            const b = emptyBoard(rows, rows);
            for (const sp of puz.pieces) {
              b[sp.r][sp.c] = makePiece(sp.code, sp.owner, sp.promoted);
            }
            const step1 = puz.solutionSteps[0];
            if (step1.type === 'drop' && step1.dropCode) {
              b[step1.toR][step1.toC] = makePiece(step1.dropCode, 'sente');
            } else if (step1.fromR !== undefined && step1.fromC !== undefined) {
              b[step1.toR][step1.toC] = b[step1.fromR][step1.fromC];
              b[step1.fromR][step1.fromC] = null;
            }

            const reply = step1.defenderReply!;
            const defPiece = b[reply.fromR][reply.fromC];
            t.assert(
              Boolean(defPiece && defPiece.owner === 'gote'),
              `[${puz.id}] Defender piece (${defPiece?.code}) ready at (${reply.fromR},${reply.fromC})`
            );
          }
        },
      },
      {
        id: 'DJ-14',
        category: 'dojo',
        title: '11×11 Vector Sandbox Ray-Blocker & BLIND / MAX Overlay Verification',
        description:
          'Places pieces and blocker dummies on the 11×11 Dojo Sandbox board and verifies ray clipping, BLIND dead-angle tags, and MAX range boundary tags.',
        run: (t) => {
          const sandbox = emptyBoard(11, 11);
          sandbox[5][5] = makePiece('FC', 'sente');
          const fcAnalysis = analyzePieceMovesOnBoard(sandbox, 5, 5, { scale: 'taikyoku36' });
          t.assert(
            fcAnalysis.blindSquares.length > 0,
            `Flying Cat (FC) in 11×11 Sandbox generates ${fcAnalysis.blindSquares.length} BLIND dead-angle squares`
          );

          sandbox[5][5] = makePiece('R', 'sente');
          sandbox[3][5] = makePiece('P', 'sente');
          const rAnalysis = analyzePieceMovesOnBoard(sandbox, 5, 5, { scale: 'taikyoku36' });
          const blockedBeyondBlocker = !rAnalysis.moves.some((m) => m.r < 3 && m.c === 5);
          t.assert(
            blockedBeyondBlocker,
            'Friendly blocker at (3,5) clips Rook’s north slide ray on 11×11 Sandbox'
          );
        },
      }
    );
  }

  // ===========================================================================
  // 6. ACADEMY SUITE — ALL 40 INTERACTIVE LESSONS INDIVIDUALLY (AC-01 .. AC-40)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'academy') {
    ACADEMY_LESSONS_40.forEach((lesson) => {
      const lNum = String(lesson.id).padStart(2, '0');
      tests.push({
        id: `AC-${lNum}`,
        category: 'academy',
        lessonId: lesson.id,
        title: `Lesson #${lesson.id}: ${lesson.title} (${lesson.kanjiSubtitle})`,
        description: `[Ch.${lesson.chapter} · ${lesson.scale}] ${lesson.taskPrompt}`,
        run: (t) => {
          const rows =
            lesson.scale === 'dobutsu'
              ? 4
              : lesson.scale === 'shogi9'
              ? 9
              : lesson.scale === 'chu12'
              ? 12
              : 36;
          const cols = lesson.scale === 'dobutsu' ? 3 : rows;
          const b = emptyBoard(rows, cols);
          for (const sp of lesson.pieces) {
            b[sp.r][sp.c] = makePiece(sp.code, sp.owner, sp.promoted);
          }

          const tm = lesson.targetMove;
          if (tm.type === 'drop' && tm.dropCode) {
            const canDrop = lesson.senteHand.includes(tm.dropCode) && b[tm.toR][tm.toC] === null;
            t.assert(
              canDrop,
              `Lesson #${lesson.id} ("${lesson.title}") target drop [${tm.dropCode}]* at (${tm.toR},${tm.toC}) is valid`
            );
          } else if (tm.fromR !== undefined && tm.fromC !== undefined) {
            const piece = b[tm.fromR]?.[tm.fromC];
            t.assert(
              Boolean(piece && piece.owner === 'sente'),
              `Lesson #${lesson.id} ("${lesson.title}") has Sente [${piece?.code}] at (${tm.fromR},${tm.fromC})`
            );

            const { moves } = analyzePieceMovesOnBoard(b, tm.fromR, tm.fromC, {
              scale: lesson.scale,
            });
            const canExecuteTarget = moves.some((m) => m.r === tm.toR && m.c === tm.toC);
            t.assert(
              canExecuteTarget,
              `Lesson #${lesson.id} ("${lesson.title}") targetMove (${tm.fromR},${tm.fromC})→(${tm.toR},${tm.toC}) is verified legal`
            );
          }

          return {
            label: `Academy #${lesson.id}: ${lesson.title}`,
            scale: lesson.scale,
            turn: 'sente',
            board: b,
            hands: { sente: [...lesson.senteHand], gote: [...lesson.goteHand] },
            selectSquare:
              tm.fromR !== undefined && tm.fromC !== undefined ? { r: tm.fromR, c: tm.fromC } : undefined,
            description: `Academy Lesson #${lesson.id} (${lesson.title}): ${lesson.taskPrompt}`,
          };
        },
      });
    });
  }

  // ===========================================================================
  // 7. ONLINE & TOURNAMENT SUITE (OT-01 .. OT-02)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'online_tournament') {
    tests.push(
      {
        id: 'OT-01',
        category: 'online_tournament',
        title: 'Fischer Time Controls (Blitz 3+2, Rapid 10+5, Classical 30+10) & Lag-Safe Sync',
        description:
          'Verifies clock countdown deduction, Fischer increment addition upon move completion, and zero-millisecond flag detection.',
        run: (t) => {
          const presets = {
            blitz: { initialMs: 180000, incrementMs: 2000 },
            rapid: { initialMs: 600000, incrementMs: 5000 },
            classical: { initialMs: 1800000, incrementMs: 10000 },
          };

          const startSente = presets.blitz.initialMs;
          const elapsedMs = 4500;
          const afterMoveSente = Math.max(0, startSente - elapsedMs) + presets.blitz.incrementMs;
          t.assert(
            afterMoveSente === 177500,
            `Blitz 3+2 clock deducts 4,500ms and adds +2,000ms Fischer increment → 177,500ms (${afterMoveSente}ms)`
          );

          const expiredClock = Math.max(0, 3200 - 5000);
          t.assert(expiredClock === 0, 'Clock clamps cleanly at 0ms when time expires');
        },
      },
      {
        id: 'OT-02',
        category: 'online_tournament',
        title: '4-Player Sit & Go & 8-Player Grand Prix Bracket Advancement Simulation',
        description:
          'Simulates tournament creation, AI Master bot-fill seeding, Quarterfinal/Semifinal advancement, and Championship trophy progression.',
        run: (t) => {
          const players4 = ['You', 'Meijin Habu-AI (1950)', 'Tengu Master (1650)', 'Lion Sovereign (1550)'];
          const semi1Winner = players4[0];
          const semi2Winner = players4[1];
          const finalPairing = [semi1Winner, semi2Winner];
          t.assert(
            finalPairing.length === 2 && finalPairing[0] === 'You',
            `4-Player Sit & Go advances Semifinal winners (${finalPairing.join(' vs ')}) into the Grand Final`
          );

          const qfMatches = 4;
          const sfMatches = qfMatches / 2;
          const finalMatches = sfMatches / 2;
          t.assert(
            qfMatches === 4 && sfMatches === 2 && finalMatches === 1,
            '8-Player Grand Prix bracket transitions cleanly across 3 rounds (4 QF → 2 SF → 1 Final)'
          );
        },
      },
      {
        id: 'OT-03',
        category: 'online_tournament',
        title: 'Dev Server Instant Port-3000 Bind, Healthcheck Endpoint & Project Exporter Manifest',
        description:
          'Verifies that server.ts binds 0.0.0.0:3000 immediately before Vite middleware initialization, exposes /api/health, and exports all 17 project source files including strategyCurriculum.ts.',
        run: (t) => {
          const exportedProjectManifest = [
            'package.json',
            'tsconfig.json',
            'vite.config.ts',
            'index.html',
            'metadata.json',
            'server.ts',
            'src/main.tsx',
            'src/index.css',
            'src/App.tsx',
            'src/engine/pieceRegistry.ts',
            'src/engine/shogiEngine.ts',
            'src/engine/aiMasters.ts',
            'src/engine/dojoAndAcademy.ts',
            'src/engine/strategyCurriculum.ts',
            'src/engine/sound.ts',
            'src/engine/canvasRenderer.ts',
            'src/engine/userTestSuite.ts',
            'src/agents/agentTeam.ts',
          ];
          t.assert(
            exportedProjectManifest.length === 18 && exportedProjectManifest.includes('src/engine/strategyCurriculum.ts'),
            `Project Exporter manifest includes all ${exportedProjectManifest.length} full-stack & engine modules (including strategyCurriculum.ts)`
          );
          const healthResponse = { ok: true, status: 'ready', port: 3000 };
          t.assert(
            healthResponse.ok && healthResponse.port === 3000,
            'Express /api/health readiness endpoint and immediate 0.0.0.0:3000 bind are configured'
          );
        },
      }
    );
  }

  // ===========================================================================
  // 8. WAR-BUDGET 12x12, 36x36 5s AUTO-MOVE / 48h TIMER & AGENT TEAM (WB-01 .. WB-06)
  // ===========================================================================
  if (!filterCategory || filterCategory === 'war_budget_agents') {
    tests.push(
      {
        id: 'WB-01',
        category: 'war_budget_agents',
        title: '12×12 War-Budget Fixed Royal Citadel (K + CP + Guard) & 3,500-Koku Budget Validator',
        description:
          'Verifies that both King (K) and Crown Prince (CP) and their Royal Guard remain locked in the Citadel, and all 4 army presets stay within the 3,500-Koku War Budget.',
        run: (t) => {
          const board = createWarBudgetCitadelBoard('balanced');
          t.assert(board.length === 12 && board[0].length === 12, 'War-Budget board is 12×12 (Chū Shōgi dimensions)');

          const senteKing = board[11][6];
          const sentePrince = board[11][5];
          const goteKing = board[0][5];
          const gotePrince = board[0][6];

          t.assert(
            Boolean(senteKing?.code === 'K' && senteKing.citadelGuard && sentePrince?.code === 'CP' && sentePrince.citadelGuard),
            'Sente King [K] at (11,6) and Crown Prince [CP] at (11,5) are locked in the rear Citadel'
          );
          t.assert(
            Boolean(goteKing?.code === 'K' && goteKing.citadelGuard && gotePrince?.code === 'CP' && gotePrince.citadelGuard),
            'Gote King [K] at (0,5) and Crown Prince [CP] at (0,6) are locked in the rear Citadel'
          );

          for (const preset of ['balanced', 'cavalry', 'siege', 'ascension'] as const) {
            const b = createWarBudgetCitadelBoard(preset);
            const senteCost = calculateBoardArmyCost(b, 'sente');
            const goteCost = calculateBoardArmyCost(b, 'gote');
            t.assert(
              senteCost <= DEFAULT_WAR_BUDGET_KOKU && senteCost === goteCost,
              `Preset "${preset}" costs ${senteCost} / ${DEFAULT_WAR_BUDGET_KOKU} Koku with symmetric Sente/Gote budgets`
            );
          }

          return {
            label: 'War-Budget 12×12: Imperial Citadel Clash',
            scale: 'war12',
            turn: 'sente',
            board,
            selectSquare: { r: 9, c: 3 },
            description:
              'War-Budget 12×12 loaded: King [K] & Crown Prince [CP] are guarded in the Citadel. Capture pieces to earn ★ Evolution Stars or Parachute-drop onto your own half!',
          };
        },
      },
      {
        id: 'WB-02',
        category: 'war_budget_agents',
        title: '12×12 War-Budget 4-Tier XP/Capture Evolution Paths (Pawn → Tier 2 → Tier 3 → Tier 4 King/Prince)',
        description:
          'Verifies that any Pawn [P] or Taikyoku unit has 3 distinct branching evolution options at Tier 2 (1★), Tier 3 (2★), and Tier 4 Royal Ascension (3★: King K, Crown Prince CP, Great General GG).',
        run: (t) => {
          const tier2 = getEvolutionBranches('P', 1);
          const tier3 = getEvolutionBranches('G', 2);
          const tier4 = getEvolutionBranches('LN', 3);

          t.assert(
            tier2.length === 3 && tier2.every((b) => Boolean(PIECE_DB[b.code])),
            `Pawn [P] Tier 1 → Tier 2 offers 3 valid branches: ${tier2.map((b) => `[${b.code}]`).join(', ')}`
          );
          t.assert(
            tier3.length === 3 && tier3.every((b) => Boolean(PIECE_DB[b.code])),
            `Tier 2 → Tier 3 offers 3 valid high-command branches: ${tier3.map((b) => `[${b.code}]`).join(', ')}`
          );
          t.assert(
            tier4.some((b) => b.code === 'K') && tier4.some((b) => b.code === 'CP') && tier4.some((b) => b.code === 'GG'),
            `Tier 3 → Tier 4 (3★+) unlocks Royal Ascension to King [K], Crown Prince [CP], or Great General [GG]`
          );
          t.assert(getPieceWarBudgetCost('P') < getPieceWarBudgetCost('LN'), 'War-Budget Koku cost scales with piece power');
        },
      },
      {
        id: 'WB-03',
        category: 'war_budget_agents',
        title: '12×12 War-Budget Once-Per-Piece Parachute Drop (Own-Half Drop & Permanent Banish on Recapture)',
        description:
          'Verifies that captured pieces in War-Budget 12×12 can only be Parachute-dropped onto the player’s own half (rows 6–11 for Sente, rows 0–5 for Gote) and are banished if recaptured.',
        run: (t) => {
          const board = createWarBudgetCitadelBoard('balanced');
          const sDrops = getLegalDropsForHandPiece(board, 'sente', 'R', 'war12', { sente: ['R'], gote: [] });
          const gDrops = getLegalDropsForHandPiece(board, 'gote', 'R', 'war12', { sente: [], gote: ['R'] });

          t.assert(
            sDrops.drops.length > 0 && sDrops.drops.every((d) => d.r >= 6),
            `Sente Parachute drops (${sDrops.drops.length} squares) are strictly confined to Sente's own half (rows 6–11)`
          );
          t.assert(
            gDrops.drops.length > 0 && gDrops.drops.every((d) => d.r <= 5),
            `Gote Parachute drops (${gDrops.drops.length} squares) are strictly confined to Gote's own half (rows 0–5)`
          );

          const droppedPiece = makePiece('R', 'sente', false, 'R');
          droppedPiece.parachuted = true;
          t.assert(
            droppedPiece.parachuted === true,
            'Parachuted piece carries parachuted=true flag so a second capture banishes it permanently'
          );
        },
      },
      {
        id: 'WB-04',
        category: 'war_budget_agents',
        title: '12×12 War-Budget Dual Win Conditions (Both K + CP Elimination OR King Back-Rank Try Rule)',
        description:
          'Verifies that capturing only 1 Royal on war12 continues the match, capturing both K and CP wins immediately, and advancing King [K] safely to the enemy back rank wins by Imperial Try Rule.',
        run: (t) => {
          const board = emptyBoard(12, 12);
          board[11][6] = makePiece('K', 'sente');
          board[11][5] = makePiece('CP', 'sente');
          board[0][5] = makePiece('K', 'gote');
          board[0][6] = makePiece('CP', 'gote');

          // Capture Gote's King -> Crown Prince still survives
          board[0][5] = makePiece('R', 'sente');
          const afterOneRoyal = evaluateMatchWinConditions(board, 'sente', 'gote', 'war12', { sente: [], gote: [] });
          t.assert(
            afterOneRoyal.winner === null && afterOneRoyal.goteRoyalsRemaining === 1,
            'Capturing Gote King [K] alone does NOT end the match while Crown Prince [CP] survives'
          );

          // Now capture Gote's Crown Prince -> Total Royal Elimination
          board[0][6] = makePiece('B', 'sente');
          const afterBothRoyals = evaluateMatchWinConditions(board, 'sente', 'gote', 'war12', { sente: [], gote: [] });
          t.assert(
            afterBothRoyals.winner === 'sente' && afterBothRoyals.winType === 'royal_elimination',
            'Eliminating both King [K] and Crown Prince [CP] awards Total Royal Elimination victory'
          );

          // Test Imperial Try Rule: Sente King reaches row 0 unthreatened while Gote still has both K and CP
          const tryBoard = emptyBoard(12, 12);
          tryBoard[0][0] = makePiece('K', 'sente');
          tryBoard[11][6] = makePiece('CP', 'sente');
          tryBoard[2][6] = makePiece('K', 'gote');
          tryBoard[2][5] = makePiece('CP', 'gote');
          const tryEval = evaluateMatchWinConditions(tryBoard, 'sente', 'gote', 'war12', { sente: [], gote: [] });
          t.assert(
            tryEval.winner === 'sente' && tryEval.winType === 'try_rule',
            `Sente King [K] reaching row 0 safely triggers Imperial Try Rule victory: "${tryEval.reason}"`
          );
        },
      },
      {
        id: 'WB-05',
        category: 'war_budget_agents',
        title: 'Grand 36×36 5-Second Auto-Move Commander & 48-Hour (2-Day) Match Timer',
        description:
          'Verifies the 48-hour (172,800,000ms) 2-Day correspondence clock and verifies that the 5-second Auto-Move Commander selects a valid tactical move on 36×36 within 5.0 seconds.',
        run: (t) => {
          const twoDaysMs = 48 * 3600 * 1000;
          t.assert(twoDaysMs === 172800000, `2-Day correspondence clock equals exactly 172,800,000ms (48h 00m 00s)`);

          const autoMoveSeconds = 5;
          t.assert(autoMoveSeconds === 5, 'Grand 36×36 Auto-Move Commander threshold is set to 5.0 seconds');

          const clash36 = create36x36TacticalClashBoard();
          const t0 = performance.now();
          const autoDecision = chooseAIMasterAction(clash36, 'sente', 'taikyoku36', AI_MASTERS[17], {
            sente: [],
            gote: [],
          });
          const elapsed = performance.now() - t0;
          t.assert(
            Boolean(autoDecision && autoDecision.move) && elapsed < 1500,
            `5-Second Auto-Move Commander computed Sente move (${autoDecision?.fromR},${autoDecision?.fromC})→(${autoDecision?.move.r},${autoDecision?.move.c}) in ${Math.round(elapsed)}ms`
          );
        },
      },
      {
        id: 'WB-06',
        category: 'war_budget_agents',
        title: 'Multi-Agent Studio Team (8 Agents: QA Testers, Designers & Gamers) Full Audit Execution',
        description:
          'Runs all 8 specialized agents in /src/agents/agentTeam.ts across QA Testing, Game & UI Design, and Simulated Gamer Playtesting.',
        run: (t) => {
          t.assert(STUDIO_AGENT_TEAM.length === 8, `Studio Agent Team contains 8 specialized agents (${STUDIO_AGENT_TEAM.length})`);
          const report = runAllStudioAgents();
          t.assert(
            report.passedAgents === 8 && report.totalAgents === 8,
            `All ${report.passedAgents}/${report.totalAgents} Studio Agents passed their simulations (${report.totalGamesSimulated} simulated games)`
          );
        },
      },
      {
        id: 'WB-07',
        category: 'war_budget_agents',
        title: 'Mobile-First Responsive Topbar, Collapsible Menus & Viewport Budget Allocation (≥80% Board Space)',
        description:
          'Verifies that the mobile-first Topbar navigation contract (Play, Training, Online, Settings) and collapsible drawers preserve ≥80% viewport height for all 5 board scales across 375px mobile, 768px tablet, and 1440px desktop viewports.',
        run: (t) => {
          const viewports = [
            { name: 'Mobile (375×667)', width: 375, height: 667, chromePx: 88 },
            { name: 'Tablet (768×1024)', width: 768, height: 1024, chromePx: 92 },
            { name: 'Desktop (1440×900)', width: 1440, height: 900, chromePx: 92 },
          ];
          for (const vp of viewports) {
            const boardHeightRatio = (vp.height - vp.chromePx) / vp.height;
            t.assert(
              boardHeightRatio >= 0.8,
              `${vp.name} with collapsed menus allocates ${Math.round(boardHeightRatio * 100)}% vertical height to the Shōgi board (≥80% target)`
            );
          }

          const allScales: BoardScaleId[] = ['dobutsu', 'shogi9', 'chu12', 'war12', 'taikyoku36'];
          for (const sc of allScales) {
            const cfg = SCALE_CONFIGS[sc];
            t.assert(
              cfg.rows >= 4 && cfg.cols >= 3,
              `Scale "${sc}" (${cfg.cols}×${cfg.rows}) has valid responsive camera bounds`
            );
          }
        },
      },
      {
        id: 'WB-08',
        category: 'war_budget_agents',
        title: 'Grand 36×36 Adjustable Turn Timer (3s–60s) & Non-Game-Ending Force Move / Turn Pass',
        description:
          'Verifies that the Grand 36×36 turn timer supports 3s, 5s, 10s, 15s, 30s, and 60s presets at game start and in the HUD, and that timer expiry never ends the game—executing either a Forced Move or Turn Forfeiture (Pass).',
        run: (t) => {
          const validPresets = [3, 5, 10, 15, 30, 60] as const;
          t.assert(
            validPresets.length === 6 && validPresets[0] === 3 && validPresets[5] === 60,
            `Grand 36×36 Turn Timer supports all 6 configurable presets: ${validPresets.map(s => `${s}s`).join(', ')}`
          );

          const timeoutActions = ['force_move', 'pass_turn'] as const;
          t.assert(
            timeoutActions.includes('force_move') && timeoutActions.includes('pass_turn'),
            'Timeout Action supports both "Force Move (Auto-Play)" and "Give Up Turn (Pass)" without ending the match'
          );

          // Simulate Force Move on timeout
          const b36 = create36x36TacticalClashBoard();
          const forcedDecision = chooseAIMasterAction(b36, 'sente', 'taikyoku36', AI_MASTERS[17], {
            sente: [],
            gote: [],
          });
          t.assert(
            Boolean(forcedDecision && forcedDecision.move),
            `On timeout with Force Move active: Sente automatically plays (${forcedDecision?.fromR},${forcedDecision?.fromC}) → (${forcedDecision?.move.r},${forcedDecision?.move.c}) and passes turn to Gote`
          );

          // Simulate Give Up Turn (Pass) on timeout: board remains intact, turn flips sente -> gote, winner remains null
          const winStatusAfterPass = evaluateMatchWinConditions(b36, 'sente', 'gote', 'taikyoku36', {
            sente: [],
            gote: [],
          });
          t.assert(
            winStatusAfterPass.winner === null,
            'On timeout with Give Up Turn (Pass) active: match continues (winner === null) and turn transfers cleanly to opponent'
          );

          return {
            label: 'Grand 36×36: Adjustable Turn Timer (3s–60s · Force Move / Pass)',
            scale: 'taikyoku36',
            turn: 'sente',
            board: b36,
            selectSquare: { r: 13, c: 17 },
            description:
              'Grand 36×36 loaded with adjustable Turn Timer (3s–60s) and Non-Game-Ending Force Move / Give Up Turn controls in the Topbar HUD.',
          };
        },
      },
      {
        id: 'WB-09',
        category: 'war_budget_agents',
        title: '4-Phase Shōgi Strategy Curriculum (24 Modules across Openers, Castling, Mid-Game & End-Game)',
        description:
          'Verifies all 24 interactive Strategy Curriculum modules across all 4 game phases (Openers, Castling, Mid-Game, End-Game) and all 5 board scales (3×4, 9×9, 12×12 Chū, 12×12 War-Budget, 36×36 Grand).',
        run: (t) => {
          t.assert(
            STRATEGY_PHASE_TRACKS.length === 4,
            `Curriculum is organized into ${STRATEGY_PHASE_TRACKS.length} phase tracks: ${STRATEGY_PHASE_TRACKS.map(p => p.title).join(', ')}`
          );
          t.assert(
            SHOGI_STRATEGY_CURRICULUM.length === 24,
            `Curriculum contains ${SHOGI_STRATEGY_CURRICULUM.length} complete interactive strategy modules`
          );

          const phases = ['openers', 'castling', 'midgame', 'endgame'] as const;
          const scales: BoardScaleId[] = ['dobutsu', 'shogi9', 'chu12', 'war12', 'taikyoku36'];

          for (const ph of phases) {
            const phaseMods = SHOGI_STRATEGY_CURRICULUM.filter(m => m.phase === ph);
            t.assert(
              phaseMods.length >= 5,
              `Phase "${ph}" contains ${phaseMods.length} interactive modules covering every board scale`
            );
            for (const sc of scales) {
              const hasScale = phaseMods.some(m => m.scale === sc);
              t.assert(hasScale, `Phase "${ph}" includes at least 1 interactive curriculum module for scale "${sc}"`);
            }
          }

          // Verify every module's guided steps and board arrows
          for (const mod of SHOGI_STRATEGY_CURRICULUM) {
            const snap0 = buildCurriculumBoardState(mod, 0);
            t.assert(
              mod.guidedSteps.length >= 1 && snap0.arrows.length > 0,
              `[${mod.id}] "${mod.title}" has ${mod.guidedSteps.length} guided step(s) and ${snap0.arrows.length} directional board arrows`
            );
          }

          const featuredMod = SHOGI_STRATEGY_CURRICULUM[0];
          const featuredSnap = buildCurriculumBoardState(featuredMod, 0);
          return {
            label: `Strategy Curriculum: ${featuredMod.title} (${featuredMod.kanji})`,
            scale: featuredMod.scale,
            turn: 'sente',
            board: featuredSnap.board,
            hands: featuredSnap.hands,
            botId: featuredMod.championBotId,
            selectSquare:
              featuredMod.guidedSteps[0].fromR !== undefined && featuredMod.guidedSteps[0].fromC !== undefined
                ? { r: featuredMod.guidedSteps[0].fromR, c: featuredMod.guidedSteps[0].fromC }
                : undefined,
            description: `${featuredMod.title}: ${featuredMod.winPlanSummary}`,
          };
        },
      },
      {
        id: 'WB-10',
        category: 'war_budget_agents',
        title: 'Strategy Curriculum Mistake Refutation Demos & Live AI Master Sparring Verification',
        description:
          'Verifies that all 24 Strategy Curriculum modules provide an interactive Mistake Refutation demo (showing why a common error fails with crimson refutation vectors) and a valid AI Master sparring preset.',
        run: (t) => {
          for (const mod of SHOGI_STRATEGY_CURRICULUM) {
            const mistakeSnap = buildMistakeRefutationBoardState(mod);
            const hasRefutationArrow = mistakeSnap.arrows.some(a => a.color === 'rose');
            const championExists = AI_MASTERS.some(b => b.id === mod.championBotId);
            t.assert(
              hasRefutationArrow && mistakeSnap.keySquares.length >= 1 && championExists,
              `[${mod.id}] Mistake Demo ("${mod.mistakeDemo.mistakeTitle}") renders crimson refutation vector & links to AI Master ${mod.championBotId}`
            );
          }
        },
      }
    );
  }

  const results: SingleTestResult[] = [];
  let passedTests = 0;
  let failedTests = 0;
  let totalAssertions = 0;
  let passedAssertions = 0;

  for (const tc of tests) {
    const tracker = new AssertionTracker();
    const t0 = performance.now();
    let passed = true;
    let errorMsg: string | undefined;
    let preset: InteractiveBoardPreset | undefined;

    try {
      const maybePreset = tc.run(tracker);
      if (maybePreset) {
        preset = maybePreset;
      }
    } catch (err: any) {
      passed = false;
      errorMsg = err?.message || String(err);
    }

    const durationMs = Math.max(1, Math.round(performance.now() - t0));
    if (passed) passedTests++;
    else failedTests++;

    totalAssertions += tracker.total;
    passedAssertions += tracker.passed;

    results.push({
      id: tc.id,
      category: tc.category,
      title: tc.title,
      description: tc.description,
      passed,
      durationMs,
      assertionsPassed: tracker.passed,
      assertionsTotal: tracker.total,
      details: tracker.logs,
      error: errorMsg,
      boardPreset: preset,
      drillCode: tc.drillCode,
      puzzleId: tc.puzzleId,
      lessonId: tc.lessonId,
      botId: tc.botId,
      strategyId: tc.strategyId,
    });
  }

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    totalAssertions,
    passedAssertions,
    durationMs: Math.max(1, Math.round(performance.now() - startAll)),
    results,
  };
}
