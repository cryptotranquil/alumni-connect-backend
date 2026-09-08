const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

/**
 * Attach Socket.IO to the HTTP server and register JWT auth on handshake.
 * Each authenticated client joins room `user:<userId>` for direct pushes.
 */
function initSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("auth_error"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.userId);
      next();
    } catch {
      next(new Error("auth_error"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  app.set("io", io);
  return io;
}

module.exports = initSocket;
