const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userInfo: {
    avatar: String,
    name: String,
    desc: String,
    gender: String,
    birthday: String,
    region: String,
    hobbies: [String],
    activities: Number,
    friends: Number,
    points: Number
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model('User', userSchema);
