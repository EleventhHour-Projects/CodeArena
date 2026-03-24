import express from 'express';
import http from "http";
import { Server } from "socket.io";
import internalRoutes from './routes/internalRoutes.js';
import { setIO } from "./services/emitter.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/internal', internalRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("user connected");

  socket.on("JOIN_BATTLE", ({ battleId, userId }) => {
    socket.join(battleId);
    socket.data.userId = userId;

    console.log(`User ${userId} joined ${battleId}`);
  });
  socket.on("disconnect", () => {
    console.log(`User ${socket.data?.userId} disconnected`);
  });
});

setIO(io);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});