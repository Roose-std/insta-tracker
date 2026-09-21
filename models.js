const mongoose = require('mongoose');

const TargetSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const SnapshotSchema = new mongoose.Schema({
  username: { type: String, required: true },
  followers: [{ type: String }],
  scrapedAt: { type: Date, default: Date.now }
});

module.exports = {
  Target: mongoose.model('Target', TargetSchema),
  Snapshot: mongoose.model('Snapshot', SnapshotSchema)
};
