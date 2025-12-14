const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  color: { type: Number, default: 0xffffff },

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  posx: Number,
  posy: Number,
  score: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);