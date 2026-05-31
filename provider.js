// Extracted Provider Logic
class ProviderExtension {
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

      const avatarPreview = document.getElementById('edit-pro-photo-preview');
      if (avatarPreview && activeProvider.avatar) {
        avatarPreview.src = activeProvider.avatar;
        avatarPreview.style.display = 'block';
      }

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

    // Compute purely dynamic earnings from completed database bookings
    let finalGross = 0;
    let finalCommission = 0;
    let finalNet = 0;

    completedJobs.forEach(j => {
      const subtotal = j.subtotalPrice || (j.totalPrice - 5.00);
      const commission = j.platformCommission !== undefined ? j.platformCommission : (subtotal * 0.15);
      const net = j.workerPayout !== undefined ? j.workerPayout : (subtotal * 0.85);

      finalGross += subtotal;
      finalCommission += commission;
      finalNet += net;
    });

    if (netPayoutValue) netPayoutValue.textContent = `₹${finalNet.toFixed(2)}`;
    if (grossBillingsValue) grossBillingsValue.textContent = `₹${finalGross.toFixed(2)}`;
    if (commissionDeductedValue) commissionDeductedValue.textContent = `₹${finalCommission.toFixed(2)}`;
    if (completedCountValue) completedCountValue.textContent = completedJobs.length.toString();

    // 1. Render Pending Requests
    if (pendingRequests.length === 0) {
      requestsContainer.innerHTML = `<p class="text-muted text-center py-4">No pending job requests.</p>`;
    } else {
      requestsContainer.innerHTML = pendingRequests.map(req => {
        const subtotal = req.subtotalPrice || (req.totalPrice - 5.00);
        const payout = req.workerPayout !== undefined ? req.workerPayout : (subtotal * 0.85);
        const fee = req.platformCommission !== undefined ? req.platformCommission : (subtotal * 0.15);

        return `
          <div class="job-request-item" id="req-${req.id}">
            <div class="job-req-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <span class="job-req-client" style="font-weight: 600;">Client: Abhishek K.</span>
              <div class="text-right">
                <span class="job-req-price" id="total-${req.id}" style="font-size: 1.15rem; font-weight: 700; color: var(--primary);">₹${req.totalPrice.toFixed(2)}</span>
                <div class="provider-split-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  Payout: <span id="payout-${req.id}">₹${payout.toFixed(2)}</span> (Fee: <span id="fee-${req.id}">₹${fee.toFixed(2)}</span>)
                </div>
              </div>
            </div>
            <div class="job-req-details mb-4">
              <span><strong>Services:</strong> ${(req.servicesSelected || req.services || []).map(s => s.name).join(', ')}</span>
              <span><strong>Schedule:</strong> ${req.date} at ${req.time}</span>
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
              <h4>${(job.servicesSelected || job.services || []).map(s => s.name).join(', ')}</h4>
              <p>Client: Abhishek K. • ${job.time} • <strong style="color: var(--success);">Payout: ₹${payout.toFixed(2)}</strong></p>
            </div>
            <div>
              <button class="btn btn-primary btn-small" onclick="app.completeJob('${job.id}')">Complete Job</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2.5 Render Completed Projects & Client History Card (Last 5 jobs)
    const historyContainer = document.getElementById('provider-history-container');
    if (historyContainer) {
      if (completedJobs.length === 0) {
        historyContainer.innerHTML = `<p class="text-muted text-center py-4" style="margin: 0;">No completed projects in history yet.</p>`;
      } else {
        const sortedHistory = [...completedJobs]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        historyContainer.innerHTML = sortedHistory.map(job => {
          const subtotal = job.subtotalPrice || (job.totalPrice - 5.00);
          const clientName = job.customerName || 'Abhishek K.';
          const categoryIcon = this.getCategoryIcon ? this.getCategoryIcon(job.providerCategory || 'electrician') : '🛠️';
          
          return `
            <div class="history-item-row" onclick="app.openProjectHistoryDetail('${job.id}')">
              <div class="history-item-left">
                <div class="history-item-icon">${categoryIcon}</div>
                <div class="history-item-info">
                  <h4>Client: ${clientName}</h4>
                  <p>${(job.servicesSelected || job.services || []).map(s => s.name).join(', ')} • ${job.date}</p>
                </div>
              </div>
              <div class="history-item-right">
                <span class="history-item-price">₹${subtotal.toFixed(2)}</span>
                <span class="badge-completed">Completed</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Render Custom Rates Editor if ratesContainer exists
    if (ratesContainer && activeProvider) {
      ratesContainer.innerHTML = activeProvider.pricingList.map((srv, index) => `
        <div class="rate-edit-row">
          <span class="rate-edit-name">${srv.name}</span>
          <div class="rate-edit-input-wrapper">
            <span>₹</span>
            <input type="number" class="form-input-small text-right pr-input" value="${srv.price}" data-index="${index}">
          </div>
        </div>
      `).join('');
    }

    // 4. Render Earnings Analysis Chart dynamically
    this.renderProviderEarningsChart(completedJobs);
  }

  renderProviderEarningsChart(completedJobs) {
    const chartBarsContainer = document.getElementById('provider-earnings-chart-bars');
    if (!chartBarsContainer) return;

    // Initialize monthly gross revenues for Jan, Feb, Mar, Apr, May, Jun to zero
    const monthlyRevenues = {
      'Jan': 0,
      'Feb': 0,
      'Mar': 0,
      'Apr': 0,
      'May': 0,
      'Jun': 0
    };

    completedJobs.forEach(job => {
      try {
        const dateObj = new Date(job.date);
        const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
        if (monthlyRevenues[monthName] !== undefined) {
          const subtotal = job.subtotalPrice || (job.totalPrice - 5.00);
          monthlyRevenues[monthName] += subtotal;
        }
      } catch (e) {
        console.warn('Error parsing job date for earnings chart:', e);
      }
    });

    // Find the max monthly revenue to scale the height of CSS bars (max height 95%)
    let maxRevenue = 0;
    Object.values(monthlyRevenues).forEach(val => {
      if (val > maxRevenue) maxRevenue = val;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    chartBarsContainer.innerHTML = months.map(m => {
      const revenue = monthlyRevenues[m];
      let barHeight = 0;
      if (maxRevenue > 0) {
        barHeight = (revenue / maxRevenue) * 95;
      }
      
      return `
        <div class="chart-bar-col">
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">₹${revenue.toFixed(0)}</div>
          <div class="bar-fill" style="height: ${barHeight}%; transition: height 0.5s ease-out;"></div>
          <span>${m}</span>
        </div>
      `;
    }).join('');
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

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtotalPrice: subtotal })
      });
      if (!response.ok) throw new Error('API accept failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.subtotalPrice = updated.subtotalPrice;
      booking.totalPrice = updated.totalPrice;
      booking.platformCommission = updated.platformCommission;
      booking.workerPayout = updated.workerPayout;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'accepted';
      
      // Update local price in offline simulation
      booking.subtotalPrice = subtotal;
      booking.platformCommission = subtotal * 0.15;
      booking.workerPayout = subtotal * 0.85;
      booking.totalPrice = subtotal + (booking.serviceFee || 5.00);

      booking.chatHistory.push({
        sender: 'provider',
        text: `Great! I've accepted this request for ₹${booking.totalPrice.toFixed(2)} (₹${subtotal.toFixed(2)} price + ₹5.00 service fee) and added it to my calendar. See you then!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.saveState();
    this.showToast('Job request accepted!');
    this.renderProviderDashboard();
  }

  async declineJobRequest(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST'
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
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/complete`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('API complete failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'completed';
      booking.chatHistory.push({
        sender: 'provider',
        text: "The job has been completed. Thank you for choosing Servify!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
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

          // Push to backend
          try {
            const res = await fetch(`${API_BASE_URL}/providers/${providerId}/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(activePro)
            });
            const data = await res.json();
            
            if (data.success && data.provider) {
              Object.assign(activePro, data.provider);
            }
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

          // Sync with server
          try {
            await fetch(`${API_BASE_URL}/providers/${providerId}/rates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pricingList: activePro.pricingList })
            });
          } catch (err) {
            console.warn('Failed to sync rates with server:', err);
          }
        }
      }
    });
  }
  // ============================================================
  //  RENDER EXTENDED DASHBOARD (called after main renderProviderDashboard)
  // ============================================================
  renderExtendedDashboard() {
    const extSection = document.getElementById('provider-extended-section');
    if (!extSection) return;
    extSection.style.display = 'block';

    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const activeProvider = this.state.providers.find(p => p.id === providerId);
    const proBookings = this.state.bookings.filter(b => b.providerId === providerId);
    const completedJobs = proBookings.filter(b => b.status === 'completed');

    this.renderAvailabilityCard(activeProvider);
    this.renderPerformanceMetrics(proBookings);
    this.renderWalletCard(activeProvider, completedJobs);
    this.renderNotificationsCard(activeProvider);
    this.renderRatingsCard(activeProvider);
    this.renderTopServicesChart(completedJobs);
    this.renderGoalsAndBadges(activeProvider, completedJobs);
    this.renderReferralCard(activeProvider);
    this.renderServiceAreaCard(activeProvider);
    this.bindExtendedDashboardEvents(activeProvider);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- 1. Availability Card ---
  renderAvailabilityCard(provider) {
    const toggle = document.getElementById('availability-toggle-input');
    const label  = document.getElementById('availability-status-label');
    if (!toggle || !label) return;

    const isOnline = !provider || !provider.availability ? true : (provider.availability.isOnline !== false);
    toggle.checked = isOnline;
    label.textContent = isOnline ? 'Online' : 'Offline';
    label.className = 'avail-label ' + (isOnline ? 'avail-online' : 'avail-offline');
  }

  // --- 2. Performance Metrics Card ---
  renderPerformanceMetrics(proBookings) {
    const total     = proBookings.length;
    const accepted  = proBookings.filter(b => b.status === 'accepted').length;
    const completed = proBookings.filter(b => b.status === 'completed').length;
    const cancelled = proBookings.filter(b => b.status === 'cancelled').length;

    const uniqueClients = [...new Set(proBookings.filter(b => b.customerId).map(b => b.customerId))];
    const repeatClients = uniqueClients.filter(cId => proBookings.filter(b => b.customerId === cId).length > 1).length;

    const decisionTotal    = accepted + cancelled;
    const acceptanceRate   = decisionTotal > 0 ? Math.round((accepted / decisionTotal) * 100) : 100;
    const completionTotal  = accepted + completed;
    const completionRate   = completionTotal > 0 ? Math.round((completed / completionTotal) * 100) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('metric-acceptance-rate', acceptanceRate + '%');
    set('metric-completion-rate', completionRate + '%');
    set('metric-total-clients',   uniqueClients.length);
    set('metric-repeat-clients',  repeatClients);
  }

  // --- 3. Wallet Card ---
  renderWalletCard(provider, completedJobs) {
    const lifetimeEarned = completedJobs.reduce((sum, j) => sum + (j.workerPayout || (j.subtotalPrice || 0) * 0.85), 0);
    const walletBalance  = provider && provider.wallet ? (provider.wallet.balance || 0) : 0;
    const transactions   = provider && provider.wallet ? (provider.wallet.transactions || []) : [];

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('wallet-balance-display',  `₹${walletBalance.toFixed(2)}`);
    set('wallet-lifetime-display', `Lifetime earned: ₹${lifetimeEarned.toFixed(2)}`);

    const txnContainer = document.getElementById('wallet-transactions-container');
    if (!txnContainer) return;

    if (transactions.length === 0 && completedJobs.length === 0) {
      txnContainer.innerHTML = `<p class="text-muted text-center py-4">No transactions yet.</p>`;
      return;
    }

    // If no server wallet transactions, show completed jobs as credit entries
    const displayTxns = transactions.length > 0 ? transactions : completedJobs.slice(-5).map(j => ({
      id: j.id,
      type: 'credit',
      amount: j.workerPayout || (j.subtotalPrice || 0) * 0.85,
      description: `Job payout – ${(j.services || []).map(s => s.name).join(', ') || 'Service'}`,
      date: j.date || 'N/A'
    }));

    txnContainer.innerHTML = displayTxns.slice(-8).reverse().map(t => `
      <div class="transaction-row">
        <div>
          <div class="txn-desc">${t.description}</div>
          <div class="txn-date">${t.date}</div>
        </div>
        <div class="txn-amount-${t.type}">${t.type === 'credit' ? '+' : '-'}₹${parseFloat(t.amount).toFixed(2)}</div>
      </div>
    `).join('');
  }

  // --- 4. Notifications Card ---
  renderNotificationsCard(provider) {
    const feed    = document.getElementById('notification-feed-container');
    const badge   = document.getElementById('notif-unread-count');
    if (!feed) return;

    const notifications = (provider && provider.notifications) ? provider.notifications : [];

    // Generate auto-notifications from booking state
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const proBookings = this.state.bookings.filter(b => b.providerId === providerId);
    const pending = proBookings.filter(b => b.status === 'pending');

    const autoNotifs = [];
    if (pending.length > 0) {
      autoNotifs.push({ id: 'auto_pending', title: 'New Job Request', message: `You have ${pending.length} pending booking request(s) awaiting response.`, type: 'booking', isRead: false, date: 'Just now' });
    }

    const allNotifs = [...autoNotifs, ...notifications].slice(0, 10);
    const unreadCount = allNotifs.filter(n => !n.isRead).length;

    if (badge) {
      if (unreadCount > 0) { badge.style.display = 'inline'; badge.textContent = unreadCount; }
      else { badge.style.display = 'none'; }
    }

    if (allNotifs.length === 0) {
      feed.innerHTML = `<p class="text-muted text-center py-4">No notifications.</p>`;
      return;
    }

    const iconMap = { booking: 'bell', money: 'banknote', info: 'info' };
    const iconClassMap = { booking: 'notif-icon-booking', money: 'notif-icon-money', info: 'notif-icon-info' };

    feed.innerHTML = allNotifs.map(n => `
      <div class="notif-item ${n.isRead ? '' : 'unread'}">
        <div class="notif-item-icon ${iconClassMap[n.type] || 'notif-icon-info'}">
          <i data-lucide="${iconMap[n.type] || 'bell'}"></i>
        </div>
        <div>
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${n.date}</div>
        </div>
      </div>
    `).join('');
  }

  async markNotificationsRead() {
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    try {
      await fetch(`${API_BASE_URL}/providers/${providerId}/notifications/read`, { method: 'POST' });
    } catch (e) { console.warn('Could not mark notifications read on server:', e); }
    const badge = document.getElementById('notif-unread-count');
    if (badge) badge.style.display = 'none';
    const feed = document.getElementById('notification-feed-container');
    if (feed) feed.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
    this.showToast('All notifications marked as read.');
  }

  // --- 5. Ratings & Reviews Card ---
  renderRatingsCard(provider) {
    const reviews = (provider && provider.reviews) ? provider.reviews : [];
    const avgRating = provider ? (provider.rating || 5.0) : 5.0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('provider-avg-rating',   avgRating.toFixed(1));
    set('provider-review-count', `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`);

    const starsEl = document.getElementById('provider-rating-stars');
    if (starsEl) {
      const full  = Math.floor(avgRating);
      const half  = avgRating % 1 >= 0.5 ? 1 : 0;
      const empty = 5 - full - half;
      starsEl.textContent = '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(empty);
    }

    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    if (reviews.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4">No reviews yet. Complete jobs to receive ratings.</p>`;
      return;
    }

    container.innerHTML = [...reviews].reverse().slice(0, 10).map(r => `
      <div class="review-item">
        <div class="review-header">
          <div>
            <span class="review-author">${r.author || 'Anonymous'}</span>
            <div class="review-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
          </div>
          <span class="review-date">${r.date || ''}</span>
        </div>
        <div class="review-text">${r.text || ''}</div>
      </div>
    `).join('');
  }

  // --- 6. Top Services Breakdown Chart ---
  renderTopServicesChart(completedJobs) {
    const container = document.getElementById('top-services-chart-container');
    if (!container) return;

    const serviceMap = {};
    completedJobs.forEach(job => {
      (job.services || job.servicesSelected || []).forEach(s => {
        if (!serviceMap[s.name]) serviceMap[s.name] = 0;
        serviceMap[s.name] += s.price || 0;
      });
    });

    const sorted = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (sorted.length === 0) {
      container.innerHTML = `<p class="text-muted text-center py-4">Complete jobs to see service breakdown.</p>`;
      return;
    }

    const maxVal = sorted[0][1];
    container.innerHTML = sorted.map(([name, val]) => {
      const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
      return `
        <div class="service-bar-row">
          <div class="service-bar-label">
            <span class="service-bar-name">${name}</span>
            <span class="service-bar-val">₹${val.toFixed(0)}</span>
          </div>
          <div class="service-bar-track">
            <div class="service-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 7. Goals & Badges Card ---
  renderGoalsAndBadges(provider, completedJobs) {
    const now = new Date();
    const thisMonthEarned = completedJobs
      .filter(j => { try { const d = new Date(j.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); } catch(e) { return false; } })
      .reduce((sum, j) => sum + (j.workerPayout || (j.subtotalPrice || 0) * 0.85), 0);

    const monthlyGoal = provider && provider.monthlyGoal ? provider.monthlyGoal : 0;
    const pct = (monthlyGoal > 0) ? Math.min(100, Math.round((thisMonthEarned / monthlyGoal) * 100)) : 0;
    const circumference = 314;
    const offset = circumference - (pct / 100) * circumference;

    const ringCircle = document.getElementById('goal-ring-circle');
    const ringPct    = document.getElementById('goal-ring-pct');
    const currentVal = document.getElementById('goal-current-val');
    const targetVal  = document.getElementById('goal-target-val');

    if (ringCircle) ringCircle.style.strokeDashoffset = offset;
    if (ringPct)    ringPct.textContent = pct + '%';
    if (currentVal) currentVal.textContent = `₹${thisMonthEarned.toFixed(0)}`;
    if (targetVal)  targetVal.textContent = monthlyGoal > 0 ? `₹${monthlyGoal.toLocaleString('en-IN')}` : 'Not set';

    // Apply gradient to ring via inline SVG defs
    const ringContainer = document.querySelector('.goal-ring-svg');
    if (ringContainer && !ringContainer.querySelector('defs')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `<linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient>`;
      ringContainer.prepend(defs);
    }

    // Define all possible badges
    const allBadges = [
      { key: 'first_job',    emoji: '🎯', name: 'First Job',      condition: completedJobs.length >= 1 },
      { key: 'five_jobs',    emoji: '⭐', name: '5 Jobs Done',    condition: completedJobs.length >= 5 },
      { key: 'ten_jobs',     emoji: '🏅', name: '10 Jobs Done',   condition: completedJobs.length >= 10 },
      { key: 'fifty_jobs',   emoji: '🏆', name: '50 Jobs Done',   condition: completedJobs.length >= 50 },
      { key: 'five_star',    emoji: '💫', name: '5-Star Rating',  condition: provider && provider.rating >= 4.8 && provider.reviewsCount > 0 },
      { key: 'profile_done', emoji: '✅', name: 'Profile Complete', condition: provider && provider.isProfileComplete },
      { key: 'goal_hit',     emoji: '🎉', name: 'Goal Achieved',  condition: pct >= 100 },
      { key: 'veteran',      emoji: '🦅', name: 'Veteran Pro',    condition: provider && provider.experience >= 5 },
    ];

    const grid = document.getElementById('badges-grid-container');
    if (grid) {
      grid.innerHTML = allBadges.map(b => `
        <div class="badge-item ${b.condition ? 'earned' : 'locked'}" title="${b.condition ? 'Earned!' : 'Keep working to unlock'}">
          <span class="badge-emoji">${b.emoji}</span>
          <span class="badge-name">${b.name}</span>
        </div>
      `).join('');
    }
  }

  openGoalModal() {
    const modal = document.getElementById('goal-modal');
    if (!modal) return;
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider = this.state.providers.find(p => p.id === providerId);
    const input = document.getElementById('goal-amount-input');
    if (input && provider && provider.monthlyGoal) input.value = provider.monthlyGoal;
    modal.classList.remove('hidden');
  }

  async saveMonthlyGoal() {
    const input = document.getElementById('goal-amount-input');
    const goal = parseFloat(input ? input.value : 0) || 0;
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider = this.state.providers.find(p => p.id === providerId);

    if (provider) { provider.monthlyGoal = goal; this.saveState(); }

    try {
      await fetch(`${API_BASE_URL}/providers/${providerId}/goal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyGoal: goal })
      });
    } catch (e) { console.warn('Could not save goal to server:', e); }

    document.getElementById('goal-modal').classList.add('hidden');
    this.showToast(`Monthly goal set to ₹${goal.toLocaleString('en-IN')}!`);
    this.renderExtendedDashboard();
  }

  // --- 8. Referral Card ---
  renderReferralCard(provider) {
    const codeEl = document.getElementById('referral-code-text');
    if (!codeEl) return;
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const code = provider && provider.referralCode ? provider.referralCode : 'SERV-' + providerId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-6);
    codeEl.textContent = code;
  }

  copyReferralCode() {
    const code = document.getElementById('referral-code-text');
    if (code) navigator.clipboard.writeText(code.textContent).then(() => this.showToast('Referral code copied!')).catch(() => this.showToast('Code: ' + code.textContent));
  }

  shareReferralLink() {
    const code = document.getElementById('referral-code-text');
    const link = `https://servify.app/join?ref=${code ? code.textContent : 'SERVIFY'}`;
    if (navigator.share) {
      navigator.share({ title: 'Join me on Servify!', text: `Use my referral code ${code ? code.textContent : ''} to sign up as a service partner on Servify!`, url: link });
    } else {
      navigator.clipboard.writeText(link).then(() => this.showToast('Referral link copied to clipboard!'));
    }
  }

  // --- 9. Service Area Card ---
  renderServiceAreaCard(provider) {
    const slider = document.getElementById('service-radius-slider');
    const badge  = document.getElementById('service-radius-badge');
    const outer  = document.getElementById('service-area-outer');
    if (!slider) return;

    const radius = provider && provider.serviceRadius ? provider.serviceRadius : 10;
    slider.value = radius;
    if (badge) badge.textContent = radius + ' km';
    if (outer) {
      const scale = 80 + (radius / 50) * 120;
      outer.style.width  = scale + 'px';
      outer.style.height = scale + 'px';
    }
  }

  // --- Availability Toggle & Working Hours Modal ---
  openAvailabilityModal() {
    const modal  = document.getElementById('availability-modal');
    const editor = document.getElementById('working-hours-editor');
    if (!modal || !editor) return;

    const days = [
      { key: 'mon', label: 'Monday' },
      { key: 'tue', label: 'Tuesday' },
      { key: 'wed', label: 'Wednesday' },
      { key: 'thu', label: 'Thursday' },
      { key: 'fri', label: 'Friday' },
      { key: 'sat', label: 'Saturday' },
      { key: 'sun', label: 'Sunday' },
    ];

    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider   = this.state.providers.find(p => p.id === providerId);
    const wh = (provider && provider.availability && provider.availability.workingHours) || {};

    editor.innerHTML = days.map(d => {
      const dayData = wh[d.key] || { enabled: d.key !== 'sun', open: '09:00', close: '18:00' };
      return `
        <div class="wh-editor-row" id="wh-row-${d.key}">
          <span class="wh-editor-day">${d.label}</span>
          <input type="time" class="wh-editor-time" id="wh-open-${d.key}" value="${dayData.open || '09:00'}" ${dayData.enabled ? '' : 'disabled'}>
          <input type="time" class="wh-editor-time" id="wh-close-${d.key}" value="${dayData.close || '18:00'}" ${dayData.enabled ? '' : 'disabled'}>
          <input type="checkbox" class="wh-editor-toggle" id="wh-enabled-${d.key}" ${dayData.enabled ? 'checked' : ''} onchange="document.getElementById('wh-open-${d.key}').disabled=!this.checked;document.getElementById('wh-close-${d.key}').disabled=!this.checked;">
        </div>
      `;
    }).join('');

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async saveWorkingHours() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const workingHours = {};
    days.forEach(d => {
      const enabledEl = document.getElementById(`wh-enabled-${d}`);
      const openEl    = document.getElementById(`wh-open-${d}`);
      const closeEl   = document.getElementById(`wh-close-${d}`);
      if (enabledEl) workingHours[d] = { enabled: enabledEl.checked, open: openEl ? openEl.value : '09:00', close: closeEl ? closeEl.value : '18:00' };
    });

    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider   = this.state.providers.find(p => p.id === providerId);
    if (provider) {
      if (!provider.availability) provider.availability = {};
      provider.availability.workingHours = workingHours;
      this.saveState();
    }

    try {
      await fetch(`${API_BASE_URL}/providers/${providerId}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workingHours })
      });
    } catch (e) { console.warn('Could not save working hours to server:', e); }

    document.getElementById('availability-modal').classList.add('hidden');
    this.showToast('Working hours saved!');
    this.renderExtendedDashboard();
  }

  // --- Wallet / Withdraw Modal ---
  openWithdrawModal() {
    const modal = document.getElementById('withdraw-modal');
    if (!modal) return;
    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider   = this.state.providers.find(p => p.id === providerId);
    const balance    = provider && provider.wallet ? (provider.wallet.balance || 0) : 0;
    const el = document.getElementById('withdraw-available-amount');
    if (el) el.textContent = `₹${balance.toFixed(2)}`;
    modal.classList.remove('hidden');
  }

  async processWithdrawal() {
    const amountInput  = document.getElementById('withdraw-amount-input');
    const methodSelect = document.getElementById('withdraw-method-select');
    const amount  = parseFloat(amountInput ? amountInput.value : 0);
    const method  = methodSelect ? methodSelect.value : 'UPI';

    if (!amount || amount <= 0) { this.showToast('Please enter a valid amount.'); return; }

    const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
    const provider   = this.state.providers.find(p => p.id === providerId);
    const balance    = provider && provider.wallet ? (provider.wallet.balance || 0) : 0;

    if (amount > balance) { this.showToast('Insufficient wallet balance.'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/providers/${providerId}/wallet/withdraw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, method })
      });
      const data = await res.json();
      if (data.success && provider) { if (!provider.wallet) provider.wallet = { balance: 0, transactions: [] }; provider.wallet.balance = data.balance; }
    } catch (e) {
      if (provider && provider.wallet) provider.wallet.balance -= amount;
    }

    this.saveState();
    document.getElementById('withdraw-modal').classList.add('hidden');
    this.showToast(`₹${amount.toFixed(2)} withdrawal via ${method} initiated!`);
    this.renderExtendedDashboard();
  }

  // --- Invoice Print ---
  printInvoice(bookingId) {
    const booking  = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const overlay  = document.getElementById('invoice-print-overlay');
    const body     = document.getElementById('invoice-print-body');
    if (!overlay || !body) return;

    const services = (booking.services || booking.servicesSelected || []);
    const subtotal = booking.subtotalPrice || (booking.totalPrice - 5);
    const commission = booking.platformCommission || subtotal * 0.15;
    const payout     = booking.workerPayout || subtotal * 0.85;

    body.innerHTML = `
      <div class="invoice-header-row">
        <div class="invoice-brand">⚡ Servify</div>
        <div class="invoice-meta">
          <div><strong>Invoice #</strong>${booking.id}</div>
          <div><strong>Date:</strong> ${booking.date}</div>
          <div><strong>Status:</strong> ${booking.status}</div>
        </div>
      </div>
      <div class="invoice-parties">
        <div>
          <div class="invoice-party-label">Bill To (Client)</div>
          <div class="invoice-party-name">${booking.customerName || 'Client'}</div>
          <div class="invoice-party-detail">${booking.customerAddress || ''}</div>
          <div class="invoice-party-detail">📞 ${booking.customerPhone || 'N/A'}</div>
        </div>
        <div>
          <div class="invoice-party-label">Service By (Provider)</div>
          <div class="invoice-party-name">${booking.providerName || 'Provider'}</div>
          <div class="invoice-party-detail">${booking.providerCategory || ''}</div>
          <div class="invoice-party-detail">🕐 ${booking.time || ''}</div>
        </div>
      </div>
      <table class="invoice-table">
        <thead><tr><th>#</th><th>Service</th><th>Amount</th></tr></thead>
        <tbody>
          ${services.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>₹${parseFloat(s.price || 0).toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="invoice-total-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div class="invoice-total-row"><span>Platform Fee (15%)</span><span>-₹${commission.toFixed(2)}</span></div>
        <div class="invoice-total-row invoice-total-grand"><span>Your Payout</span><span>₹${payout.toFixed(2)}</span></div>
      </div>
    `;

    overlay.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- Bind all extended dashboard events ---
  bindExtendedDashboardEvents(provider) {
    // Availability toggle
    const toggle = document.getElementById('availability-toggle-input');
    if (toggle && !toggle._extBound) {
      toggle._extBound = true;
      toggle.addEventListener('change', async () => {
        const isOnline = toggle.checked;
        const label = document.getElementById('availability-status-label');
        if (label) { label.textContent = isOnline ? 'Online' : 'Offline'; label.className = 'avail-label ' + (isOnline ? 'avail-online' : 'avail-offline'); }

        const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
        const prov = this.state.providers.find(p => p.id === providerId);
        if (prov) { if (!prov.availability) prov.availability = {}; prov.availability.isOnline = isOnline; this.saveState(); }
        try {
          await fetch(`${API_BASE_URL}/providers/${providerId}/availability`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isOnline })
          });
        } catch (e) { console.warn('Could not sync availability:', e); }
        this.showToast(isOnline ? 'You are now Online and accepting bookings.' : 'You are now Offline.');
      });
    }

    // Service area radius slider
    const slider = document.getElementById('service-radius-slider');
    if (slider && !slider._extBound) {
      slider._extBound = true;
      let debounceTimer;
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        const badge = document.getElementById('service-radius-badge');
        const outer = document.getElementById('service-area-outer');
        if (badge) badge.textContent = val + ' km';
        if (outer) { const scale = 80 + (val / 50) * 120; outer.style.width = scale + 'px'; outer.style.height = scale + 'px'; }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const providerId = (this.state.currentUser && this.state.currentUser.providerId) || 'p1';
          const prov = this.state.providers.find(p => p.id === providerId);
          if (prov) { prov.serviceRadius = val; this.saveState(); }
          try {
            await fetch(`${API_BASE_URL}/providers/${providerId}/radius`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceRadius: val })
            });
          } catch (e) { console.warn('Could not sync radius:', e); }
        }, 800);
      });
    }
  }

}

Object.getOwnPropertyNames(ProviderExtension.prototype).forEach(name => {
  if (name !== 'constructor') {
    ServifyApp.prototype[name] = ProviderExtension.prototype[name];
  }
});
