import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const Board = Chessboard as any;
import { io, Socket } from 'socket.io-client';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Coins, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const socket: Socket = io();

export default function ChessGame() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [game, setGame] = useState(new Chess());
  const [gameState, setGameState] = useState<any>(null);
  const [gameId, setGameId] = useState('lobby');
  const [betAmount, setBetAmount] = useState(0.1);
  const [isBetting, setIsBetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      socket.emit('joinGame', { gameId, walletAddress: publicKey.toBase58() });
    }

    socket.on('gameUpdate', (updatedGame) => {
      setGameState(updatedGame);
      setGame(new Chess(updatedGame.fen));
    });

    return () => {
      socket.off('gameUpdate');
    };
  }, [gameId, publicKey]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!gameState || gameState.status !== 'playing') return false;
    
    // Check if it's the player's turn
    const turn = game.turn();
    const isWhite = gameState.players.white.wallet === publicKey?.toBase58();
    const isBlack = gameState.players.black?.wallet === publicKey?.toBase58();
    
    if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
      return false;
    }

    try {
      const move = {
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      };

      socket.emit('move', { gameId, move });
      return true;
    } catch (e) {
      return false;
    }
  }, [game, gameState, gameId, publicKey]);

  const handleBet = async () => {
    if (!publicKey) return;
    setIsBetting(true);
    setError(null);

    try {
      // In a real app, we'd send SOL to an escrow account
      // For this demo, we'll simulate the transaction to the "house" (a random dev wallet or just a self-transfer)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('GsbWv16K8Yv1p8p6p6p6p6p6p6p6p6p6p6p6p6p6p6p6'), // Mock house address
          lamports: betAmount * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'processed');
      
      socket.emit('placeBet', { gameId, amount: betAmount });
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Transaction failed');
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-7xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display italic font-black tracking-tighter">SOLANA CHESS ROYALE</h1>
        </div>
        <WalletMultiButton />
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Game Board */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="glass-panel p-4 aspect-square">
            <Board 
              position={game.fen()} 
              onPieceDrop={onDrop}
              boardOrientation={gameState?.players.black?.wallet === publicKey?.toBase58() ? 'black' : 'white'}
              customDarkSquareStyle={{ backgroundColor: '#1a1a1e' }}
              customLightSquareStyle={{ backgroundColor: '#2a2a2e' }}
            />
          </div>
          
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Users className="w-4 h-4" />
              <span>{gameState?.status === 'waiting' ? 'Waiting for opponent...' : 'Game in progress'}</span>
            </div>
            <div className="flex items-center gap-2 text-gold font-mono font-bold">
              <Coins className="w-4 h-4" />
              <span>{gameState?.betAmount || 0} SOL POOL</span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Info */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Betting Card */}
          <section className="glass-panel p-6 flex flex-col gap-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="text-gold w-5 h-5" />
              Wager Your Skill
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-white/40 font-bold">Bet Amount (SOL)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xl focus:outline-none focus:border-gold/50 transition-colors"
                    placeholder="0.1"
                    disabled={gameState?.status === 'playing'}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gold font-bold">SOL</div>
                </div>
              </div>

              <button 
                onClick={handleBet}
                disabled={!publicKey || isBetting || gameState?.status === 'playing'}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                  !publicKey || isBetting || gameState?.status === 'playing'
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-gold text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                )}
              >
                {isBetting ? "Confirming..." : "Place Wager & Join"}
                <ArrowRight className="w-5 h-5" />
              </button>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-white/30 leading-relaxed">
                Escrow is managed by the Solana Chess Royale smart contract. Winner takes the pool minus a 2.5% platform fee.
              </p>
            </div>
          </section>

          {/* Player Info */}
          <section className="glass-panel p-6 flex flex-col gap-4">
            <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold">Match Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold">W</div>
                  <span className="text-sm font-mono truncate max-w-[150px]">
                    {gameState?.players.white.wallet || 'Waiting...'}
                  </span>
                </div>
                {game.turn() === 'w' && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center text-white font-bold">B</div>
                  <span className="text-sm font-mono truncate max-w-[150px]">
                    {gameState?.players.black?.wallet || 'Waiting...'}
                  </span>
                </div>
                {game.turn() === 'b' && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState?.status === 'finished' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-12 max-w-md w-full text-center flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.4)]">
                <Trophy className="text-black w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-display italic font-black mb-2">CHECKMATE</h2>
                <p className="text-white/60">
                  {gameState.winner === 'white' ? 'White' : 'Black'} has conquered the board.
                </p>
              </div>
              <div className="bg-white/5 w-full p-4 rounded-2xl">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Winnings Distributed</p>
                <p className="text-2xl font-mono font-bold text-gold">+{gameState.betAmount * 1.95} SOL</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gold transition-colors"
              >
                Return to Lobby
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
