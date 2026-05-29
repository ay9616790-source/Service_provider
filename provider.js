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

    if (netPayoutValue) netPayoutValue.textContent = `$${finalNet.toFixed(2)}`;
    if (grossBillingsValue) grossBillingsValue.textContent = `$${finalGross.toFixed(2)}`;
    if (commissionDeductedValue) commissionDeductedValue.textContent = `$${finalCommission.toFixed(2)}`;
    if (completedCountValue) completedCountValue.textContent = 12 + completedJobs.length;

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
                <span class="job-req-price" id="total-${req.id}" style="font-size: 1.15rem; font-weight: 700; color: var(--primary);">$${req.totalPrice.toFixed(2)}</span>
                <div class="provider-split-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  Payout: <span id="payout-${req.id}">$${payout.toFixed(2)}</span> (Fee: <span id="fee-${req.id}">$${fee.toFixed(2)}</span>)
                </div>
              </div>
            </div>
            <div class="job-req-details mb-4">
              <span><strong>Services:</strong> ${req.servicesSelected.map(s => s.name).join(', ')}</span>
              <span><strong>Schedule:</strong> ${req.date} at ${req.time}</span>
              <div style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Confirm/Edit Price ($):</label>
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
              <h4>${job.servicesSelected.map(s => s.name).join(', ')}</h4>
              <p>Client: Abhishek K. • ${job.time} • <strong style="color: var(--success);">Payout: $${payout.toFixed(2)}</strong></p>
            </div>
            <div>
              <button class="btn btn-primary btn-small" onclick="app.completeJob('${job.id}')">Complete Job</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Render Custom Rates Editor (for provider id 'p1' Alex Mercer)
    if (alexMercer) {
      ratesContainer.innerHTML = alexMercer.pricingList.map((srv, index) => `
        <div class="rate-edit-row">
          <span class="rate-edit-name">${srv.name}</span>
          <div class="rate-edit-input-wrapper">
            <span>$</span>
            <input type="number" class="form-input-small text-right pr-input" value="${srv.price}" data-index="${index}">
          </div>
        </div>
      `).join('');
    }
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
        text: `Great! I've accepted this request for $${booking.totalPrice.toFixed(2)} ($${subtotal.toFixed(2)} price + $5.00 service fee) and added it to my calendar. See you then!`,
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
            
            payoutSpan.textContent = `$${payout.toFixed(2)}`;
            feeSpan.textContent = `$${fee.toFixed(2)}`;
            totalSpan.textContent = `$${total.toFixed(2)}`;
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

    const editPhotoInput = document.getElementById('edit-pro-avatar');
    const editPhotoPreview = document.getElementById('edit-pro-photo-preview');
    if (editPhotoInput && editPhotoPreview) {
      editPhotoInput.addEventListener('change', (e) => {
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
            editPhotoPreview.src = compressedBase64;
            editPhotoPreview.style.display = 'block';
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Bind profile update form submission
    const profileForm = document.getElementById('provider-profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameVal = document.getElementById('edit-pro-name').value.trim();
        const phoneVal = document.getElementById('edit-pro-phone').value.trim();
        const taglineVal = document.getElementById('edit-pro-tagline').value.trim();
        const bioVal = document.getElementById('edit-pro-bio').value.trim();
        const editPhotoPreview = document.getElementById('edit-pro-photo-preview');
        let avatarVal = null;
        if (editPhotoPreview && editPhotoPreview.src && editPhotoPreview.style.display !== 'none') {
            avatarVal = editPhotoPreview.src;
        }

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
          if (avatarVal) activePro.avatar = avatarVal;

          // Sync with customer bookings locally
          this.state.bookings.forEach(b => {
            if (b.providerId === providerId) {
              b.providerName = nameVal;
              if (avatarVal) b.providerAvatar = avatarVal;
            }
          });

          this.saveState();
        }

        // 2. Sync changes back to server database
        try {
          const response = await fetch(`${API_BASE_URL}/providers/${providerId}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameVal,
              phone: phoneVal,
              tagline: taglineVal,
              bio: bioVal,
              ...(avatarVal && { avatar: avatarVal })
            })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server error saving profile.');
          }

          const resData = await response.json();
          if (resData.success && resData.provider) {
            // Update local memory state with details returned from backend
            const updatedPro = resData.provider;
            const idx = this.state.providers.findIndex(p => p.id === providerId);
            if (idx !== -1) {
              this.state.providers[idx] = updatedPro;
            }
            this.saveState();
          }
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
