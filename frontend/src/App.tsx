import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './App.css';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// In production (not local), we use the same origin (no :3001 port) and expect Nginx to proxy /api requests
const API_URL = isLocal ? 'http://localhost:3001' : window.location.origin;
const PREFIX_IMG = 'img:';
let socket: Socket;

interface ScoreOption {
  display: string; // url or text
  value: number;
  type: 'image' | 'text';
  name?: string; // Optional name for tooltips/labels
}

const DEFAULT_SCORES: ScoreOption[] = [
  { display: `${API_URL}/uploads/pokeball.png`, value: 1, type: 'image', name: 'Pokeball' },
  { display: `${API_URL}/uploads/greatball.png`, value: 2, type: 'image', name: 'Superball' },
  { display: `${API_URL}/uploads/ultraball.png`, value: 5, type: 'image', name: 'Ultraball' },
  { display: `${API_URL}/uploads/masterball.png`, value: 8, type: 'image', name: 'Masterball' },
  { display: `${API_URL}/uploads/beastball.png`, value: 13, type: 'image', name: 'Ente Ball' },
];

// Componente: Editor de Puntuaciones con soporte para imágenes y pesos
function ScoreEditor({ value, onChange }: { value: ScoreOption[], onChange: (val: ScoreOption[]) => void }) {
  const [newText, setNewText] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [showAddScore, setShowAddScore] = useState(false);

  const addTextScore = () => {
    if (newText.trim()) {
      onChange([...value, { display: newText.trim(), value: newValue, type: 'text' }]);
      setNewText('');
      setNewValue(0);
    }
  };

  const removeScore = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        onChange([...value, { display: data.url, value: newValue, type: 'image' }]);
        setNewValue(0); // Reset value after add
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error subiendo imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="score-editor">
      <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#666' }}>
        Personalizar Puntuaciones
      </label>

      <div className="score-list">
        {value.map((score, idx) => (
          <div key={idx} className="score-item">
            <span className="score-value-badge" style={{ background: '#667eea', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.8em', marginRight: '5px' }}>
              {score.value}
            </span>
            {score.type === 'image' ? (
              <img src={score.display} alt="score" />
            ) : (
              <span>{score.display}</span>
            )}
            <button onClick={() => removeScore(idx)}>×</button>
          </div>
        ))}
        {value.length === 0 && <span style={{ color: '#999', padding: '10px' }}>Sin puntuaciones</span>}
      </div>

      <div className="config-section">
        <button
          onClick={() => setShowAddScore(!showAddScore)}
          className="config-toggle-btn"
          title="Añadir nuevas opciones"
        >
          ➕ Añadir Nueva Puntuación {showAddScore ? '▲' : '▼'}
        </button>

        <div className={`config-content ${showAddScore ? 'open' : ''}`}>
          <div className="add-score-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <label>Valor Interno:</label>
              <input
                type="number"
                value={newValue}
                onChange={e => setNewValue(Number(e.target.value))}
                style={{ width: '80px', padding: '8px' }}
              />
            </div>

            <div className="add-score-form">
              <input
                type="text"
                placeholder="Texto..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTextScore()}
              />
              <button onClick={addTextScore} className="secondary-btn" style={{ width: 'auto' }}>+ Texto</button>

              <label className="file-upload-btn">
                {uploading ? '⏳...' : '📷 Imagen'}
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



// Componente: Login
function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Intentando login contra:', `${API_URL}/api/login`);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin();
      } else {
        setError(data.message || 'Error de login');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>🔒 Acceso Restringido</h2>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p className="error-msg">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

// Componente: Crear Sala
function CreateRoom() {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  // Cargar puntuaciones guardadas o usar defecto
  const [customScores, setCustomScores] = useState<ScoreOption[]>(() => {
    const saved = localStorage.getItem('planningPokerScoresObj');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Fix old localhost URLs if now running elsewhere
        return parsed.map((s: ScoreOption) => {
          if (s.type === 'image' && s.display.includes('/uploads/')) {
            // Replace origin with current API_URL
            const parts = s.display.split('/uploads/');
            if (parts.length === 2) {
              return { ...s, display: `${API_URL}/uploads/${parts[1]}` };
            }
          }
          return s;
        });
      } catch (e) {
        return DEFAULT_SCORES;
      }
    }
    return DEFAULT_SCORES;
  });

  const navigate = useNavigate();

  const createRoom = async () => {
    if (!roomName.trim() || !userName.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Guardar puntuaciones para el futuro
    localStorage.setItem('planningPokerScoresObj', JSON.stringify(customScores));

    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        creatorName: userName,
        customScores: customScores
      })
    });

    const { roomId } = await response.json();
    navigate(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
  };

  const joinExistingRoom = () => {
    const roomId = prompt('Ingresa el ID de la sala:');
    if (roomId && userName.trim()) {
      navigate(`/room/${roomId}?name=${encodeURIComponent(userName)}`);
    } else {
      alert('Necesitas ingresar tu nombre y el ID de la sala');
    }
  };

  return (
    <div className="create-room">
      <h1>🃏 Planning Poker</h1>
      <p className="subtitle">Votación ágil para tu equipo</p>

      <div className="form-section">
        <input
          type="text"
          placeholder="Tu nombre"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Nombre de la sala"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />

        <ScoreEditor value={customScores} onChange={setCustomScores} />

        <button onClick={createRoom} className="primary-btn">Crear Sala Nueva</button>
        <button onClick={joinExistingRoom} className="secondary-btn">Unirse a Sala Existente</button>
      </div>
    </div>
  );
}

// Componente: Sala de Votación
interface User {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
}

interface Vote {
  userId: string;
  userName?: string;
  vote?: ScoreOption;
  voted?: boolean;
}

interface HistoryItem {
  story: string;
  average: string;
  resultScore: ScoreOption;
  timestamp: number;
}

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlName = searchParams.get('name');

  const [userName, setUserName] = useState(urlName || '');
  const [isJoined, setIsJoined] = useState(!!urlName);

  const [users, setUsers] = useState<User[]>([]);
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map());
  const [revealed, setRevealed] = useState(false);
  const [currentStory, setCurrentStory] = useState('');
  const [scores, setScores] = useState<ScoreOption[]>(DEFAULT_SCORES);
  const [roomConfig, setRoomConfig] = useState({ allowAvatarChange: false, allowScoreEdit: false });
  const [selectedVote, setSelectedVote] = useState<ScoreOption | null>(null);
  const [newScores, setNewScores] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStoryName, setResetStoryName] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarLoaded, setSidebarLoaded] = useState(false);

  // Result Modal State
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    // Enable sidebar transition after first render
    setTimeout(() => setSidebarLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (revealed) {
      setShowResultModal(true);
    } else {
      setShowResultModal(false);
    }
  }, [revealed]);

  useEffect(() => {
    if (!roomId || !isJoined || !userName) return;
    // ... (existing socket connection logic remains same)

    // Use polling in production to avoid WebSocket proxy issues with Apache
    socket = io(API_URL, {
      transports: isLocal ? ['websocket', 'polling'] : ['polling', 'websocket']
    });

    // Get saved avatar from localStorage or generate default
    const savedAvatar = localStorage.getItem('userAvatar');
    const avatarUrl = savedAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`;

    socket.emit('joinRoom', { roomId, userName, avatarUrl });

    socket.on('roomState', (state) => {
      if (!state) return;
      console.log('roomState received:', state);
      setUsers(state.users || []);
      setVotes(new Map(state.votes as [string, Vote][]) || new Map());
      setRevealed(state.revealed || false);
      setCurrentStory(state.currentStory || '');
      setScores(state.scores && state.scores.length > 0 ? state.scores : DEFAULT_SCORES);
      if (state.config) setRoomConfig(state.config);
      if (state.history) setHistory(state.history);
    });

    socket.on('voteUpdate', ({ userId, voted }) => {
      setVotes(prev => new Map(prev).set(userId, { userId, voted } as Vote));
    });

    socket.on('votesRevealed', ({ votes: revealedVotes }) => {
      if (!revealedVotes || !Array.isArray(revealedVotes)) return;
      const votesMap = new Map<string, Vote>(revealedVotes.map((v: Vote) => [v.userId, v]));
      setVotes(votesMap);
      setRevealed(true);
    });

    socket.on('votesReset', ({ currentStory: story }) => {
      setVotes(new Map<string, Vote>());
      setRevealed(false);
      setSelectedVote(null);
      setCurrentStory(story);
    });

    socket.on('scoresUpdated', (updatedScores) => {
      setScores(updatedScores);
      setNewScores(updatedScores.join(', '));
    });

    socket.on('historyUpdate', (updatedHistory: HistoryItem[]) => {
      setHistory(updatedHistory);
    });

    socket.on('userLeft', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setVotes(prev => {
        const newVotes = new Map(prev);
        newVotes.delete(userId);
        return newVotes;
      });
    });

    socket.on('userUpdated', ({ userId, avatar }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar } : u));
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, isJoined, userName]);

  const joinRoom = () => {
    if (!userName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }
    // Actualizar URL sin recargar
    setSearchParams({ name: userName });
    setIsJoined(true);
  };

  const handleVote = (vote: ScoreOption) => {
    if (revealed) return;
    setSelectedVote(vote);
    socket.emit('vote', { roomId, vote });
  };

  const revealVotes = () => {
    socket.emit('revealVotes', { roomId });
  };

  const requestReset = () => {
    if (confirmReset) {
      setResetStoryName('');
      setShowResetModal(true);
    } else {
      socket.emit('resetVotes', { roomId, newStory: '' });
    }
  };

  const traverseReset = () => {
    socket.emit('resetVotes', { roomId, newStory: resetStoryName });
    setShowResetModal(false);
  };

  const updateScores = async () => {
    const scoresArray = newScores.split(',').map(s => s.trim()).filter(s => s);
    await fetch(`${API_URL}/api/rooms/${roomId}/scores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: scoresArray })
    });
  };

  const getAverage = () => {
    if (!revealed) return null;
    const numericVotes = Array.from(votes.values())
      .map(v => v.vote.value)
      .filter(v => v !== undefined && v !== null);

    if (numericVotes.length === 0) return null;
    const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

    // Find closest score rounding up
    const roundedAvg = Math.ceil(avg);
    const sortedScores = [...scores].sort((a, b) => a.value - b.value);
    const resultScore = sortedScores.find(s => s.value >= avg) || sortedScores[sortedScores.length - 1];

    if (!resultScore) return avg.toFixed(1);

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexDirection: 'column' }}>
        <span>Media: {avg.toFixed(1)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <span>Resultado:</span>
          {resultScore.type === 'image' ? (
            <img src={resultScore.display} alt="result" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{resultScore.display}</span>
          )}
        </div>
      </div>
    );
  };

  const copyRoomLink = () => {
    const link = window.location.href.split('?')[0];
    navigator.clipboard.writeText(link);
    alert('¡Link copiado al portapapeles!');
  };

  if (!isJoined) {
    return (
      <div className="create-room">
        <h1>🃏 Unirse a Sala</h1>
        <p className="subtitle">ID: {roomId}</p>
        <div className="form-section">
          <input
            type="text"
            placeholder="Tu nombre"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button onClick={joinRoom} className="primary-btn">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="room">
      <div className="room-header">
        <h2>🃏 Planning Poker</h2>
        <div className="room-id">
          <span>ID de Sala: <strong>{roomId}</strong></span>
          <button onClick={copyRoomLink} className="copy-btn">📋 Copiar Link</button>
        </div>
        {currentStory && <h3 className="current-story">📖 {currentStory}</h3>}
      </div>

      <div className="room-controls">
        <button onClick={revealVotes} disabled={revealed || votes.size === 0} className="reveal-btn">
          👁️ Revelar Votos
        </button>
        <button onClick={requestReset} className="reset-btn">
          🔄 Nueva Votación
        </button>
        <label className="checkbox-label" title="Pedir confirmación al resetear">
          <input
            type="checkbox"
            checked={confirmReset}
            onChange={e => setConfirmReset(e.target.checked)}
          /> Título tarea
        </label>
      </div>

      {
        showResetModal && (
          <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-content" style={{
              background: '#242424',
              border: '1px solid #333',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.4em', marginBottom: '20px', textAlign: 'center' }}>🔄 Nueva Votación</h3>

              <div style={{ marginBottom: '25px' }}>
                <input
                  type="text"
                  placeholder="Nombre de la historia (opcional)"
                  value={resetStoryName}
                  onChange={(e) => setResetStoryName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && traverseReset()}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    background: '#1a1a1a',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#646cff';
                    e.target.style.boxShadow = '0 0 0 2px rgba(100, 108, 255, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#444';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="secondary-btn"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={traverseReset}
                  className="primary-btn"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      }

      <div className="participants">
        <h3>👥 Participantes ({users.length})</h3>
        <div className="users-grid">
          {users.map(user => {
            const userVote = votes.get(user.id);
            return (
              <div key={user.id} className="user-card">
                <img src={user.avatar} alt={user.name} className="avatar" />
                <p className="user-name">{user.name}</p>
                {userVote ? (
                  <div className="vote-status">
                    {revealed ? (
                      <span className="vote-revealed">
                        {userVote.vote.type === 'image' ? (
                          <img src={userVote.vote.display} alt="vote" className="vote-reveal-image" />
                        ) : (
                          userVote.vote.display
                        )}
                        <span style={{ display: 'block', fontSize: '0.6em', marginTop: '4px', color: '#eee' }}>(Val: {userVote.vote.value})</span>
                      </span>
                    ) : (
                      <span className="vote-hidden">✓ Votó</span>
                    )}
                  </div>
                ) : (
                  <span className="vote-pending">⏳ Esperando...</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {
        showResultModal && revealed && (
          <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="modal-content" style={{
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              padding: '40px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: '85vh',  // Prevent modal from exceeding screen height
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',  // Allow scrolling within modal if needed
              position: 'relative',
              animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              {/* Confetti Effect */}
              <img
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                onLoad={(e) => {
                  // Hack to trigger one-off confetti when this component mounts/is revealed
                  const fireConfetti = () => {
                    // Check if confetti global exists
                    // @ts-ignore
                    if (window.confetti) {
                      // @ts-ignore
                      window.confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
                      });
                    } else {
                      // Load script if not present
                      const script = document.createElement('script');
                      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
                      script.onload = () => {
                        // @ts-ignore
                        window.confetti({
                          particleCount: 150,
                          spread: 70,
                          origin: { y: 0.6 }
                        });
                      };
                      document.body.appendChild(script);
                    }
                  };
                  fireConfetti();
                }}
                style={{ display: 'none' }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  transition: 'background 0.2s',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
                onClick={() => setShowResultModal(false)}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e0e0e0';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                  e.currentTarget.style.color = '#666';
                }}
              >✕</div>

              <h2 style={{
                marginTop: 0,
                color: '#333',
                fontSize: '2em',
                marginBottom: '10px'
              }}>
                🎉 Resultado Final
              </h2>

              <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{ transform: 'scale(1.2)' }}>
                  {getAverage()}
                </div>

                <div style={{
                  width: '100%',
                  marginTop: '15px',
                  borderTop: '1px solid #eee',
                  paddingTop: '15px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px' }}>Votos</h4>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    justifyContent: 'center',
                    maxHeight: '200px', // Increased slightly, but modal max-height protects screen
                    overflowY: 'auto',
                    padding: '5px'
                  }}>
                    {users.map(user => {
                      const v = votes.get(user.id);
                      // Only show users who voted
                      if (!v) return null;
                      return (
                        <div key={user.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f5f5f7',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          border: '1px solid #e1e1e1',
                          fontSize: '0.85em'
                        }}>
                          <img src={user.avatar} alt={user.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                          <span style={{ fontWeight: 500, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#646cff', marginLeft: '2px', display: 'flex', alignItems: 'center' }}>
                            {v.vote.type === 'image' ? (
                              <img src={v.vote.display} alt="vote" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                            ) : (
                              v.vote.display
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="primary-btn"
                style={{
                  maxWidth: '200px',
                  margin: '0 auto',
                  background: 'linear-gradient(45deg, #646cff, #9089fc)',
                  border: 'none',
                  boxShadow: '0 8px 16px rgba(100, 108, 255, 0.3)',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  padding: '12px 30px'
                }}
              >
                ¡Genial!
              </button>
            </div>
          </div>
        )
      }

      <div className="voting-section">
        <h3>Tu voto:</h3>
        <div className="cards-grid">
          {scores.map((score, idx) => (
            <button
              key={`${score.value}-${idx}`}
              className={`card ${selectedVote === score ? 'selected' : ''} ${revealed ? 'disabled' : ''}`}
              onClick={() => handleVote(score)}
              disabled={revealed}
              title={score.name || score.display}
            >
              {score.type === 'image' ? (
                <div className="card-content">
                  <img src={score.display} alt={score.name || 'score'} />
                  {score.name && (
                    <span
                      className="card-label"
                      style={{
                        color: selectedVote === score ? '#ffffff' : 'inherit',
                        fontWeight: selectedVote === score ? 'bold' : 'normal'
                      }}
                    >
                      {score.name}
                    </span>
                  )}
                </div>
              ) : (
                score.display
              )}
            </button>
          ))}
        </div>
      </div>

      {/* History Toggle Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 1000,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: '#646cff',
          color: 'white',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        title="Ver Historial"
      >
        📜
      </button>

      {/* History Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0, // Always anchored right
        width: '320px',
        height: '100%',
        background: '#1a1a1a',
        boxShadow: '-5px 0 15px rgba(0,0,0,0.5)',
        // Use transform for performance and cleaner state handling
        transform: showHistory ? 'translateX(0)' : 'translateX(100%)',
        // Only animate transform. Ensure no transition on load (sidebarLoaded logic can stay or be simplified if transform works better)
        transition: sidebarLoaded ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none',
        zIndex: 999,
        padding: '20px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        borderLeft: '1px solid #333',
        // visibility hidden when closed ensures no interaction/focus issues
        visibility: showHistory ? 'visible' : 'hidden',
        // Delay visibility transition to match transform to prevent "disappearing" before sliding out
        transitionProperty: 'transform, visibility',
        transitionDuration: '0.3s',
        transitionDelay: showHistory ? '0s' : '0s'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#999' }}>📜 Historial</h3>
          <button
            onClick={() => setShowHistory(false)}
            style={{ background: 'transparent', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#999' }}
          >
            ✕
          </button>
        </div>

        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {history.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>Aún no hay votaciones registradas.</p>
          ) : (
            history.slice().reverse().map((item, idx) => (
              <div key={idx} className="history-item" style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#ffffff' }}>
                    {item.story || `Votación #${history.length - idx}`}
                  </span>
                  <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.9em', color: '#ccc' }}>Media: <strong>{item.average}</strong></span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8em', color: '#888' }}>Resultado:</span>
                    {item.resultScore.type === 'image' ? (
                      <img src={item.resultScore.display} alt="result" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#fff' }}>{item.resultScore.display}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div >
  );
}

// Componente: Ajustes Globales (Botón flotante)
function GlobalSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const location = window.location; // Usamos window.location para detectar si estamos en una sala por la URL

  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return localStorage.getItem('userAvatar') || '';
  });

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleUpdateAvatar = () => {
    if (newAvatarUrl.trim()) {
      localStorage.setItem('userAvatar', newAvatarUrl.trim());
      setCurrentAvatar(newAvatarUrl.trim());

      // Si estamos en una sala, intentar emitir evento via socket global si existe
      // Nota: 'socket' es una variable global en este archivo.
      // Una forma más robusta sería usar un Context, pero para este MVP:
      if (socket && socket.connected) {
        // Extraer roomId de la URL si es posible
        const pathParts = location.pathname.split('/');
        const roomIndex = pathParts.indexOf('room');
        if (roomIndex !== -1 && pathParts[roomIndex + 1]) {
          const roomId = pathParts[roomIndex + 1];
          socket.emit('updateAvatar', { roomId, avatarUrl: newAvatarUrl.trim() });
        }
      }

      setNewAvatarUrl('');
      setShowAvatarInput(false);
      setIsOpen(false);

      // Forzar recarga si estamos en create room para actualizar la vista previa si la hubiera
      // O simplemente confiar en que el usuario verá el cambio en la siguiente acción.
    }
  };

  return (
    <div className="global-settings" style={{ position: 'fixed', bottom: '30px', left: '30px', zIndex: 1000 }}>
      <button
        onClick={toggleOpen}
        style={{
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          fontSize: '1.2em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Ajustes"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-dropdown" style={{
          position: 'absolute',
          bottom: '60px',
          left: '0',
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          width: '250px',
          color: '#333'
        }}>
          <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Ajustes</h4>

          <div className="setting-item">
            <p style={{ fontSize: '0.9em', marginBottom: '5px' }}>Tu Avatar:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <img
                src={currentAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}
                alt="Current Avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd' }}
              />
              <button
                onClick={() => setShowAvatarInput(!showAvatarInput)}
                style={{ fontSize: '0.8em', padding: '4px 8px' }}
              >
                Cambiar
              </button>
            </div>

            {showAvatarInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <input
                  type="text"
                  placeholder="URL de imagen..."
                  value={newAvatarUrl}
                  onChange={e => setNewAvatarUrl(e.target.value)}
                  style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button onClick={handleUpdateAvatar} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth_token') === 'true';
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('auth_token', 'true');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <GlobalSettings />
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
