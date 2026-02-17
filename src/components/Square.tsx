import React from 'react';
import type { Square as ChessSquare, PieceSymbol, Color } from 'chess.js';
import Piece from './Piece';

interface SquareProps {
  square: ChessSquare;
  row: number;
  col: number;
  squareSize: number;
  piece: { type: PieceSymbol; color: Color } | null;
  isSelected?: boolean;
  isLegalMove?: boolean;
  isLastMoveFrom?: boolean;
  isLastMoveTo?: boolean;
  isCheck?: boolean;
  onClick: (square: ChessSquare) => void;
  onDragStart: (square: ChessSquare) => void;
  onDragEnd: (square: ChessSquare | null) => void;
  isDragging?: boolean;
  pieceId?: string;
}

const Square: React.FC<SquareProps> = ({
  square,
  row,
  col,
  squareSize,
  piece,
  isSelected,
  isLegalMove,
  isLastMoveFrom,
  isLastMoveTo,
  isCheck,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  pieceId,
}) => {
  const isDark = (row + col) % 2 === 1;

  // Gerçekçi ahşap renkleri (hafif eskitilmiş)
  const lightSquare = '#e8cfa4'; // Cream oak
  const darkSquare = '#8a5c37';  // Dark walnut
  const baseColor = isDark ? darkSquare : lightSquare;

  // Highlight renkleri
  let highlightColor = '';
  let highlightOpacity = 0;

  if (isCheck) {
    highlightColor = 'radial-gradient(ellipse at center, rgba(220,38,38,0.7) 0%, rgba(220,38,38,0.4) 40%, rgba(220,38,38,0) 70%)';
  } else if (isSelected) {
    highlightColor = 'rgba(255, 235, 59, 0.45)'; // Soft yellow glow
    highlightOpacity = 1;
  } else if (isLastMoveFrom || isLastMoveTo) {
    highlightColor = 'rgba(255, 235, 59, 0.35)'; // Faint yellow trail
    highlightOpacity = 1;
  }

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        width: squareSize,
        height: squareSize,
        backgroundColor: baseColor,
        // Ahşap doku efekti (CSS'te tanımlı SVG noise ile blend edilir)
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${isDark ? '0.12' : '0.07'}'/%3E%3C/svg%3E")`,
        backgroundBlendMode: 'overlay',
      }}
      onClick={() => onClick(square)}
      data-square={square}
    >
      {/* Highlight overlay */}
      {highlightColor && !isCheck && (
        <div
          className="absolute inset-0 pointer-events-none z-[2]"
          style={{ backgroundColor: highlightColor, opacity: highlightOpacity, mixBlendMode: 'hard-light' }}
        />
      )}
      {/* Check visual */}
      {isCheck && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{ background: highlightColor }}
        />
      )}

      {/* Koordinat etiketleri - Oyma efekti gibi */}
      {col === 0 && (
        <span
          className="absolute top-[2px] left-[3px] font-bold pointer-events-none z-[5] font-mono tracking-tighter"
          style={{
            fontSize: squareSize * 0.16,
            color: isDark ? lightSquare : darkSquare,
            opacity: 0.85,
            lineHeight: 1,
            textShadow: isDark ? '0 1px 1px rgba(0,0,0,0.3)' : '0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {8 - row}
        </span>
      )}
      {row === 7 && (
        <span
          className="absolute bottom-[1px] right-[3px] font-bold pointer-events-none z-[5] font-mono tracking-tighter"
          style={{
            fontSize: squareSize * 0.16,
            color: isDark ? lightSquare : darkSquare,
            opacity: 0.85,
            lineHeight: 1,
            textShadow: isDark ? '0 1px 1px rgba(0,0,0,0.3)' : '0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {String.fromCharCode(97 + col)}
        </span>
      )}

      {/* Legal Move Marker - Oyuk nokta efekti (Daha belirgin) */}
      {isLegalMove && (
        <div
          className="absolute z-20 rounded-full pointer-events-none"
          style={
            piece
              ? {
                  // Taş varsa etrafında halka (oyuk gibi)
                  width: '100%',
                  height: '100%',
                  border: '6px solid rgba(0,0,0,0.25)', // Opaklık artırıldı
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  boxSizing: 'border-box',
                }
              : {
                  // Boşsa nokta (oyuk gibi - Daha büyük ve belirgin)
                  width: '28%', // %24 -> %28
                  height: '28%',
                  backgroundColor: 'rgba(0,0,0,0.25)', // Opaklık artırıldı
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                }
          }
        />
      )}

      {/* Piece */}
      {piece && (
        <div
          className="z-30 w-full h-full relative"
          style={{ opacity: isDragging ? 0.3 : 1, transition: 'opacity 0.1s ease' }}
        >
          <Piece
            type={`${piece.color}${piece.type}`}
            square={square}
            squareSize={squareSize}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            pieceId={pieceId}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(Square);
