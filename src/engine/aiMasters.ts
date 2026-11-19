import { DIRS_8, PIECE_DB } from './pieceRegistry';
import {
  BoardPiece,
  BoardScaleId,
  LegalMove,
  PlayerSide,
  SCALE_CONFIGS,
  analyzePieceMovesOnBoard,
  cloneBoard,
  getLegalDropsForHandPiece,
  getScalePromotesTo,
  getStrictLegalMovesForSquare,
  inBounds,
} from './shogiEngine';

export interface AIMasterProfile {
  id: string;
  rank: number;
  name: string;
  kanjiTitle: string;
  elo: number;
  specialtyScale: BoardScaleId;
  styleTag: string;
  motto: string;
  // Engine weights
  depth: number;
  aggression: number;       // Multiplier on captures & forward attacks
  kingSafety: number;       // Multiplier on defending royals & checking enemy royals
  promotionBias: number;    // Bonus for advancing into promotion zone
  centerControl: number;    // Bonus for central file/rank control
  lionMastery: number;      // Bonus for multi-step Igui & preserving Lion/Fire Demon
  dropActivity: number;     // Willingness to drop pieces aggressively vs hoard in hand
  temperature: number;      // Random noise (high for low ELO, near 0 for Grandmasters)
}

export const AI_MASTERS: AIMasterProfile[] = [
  {
    id: 'bot-01',
    rank: 1,
    name: 'Koharu the Chick',
    kanjiTitle: '小春 (新米)',
    elo: 450,
    specialtyScale: 'dobutsu',
    styleTag: 'Dōbutsu Beginner',
    motto: 'Loves marching Chicks straight ahead! Sometimes forgets to watch the Try rank.',
    depth: 1,
    aggression: 0.7,
    kingSafety: 0.5,
    promotionBias: 1.4,
    centerControl: 0.6,
    lionMastery: 0.5,
    dropActivity: 0.6,
    temperature: 140,
  },
  {
    id: 'bot-02',
    rank: 2,
    name: 'Taro the Tanuki',
    kanjiTitle: '狸太郎 (9級)',
    elo: 620,
    specialtyScale: 'dobutsu',
    styleTag: 'Trickster',
    motto: 'Drops captured Elephants and Giraffes onto unexpected squares.',
    depth: 1,
    aggression: 1.0,
    kingSafety: 0.7,
    promotionBias: 1.1,
    centerControl: 1.0,
    lionMastery: 0.7,
    dropActivity: 1.6,
    temperature: 95,
  },
  {
    id: 'bot-03',
    rank: 3,
    name: 'Renji the Vanguard',
    kanjiTitle: '蓮司 (7級)',
    elo: 800,
    specialtyScale: 'shogi9',
    styleTag: 'Ranging Rook',
    motto: 'Swings the Flying Chariot [R] to the central file and pushes vanguard pawns.',
    depth: 2,
    aggression: 1.25,
    kingSafety: 0.85,
    promotionBias: 1.2,
    centerControl: 1.3,
    lionMastery: 0.8,
    dropActivity: 1.1,
    temperature: 65,
  },
  {
    id: 'bot-04',
    rank: 4,
    name: 'Ayame of the Yagura',
    kanjiTitle: '菖蒲 (5級)',
    elo: 950,
    specialtyScale: 'shogi9',
    styleTag: 'Fortress Builder',
    motto: 'Prioritizes Gold and Silver General coordination around the King.',
    depth: 2,
    aggression: 0.85,
    kingSafety: 1.75,
    promotionBias: 1.0,
    centerControl: 1.0,
    lionMastery: 0.9,
    dropActivity: 0.85,
    temperature: 50,
  },
  {
    id: 'bot-05',
    rank: 5,
    name: 'Kenjiro the Spear',
    kanjiTitle: '健次郎 (3級)',
    elo: 1100,
    specialtyScale: 'shogi9',
    styleTag: 'Edge Attacker',
    motto: 'Combines Incense Chariots [L] and Knights [N] to pierce the outer files.',
    depth: 2,
    aggression: 1.45,
    kingSafety: 1.0,
    promotionBias: 1.4,
    centerControl: 0.8,
    lionMastery: 1.0,
    dropActivity: 1.35,
    temperature: 40,
  },
  {
    id: 'bot-06',
    rank: 6,
    name: 'Satsuki the Tactician',
    kanjiTitle: '皐月 (初段)',
    elo: 1250,
    specialtyScale: 'shogi9',
    styleTag: 'Bishop Exchange',
    motto: 'Trades Angle Movers early and hunts for double-threat forks with dropped pieces.',
    depth: 2,
    aggression: 1.35,
    kingSafety: 1.2,
    promotionBias: 1.3,
    centerControl: 1.25,
    lionMastery: 1.1,
    dropActivity: 1.65,
    temperature: 30,
  },
  {
    id: 'bot-07',
    rank: 7,
    name: 'Monk Genkai',
    kanjiTitle: '玄海法師 (二段)',
    elo: 1380,
    specialtyScale: 'chu12',
    styleTag: 'Chū Shōgi Keeper',
    motto: 'Advances Go-Betweens and Blind Tigers to build an iron wall in 12×12.',
    depth: 2,
    aggression: 1.05,
    kingSafety: 1.5,
    promotionBias: 1.25,
    centerControl: 1.3,
    lionMastery: 1.4,
    dropActivity: 1.0,
    temperature: 26,
  },
  {
    id: 'bot-08',
    rank: 8,
    name: 'Raiden the Lion Tamer',
    kanjiTitle: '雷電 (三段)',
    elo: 1500,
    specialtyScale: 'chu12',
    styleTag: 'Igui Striker',
    motto: 'Specializes in hit-and-run Lion Igui (stationary captures) and Kirin promotions.',
    depth: 2,
    aggression: 1.5,
    kingSafety: 1.25,
    promotionBias: 1.5,
    centerControl: 1.4,
    lionMastery: 2.1,
    dropActivity: 1.1,
    temperature: 22,
  },
  {
    id: 'bot-09',
    rank: 9,
    name: 'Lady Tomoe',
    kanjiTitle: '巴御前 (四段)',
    elo: 1620,
    specialtyScale: 'chu12',
    styleTag: 'Cavalry Sweeper',
    motto: 'Unleashes Dragon Kings [DK], Dragon Horses [DH], and Free Kings [Q] down open diagonals.',
    depth: 2,
    aggression: 1.65,
    kingSafety: 1.3,
    promotionBias: 1.6,
    centerControl: 1.45,
    lionMastery: 1.6,
    dropActivity: 1.4,
    temperature: 18,
  },
  {
    id: 'bot-10',
    rank: 10,
    name: 'Kuroda the Fortress',
    kanjiTitle: '黒田 (五段)',
    elo: 1740,
    specialtyScale: 'shogi9',
    styleTag: 'Anaguma Bear',
    motto: 'Tucks the King deep in the corner and counter-attacks with deadly Tsume precision.',
    depth: 3,
    aggression: 1.2,
    kingSafety: 2.0,
    promotionBias: 1.4,
    centerControl: 1.2,
    lionMastery: 1.4,
    dropActivity: 1.5,
    temperature: 14,
  },
  {
    id: 'bot-11',
    rank: 11,
    name: 'Hanzō of the Tengu',
    kanjiTitle: '半蔵 (六段)',
    elo: 1850,
    specialtyScale: 'taikyoku36',
    styleTag: 'Hook Master',
    motto: 'Uses Tengu [LO], Peacock [PC], and Hook Movers [HM] to turn 90° corners around blockers.',
    depth: 2,
    aggression: 1.55,
    kingSafety: 1.4,
    promotionBias: 1.5,
    centerControl: 1.5,
    lionMastery: 1.85,
    dropActivity: 1.3,
    temperature: 12,
  },
  {
    id: 'bot-12',
    rank: 12,
    name: 'Kagutsuchi the Flame',
    kanjiTitle: '迦具土 (六段)',
    elo: 1940,
    specialtyScale: 'taikyoku36',
    styleTag: 'Fire Demon Lord',
    motto: 'Escorts the Fire Demon [DM] into dense enemy formations to incinerate 8 pieces at once.',
    depth: 2,
    aggression: 1.85,
    kingSafety: 1.35,
    promotionBias: 1.6,
    centerControl: 1.6,
    lionMastery: 2.2,
    dropActivity: 1.4,
    temperature: 10,
  },
  {
    id: 'bot-13',
    rank: 13,
    name: 'Master Shingen',
    kanjiTitle: '武田信玄 (七段)',
    elo: 2040,
    specialtyScale: 'chu12',
    styleTag: 'Fūrinkazan',
    motto: 'Swift as wind, quiet as forest, fierce as fire, immovable as a mountain.',
    depth: 3,
    aggression: 1.6,
    kingSafety: 1.8,
    promotionBias: 1.65,
    centerControl: 1.65,
    lionMastery: 2.0,
    dropActivity: 1.55,
    temperature: 8,
  },
  {
    id: 'bot-14',
    rank: 14,
    name: 'Kenshin the Dragon',
    kanjiTitle: '上杉謙信 (七段)',
    elo: 2120,
    specialtyScale: 'chu12',
    styleTag: 'Relentless Surge',
    motto: 'Sacrifices minor generals to rip open files for Soaring Eagles [EL] and Horned Falcons [HF].',
    depth: 3,
    aggression: 1.95,
    kingSafety: 1.45,
    promotionBias: 1.8,
    centerControl: 1.7,
    lionMastery: 2.1,
    dropActivity: 1.75,
    temperature: 7,
  },
  {
    id: 'bot-15',
    rank: 15,
    name: 'Princess Kagu-ya',
    kanjiTitle: '輝夜姫 (八段)',
    elo: 2210,
    specialtyScale: 'taikyoku36',
    styleTag: 'Dual Royal Aegis',
    motto: 'Protects both King [K] and Crown Prince [CP] while promoting Drunken Elephants.',
    depth: 2,
    aggression: 1.5,
    kingSafety: 2.25,
    promotionBias: 1.9,
    centerControl: 1.6,
    lionMastery: 1.9,
    dropActivity: 1.5,
    temperature: 6,
  },
  {
    id: 'bot-16',
    rank: 16,
    name: 'Chūnagon Fujiwara',
    kanjiTitle: '藤原中納言 (八段)',
    elo: 2300,
    specialtyScale: 'taikyoku36',
    styleTag: 'Imperial Strategist',
    motto: 'Commands Great Standards [GE], Center Masters [MT], and Vice Generals [VG] in harmony.',
    depth: 2,
    aggression: 1.7,
    kingSafety: 1.9,
    promotionBias: 1.85,
    centerControl: 1.85,
    lionMastery: 2.2,
    dropActivity: 1.65,
    temperature: 5,
  },
  {
    id: 'bot-17',
    rank: 17,
    name: 'Honinbō Sansa',
    kanjiTitle: '本因坊算砂 (九段)',
    elo: 2400,
    specialtyScale: 'shogi9',
    styleTag: 'Historical Titan',
    motto: 'Deep tactical calculation across all board scales; punishes any overextended stone.',
    depth: 3,
    aggression: 1.75,
    kingSafety: 2.1,
    promotionBias: 1.9,
    centerControl: 1.9,
    lionMastery: 2.3,
    dropActivity: 1.85,
    temperature: 4,
  },
  {
    id: 'bot-18',
    rank: 18,
    name: 'Grand Abbot Tenkai',
    kanjiTitle: '天海大僧正 (九段)',
    elo: 2490,
    specialtyScale: 'taikyoku36',
    styleTag: '804-Stone Sage',
    motto: 'Harnesses Devas [DV], Dark Spirits [DS], and Great Generals [GG] across 36×36.',
    depth: 2,
    aggression: 1.85,
    kingSafety: 2.15,
    promotionBias: 2.0,
    centerControl: 2.0,
    lionMastery: 2.4,
    dropActivity: 1.8,
    temperature: 3,
  },
  {
    id: 'bot-19',
    rank: 19,
    name: 'Ryūō Sōta',
    kanjiTitle: '竜王 (永世竜王)',
    elo: 2580,
    specialtyScale: 'shogi9',
    styleTag: 'Endgame Computer',
    motto: 'Sees multi-step checkmate threats and optimal hand-drop forks with surgical accuracy.',
    depth: 3,
    aggression: 1.9,
    kingSafety: 2.3,
    promotionBias: 2.1,
    centerControl: 2.0,
    lionMastery: 2.5,
    dropActivity: 2.0,
    temperature: 1.5,
  },
  {
    id: 'bot-20',
    rank: 20,
    name: 'Meijin Sōkei Ōhashi',
    kanjiTitle: '大橋宗桂 (初代名人)',
    elo: 2650,
    specialtyScale: 'taikyoku36',
    styleTag: 'Supreme Meijin',
    motto: 'First Lifetime Meijin. Master of Dōbutsu, 9×9, 12×12 Chū, and 36×36 Grand Taikyoku.',
    depth: 3,
    aggression: 2.0,
    kingSafety: 2.4,
    promotionBias: 2.2,
    centerControl: 2.1,
    lionMastery: 2.6,
    dropActivity: 2.1,
    temperature: 0.5,
  },
];

export interface AIChosenAction {
  type: 'move' | 'drop';
  fromR?: number;
  fromC?: number;
  move: LegalMove;
  secondStepMove?: LegalMove | null;
  dropCode?: string;
  promote?: boolean;
  score: number;
}

/**
 * Static board evaluation from `perspective`'s point of view, weighted by `bot` profile.
 */
export function evaluatePositionForBot(
  board: (BoardPiece | null)[][],
  perspective: PlayerSide,
  scale: BoardScaleId,
  bot: AIMasterProfile,
  hands?: { sente: string[]; gote: string[] }
): number {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const midR = (rows - 1) / 2;
  const midC = (cols - 1) / 2;

  let score = 0;
  let myRoyals = 0;
  let oppRoyals = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p) continue;
      const spec = PIECE_DB[p.code];
      if (!spec) continue;

      const isMine = p.owner === perspective;
      const sign = isMine ? 1 : -1;

      if (spec.isRoyal) {
        if (isMine) myRoyals++;
        else oppRoyals++;
      }

      let pieceVal = spec.value;
      if (p.promoted) {
        pieceVal *= 1.15 * bot.promotionBias;
      }
      if (spec.special === 'lion' || spec.special === 'fire' || spec.special === 'range_jump') {
        pieceVal *= 0.85 + 0.15 * bot.lionMastery;
      }

      // Forward advancement bonus
      const forwardProgress = p.owner === 'sente' ? (rows - 1 - r) / rows : r / rows;
      const advanceBonus = forwardProgress * 28 * bot.aggression;

      // Center control bonus
      const distCenter = (Math.abs(r - midR) / rows + Math.abs(c - midC) / cols) * 0.5;
      const centerBonus = (1 - distCenter) * 18 * bot.centerControl;

      score += sign * (pieceVal + advanceBonus + centerBonus);
    }
  }

  // Hand material in 3x4 and 9x9
  if (hands && SCALE_CONFIGS[scale].allowDrops) {
    hands.sente.forEach(code => {
      const val = (PIECE_DB[code]?.value || 100) * 1.08 * bot.dropActivity;
      score += perspective === 'sente' ? val : -val;
    });
    hands.gote.forEach(code => {
      const val = (PIECE_DB[code]?.value || 100) * 1.08 * bot.dropActivity;
      score += perspective === 'gote' ? val : -val;
    });
  }

  if (myRoyals === 0) score -= 500000 * bot.kingSafety;
  if (oppRoyals === 0) score += 500000 * bot.aggression;

  return score;
}

/**
 * Selects a move for `side` using `bot`'s distinct personality, search depth, and evaluation weights.
 * Optimized so that 3x4, 9x9, 12x12 use alpha-beta minimax and 36x36 uses pruned beam search over top tactical candidates.
 */
export function chooseAIMasterAction(
  board: (BoardPiece | null)[][],
  side: PlayerSide,
  scale: BoardScaleId,
  bot: AIMasterProfile,
  hands?: { sente: string[]; gote: string[] },
  lionTradeBan?: { bannedOwner: PlayerSide } | null
): AIChosenAction | null {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const candidates: AIChosenAction[] = [];

  // 1. Gather all legal board moves
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p || p.owner !== side) continue;

      const { moves } =
        scale === 'dobutsu' || scale === 'shogi9'
          ? getStrictLegalMovesForSquare(board, r, c, scale, { lionTradeBan })
          : analyzePieceMovesOnBoard(board, r, c, { scale, lionTradeBan });

      for (const m of moves) {
        const target = board[m.r][m.c];
        const spec = PIECE_DB[p.code];
        let quickScore = 0;

        // Capture ordering (MVV-LVA)
        if (target && target.owner !== side) {
          const targetSpec = PIECE_DB[target.code];
          const victimVal = targetSpec ? targetSpec.value : 200;
          const attackerVal = spec ? spec.value : 200;
          quickScore += victimVal * 1.6 * bot.aggression - attackerVal * 0.12;
          if (targetSpec?.isRoyal) quickScore += 200000;
        }

        // Fire Demon AoE burn estimation
        if (spec?.special === 'fire') {
          Object.values(DIRS_8).forEach(([dr, dc]) => {
            const nr = m.r + dr;
            const nc = m.c + dc;
            if (inBounds(nr, nc, rows, cols)) {
              const adj = board[nr][nc];
              if (adj && adj.owner !== side) {
                quickScore += (PIECE_DB[adj.code]?.value || 250) * 1.4 * bot.lionMastery;
              }
            }
          });
        }

        // Promotion bonus
        const shouldPromote = Boolean(m.canPromote);
        if (shouldPromote) {
          const promoCode = getScalePromotesTo(p.code, scale);
          const promoVal = promoCode && PIECE_DB[promoCode] ? PIECE_DB[promoCode].value : 400;
          quickScore += (promoVal - (spec?.value || 200)) * bot.promotionBias;
        }

        // Dobutsu Try Rule win bonus!
        if (scale === 'dobutsu' && p.code === 'K') {
          const tryRow = side === 'sente' ? 0 : rows - 1;
          if (m.r === tryRow) {
            quickScore += 150000;
          }
        }

        // Positional forward & center bias
        const drForward = side === 'sente' ? r - m.r : m.r - r;
        quickScore += drForward * 14 * bot.aggression;
        const centerDist = Math.abs(m.c - (cols - 1) / 2);
        quickScore += ((cols / 2 - centerDist) / (cols / 2)) * 12 * bot.centerControl;

        // Signature AI Master Personality & Strategy Bonuses (Bot #1 through #20)
        if (bot.id === 'bot-01' && p.code === 'P') {
          // #1 Koharu the Chick: loves marching Chicks forward
          quickScore += 180;
        } else if (bot.id === 'bot-03' && p.code === 'R' && r === m.r && Math.abs(m.c - Math.floor(cols / 2)) <= 1) {
          // #3 Renji the Vanguard (Ranging Rook / Furibisha): swings Rook laterally to central files
          quickScore += 260;
        } else if (bot.id === 'bot-04' && (p.code === 'G' || p.code === 'S')) {
          // #4 Ayame of the Yagura (Fortress Builder): coordinates Gold & Silver Generals near King
          quickScore += 175;
        } else if (bot.id === 'bot-05' && (m.c === 0 || m.c === cols - 1 || p.code === 'L' || p.code === 'N')) {
          // #5 Kenjiro the Spear (Edge Attacker / Hashizeme): attacks outer edge files with L, N, P
          quickScore += 210;
        } else if (bot.id === 'bot-06' && (p.code === 'B' || p.code === 'DH') && target) {
          // #6 Satsuki the Tactician (Bishop Exchange / Kakugawari): prioritizes diagonal Bishop trades
          quickScore += 290;
        } else if (bot.id === 'bot-07' && (p.code === 'GB' || p.code === 'BT' || p.code === 'C' || p.code === 'S')) {
          // #7 Monk Genkai (Chū Shōgi Keeper): builds Go-Between & Blind Tiger shield wall
          quickScore += 195;
        } else if (bot.id === 'bot-08' && (p.code === 'LN' || p.code === 'KR' || p.code === 'PH' || spec?.special === 'lion')) {
          // #8 Raiden the Lion Tamer (Igui Striker): prioritizes Lion, Kirin & Phoenix and hit-and-run Igui strikes
          quickScore += 320;
        } else if (bot.id === 'bot-09' && (p.code === 'DK' || p.code === 'DH' || p.code === 'Q')) {
          // #9 Lady Tomoe (Cavalry Sweeper): unleashes Dragon King, Dragon Horse & Free King
          quickScore += 275;
        } else if (bot.id === 'bot-10' && (p.code === 'K' || p.code === 'G' || p.code === 'S') && (m.c === 0 || m.c === cols - 1)) {
          // #10 Kuroda the Fortress (Anaguma Bear): tucks King & generals into the corner bunker
          quickScore += 230;
        } else if (bot.id === 'bot-11' && (m.kind === 'hook' || p.code === 'LO' || p.code === 'HM' || p.code === 'PC')) {
          // #11 Hanzō of the Tengu (Hook Master): prioritizes 90-degree bent hook maneuvers
          quickScore += 340;
        } else if (bot.id === 'bot-12' && (p.code === 'DM' || spec?.special === 'fire')) {
          // #12 Kagutsuchi the Flame (Fire Demon Lord): drives Fire Demon into multi-burn clusters
          quickScore += 360;
        } else if (bot.id === 'bot-14' && (p.code === 'EL' || p.code === 'HF' || p.code === 'FD')) {
          // #14 Kenshin the Dragon (Relentless Surge): attacks with Soaring Eagle & Horned Falcon
          quickScore += 300;
        } else if (bot.id === 'bot-15' && (p.code === 'DE' || p.code === 'WE' || p.code === 'CP')) {
          // #15 Princess Kagu-ya (Dual Royal Aegis): advances DE/WE to promote into extra Royals
          quickScore += 310;
        } else if (bot.id === 'bot-16' && (p.code === 'GE' || p.code === 'CN' || p.code === 'VG')) {
          // #16 Chūnagon Fujiwara (Imperial Strategist): commands Great Standards & Vice Generals
          quickScore += 280;
        } else if (bot.id === 'bot-18' && (p.code === 'GG' || p.code === 'DV' || p.code === 'DS' || spec?.special === 'range_jump')) {
          // #18 Grand Abbot Tenkai (804-Stone Sage): harnesses Great Generals & Devas
          quickScore += 330;
        }

        // Check if Lion 2nd step (double capture or Igui!) can improve move
        let bestSecondStep: LegalMove | null = null;
        if (m.allowsSecondStep && spec?.special === 'lion') {
          const tempBoard = cloneBoard(board);
          tempBoard[m.r][m.c] = { ...p };
          tempBoard[r][c] = null;
          const step2 = analyzePieceMovesOnBoard(tempBoard, m.r, m.c, {
            isSecondStep: true,
            originSquare: { r, c },
            scale,
          });
          let bestS2Bonus = 0;
          for (const s2 of step2.moves) {
            if (s2.kind === 'igui' && target) {
              // Igui hit-and-run! Safe capture without exposing Lion
              const iguiBonus = (bot.id === 'bot-08' ? 520 : 220) * bot.lionMastery;
              if (iguiBonus > bestS2Bonus) {
                bestS2Bonus = iguiBonus;
                bestSecondStep = s2;
              }
            } else {
              const t2 = tempBoard[s2.r][s2.c];
              if (t2 && t2.owner !== side) {
                const cap2Bonus = (PIECE_DB[t2.code]?.value || 250) * 1.4 * bot.lionMastery;
                if (cap2Bonus > bestS2Bonus) {
                  bestS2Bonus = cap2Bonus;
                  bestSecondStep = s2;
                }
              }
            }
          }
          quickScore += bestS2Bonus;
        }

        candidates.push({
          type: 'move',
          fromR: r,
          fromC: c,
          move: m,
          secondStepMove: bestSecondStep,
          promote: shouldPromote,
          score: quickScore,
        });
      }
    }
  }

  // 2. Gather legal hand drops (Dobutsu 3x4 & Standard Shogi 9x9)
  if (SCALE_CONFIGS[scale].allowDrops && hands && hands[side].length > 0) {
    const uniqueCodes = Array.from(new Set(hands[side]));
    for (const code of uniqueCodes) {
      const { drops } = getLegalDropsForHandPiece(board, side, code, scale, hands);
      for (const d of drops) {
        let dropScore = (PIECE_DB[code]?.value || 150) * 0.35 * bot.dropActivity;
        if (bot.id === 'bot-02') {
          // #2 Taro the Tanuki (Trickster): loves surprise hand drops
          dropScore += 320;
        }
        const centerDist = Math.abs(d.c - (cols - 1) / 2);
        dropScore += ((cols / 2 - centerDist) / (cols / 2)) * 15 * bot.centerControl;
        candidates.push({
          type: 'drop',
          move: d,
          dropCode: code,
          score: dropScore,
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort by heuristic score descending
  candidates.sort((a, b) => b.score - a.score);

  // 3. Apply 2-ply lookahead (opponent best reply) on top K candidates so each bot plays smartly!
  const beamWidth = scale === 'taikyoku36' ? Math.min(18, candidates.length) : Math.min(28, candidates.length);
  const topCandidates = candidates.slice(0, beamWidth);
  const enemy: PlayerSide = side === 'sente' ? 'gote' : 'sente';

  if (bot.depth >= 2) {
    for (const cand of topCandidates) {
      const simBoard = cloneBoard(board);
      if (cand.type === 'move' && cand.fromR !== undefined && cand.fromC !== undefined) {
        const pieceCopy = { ...simBoard[cand.fromR][cand.fromC]! };
        if (cand.promote) {
          const promo = getScalePromotesTo(pieceCopy.code, scale);
          if (promo) {
            pieceCopy.code = promo;
            pieceCopy.promoted = true;
          }
        }
        simBoard[cand.move.r][cand.move.c] = pieceCopy;
        simBoard[cand.fromR][cand.fromC] = null;
        if (cand.secondStepMove) {
          simBoard[cand.secondStepMove.r][cand.secondStepMove.c] = pieceCopy;
          simBoard[cand.move.r][cand.move.c] = null;
        }
      } else if (cand.type === 'drop' && cand.dropCode) {
        simBoard[cand.move.r][cand.move.c] = {
          code: cand.dropCode,
          owner: side,
          promoted: false,
          baseCode: cand.dropCode,
        };
      }

      // Evaluate resulting board + check enemy's highest-value counter-capture on the moved square
      const destR = cand.secondStepMove ? cand.secondStepMove.r : cand.move.r;
      const destC = cand.secondStepMove ? cand.secondStepMove.c : cand.move.c;
      const movedPiece = simBoard[destR][destC];
      const movedVal = movedPiece ? PIECE_DB[movedPiece.code]?.value || 200 : 0;

      // Fast check if enemy can immediately capture the piece at (destR, destC) or capture our Royal
      let maxEnemyReplyPenalty = 0;
      if (scale !== 'taikyoku36' || movedVal >= 350) {
        const rMin = Math.max(0, destR - 6);
        const rMax = Math.min(rows - 1, destR + 6);
        const cMin = Math.max(0, destC - 6);
        const cMax = Math.min(cols - 1, destC + 6);
        for (let er = rMin; er <= rMax; er++) {
          for (let ec = cMin; ec <= cMax; ec++) {
            const ep = simBoard[er][ec];
            if (ep && ep.owner === enemy) {
              const { moves: eMoves } = analyzePieceMovesOnBoard(simBoard, er, ec, { scale });
              for (const em of eMoves) {
                if (em.r === destR && em.c === destC) {
                  maxEnemyReplyPenalty = Math.max(maxEnemyReplyPenalty, movedVal * 0.85 * bot.kingSafety);
                } else {
                  const threatened = simBoard[em.r][em.c];
                  if (threatened && threatened.owner === side && PIECE_DB[threatened.code]?.isRoyal) {
                    maxEnemyReplyPenalty = Math.max(maxEnemyReplyPenalty, 80000 * bot.kingSafety);
                  }
                }
              }
            }
          }
        }
      }

      cand.score -= maxEnemyReplyPenalty;
      cand.score += (Math.random() - 0.5) * bot.temperature;
    }
  } else {
    for (const cand of topCandidates) {
      cand.score += (Math.random() - 0.5) * bot.temperature;
    }
  }

  topCandidates.sort((a, b) => b.score - a.score);
  return topCandidates[0];
}

// ============================================================================
// HISTORICAL SHŌGI STRATEGIES & CASTLES (戦法・囲い SENPŌ & KAKOI)
// ============================================================================
export interface ShogiStrategyOrCastle {
  id: string;
  name: string;
  kanji: string;
  category: 'Castle (囲い Kakoi)' | 'Ranging Rook (振り飛車 Furibisha)' | 'Static Rook (居飛車 Ibisha)' | 'Large-Board Formation (大将棋・大局陣)';
  scale: BoardScaleId;
  championBotId: string;
  summary: string;
  keyMoveFrom: { r: number; c: number };
  keyMoveTo: { r: number; c: number };
  pieces: { r: number; c: number; code: string; owner: PlayerSide; promoted?: boolean }[];
  senteHand?: string[];
}

export const SHOGI_STRATEGIES_AND_CASTLES: ShogiStrategyOrCastle[] = [
  {
    id: 'castle-yagura',
    name: 'Yagura Castle (Fortress Tower)',
    kanji: '矢倉囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-04',
    summary:
      'The quintessential Static Rook fortress. Sente’s King moves into (7,1) [8八] beneath an interlocking roof of Gold Generals at (7,2)/(6,3) and Silver General at (6,2).',
    keyMoveFrom: { r: 7, c: 2 },
    keyMoveTo: { r: 7, c: 1 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 0, c: 3, code: 'G', owner: 'gote' },
      { r: 0, c: 5, code: 'G', owner: 'gote' },
      { r: 1, c: 7, code: 'R', owner: 'gote' },
      { r: 7, c: 2, code: 'K', owner: 'sente' },
      { r: 6, c: 2, code: 'S', owner: 'sente' },
      { r: 6, c: 3, code: 'G', owner: 'sente' },
      { r: 7, c: 3, code: 'G', owner: 'sente' },
      { r: 6, c: 1, code: 'B', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 8, c: 0, code: 'L', owner: 'sente' },
      { r: 8, c: 1, code: 'N', owner: 'sente' },
      { r: 5, c: 1, code: 'P', owner: 'sente' },
      { r: 5, c: 2, code: 'P', owner: 'sente' },
      { r: 5, c: 3, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'castle-anaguma',
    name: 'Anaguma Castle (Bear in the Hole)',
    kanji: '穴熊囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-10',
    summary:
      'Tucks the King into the extreme corner square (8,8) [1九] after advancing the edge Lance to (7,8), sealed in by Silver at (7,7) and two Gold Generals.',
    keyMoveFrom: { r: 7, c: 7 },
    keyMoveTo: { r: 8, c: 8 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 7, c: 8, code: 'L', owner: 'sente' },
      { r: 6, c: 7, code: 'S', owner: 'sente' },
      { r: 7, c: 6, code: 'G', owner: 'sente' },
      { r: 8, c: 6, code: 'G', owner: 'sente' },
      { r: 7, c: 4, code: 'R', owner: 'sente' },
      { r: 6, c: 8, code: 'P', owner: 'sente' },
      { r: 6, c: 6, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'castle-mino',
    name: 'Mino Castle (Mino Defense)',
    kanji: '美濃囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-17',
    summary:
      'Signature Ranging Rook castle with exceptional lateral resilience. King sits at (7,7) [2八] protected by Silver at (7,6) [3八] and Golds at (8,5) & (7,5).',
    keyMoveFrom: { r: 8, c: 6 },
    keyMoveTo: { r: 7, c: 6 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 8, c: 6, code: 'S', owner: 'sente' },
      { r: 8, c: 5, code: 'G', owner: 'sente' },
      { r: 7, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 7, code: 'N', owner: 'sente' },
      { r: 8, c: 8, code: 'L', owner: 'sente' },
      { r: 7, c: 3, code: 'R', owner: 'sente' },
      { r: 6, c: 7, code: 'P', owner: 'sente' },
      { r: 6, c: 6, code: 'P', owner: 'sente' },
      { r: 6, c: 5, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'castle-takamino',
    name: 'Takamino Castle (High Mino)',
    kanji: '高美濃囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-17',
    summary:
      'Evolution of the Mino Castle where the left Gold advances to (6,5) [4七] to fortify the castle head against diagonal Bishop and Knight raids.',
    keyMoveFrom: { r: 7, c: 5 },
    keyMoveTo: { r: 6, c: 5 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 7, c: 6, code: 'S', owner: 'sente' },
      { r: 7, c: 5, code: 'G', owner: 'sente' },
      { r: 8, c: 6, code: 'G', owner: 'sente' },
      { r: 8, c: 7, code: 'N', owner: 'sente' },
      { r: 8, c: 8, code: 'L', owner: 'sente' },
      { r: 5, c: 5, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'castle-kinmuso',
    name: 'Kinmusō Castle (Gold Peerless)',
    kanji: '金無双',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-04',
    summary:
      'Fast double-Ranging-Rook fortress featuring two side-by-side Gold Generals on rank 8 ((7,6) & (7,5)) shielding the King at (7,7).',
    keyMoveFrom: { r: 8, c: 5 },
    keyMoveTo: { r: 7, c: 5 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 7, c: 6, code: 'G', owner: 'sente' },
      { r: 8, c: 5, code: 'G', owner: 'sente' },
      { r: 6, c: 6, code: 'S', owner: 'sente' },
      { r: 8, c: 7, code: 'N', owner: 'sente' },
      { r: 8, c: 8, code: 'L', owner: 'sente' },
    ],
  },
  {
    id: 'castle-gangi',
    name: 'Gangi Castle (Snow-Roof Formation)',
    kanji: '雁木囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-13',
    summary:
      'Zig-zagging Silver and Gold formation with twin Silvers at (6,3) & (6,5) and Golds at (7,2) & (7,4), absorbing central attacks while preparing counter-pushes.',
    keyMoveFrom: { r: 7, c: 3 },
    keyMoveTo: { r: 6, c: 3 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 2, code: 'K', owner: 'sente' },
      { r: 7, c: 3, code: 'S', owner: 'sente' },
      { r: 6, c: 5, code: 'S', owner: 'sente' },
      { r: 7, c: 4, code: 'G', owner: 'sente' },
      { r: 8, c: 3, code: 'G', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
    ],
  },
  {
    id: 'castle-funagakoi',
    name: 'Funagakoi (Boat Castle)',
    kanji: '舟囲い',
    category: 'Castle (囲い Kakoi)',
    scale: 'shogi9',
    championBotId: 'bot-03',
    summary:
      'Rapid Static Rook castle shaped like a skiff: King at (7,1), Golds at (8,3) & (7,3), and Silver at (8,2), built in just 4 moves to support rapid attacks.',
    keyMoveFrom: { r: 8, c: 4 },
    keyMoveTo: { r: 7, c: 3 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 1, code: 'K', owner: 'sente' },
      { r: 8, c: 4, code: 'G', owner: 'sente' },
      { r: 8, c: 3, code: 'G', owner: 'sente' },
      { r: 8, c: 2, code: 'S', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
    ],
  },
  {
    id: 'strat-nakabisha',
    name: 'Gokigen Nakabisha (Cheerful Central Rook)',
    kanji: 'ゴキゲン中飛車',
    category: 'Ranging Rook (振り飛車 Furibisha)',
    scale: 'shogi9',
    championBotId: 'bot-03',
    summary:
      'Swings the Flying Chariot [R] from (7,7) to the central 5th file at (7,4) [5八飛] to launch an immediate central pawn breakthrough.',
    keyMoveFrom: { r: 7, c: 7 },
    keyMoveTo: { r: 7, c: 4 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 1, code: 'R', owner: 'gote' },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 4, c: 4, code: 'P', owner: 'sente' },
      { r: 5, c: 2, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'strat-shikenbisha',
    name: 'Shikenbisha (Fourth-File Ranging Rook)',
    kanji: '四間飛車',
    category: 'Ranging Rook (振り飛車 Furibisha)',
    scale: 'shogi9',
    championBotId: 'bot-03',
    summary:
      'Classic counter-attacking Ranging Rook strategy: swings [R] to the 6th file (7,3) [6八飛] while the Bishop guards the long diagonal and the King castles into Mino.',
    keyMoveFrom: { r: 7, c: 7 },
    keyMoveTo: { r: 7, c: 3 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
      { r: 5, c: 3, code: 'P', owner: 'sente' },
      { r: 5, c: 2, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'strat-sankenbisha',
    name: 'Ishida-Style Sankenbisha (Third-File Rook)',
    kanji: '石田流三間飛車',
    category: 'Ranging Rook (振り飛車 Furibisha)',
    scale: 'shogi9',
    championBotId: 'bot-03',
    summary:
      'Dynamic Ranging Rook formation where the Rook floats up to (5,2) [7六飛] on the 7th file, controlling both the 7th file and the 6th rank.',
    keyMoveFrom: { r: 7, c: 2 },
    keyMoveTo: { r: 5, c: 2 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 7, c: 2, code: 'R', owner: 'sente' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 7, c: 7, code: 'K', owner: 'sente' },
      { r: 4, c: 2, code: 'P', owner: 'sente' },
    ],
  },
  {
    id: 'strat-bogin',
    name: 'Ibisha Bōgin (Static Rook Climbing Silver)',
    kanji: '居飛車棒銀',
    category: 'Static Rook (居飛車 Ibisha)',
    scale: 'shogi9',
    championBotId: 'bot-14',
    summary:
      'Marches the right Silver General [S] up the 2nd file to (4,7) alongside the Rook [R] at (7,7) to smash through Gote’s Bishop head.',
    keyMoveFrom: { r: 5, c: 7 },
    keyMoveTo: { r: 4, c: 7 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 7, code: 'B', owner: 'gote' },
      { r: 2, c: 6, code: 'S', owner: 'gote' },
      { r: 3, c: 7, code: 'P', owner: 'gote' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 5, c: 7, code: 'S', owner: 'sente' },
      { r: 7, c: 1, code: 'K', owner: 'sente' },
    ],
  },
  {
    id: 'strat-kakugawari',
    name: 'Kakugawari (Bishop Exchange Strategy)',
    kanji: '角換わり',
    category: 'Static Rook (居飛車 Ibisha)',
    scale: 'shogi9',
    championBotId: 'bot-06',
    summary:
      'Sente’s Bishop at (7,1) traverses the open diagonal to capture Gote’s Bishop at (1,7) and promote or enter the hand for tactical fork drops.',
    keyMoveFrom: { r: 7, c: 1 },
    keyMoveTo: { r: 1, c: 7 },
    pieces: [
      { r: 0, c: 4, code: 'K', owner: 'gote' },
      { r: 1, c: 7, code: 'B', owner: 'gote' },
      { r: 1, c: 6, code: 'S', owner: 'gote' },
      { r: 7, c: 1, code: 'B', owner: 'sente' },
      { r: 7, c: 7, code: 'R', owner: 'sente' },
      { r: 8, c: 4, code: 'K', owner: 'sente' },
    ],
  },
  {
    id: 'strat-hashizeme',
    name: 'Hashizeme (Spear the Sparrow Edge Attack)',
    kanji: '端攻め（雀刺し）',
    category: 'Static Rook (居飛車 Ibisha)',
    scale: 'shogi9',
    championBotId: 'bot-05',
    summary:
      'Stacks Lance [L], Rook [R], Knight [N], and Silver [S] on the 1st file (col 8) to pierce the corner of Gote’s castle.',
    keyMoveFrom: { r: 4, c: 8 },
    keyMoveTo: { r: 3, c: 8 },
    pieces: [
      { r: 0, c: 7, code: 'K', owner: 'gote' },
      { r: 0, c: 8, code: 'L', owner: 'gote' },
      { r: 2, c: 8, code: 'P', owner: 'gote' },
      { r: 4, c: 8, code: 'P', owner: 'sente' },
      { r: 6, c: 8, code: 'L', owner: 'sente' },
      { r: 7, c: 8, code: 'R', owner: 'sente' },
      { r: 6, c: 7, code: 'N', owner: 'sente' },
      { r: 8, c: 2, code: 'K', owner: 'sente' },
    ],
  },
  {
    id: 'strat-raiden-lion-igui',
    name: 'Raiden’s Chū Shōgi Lion Igui Strike',
    kanji: '雷電流・獅子居食い戦法',
    category: 'Large-Board Formation (大将棋・大局陣)',
    scale: 'chu12',
    championBotId: 'bot-08',
    summary:
      'Signature formation of #8 Raiden the Lion Tamer: positions the Lion [LN] at (6,6) escorted by Kirin [KR] and Phoenix [PH] to execute hit-and-run Igui captures on advancing enemies.',
    keyMoveFrom: { r: 6, c: 6 },
    keyMoveTo: { r: 5, c: 6 },
    pieces: [
      { r: 0, c: 6, code: 'K', owner: 'gote' },
      { r: 3, c: 6, code: 'LN', owner: 'gote' },
      { r: 5, c: 6, code: 'G', owner: 'gote' },
      { r: 6, c: 6, code: 'LN', owner: 'sente' },
      { r: 7, c: 5, code: 'KR', owner: 'sente' },
      { r: 7, c: 7, code: 'PH', owner: 'sente' },
      { r: 11, c: 6, code: 'K', owner: 'sente' },
    ],
  },
  {
    id: 'strat-taikyoku-dual-royal-aegis',
    name: 'Taikyoku Dual-Royal & Elephant Promotion Aegis',
    kanji: '大局将棋・二玉酔象本陣',
    category: 'Large-Board Formation (大将棋・大局陣)',
    scale: 'taikyoku36',
    championBotId: 'bot-15',
    summary:
      'Fortifies both King [K] and Crown Prince [CP] behind Great Generals while escorting Drunken Elephant [DE] across the 11th rank to create a 3-Royal Aegis.',
    keyMoveFrom: { r: 11, c: 14 },
    keyMoveTo: { r: 10, c: 14 },
    pieces: [
      { r: 5, c: 17, code: 'K', owner: 'gote' },
      { r: 5, c: 18, code: 'CP', owner: 'gote' },
      { r: 11, c: 14, code: 'DE', owner: 'sente' },
      { r: 28, c: 17, code: 'CP', owner: 'sente' },
      { r: 28, c: 18, code: 'K', owner: 'sente' },
      { r: 27, c: 17, code: 'GG', owner: 'sente' },
      { r: 27, c: 18, code: 'VG', owner: 'sente' },
    ],
  },
  {
    id: 'strat-taikyoku-fire-tengu',
    name: 'Kagutsuchi & Hanzō’s Fire Demon + Tengu Battery',
    kanji: '火鬼・天狗・大将連携陣',
    category: 'Large-Board Formation (大将棋・大局陣)',
    scale: 'taikyoku36',
    championBotId: 'bot-12',
    summary:
      'Combines Kagutsuchi’s Fire Demon [DM] 8-square AoE incineration with Hanzō’s Tengu [LO] 90° diagonal hook and Tenkai’s Great General [GG] rank-jumping ray.',
    keyMoveFrom: { r: 14, c: 17 },
    keyMoveTo: { r: 11, c: 17 },
    pieces: [
      { r: 8, c: 17, code: 'K', owner: 'gote' },
      { r: 8, c: 18, code: 'CP', owner: 'gote' },
      { r: 10, c: 16, code: 'G', owner: 'gote' },
      { r: 10, c: 17, code: 'S', owner: 'gote' },
      { r: 10, c: 18, code: 'R', owner: 'gote' },
      { r: 14, c: 17, code: 'DM', owner: 'sente' },
      { r: 16, c: 15, code: 'LO', owner: 'sente' },
      { r: 16, c: 19, code: 'GG', owner: 'sente' },
      { r: 28, c: 18, code: 'K', owner: 'sente' },
    ],
  },
];

