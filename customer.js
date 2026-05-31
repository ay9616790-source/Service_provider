// Extracted Customer Logic
class CustomerExtension {
  // --- CUSTOMER DASHBOARD & MOCK CHAT ---
  renderUserBookings() {
    const container = document.getElementById('user-bookings-container');
    if (!container) return;

    // Pre-populate Edit Profile form if we have logged-in user
    if (this.state.currentUser && this.state.currentUser.role === 'customer') {
      const u = this.state.currentUser;
      const nameInput = document.getElementById('edit-client-name');
      const phoneInput = document.getElementById('edit-client-phone');
      const societyInput = document.getElementById('edit-client-society');

      if (nameInput && document.activeElement !== nameInput) nameInput.value = u.name || '';
      if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = u.phone || '';
      if (societyInput) societyInput.value = u.society || 'gokuldham';
    }

    if (this.state.bookings.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <i data-lucide="calendar-x" class="huge-icon"></i>
          <p>You have no bookings scheduled.</p>
          <button class="btn btn-primary mt-2" onclick="app.navigate('explore-view')">Explore Professionals</button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = this.state.bookings.map(b => {
      let badgeClass = 'badge-pending';
      if (b.status === 'accepted') badgeClass = 'badge-accepted';
      if (b.status === 'completed') badgeClass = 'badge-completed';
      if (b.status === 'cancelled') badgeClass = 'badge-cancelled';

      return `
        <div class="booking-item-card" id="card-${b.id}">
          <div class="booking-item-left">
            <img src="${b.providerAvatar}" alt="${b.providerName}" class="booking-pro-avatar">
            <div class="booking-details-txt">
              <h3>${b.providerName}</h3>
              <span class="provider-card-category">${this.getCategoryIcon(b.providerCategory)} ${b.providerCategory}</span>
              <div class="booking-meta-row">
                <span><i data-lucide="calendar"></i> ${b.date}</span>
                <span><i data-lucide="clock"></i> ${b.time}</span>
              </div>
              <div class="booking-services-badges">
                ${(b.servicesSelected || b.services || []).map(s => `<span class="booking-service-tag">${s.name} (₹${s.price})</span>`).join('')}
              </div>
              <div class="booking-price-breakdown-row mt-2" style="font-size: 0.8rem; color: var(--text-secondary); display: flex; gap: 0.5rem; flex-wrap: wrap; opacity: 0.85;">
                <span>Subtotal: ₹${(b.subtotalPrice || (b.totalPrice - 5.00)).toFixed(2)}</span>
                <span>•</span>
                <span>Platform Fee: ₹${(b.serviceFee || 5.00).toFixed(2)}</span>
                <span>•</span>
                <strong style="color: var(--text-primary);">Total: ₹${b.totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
          
          <div class="booking-item-right">
            <span class="badge ${badgeClass}">${b.status}</span>
            <div class="text-right">
              <span class="booking-price-tag">₹${b.totalPrice.toFixed(2)}</span>
              <div class="booking-actions-row">
                <button class="btn btn-secondary btn-small" onclick="app.openChatFromBooking('${b.id}')"><i data-lucide="message-square"></i> Chat</button>
                ${b.status === 'pending' ? `
                  <button class="btn btn-secondary btn-small text-red" onclick="app.cancelBooking('${b.id}')" style="color: var(--danger); border-color: var(--danger-light);">Cancel</button>
                ` : ''}
                ${b.status === 'completed' ? (
                  b.isReviewed ? `
                    <span class="badge" style="background-color: var(--primary-light); color: var(--primary); text-transform: none; font-size: 0.8rem; padding: 0.4rem 0.65rem; border-radius: 0.35rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="star" style="width:0.85rem; height:0.85rem; fill:var(--primary); display:inline;"></i> Rated</span>
                  ` : `
                    <button class="btn btn-primary btn-small" onclick="app.openReviewModal('${b.id}')"><i data-lucide="star"></i> Rate Professional</button>
                  `
                ) : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async cancelBooking(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('API cancel failed');
      const updated = await response.json();
      booking.status = updated.status;
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      booking.status = 'cancelled';
    }

    this.saveState();
    this.showToast('Booking cancelled.');
    this.renderUserBookings();
    this.renderProviderDashboard();
  }

  // --- RATING & REVIEW SYSTEM ---
  openReviewModal(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    this.state.activeReviewBookingId = bookingId;
    this.state.activeReviewStars = 5; // Default to 5 stars

    // Set provider name in modal
    const nameEl = document.getElementById('review-pro-name');
    if (nameEl) nameEl.textContent = booking.providerName;

    // Reset stars state visually (all active)
    document.querySelectorAll('.star-rating-selector .star-btn').forEach(btn => {
      btn.classList.add('active');
    });

    // Clear textarea
    const textInput = document.getElementById('review-text-input');
    if (textInput) textInput.value = '';

    // Show modal
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activeReviewBookingId = null;
  }

  bindReviewEvents() {
    // Star clicking handlers
    const stars = document.querySelectorAll('.star-rating-selector .star-btn');
    stars.forEach(star => {
      star.addEventListener('click', (e) => {
        const ratingVal = parseInt(star.getAttribute('data-value'));
        this.state.activeReviewStars = ratingVal;
        
        // Toggle active class on stars
        stars.forEach(s => {
          const val = parseInt(s.getAttribute('data-value'));
          if (val <= ratingVal) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });

    // Submit Review button handler
    const submitBtn = document.getElementById('submit-review-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const bookingId = this.state.activeReviewBookingId;
        if (!bookingId) return;

        const booking = this.state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const ratingVal = this.state.activeReviewStars;
        const textVal = document.getElementById('review-text-input')?.value.trim() || '';

        try {
          const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rating: ratingVal,
              text: textVal,
              author: 'Abhishek K.' // Logged in user name
            })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to submit review');
          }

          const resData = await response.json();
          if (resData.success) {
            // Update booking details
            booking.isReviewed = true;
            booking.review = resData.booking.review;

            // Update corresponding provider details in state
            const updatedPro = resData.provider;
            const idx = this.state.providers.findIndex(p => p.id === updatedPro.id);
            if (idx !== -1) {
              this.state.providers[idx] = updatedPro;
            }
          }
        } catch (err) {
          console.warn('API error, falling back to local simulation review submission:', err);
          // Offline local fallback
          booking.isReviewed = true;
          booking.review = {
            rating: ratingVal,
            text: textVal,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          };

          const provider = this.state.providers.find(p => p.id === booking.providerId);
          if (provider) {
            provider.reviews = provider.reviews || [];
            provider.reviews.push({
              author: 'Abhishek K.',
              date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              rating: ratingVal,
              text: textVal
            });
            provider.reviewsCount = provider.reviews.length;
            const totalStars = provider.reviews.reduce((sum, r) => sum + r.rating, 0);
            provider.rating = parseFloat((totalStars / provider.reviewsCount).toFixed(1));
          }
        }

        // Save updated state, close modal, and re-render everything
        this.saveState();
        this.closeReviewModal();
        this.showToast('Thank you! Your rating has been submitted.');
        
        this.renderUserBookings();
        this.renderFeaturedProviders();
        this.updateExploreResults();
      });
    }
  }

  // --- CHAT SYSTEM ---
  renderChatContacts() {
    const container = document.getElementById('chat-contacts-list');
    if (!container) return;

    if (this.state.bookings.length === 0) {
      container.innerHTML = `<p class="text-muted text-center mt-4">No active booking contacts.</p>`;
      return;
    }

    container.innerHTML = this.state.bookings.map(b => {
      const lastMsg = b.chatHistory[b.chatHistory.length - 1];
      const previewText = lastMsg ? lastMsg.text : 'No messages yet';
      const activeClass = this.state.activeChatBookingId === b.id ? 'active' : '';

      return `
        <div class="chat-contact-item ${activeClass}" onclick="app.selectChatContact('${b.id}')">
          <img src="${b.providerAvatar}" alt="${b.providerName}" class="chat-contact-avatar">
          <div class="chat-contact-info">
            <div class="chat-contact-name">${b.providerName}</div>
            <div class="chat-contact-preview">${previewText}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  selectChatContact(bookingId) {
    this.state.activeChatBookingId = bookingId;
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Refresh contact active states
    this.renderChatContacts();

    // Render active chat header & input box
    const chatHeader = document.getElementById('chat-header-info');
    chatHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <img src="${booking.providerAvatar}" alt="${booking.providerName}" class="small-avatar" style="width: 2.5rem; height: 2.5rem;">
        <div>
          <h3>${booking.providerName}</h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); text-transform: capitalize;">${booking.providerCategory} • Order #${booking.id.split('_')[1]}</p>
        </div>
      </div>
    `;

    document.getElementById('chat-input-panel').classList.remove('hidden');
    this.renderChatMessages();
  }

  renderChatMessages() {
    const booking = this.state.bookings.find(b => b.id === this.state.activeChatBookingId);
    const box = document.getElementById('chat-messages-box');
    if (!booking || !box) return;

    box.innerHTML = booking.chatHistory.map(msg => {
      const bubbleClass = msg.sender === 'user' ? 'user' : 'provider';
      return `
        <div class="chat-msg-bubble ${bubbleClass}">
          ${msg.text}
          <span class="chat-msg-time">${msg.time}</span>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    box.scrollTop = box.scrollHeight;
  }

  openChatFromBooking(bookingId) {
    // 1. Activate Chat Tab
    const tabTrig = document.getElementById('user-chat-tab-trigger');
    if (tabTrig) tabTrig.click();

    // 2. Select specific contact
    this.selectChatContact(bookingId);
  }

  bindChatEvents() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = btn.getAttribute('data-tab');
        
        // Toggle tab button active state
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle content panels
        document.querySelectorAll('.dashboard-tab-content').forEach(cont => {
          cont.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        // Unread badge reset
        if (tabId === 'chat-tab') {
          document.getElementById('unread-dot').classList.remove('badge-pulse');
        }
      });
    });

    const sendBtn = document.getElementById('chat-send-btn');
    const inputField = document.getElementById('chat-input-text');

    const handleSend = async () => {
      const text = inputField.value.trim();
      if (!text || !this.state.activeChatBookingId) return;

      const booking = this.state.bookings.find(b => b.id === this.state.activeChatBookingId);
      if (!booking) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Push user message locally first
      booking.chatHistory.push({
        sender: 'user',
        text: text,
        time: timeStr
      });

      inputField.value = '';
      this.renderChatMessages();
      this.renderChatContacts();

      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: 'user', text })
        });
        if (!response.ok) throw new Error('API chat fail');
        const updated = await response.json();
        booking.chatHistory = updated.chatHistory;
      } catch (err) {
        console.warn('API error, falling back to local simulation:', err);
      }

      this.saveState();

      // Trigger automatic simulation replies
      this.simulateProviderReply(booking);
    };

    if (sendBtn && inputField) {
      sendBtn.addEventListener('click', handleSend);
      inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }
  }

  simulateProviderReply(booking) {
    // Show a typing simulation or delay
    setTimeout(() => {
      const providerReplies = [
        "Sounds like a plan! I will make sure to bring all the necessary tools.",
        "Got it, thanks for confirming details. I'll reach out when I'm on my way.",
        "That is perfect, I can absolutely handle that. See you at our scheduled time!",
        "Alright, noted. If anything changes, just drop me a message here.",
        "Perfect. I have reviewed your checklists and am ready for the job."
      ];
      
      const randomReply = providerReplies[Math.floor(Math.random() * providerReplies.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      booking.chatHistory.push({
        sender: 'provider',
        text: randomReply,
        time: timeStr
      });

      // Update state and UI
      this.saveState();
      
      // If user is currently looking at this active chat window, refresh messages
      if (this.state.activeChatBookingId === booking.id) {
        this.renderChatMessages();
      }
      this.renderChatContacts();

      // Show unread indicator if they are not in chat tab
      const chatTab = document.getElementById('chat-tab');
      if (chatTab && !chatTab.classList.contains('active')) {
        document.getElementById('unread-dot').classList.add('badge-pulse');
      }

      this.showToast(`New message from ${booking.providerName}`);
    }, 2000);
  }

  bindClientProfileEvents() {
    // Obsolete static profile form removed in favor of LeetCode modal
  }


}

Object.getOwnPropertyNames(CustomerExtension.prototype).forEach(name => {
  if (name !== 'constructor') {
    ServifyApp.prototype[name] = CustomerExtension.prototype[name];
  }
});
