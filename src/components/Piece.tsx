/**
 * Piece Component
 * Satranç taşını SVG olarak render eder.
 */
import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PieceMap } from '../assets/pieces';
import type { Square as ChessSquare } from 'chess.js';

interface PieceProps {
  type: string;      // Ör: 'wp', 'bk'
  square: ChessSquare;
  squareSize: number;
  onDragStart: (square: ChessSquare) => void;
  onDragEnd: (square: ChessSquare | null) => void;
  pieceId?: string;
}

const Piece: React.FC<PieceProps> = ({ type, square, squareSize, onDragStart, onDragEnd, pieceId }) => {
  const pieceRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const PieceComponent = PieceMap[type];
  const pieceSize = squareSize * 0.88;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setDragPos({ x: 0, y: 0 });
    onDragStart(square);
    
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
  }, [square, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    setDragPos({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    
    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture(e.pointerId);
    
    const boardEl = el.closest('[data-board]');
    if (boardEl) {
      const boardRect = boardEl.getBoundingClientRect();
      const dropX = e.clientX - boardRect.left;
      const dropY = e.clientY - boardRect.top;
      const col = Math.floor(dropX / squareSize);
      const row = Math.floor(dropY / squareSize);
      
      if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        const file = String.fromCharCode(97 + col);
        const rank = (8 - row).toString();
        const targetSquare = (file + rank) as ChessSquare;
        onDragEnd(targetSquare);
      } else {
        onDragEnd(null);
      }
    } else {
      onDragEnd(null);
    }
    
    setDragPos(null);
  }, [squareSize, onDragEnd]);

  if (!PieceComponent) return null;

  const isDraggingNow = !!dragPos;
  
  // Siyah taşlar için özel gölgelendirme (biraz daha belirgin)
  const isBlack = type.startsWith('b');
  
  // Gölge stilleri
  const restingShadow = isBlack
    ? 'drop-shadow(0 2px 2px rgba(0,0,0,0.5)) drop-shadow(0 5px 4px rgba(0,0,0,0.2))' 
    : 'drop-shadow(0 2px 2px rgba(0,0,0,0.3)) drop-shadow(0 4px 3px rgba(0,0,0,0.1))';
    
  const draggingShadow = 'drop-shadow(0 15px 20px rgba(0,0,0,0.5)) drop-shadow(0 5px 10px rgba(0,0,0,0.3))';

  return (
    <motion.div
      ref={pieceRef}
      layout
      layoutId={pieceId}
      className="absolute select-none"
      style={{
        width: pieceSize,
        height: pieceSize,
        top: (squareSize - pieceSize) / 2,
        left: (squareSize - pieceSize) / 2,
        zIndex: isDraggingNow ? 100 : 10,
        transform: isDraggingNow ? `translate(${dragPos.x}px, ${dragPos.y}px)` : undefined,
        filter: isDraggingNow ? draggingShadow : restingShadow,
        transition: isDraggingNow ? 'none' : 'filter 0.2s ease, transform 0.15s ease',
        pointerEvents: 'auto',
        cursor: isDraggingNow ? 'grabbing' : 'grab',
        // Taşın görsel netliği için
        willChange: 'transform, filter',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      initial={false}
      animate={!isDraggingNow ? { scale: 1, y: 0 } : { scale: 1.15, y: -5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <PieceComponent size={pieceSize} />
    </motion.div>
  );
};

export default React.memo(Piece);
