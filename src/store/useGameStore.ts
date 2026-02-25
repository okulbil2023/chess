/**
 * Zustand ile oyun state yönetimi.
 * Chess.js entegrasyonu, AI modu, tema ve ses kontrolü.
 */
import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { Move, Square, PieceSymbol } from 'chess.js';
import { findBestMoveAsync } from '../engine/ai';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playGameOverSound,
  playCastleSound,
  playPromoteSound,
} from '../utils/sounds';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'threefold' | 'insufficient' | 'timeout';
export type ThemeMode = 'dark' | 'light';
export type GameMode = 'ai' | 'pvp';

export interface GameState {
  // Oyun durumu
  game: Chess;
  fen: string;
  history: Move[];
  status: GameStatus;
  turn: 'w' | 'b';
  gameMode: GameMode;
  isGameStarted: boolean;
  
  // UI durumu
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  kingInCheck: Square | null;
  showLegalMoves: boolean;
  
  // Terfi
  pendingPromotion: { from: Square; to: Square } | null;
  
  // Ayarlar
  aiEnabled: boolean;
  aiThinking: boolean;
  aiDepth: number;
  theme: ThemeMode;
  soundEnabled: boolean;
  pieceIds: Record<string, string>; // square -> stableId
  
  // Aksiyonlar
  selectSquare: (square: Square) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  handlePromotion: (piece: PieceSymbol) => void;
  cancelPromotion: () => void;
  undoMove: () => void;
  resetGame: () => void;
  startGame: (mode: GameMode) => void;
  toggleAI: () => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  toggleLegalMoves: () => void;
  setAiDepth: (depth: number) => void;
  getLegalMovesFrom: (square: Square) => Square[];
  
  // Timer
  timer: number;
  decrementTimer: () => void;
  resetTimer: () => void;
}

/** Şahtaki kralın pozisyonunu bul */
function findKingSquare(game: Chess, color: 'w' | 'b'): Square | null {
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'k' && piece.color === color) {
        const file = String.fromCharCode(97 + col);
        const rank = (8 - row).toString();
        return (file + rank) as Square;
      }
    }
  }
  return null;
}

/** Oyun durumunu belirle */
function getGameStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) return 'checkmate';
  if (game.isStalemate()) return 'stalemate';
  if (game.isThreefoldRepetition()) return 'threefold';
  if (game.isInsufficientMaterial()) return 'insufficient';
  if (game.isDraw()) return 'draw';
  return 'playing';
}

/** Taşlara benzersiz ID ata */
function initializePieceIds(game: Chess): Record<string, string> {
  const ids: Record<string, string> = {};
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const sq = (String.fromCharCode(97 + c) + (8 - r)) as Square;
        ids[sq] = `${p.color}${p.type}-${Math.random().toString(36).substr(2, 4)}`;
      }
    }
  }
  return ids;
}

/** Taş ID'lerini hamleye göre güncelle */
function updatePieceIds(currentIds: Record<string, string>, move: Move): Record<string, string> {
  const nextIds = { ...currentIds };
  const { from, to, flags } = move;

  // Ana taşı hareket ettir
  const pieceId = nextIds[from];
  if (pieceId) {
    nextIds[to] = pieceId;
    delete nextIds[from];
  }

  // Rok durumu - Kaleyi de hareket ettir
  if (flags.includes('k')) { // King side
    const rFrom = ('h' + from[1]) as Square;
    const rTo = ('f' + from[1]) as Square;
    if (nextIds[rFrom]) {
      nextIds[rTo] = nextIds[rFrom];
      delete nextIds[rFrom];
    }
  } else if (flags.includes('q')) { // Queen side
    const rFrom = ('a' + from[1]) as Square;
    const rTo = ('d' + from[1]) as Square;
    if (nextIds[rFrom]) {
      nextIds[rTo] = nextIds[rFrom];
      delete nextIds[rFrom];
    }
  }

  // En passant - Ekstra taşı sil
  if (flags.includes('e')) {
    const epSq = (to[0] + from[1]) as Square;
    delete nextIds[epSq];
  }

  return nextIds;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  game: new Chess(),
  fen: new Chess().fen(),
  history: [],
  status: 'playing',
  turn: 'w',
  gameMode: 'ai',
  isGameStarted: false,
  
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  kingInCheck: null,
  
  pendingPromotion: null,
  
  aiEnabled: true,
  aiThinking: false,
  aiDepth: 3,
  theme: 'dark',
  soundEnabled: true,
  showLegalMoves: true,
  pieceIds: initializePieceIds(new Chess()),

  // Timer Actions
  timer: 30,
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  resetTimer: () => set({ timer: 30 }),

  toggleLegalMoves: () => set((state) => ({ showLegalMoves: !state.showLegalMoves })),

  getLegalMovesFrom: (square: Square): Square[] => {
    const { game } = get();
    const moves = game.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  },

  selectSquare: (square: Square) => {
    const state = get();
    const { game, selectedSquare, aiThinking, status } = state;
    
    if (status !== 'playing' || aiThinking) return;
    if (state.gameMode === 'ai' && game.turn() === 'b') return;

    const piece = game.get(square);

    // Eğer zaten seçili bir kare varsa ve tıklanan yere legal hamle varsa
    if (selectedSquare) {
      const legalMoves = state.getLegalMovesFrom(selectedSquare);
      if (legalMoves.includes(square)) {
        // Terfi kontrolü
        const movingPiece = game.get(selectedSquare);
        if (
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && square[1] === '8') ||
           (movingPiece.color === 'b' && square[1] === '1'))
        ) {
          set({ pendingPromotion: { from: selectedSquare, to: square } });
          return;
        }
        state.makeMove(selectedSquare, square);
        return;
      }
    }

    // Kendi taşını seç
    if (piece && piece.color === game.turn()) {
      const legalMoves = state.getLegalMovesFrom(square);
      set({ selectedSquare: square, legalMoves });
    } else {
      set({ selectedSquare: null, legalMoves: [] });
    }
  },

  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => {
    const state = get();
    const { game, soundEnabled } = state;

    try {
      const move = game.move({ from, to, promotion: promotion || undefined });
      if (!move) return;

      // Ses efektleri
      if (soundEnabled) {
        if (promotion) {
          playPromoteSound();
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          playCastleSound();
        } else if (move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }

      const newStatus = getGameStatus(game);
      const isInCheck = game.inCheck();
      const kingSquare = isInCheck ? findKingSquare(game, game.turn()) : null;

      if (soundEnabled && isInCheck && newStatus === 'playing') {
        playCheckSound();
      }
      if (soundEnabled && newStatus !== 'playing') {
        setTimeout(playGameOverSound, 300);
      }

      set({
        fen: game.fen(),
        history: game.history({ verbose: true }) as Move[],
        status: newStatus,
        turn: game.turn(),
        selectedSquare: null,
        legalMoves: [],
        lastMove: { from, to },
        kingInCheck: kingSquare,
        pendingPromotion: null,
        pieceIds: updatePieceIds(state.pieceIds, move),
        timer: 30, // Reset timer on move
      });

      // AI hamlesi
      if (newStatus === 'playing' && state.gameMode === 'ai' && game.turn() === 'b') {
        set({ aiThinking: true });
        findBestMoveAsync(game.fen(), state.aiDepth).then((aiMove) => {
          const currentState = get();
          // Oyun sıfırlanmış veya mod değişmiş olabilir
          if (!currentState.isGameStarted || currentState.gameMode !== 'ai') {
            set({ aiThinking: false });
            return;
          }
          if (aiMove) {
            if (currentState.status === 'playing' && currentState.gameMode === 'ai') {
              currentState.makeMove(aiMove.from as Square, aiMove.to as Square, aiMove.promotion as PieceSymbol | undefined);
            }
          }
          set({ aiThinking: false });
        });
      }
    } catch {
      // Geçersiz hamle - sessizce geç
    }
  },

  handlePromotion: (piece: PieceSymbol) => {
    const state = get();
    const promo = state.pendingPromotion;
    if (!promo) return;
    state.makeMove(promo.from, promo.to, piece);
  },

  cancelPromotion: () => {
    set({ pendingPromotion: null, selectedSquare: null, legalMoves: [] });
  },

  undoMove: () => {
    const state = get();
    const { game, gameMode } = state;
    
    // Yetersiz hamle kontrolü
    const historyLen = game.history().length;
    if (gameMode === 'ai' && historyLen < 2) return;
    if (gameMode === 'pvp' && historyLen < 1) return;

    // AI modunda 2 hamle geri al (oyuncunun ve AI'ın hamlesi)
    if (gameMode === 'ai') {
      game.undo();
      game.undo();
    } else {
      game.undo();
    }

    const isInCheck = game.inCheck();
    const kingSquare = isInCheck ? findKingSquare(game, game.turn()) : null;
    const hist = game.history({ verbose: true }) as Move[];
    const lastHistMove = hist.length > 0 ? hist[hist.length - 1] : null;

    set({
      fen: game.fen(),
      history: hist,
      status: getGameStatus(game),
      turn: game.turn(),
      selectedSquare: null,
      legalMoves: [],
      lastMove: lastHistMove ? { from: lastHistMove.from, to: lastHistMove.to } : null,
      kingInCheck: kingSquare,
      aiThinking: false,
      pieceIds: initializePieceIds(game), // Geri alma sonrası senkronize et
      timer: 30,
    });
  },

  resetGame: () => {
    const newGame = new Chess();
    set({
      game: newGame,
      fen: newGame.fen(),
      history: [],
      status: 'playing',
      turn: 'w',
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      kingInCheck: null,
      pendingPromotion: null,
      aiThinking: false,
      isGameStarted: false, // Reset ana ekrana döndürür
      pieceIds: initializePieceIds(newGame),
      timer: 30,
    });
  },

  startGame: (mode: GameMode) => {
    const newGame = new Chess();
    set({
      game: newGame,
      fen: newGame.fen(),
      history: [],
      status: 'playing',
      turn: 'w', // Her zaman beyaz başlar
      gameMode: mode,
      aiEnabled: mode === 'ai', // Uyumluluk için
      isGameStarted: true,
      selectedSquare: null,
      legalMoves: [],
      lastMove: null,
      kingInCheck: null,
      pendingPromotion: null,
      showLegalMoves: true, // Varsayılan açık
      aiThinking: false,
      pieceIds: initializePieceIds(newGame),
      timer: 30,
    });
  },

  toggleAI: () => {
    set((s) => ({ aiEnabled: !s.aiEnabled }));
  },

  toggleTheme: () => {
    set((s) => {
      const newTheme = s.theme === 'dark' ? 'light' : 'dark';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    });
  },

  toggleSound: () => {
    set((s) => ({ soundEnabled: !s.soundEnabled }));
  },

  setAiDepth: (depth: number) => {
    set({ aiDepth: depth });
  },
}));

// Başlangıçta dark tema uygula
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}
