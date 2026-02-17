/**
 * ChessBoard Component
 * Gerçekçi ahşap çerçeveli 8x8 satranç tahtası.
 * Sürükle-bırak, legal moves, terfi modali, yenen taşlar.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Square as ChessSquare, PieceSymbol } from 'chess.js';
import { useGameStore } from '../store/useGameStore';
import SquareComponent from './Square';
import { PieceMap } from '../assets/pieces';

/** Yenen taşları hesapla */
function getCapturedPieces(history: { captured?: string; color: string }[]) {
  const white: string[] = []; // Beyazın yediği taşlar (siyah taşlar)
  const black: string[] = []; // Siyahın yediği taşlar (beyaz taşlar)
  for (const move of history) {
    if (move.captured) {
      if (move.color === 'w') {
        white.push(move.captured);
      } else {
        black.push(move.captured);
      }
    }
  }
  // Sırala: q, r, b, n, p
  const order: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  white.sort((a, b) => order[a] - order[b]);
  black.sort((a, b) => order[a] - order[b]);
  return { white, black };
}

/** Taş değeri */
function pieceValue(type: string): number {
  const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  return vals[type] || 0;
}

const CapturedPieces: React.FC<{ pieces: string[]; color: 'w' | 'b'; size: number }> = ({ pieces, color, size }) => {
  if (pieces.length === 0) return <div className="h-5" />;
  const iconSize = Math.min(size * 0.35, 18);
  return (
    <div className="flex items-center gap-0 flex-wrap h-5 overflow-hidden">
      {pieces.map((p, i) => {
        const key = `${color}${p}`;
        const PComp = PieceMap[key];
        return PComp ? (
          <div key={i} style={{ width: iconSize, height: iconSize, marginLeft: i > 0 ? -2 : 0, opacity: 0.85 }}>
            <PComp size={iconSize} />
          </div>
        ) : null;
      })}
    </div>
  );
};

const ChessBoard: React.FC = () => {
  const {
    game,
    fen,
    selectedSquare,
    legalMoves,
    lastMove,
    kingInCheck,
    pendingPromotion,
    selectSquare,
    makeMove,
    handlePromotion,
    cancelPromotion,
    getLegalMovesFrom,
    showLegalMoves,
    history,
    pieceIds,
  } = useGameStore();

  const [draggingFrom, setDraggingFrom] = useState<ChessSquare | null>(null);
  const [dragLegalMoves, setDragLegalMoves] = useState<ChessSquare[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(560);

  // Responsive board boyutu
  useEffect(() => {
    const updateSize = () => {
      const maxSize = Math.min(window.innerWidth - 64, window.innerHeight - 180, 640);
      setBoardSize(Math.max(280, maxSize));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const squareSize = boardSize / 8;

  // Board verisi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = useMemo(() => game.board(), [fen, game]);

  // Yenen taşlar
  const captured = useMemo(() => getCapturedPieces(history as { captured?: string; color: string }[]), [history]);
  const whiteScore = useMemo(() => captured.white.reduce((s, p) => s + pieceValue(p), 0), [captured.white]);
  const blackScore = useMemo(() => captured.black.reduce((s, p) => s + pieceValue(p), 0), [captured.black]);
  const advantage = whiteScore - blackScore;

  const handleSquareClick = useCallback((square: ChessSquare) => {
    if (draggingFrom) return;
    selectSquare(square);
  }, [selectSquare, draggingFrom]);

  const handleDragStart = useCallback((square: ChessSquare) => {
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      if (useGameStore.getState().aiEnabled && game.turn() === 'b') return;
      setDraggingFrom(square);
      setDragLegalMoves(getLegalMovesFrom(square));
      selectSquare(square);
    }
  }, [game, selectSquare, getLegalMovesFrom]);

  const handleDragEnd = useCallback((targetSquare: ChessSquare | null) => {
    if (draggingFrom && targetSquare) {
      const lm = getLegalMovesFrom(draggingFrom);
      if (lm.includes(targetSquare)) {
        const piece = game.get(draggingFrom);
        if (
          piece?.type === 'p' &&
          ((piece.color === 'w' && targetSquare[1] === '8') ||
           (piece.color === 'b' && targetSquare[1] === '1'))
        ) {
          useGameStore.setState({
            pendingPromotion: { from: draggingFrom, to: targetSquare },
            selectedSquare: null,
            legalMoves: [],
          });
        } else {
          makeMove(draggingFrom, targetSquare);
        }
      }
    }
    setDraggingFrom(null);
    setDragLegalMoves([]);
  }, [draggingFrom, makeMove, getLegalMovesFrom, game]);

  const activeLegalMoves = draggingFrom ? dragLegalMoves : legalMoves;

  // Terfi taşları
  const promotionPieces: PieceSymbol[] = ['q', 'n', 'r', 'b'];
  const promoColor = pendingPromotion ? (game.turn() === 'w' ? 'w' : 'b') : 'w';

  return (
    <div className="relative flex flex-col items-center">
      {/* Üst: Siyah oyuncu bilgisi */}
      <div className="w-full flex items-center justify-between px-1 pb-2" style={{ maxWidth: boardSize + 24 }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-800 border-2 border-gray-500" />
          <span className="text-sm font-semibold text-white/70">Siyah</span>
          {advantage < 0 && (
            <span className="text-xs text-white/40 ml-1">+{Math.abs(advantage)}</span>
          )}
        </div>
        <CapturedPieces pieces={captured.white} color="b" size={squareSize} />
      </div>

      {/* Ahşap çerçeve + Tahta */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          padding: 12,
          background: 'linear-gradient(145deg, #8B6914 0%, #6B4E12 30%, #5A3E0E 60%, #4A3009 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}
      >
        {/* İç gölge çerçeve */}
        <div
          className="rounded overflow-hidden"
          style={{
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <motion.div
            ref={boardRef}
            data-board
            className="grid grid-cols-8 relative"
            style={{ width: boardSize, height: boardSize }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {board.map((row, rowIdx) =>
              row.map((piece, colIdx) => {
                const file = String.fromCharCode(97 + colIdx);
                const rank = (8 - rowIdx).toString();
                const square = (file + rank) as ChessSquare;

                const isSelected = selectedSquare === square || draggingFrom === square;
                const isLegal = showLegalMoves && activeLegalMoves.includes(square);
                const isLastFrom = lastMove?.from === square;
                const isLastTo = lastMove?.to === square;
                const isCheck = kingInCheck === square;

                return (
                  <SquareComponent
                    key={square}
                    square={square}
                    row={rowIdx}
                    col={colIdx}
                    squareSize={squareSize}
                    piece={piece}
                    isSelected={isSelected}
                    isLegalMove={isLegal}
                    isLastMoveFrom={isLastFrom}
                    isLastMoveTo={isLastTo}
                    isCheck={isCheck}
                    onClick={handleSquareClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingFrom === square}
                    pieceId={pieceIds[square]}
                  />
                );
              })
            )}
          </motion.div>
        </div>
      </div>

      {/* Alt: Beyaz oyuncu bilgisi */}
      <div className="w-full flex items-center justify-between px-1 pt-2" style={{ maxWidth: boardSize + 24 }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
          <span className="text-sm font-semibold text-white/70">Beyaz</span>
          {advantage > 0 && (
            <span className="text-xs text-white/40 ml-1">+{advantage}</span>
          )}
        </div>
        <CapturedPieces pieces={captured.black} color="w" size={squareSize} />
      </div>

      {/* Terfi Modal */}
      <AnimatePresence>
        {pendingPromotion && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 rounded-lg"
              onClick={cancelPromotion}
            />
            <motion.div
              className="relative flex gap-1 p-2 rounded-xl"
              style={{
                background: 'linear-gradient(145deg, #3a3a5c, #2a2a42)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {promotionPieces.map((p) => {
                const key = `${promoColor}${p}`;
                const PComp = PieceMap[key];
                return (
                  <div
                    key={p}
                    className="cursor-pointer rounded-lg transition-all duration-150 hover:bg-white/20 active:scale-90 p-2"
                    onClick={() => handlePromotion(p)}
                  >
                    {PComp && <PComp size={squareSize * 0.8} />}
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChessBoard;
