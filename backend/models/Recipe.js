const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  foodName: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Recipe', recipeSchema);