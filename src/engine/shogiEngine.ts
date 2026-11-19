import { DIRS_8, DirKey, PIECE_DB } from './pieceRegistry';

export type BoardScaleId = 'dobutsu' | 'shogi9' | 'chu12' | 'war12' | 'taikyoku36';
export type PlayerSide = 'sente' | 'gote';

export interface BoardPiece {
  code: string;
  owner: PlayerSide;
  promoted: boolean;
  baseCode: string;
  stars?: number;
  tier?: number;
  parachuted?: boolean;
  citadelGuard?: boolean;
}

export interface LegalMove {
  r: number;
  c: number;
  kind: 'step' | 'range' | 'slide' | 'jump' | 'hook' | 'capture' | 'lion2' | 'igui' | 'drop';
  via?: { r: number; c: number } | null;
  canPromote?: boolean;
  mustPromote?: boolean;
  allowsSecondStep?: boolean;
}

export interface BlockedSquare {
  r: number;
  c: number;
  reason: 'friendly' | 'obstructed' | 'range_limit' | 'self_check' | 'uchifuzume' | 'nifu' | 'lion_trade';
}

export interface BlindSquare {
  r: number;
  c: number;
  dir: DirKey;
}

export interface ScaleConfig {
  id: BoardScaleId;
  name: string;
  japaneseName: string;
  cols: number;
  rows: number;
  promoRanks: number;
  allowDrops: boolean;
  enforceStrictCheck: boolean;
  tryRule: boolean;
  description: string;
}

export const SCALE_CONFIGS: Record<BoardScaleId, ScaleConfig> = {
  dobutsu: {
    id: 'dobutsu',
    name: 'Dōbutsu Shōgi (3×4)',
    japaneseName: 'どうぶつしょうぎ',
    cols: 3,
    rows: 4,
    promoRanks: 1,
    allowDrops: true,
    enforceStrictCheck: true,
    tryRule: true,
    description: '3×4 Forest Shōgi with Chick→Hen promotion, hand drops, check validation, and Try Rule (トライ).',
  },
  shogi9: {
    id: 'shogi9',
    name: 'Standard Shōgi (9×9)',
    japaneseName: '本将棋 (9×9)',
    cols: 9,
    rows: 9,
    promoRanks: 3,
    allowDrops: true,
    enforceStrictCheck: true,
    tryRule: false,
    description: 'Official 9×9 Shōgi with hand drops, Nifu, Uchifuzume (no drop-pawn mate), self-check prevention, and Sennichite.',
  },
  chu12: {
    id: 'chu12',
    name: 'Chū Shōgi (12×12)',
    japaneseName: '中将棋 (12×12)',
    cols: 12,
    rows: 12,
    promoRanks: 4,
    allowDrops: false,
    enforceStrictCheck: false,
    tryRule: false,
    description: '92-piece 12×12 Chū Shōgi with sequential 2-click Lion Igui / double-captures and Senjō Lion-trade protection.',
  },
  war12: {
    id: 'war12',
    name: 'War-Budget (12×12)',
    japaneseName: '軍資金大局 (12×12)',
    cols: 12,
    rows: 12,
    promoRanks: 4,
    allowDrops: true,
    enforceStrictCheck: false,
    tryRule: true,
    description: 'Modern 12×12 Taikyoku variant: Fixed King+Prince Citadel, 3,500-Koku 208-piece draft, 4-Tier XP/Capture Evolution up to King, Once-Per-Piece Parachute Drops, and Dual-Royal / King Try victory.',
  },
  taikyoku36: {
    id: 'taikyoku36',
    name: 'Grand Taikyoku (36×36)',
    japaneseName: '大局将棋 (36×36)',
    cols: 36,
    rows: 36,
    promoRanks: 11,
    allowDrops: false,
    enforceStrictCheck: false,
    tryRule: false,
    description: 'Historical 36×36 board with 804 stones, 208 starting types, 5s Auto-Commander, 48-Hour Match Clock, Fire Demon burn, and Dual Royals.',
  },
};

// Exact 36x36 Taikyoku Shogi Rows (from Rank 9 down to Back Rank 0)
export const TAIKYOKU_36_ROWS: Record<string, string[]> = {
  row9: "LC MK VM OX LB VP VH BN DH DK SE HF EL SP VL TG SC LD DG SC TG VL SP EL HF SE DK DH BN VH VP LB OX VM MK RC".split(" "),
  row8: "CH SL VR WN RE M SD HS GN OS EA BS SG LP T BE I GM GE I BE T LP SG BS EA OS GN HS SD M RE WN VR SL CH".split(" "),
  row7: "EC BL EB HO OW CM CS SW BM BT OC SF BB OR SQ SN RD LI FE RD SN SQ OR BB SF OC BT BM SW CS CM OW HO EB VI EC".split(" "),
  row6: "TC VW SX DO FH VB AB EW WI CK OM CC WS ES VS NT TF PE MT TF NT VS SU NB CC OM CK WI EW AB VB FH DO SX VW TC".split(" "),
  row5: "WC WH DL SM PR WB FL EG FD PS FY ST BI WG F KR CA GT LL HM PH F WG BI ST FY PS FD EG FL WB PR SM DR WH WC".split(" "),
  row4: "CI CE B R WF FC MF VT SO LS CL CR RH HE VO GD GO DV DS GO GD VO HE RH CR CL LS SO VT MF FC WF R B CE CI".split(" "),
  row3: "SV VE N PI CG PG H O CN SA SR GL LN CT GS VD WL GG VG WL VD GS CT LN GL SR SA CN O H PG CG PI N VE SV".split(" "),
  row2: "GC SI RN RW BG RO LT LE BO WD FP RB OK PC WA FI C KM PM C FI WA PC OK RB FP WD BO RI TT RO BG RW RN SI GC".split(" "),
  row1: "RV WE TD FS CO RA FO MS RP RU SS GR RT BA BD WR S NK DE S GU YA BA RT GR SS RU RP MS FO RA CO FS TD FG RV".split(" "),
  row0: "L TS RR W DM ML LO BC HR FR ED CD FT Q RS LG G K CP G RG RS Q FT WO ED FR HR BC LO MR DM W RR WT L".split(" "),
};

// Authentic 92-piece 12x12 Chu Shogi Rows (Rank 0 = back rank, Rank 3 = pawns, Rank 4 = Go-Betweens)
export const CHU_12_ROWS = {
  row0: ["L", "FL", "C", "S", "G", "DE", "K", "G", "S", "C", "FL", "L"],
  row1: ["RV", null, "B", null, "BT", "PH", "KR", "BT", null, "B", null, "RV"],
  row2: ["SM", "VM", "R", "DH", "DK", "Q", "LN", "DK", "DH", "R", "VM", "SM"],
  row3: ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
};

export function makePiece(
  code: string,
  owner: PlayerSide,
  promoted = false,
  baseCode?: string,
  extra?: { stars?: number; tier?: number; parachuted?: boolean; citadelGuard?: boolean }
): BoardPiece {
  const clean = code.trim();
  return {
    code: clean,
    owner,
    promoted,
    baseCode: baseCode || clean,
    stars: extra?.stars ?? 0,
    tier: extra?.tier ?? 1,
    parachuted: extra?.parachuted ?? false,
    citadelGuard: extra?.citadelGuard ?? false,
  };
}

export function createInitialBoard(scale: BoardScaleId): (BoardPiece | null)[][] {
  const cfg = SCALE_CONFIGS[scale];
  const { rows, cols } = cfg;
  const board: (BoardPiece | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  const placeSymmetric = (rankFromBack: number, col: number, code: string | null) => {
    if (!code) return;
    const senteRow = rows - 1 - rankFromBack;
    const goteRow = rankFromBack;
    const goteCol = cols - 1 - col;
    board[senteRow][col] = makePiece(code, 'sente');
    board[goteRow][goteCol] = makePiece(code, 'gote');
  };

  if (scale === 'dobutsu') {
    // 3x4 Dobutsu Shogi: Gote top (row 0: R, K, B; row 1: _, P, _), Sente bottom (row 3: B, K, R; row 2: _, P, _)
    board[0][0] = makePiece('R', 'gote');
    board[0][1] = makePiece('K', 'gote');
    board[0][2] = makePiece('B', 'gote');
    board[1][1] = makePiece('P', 'gote');

    board[3][0] = makePiece('B', 'sente');
    board[3][1] = makePiece('K', 'sente');
    board[3][2] = makePiece('R', 'sente');
    board[2][1] = makePiece('P', 'sente');
    return board;
  }

  if (scale === 'shogi9') {
    const backRank = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
    for (let c = 0; c < 9; c++) {
      placeSymmetric(0, c, backRank[c]);
      placeSymmetric(2, c, 'P');
    }
    // Sente has B at col 1, R at col 7 (row 7); Gote has R at col 1, B at col 7 (row 1)
    board[7][1] = makePiece('B', 'sente');
    board[7][7] = makePiece('R', 'sente');
    board[1][7] = makePiece('B', 'gote');
    board[1][1] = makePiece('R', 'gote');
    return board;
  }

  if (scale === 'chu12') {
    for (let c = 0; c < 12; c++) {
      placeSymmetric(0, c, CHU_12_ROWS.row0[c]);
      placeSymmetric(1, c, CHU_12_ROWS.row1[c]);
      placeSymmetric(2, c, CHU_12_ROWS.row2[c]);
      placeSymmetric(3, c, CHU_12_ROWS.row3[c]);
    }
    placeSymmetric(4, 3, 'GB');
    placeSymmetric(4, 8, 'GB');
    return board;
  }

  if (scale === 'war12') {
    return createWarBudgetCitadelBoard('balanced');
  }

  // Grand Taikyoku 36x36
  for (let c = 0; c < 36; c++) {
    placeSymmetric(0, c, TAIKYOKU_36_ROWS.row0[c]);
    placeSymmetric(1, c, TAIKYOKU_36_ROWS.row1[c]);
    placeSymmetric(2, c, TAIKYOKU_36_ROWS.row2[c]);
    placeSymmetric(3, c, TAIKYOKU_36_ROWS.row3[c]);
    placeSymmetric(4, c, TAIKYOKU_36_ROWS.row4[c]);
    placeSymmetric(5, c, TAIKYOKU_36_ROWS.row5[c]);
    placeSymmetric(6, c, TAIKYOKU_36_ROWS.row6[c]);
    placeSymmetric(7, c, TAIKYOKU_36_ROWS.row7[c]);
    placeSymmetric(8, c, TAIKYOKU_36_ROWS.row8[c]);
    placeSymmetric(9, c, TAIKYOKU_36_ROWS.row9[c]);
    placeSymmetric(10, c, 'P');
  }
  const vanguard: [number, string][] = [
    [4, 'D'], [9, 'GB'], [13, 'D'], [22, 'D'], [26, 'GB'], [31, 'D'],
  ];
  vanguard.forEach(([col, code]) => placeSymmetric(11, col, code));
  return board;
}

export function inBounds(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

export function orientVector(dr: number, dc: number, owner: PlayerSide): [number, number] {
  return owner === 'sente' ? [dr, dc] : [-dr, -dc];
}

export function getScalePromotesTo(code: string, scale: BoardScaleId): string | null {
  if (scale === 'dobutsu') {
    return code === 'P' ? 'HEN' : null;
  }
  if (scale === 'shogi9') {
    const map9: Record<string, string | null> = {
      P: 'TH',
      L: 'PL',
      N: 'PN',
      S: 'PSv',
      R: 'DK',
      B: 'DH',
      G: null,
      K: null,
    };
    return map9[code] ?? null;
  }
  const spec = PIECE_DB[code];
  return spec ? spec.promotesTo : null;
}

export function isInPromotionZone(row: number, owner: PlayerSide, scale: BoardScaleId): boolean {
  const cfg = SCALE_CONFIGS[scale];
  return owner === 'sente' ? row < cfg.promoRanks : row >= cfg.rows - cfg.promoRanks;
}

/**
 * Returns the historical Rank-Jump Hierarchy Tier for Taikyoku Shōgi:
 * - Tier 5: Royal Commanders (K, CP) -> Cannot be jumped over by ANY piece!
 * - Tier 4: Supreme Generals (GG Great General, TK Teaching King) -> Can jump over Tiers 1..3
 * - Tier 3: Vice Generals & Masters (VG Vice General, GM Great Master, PE Peng Master, BSpi) -> Can jump over Tiers 1..2
 * - Tier 2: Major Jumping Generals (RO Flying General, BG Angle General, FCr, FE, DM, LN, LD) -> Can jump over Tier 1
 * - Tier 1: All other pieces
 */
export function getPieceRankJumpTier(code: string): number {
  if (code === 'K' || code === 'CP' || PIECE_DB[code]?.isRoyal) return 5;
  if (code === 'GG' || code === 'TK') return 4;
  if (code === 'VG' || code === 'GM' || code === 'PE' || code === 'BSpi') return 3;
  if (code === 'RO' || code === 'BG' || code === 'FCr' || code === 'FE' || code === 'DM' || code === 'LN' || code === 'LD') return 2;
  return 1;
}

export function isMandatoryPromotion(code: string, toRow: number, owner: PlayerSide, scale: BoardScaleId): boolean {
  const cfg = SCALE_CONFIGS[scale];
  const isLastRank = owner === 'sente' ? toRow === 0 : toRow === cfg.rows - 1;
  const isLast2Ranks = owner === 'sente' ? toRow <= 1 : toRow >= cfg.rows - 2;

  if (scale === 'dobutsu') {
    return code === 'P' && isLastRank;
  }
  if (scale === 'shogi9') {
    if (code === 'P' || code === 'L') return isLastRank;
    if (code === 'N') return isLast2Ranks;
    return false;
  }
  // Chu 12x12 and Grand Taikyoku 36x36 dead-rank mandatory promotions
  if (code === 'P' || code === 'L' || code === 'OC' || code === 'D' || code === 'I' || code === 'SG' || code === 'EW') {
    return isLastRank;
  }
  if (code === 'N') {
    return isLast2Ranks;
  }
  return false;
}

/**
 * Pseudo-legal move generator for a piece at (r, c).
 * Enforces historical 36x36 Rank-Jumping hierarchy, Chu/Taikyoku promotion rules, and 2-step Lion/Eagle/Hook moves.
 */
export function analyzePieceMovesOnBoard(
  board: (BoardPiece | null)[][],
  r: number,
  c: number,
  options?: {
    isSecondStep?: boolean;
    originSquare?: { r: number; c: number } | null;
    scale?: BoardScaleId;
    lionTradeBan?: { bannedOwner: PlayerSide; targetLionPos?: { r: number; c: number } } | null;
  }
): {
  moves: LegalMove[];
  blockedSquares: BlockedSquare[];
  blindSquares: BlindSquare[];
} {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const piece = board[r]?.[c];
  if (!piece) return { moves: [], blockedSquares: [], blindSquares: [] };

  const spec = PIECE_DB[piece.code];
  if (!spec) return { moves: [], blockedSquares: [], blindSquares: [] };

  const owner = piece.owner;
  const scale = options?.scale || (rows === 36 ? 'taikyoku36' : rows === 12 ? 'chu12' : rows === 9 ? 'shogi9' : 'dobutsu');
  const moves: LegalMove[] = [];
  const blockedSquares: BlockedSquare[] = [];
  const blindSquares: BlindSquare[] = [];
  const seen = new Set<string>();
  const myJumpTier = getPieceRankJumpTier(piece.code);

  const decoratePromotion = (mv: LegalMove): LegalMove => {
    const promoTarget = getScalePromotesTo(piece.code, scale);
    const wasInZone = isInPromotionZone(r, owner, scale);
    const nowInZone = isInPromotionZone(mv.r, owner, scale);

    if (!piece.promoted && promoTarget) {
      // In Chu 12x12 & Taikyoku 36x36: promote upon entering zone, OR upon capturing inside/from the zone, OR on mandatory dead rank
      const eligibleInLargeShogi =
        (!wasInZone && nowInZone) ||
        ((wasInZone || nowInZone) && mv.kind === 'capture') ||
        isMandatoryPromotion(piece.code, mv.r, owner, scale);

      const eligible = scale === 'chu12' || scale === 'taikyoku36' ? eligibleInLargeShogi : wasInZone || nowInZone;
      if (eligible) {
        mv.canPromote = true;
        mv.mustPromote = isMandatoryPromotion(piece.code, mv.r, owner, scale);
      }
    }
    return mv;
  };

  const addMove = (
    tr: number,
    tc: number,
    kind: LegalMove['kind'] = 'step',
    via: { r: number; c: number } | null = null,
    allowsSecondStep = false
  ) => {
    if (!inBounds(tr, tc, rows, cols)) return;
    const occ = board[tr][tc];

    if (kind === 'igui') {
      const k = `${tr},${tc}`;
      if (!seen.has(k)) {
        seen.add(k);
        moves.push({ r: tr, c: tc, kind: 'igui', via });
      }
      return;
    }

    if (occ && occ.owner === owner) {
      blockedSquares.push({ r: tr, c: tc, reason: 'friendly' });
      return;
    }

    if (
      scale === 'chu12' &&
      options?.lionTradeBan &&
      options.lionTradeBan.bannedOwner === owner &&
      occ &&
      occ.code === 'LN' &&
      piece.code !== 'LN'
    ) {
      blockedSquares.push({ r: tr, c: tc, reason: 'lion_trade' });
      return;
    }

    const k = `${tr},${tc}`;
    if (seen.has(k)) return;
    seen.add(k);

    moves.push(
      decoratePromotion({
        r: tr,
        c: tc,
        kind: occ ? 'capture' : kind,
        via,
        allowsSecondStep,
      })
    );
  };

  // Second step of a Lion / Eagle / Crocodile / Tetrarch
  if (options?.isSecondStep) {
    if (spec.special === 'lion') {
      const allowedSecondDirs: DirKey[] =
        piece.code === 'HF'
          ? ['N', 'S']
          : piece.code === 'EL'
          ? ['NW', 'NE', 'SW', 'SE']
          : (Object.keys(DIRS_8) as DirKey[]);

      allowedSecondDirs.forEach(dirKey => {
        const [rawDr, rawDc] = DIRS_8[dirKey];
        const [dr, dc] = orientVector(rawDr, rawDc, owner);
        const tr = r + dr;
        const tc = c + dc;
        if (options.originSquare && tr === options.originSquare.r && tc === options.originSquare.c) {
          addMove(tr, tc, 'igui');
        } else {
          addMove(tr, tc, 'lion2');
        }
      });
      if (options.originSquare) {
        const dist = Math.max(Math.abs(options.originSquare.r - r), Math.abs(options.originSquare.c - c));
        if (dist === 1) {
          addMove(options.originSquare.r, options.originSquare.c, 'igui');
        }
      }
    }
    return { moves, blockedSquares, blindSquares };
  }

  // First / Standard Step: Check all 8 compass directions
  (Object.keys(spec.dirs) as DirKey[]).forEach(dirKey => {
    const info = spec.dirs[dirKey];
    const [rawDr, rawDc] = DIRS_8[dirKey];
    const [dr, dc] = orientVector(rawDr, rawDc, owner);

    if (info.type === 'none') {
      for (let d = 1; d <= 2; d++) {
        const br = r + dr * d;
        const bc = c + dc * d;
        if (inBounds(br, bc, rows, cols)) {
          blindSquares.push({ r: br, c: bc, dir: dirKey });
        }
      }
      return;
    }

    const isLionStepDir =
      spec.special === 'lion' &&
      (piece.code === 'LN' ||
        piece.code === 'LD' ||
        piece.code === 'FE' ||
        piece.code === 'LI' ||
        piece.code === 'BSpi' ||
        piece.code === 'FCr' ||
        piece.code === 'HT' ||
        (piece.code === 'HF' && dirKey === 'N') ||
        (piece.code === 'EL' && (dirKey === 'NW' || dirKey === 'NE')));

    if (info.type === 'step') {
      addMove(r + dr, c + dc, 'step', null, isLionStepDir);
      if (inBounds(r + dr * 2, c + dc * 2, rows, cols) && !isLionStepDir) {
        blockedSquares.push({ r: r + dr * 2, c: c + dc * 2, reason: 'range_limit' });
      }
    } else if (info.type === 'jump') {
      addMove(r + dr * 2, c + dc * 2, 'jump');
    } else if (info.type === 'range' || info.type === 'slide' || info.type === 'hook') {
      const maxSteps = info.type === 'range' ? info.max : Math.max(rows, cols);
      let cr = r + dr;
      let cc = c + dc;
      let stepCount = 0;
      let isBlocked = false;

      while (inBounds(cr, cc, rows, cols) && stepCount < maxSteps) {
        stepCount++;
        if (isBlocked) {
          blockedSquares.push({ r: cr, c: cc, reason: 'obstructed' });
          cr += dr;
          cc += dc;
          continue;
        }

        const occ = board[cr][cc];
        const stepAllowsSecond = isLionStepDir && stepCount === 1;
        if (!occ) {
          addMove(cr, cc, info.type === 'hook' ? 'hook' : info.type, null, stepAllowsSecond);
          if (info.type === 'hook' && stepCount <= 8) {
            const perpDirs: [number, number][] =
              rawDr !== 0 && rawDc !== 0
                ? [
                    [-rawDr, rawDc],
                    [rawDr, -rawDc],
                  ]
                : [
                    [rawDc, rawDr],
                    [-rawDc, -rawDr],
                  ];
            perpDirs.forEach(([pdr, pdc]) => {
              const [odr2, odc2] = orientVector(pdr, pdc, owner);
              let hr = cr + odr2;
              let hc = cc + odc2;
              let hSteps = 0;
              while (inBounds(hr, hc, rows, cols) && hSteps < 8) {
                hSteps++;
                const hOcc = board[hr][hc];
                if (!hOcc) {
                  addMove(hr, hc, 'hook', { r: cr, c: cc });
                } else {
                  if (hOcc.owner !== owner) addMove(hr, hc, 'hook', { r: cr, c: cc });
                  break;
                }
                hr += odr2;
                hc += odc2;
              }
            });
          }
        } else {
          if (occ.owner !== owner) {
            addMove(cr, cc, 'capture', null, stepAllowsSecond);
          } else {
            blockedSquares.push({ r: cr, c: tcIfValid(cc), reason: 'friendly' });
          }

          // Historical Rank-Jumping Check:
          // A range_jump piece (GG, TK, VG, GM, PE, BG) can ONLY jump over pieces of strictly lower Rank-Jump Tier,
          // and can NEVER jump over a Royal (K or CP)!
          if (spec.special === 'range_jump') {
            const blockerTier = getPieceRankJumpTier(occ.code);
            if (blockerTier >= myJumpTier || PIECE_DB[occ.code]?.isRoyal) {
              isBlocked = true;
            }
          } else {
            isBlocked = true;
          }
        }
        cr += dr;
        cc += dc;
      }

      if (info.type === 'range' && inBounds(cr, cc, rows, cols)) {
        blockedSquares.push({ r: cr, c: cc, reason: 'range_limit' });
      }
    }
  });

  if (spec.extraJumps && spec.extraJumps.length > 0) {
    spec.extraJumps.forEach(([rawDr, rawDc]) => {
      const [dr, dc] = orientVector(rawDr, rawDc, owner);
      addMove(r + dr, c + dc, 'jump');
    });
  }

  return { moves, blockedSquares, blindSquares };
}

function tcIfValid(c: number): number {
  return c;
}

export function cloneBoard(board: (BoardPiece | null)[][]): (BoardPiece | null)[][] {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}


/**
 * Checks whether `side`'s Royal Commander(s) (K or CP) are in critical Check (Ōte).
 * In single-royal variants (3×4, 9×9) or when down to 1 Royal in 12×12 / 36×36,
 * returns true if that Royal is threatened.
 * When a player has 2+ Royals alive (e.g., K + CP in 36×36), losing one Royal does not
 * lose the game, so critical Check only triggers if ALL surviving Royals are simultaneously
 * threatened (or when down to the Final Royal and it is threatened).
 */
export function isKingInCheck(board: (BoardPiece | null)[][], side: PlayerSide, scale: BoardScaleId): boolean {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const royalPositions: { r: number; c: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (p && p.owner === side && PIECE_DB[p.code]?.isRoyal) {
        royalPositions.push({ r, c });
      }
    }
  }
  if (royalPositions.length === 0) return true;

  const enemy: PlayerSide = side === 'sente' ? 'gote' : 'sente';
  const threatenedRoyals = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (p && p.owner === enemy) {
        const { moves } = analyzePieceMovesOnBoard(board, r, c, { scale });
        for (const m of moves) {
          for (const rp of royalPositions) {
            if (rp.r === m.r && rp.c === m.c) {
              threatenedRoyals.add(`${rp.r},${rp.c}`);
            }
            // In 36x36, an enemy Fire Demon (DM) moving adjacent to a Royal also burns that Royal!
            if (p.code === 'DM' && Math.abs(rp.r - m.r) <= 1 && Math.abs(rp.c - m.c) <= 1) {
              threatenedRoyals.add(`${rp.r},${rp.c}`);
            }
          }
        }
      }
    }
  }

  // Every surviving Royal must be threatened for the player to face immediate elimination next turn
  return threatenedRoyals.size >= royalPositions.length;
}

/**
 * Returns strictly legal moves for a piece at (r, c), filtering out moves that leave
 * the player's own King in check when `enforceStrictCheck` is enabled (Dōbutsu 3×4 and Standard 9×9).
 */
export function getStrictLegalMovesForSquare(
  board: (BoardPiece | null)[][],
  r: number,
  c: number,
  scale: BoardScaleId,
  options?: {
    isSecondStep?: boolean;
    originSquare?: { r: number; c: number } | null;
    lionTradeBan?: { bannedOwner: PlayerSide; targetLionPos?: { r: number; c: number } } | null;
  }
): {
  moves: LegalMove[];
  blockedSquares: BlockedSquare[];
  blindSquares: BlindSquare[];
} {
  const piece = board[r]?.[c];
  if (!piece) return { moves: [], blockedSquares: [], blindSquares: [] };

  const raw = analyzePieceMovesOnBoard(board, r, c, { ...options, scale });
  const cfg = SCALE_CONFIGS[scale];
  if (!cfg.enforceStrictCheck) {
    return raw;
  }

  const validMoves: LegalMove[] = [];
  for (const m of raw.moves) {
    const nextBoard = cloneBoard(board);
    const movingCopy = { ...piece };
    if (m.mustPromote) {
      const promo = getScalePromotesTo(movingCopy.code, scale);
      if (promo) {
        movingCopy.code = promo;
        movingCopy.promoted = true;
      }
    }
    nextBoard[m.r][m.c] = movingCopy;
    if (m.kind !== 'igui') {
      nextBoard[r][c] = null;
    }
    if (!isKingInCheck(nextBoard, piece.owner, scale)) {
      validMoves.push(m);
    } else {
      raw.blockedSquares.push({ r: m.r, c: m.c, reason: 'self_check' });
    }
  }

  return {
    moves: validMoves,
    blockedSquares: raw.blockedSquares,
    blindSquares: raw.blindSquares,
  };
}

/**
 * Computes legal drop squares for a captured piece `code` in `owner`'s hand (for 3×4 Dōbutsu & 9×9 Standard Shōgi).
 * Enforces:
 * - Empty square requirement
 * - Mandatory last-rank dead-zone ban (e.g., cannot drop P, L on last rank or N on last 2 ranks in 9×9)
 * - Nifu (二歩: cannot drop unpromoted P on a file that already has an unpromoted friendly P in 9×9)
 * - Self-check prevention (if King is in check, drop must block/resolve the check)
 * - Uchifuzume (打ち歩詰め: cannot drop a Pawn P in 9×9 to deliver immediate checkmate!)
 */
export function getLegalDropsForHandPiece(
  board: (BoardPiece | null)[][],
  owner: PlayerSide,
  code: string,
  scale: BoardScaleId,
  hands?: { sente: string[]; gote: string[] }
): {
  drops: LegalMove[];
  illegalReasons: BlockedSquare[];
} {
  const cfg = SCALE_CONFIGS[scale];
  if (!cfg.allowDrops) return { drops: [], illegalReasons: [] };

  const rows = cfg.rows;
  const cols = cfg.cols;
  const drops: LegalMove[] = [];
  const illegalReasons: BlockedSquare[] = [];

  // Check Nifu files for Pawn drops in 9x9
  const nifuCols = new Set<number>();
  if (scale === 'shogi9' && code === 'P') {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const p = board[r][c];
        if (p && p.owner === owner && p.code === 'P' && !p.promoted) {
          nifuCols.add(c);
          break;
        }
      }
    }
  }

  const enemy: PlayerSide = owner === 'sente' ? 'gote' : 'sente';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c]) continue;

      // War-Budget 12x12 Once-Per-Piece Parachute Rule:
      // Can only parachute a captured piece onto your OWN half of the 12x12 board (rows 6..11 for Sente, rows 0..5 for Gote)!
      if (scale === 'war12') {
        const isOwnHalf = owner === 'sente' ? r >= 6 : r <= 5;
        if (!isOwnHalf) {
          illegalReasons.push({ r, c, reason: 'range_limit' });
          continue;
        }
      }

      // Dead-rank drop check in 9x9
      if (scale === 'shogi9' && isMandatoryPromotion(code, r, owner, scale)) {
        illegalReasons.push({ r, c, reason: 'range_limit' });
        continue;
      }

      // Nifu check
      if (nifuCols.has(c)) {
        illegalReasons.push({ r, c, reason: 'nifu' });
        continue;
      }

      // Simulate drop
      const nextBoard = cloneBoard(board);
      nextBoard[r][c] = makePiece(code, owner, false, code);

      // Must not leave own King in check
      if (cfg.enforceStrictCheck && isKingInCheck(nextBoard, owner, scale)) {
        illegalReasons.push({ r, c, reason: 'self_check' });
        continue;
      }

      // Uchifuzume (打ち歩詰め) check in 9x9 Shogi:
      // Dropping a Pawn (P) that puts the enemy King in checkmate (0 legal responses) is illegal!
      if (scale === 'shogi9' && code === 'P') {
        if (isKingInCheck(nextBoard, enemy, scale)) {
          const enemyHasEscape = hasAnyLegalAction(nextBoard, enemy, scale, hands ? {
            sente: [...hands.sente],
            gote: [...hands.gote],
          } : undefined, true);
          if (!enemyHasEscape) {
            illegalReasons.push({ r, c, reason: 'uchifuzume' });
            continue;
          }
        }
      }

      drops.push({ r, c, kind: 'drop' });
    }
  }

  return { drops, illegalReasons };
}

/**
 * Checks if `side` has at least one legal board move or legal drop.
 * Used for Checkmate (Tsumi) and Uchifuzume detection.
 */
export function hasAnyLegalAction(
  board: (BoardPiece | null)[][],
  side: PlayerSide,
  scale: BoardScaleId,
  hands?: { sente: string[]; gote: string[] },
  skipUchifuzumeRecursion = false
): boolean {
  const rows = board.length;
  const cols = board[0]?.length || rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (p && p.owner === side) {
        const { moves } = getStrictLegalMovesForSquare(board, r, c, scale);
        if (moves.length > 0) return true;
      }
    }
  }

  if (SCALE_CONFIGS[scale].allowDrops && hands && !skipUchifuzumeRecursion) {
    const myHand = Array.from(new Set(hands[side]));
    for (const code of myHand) {
      const { drops } = getLegalDropsForHandPiece(board, side, code, scale);
      if (drops.length > 0) return true;
    }
  }

  return false;
}

/**
 * Computes a compact position hash for Sennichite (4-fold repetition) detection.
 */
export function computePositionHash(
  board: (BoardPiece | null)[][],
  turn: PlayerSide,
  hands: { sente: string[]; gote: string[] }
): string {
  const rows = board
    .map(r => r.map(p => (p ? `${p.owner === 'sente' ? 'S' : 'G'}${p.code}${p.promoted ? '+' : ''}` : '.')).join(','))
    .join('/');
  const sHand = [...hands.sente].sort().join('');
  const gHand = [...hands.gote].sort().join('');
  return `${turn}|${sHand}|${gHand}|${rows}`;
}

export interface ThreatSource {
  r: number;
  c: number;
  code: string;
  owner: PlayerSide;
}

export interface SquareThreatInfo {
  senteAttackers: ThreatSource[];
  goteAttackers: ThreatSource[];
}

/**
 * Computes a complete threat map across the board so we know:
 * 1) Which pieces are currently in reach of being captured by an opponent piece (drawn with a red circle).
 * 2) When you select any piece, which specific opponent pieces can take it, and which pieces it can take.
 * 3) Which empty squares are guarded by the opponent.
 */
export function computeBoardThreatMap(
  board: (BoardPiece | null)[][],
  scale: BoardScaleId,
  lionTradeBan?: { bannedOwner: PlayerSide } | null
): SquareThreatInfo[][] {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const map: SquareThreatInfo[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      senteAttackers: [],
      goteAttackers: [],
    }))
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p) continue;

      const { moves } =
        scale === 'dobutsu' || scale === 'shogi9'
          ? getStrictLegalMovesForSquare(board, r, c, scale, { lionTradeBan })
          : analyzePieceMovesOnBoard(board, r, c, { scale, lionTradeBan });

      const src: ThreatSource = { r, c, code: p.code, owner: p.owner };
      for (const m of moves) {
        if (!inBounds(m.r, m.c, rows, cols)) continue;
        const list = p.owner === 'sente' ? map[m.r][m.c].senteAttackers : map[m.r][m.c].goteAttackers;
        if (!list.some(item => item.r === r && item.c === c)) {
          list.push(src);
        }
      }
    }
  }

  return map;
}

export interface BurnedPieceEvent {
  r: number;
  c: number;
  code: string;
  owner: PlayerSide;
  reason: 'active_burn' | 'suicide_burn';
}

/**
 * Historical Taikyoku Shōgi Fire Demon (DM / 火鬼) Dual Burn Mechanics:
 * 1) Active AoE Burn: When a Fire Demon (DM) finishes its move at (toR, toC), all enemy pieces
 *    on the 8 surrounding squares (king-adjacent) are immediately burned and removed from the board.
 * 2) Passive Suicide-Burn Trap: When any piece goes to (toR, toC) and finishes its move adjacent
 *    to a surviving enemy Fire Demon (DM), the moving piece is immediately burned and removed!
 *    (Exception: if a Fire Demon moves adjacent to an enemy Fire Demon, its active burn destroys
 *    the enemy Fire Demon first).
 */
export function applyFireDemonEffects(
  board: (BoardPiece | null)[][],
  toR: number,
  toC: number,
  movingOwner: PlayerSide
): {
  burned: BurnedPieceEvent[];
  selfBurned: boolean;
} {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const burned: BurnedPieceEvent[] = [];
  const arrivedPiece = board[toR]?.[toC];
  if (!arrivedPiece) return { burned, selfBurned: false };

  // 1. Active AoE Burn if the moving piece is a Fire Demon (DM)
  if (arrivedPiece.code === 'DM') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = toR + dr;
        const nc = toC + dc;
        if (!inBounds(nr, nc, rows, cols)) continue;
        const adj = board[nr][nc];
        if (adj && adj.owner !== movingOwner) {
          burned.push({
            r: nr,
            c: nc,
            code: adj.code,
            owner: adj.owner,
            reason: 'active_burn',
          });
          board[nr][nc] = null;
        }
      }
    }
    return { burned, selfBurned: false };
  }

  // 2. Passive Suicide-Burn Trap if a non-DM piece finishes its move adjacent to a surviving enemy Fire Demon (DM)
  let adjacentEnemyFireDemon = false;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = toR + dr;
      const nc = toC + dc;
      if (!inBounds(nr, nc, rows, cols)) continue;
      const adj = board[nr][nc];
      if (adj && adj.owner !== movingOwner && adj.code === 'DM') {
        adjacentEnemyFireDemon = true;
        break;
      }
    }
    if (adjacentEnemyFireDemon) break;
  }

  if (adjacentEnemyFireDemon) {
    burned.push({
      r: toR,
      c: toC,
      code: arrivedPiece.code,
      owner: arrivedPiece.owner,
      reason: 'suicide_burn',
    });
    board[toR][toC] = null;
    return { burned, selfBurned: true };
  }

  return { burned, selfBurned: false };
}

export interface RoyalUnitInfo {
  r: number;
  c: number;
  code: string;
  name: string;
  threatened: boolean;
}

export interface SideRoyalStatus {
  royals: RoyalUnitInfo[];
  royalCandidates: { r: number; c: number; code: string; promotesTo: string }[];
  isFinalRoyal: boolean;
  inCriticalCheck: boolean;
  anyRoyalThreatened: boolean;
}

/**
 * Inspects surviving Royals (`K` King, `CP` Crown Prince) and unpromoted Royal heirs
 * (`DE` Drunken Elephant -> `CP`, `WE` White Elephant -> `K`) for both Sente and Gote.
 */
export function getRoyalStatus(
  board: (BoardPiece | null)[][],
  scale: BoardScaleId,
  precomputedThreatMap?: SquareThreatInfo[][]
): {
  sente: SideRoyalStatus;
  gote: SideRoyalStatus;
} {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const threatMap = precomputedThreatMap || computeBoardThreatMap(board, scale);

  const buildForSide = (side: PlayerSide): SideRoyalStatus => {
    const royals: RoyalUnitInfo[] = [];
    const royalCandidates: { r: number; c: number; code: string; promotesTo: string }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = board[r][c];
        if (!p || p.owner !== side) continue;
        const def = PIECE_DB[p.code];
        if (def?.isRoyal) {
          const attackers =
            side === 'sente' ? threatMap[r][c].goteAttackers : threatMap[r][c].senteAttackers;
          royals.push({
            r,
            c,
            code: p.code,
            name: def.name,
            threatened: attackers.length > 0,
          });
        } else if (!p.promoted) {
          const promo = getScalePromotesTo(p.code, scale);
          if (promo && PIECE_DB[promo]?.isRoyal) {
            royalCandidates.push({ r, c, code: p.code, promotesTo: promo });
          }
        }
      }
    }

    const anyRoyalThreatened = royals.some(r => r.threatened);
    const inCriticalCheck =
      royals.length === 0 || (royals.length > 0 && royals.every(r => r.threatened));

    return {
      royals,
      royalCandidates,
      isFinalRoyal: royals.length === 1,
      inCriticalCheck,
      anyRoyalThreatened,
    };
  };

  return {
    sente: buildForSide('sente'),
    gote: buildForSide('gote'),
  };
}

export interface MatchWinEvaluation {
  winner: PlayerSide | 'draw' | null;
  reason: string | null;
  winType?: 'royal_elimination' | 'checkmate' | 'try_rule' | 'sennichite' | 'impasse';
  senteRoyalsRemaining: number;
  goteRoyalsRemaining: number;
  inCheckSide: PlayerSide | null;
  statusBanner?: string;
}

/**
 * Unified Win Condition Evaluator for all 4 scales (Dōbutsu 3×4, Standard 9×9, Chū 12×12, and Grand Taikyoku 36×36).
 * Specifically enforces 36×36 Dual/Multi-Royal survival & elimination rules:
 * - In 36×36, both players start with 2 Royals (`K` King and `CP` Crown Prince) and can gain up to 2 more by
 *   promoting `DE` (Drunken Elephant -> `CP`) or `WE` (White Elephant -> `K`).
 * - Capturing or burning ONE Royal when the opponent still has another Royal (`K` or `CP`) on the board does NOT
 *   end the game; the opponent fights on with their remaining Royal(s).
 * - Victory by Royal Elimination occurs when ALL of a player's Royals are eliminated (`0` Royals remaining),
 *   or when their Final Royal is checkmated with 0 legal escapes.
 */
export function evaluateMatchWinConditions(
  board: (BoardPiece | null)[][],
  completedBy: PlayerSide,
  nextTurn: PlayerSide,
  scale: BoardScaleId,
  hands: { sente: string[]; gote: string[] },
  positionHistory?: string[]
): MatchWinEvaluation {
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const cfg = SCALE_CONFIGS[scale];

  // Count surviving Royals for both sides
  let senteRoyals = 0;
  let goteRoyals = 0;
  const senteRoyalCoords: { r: number; c: number; code: string }[] = [];
  const goteRoyalCoords: { r: number; c: number; code: string }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (PIECE_DB[p.code]?.isRoyal) {
        if (p.owner === 'sente') {
          senteRoyals++;
          senteRoyalCoords.push({ r, c, code: p.code });
        } else {
          goteRoyals++;
          goteRoyalCoords.push({ r, c, code: p.code });
        }
      }
    }
  }

  // 1. Total Royal Elimination (0 Royals left)
  if (senteRoyals === 0 && goteRoyals === 0) {
    return {
      winner: 'draw',
      reason: 'Mutual Royal Elimination (Both armies lost all Royal Commanders simultaneously).',
      winType: 'royal_elimination',
      senteRoyalsRemaining: 0,
      goteRoyalsRemaining: 0,
      inCheckSide: null,
    };
  }
  if (goteRoyals === 0) {
    return {
      winner: 'sente',
      reason:
        scale === 'taikyoku36' || scale === 'war12'
          ? 'Total Royal Elimination! Sente captured or burned all of Gote’s Royal Commanders (King & Crown Prince).'
          : 'Sente captured Gote’s Royal Commander!',
      winType: 'royal_elimination',
      senteRoyalsRemaining: senteRoyals,
      goteRoyalsRemaining: 0,
      inCheckSide: null,
    };
  }
  if (senteRoyals === 0) {
    return {
      winner: 'gote',
      reason:
        scale === 'taikyoku36' || scale === 'war12'
          ? 'Total Royal Elimination! Gote captured or burned all of Sente’s Royal Commanders (King & Crown Prince).'
          : 'Gote captured Sente’s Royal Commander!',
      winType: 'royal_elimination',
      senteRoyalsRemaining: 0,
      goteRoyalsRemaining: goteRoyals,
      inCheckSide: null,
    };
  }

  // 2. Try Rule (トライ):
  // - Dōbutsu 3×4: Lion (K) reaching the farthest rank unattacked
  // - War-Budget 12×12: King (K) reaching the opponent's back rank unattacked!
  if (cfg.tryRule) {
    const threatMap = computeBoardThreatMap(board, scale);
    for (const rc of senteRoyalCoords) {
      const pieceAtRc = board[rc.r]?.[rc.c];
      if (scale === 'war12' && pieceAtRc?.code !== 'K') continue; // In War-Budget 12x12, King (K) must reach the back rank for Try Rule
      if (rc.r === 0 && threatMap[rc.r][rc.c].goteAttackers.length === 0) {
        return {
          winner: 'sente',
          reason:
            scale === 'war12'
              ? 'Imperial Breakthrough (王将トライ)! Sente’s King [K] safely reached Gote’s back rank!'
              : 'Try Rule (トライ)! Sente’s Lion safely reached the final rank!',
          winType: 'try_rule',
          senteRoyalsRemaining: senteRoyals,
          goteRoyalsRemaining: goteRoyals,
          inCheckSide: null,
        };
      }
    }
    for (const rc of goteRoyalCoords) {
      const pieceAtRc = board[rc.r]?.[rc.c];
      if (scale === 'war12' && pieceAtRc?.code !== 'K') continue;
      if (rc.r === rows - 1 && threatMap[rc.r][rc.c].senteAttackers.length === 0) {
        return {
          winner: 'gote',
          reason:
            scale === 'war12'
              ? 'Imperial Breakthrough (王将トライ)! Gote’s King [K] safely reached Sente’s back rank!'
              : 'Try Rule (トライ)! Gote’s Lion safely reached the final rank!',
          winType: 'try_rule',
          senteRoyalsRemaining: senteRoyals,
          goteRoyalsRemaining: goteRoyals,
          inCheckSide: null,
        };
      }
    }
  }

  // 3. Sennichite (4-Fold Repetition)
  if (positionHistory && positionHistory.length >= 4) {
    const latestHash = positionHistory[positionHistory.length - 1];
    const occurrences = positionHistory.filter(h => h === latestHash).length;
    if (occurrences >= 4) {
      return {
        winner: 'draw',
        reason: 'Sennichite (千日手) — Draw by 4-Fold Repetition.',
        winType: 'sennichite',
        senteRoyalsRemaining: senteRoyals,
        goteRoyalsRemaining: goteRoyals,
        inCheckSide: null,
      };
    }
  }

  // 4. Check & Checkmate (Tsumi) Evaluation
  const nextInCheck = isKingInCheck(board, nextTurn, scale);
  if (cfg.enforceStrictCheck) {
    const hasEscape = hasAnyLegalAction(board, nextTurn, scale, hands);
    if (!hasEscape) {
      return {
        winner: completedBy,
        reason: nextInCheck
          ? `Checkmate (詰み)! ${completedBy === 'sente' ? 'Sente' : 'Gote'} trapped the enemy Royal with no legal escape.`
          : `Victory! ${nextTurn === 'sente' ? 'Sente' : 'Gote'} has no legal moves remaining.`,
        winType: 'checkmate',
        senteRoyalsRemaining: senteRoyals,
        goteRoyalsRemaining: goteRoyals,
        inCheckSide: nextTurn,
      };
    }
  } else if (nextInCheck) {
    // In 12x12 and 36x36, check if the player's Final Royal (or all surviving Royals) has any move that escapes check
    const nextRoyalsCount = nextTurn === 'sente' ? senteRoyals : goteRoyals;
    if (nextRoyalsCount === 1 && scale !== 'taikyoku36') {
      // Check if any move in 12x12 resolves the check on the final Royal
      let canSaveRoyal = false;
      for (let r = 0; r < rows && !canSaveRoyal; r++) {
        for (let c = 0; c < cols && !canSaveRoyal; c++) {
          const p = board[r][c];
          if (p && p.owner === nextTurn) {
            const { moves } = analyzePieceMovesOnBoard(board, r, c, { scale });
            for (const m of moves) {
              const sim = cloneBoard(board);
              sim[m.r][m.c] = { ...p };
              if (m.kind !== 'igui') sim[r][c] = null;
              if (!isKingInCheck(sim, nextTurn, scale)) {
                canSaveRoyal = true;
                break;
              }
            }
          }
        }
      }
      if (!canSaveRoyal) {
        return {
          winner: completedBy,
          reason: `Final-Royal Checkmate (詰み)! ${nextTurn === 'sente' ? 'Sente' : 'Gote'}’s last Royal Commander cannot escape capture.`,
          winType: 'checkmate',
          senteRoyalsRemaining: senteRoyals,
          goteRoyalsRemaining: goteRoyals,
          inCheckSide: nextTurn,
        };
      }
    }
  }

  let statusBanner: string | undefined;
  if (scale === 'taikyoku36' || scale === 'war12') {
    if (senteRoyals === 1 && goteRoyals >= 2) {
      statusBanner = 'Sente is down to 1 Royal Commander! Protect your last Royal or evolve a unit to Tier-4 Royal.';
    } else if (goteRoyals === 1 && senteRoyals >= 2) {
      statusBanner = 'Gote is down to 1 Royal Commander! Eliminate it or reach rank 1 with your King [K] to win.';
    }
  }

  return {
    winner: null,
    reason: null,
    senteRoyalsRemaining: senteRoyals,
    goteRoyalsRemaining: goteRoyals,
    inCheckSide: nextInCheck ? nextTurn : null,
    statusBanner,
  };
}

/**
 * Creates a curated 36×36 "Royal Clash & Fire Demon Frontline" scenario on the 36×36 board
 * so players can immediately test 36×36 Dual-Royal survival, DE->CP promotion, Fire Demon
 * active AoE burn & suicide-burn, and Great General Rank-Jumping without playing 200 opening moves.
 */
export function create36x36TacticalClashBoard(): (BoardPiece | null)[][] {
  const board: (BoardPiece | null)[][] = Array.from({ length: 36 }, () =>
    Array.from({ length: 36 }, () => null)
  );

  // Gote Royal Command & Generals (Rows 8-12, centered around cols 14-21)
  board[9][17] = makePiece('K', 'gote');
  board[9][18] = makePiece('CP', 'gote');
  board[10][16] = makePiece('GG', 'gote');
  board[10][19] = makePiece('VG', 'gote');
  board[11][15] = makePiece('DM', 'gote'); // Fire Demon
  board[11][20] = makePiece('LN', 'gote'); // Lion
  board[12][17] = makePiece('RO', 'gote'); // Flying General
  board[12][18] = makePiece('G', 'gote');

  // Sente Strike Force & Dual Royals (Rows 11-26, centered around cols 14-21)
  board[24][18] = makePiece('K', 'sente');
  board[24][17] = makePiece('CP', 'sente');
  board[11][13] = makePiece('DE', 'sente');
  board[13][17] = makePiece('DM', 'sente');
  board[16][18] = makePiece('GG', 'sente');
  board[14][18] = makePiece('G', 'sente');
  board[15][15] = makePiece('LN', 'sente');
  board[16][14] = makePiece('LO', 'sente');
  board[16][21] = makePiece('HM', 'sente');

  return board;
}

// ============================================================================
// WAR-BUDGET 12×12 VARIANT: FIXED ROYAL CITADEL, KOKU COSTS & 4-TIER EVOLUTION
// ============================================================================

export const DEFAULT_WAR_BUDGET_KOKU = 3500;

/**
 * Computes the balanced War-Budget Koku cost (100 to 950 Koku) for any of the 208+ Taikyoku pieces.
 * Fixed Royal Citadel pieces have cost 0 when part of the mandatory starting citadel.
 */
export function getPieceWarBudgetCost(code: string): number {
  const spec = PIECE_DB[code];
  if (!spec) return 150;
  if (code === 'P' || code === 'GB' || code === 'D' || code === 'SG') return 75;
  if (spec.special === 'fire' || code === 'DM') return 550;
  if (spec.special === 'lion' || code === 'LN' || code === 'LD' || code === 'FE') return 500;
  if (spec.special === 'hook_ortho' || spec.special === 'hook_diag' || code === 'LO' || code === 'HM' || code === 'PC') return 475;
  if (spec.special === 'range_jump' || code === 'GG' || code === 'VG') return 525;
  const rawVal = spec.value || 200;
  return Math.max(100, Math.min(450, Math.round((rawVal * 0.42) / 25) * 25));
}

export interface EvolutionBranchOption {
  branchName: 'Vanguard (武神)' | 'Tactician (軍師)' | 'Siege (攻城)';
  branchLabel: string;
  targetCode: string;
  code: string;
  targetName: string;
  targetKanji: string;
  nextTier: number;
  tier: number;
  summary: string;
  description: string;
}

/**
 * Returns the 3 branching promotion paths for a piece in the 12×12 War-Budget variant.
 * Allows ANY unit (from Pawn [P] upward) to evolve through 4 tiers all the way up to Crown Prince [CP] or King [K]!
 * - Tier 1 -> Tier 2 (at 1★)
 * - Tier 2 -> Tier 3 (at 2★)
 * - Tier 3 -> Tier 4 Royal Ascension (at 3★+)
 */
export function getEvolutionBranches(code: string, currentTier = 1): EvolutionBranchOption[] {
  const spec = PIECE_DB[code];
  const naturalPromo = spec?.promotesTo && PIECE_DB[spec.promotesTo] ? spec.promotesTo : null;

  const makeBranch = (
    branchName: 'Vanguard (武神)' | 'Tactician (軍師)' | 'Siege (攻城)',
    targetCode: string,
    nextTier: number,
    summary: string
  ): EvolutionBranchOption => ({
    branchName,
    branchLabel: branchName,
    targetCode,
    code: targetCode,
    targetName: PIECE_DB[targetCode]?.name || targetCode,
    targetKanji: PIECE_DB[targetCode]?.kanji || targetCode,
    nextTier,
    tier: nextTier,
    summary,
    description: summary,
  });

  if (currentTier <= 1) {
    const vanguardCode = naturalPromo || (code === 'G' ? 'R' : 'G');
    const tacticianCode = code === 'S' ? 'KR' : code === 'B' ? 'DH' : 'S';
    const siegeCode = code === 'R' ? 'DK' : 'CM';
    return [
      makeBranch(
        'Vanguard (武神)',
        vanguardCode,
        2,
        `Historical/Frontline promotion into [${vanguardCode}] (${PIECE_DB[vanguardCode]?.moveSummary || '6-way guard'}).`
      ),
      makeBranch(
        'Tactician (軍師)',
        tacticianCode,
        2,
        `Agile diagonal strike promotion into [${tacticianCode}] (${PIECE_DB[tacticianCode]?.moveSummary || 'Diagonal striker'}).`
      ),
      makeBranch(
        'Siege (攻城)',
        siegeCode,
        2,
        `Long-range lane breaker promotion into [${siegeCode}] (${PIECE_DB[siegeCode]?.moveSummary || 'Ranging chariot'}).`
      ),
    ];
  }

  if (currentTier === 2) {
    const vanguardCode = naturalPromo && PIECE_DB[naturalPromo]?.value >= 700 ? naturalPromo : 'LN';
    const tacticianCode = 'LO';
    const siegeCode = 'DM';
    return [
      makeBranch(
        'Vanguard (武神)',
        vanguardCode,
        3,
        `Ascend to [${vanguardCode}] with 2-step Lion / Igui double-strike power!`
      ),
      makeBranch(
        'Tactician (軍師)',
        tacticianCode,
        3,
        `Ascend to [${tacticianCode}] (Tengu) with 90° bent diagonal hook rays across the board!`
      ),
      makeBranch(
        'Siege (攻城)',
        siegeCode,
        3,
        `Ascend to [${siegeCode}] (Fire Demon) with active 8-square AoE incineration!`
      ),
    ];
  }

  // Tier 3 -> Tier 4: Royal Ascension (Pawn has climbed all the way to Crown Prince or King!)
  return [
    makeBranch(
      'Vanguard (武神)',
      'K',
      4,
      'Supreme Royal Ascension! Unit becomes an active King [K] capable of Royal Try Victory (トライ) and must be eliminated by the enemy.'
    ),
    makeBranch(
      'Tactician (軍師)',
      'CP',
      4,
      'Imperial Royal Heir! Unit becomes an active Crown Prince [CP] — the opponent must eliminate ALL your Royals to win.'
    ),
    makeBranch(
      'Siege (攻城)',
      'GG',
      4,
      'Supreme Commander! Unit becomes a Tier-4 Great General [GG] that jumps over any lower-ranked pieces along 8 rays.'
    ),
  ];
}

export type WarBudgetPresetId =
  | 'balanced'
  | 'raiden_cavalry'
  | 'fire_siege'
  | 'royal_ascension'
  | 'cavalry'
  | 'siege'
  | 'ascension'
  | 'citadel_only';

/**
 * Creates the 12×12 War-Budget board with:
 * 1) Fixed King [K] at col 6, Crown Prince [CP] at col 5, and their fixed Royal Guard
 *    (Gold Generals [G], Silver Generals [S], Drunken Elephant [DE], and Citadel Shield Pawns [P])
 *    locked in place for both Sente and Gote.
 * 2) Optional drafted Taikyoku pieces placed within the 3,500 Koku War Budget!
 */
export function createWarBudgetCitadelBoard(presetId: WarBudgetPresetId = 'balanced'): (BoardPiece | null)[][] {
  const board: (BoardPiece | null)[][] = Array.from({ length: 12 }, () => Array(12).fill(null));

  const placeCitadelGuard = (rankFromBack: number, col: number, code: string) => {
    const senteRow = 11 - rankFromBack;
    const goteRow = rankFromBack;
    const goteCol = 11 - col;
    board[senteRow][col] = makePiece(code, 'sente', false, code, { citadelGuard: true, tier: 1, stars: 0 });
    board[goteRow][goteCol] = makePiece(code, 'gote', false, code, { citadelGuard: true, tier: 1, stars: 0 });
  };

  // Fixed Royal Citadel (King + Prince + Guard remain in place at the rear citadel!)
  placeCitadelGuard(0, 6, 'K');   // King
  placeCitadelGuard(0, 5, 'CP');  // Crown Prince (Both K and CP must be taken to win!)
  placeCitadelGuard(0, 4, 'G');   // Left Gold Guard
  placeCitadelGuard(0, 7, 'G');   // Right Gold Guard
  placeCitadelGuard(1, 4, 'S');   // Left Silver Guard
  placeCitadelGuard(1, 5, 'DE');  // Royal Heir Guard
  placeCitadelGuard(1, 6, 'BT');  // Blind Tiger Citadel Guard
  placeCitadelGuard(1, 7, 'S');   // Right Silver Guard
  placeCitadelGuard(2, 4, 'P');   // Citadel Shield Pawn
  placeCitadelGuard(2, 5, 'P');   // Citadel Shield Pawn
  placeCitadelGuard(2, 6, 'P');   // Citadel Shield Pawn
  placeCitadelGuard(2, 7, 'P');   // Citadel Shield Pawn

  if (presetId === 'citadel_only') {
    return board;
  }

  const placeDrafted = (rankFromBack: number, col: number, code: string) => {
    const senteRow = 11 - rankFromBack;
    const goteRow = rankFromBack;
    const goteCol = 11 - col;
    if (!board[senteRow][col]) {
      board[senteRow][col] = makePiece(code, 'sente', false, code, { citadelGuard: false, tier: 1, stars: 0 });
    }
    if (!board[goteRow][goteCol]) {
      board[goteRow][goteCol] = makePiece(code, 'gote', false, code, { citadelGuard: false, tier: 1, stars: 0 });
    }
  };

  if (presetId === 'balanced') {
    // Balanced Imperial Corps (~3,350 Koku): Lion, Rook, Bishop, Kirin, Phoenix, Chariot Soldiers & Vanguard Pawns
    placeDrafted(0, 0, 'L');
    placeDrafted(0, 11, 'L');
    placeDrafted(1, 2, 'B');
    placeDrafted(1, 9, 'B');
    placeDrafted(2, 1, 'R');
    placeDrafted(2, 2, 'DH');
    placeDrafted(2, 3, 'LN');
    placeDrafted(2, 8, 'DK');
    placeDrafted(2, 10, 'R');
    for (const c of [0, 1, 2, 3, 8, 9, 10, 11]) {
      placeDrafted(3, c, 'P');
    }
  } else if (presetId === 'raiden_cavalry' || presetId === 'cavalry') {
    // Raiden's Lion & Tengu Strike Corps (~3,450 Koku): Dual Lions, Tengu, Soaring Eagle, Horned Falcon
    placeDrafted(2, 3, 'LN');
    placeDrafted(2, 8, 'LO');
    placeDrafted(1, 2, 'EL');
    placeDrafted(1, 9, 'HF');
    placeDrafted(2, 1, 'KR');
    placeDrafted(2, 10, 'PH');
    for (const c of [0, 1, 2, 3, 8, 9, 10, 11]) {
      placeDrafted(3, c, 'P');
    }
  } else if (presetId === 'fire_siege' || presetId === 'siege') {
    // Kagutsuchi's Fire Demon & Great General Siege (~3,500 Koku): Fire Demon, Great General, Hook Mover, Chariots
    placeDrafted(2, 3, 'DM');
    placeDrafted(2, 8, 'GG');
    placeDrafted(1, 2, 'HM');
    placeDrafted(1, 9, 'RO');
    placeDrafted(2, 1, 'CM');
    placeDrafted(2, 10, 'CM');
    for (const c of [0, 1, 2, 3, 8, 9, 10, 11]) {
      placeDrafted(3, c, 'P');
    }
  } else if (presetId === 'royal_ascension' || presetId === 'ascension') {
    // Royal Ascension Vanguard (~2,900 Koku): Drunken Elephants, White Elephants, Ferocious Leopards & Star Pawns
    placeDrafted(2, 2, 'WE');
    placeDrafted(2, 3, 'DE');
    placeDrafted(2, 8, 'FL');
    placeDrafted(2, 9, 'CE');
    placeDrafted(1, 2, 'Q');
    placeDrafted(1, 9, 'R');
    for (const c of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      placeDrafted(3, c, 'P');
    }
  }

  return board;
}

/**
 * Calculates total War-Budget Koku spent by `owner` on non-citadel drafted pieces on the board.
 */
export function calculateBoardArmyCost(board: (BoardPiece | null)[][], owner: PlayerSide): number {
  let spent = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[0]?.length || 0); c++) {
      const p = board[r][c];
      if (p && p.owner === owner && !p.citadelGuard) {
        spent += getPieceWarBudgetCost(p.code);
      }
    }
  }
  return spent;
}



