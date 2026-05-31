// Extracted Provider Logic
class ProviderExtension {

  // --- SOCIETY COORDINATES (Fixed coords for demo purposes) ---
  getSocietyCoords(societyId) {
    const coords = {
      'gokuldham':    { lat: 19.1136, lng: 72.8697, name: 'Gokuldham Society' },
      'shanti_kunj':  { lat: 19.1200, lng: 72.8750, name: 'Shanti Kunj Heights' },
      'green_valley': { lat: 19.1080, lng: 72.8600, name: 'Green Valley Apartments' },
      'royal_palms':  { lat: 19.1050, lng: 72.8820, name: 'Royal Palms Residency' },
    };
    return coords[societyId] || coords['gokuldham'];
  }

  // Haversine distance in km
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // --- PROVIDER MAP ---
  renderProviderMap(proBookings) {
    const mapEl = document.getElementById('provider-bookings-map');
    const legendEl = document.getElementById('provider-map-legend');
    const badgeEl = document.getElementById('map-total-jobs-badge');
    if (!mapEl || typeof L === 'undefined') return;

    // Destroy existing map instance if it exists
    if (this._providerMap) {
      this._providerMap.remove();
      this._providerMap = null;
    }

    // Provider's base (use first society or default)
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const activePro = this.state.providers.find(p => p.id === providerId);
    const providerSociety = (activePro && activePro.societies && activePro.societies[0]) || 'gokuldham';
    const providerCoords = this.getSocietyCoords(providerSociety);

    const map = L.map('provider-bookings-map', { zoomControl: true, scrollWheelZoom: false });
    this._providerMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 17
    }).addTo(map);

    // Provider base marker (blue)
    const providerIcon = L.divIcon({
      className: '',
      html: `<div style="background:#6c63ff;color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(108,99,255,0.5);border:3px solid #fff;">🔧</div>`,
      iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -20]
    });

    L.marker([providerCoords.lat, providerCoords.lng], { icon: providerIcon })
      .addTo(map)
      .bindPopup(`<strong>Your Base</strong><br>${providerCoords.name}`)
      .openPopup();

    const mappableBookings = proBookings.filter(b => b.status === 'pending' || b.status === 'accepted');
    if (badgeEl) badgeEl.textContent = `${mappableBookings.length} job${mappableBookings.length !== 1 ? 's' : ''} mapped`;

    const bounds = [[providerCoords.lat, providerCoords.lng]];
    const legendItems = [];

    mappableBookings.forEach((booking, i) => {
      // Get client coordinates — prioritize exact lat/lng, fallback to society jitter
      let finalLat, finalLng;
      if (booking.lat !== undefined && booking.lng !== undefined) {
        finalLat = parseFloat(booking.lat);
        finalLng = parseFloat(booking.lng);
      } else {
        const societyId = booking.clientSociety || ['gokuldham','shanti_kunj','green_valley','royal_palms'][i % 4];
        const clientCoords = this.getSocietyCoords(societyId);
        // Small jitter so overlapping markers are visible for hardcoded societies
        finalLat = clientCoords.lat + (Math.random() - 0.5) * 0.003;
        finalLng = clientCoords.lng + (Math.random() - 0.5) * 0.003;
      }

      const dist = this.haversineDistance(providerCoords.lat, providerCoords.lng, finalLat, finalLng);
      const distStr = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;

      const color = booking.status === 'pending' ? '#f59e0b' : '#10b981';
      const emoji = booking.status === 'pending' ? '⏳' : '✅';

      const clientIcon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:3px solid #fff;">${emoji}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18]
      });

      const services = (booking.services || booking.servicesSelected || []).map(s => s.name).join(', ') || 'Service';

      L.marker([finalLat, finalLng], { icon: clientIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:160px">
            <strong>${services}</strong><br>
            <span style="color:#6c63ff">📅 ${booking.date} at ${booking.time}</span><br>
            <span style="color:#10b981">📍 ${distStr} away</span><br>
            <span style="font-size:0.75rem;color:#888">Status: ${booking.status}</span>
          </div>
        `);

      // Draw dashed line from provider to client
      L.polyline([[providerCoords.lat, providerCoords.lng], [finalLat, finalLng]], {
        color: color, weight: 2, dashArray: '6,6', opacity: 0.7
      }).addTo(map);

      bounds.push([finalLat, finalLng]);

      legendItems.push({ services, distStr, status: booking.status, color, date: booking.date });
    });

    // Fit map to all markers
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([providerCoords.lat, providerCoords.lng], 14);
    }

    // Render legend
    if (legendEl) {
      if (legendItems.length === 0) {
        legendEl.innerHTML = `<p style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:0.5rem 0;">No active or pending jobs to display on map.</p>`;
      } else {
        legendEl.innerHTML = legendItems.map(item => `
          <div class="map-legend-row">
            <span class="map-legend-dot" style="background:${item.color}"></span>
            <span class="map-legend-service">${item.services}</span>
            <span class="map-legend-meta">${item.date}</span>
            <span class="map-legend-dist">📍 ${item.distStr}</span>
            <span class="map-legend-status" style="color:${item.color}">${item.status}</span>
          </div>
        `).join('');
      }
    }
  }

  // --- PROVIDER PORTAL / DASHBOARD MOCKUP ---
  renderProviderDashboard() {
    const requestsContainer = document.getElementById('provider-requests-container');
    const scheduleContainer = document.getElementById('provider-schedule-container');
    const ratesContainer = document.getElementById('provider-rates-container');
    
    const netPayoutValue = document.getElementById('provider-net-payout');
    const grossBillingsValue = document.getElementById('provider-gross-billings');
    const commissionDeductedValue = document.getElementById('provider-commission-deducted');
    const completedCountValue = document.getElementById('provider-completed-count');
    
    if (!requestsContainer) return;

    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';

    const activeProvider = this.state.providers.find(p => p.id === providerId);
    if (activeProvider) {
      // Update portal header name dynamically
      const titleName = document.getElementById('provider-dashboard-title-name');
      if (titleName) {
        titleName.textContent = activeProvider.name || 'Alex Mercer';
      }

      // Pre-populate update profile form inputs
      const nameInput = document.getElementById('edit-pro-name');
      const phoneInput = document.getElementById('edit-pro-phone');
      const taglineInput = document.getElementById('edit-pro-tagline');
      const bioInput = document.getElementById('edit-pro-bio');

      if (nameInput && document.activeElement !== nameInput) nameInput.value = activeProvider.name || '';
      if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = activeProvider.phone || '';
      if (taglineInput && document.activeElement !== taglineInput) taglineInput.value = activeProvider.tagline || '';
      if (bioInput && document.activeElement !== bioInput) bioInput.value = activeProvider.bio || '';

      // Onboarding Modal Check
      const onboardingModal = document.getElementById('provider-onboarding-modal');
      const providerGrid = document.querySelector('.provider-grid');
      if (onboardingModal) {
        if (!activeProvider.isProfileComplete) {
          // Pre-fill whatever data is available
          document.getElementById('ob-pro-name').value = activeProvider.name || '';
          document.getElementById('ob-pro-phone').value = activeProvider.phone || '';
          document.getElementById('ob-pro-email').value = activeProvider.email || (this.state.currentUser && this.state.currentUser.email) || '';
          document.getElementById('ob-pro-whatsapp').value = activeProvider.whatsapp || activeProvider.phone || '';
          document.getElementById('ob-pro-category').value = activeProvider.category || 'electrician';
          document.getElementById('ob-pro-address').value = activeProvider.address || '';
          const photoPreview = document.getElementById('ob-pro-photo-preview');
          if (activeProvider.avatar) {
            photoPreview.src = activeProvider.avatar;
            photoPreview.style.display = 'block';
          } else {
            photoPreview.style.display = 'none';
          }
          document.getElementById('ob-pro-bio').value = activeProvider.bio || activeProvider.tagline || '';
          
          onboardingModal.classList.remove('hidden');
          if (providerGrid) providerGrid.style.filter = 'blur(4px)';
        } else {
          onboardingModal.classList.add('hidden');
          if (providerGrid) providerGrid.style.filter = 'none';
        }
      }
    }

    // Filter requests matching the active logged-in provider
    const proBookings = this.state.bookings.filter(b => b.providerId === providerId);
    const pendingRequests = proBookings.filter(b => b.status === 'pending');
    const acceptedJobs = proBookings.filter(b => b.status === 'accepted');
    const completedJobs = proBookings.filter(b => b.status === 'completed');

    // Compute mock earnings
    let baseGross = 1420.00;
    let baseCommission = baseGross * 0.15; // 15% Servify cut
    let baseNet = baseGross * 0.85;        // 85% Take-home

    let grossAdded = 0;
    let commissionAdded = 0;
    let netAdded = 0;

    completedJobs.forEach(j => {
      const subtotal = j.subtotalPrice || (j.totalPrice - 5.00);
      const commission = j.platformCommission !== undefined ? j.platformCommission : (subtotal * 0.15);
      const net = j.workerPayout !== undefined ? j.workerPayout : (subtotal * 0.85);

      grossAdded += subtotal;
      commissionAdded += commission;
      netAdded += net;
    });

    const finalGross = baseGross + grossAdded;
    const finalCommission = baseCommission + commissionAdded;
    const finalNet = baseNet + netAdded;

    if (netPayoutValue) netPayoutValue.textContent = `₹${finalNet.toFixed(2)}`;
    if (grossBillingsValue) grossBillingsValue.textContent = `₹${finalGross.toFixed(2)}`;
    if (commissionDeductedValue) commissionDeductedValue.textContent = `₹${finalCommission.toFixed(2)}`;
    if (completedCountValue) completedCountValue.textContent = 12 + completedJobs.length;

    // 1. Render Pending Requests
    if (pendingRequests.length === 0) {
      requestsContainer.innerHTML = `<p class="text-muted text-center py-4">No pending job requests.</p>`;
    } else {
      requestsContainer.innerHTML = pendingRequests.map(req => {
        const subtotal = req.subtotalPrice || (req.totalPrice - 5.00);
        const payout = req.workerPayout !== undefined ? req.workerPayout : (subtotal * 0.85);
        const fee = req.platformCommission !== undefined ? req.platformCommission : (subtotal * 0.15);

        // Compute distance for this booking
        const providerId2 = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
        const activePro2 = this.state.providers.find(p => p.id === providerId2);
        const provSociety = (activePro2 && activePro2.societies && activePro2.societies[0]) || 'gokuldham';
        const provCoords = this.getSocietyCoords(provSociety);
        const clientSociety = req.clientSociety || 'gokuldham';
        const clientCoords = this.getSocietyCoords(clientSociety);
        const dist = this.haversineDistance(provCoords.lat, provCoords.lng, clientCoords.lat, clientCoords.lng);
        const distStr = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;

        return `
          <div class="job-request-item" id="req-${req.id}">
            <div class="job-req-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <span class="job-req-client" style="font-weight: 600;">Client: ${req.customerName || 'Customer'}</span>
              <div class="text-right">
                <span class="job-req-price" id="total-${req.id}" style="font-size: 1.15rem; font-weight: 700; color: var(--primary);">₹${req.totalPrice.toFixed(2)}</span>
                <div class="provider-split-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  Payout: <span id="payout-${req.id}">₹${payout.toFixed(2)}</span> (Fee: <span id="fee-${req.id}">₹${fee.toFixed(2)}</span>)
                </div>
              </div>
            </div>
            <div class="job-req-details mb-4">
              <span><strong>Services:</strong> ${(req.services || req.servicesSelected || []).map(s => s.name).join(', ')}</span>
              <span><strong>Schedule:</strong> ${req.date} at ${req.time}</span>
              <span style="display:flex;align-items:center;gap:0.3rem;margin-top:0.3rem;color:#6c63ff;font-size:0.85rem;">
                <span>📍</span><strong>${distStr} from your base</strong>
                <span style="color:#aaa;font-size:0.75rem;">(${this.getSocietyCoords(req.clientSociety || 'gokuldham').name})</span>
              </span>
              <div style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Confirm/Edit Price (₹):</label>
                <input type="number" id="negotiated-price-${req.id}" class="form-input-small negotiated-price-input" data-id="${req.id}" style="width: 80px; height: 1.8rem; padding: 0.2rem;" value="${subtotal.toFixed(2)}" min="1">
              </div>
            </div>
            <div class="job-req-actions">
              <button class="btn btn-primary btn-small flex-grow-1" onclick="app.acceptJobRequest('${req.id}')">Accept Job</button>
              <button class="btn btn-secondary btn-small" onclick="app.declineJobRequest('${req.id}')" style="color: var(--danger)">Decline</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render Active Schedule
    const allScheduleJobs = [...acceptedJobs];
    if (allScheduleJobs.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <p>No jobs scheduled. Accept incoming requests to populate calendar.</p>
        </div>
      `;
    } else {
      scheduleContainer.innerHTML = allScheduleJobs.map(job => {
        // Parse date for calendar block representation
        const dateObj = new Date(job.date);
        const day = dateObj.getDate() || '28';
        const month = dateObj.toLocaleString('en-US', { month: 'short' }) || 'May';
        
        const subtotal = job.subtotalPrice || (job.totalPrice - 5.00);
        const payout = job.workerPayout !== undefined ? job.workerPayout : (subtotal * 0.85);

        return `
          <div class="schedule-item">
            <div class="schedule-date-box">
              <span class="day">${day}</span>
              <span class="mo">${month}</span>
            </div>
            <div class="schedule-details">
              <h4>${(job.services || job.servicesSelected || []).map(s => s.name).join(', ')}</h4>
              <p>Client: ${job.customerName || 'Customer'} &bull; ${job.time} &bull; <strong style="color: var(--success);">Payout: ₹${payout.toFixed(2)}</strong></p>
            </div>
            <div>
              <button class="btn btn-primary btn-small" onclick="app.completeJob('${job.id}')">Complete Job</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Render Custom Rates Editor
    const providerId3 = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const activePro3 = this.state.providers.find(p => p.id === providerId3);
    if (activePro3 && ratesContainer) {
      ratesContainer.innerHTML = activePro3.pricingList.map((srv, index) => `
        <div class="rate-edit-row">
          <span class="rate-edit-name">${srv.name}</span>
          <div class="rate-edit-input-wrapper">
            <span>₹</span>
            <input type="number" class="form-input-small text-right pr-input" value="${srv.price}" data-index="${index}">
          </div>
        </div>
      `).join('');
    }

    // 4. Render map with all booking locations
    this.renderProviderMap(proBookings);
  }

  async acceptJobRequest(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Get the negotiated price value from the input field
    const priceInput = document.getElementById(`negotiated-price-${bookingId}`);
    const negotiatedPrice = priceInput ? parseFloat(priceInput.value) : null;
    
    // Fallback if not valid number
    const subtotal = (negotiatedPrice !== null && !isNaN(negotiatedPrice) && negotiatedPrice > 0) 
      ? negotiatedPrice 
      : (booking.subtotalPrice || (booking.totalPrice - 5.00));

    const newSubtotal = subtotal;
    const newCommission = newSubtotal * 0.15;
    const newPayout = newSubtotal * 0.85;
    const newTotal = newSubtotal + 5.00;

    try {
      // json-server uses PATCH on /bookings/:jsonServerId
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted', subtotalPrice: newSubtotal, platformCommission: newCommission, workerPayout: newPayout, totalPrice: newTotal })
      });
      if (!response.ok) throw new Error('API accept failed');
      const updated = await response.json();
      Object.assign(booking, updated);
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'accepted';
      booking.subtotalPrice = newSubtotal;
      booking.platformCommission = newCommission;
      booking.workerPayout = newPayout;
      booking.totalPrice = newTotal;
    }

    this.saveState();
    this.showToast('Job request accepted!');
    this.renderProviderDashboard();
  }

  async declineJobRequest(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!response.ok) throw new Error('API decline failed');
      const updated = await response.json();
      booking.status = updated.status;
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'cancelled';
    }

    this.saveState();
    this.showToast('Job request declined.');
    this.renderProviderDashboard();
  }

  async completeJob(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (!response.ok) throw new Error('API complete failed');
      const updated = await response.json();
      booking.status = updated.status;
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'completed';
    }

    this.saveState();
    this.showToast('Job completed successfully!');
    this.renderProviderDashboard();
  }

  bindProviderDashboardEvents() {
    const obForm = document.getElementById('onboarding-profile-form');
    
    const photoInput = document.getElementById('ob-pro-photo');
    const photoPreview = document.getElementById('ob-pro-photo-preview');
    if (photoInput && photoPreview) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) {
                scaleSize = MAX_WIDTH / img.width;
            }
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            photoPreview.src = compressedBase64;
            photoPreview.style.display = 'block';
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (obForm) {
      obForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
        const activePro = this.state.providers.find(p => p.id === providerId);
        
        if (activePro) {
          activePro.name = document.getElementById('ob-pro-name').value.trim();
          activePro.phone = document.getElementById('ob-pro-phone').value.trim();
          activePro.email = document.getElementById('ob-pro-email').value.trim();
          activePro.whatsapp = document.getElementById('ob-pro-whatsapp').value.trim();
          activePro.category = document.getElementById('ob-pro-category').value;
          activePro.address = document.getElementById('ob-pro-address').value.trim();
          const photoPreview = document.getElementById('ob-pro-photo-preview');
          if (photoPreview && photoPreview.src && photoPreview.style.display !== 'none') {
            activePro.avatar = photoPreview.src;
          }
          activePro.bio = document.getElementById('ob-pro-bio').value.trim();
          activePro.isProfileComplete = true;

          // Push to backend (json-server PATCH)
          try {
            await fetch(`${API_BASE_URL}/providers/${activePro.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(activePro)
            });
          } catch (err) {
            console.error('Failed to save profile to server:', err);
          }

          // Sync with customer bookings locally
          this.state.bookings.forEach(b => {
            if (b.providerId === providerId) {
              b.providerName = activePro.name;
              b.providerCategory = activePro.category;
              b.providerAvatar = activePro.avatar;
            }
          });

          this.saveState();
        }

        const onboardingModal = document.getElementById('provider-onboarding-modal');
        const providerGrid = document.querySelector('.provider-grid');
        if (onboardingModal) onboardingModal.classList.add('hidden');
        if (providerGrid) providerGrid.style.filter = 'none';

        this.showToast('Profile completed successfully!');
        this.renderProviderDashboard();
      });
    }

    const ratesContainer = document.getElementById('provider-rates-container');
    
    // Live calculation for negotiated price input updates in job requests
    const requestsContainer = document.getElementById('provider-requests-container');
    if (requestsContainer) {
      requestsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('negotiated-price-input')) {
          const bookingId = e.target.getAttribute('data-id');
          const val = parseFloat(e.target.value) || 0;
          const payoutSpan = document.getElementById(`payout-${bookingId}`);
          const feeSpan = document.getElementById(`fee-${bookingId}`);
          const totalSpan = document.getElementById(`total-${bookingId}`);
          
          if (payoutSpan && feeSpan && totalSpan) {
            const payout = val * 0.85;
            const fee = val * 0.15;
            const total = val + 5.00;
            
            payoutSpan.textContent = `₹${payout.toFixed(2)}`;
            feeSpan.textContent = `₹${fee.toFixed(2)}`;
            totalSpan.textContent = `₹${total.toFixed(2)}`;
          }
        }
      });
    }

    if (!ratesContainer) return;

    ratesContainer.addEventListener('input', async (e) => {
      if (e.target.tagName === 'INPUT') {
        const index = parseInt(e.target.getAttribute('data-index'));
        const newPrice = parseFloat(e.target.value) || 0;
        
        const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
        const activePro = this.state.providers.find(p => p.id === providerId);
        if (activePro && activePro.pricingList[index]) {
          activePro.pricingList[index].price = newPrice;
          this.saveState();

          // Sync with server (json-server PATCH)
          try {
            await fetch(`${API_BASE_URL}/providers/${activePro.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pricingList: activePro.pricingList })
            });
          } catch (err) {
            console.warn('Failed to sync rates with server:', err);
          }
        }
      }
    });

    // Bind profile update form submission
    const profileForm = document.getElementById('provider-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameVal = document.getElementById('edit-pro-name').value.trim();
        const phoneVal = document.getElementById('edit-pro-phone').value.trim();
        const taglineVal = document.getElementById('edit-pro-tagline').value.trim();
        const bioVal = document.getElementById('edit-pro-bio').value.trim();

        if (!nameVal || !phoneVal || !taglineVal || !bioVal) {
          this.showToast('Please fill in all profile fields.');
          return;
        }

        const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';

        // 1. Update local state
        const activePro = this.state.providers.find(p => p.id === providerId);
        if (activePro) {
          activePro.name = nameVal;
          activePro.phone = phoneVal;
          activePro.tagline = taglineVal;
          activePro.bio = bioVal;

          // Sync with customer bookings locally
          this.state.bookings.forEach(b => {
            if (b.providerId === providerId) {
              b.providerName = nameVal;
            }
          });

          this.saveState();
        }

        // 2. Sync changes back to server (json-server PATCH)
        try {
          await fetch(`${API_BASE_URL}/providers/${activePro ? activePro.id : providerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameVal, phone: phoneVal, tagline: taglineVal, bio: bioVal })
          });
        } catch (err) {
          console.warn('API connection error. Profile updated locally offline:', err);
        }

        // 3. Show confirmation feedback and refresh views
        this.showToast('Profile info updated successfully!');
        
        // Re-render dashboards and search results to propagate names/taglines
        this.renderProviderDashboard();
        this.renderFeaturedProviders();
        this.updateExploreResults();
        this.renderUserBookings();
      });
    }
  }

}

Object.getOwnPropertyNames(ProviderExtension.prototype).forEach(name => {
  if (name !== 'constructor') {
    ServifyApp.prototype[name] = ProviderExtension.prototype[name];
  }
});