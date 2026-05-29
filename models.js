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
  }]
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
