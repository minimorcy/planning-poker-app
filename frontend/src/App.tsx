import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import './App.css';

const API_URL = 'http://localhost:3001';
const PREFIX_IMG = 'img:';
let socket: Socket;

interface ScoreOption {
  display: string; // url or text
  value: number;
  type: 'image' | 'text';
}

const DEFAULT_SCORES: ScoreOption[] = [
  { display: `${API_URL}/uploads/pokeball.png`, value: 1, type: 'image' },
  { display: `${API_URL}/uploads/greatball.png`, value: 2, type: 'image' },
  { display: `${API_URL}/uploads/ultraball.png`, value: 5, type: 'image' },
  { display: `${API_URL}/uploads/masterball.png`, value: 8, type: 'image' },
  { display: `${API_URL}/uploads/beastball.png`, value: 13, type: 'image' }, // Using Beast Ball as Enteball
];

// Componente: Editor de Puntuaciones con soporte para imágenes y pesos
function ScoreEditor({ value, onChange }: { value: ScoreOption[], onChange: (val: ScoreOption[]) => void }) {
  const [newText, setNewText] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

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

      <div className="add-score-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
        return JSON.parse(saved);
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
  userName: string;
  vote: ScoreOption; // Updated to store the full object
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
  const [scores, setScores] = useState<ScoreOption[]>([]);
  const [selectedVote, setSelectedVote] = useState<ScoreOption | null>(null);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [editingScores, setEditingScores] = useState(false);
  const [newScores, setNewScores] = useState('');
  const [showAvatarInput, setShowAvatarInput] = useState(false);

  useEffect(() => {
    if (!roomId || !isJoined || !userName) return;

    socket = io(API_URL);

    socket.emit('joinRoom', { roomId, userName });

    socket.on('roomState', (state) => {
      setUsers(state.users);
      setVotes(new Map(state.votes as [string, Vote][]));
      setRevealed(state.revealed);
      setCurrentStory(state.currentStory);
      setScores(state.scores);
    });

    socket.on('voteUpdate', ({ userId, voted }) => {
      setVotes(prev => new Map(prev).set(userId, { voted }));
    });

    socket.on('votesRevealed', ({ votes: revealedVotes }) => {
      const votesMap = new Map(revealedVotes.map((v: Vote) => [v.userId, v]));
      setVotes(votesMap);
      setRevealed(true);
    });

    socket.on('votesReset', ({ currentStory: story }) => {
      setVotes(new Map<string, any>());
      setRevealed(false);
      setSelectedVote(null);
      setCurrentStory(story);
    });

    socket.on('scoresUpdated', (updatedScores) => {
      setScores(updatedScores);
      setNewScores(updatedScores.join(', '));
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

  const resetVotes = () => {
    const story = prompt('Nombre de la nueva historia (opcional):');
    socket.emit('resetVotes', { roomId, newStory: story || '' });
  };

  const updateAvatar = () => {
    if (newAvatarUrl.trim()) {
      socket.emit('updateAvatar', { roomId, avatarUrl: newAvatarUrl });
      setNewAvatarUrl('');
      setShowAvatarInput(false);
    }
  };

  const updateScores = async () => {
    const scoresArray = newScores.split(',').map(s => s.trim()).filter(s => s);
    await fetch(`${API_URL}/api/rooms/${roomId}/scores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: scoresArray })
    });
    setEditingScores(false);
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
        <button onClick={resetVotes} className="reset-btn">
          🔄 Nueva Votación
        </button>
        <button onClick={() => setEditingScores(!editingScores)} className="edit-btn">
          {editingScores ? '❌ Cancelar' : '⚙️ Editar Puntuaciones'}
        </button>
        <button onClick={() => setShowAvatarInput(!showAvatarInput)} className="avatar-btn">
          🖼️ Cambiar Avatar
        </button>
      </div>

      {editingScores && (
        <div className="edit-panel">
          <p>La edición de puntuaciones en sala está deshabilitada temporalmente en esta versión. Crea una nueva sala para cambiar las puntuaciones.</p>
        </div>
      )}

      {showAvatarInput && (
        <div className="edit-panel">
          <input
            type="text"
            placeholder="URL de tu avatar (https://...)"
            value={newAvatarUrl}
            onChange={(e) => setNewAvatarUrl(e.target.value)}
          />
          <button onClick={updateAvatar}>✓ Actualizar</button>
        </div>
      )}

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

      {revealed && getAverage() && (
        <div className="average">
          📊 Promedio: <strong>{getAverage()}</strong>
        </div>
      )}

      <div className="voting-section">
        <h3>Tu voto:</h3>
        <div className="cards-grid">
          {scores.map((score, idx) => (
            <button
              key={`${score.value}-${idx}`}
              className={`card ${selectedVote === score ? 'selected' : ''} ${revealed ? 'disabled' : ''}`}
              onClick={() => handleVote(score)}
              disabled={revealed}
            >
              {score.type === 'image' ? (
                <img src={score.display} alt="score" />
              ) : (
                score.display
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
