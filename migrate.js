require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { User, Category, Provider, Booking } = require('./models');

const DB_PATH = path.join(__dirname, 'server', 'db.json');

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for Migration');

    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Clear existing data in MongoDB to prevent duplicates during testing
    await User.deleteMany({});
    await Category.deleteMany({});
    await Provider.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing MongoDB collections');

    // Insert data
    if (data.users && data.users.length > 0) await User.insertMany(data.users);
    if (data.categories && data.categories.length > 0) await Category.insertMany(data.categories);
    if (data.providers && data.providers.length > 0) await Provider.insertMany(data.providers);
    if (data.bookings && data.bookings.length > 0) await Booking.insertMany(data.bookings);

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateData();
