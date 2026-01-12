const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Usar timestamp para evitar colisiones
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Almacenamiento en memoria (puedes cambiar a Redis/MongoDB)
const rooms = new Map();

// Configuración por defecto de puntuaciones
const defaultScores = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

// REST API - Crear sala
app.post('/api/rooms', (req, res) => {
  const { roomName, creatorName, customScores } = req.body;
  const roomId = Math.random().toString(36).substring(2, 9);

  rooms.set(roomId, {
    id: roomId,
    name: roomName,
    scores: customScores || defaultScores,
    users: [],
    votes: new Map(),
    revealed: false,
    currentStory: '',
    createdAt: Date.now()
  });

  console.log(`Sala creada: ${roomId} - ${roomName}`);
  res.json({ roomId, room: rooms.get(roomId) });
});

// REST API - Subir imagen
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ninguna imagen' });
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// REST API - Obtener sala
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  res.json(room);
});

// REST API - Actualizar puntuaciones de la sala
app.put('/api/rooms/:roomId/scores', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  room.scores = req.body.scores;
  io.to(req.params.roomId).emit('scoresUpdated', room.scores);
  console.log(`Puntuaciones actualizadas en sala ${req.params.roomId}:`, room.scores);
  res.json({ success: true, scores: room.scores });
});

// WebSocket - Gestión de conexiones
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Unirse a sala
  socket.on('joinRoom', ({ roomId, userName, avatarUrl }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Sala no encontrada');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    const user = {
      id: socket.id,
      name: userName,
      avatar: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
      connected: true
    };

    room.users.push(user);
    console.log(`${userName} se unió a la sala ${roomId}`);

    io.to(roomId).emit('roomState', {
      users: room.users,
      votes: Array.from(room.votes.entries()),
      revealed: room.revealed,
      currentStory: room.currentStory,
      scores: room.scores
    });
  });

  // Emitir voto
  socket.on('vote', ({ roomId, vote }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.votes.set(socket.id, { userName: socket.userName, vote, voted: true });
    console.log(`${socket.userName} votó: ${vote} (oculto)`);

    // Enviar estado actualizado sin revelar votos
    io.to(roomId).emit('voteUpdate', {
      userId: socket.id,
      voted: true,
      revealed: room.revealed
    });
  });

  // Revelar votos
  socket.on('revealVotes', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.revealed = true;
    const votes = Array.from(room.votes.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.userName,
      vote: data.vote
    }));

    console.log(`Votos revelados en sala ${roomId}:`, votes);
    io.to(roomId).emit('votesRevealed', { votes });
  });

  // Resetear votación
  socket.on('resetVotes', ({ roomId, newStory }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.votes.clear();
    room.revealed = false;
    room.currentStory = newStory || '';

    console.log(`Votación reseteada en sala ${roomId}`);
    io.to(roomId).emit('votesReset', { currentStory: room.currentStory });
  });

  // Actualizar avatar
  socket.on('updateAvatar', ({ roomId, avatarUrl }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.find(u => u.id === socket.id);
    if (user) {
      user.avatar = avatarUrl;
      console.log(`${socket.userName} actualizó su avatar`);
      io.to(roomId).emit('userUpdated', { userId: socket.id, avatar: avatarUrl });
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        console.log(`${socket.userName} salió de la sala ${socket.roomId}`);
        room.users = room.users.filter(u => u.id !== socket.id);
        room.votes.delete(socket.id);
        io.to(socket.roomId).emit('userLeft', { userId: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
