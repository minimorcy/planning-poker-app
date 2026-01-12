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
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

const bcrypt = require('bcryptjs');

app.use(express.json());

// Enable CORS
app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Intento de login para usuario: ${username}`);

    try {
        const htpasswdPath = path.join(__dirname, 'users.htpasswd');
        if (!fs.existsSync(htpasswdPath)) {
            console.warn('Archivo htpasswd no encontrado en:', htpasswdPath);
            // Fallback if file missing (dev mode only)
            if (username === 'admin' && password === 'password') {
                return res.json({ success: true });
            }
            return res.status(401).json({ success: false, message: 'Auth file missing' });
        }

        const data = fs.readFileSync(htpasswdPath, 'utf8');
        // Handle Windows CRLF by splitting on newline then trimming each line
        const lines = data.split('\n').map(l => l.trim()).filter(l => l);

        // Exact match for username + ':' prefix
        const userLine = lines.find(line => line.startsWith(username + ':'));

        if (!userLine) {
            console.log('Usuario no encontrado en htpasswd');
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Extract hash carefully
        const parts = userLine.split(':');
        if (parts.length < 2) {
            console.error('Formato inválido en htpasswd para usuario:', username);
            return res.status(401).json({ success: false, message: 'Error de configuración' });
        }
        const hash = parts[1].trim();

        // Compare
        const isValid = bcrypt.compareSync(password, hash);
        console.log(`Resultado validación password: ${isValid}`); // Don't log the password itself

        if (isValid) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        // Usar timestamp para evitar colisiones
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max
    },
    fileFilter: fileFilter
});

// Rate Limiting simple en memoria
const uploadLimits = new Map();
const LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_UPLOADS = 5; // 5 subidas por IP

// Limpieza periódica del rate limiter
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of uploadLimits.entries()) {
        if (now - data.firstUpload > LIMIT_WINDOW) {
            uploadLimits.delete(ip);
        }
    }
}, LIMIT_WINDOW);

// Almacenamiento en memoria (puedes cambiar a Redis/MongoDB)
const rooms = new Map();

// Configuración por defecto de puntuaciones
const defaultScores = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

// REST API - Crear sala
app.post('/api/rooms', (req, res) => {
    const { roomName, creatorName, customScores, config } = req.body;
    const roomId = Math.random().toString(36).substring(2, 9);

    rooms.set(roomId, {
        id: roomId,
        name: roomName,
        users: [],
        votes: new Map(),
        revealed: false,
        currentStory: '',
        config: config || { allowAvatarChange: false, allowScoreEdit: false },
        scores: customScores, // Fix: Save custom scores
        history: [],
        createdAt: Date.now()
    });

    console.log(`Sala creada: ${roomId} - ${roomName}`);
    res.json({ roomId, room: rooms.get(roomId) });
});

// REST API - Subir imagen con Rate Limiting y manejo de errores
app.post('/api/upload', (req, res) => {
    const ip = req.ip;
    const now = Date.now();

    // Rate Limit Check
    const userLimit = uploadLimits.get(ip) || { count: 0, firstUpload: now };

    if (now - userLimit.firstUpload > LIMIT_WINDOW) {
        // Reset window
        userLimit.count = 0;
        userLimit.firstUpload = now;
    }

    if (userLimit.count >= MAX_UPLOADS) {
        return res.status(429).json({ error: 'Demasiadas subidas. Intenta de nuevo en un minuto.' });
    }

    upload.single('image')(req, res, (err) => {
        // Incrementar contador solo si se intenta subir
        userLimit.count++;
        uploadLimits.set(ip, userLimit);

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo es demasiado grande (Max 2MB)' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: imageUrl });
    });
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
            scores: room.scores,
            config: room.config,
            history: room.history || []
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

        // Si no se ha revelado aún, calcular resultados y guardar en historial
        if (!room.revealed && room.votes.size > 0) {
            const numericVotes = Array.from(room.votes.values())
                .map(v => v.vote.value)
                .filter(v => v !== undefined && v !== null);

            if (numericVotes.length > 0) {
                const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

                // Encontrar tarjeta resultado
                const sortedScores = [...(room.scores || defaultScores)].sort((a, b) => a.value - b.value);
                const resultScore = sortedScores.find(s => s.value >= avg) || sortedScores[sortedScores.length - 1];

                if (!room.history) room.history = [];

                const roundNumber = room.history.length + 1;
                const storyTitle = room.currentStory ? `Tarea ${roundNumber}: ${room.currentStory}` : `Tarea ${roundNumber}`;

                room.history.push({
                    story: storyTitle,
                    average: avg.toFixed(1),
                    resultScore,
                    timestamp: Date.now()
                });

                console.log(`Historial actualizado en sala ${roomId}:`, room.history[room.history.length - 1]);
                io.to(roomId).emit('historyUpdate', room.history);
            }
        }

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

                // Clean up empty room
                if (room.users.length === 0) {
                    rooms.delete(socket.roomId);
                    console.log(`Sala eliminada por inactividad: ${socket.roomId}`);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
