const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  step: { type: String, default: 'none' },
  tempOrder: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  telegramId: { type: Number, required: true },
  username: String,
  firstName: String,
  orderType: { type: String, enum: ['buy', 'sell'], required: true },
  amount: Number,
  totalEtb: Number,
  rate: Number,
  bankOrNetwork: String,
  accountOrWallet: String,
  accountName: String,
  userProofPhotoId: String,
  adminProofPhotoId: String,
  status: { type: String, default: '⏳ በመጠባበቅ ላይ (Pending)' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = { User, Order };
