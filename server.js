const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'server', 'db.json');

app.use(cors());
app.use(express.json());

// Helper function to read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { societies: [], categories: [], providers: [], bookings: [] };
  }
}

// Helper function to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// --- API ENDPOINTS ---

// Friendly homepage check
app.get('/', (req, res) => {
  res.send('<h1>Servify Secure API Server</h1><p>The backend API is running successfully. Please open the frontend website at <a href="http://localhost:3000">http://localhost:3000</a> to use the app.</p>');
});

// 0. Silence chrome devtools debugging requests
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(200).json({});
});

// 1. Get initial configuration (categories, societies, current provider database status)
app.get('/api/providers', (req, res) => {
  const db = readDB();
  res.json({
    societies: db.societies,
    categories: db.categories,
    providers: db.providers
  });
});

// 2. Get customer bookings
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  res.json(db.bookings);
});

// 3. Securely create booking request & calculate platform split cuts
app.post('/api/bookings', (req, res) => {
  const { providerId, date, time, bookingMode, servicesSelected, customPrice } = req.body;
  
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const db = readDB();
  const provider = db.providers.find(p => p.id === providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Selected provider not found.' });
  }

  let subtotal = 0;
  let finalizedServices = [];

  if (bookingMode === 'custom') {
    // Custom negotiated price over call
    const rate = parseFloat(customPrice);
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ error: 'Invalid custom agreed price.' });
    }
    subtotal = rate;
    finalizedServices = [{ name: 'Agreed Phone Rate', price: subtotal }];
  } else {
    // Standard rates mode: Validate pricing list items server-side to prevent tampering
    if (!Array.isArray(servicesSelected) || servicesSelected.length === 0) {
      return res.status(400).json({ error: 'No services selected.' });
    }
    
    for (const service of servicesSelected) {
      const match = provider.pricingList.find(item => item.name === service.name);
      if (!match) {
        return res.status(400).json({ error: `Service item '${service.name}' is not offered by this provider.` });
      }
      subtotal += match.price;
      finalizedServices.push({ name: match.name, price: match.price });
    }
  }

  const serviceFee = 5.00;
  const totalPrice = subtotal + serviceFee;

  // Platform split logic (15% commission, 85% provider payout)
  const platformCommission = subtotal * 0.15;
  const workerPayout = subtotal * 0.85;

  const newBooking = {
    id: 'b_' + Date.now(),
    providerId: provider.id,
    providerName: provider.name,
    providerCategory: provider.category,
    providerAvatar: provider.avatar,
    date,
    time,
    servicesSelected: finalizedServices,
    subtotalPrice: subtotal,
    serviceFee: serviceFee,
    platformCommission: platformCommission,
    workerPayout: workerPayout,
    totalPrice: totalPrice,
    status: 'pending',
    chatHistory: [
      {
        sender: 'provider',
        text: `Hi Abhishek! I received your booking request for ${date} at ${time}. Can you share a bit more detail about the work or attach any photos?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  db.bookings.unshift(newBooking);
  writeDB(db);

  res.status(201).json(newBooking);
});

// 4. Cancel booking (Customer action)
app.post('/api/bookings/:id/cancel', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'cancelled';
  writeDB(db);
  res.json(booking);
});

// 5. Accept booking (Provider action)
app.post('/api/bookings/:id/accept', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'accepted';
  booking.chatHistory.push({
    sender: 'provider',
    text: "Great! I've accepted this request and added it to my calendar. See you then!",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 6. Complete booking (Provider action)
app.post('/api/bookings/:id/complete', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'completed';
  booking.chatHistory.push({
    sender: 'provider',
    text: "The job has been completed. Thank you for choosing Servify!",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 7. Chat messenger endpoints (Stores message & returns simulated auto-replies)
app.post('/api/bookings/:id/chat', (req, res) => {
  const { sender, text } = req.body;
  if (!sender || !text) {
    return res.status(400).json({ error: 'Sender and text are required.' });
  }

  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add user message
  booking.chatHistory.push({
    sender,
    text,
    time: timeStr
  });

  writeDB(db);
  res.json(booking);
});

// 8. Update Custom Rates (for provider ID 'p1' Alex Mercer)
app.post('/api/providers/p1/rates', (req, res) => {
  const { pricingList } = req.body;
  if (!Array.isArray(pricingList)) {
    return res.status(400).json({ error: 'Invalid pricing list.' });
  }

  const db = readDB();
  const alex = db.providers.find(p => p.id === 'p1');
  if (!alex) {
    return res.status(404).json({ error: 'Provider Alex Mercer not found.' });
  }

  alex.pricingList = pricingList;
  writeDB(db);
  res.json({ success: true, pricingList: alex.pricingList });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Servify secure API server is running on http://localhost:${PORT}`);
});
