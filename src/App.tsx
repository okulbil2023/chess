import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "./store/useGameStore";
import ChessBoard from "./components/ChessBoard";
import { PieceMap } from "./assets/pieces";
import aiIcon from "./assets/ai_icon.png";
import { playGameOverSound } from "./utils/sounds";

function App() {
  const {
    isGameStarted,
    startGame,
    gameMode,
    turn,
    status,
    undoMove,
    resetGame,
    toggleAI,
    aiEnabled,
    aiThinking,
    aiDepth,
    setAiDepth,
    toggleSound,
    soundEnabled,
    history,
    kingInCheck,
    timer,
    decrementTimer,
  } = useGameStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isGameStarted && status === 'playing') {
      interval = setInterval(() => {
        if (useGameStore.getState().timer > 0) {
          decrementTimer();
        } else {
          // Timeout handling
          useGameStore.setState({ status: 'timeout' });
          if (soundEnabled) playGameOverSound();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isGameStarted, status, decrementTimer, soundEnabled]);

  // Status icon
  const getStatusIcon = () => {
    if (status === "checkmate") return "👑";
    if (status === "stalemate" || status === "draw") return "🤝";
    if (status === "playing") {
      if (kingInCheck) return "⚠️";
      if (aiThinking) return (
        <img 
          src={aiIcon} 
          alt="AI" 
          className="w-10 h-10 object-contain drop-shadow-md rounded-md" 
        />
      );
      return turn === "w" ? "⚪" : "⚫";
    }
    return "🏁";
  };

  // Status message
  const statusMessage = () => {
    if (status === "checkmate") return "Şah Mat!";
    if (status === "stalemate") return "Pat — Berabere";
    if (status === "draw") return "Berabere";
    if (status === "timeout") return "Süre Doldu!";
    if (status === "playing") {
      if (kingInCheck) return "Şah Çekildi!";
      if (aiThinking) return "AI Düşünüyor...";
      return turn === "w" ? "Beyaz Oynuyor" : "Siyah Oynuyor";
    }
    return "Oyun Bitti";
  };

  // Intro Screen
  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative selection:bg-purple-500/30 bg-gradient-animate">
        <motion.div 
          className="relative z-10 text-center space-y-12 max-w-6xl w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
              Oyun Modunu Seç
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
            <motion.div
              className="flex flex-col items-center gap-6"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <button
                onClick={() => startGame("ai")}
                className="btn-mode-circular glow-purple group"
              >
                <img 
                  src="/chess/ai_mode.png" 
                  alt="Bilgisayara Karşı Oyna" 
                  className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                />
              </button>
              <span className="text-xl font-bold text-white/80 group-hover:text-white transition-colors">BİLGİSAYARA KARŞI</span>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-6"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <button
                onClick={() => startGame("pvp")}
                className="btn-mode-circular glow-pink group"
              >
                <img 
                  src="/chess/pvp_mode.png" 
                  alt="Arkadaşınla Oyna" 
                  className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                />
              </button>
              <span className="text-xl font-bold text-white/80 group-hover:text-white transition-colors">ARKADAŞINLA OYNA</span>
            </motion.div>
          </div>
        </motion.div>
        
        <footer className="absolute bottom-8 text-center w-full text-white/20 text-sm font-medium">
          ❤️ Fatih hocanın öğrencilerine hediyesidir
        </footer>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-6 gap-4 relative overflow-hidden bg-[#1a1a2e]">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-6xl flex-1 z-10">
        {/* Board Container */}
        <div className="flex-1 flex justify-center w-full">
          <ChessBoard />
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          {/* Timer Display */}
          {isGameStarted && status !== 'checkmate' && status !== 'draw' && status !== 'stalemate' && (
            <div className="rounded-xl p-4 flex flex-col items-center justify-center space-y-1 relative overflow-hidden group" style={{
              background: 'linear-gradient(145deg, #2e3b26, #1a2517)', // Dark green gradient
              border: '1px solid rgba(100,200,100,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
               {/* Digital glow effect */}
               <div className="absolute inset-0 bg-green-500/5 blur-xl group-hover:bg-green-500/10 transition-colors duration-500" />
               
               <div className="relative z-10 flex flex-col items-center">
                 <span className="text-[10px] font-bold text-green-400/60 uppercase tracking-[0.2em] mb-1">
                   {turn === 'w' ? 'BEYAZ' : 'SİYAH'} SÜRE
                 </span>
                 <div className="font-mono text-5xl font-bold tracking-wider text-white tabular-nums drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                   00:{String(timer).padStart(2, '0')}
                 </div>
               </div>
               
               {/* Progress bar */}
               <div className="absolute bottom-0 left-0 h-1 bg-green-500/20 w-full">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timer / 30) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                  />
               </div>
            </div>
          )}

          {/* Status Card */}
          <div className="rounded-xl p-4 space-y-3" style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            <div className="flex justify-between items-center pb-3 border-b border-white/8">
              <span className="text-white/40 text-xs font-bold tracking-widest uppercase">
                Durum
              </span>

              {/* Mini Controls */}
              <div className="flex gap-1.5">
                <button
                  onClick={toggleSound}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 transition-colors text-sm"
                  title="Ses"
                >
                  {soundEnabled ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-300 transition-colors text-sm"
                  title="Çıkış"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="text-xl font-bold text-center py-1 relative flex items-center justify-center gap-3">
              <span className="text-2xl filter drop-shadow-lg scale-110">
                {getStatusIcon()}
              </span>
              <span className={`text-white/90 ${aiThinking ? 'italic' : ''}`}>
                {statusMessage()}
              </span>
              
              {/* AI Thinking animation dots */}
              {aiThinking && (
                 <div className="flex gap-1 ml-1 scale-75">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 thinking-dot" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 thinking-dot" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 thinking-dot" style={{ animationDelay: '0.3s' }} />
                 </div>
              )}
            </div>

            {/* Turn indicator */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                background: turn === 'w' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${turn === 'w' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <div className={`w-2.5 h-2.5 rounded-full ${turn === 'w' ? 'bg-white' : 'bg-gray-700 border border-gray-500'}`} />
                <span className="text-xs font-semibold text-white/60">
                  {turn === "w" ? "BEYAZ" : "SİYAH"} · Hamle {Math.ceil((history.length + 1) / 2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {gameMode === "ai" && (
              <button
                onClick={undoMove}
                disabled={aiThinking || history.length < 2}
                className="btn-control col-span-1 disabled:opacity-40 disabled:pointer-events-none"
              >
                ↩️ Geri Al
              </button>
            )}

            <button
              onClick={resetGame}
              className={`btn-control ${gameMode !== "ai" ? "col-span-2" : "col-span-1"}`}
              style={{
                background: 'rgba(124,58,237,0.6)',
                borderColor: 'rgba(124,58,237,0.4)',
              }}
            >
              🔄 Yeni Oyun
            </button>
          </div>

          {/* AI Settings */}
          {gameMode === "ai" && (
            <div className="rounded-xl p-4 space-y-3" style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white/70">
                  Yapay Zeka
                </span>
                <button
                  onClick={toggleAI}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors ${aiEnabled ? "bg-purple-500" : "bg-white/10"}`}
                >
                  <motion.div
                    layout
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    animate={{ x: aiEnabled ? 20 : 0 }}
                  />
                </button>
              </div>

              {aiEnabled && (
                <div className="space-y-2 pt-1">
                  <div className="text-center text-xs text-white/50 uppercase font-bold tracking-wider">
                    {aiDepth === 2 ? "KOLAY" : aiDepth === 3 ? "ORTA" : "ZOR"}
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="4"
                    value={aiDepth < 2 ? 2 : aiDepth > 4 ? 4 : aiDepth}
                    onChange={(e) => setAiDepth(Number(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 font-mono">
                    <span>KOLAY</span>
                    <span>ORTA</span>
                    <span>ZOR</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Alınan Taşlar */}
          {(() => {
            const captured = { white: [] as string[], black: [] as string[] };
            for (const move of history as { captured?: string; color: string }[]) {
              if (move.captured) {
                if (move.color === 'w') captured.white.push(move.captured);
                else captured.black.push(move.captured);
              }
            }
            const order: Record<string, number> = { q: 0, r: 1, b: 2, n: 3, p: 4 };
            captured.white.sort((a, b) => order[a] - order[b]);
            captured.black.sort((a, b) => order[a] - order[b]);
            const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
            const wScore = captured.white.reduce((s, p) => s + (vals[p] || 0), 0);
            const bScore = captured.black.reduce((s, p) => s + (vals[p] || 0), 0);
            const adv = wScore - bScore;
            const hasCaptured = captured.white.length > 0 || captured.black.length > 0;

            return (
              <div className="rounded-xl p-4 space-y-3" style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}>
                <span className="text-white/40 text-xs font-bold block tracking-widest uppercase">
                  Alınan Taşlar
                </span>
                {!hasCaptured && (
                  <span className="text-white/15 italic text-xs">Henüz taş alınmadı...</span>
                )}
                {/* Beyazın aldığı siyah taşlar */}
                {captured.white.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-gray-300 shrink-0" />
                    <div className="flex items-center gap-0 flex-wrap">
                      {captured.white.map((p, i) => {
                        const Comp = PieceMap[`b${p}`];
                        return Comp ? (
                          <div key={i} style={{ width: 22, height: 22, marginLeft: i > 0 ? -3 : 0 }}>
                            <Comp size={22} />
                          </div>
                        ) : null;
                      })}
                    </div>
                    {adv > 0 && <span className="text-white/40 text-xs ml-1">+{adv}</span>}
                  </div>
                )}
                {/* Siyahın aldığı beyaz taşlar */}
                {captured.black.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-800 border-2 border-gray-500 shrink-0" />
                    <div className="flex items-center gap-0 flex-wrap">
                      {captured.black.map((p, i) => {
                        const Comp = PieceMap[`w${p}`];
                        return Comp ? (
                          <div key={i} style={{ width: 22, height: 22, marginLeft: i > 0 ? -3 : 0 }}>
                            <Comp size={22} />
                          </div>
                        ) : null;
                      })}
                    </div>
                    {adv < 0 && <span className="text-white/40 text-xs ml-1">+{Math.abs(adv)}</span>}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-white/15 text-xs font-medium z-10">
        ❤️ Fatih Hocanın öğrencilerine hediyesidir.
      </footer>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-6"
              style={{
                background: 'linear-gradient(145deg, #252540, #1a1a30)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h3 className="text-xl font-bold text-center text-white">Oyundan Çık?</h3>
              <p className="text-center text-white/50 text-sm">
                Mevcut oyun ilerlemen kaybolacak. Ana menüye dönmek istiyor
                musun?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium border border-white/5 text-white/70"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    resetGame();
                    setShowExitConfirm(false);
                  }}
                  className="py-3 rounded-xl bg-red-500/80 hover:bg-red-500 transition-colors font-bold text-white shadow-lg shadow-red-900/20"
                >
                  Evet, Çık
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
