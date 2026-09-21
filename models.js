const mongoose = require('mongoose');

// 1. جدول الحسابات المستهدفة للمراقبة
const targetSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// 2. جدول اللقطات (Snapshots) للبيانات المسحوبة
const snapshotSchema = new mongoose.Schema({
  username: { type: String, required: true },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  profilePicUrl: { type: String, default: '' },
  fetchedAt: { type: Date, default: Date.now }
});

const Target = mongoose.model('Target', targetSchema);
const Snapshot = mongoose.model('Snapshot', snapshotSchema);

module.exports = { Target, Snapshot };
