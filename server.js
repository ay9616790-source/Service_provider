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
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.url}`);
  next();
});

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

// Error reporting route for frontend debug
app.post('/api/log-error', (req, res) => {
  console.error('\n=============================================');
  console.error('!!! BROWSER RUNTIME ERROR DETECTED !!!');
  console.error('Message:', req.body.message);
  console.error('Source:', req.body.source, 'Line:', req.body.lineno, 'Col:', req.body.colno);
  console.error('Stack Trace:');
  console.error(req.body.stack);
  console.error('=============================================\n');
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
  const { providerId, date, time, clientName, clientAddress, clientDescription, servicesSelected } = req.body;
  
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const db = readDB();
  const provider = db.providers.find(p => p.id === providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Selected provider not found.' });
  }

  const client = clientName || 'Abhishek K.';
  const serviceFee = 5.00;

  // New Inspection / Bid workflow
  const newBooking = {
    id: 'b_' + Date.now(),
    providerId: provider.id,
    providerName: provider.name,
    providerCategory: provider.category,
    providerAvatar: provider.avatar,
    clientName: client,
    clientAddress: clientAddress || 'Gokuldham Society, Building B, Room 402',
    clientDescription: clientDescription || 'Regular maintenance inspection requested.',
    date,
    time,
    servicesSelected: servicesSelected || [{ name: 'On-site Inspection', price: 0 }],
    subtotalPrice: 0,
    serviceFee: serviceFee,
    platformCommission: 0,
    workerPayout: 0,
    totalPrice: serviceFee, // Only service fee initially
    status: 'pending', // pending, acknowledged, quoted, hired, completed, cancelled
    acknowledgmentTimer: 120, // 120 seconds countdown
    requestTimestamp: Date.now(),
    currentPhase: 0, // 0: Requested, 1: Work Initiated, 2: Initial, 3: Middle, 4: Finished
    phaseTimestamps: {},
    workerCount: 0,
    estimatedHours: 0,
    contractorQuote: 0,
    platformMarkup: 0,
    paymentMode: null,
    paymentCompleted: false,
    chatHistory: [
      {
        sender: 'provider',
        text: `Hi ${client}! I received your request for a ${provider.category} inspection on ${date} at ${time}. I have 120 seconds to accept this lead!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  db.bookings.unshift(newBooking);
  writeDB(db);

  res.status(201).json(newBooking);
});

// 3.5 Contractor Acknowledge Lead
app.post('/api/bookings/:id/acknowledge', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'acknowledged';
  booking.chatHistory.push({
    sender: 'provider',
    text: "Lead Acknowledged! I have secured your request and unlocked your address. I will now perform the site inspection to prepare your detailed quotation.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 3.6 Contractor Upload Detailed Quotation
app.post('/api/bookings/:id/quote', (req, res) => {
  const { contractorQuote, workerCount, estimatedHours, quoteDetails } = req.body;
  if (!contractorQuote || contractorQuote <= 0) {
    return res.status(400).json({ error: 'Invalid quotation amount.' });
  }

  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const quoteVal = parseFloat(contractorQuote);
  const total = quoteVal;

  booking.status = 'quoted';
  booking.contractorQuote = quoteVal;
  booking.subtotalPrice = quoteVal;
  booking.platformMarkup = 0;
  booking.platformCommission = 0; // zero platform commission
  booking.workerPayout = quoteVal; // 100% payout to contractor
  booking.workerCount = parseInt(workerCount) || 1;
  booking.estimatedHours = parseInt(estimatedHours) || 2;
  booking.totalPrice = total;
  booking.servicesSelected = [{ name: quoteDetails || 'Contractor Work Quote', price: quoteVal }];

  booking.chatHistory.push({
    sender: 'provider',
    text: `Quotation uploaded: $${quoteVal.toFixed(2)} Total. Estimated completion time is ${estimatedHours} hours using ${workerCount} employees. Please click Hire to initiate work!`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 3.7 Client Hire (Approved Quote & Launch Project)
app.post('/api/bookings/:id/hire', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'hired';
  booking.currentPhase = 1; // 1: Work Initiated
  booking.phaseTimestamps = {
    phase1_start: Date.now()
  };

  booking.chatHistory.push({
    sender: 'system',
    text: "Project officially HIRED and LAUNCHED! Progress phase set to Phase 1: Work Initiated.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 3.8 Contractor Update Progress Phase
app.post('/api/bookings/:id/progress', (req, res) => {
  const { phase } = req.body;
  const targetPhase = parseInt(phase);
  if (![1, 2, 3, 4].includes(targetPhase)) {
    return res.status(400).json({ error: 'Invalid phase value. Must be 1, 2, 3, or 4.' });
  }

  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.currentPhase = targetPhase;
  const key = `phase${targetPhase}_start`;
  booking.phaseTimestamps = booking.phaseTimestamps || {};
  booking.phaseTimestamps[key] = Date.now();

  let textMsg = "";
  if (targetPhase === 1) textMsg = "Progress Updated: Work Initiated (Phase 1)";
  else if (targetPhase === 2) textMsg = "Progress Updated: Initial Phase (Phase 2)";
  else if (targetPhase === 3) textMsg = "Progress Updated: Middle Phase (Phase 3)";
  else if (targetPhase === 4) {
    booking.status = 'payment_pending';
    booking.phaseTimestamps.phase4_end = Date.now();
    textMsg = "Progress Updated: Job Finished (Phase 4). Awaiting Client Payment!";
  }

  booking.chatHistory.push({
    sender: 'provider',
    text: textMsg,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
});

// 3.9 Client Process Payment & Add Payouts
app.post('/api/bookings/:id/pay', (req, res) => {
  const { paymentMode } = req.body;
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  booking.status = 'completed';
  booking.paymentCompleted = true;
  booking.paymentMode = paymentMode || 'direct';

  booking.chatHistory.push({
    sender: 'system',
    text: `Direct payment of $${booking.totalPrice.toFixed(2)} completed successfully!`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  booking.chatHistory.push({
    sender: 'provider',
    text: "Thank you for the payment and choosing Servify! The contract has been completed. Please rate my services!",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  writeDB(db);
  res.json(booking);
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

  const { subtotalPrice } = req.body;
  if (subtotalPrice !== undefined) {
    const subtotal = parseFloat(subtotalPrice);
    if (!isNaN(subtotal) && subtotal > 0) {
      booking.subtotalPrice = subtotal;
      booking.platformCommission = subtotal * 0.15;
      booking.workerPayout = subtotal * 0.85;
      booking.totalPrice = subtotal + (booking.serviceFee || 5.00);
    }
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

// 6.5 Submit booking review (Customer action)
app.post('/api/bookings/:id/review', (req, res) => {
  const { rating, text, author } = req.body;
  if (!rating) {
    return res.status(400).json({ error: 'Rating stars value is required.' });
  }

  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Can only review completed bookings.' });
  }

  if (booking.isReviewed) {
    return res.status(400).json({ error: 'Booking has already been reviewed.' });
  }

  // 1. Update booking state
  booking.isReviewed = true;
  booking.review = {
    rating: parseInt(rating),
    text: text || '',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  };

  // 2. Find and update provider details
  const provider = db.providers.find(p => p.id === booking.providerId);
  if (provider) {
    const newReview = {
      author: author || 'Abhishek K.',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      rating: parseInt(rating),
      text: text || ''
    };
    provider.reviews = provider.reviews || [];
    provider.reviews.push(newReview);
    provider.reviewsCount = provider.reviews.length;
    
    const totalStars = provider.reviews.reduce((sum, r) => sum + r.rating, 0);
    provider.rating = parseFloat((totalStars / provider.reviewsCount).toFixed(1));
  }

  writeDB(db);
  res.json({ success: true, booking, provider });
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

// 8. Update Custom Rates (for provider ID)
app.post('/api/providers/:id/rates', (req, res) => {
  const { pricingList } = req.body;
  if (!Array.isArray(pricingList)) {
    return res.status(400).json({ error: 'Invalid pricing list.' });
  }

  const db = readDB();
  const provider = db.providers.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  provider.pricingList = pricingList;
  writeDB(db);
  res.json({ success: true, pricingList: provider.pricingList });
});

// 9. Update Provider Profile metadata
app.post('/api/providers/:id/profile', (req, res) => {
  const { name, phone, tagline, bio, avatar, experience, address } = req.body;
  if (!name || !phone || !tagline || !bio || !avatar || experience === undefined || !address) {
    return res.status(400).json({ error: 'Missing required profile fields.' });
  }

  const db = readDB();
  const provider = db.providers.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found.' });
  }

  provider.name = name;
  provider.phone = phone;
  provider.tagline = tagline;
  provider.bio = bio;
  provider.avatar = avatar;
  provider.experience = parseInt(experience) || 0;
  provider.address = address;

  // Also update corresponding entries in bookings
  db.bookings.forEach(b => {
    if (b.providerId === req.params.id) {
      b.providerName = name;
      b.providerAvatar = avatar;
    }
  });

  writeDB(db);
  res.json({ success: true, provider: provider });
});

// --- AUTHENTICATION ENDPOINTS ---

// Register Endpoint
app.post('/api/auth/register', (req, res) => {
  const { 
    email, 
    password, 
    name, 
    role, 
    phone, 
    society, 
    providerCategory, 
    providerHourlyRate, 
    providerTagline, 
    providerBio 
  } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Email, password, name and role are required.' });
  }

  if (role !== 'customer' && role !== 'provider') {
    return res.status(400).json({ error: 'Role must be either "customer" or "provider".' });
  }

  const db = readDB();
  db.users = db.users || [];

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const userId = 'u_' + Date.now();
  let providerId = null;

  if (role === 'provider') {
    providerId = 'p_' + Date.now();
    
    // Create professional provider profile
    const newProvider = {
      id: providerId,
      name: name,
      category: providerCategory || 'electrician',
      rating: 5.0,
      reviewsCount: 0,
      experience: 1,
      hourlyRate: parseInt(providerHourlyRate) || 40,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=300&fit=crop&q=80',
      tagline: providerTagline || `Certified ${providerCategory || 'professional'}`,
      isVerified: false,
      phone: phone || '',
      societies: society ? [society] : [],
      bio: providerBio || `Professional offering quality service.`,
      skills: [providerCategory ? providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1) : 'General'],
      pricingList: [
        { 
          id: 'srv_' + Date.now(), 
          name: 'General Consultation & Repair', 
          price: parseInt(providerHourlyRate) || 40 
        }
      ],
      reviews: []
    };

    db.providers = db.providers || [];
    db.providers.push(newProvider);
  }

  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    password: password, // In mock, plaintext is fine
    name: name,
    role: role,
    phone: phone || '',
    society: society || '',
    avatar: role === 'provider' 
      ? 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&q=80',
    providerId: providerId
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ success: true, user: newUser });
});

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDB();
  db.users = db.users || [];

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  let providerProfile = null;
  if (user.role === 'provider' && user.providerId) {
    db.providers = db.providers || [];
    providerProfile = db.providers.find(p => p.id === user.providerId) || null;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      society: user.society,
      avatar: user.avatar,
      providerId: user.providerId,
      providerProfile: providerProfile
    }
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Servify secure API server is running on http://localhost:${PORT}`);
});
