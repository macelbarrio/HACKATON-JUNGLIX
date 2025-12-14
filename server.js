const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Room = require('./models/Room'); // 👈 MODELO DE SALAS

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.static(__dirname + '/public'));

/* =========================
   MONGODB
========================= */
mongoose.connect('mongodb://localhost:27017/jocAfanoc')
  .then(() => console.log('MongoDB connectat'))
  .catch(err => console.error(err));

/* =========================
   REGISTRE
========================= */
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.json({ status: 'error', error: 'Falten dades' });
  }

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(email)) {
    return res.json({ status: 'error', error: 'Format de correu incorrecte' });
  }

  try {
    const userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.json({ status: 'error', error: 'El nom d’usuari ja existeix' });
    }

    const userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.json({ status: 'error', error: 'El correu ja existeix' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      color: Math.floor(Math.random() * 0xffffff)
    });

    res.json({
      status: 'ok',
      user: {
        _id: user._id,
        username: user.username,
        color: user.color,
        role: "player"
      }
    });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error', error: 'Error del servidor' });
  }
});

/* =========================
   LOGIN
========================= */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ status: 'error', error: 'Usuari no trobat' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.json({ status: 'error', error: 'Contrasenya incorrecta' });
    }

    res.json({
      status: 'ok',
      user: {
        _id: user._id,
        username: user.username,
        color: user.color,
        role: "admin" // o player según tu lógica
      }
    });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error', error: 'Error del servidor' });
  }
});

/* =========================
   SALAS (MONGODB)
========================= */

/* CREAR SALA */
app.post('/rooms', async (req, res) => {
  const { name, description, capacity, userId } = req.body;

  if (!name || !userId) {
    return res.json({ status: 'error', error: 'Falten dades' });
  }

  try {
    const room = await Room.create({
      name,
      description,
      capacity,
      createdBy: userId
    });

    res.json({ status: 'ok', room });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error', error: 'Error creant la sala' });
  }
});

/* OBTENER TODAS LAS SALAS */
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json({ status: 'ok', rooms });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', error: 'Error carregant sales' });
  }
});

/* BORRAR SALA */
app.delete('/rooms/:id', async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.json({ status: 'error', error: 'Error esborrant la sala' });
  }
});

/* =========================
   SOCKET.IO (MULTIJUGADOR)
========================= */
let players = {};

io.on('connection', socket => {
  console.log('Nou jugador connectat:', socket.id);

  players[socket.id] = {
    x: 400,
    y: 300,
    playerId: socket.id,
    username: "Jugador",
    color: 0xff0000
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('startPlaying', userData => {
    if (players[socket.id]) {
      players[socket.id].username = userData.username;
      players[socket.id].color = userData.color;
    }
  });

  socket.on('playerMovement', movementData => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    console.log('Jugador desconnectat:', socket.id);
    delete players[socket.id];
    io.emit('disconnectPlayer', socket.id);
  });
});

/* =========================
   START SERVER
========================= */
server.listen(8080, () => {
  console.log('Servidor escoltant al port 8080');
});
