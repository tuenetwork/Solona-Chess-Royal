import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { Chess } from "chess.js";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Game state storage
  const games = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinGame", ({ gameId, walletAddress }) => {
      let game = games.get(gameId);

      if (!game) {
        game = {
          id: gameId,
          fen: "start",
          players: {
            white: { id: socket.id, wallet: walletAddress },
            black: null
          },
          betAmount: 0,
          status: "waiting"
        };
        games.set(gameId, game);
      } else if (!game.players.black && game.players.white.id !== socket.id) {
        game.players.black = { id: socket.id, wallet: walletAddress };
        game.status = "playing";
      }

      socket.join(gameId);
      io.to(gameId).emit("gameUpdate", game);
    });

    socket.on("move", ({ gameId, move }) => {
      const game = games.get(gameId);
      if (!game) return;

      const chess = new Chess(game.fen);
      try {
        const result = chess.move(move);
        if (result) {
          game.fen = chess.fen();
          if (chess.isGameOver()) {
            game.status = "finished";
            game.winner = chess.turn() === 'w' ? 'black' : 'white'; // The one who just moved won or it's a draw
            if (chess.isCheckmate()) {
               // winner is the one who didn't just have their turn
            }
          }
          io.to(gameId).emit("gameUpdate", game);
        }
      } catch (e) {
        console.error("Invalid move", e);
      }
    });

    socket.on("placeBet", ({ gameId, amount }) => {
      const game = games.get(gameId);
      if (game) {
        game.betAmount = amount;
        io.to(gameId).emit("gameUpdate", game);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Handle cleanup if needed
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
