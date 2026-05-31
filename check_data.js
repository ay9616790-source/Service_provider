require('dotenv').config();
const mongoose = require('mongoose');
const { User, Provider, Booking } = require('./models');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- USERS ---');
  const users = await User.find({});
  users.forEach(u => console.log(`User: id=${u.id}, email=${u.email}, name=${u.name}, role=${u.role}, providerId=${u.providerId}`));

  console.log('\n--- PROVIDERS ---');
  const providers = await Provider.find({});
  providers.forEach(p => console.log(`Provider: id=${p.id}, name=${p.name}, category=${p.category}, phone=${p.phone}`));

  console.log('\n--- BOOKINGS ---');
  const bookings = await Booking.find({});
  bookings.forEach(b => console.log(`Booking: id=${b.id}, customer=${b.customerName}, providerId=${b.providerId}, status=${b.status}`));

  await mongoose.disconnect();
}

check().catch(console.error);
