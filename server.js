require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const { User, Category, Provider, Booking } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Friendly homepage check
app.get('/', (req, res) => {
  res.send('<h1>Servify Secure API Server</h1><p>The backend API is running successfully on MongoDB. Please open the frontend website at <a href="http://localhost:3000">http://localhost:3000</a> to use the app.</p>');
});

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(200).json({}));

// 1. Get initial configuration
app.get('/api/providers', async (req, res) => {
  try {
    const categories = await Category.find({}, '-_id -__v');
    const providers = await Provider.find({}, '-_id -__v');
    res.json({
      societies: [], 
      categories,
      providers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Get customer bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({}, '-_id -__v').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Create booking request
app.post('/api/bookings', async (req, res) => {
  try {
    const { providerId, date, time, bookingMode, servicesSelected, customPrice } = req.body;
    if (!providerId || !date || !time) return res.status(400).json({ error: 'Missing required booking fields.' });

    const provider = await Provider.findOne({ id: providerId });
    if (!provider) return res.status(404).json({ error: 'Selected provider not found.' });

    let subtotal = 0;
    let finalizedServices = [];

    if (bookingMode === 'custom') {
      const rate = parseFloat(customPrice);
      if (isNaN(rate) || rate <= 0) return res.status(400).json({ error: 'Invalid custom agreed price.' });
      subtotal = rate;
      finalizedServices = [{ name: 'Agreed Phone Rate', price: subtotal }];
    } else {
      if (!Array.isArray(servicesSelected) || servicesSelected.length === 0) {
        return res.status(400).json({ error: 'No services selected.' });
      }
      for (const service of servicesSelected) {
        const match = provider.pricingList.find(item => item.name === service.name);
        if (!match) return res.status(400).json({ error: `Service item '${service.name}' is not offered by this provider.` });
        subtotal += match.price;
        finalizedServices.push({ name: match.name, price: match.price });
      }
    }

    const serviceFee = 5.00;
    const totalPrice = subtotal + serviceFee;
    const platformCommission = subtotal * 0.15;
    const workerPayout = subtotal * 0.85;

    const newBooking = new Booking({
      id: 'b_' + Date.now(),
      providerId: provider.id,
      providerName: provider.name,
      providerCategory: provider.category,
      providerAvatar: provider.avatar,
      date,
      time,
      bookingMode,
      services: finalizedServices,
      subtotalPrice: subtotal,
      platformCommission: platformCommission,
      workerPayout: workerPayout,
      totalPrice: totalPrice,
      status: 'pending'
    });

    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
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
app.post('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate({ id: req.params.id }, { status: 'cancelled' }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Accept booking (Provider action)
app.post('/api/bookings/:id/accept', async (req, res) => {
  try {
    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const { subtotalPrice } = req.body;
    if (subtotalPrice !== undefined) {
      const subtotal = parseFloat(subtotalPrice);
      if (!isNaN(subtotal) && subtotal > 0) {
        booking.subtotalPrice = subtotal;
        booking.platformCommission = subtotal * 0.15;
        booking.workerPayout = subtotal * 0.85;
        booking.totalPrice = subtotal + 5.00;
      }
    }

    booking.status = 'accepted';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Complete booking
app.post('/api/bookings/:id/complete', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate({ id: req.params.id }, { status: 'completed' }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 6.5 Submit booking review
app.post('/api/bookings/:id/review', async (req, res) => {
  try {
    const { rating, text, author } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating stars value is required.' });

    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings.' });

    const provider = await Provider.findOne({ id: booking.providerId });
    if (provider) {
      const newReview = {
        id: 'rev_' + Date.now(),
        author: author || 'Abhishek K.',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        rating: parseInt(rating),
        text: text || ''
      };
      provider.reviews.push(newReview);
      provider.reviewsCount = provider.reviews.length;
      const totalStars = provider.reviews.reduce((sum, r) => sum + r.rating, 0);
      provider.rating = parseFloat((totalStars / provider.reviewsCount).toFixed(1));
      await provider.save();
    }

    res.json({ success: true, booking, provider });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. Chat messenger endpoints
app.post('/api/bookings/:id/chat', async (req, res) => {
  res.json({ success: true });
});

// 8. Update Custom Rates (for provider ID)
app.post('/api/providers/:id/rates', async (req, res) => {
  try {
    const { pricingList } = req.body;
    if (!Array.isArray(pricingList)) return res.status(400).json({ error: 'Invalid pricing list.' });

    const provider = await Provider.findOne({ id: req.params.id });
    if (!provider) return res.status(404).json({ error: 'Provider not found.' });

    provider.pricingList = pricingList;
    await provider.save();
    res.json({ success: true, pricingList: provider.pricingList });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 9. Update Provider Profile metadata
app.post('/api/providers/:id/profile', async (req, res) => {
  try {
    const { name, phone, email, whatsapp, category, address, avatar, bio, isProfileComplete } = req.body;
    if (!name || !phone || !category) return res.status(400).json({ error: 'Missing required profile fields.' });

    const provider = await Provider.findOne({ id: req.params.id });
    if (!provider) return res.status(404).json({ error: 'Provider not found.' });

    provider.name = name;
    provider.phone = phone;
    provider.email = email || provider.email;
    provider.whatsapp = whatsapp || provider.whatsapp;
    provider.category = category;
    provider.address = address || provider.address;
    provider.avatar = avatar || provider.avatar;
    provider.bio = bio || provider.bio;
    if (isProfileComplete !== undefined) provider.isProfileComplete = isProfileComplete;

    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
    if (!provider.skills.includes(formattedCategory)) {
      provider.skills.push(formattedCategory);
      provider.skills.push(category.toLowerCase());
    }

    await provider.save();

    await Booking.updateMany(
      { providerId: req.params.id },
      { $set: { providerName: name, providerCategory: category, providerAvatar: avatar } }
    );

    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, phone, society, providerCategory, providerHourlyRate, providerTagline, providerBio, providerExperience, providerAvatar, providerAddress } = req.body;

    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Email, password, name and role are required.' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: 'Email is already registered.' });

    const userId = 'u_' + Date.now();
    let providerId = null;

    if (role === 'provider') {
      providerId = 'p_' + Date.now();
      const newProvider = new Provider({
        id: providerId,
        name: name,
        category: providerCategory || 'electrician',
        rating: 5.0,
        reviewsCount: 0,
        experience: parseInt(providerExperience) || 1,
        hourlyRate: parseInt(providerHourlyRate) || 40,
        avatar: providerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=300&fit=crop&q=80',
        tagline: providerTagline || `Certified professional`,
        isVerified: false,
        phone: phone || '',
        societies: society ? [society] : ['gokuldham'],
        address: providerAddress || '',
        bio: providerBio || `Professional offering quality service.`,
        skills: [providerCategory ? providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1) : 'General'],
        pricingList: [{ id: 'srv_' + Date.now(), name: 'General Consultation & Repair', price: parseInt(providerHourlyRate) || 40 }],
        reviews: []
      });
      await newProvider.save();
    }

    const newUser = new User({
      id: userId,
      email: email.toLowerCase(),
      password: password,
      name: name,
      role: role,
      phone: phone || '',
      society: society || 'gokuldham',
      avatar: role === 'provider' 
        ? 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&q=80',
      providerId: providerId
    });

    await newUser.save();
    res.status(201).json({ 
      success: true, 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role, 
        providerId: newUser.providerId,
        providerProfile: newProvider || null
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    let providerProfile = null;
    if (user.role === 'provider' && user.providerId) {
      providerProfile = await Provider.findOne({ id: user.providerId }, '-_id -__v');
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
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Servify secure API server is running on http://localhost:${PORT}`);
});
