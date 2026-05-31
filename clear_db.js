require('dotenv').config();
const mongoose = require('mongoose');
const { User, Provider, Booking } = require('./models');

async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    await User.deleteMany({});
    console.log('Cleared all Users');

    await Provider.deleteMany({});
    console.log('Cleared all Providers');

    await Booking.deleteMany({});
    console.log('Cleared all Bookings');

    console.log('Database successfully cleaned! (Categories were kept intact)');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear database:', err);
    process.exit(1);
  }
}

clearDB();
