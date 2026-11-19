import { DIRS_8, DirKey, PIECE_DB, PieceSpec } from './pieceRegistry';
import {
  BlockedSquare,
  BlindSquare,
  BoardPiece,
  BoardScaleId,
  LegalMove,
  SCALE_CONFIGS,
  SquareThreatInfo,
  ThreatSource,
} from './shogiEngine';

export type LabelMode = 'western' | 'hybrid' | 'kanji';

/**
 * Draws a single traditional pentagon Shogi Koma tile onto `ctx` at `(x, y)` with cell size `cs`.
 * Includes directional movement pips around the perimeter when `labelMode === 'western'`.
 */
export function drawKomaTile(
  ctx: CanvasRenderingContext2D,
  piece: BoardPiece,
  x: number,
  y: number,
  cs: number,
  labelMode: LabelMode = 'western'
) {
  const spec = PIECE_DB[piece.code];
  if (!spec) return;
  const isSente = piece.owner === 'sente';

  ctx.save();
  ctx.translate(x + cs / 2, y + cs / 2);
  if (!isSente) ctx.rotate(Math.PI);

  const w = cs * 0.84;
  const h = cs * 0.88;

  // Pentagon Shogi Koma silhouette
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.48);
  ctx.lineTo(w * 0.43, -h * 0.26);
  ctx.lineTo(w * 0.48, h * 0.46);
  ctx.lineTo(-w * 0.48, h * 0.46);
  ctx.lineTo(-w * 0.43, -h * 0.26);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  if (spec.isRoyal) {
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(1, '#eab308');
  } else if (piece.promoted) {
    grad.addColorStop(0, '#fde68a');
    grad.addColorStop(1, '#f59e0b');
  } else {
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(1, '#f3d79b');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = Math.max(1.2, cs * 0.045);
  ctx.strokeStyle = isSente ? '#1e293b' : '#991b1b';
  ctx.stroke();

  // Draw 8-direction movement pips along the inner Koma edge when cs >= 22 and labelMode !== 'kanji'
  if (cs >= 22 && labelMode === 'western') {
    const pipRadius = Math.max(1.4, cs * 0.042);
    (Object.keys(DIRS_8) as DirKey[]).forEach(dirKey => {
      const cap = spec.dirs[dirKey];
      if (!cap || cap.type === 'none') return;
      const [dr, dc] = DIRS_8[dirKey];
      const px = dc * (w * 0.33);
      const py = dr * (h * 0.33);

      ctx.beginPath();
      if (cap.type === 'slide' || cap.type === 'hook') {
        ctx.fillStyle = '#0284c7';
        ctx.arc(px, py, pipRadius * 1.25, 0, Math.PI * 2);
      } else if (cap.type === 'range' || cap.type === 'jump') {
        ctx.fillStyle = '#d97706';
        ctx.arc(px, py, pipRadius * 1.1, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = '#15803d';
        ctx.arc(px, py, pipRadius, 0, Math.PI * 2);
      }
      ctx.fill();
    });
  }

  ctx.restore();

  // Draw Upright Typography (Western Code / Kanji / Hybrid)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = x + cs / 2;
  const cy = y + cs / 2;
  const textColor = piece.promoted ? '#b91c1c' : isSente ? '#0f172a' : '#7f1d1d';

  if (labelMode === 'western' || cs < 24) {
    const fontSz = Math.max(8, Math.floor(cs * 0.34));
    ctx.font = `800 ${fontSz}px "JetBrains Mono", monospace`;
    ctx.fillStyle = textColor;
    ctx.fillText(spec.code, cx, cy + 1);
  } else if (labelMode === 'kanji') {
    const kanjiSz = Math.max(9, Math.floor(cs * 0.35));
    ctx.font = `900 ${kanjiSz}px "Noto Serif JP", serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(spec.kanji.slice(0, 2), cx, cy + 1);
  } else {
    const codeSz = Math.max(7, Math.floor(cs * 0.23));
    ctx.font = `800 ${codeSz}px "JetBrains Mono", monospace`;
    ctx.fillStyle = isSente ? '#0f172a' : '#991b1b';
    ctx.fillText(spec.code, cx, cy - cs * 0.16);

    const kanjiSz = Math.max(8, Math.floor(cs * 0.27));
    ctx.font = `900 ${kanjiSz}px "Noto Serif JP", serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(spec.kanji.slice(0, 2), cx, cy + cs * 0.15);
  }

  // Draw Battle Stars (★) or Parachuted badge when present on War-Budget 12x12 pieces
  if (cs >= 28 && ((piece.stars && piece.stars > 0) || piece.parachuted)) {
    const badgeText = piece.stars && piece.stars > 0 ? `★${piece.stars}` : 'P';
    ctx.font = `bold ${Math.max(7, Math.floor(cs * 0.19))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = piece.parachuted ? '#7c3aed' : '#b45309';
    ctx.fillText(badgeText, x + cs * 0.76, y + cs * 0.22);
  }
  ctx.restore();
}

/**
 * Draws the 5x5 movement vector compass matrix onto `canvas`.
 */
export function drawCompassMatrix(canvas: HTMLCanvasElement | null, spec: PieceSpec) {
  if (!canvas) return;
  const cCtx = canvas.getContext('2d');
  if (!cCtx) return;

  const size = canvas.width;
  const cell = size / 5;
  cCtx.clearRect(0, 0, size, size);

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const val = spec.compass[r][c];
      const x = c * cell;
      const y = r * cell;
      cCtx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#1e293b';
      cCtx.fillRect(x, y, cell, cell);
      cCtx.strokeStyle = '#334155';
      cCtx.strokeRect(x, y, cell, cell);

      if (val === 9) {
        cCtx.fillStyle = '#f59e0b';
        cCtx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        cCtx.fillStyle = '#020617';
        cCtx.font = 'bold 9px "JetBrains Mono"';
        cCtx.textAlign = 'center';
        cCtx.textBaseline = 'middle';
        cCtx.fillText(spec.code, x + cell / 2, y + cell / 2);
      } else if (val === 1) {
        cCtx.fillStyle = '#34d399';
        cCtx.beginPath();
        cCtx.arc(x + cell / 2, y + cell / 2, 5, 0, Math.PI * 2);
        cCtx.fill();
      } else if (val === 2) {
        cCtx.fillStyle = '#38bdf8';
        cCtx.fillRect(x + 5, y + 5, cell - 10, cell - 10);
      } else if (val === 3) {
        cCtx.fillStyle = '#fbbf24';
        cCtx.beginPath();
        cCtx.arc(x + cell / 2, y + cell / 2, 5.5, 0, Math.PI * 2);
        cCtx.fill();
      } else if (val === 4) {
        cCtx.fillStyle = '#e879f9';
        cCtx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      }
    }
  }
}

export interface StrategyArrow {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  color: 'emerald' | 'amber' | 'rose' | 'sky';
  label?: string;
  dashed?: boolean;
}

export interface StrategyKeySquare {
  r: number;
  c: number;
  color: 'emerald' | 'amber' | 'rose' | 'sky';
  label?: string;
}

export interface BoardRenderParams {
  board: (BoardPiece | null)[][];
  scale: BoardScaleId;
  camX: number;
  camY: number;
  cellSize: number;
  labelMode: LabelMode;
  selectedCell: { r: number; c: number } | null;
  selectedIsEnemy?: boolean;
  legalMoves: LegalMove[];
  enemyMovesOverlay?: LegalMove[];
  attackersOfSelected?: ThreatSource[];
  threatMap?: SquareThreatInfo[][];
  showThreatCircles?: boolean;
  blockedOverlay: BlockedSquare[];
  blindOverlay: BlindSquare[];
  showVectorTags: boolean;
  locatedPieceCode: string | null;
  lastMove: { fromR: number; fromC: number; toR: number; toC: number } | null;
  dangerSquares?: Set<string>;
  strategyArrows?: StrategyArrow[];
  strategyKeySquares?: StrategyKeySquare[];
}

/**
 * Helper to draw a directional threat arrow from `(fromX, fromY)` to `(toX, toY)`.
 */
function drawThreatArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 8) return;
  const ux = dx / len;
  const uy = dy / len;

  const startX = fromX + ux * 10;
  const startY = fromY + uy * 10;
  const endX = toX - ux * 12;
  const endY = toY - uy * 12;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const headLen = 8;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getStrategyPalette(color: 'emerald' | 'amber' | 'rose' | 'sky') {
  switch (color) {
    case 'emerald':
      return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.28)', badgeBg: '#065f46', text: '#ecfdf5' };
    case 'amber':
      return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.28)', badgeBg: '#78350f', text: '#fef3c7' };
    case 'rose':
      return { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.32)', badgeBg: '#881337', text: '#ffe4e6' };
    case 'sky':
      return { stroke: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.28)', badgeBg: '#0c4a6e', text: '#e0f2fe' };
  }
}

/**
 * Renders any Shogi board scale (3×4, 9×9, 12×12, 11×11 Dojo, or 36×36 Grand Taikyoku) onto `canvas`.
 */
export function renderShogiBoardCanvas(canvas: HTMLCanvasElement, params: BoardRenderParams) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    board,
    scale,
    camX: ox,
    camY: oy,
    cellSize: cs,
    labelMode,
    selectedCell,
    selectedIsEnemy = false,
    legalMoves,
    enemyMovesOverlay = [],
    attackersOfSelected = [],
    threatMap,
    showThreatCircles = true,
    blockedOverlay,
    blindOverlay,
    showVectorTags,
    locatedPieceCode,
    lastMove,
    dangerSquares,
    strategyArrows = [],
    strategyKeySquares = [],
  } = params;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const rows = board.length;
  const cols = board[0]?.length || rows;
  const totalW = cols * cs;
  const totalH = rows * cs;
  const cfg = SCALE_CONFIGS[scale];

  ctx.save();
  // Outer Kaya wood frame
  ctx.fillStyle = '#c89d54';
  ctx.strokeStyle = '#78531d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(ox - 18, oy - 18, totalW + 36, totalH + 36, 6);
  ctx.fill();
  ctx.stroke();

  const startC = Math.max(0, Math.floor(-ox / cs));
  const endC = Math.min(cols - 1, Math.ceil((canvas.width - ox) / cs));
  const startR = Math.max(0, Math.floor(-oy / cs));
  const endR = Math.min(rows - 1, Math.ceil((canvas.height - oy) / cs));

  // 1. Grid squares
  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      const inPromo = r < cfg.promoRanks || r >= rows - cfg.promoRanks;
      if (inPromo) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#DFB66C' : '#D7AD61';
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#E5BE77' : '#DDB56D';
      }
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = '#3b2810';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cs, cs);
    }
  }

  // 2. Promotion Zone dashed boundary lines
  ctx.strokeStyle = 'rgba(153, 27, 27, 0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(ox, oy + cfg.promoRanks * cs);
  ctx.lineTo(ox + totalW, oy + cfg.promoRanks * cs);
  ctx.moveTo(ox, oy + (rows - cfg.promoRanks) * cs);
  ctx.lineTo(ox + totalW, oy + (rows - cfg.promoRanks) * cs);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. File & Rank Coordinates along the rim
  if (cs >= 20) {
    ctx.fillStyle = '#291b0a';
    ctx.font = `bold ${Math.min(11, Math.floor(cs * 0.32))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = startC; c <= endC; c++) {
      ctx.fillText(String(cols - c), ox + (c + 0.5) * cs, oy - 9);
    }
    for (let r = startR; r <= endR; r++) {
      ctx.fillText(String(r + 1), ox + totalW + 9, oy + (r + 0.5) * cs);
    }
  }

  // 4. Last Move highlight
  if (lastMove) {
    const { fromR, fromC, toR, toC } = lastMove;
    if (fromR >= 0 && fromC >= 0) {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.30)';
      ctx.fillRect(ox + fromC * cs, oy + fromR * cs, cs, cs);
    }
    ctx.fillStyle = 'rgba(217, 119, 6, 0.48)';
    ctx.fillRect(ox + toC * cs, oy + toR * cs, cs, cs);
  }

  // 5. Located Piece highlight
  if (locatedPieceCode) {
    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const p = board[r][c];
        if (p && p.code === locatedPieceCode) {
          ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
          ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
        }
      }
    }
  }

  // 6. Danger squares (Dojo blind-spot drill)
  if (dangerSquares && dangerSquares.size > 0) {
    dangerSquares.forEach(key => {
      const [dr, dc] = key.split(',').map(Number);
      if (dr >= startR && dr <= endR && dc >= startC && dc <= endC) {
        ctx.fillStyle = 'rgba(225, 29, 72, 0.35)';
        ctx.fillRect(ox + dc * cs + 1, oy + dr * cs + 1, cs - 2, cs - 2);
      }
    });
  }

  // 7. Optional Vector Tags (BLIND / MAX / BLOCK) + Mandatory Rule Ban Tags (NIFU / UCHIFUZUME / SELF-CHECK)
  if (showVectorTags) {
    blindOverlay.forEach(bs => {
      if (bs.r < startR || bs.r > endR || bs.c < startC || bs.c > endC) return;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.32)';
      ctx.fillRect(ox + bs.c * cs + 1, oy + bs.r * cs + 1, cs - 2, cs - 2);
      if (cs >= 28 && !board[bs.r][bs.c]) {
        ctx.fillStyle = '#312e81';
        ctx.font = 'bold 8px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('BLIND', ox + (bs.c + 0.5) * cs, oy + (bs.r + 0.5) * cs);
      }
    });
  }

  blockedOverlay.forEach(bl => {
    if (bl.r < startR || bl.r > endR || bl.c < startC || bl.c > endC) return;
    const isRuleBan =
      bl.reason === 'uchifuzume' || bl.reason === 'nifu' || bl.reason === 'self_check' || bl.reason === 'lion_trade';
    if (!showVectorTags && !isRuleBan) return;
    if (board[bl.r][bl.c] && bl.reason === 'friendly') return;

    ctx.fillStyle = isRuleBan ? 'rgba(225, 29, 72, 0.35)' : 'rgba(245, 158, 11, 0.32)';
    ctx.fillRect(ox + bl.c * cs + 1, oy + bl.r * cs + 1, cs - 2, cs - 2);
    if (cs >= 28 && !board[bl.r][bl.c]) {
      ctx.fillStyle = isRuleBan ? '#881337' : '#78350f';
      ctx.font = 'bold 7.5px "JetBrains Mono"';
      ctx.textAlign = 'center';
      const label =
        bl.reason === 'uchifuzume'
          ? 'UCHIFUZUME'
          : bl.reason === 'nifu'
          ? 'NIFU'
          : bl.reason === 'self_check'
          ? 'SELF-CHECK'
          : bl.reason === 'lion_trade'
          ? 'SENJŌ BAN'
          : bl.reason === 'range_limit'
          ? 'MAX'
          : 'BLOCK';
      ctx.fillText(label, ox + (bl.c + 0.5) * cs, oy + (bl.r + 0.5) * cs);
    }
  });

  // 8. Selected Cell Highlight (Crimson if inspecting an Enemy piece, Emerald if Friendly)
  if (selectedCell) {
    ctx.fillStyle = selectedIsEnemy ? 'rgba(220, 38, 38, 0.45)' : 'rgba(16, 185, 129, 0.45)';
    ctx.fillRect(ox + selectedCell.c * cs, oy + selectedCell.r * cs, cs, cs);
    ctx.strokeStyle = selectedIsEnemy ? '#dc2626' : '#059669';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ox + selectedCell.c * cs + 1, oy + selectedCell.r * cs + 1, cs - 2, cs - 2);
  }

  // 9. Enemy Moves Overlay (Shown in RED when clicking an enemy piece OR showing moves of enemy pieces that can take your selected piece!)
  enemyMovesOverlay.forEach(em => {
    if (em.r < startR || em.r > endR || em.c < startC || em.c > endC) return;
    const mx = ox + em.c * cs;
    const my = oy + em.r * cs;
    if (em.kind === 'capture') {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.42)';
      ctx.fillRect(mx, my, cs, cs);
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
      ctx.fillRect(mx, my, cs, cs);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(mx + cs / 2, my + cs / 2, Math.max(3, cs * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 10. Friendly Legal Moves (with Red Capture Highlights & Guarded-Destination Warning Rings)
  const selectedPieceOwner = selectedCell ? board[selectedCell.r]?.[selectedCell.c]?.owner : null;
  legalMoves.forEach(m => {
    if (m.r < startR || m.r > endR || m.c < startC || m.c > endC) return;
    const mx = ox + m.c * cs;
    const my = oy + m.r * cs;

    // Check if this destination square is guarded by the opponent
    const enemyAttackersAtDest =
      threatMap && selectedPieceOwner
        ? selectedPieceOwner === 'sente'
          ? threatMap[m.r]?.[m.c]?.goteAttackers || []
          : threatMap[m.r]?.[m.c]?.senteAttackers || []
        : [];
    const isDestGuarded = enemyAttackersAtDest.length > 0;

    if (m.kind === 'capture') {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.38)';
      ctx.fillRect(mx, my, cs, cs);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx + 1.5, my + 1.5, cs - 3, cs - 3);
    } else if (m.kind === 'igui') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.48)';
      ctx.fillRect(mx, my, cs, cs);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx + 1.5, my + 1.5, cs - 3, cs - 3);
      if (cs >= 28) {
        ctx.fillStyle = '#451a03';
        ctx.font = 'bold 8px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('IGUI', mx + cs / 2, my + cs / 2);
      }
    } else {
      ctx.fillStyle = 'rgba(5, 150, 105, 0.28)';
      ctx.fillRect(mx, my, cs, cs);
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(mx + cs / 2, my + cs / 2, Math.max(3, cs * 0.15), 0, Math.PI * 2);
      ctx.fill();

      // If moving to this square puts our piece in reach of an enemy piece, draw a subtle red dashed warning ring
      if (isDestGuarded) {
        ctx.save();
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(mx + cs / 2, my + cs / 2, cs * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  });

  // 11. Draw Pieces (Koma) + RED CIRCLES on pieces in reach of another piece!
  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      const p = board[r][c];
      if (!p) continue;
      const x = ox + c * cs;
      const y = oy + r * cs;
      drawKomaTile(ctx, p, x, y, cs, labelMode);

      // Check if this piece is in reach of any opposing piece!
      if (showThreatCircles && threatMap && threatMap[r]?.[c]) {
        const enemyAttackers =
          p.owner === 'sente' ? threatMap[r][c].goteAttackers : threatMap[r][c].senteAttackers;

        // Also check if this piece is directly targeted by the currently selected piece (or enemyMovesOverlay)
        const isTargetedBySelection =
          legalMoves.some(m => m.r === r && m.c === c && m.kind === 'capture') ||
          enemyMovesOverlay.some(m => m.r === r && m.c === c && m.kind === 'capture');

        if (enemyAttackers.length > 0 || isTargetedBySelection) {
          ctx.save();
          const cx = x + cs / 2;
          const cy = y + cs / 2;
          const radius = cs * 0.44;

          // Outer glow + bold Red Circle around the piece in reach
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = isTargetedBySelection ? Math.max(2.5, cs * 0.08) : Math.max(2, cs * 0.06);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Small attacker count badge in top-right corner of the square if >= 1 enemy can take it
          if (cs >= 26 && enemyAttackers.length > 0) {
            const bx = x + cs - 7;
            const by = y + 7;
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(enemyAttackers.length), bx, by + 0.5);
          }
          ctx.restore();
        }
      }
    }
  }

  // 12. Highlight Specific Pieces That Can Take the Selected Piece (Attacker Rings + Threat Arrows)
  if (selectedCell && attackersOfSelected.length > 0) {
    const targetX = ox + (selectedCell.c + 0.5) * cs;
    const targetY = oy + (selectedCell.r + 0.5) * cs;

    attackersOfSelected.forEach(att => {
      const ax = ox + att.c * cs;
      const ay = oy + att.r * cs;
      const acx = ax + cs / 2;
      const acy = ay + cs / 2;

      ctx.save();
      // Highlight the attacker square & draw double crimson ring
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(2.5, cs * 0.075);
      ctx.beginPath();
      ctx.arc(acx, acy, cs * 0.46, 0, Math.PI * 2);
      ctx.stroke();

      if (cs >= 28) {
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(ax + 2, ay + cs - 11, cs - 4, 10);
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CAN TAKE', acx, ay + cs - 6);
      }
      ctx.restore();

      // Draw directional threat arrow from attacker to selected piece
      drawThreatArrow(ctx, acx, acy, targetX, targetY, 'rgba(239, 68, 68, 0.92)');
    });
  }

  // 13. Strategy Curriculum Key Squares & Tactical Plan Arrows (Guided Steps + Mistake Refutation Vectors)
  if (strategyKeySquares.length > 0) {
    strategyKeySquares.forEach(ks => {
      if (ks.r < startR || ks.r > endR || ks.c < startC || ks.c > endC) return;
      const sx = ox + ks.c * cs;
      const sy = oy + ks.r * cs;
      const pal = getStrategyPalette(ks.color);
      ctx.save();
      ctx.fillStyle = pal.fill;
      ctx.fillRect(sx + 1, sy + 1, cs - 2, cs - 2);
      ctx.strokeStyle = pal.stroke;
      ctx.lineWidth = Math.max(2, cs * 0.065);
      ctx.strokeRect(sx + 2, sy + 2, cs - 4, cs - 4);
      if (ks.label && cs >= 24) {
        ctx.fillStyle = pal.badgeBg;
        const badgeH = Math.max(9, Math.floor(cs * 0.22));
        ctx.fillRect(sx + 2, sy + 2, cs - 4, badgeH);
        ctx.fillStyle = pal.text;
        ctx.font = `bold ${Math.max(7, Math.floor(cs * 0.16))}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ks.label.slice(0, 8), sx + cs / 2, sy + 2 + badgeH / 2);
      }
      ctx.restore();
    });
  }

  if (strategyArrows.length > 0) {
    strategyArrows.forEach(arr => {
      const fromX = ox + (arr.fromC + 0.5) * cs;
      const fromY = oy + (arr.fromR + 0.5) * cs;
      const toX = ox + (arr.toC + 0.5) * cs;
      const toY = oy + (arr.toR + 0.5) * cs;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.hypot(dx, dy);
      if (len < 6) return;
      const ux = dx / len;
      const uy = dy / len;
      const startX = fromX + ux * (cs * 0.18);
      const startY = fromY + uy * (cs * 0.18);
      const endX = toX - ux * (cs * 0.22);
      const endY = toY - uy * (cs * 0.22);
      const pal = getStrategyPalette(arr.color);

      ctx.save();
      ctx.strokeStyle = pal.stroke;
      ctx.fillStyle = pal.stroke;
      ctx.lineWidth = Math.max(3, cs * 0.085);
      if (arr.dashed) {
        ctx.setLineDash([6, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const headLen = Math.max(9, cs * 0.24);
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Optional mid-arrow badge label
      if (arr.label && cs >= 24) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.font = `bold ${Math.max(8, Math.floor(cs * 0.18))}px "JetBrains Mono", monospace`;
        const metrics = ctx.measureText(arr.label);
        const pw = metrics.width + 8;
        const ph = Math.max(12, Math.floor(cs * 0.24));
        ctx.fillStyle = pal.badgeBg;
        ctx.fillRect(midX - pw / 2, midY - ph / 2, pw, ph);
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - pw / 2, midY - ph / 2, pw, ph);
        ctx.fillStyle = pal.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(arr.label, midX, midY + 0.5);
      }
      ctx.restore();
    });
  }

  ctx.restore();
}
