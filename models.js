const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider'], required: true },
  phone: String,
  society: String,
  avatar: String,
  providerId: String
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  icon: String,
  bgGradient: String
});

const ProviderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  rating: { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 0 },
  experience: { type: Number, default: 1 },
  hourlyRate: { type: Number, default: 40 },
  avatar: String,
  banner: String,
  tagline: String,
  isVerified: { type: Boolean, default: false },
  phone: String,
  email: String,
  whatsapp: String,
  societies: [String],
  address: String,
  bio: String,
  skills: [String],
  isProfileComplete: { type: Boolean, default: false },
  pricingList: [{
    id: String,
    name: String,
    price: Number
  }],
  reviews: [{
    id: String,
    author: String,
    rating: Number,
    text: String,
    date: String
  }],
  availability: {
    isOnline: { type: Boolean, default: true },
    workingHours: {
      mon: { open: String, close: String, enabled: Boolean },
      tue: { open: String, close: String, enabled: Boolean },
      wed: { open: String, close: String, enabled: Boolean },
      thu: { open: String, close: String, enabled: Boolean },
      fri: { open: String, close: String, enabled: Boolean },
      sat: { open: String, close: String, enabled: Boolean },
      sun: { open: String, close: String, enabled: Boolean }
    },
    blockedDates: [String]
  },
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      id: String,
      amount: Number,
      type: { type: String, enum: ['credit', 'debit'] },
      description: String,
      date: String
    }]
  },
  notifications: [{
    id: String,
    title: String,
    message: String,
    type: { type: String, default: 'info' },
    isRead: { type: Boolean, default: false },
    date: String
  }],
  badges: [String],
  referralCode: String,
  monthlyGoal: { type: Number, default: 0 },
  serviceRadius: { type: Number, default: 10 }
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerId: String,
  providerId: { type: String, required: true },
  date: String,
  time: String,
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled'], default: 'pending' },
  bookingMode: String,
  services: [{
    name: String,
    price: Number
  }],
  totalPrice: Number,
  subtotalPrice: Number,
  platformCommission: Number,
  workerPayout: Number,
  providerName: String,
  providerCategory: String,
  providerAvatar: String,
  customerName: String,
  customerAddress: String,
  customerPhone: String,
  completionTime: String
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Category: mongoose.model('Category', CategorySchema),
  Provider: mongoose.model('Provider', ProviderSchema),
  Booking: mongoose.model('Booking', BookingSchema)
};
