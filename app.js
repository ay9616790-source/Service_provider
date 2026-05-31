const API_BASE_URL = `http://${window.location.hostname || 'localhost'}:5000/api`;

// Servify Core Application State Manager
class ServifyApp {
  constructor() {
    this.state = {
      categories: [],
      providers: [],
      bookings: [],
      currentView: 'landing-view',
      activeFilterCategory: 'all',
      activeFilterPrice: 100,
      activeFilterRating: 'all',
      activeFilterVerified: false,
      activeSearchQuery: '',
      selectedProviderId: null,
      activeChatBookingId: null,
      theme: 'light',
      currentUser: null,
      _currentUserId: 'c1',
      get currentUserId() {
        if (this.currentUser) {
          return this.currentUser.role === 'provider' ? (this.currentUser.providerId || 'p1') : (this.currentUser.id || 'c1');
        }
        return this._currentUserId;
      },
      set currentUserId(val) {
        this._currentUserId = val;
      },
      _currentUserRole: 'client',
      get currentUserRole() {
        if (this.currentUser) {
          return this.currentUser.role === 'customer' ? 'client' : 'contractor';
        }
        return this._currentUserRole;
      },
      set currentUserRole(val) {
        this._currentUserRole = val;
      },
      _currentUserName: 'Abhishek K.',
      get currentUserName() {
        if (this.currentUser) return this.currentUser.name;
        return this._currentUserName;
      },
      set currentUserName(val) {
        this._currentUserName = val;
        if (this.currentUser) this.currentUser.name = val;
      },
      _currentUserAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80',
      get currentUserAvatar() {
        if (this.currentUser) return this.currentUser.avatar;
        return this._currentUserAvatar;
      },
      set currentUserAvatar(val) {
        this._currentUserAvatar = val;
        if (this.currentUser) this.currentUser.avatar = val;
      }
    };
  }

  async init() {
    // 1. Load settings and fetch dynamic data from Backend
    await this.loadState();

    // 2. Initialize UI Navigation & Route Event Handlers
    this.initNavigation();

    // 3. Bind UI Filter Controls & Booking Actions
    this.bindBookingEvents();
    this.bindSearchAndFilters();
    this.bindChatEvents();
    this.bindClientProfileEvents();
    this.bindProviderDashboardEvents();
    this.bindReviewEvents();
    this.bindAuthEvents();
    this.bindProfileDropdownEvents();
    this.bindProfileModalEvents();

    // 4. Perform Initial Renders
    this.renderLoginProviderCard();
    this.renderCategories();
    this.renderSocietyOptions();
    this.checkQRSociety();
    this.renderFeaturedProviders();
    this.renderHomepageServices();
    this.renderCategoryFilterOptions();
    this.updateExploreResults();
    this.renderUserBookings();
    this.renderProviderDashboard();
    this.renderExtendedDashboard();

    // Wire Login Portal Buttons
    const btnClient = document.getElementById('btn-login-client');
    const btnProvider = document.getElementById('btn-login-provider');
    const btnLogout = document.getElementById('btn-logout');

    if (btnClient) {
      btnClient.addEventListener('click', () => {
        this.navigate('landing-view');
        if (btnLogout) btnLogout.classList.remove('hidden');
      });
    }
    if (btnProvider) {
      btnProvider.addEventListener('click', () => {
        this.navigate('provider-dashboard-view');
        if (btnLogout) btnLogout.classList.remove('hidden');
      });
    }
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        btnLogout.classList.add('hidden');
        this.navigate('login-view');
      });
    }

    // Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- STATE PERSISTENCE ---
  async loadState() {
    // Auto-clear cache on new version release
    const currentVersion = '3';
    const savedVersion = localStorage.getItem('servify_version');
    if (savedVersion !== currentVersion) {
      localStorage.clear();
      localStorage.setItem('servify_version', currentVersion);
    }

    // Load local UI settings
    const savedState = localStorage.getItem('servify_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        this.state.theme = parsed.theme || 'light';
        this.state.selectedSociety = parsed.selectedSociety || 'all';
        this.state.currentUserRole = parsed.currentUserRole || 'client';
        this.state.currentUserId = parsed.currentUserId || 'c1';
        this.state.currentUserName = parsed.currentUserName || 'Abhishek K.';
        this.state.currentUserAvatar = parsed.currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80';
      } catch (e) {
        console.error('Error loading settings from local storage:', e);
      }
    }

    // Load active logged in user session
    const savedUser = localStorage.getItem('servify_currentUser');
    if (savedUser) {
      try {
        this.state.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Error loading current user from local storage:', e);
      }
    }

    // Load data from Backend API (with offline fallbacks)
    try {
      const providersRes = await fetch(`${API_BASE_URL}/providers`);
      const providersData = await providersRes.json();
      this.state.categories = providersData.categories;
      this.state.providers = providersData.providers;

      const bookingsRes = await fetch(`${API_BASE_URL}/bookings`);
      this.state.bookings = await bookingsRes.json();
    } catch (err) {
      console.warn('Backend API server not accessible, falling back to data.js offline simulation:', err);
      // Fallback
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          this.state.categories = parsed.categories || SERVICES_DATA.categories;
          this.state.providers = parsed.providers || SERVICES_DATA.providers;
          this.state.bookings = parsed.bookings || SERVICES_DATA.bookings;
        } catch (e) {
          this.resetDefaultData();
        }
      } else {
        this.resetDefaultData();
      }
    }

    // Update dynamic header states
    this.updateAuthHeaders();
  }

  resetDefaultData() {
    this.state.categories = SERVICES_DATA.categories;
    this.state.providers = SERVICES_DATA.providers;
    this.state.bookings = SERVICES_DATA.bookings;
    this.state.selectedSociety = 'all';
    this.saveState();
  }

  saveState() {
    localStorage.setItem('servify_state', JSON.stringify({
      categories: this.state.categories,
      providers: this.state.providers,
      bookings: this.state.bookings,
      theme: this.state.theme,
      selectedSociety: this.state.selectedSociety,
      currentUserRole: this.state.currentUserRole,
      currentUserId: this.state.currentUserId,
      currentUserName: this.state.currentUserName,
      currentUserAvatar: this.state.currentUserAvatar
    }));
  }

  // --- USER ROLES & SESSION HANDLERS ---
  initUserRoles() {
    const switcherBtn = document.getElementById('role-switcher-btn');
    const authModal = document.getElementById('auth-modal');

    // Show auth modal on click switcher
    if (switcherBtn && authModal) {
      switcherBtn.addEventListener('click', () => {
        authModal.classList.remove('hidden');
      });
    }

    this.applyUserRoleSession();
  }

  applyUserRoleSession() {
    const profileName = document.getElementById('header-profile-name');
    const avatarImg = document.getElementById('header-avatar-img');
    const navBar = document.getElementById('main-nav-bar');
    const societyWrapper = document.getElementById('header-society-wrapper');

    if (profileName) profileName.textContent = this.state.currentUserName;
    if (avatarImg) avatarImg.src = this.state.currentUserAvatar;

    if (!navBar) return;

    if (this.state.currentUserRole === 'client') {
      // Show client links
      navBar.innerHTML = `
        <a href="#" class="nav-link" data-target="landing-view" id="nav-link-home">Home</a>
        <a href="#" class="nav-link" data-target="explore-view" id="nav-link-explore">Explore Pros</a>
        <a href="#" class="nav-link" data-target="user-dashboard-view" id="nav-bookings">My Bookings</a>
      `;
      if (societyWrapper) societyWrapper.classList.remove('hidden');
    } else {
      // Show contractor links
      navBar.innerHTML = `
        <a href="#" class="nav-link active" data-target="provider-dashboard-view" id="nav-provider-portal">Provider Dashboard</a>
        <a href="#" class="nav-link" data-target="user-dashboard-view" id="nav-bookings">Message Center</a>
      `;
      if (societyWrapper) societyWrapper.classList.add('hidden');
    }

    // Re-bind click event listeners to new nav links
    this.initNavigation();
  }

  loginAs(role, id, name, avatar) {
    this.state.currentUserRole = role;
    this.state.currentUserId = id;
    this.state.currentUserName = name;
    this.state.currentUserAvatar = avatar;

    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('hidden');

    this.saveState();
    this.applyUserRoleSession();
    this.showToast(`Logged in successfully as ${name} (${role})`);

    // Redirect to the appropriate portal
    if (role === 'client') {
      this.navigate('landing-view');
    } else {
      this.navigate('provider-dashboard-view');
    }

    // Force refresh displays
    this.renderUserBookings();
    this.renderProviderDashboard();
    this.renderExtendedDashboard();
    this.renderFeaturedProviders();
    this.updateExploreResults();
  }

  // --- BACKGROUND TICKING LOOPS ---
  startBackgroundLoops() {
    // Ticking timers cleared to support a direct contractor workflow!
  }

  updateVisualCountdowns() {
    // Countdowns cleared to support a direct contractor workflow!
  }

  // --- THEME ---
  initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', this.state.theme);

    themeToggleBtn.addEventListener('click', () => {
      this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', this.state.theme);
      this.saveState();
    });
  }

  renderSocietyOptions() {
    const headerSelect = document.getElementById('header-society-select');
    const sidebarSelect = document.getElementById('filter-society');
    if (!headerSelect || !sidebarSelect) return;

    // Get societies list copy
    const societies = [...SERVICES_DATA.societies];
    
    // If current logged-in user has a custom society, add it to the option list so it is selectable
    if (this.state.currentUser && this.state.currentUser.society) {
      const uSoc = this.state.currentUser.society;
      const uSocLower = uSoc.toLowerCase();
      const exists = societies.some(s => s.id === uSocLower || s.name.toLowerCase() === uSocLower);
      if (!exists) {
        societies.push({ id: uSocLower, name: uSoc });
      }
    }

    const optionsHTML = societies.map(s => `
      <option value="${s.id}">${s.name}</option>
    `).join('');

    headerSelect.innerHTML = '<option value="all">All Societies</option>' + optionsHTML;
    sidebarSelect.innerHTML = '<option value="all">All Societies</option>' + optionsHTML;

    // Set active states
    headerSelect.value = this.state.selectedSociety;
    sidebarSelect.value = this.state.selectedSociety;

    // Set change handlers
    const handleSocietyChange = (val) => {
      this.state.selectedSociety = val;
      headerSelect.value = val;
      sidebarSelect.value = val;
      this.saveState();
      this.updateExploreResults();
      
      // Update welcome banner visibility based on manual selection
      const banner = document.getElementById('society-welcome-banner');
      if (val === 'all') {
        banner?.classList.add('hidden');
      } else {
        const found = societies.find(s => s.id === val);
        const bannerName = document.getElementById('society-banner-name');
        if (banner && bannerName && found) {
          bannerName.textContent = found.name;
          banner.classList.remove('hidden');
          document.getElementById('close-welcome-banner')?.addEventListener('click', () => {
            banner.classList.add('hidden');
          });
        }
      }
    };

    // Remove old listeners to prevent duplication
    const newHeaderSelect = headerSelect.cloneNode(true);
    headerSelect.parentNode.replaceChild(newHeaderSelect, headerSelect);
    newHeaderSelect.addEventListener('change', (e) => handleSocietyChange(e.target.value));

    const newSidebarSelect = sidebarSelect.cloneNode(true);
    sidebarSelect.parentNode.replaceChild(newSidebarSelect, sidebarSelect);
    newSidebarSelect.addEventListener('change', (e) => handleSocietyChange(e.target.value));
  }

  checkQRSociety() {
    const params = new URLSearchParams(window.location.search);
    const qrSociety = params.get('society');
    if (qrSociety) {
      const found = SERVICES_DATA.societies.find(s => s.id === qrSociety.toLowerCase());
      if (found) {
        this.state.selectedSociety = found.id;
        this.saveState();
        
        // Update selectors
        const headerSelect = document.getElementById('header-society-select');
        const sidebarSelect = document.getElementById('filter-society');
        if (headerSelect) headerSelect.value = found.id;
        if (sidebarSelect) sidebarSelect.value = found.id;
        
        // Show welcome banner
        const banner = document.getElementById('society-welcome-banner');
        const bannerName = document.getElementById('society-banner-name');
        if (banner && bannerName) {
          bannerName.textContent = found.name;
          banner.classList.remove('hidden');
          
          // Add close handler
          document.getElementById('close-welcome-banner')?.addEventListener('click', () => {
            banner.classList.add('hidden');
          });
        }
        
        this.showToast(`Welcome! Showing pros for ${found.name}`);
        this.updateExploreResults();
      }
    }
  }

  // --- NAVIGATION ---
  initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, #nav-logo');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        let target = link.getAttribute('data-target');
        
        // Handle logo click specifically
        if (link.id === 'nav-logo') {
          target = 'landing-view';
        }

        this.navigate(target);
      });
    });

    // Back to explore button on detail view
    document.getElementById('back-to-explore-btn').addEventListener('click', () => {
      this.navigate('explore-view');
    });
  }

  async navigate(viewId) {
    // Auth Gates & Role Authorization Filter
    if (viewId === 'user-dashboard-view') {
      if (!this.state.currentUser) {
        this.showToast('Please sign in to view your bookings.');
        viewId = 'auth-view';
      } else if (this.state.currentUser.role !== 'customer') {
        this.showToast('Redirected: bookings are only accessible for Customer accounts.');
        viewId = 'explore-view';
      }
    } else if (viewId === 'provider-dashboard-view') {
      if (!this.state.currentUser) {
        this.showToast('Please sign in to access the partner portal.');
        viewId = 'auth-view';
      } else if (this.state.currentUser.role !== 'provider') {
        this.showToast('Redirected: Partner Portal is restricted to Service Providers.');
        viewId = 'explore-view';
      }
    } else if (viewId === 'profile-details-view') {
      if (!this.state.currentUser) {
        this.showToast('Please sign in to view your profile.');
        viewId = 'auth-view';
      }
    }

    if (viewId === 'user-dashboard-view' || viewId === 'provider-dashboard-view' || viewId === 'explore-view' || viewId === 'profile-details-view') {
      await this.loadState();
    }

    this.state.currentView = viewId;
    
    // Toggle active view panel
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    const targetPanel = document.getElementById(viewId);
    if (targetPanel) {
      targetPanel.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Update active state in nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-target') === viewId) {
        link.classList.add('active');
      }
    });

    // View-specific trigger updates
    if (viewId === 'explore-view') {
      this.updateExploreResults();
    } else if (viewId === 'user-dashboard-view') {
      this.renderUserBookings();
      this.renderChatContacts();
    } else if (viewId === 'provider-dashboard-view') {
      this.renderProviderDashboard();
    } else if (viewId === 'profile-details-view') {
      this.renderUserProfileDetailsView();
    }

    // Refresh icons on navigate
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderUserProfileDetailsView() {
    if (!this.state.currentUser) return;
    const u = this.state.currentUser;

    // 1. Sidebar Left Card (scoped to user-detail- prefix to avoid conflicts with hidden public detail views)
    const detailAvatar = document.getElementById('user-detail-avatar');
    const detailName = document.getElementById('user-detail-name');
    const detailRoleBadge = document.getElementById('user-detail-role-badge');
    const detailLocation = document.getElementById('user-detail-location');
    const detailMemberSince = document.getElementById('user-detail-member-since');

    if (detailAvatar) detailAvatar.src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&q=80';
    if (detailName) detailName.textContent = u.name;
    if (detailRoleBadge) {
      detailRoleBadge.textContent = u.role === 'customer' ? 'Premium Client' : 'Verified Partner';
    }
    
    // Member since year parsing
    let joinedYear = '2026';
    if (u.createdAt) {
      try {
        joinedYear = new Date(u.createdAt).getFullYear().toString();
      } catch (e) {}
    }
    if (detailMemberSince) detailMemberSince.textContent = `Member since ${joinedYear}`;

    // 2. Right Credentials Card
    const fieldDetailName = document.getElementById('field-detail-name');
    const fieldDetailEmail = document.getElementById('field-detail-email');
    const fieldDetailPhone = document.getElementById('field-detail-phone');
    
    if (fieldDetailName) fieldDetailName.textContent = u.name;
    if (fieldDetailEmail) fieldDetailEmail.textContent = u.email;
    if (fieldDetailPhone) fieldDetailPhone.textContent = u.phone || 'Not Provided';

    // Role specific display & variables
    const providerSpecsCard = document.getElementById('provider-specs-card');
    const societyFieldWrapper = document.getElementById('detail-field-society-wrapper');
    const statRatingBlock = document.getElementById('stat-rating-block');

    let userBookings = [];

    if (u.role === 'customer') {
      if (providerSpecsCard) providerSpecsCard.classList.add('hidden');
      if (societyFieldWrapper) {
        societyFieldWrapper.classList.remove('hidden');
        const fieldDetailSociety = document.getElementById('field-detail-society');
        if (fieldDetailSociety) fieldDetailSociety.textContent = u.society ? (u.society.charAt(0).toUpperCase() + u.society.slice(1)) : 'Gokuldham';
      }
      if (detailLocation) detailLocation.textContent = u.society ? (u.society.charAt(0).toUpperCase() + u.society.slice(1)) : 'Gokuldham';
      if (statRatingBlock) statRatingBlock.classList.add('hidden');

      // Bookings relating to this customer
      userBookings = this.state.bookings.filter(b => b.customerId === u.id);
    } else {
      // Service Partner / Provider
      if (providerSpecsCard) providerSpecsCard.classList.remove('hidden');
      if (societyFieldWrapper) societyFieldWrapper.classList.add('hidden');
      if (statRatingBlock) statRatingBlock.classList.remove('hidden');

      const activeProvider = this.state.providers.find(p => p.id === u.providerId);
      if (activeProvider) {
        if (detailLocation) detailLocation.textContent = activeProvider.address || 'Service Area';
        
        const fieldDetailCategory = document.getElementById('field-detail-category');
        const fieldDetailRate = document.getElementById('field-detail-rate');
        const fieldDetailExperience = document.getElementById('field-detail-experience');
        const fieldDetailTagline = document.getElementById('field-detail-tagline');
        const fieldDetailBio = document.getElementById('field-detail-bio');

        if (fieldDetailCategory) fieldDetailCategory.textContent = activeProvider.category;
        if (fieldDetailRate) fieldDetailRate.textContent = `₹${activeProvider.hourlyRate} / hr`;
        if (fieldDetailExperience) fieldDetailExperience.textContent = `${activeProvider.experience} Years`;
        if (fieldDetailTagline) fieldDetailTagline.textContent = activeProvider.tagline || 'Certified professional';
        if (fieldDetailBio) fieldDetailBio.textContent = activeProvider.bio || 'Professional offering quality service.';

        // Populate rating blocks
        const ratingVal = document.getElementById('stat-rating-val');
        if (ratingVal) ratingVal.textContent = `${activeProvider.rating.toFixed(1)} / 5.0 (${activeProvider.reviewsCount} Reviews)`;
      }

      // Bookings relating to this provider
      userBookings = this.state.bookings.filter(b => b.providerId === u.providerId);
    }

    // 3. Stats Blocks Values
    const statTotal = document.getElementById('stat-total-bookings');
    const statCompleted = document.getElementById('stat-completed-bookings');
    const statPending = document.getElementById('stat-pending-bookings');

    if (statTotal) statTotal.textContent = userBookings.length;
    if (statCompleted) statCompleted.textContent = userBookings.filter(b => b.status === 'completed').length;
    if (statPending) statPending.textContent = userBookings.filter(b => b.status === 'pending').length;

    // 4. Wire Back Button Click Handler
    const backBtn = document.getElementById('profile-back-btn');
    if (backBtn) {
      // Remove old listeners to avoid multiple binding bugs
      const newBackBtn = backBtn.cloneNode(true);
      backBtn.parentNode.replaceChild(newBackBtn, backBtn);
      newBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(u.role === 'customer' ? 'user-dashboard-view' : 'provider-dashboard-view');
      });
    }

    // 5. Wire Edit Modal triggers
    const editBtn = document.getElementById('detail-edit-btn');
    const avatarTrigger = document.getElementById('avatar-hover-trigger');

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openEditProfileModal();
      });
    }
    if (avatarTrigger) {
      avatarTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.openEditProfileModal();
      });
    }

    // Refresh icons on this view
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  openEditProfileModal() {
    if (!this.state.currentUser) return;
    const u = this.state.currentUser;

    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    // Reset fields
    const photoInput = document.getElementById('modal-photo-input');
    if (photoInput) photoInput.value = '';

    const nameInput = document.getElementById('modal-edit-name');
    const phoneInput = document.getElementById('modal-edit-phone');
    const photoPreview = document.getElementById('modal-photo-preview');

    const customerFields = document.getElementById('modal-customer-fields');
    const providerFields = document.getElementById('modal-provider-fields');

    if (nameInput) nameInput.value = u.name || '';
    if (phoneInput) phoneInput.value = u.phone || '';
    if (photoPreview) photoPreview.src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&q=80';

    if (u.role === 'customer') {
      if (customerFields) customerFields.classList.remove('hidden');
      if (providerFields) providerFields.classList.add('hidden');

      const societySelect = document.getElementById('modal-edit-society');
      if (societySelect) societySelect.value = u.society || 'gokuldham';
    } else {
      if (customerFields) customerFields.classList.add('hidden');
      if (providerFields) providerFields.classList.remove('hidden');

      const activePro = this.state.providers.find(p => p.id === u.providerId);
      if (activePro) {
        if (nameInput) nameInput.value = activePro.name || '';
        if (phoneInput) phoneInput.value = activePro.phone || '';
        if (photoPreview) photoPreview.src = activePro.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80';

        const categorySelect = document.getElementById('modal-edit-category');
        const emailInput = document.getElementById('modal-edit-email');
        const whatsappInput = document.getElementById('modal-edit-whatsapp');
        const hourlyRateInput = document.getElementById('modal-edit-hourly-rate');
        const taglineInput = document.getElementById('modal-edit-tagline');
        const experienceInput = document.getElementById('modal-edit-experience');
        const addressInput = document.getElementById('modal-edit-address');
        const bioInput = document.getElementById('modal-edit-bio');

        if (categorySelect) categorySelect.value = activePro.category || 'electrician';
        if (emailInput) emailInput.value = activePro.email || u.email || '';
        if (whatsappInput) whatsappInput.value = activePro.whatsapp || activePro.phone || '';
        if (hourlyRateInput) hourlyRateInput.value = activePro.hourlyRate || 40;
        if (taglineInput) taglineInput.value = activePro.tagline || '';
        if (experienceInput) experienceInput.value = activePro.experience || 1;
        if (addressInput) addressInput.value = activePro.address || '';
        if (bioInput) bioInput.value = activePro.bio || '';

        // Populate the dynamic custom pricing list
        const ratesListInputs = document.getElementById('modal-rates-list-inputs');
        if (ratesListInputs) {
          if (activePro.pricingList && activePro.pricingList.length > 0) {
            ratesListInputs.innerHTML = activePro.pricingList.map((srv, index) => `
              <div class="modal-rate-input-row">
                <span class="modal-rate-name">${srv.name}</span>
                <div class="modal-rate-price-wrapper">
                  <span>₹</span>
                  <input type="number" class="form-input-small text-right modal-pricing-input" style="width: 80px; height: 1.8rem; padding: 0.2rem;" value="${srv.price}" data-index="${index}" min="0">
                </div>
              </div>
            `).join('');
          } else {
            ratesListInputs.innerHTML = `<p class="text-muted text-center" style="font-size:0.8rem; margin:0; padding: 0.5rem 0;">No specific pricing items configured.</p>`;
          }
        }
      }
    }

    modal.classList.remove('hidden');
  }

  closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.add('hidden');
  }

  openProjectHistoryDetail(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('project-history-detail-modal');
    const body = document.getElementById('project-history-detail-body');
    if (!modal || !body) return;

    // Subtotal and splits
    const subtotal = booking.subtotalPrice || (booking.totalPrice - 5.00);
    const platformCommission = booking.platformCommission !== undefined ? booking.platformCommission : (subtotal * 0.15);
    const workerPayout = booking.workerPayout !== undefined ? booking.workerPayout : (subtotal * 0.85);
    const serviceFee = booking.serviceFee || 5.00;
    const totalPrice = booking.totalPrice || (subtotal + serviceFee);

    // Client details
    const clientName = booking.customerName || 'Abhishek K.';
    const clientPhone = booking.customerPhone || '9876543210';
    const clientAddress = booking.customerAddress || 'Gokuldham Society, A-Block 302';
    const paymentMethod = booking.paymentMethod || 'UPI Transfer (GPay)';
    const txRef = booking.txRef || `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    body.innerHTML = `
      <div class="invoice-wrap">
        <div class="invoice-header-block">
          <div class="invoice-meta-info">
            <h4>Invoice #${booking.id.toUpperCase()}</h4>
            <p><strong>Engagement Date:</strong> ${booking.date} • ${booking.time}</p>
            <p><strong>Status:</strong> <span class="badge-completed">Completed</span></p>
          </div>
          <div style="text-align: right;">
            <h3 style="color: var(--primary); font-size: 1.5rem; font-weight: 800; margin: 0;">₹${totalPrice.toFixed(2)}</h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Total Paid Amount</p>
          </div>
        </div>

        <div class="invoice-client-card">
          <h5 style="margin-top:0;">Client & Project Details</h5>
          <div class="invoice-client-grid">
            <span><strong>Client Name:</strong> ${clientName}</span>
            <span><strong>Contact No:</strong> ${clientPhone}</span>
            <span style="grid-column: span 2;"><strong>Service Address:</strong> ${clientAddress}</span>
          </div>
        </div>

        <h5 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.5rem;">Services Provided</h5>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Service Item</th>
              <th style="text-align: right;">Price (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(booking.servicesSelected || booking.services || []).map(srv => `
              <tr>
                <td>${srv.name}</td>
                <td style="text-align: right; font-weight: 600;">₹${srv.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="invoice-financials-summary">
          <div class="financial-split-line">
            <span>Gross Service Billings:</span>
            <strong>₹${subtotal.toFixed(2)}</strong>
          </div>
          <div class="financial-split-line">
            <span>Servify Platform Commission (15%):</span>
            <strong style="color: var(--danger);">- ₹${platformCommission.toFixed(2)}</strong>
          </div>
          <div class="financial-split-line">
            <span>Customer Platform Fee (Servify direct):</span>
            <strong>₹${serviceFee.toFixed(2)}</strong>
          </div>
          <div class="financial-split-line bold payout">
            <span>Net Partner Take-Home Payout (85%):</span>
            <span>₹${workerPayout.toFixed(2)}</span>
          </div>
        </div>

        <div class="invoice-payment-method-box">
          <span>Payment Method: <strong>${paymentMethod}</strong></span>
          <span>Transaction Ref: <code style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">${txRef}</code></span>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  closeProjectHistoryModal() {
    const modal = document.getElementById('project-history-detail-modal');
    if (modal) modal.classList.add('hidden');
  }

  bindProfileModalEvents() {
    const form = document.getElementById('edit-profile-form');
    const photoInput = document.getElementById('modal-photo-input');
    const photoPreview = document.getElementById('modal-photo-preview');

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
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.state.currentUser) return;
        const u = this.state.currentUser;

        const nameVal = document.getElementById('modal-edit-name').value.trim();
        const phoneVal = document.getElementById('modal-edit-phone').value.trim();
        let avatarVal = photoPreview ? photoPreview.src : null;

        if (!nameVal || !phoneVal) {
          this.showToast('Please fill in all mandatory fields.');
          return;
        }

        if (u.role === 'customer') {
          const societyVal = document.getElementById('modal-edit-society').value;

          u.name = nameVal;
          u.phone = phoneVal;
          u.society = societyVal;
          if (avatarVal) u.avatar = avatarVal;

          this.state.currentUserName = nameVal;
          this.state.currentUserAvatar = avatarVal || this.state.currentUserAvatar;
          
          localStorage.setItem('servify_currentUser', JSON.stringify(u));
          this.saveState();

          // Sync with Server
          try {
            const res = await fetch(`${API_BASE_URL}/users/${u.id}/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: nameVal,
                phone: phoneVal,
                society: societyVal,
                avatar: avatarVal
              })
            });
            if (!res.ok) throw new Error('API save failed');
            const data = await res.json();
            if (data.success && data.user) {
              this.state.currentUser = data.user;
              localStorage.setItem('servify_currentUser', JSON.stringify(data.user));
              this.saveState();
            }
          } catch (err) {
            console.warn('Backend API connection failed, saved locally:', err);
          }
        } else {
          // Service Partner / Provider
          const categoryVal = document.getElementById('modal-edit-category').value;
          const emailVal = document.getElementById('modal-edit-email').value.trim();
          const whatsappVal = document.getElementById('modal-edit-whatsapp').value.trim();
          const hourlyRateVal = parseFloat(document.getElementById('modal-edit-hourly-rate').value) || 40;
          const taglineVal = document.getElementById('modal-edit-tagline').value.trim();
          const experienceVal = parseInt(document.getElementById('modal-edit-experience').value) || 1;
          const addressVal = document.getElementById('modal-edit-address').value.trim();
          const bioVal = document.getElementById('modal-edit-bio').value.trim();

          if (!taglineVal || !experienceVal || !addressVal || !bioVal || !emailVal || !whatsappVal) {
            this.showToast('Please fill in all service partner fields.');
            return;
          }

          // Gather custom rates
          const activePro = this.state.providers.find(p => p.id === u.providerId);
          let pricingList = [];
          if (activePro && activePro.pricingList) {
            pricingList = [...activePro.pricingList];
            const priceInputs = document.querySelectorAll('.modal-pricing-input');
            priceInputs.forEach(inp => {
              const idx = parseInt(inp.getAttribute('data-index'));
              const val = parseFloat(inp.value) || 0;
              if (pricingList[idx]) {
                pricingList[idx].price = val;
              }
            });
          }

          // Local Provider State Update
          if (activePro) {
            activePro.name = nameVal;
            activePro.phone = phoneVal;
            activePro.email = emailVal;
            activePro.whatsapp = whatsappVal;
            activePro.category = categoryVal;
            activePro.tagline = taglineVal;
            activePro.experience = experienceVal;
            activePro.address = addressVal;
            activePro.bio = bioVal;
            activePro.hourlyRate = hourlyRateVal;
            activePro.pricingList = pricingList;
            if (avatarVal) activePro.avatar = avatarVal;

            this.state.bookings.forEach(b => {
              if (b.providerId === u.providerId) {
                b.providerName = nameVal;
                b.providerCategory = categoryVal;
                if (avatarVal) b.providerAvatar = avatarVal;
              }
            });
          }

          u.name = nameVal;
          u.phone = phoneVal;
          if (avatarVal) u.avatar = avatarVal;

          this.state.currentUserName = nameVal;
          this.state.currentUserAvatar = avatarVal || this.state.currentUserAvatar;

          localStorage.setItem('servify_currentUser', JSON.stringify(u));
          this.saveState();

          // Sync Provider details with Backend
          try {
            const providerRes = await fetch(`${API_BASE_URL}/providers/${u.providerId}/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                whatsapp: whatsappVal,
                category: categoryVal,
                tagline: taglineVal,
                experience: experienceVal,
                address: addressVal,
                bio: bioVal,
                avatar: avatarVal,
                isProfileComplete: true,
                pricingList: pricingList,
                hourlyRate: hourlyRateVal
              })
            });

            const userRes = await fetch(`${API_BASE_URL}/users/${u.id}/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: nameVal,
                phone: phoneVal,
                avatar: avatarVal
              })
            });

            if (providerRes.ok && userRes.ok) {
              const dataUser = await userRes.json();
              const dataPro = await providerRes.json();
              if (dataUser.success && dataUser.user) {
                this.state.currentUser = dataUser.user;
                localStorage.setItem('servify_currentUser', JSON.stringify(dataUser.user));
              }
              if (dataPro.success && dataPro.provider) {
                const idx = this.state.providers.findIndex(p => p.id === u.providerId);
                if (idx !== -1) {
                  this.state.providers[idx] = dataPro.provider;
                }
              }
              this.saveState();
            }
          } catch (err) {
            console.warn('Backend API connection failed, saved locally:', err);
          }
        }

        this.closeEditProfileModal();
        this.showToast('Profile details updated successfully!');

        // Hot reload all visual components
        this.updateAuthHeaders();
        this.renderUserProfileDetailsView();
        this.renderUserBookings();
        this.renderProviderDashboard();
        this.renderFeaturedProviders();
        this.updateExploreResults();
      });
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // --- LOGIN CARD: Provider Info ---
  renderLoginProviderCard() {
    // Use the first/primary provider (p1) to show credentials
    const pro = this.state.providers.find(p => p.id === 'p1') || this.state.providers[0];
    if (!pro) return;

    const phoneEl = document.getElementById('login-provider-phone');
    const expEl = document.getElementById('login-provider-experience');
    const ratingEl = document.getElementById('login-provider-rating');
    const reviewsEl = document.getElementById('login-provider-reviews');
    const taglineEl = document.getElementById('login-provider-tagline');

    if (phoneEl) phoneEl.textContent = pro.phone || 'N/A';
    if (expEl) expEl.textContent = `${pro.experience} yrs experience`;
    if (ratingEl) ratingEl.textContent = pro.rating;
    if (reviewsEl) reviewsEl.textContent = `(${pro.reviewsCount} reviews)`;
    if (taglineEl) taglineEl.textContent = pro.tagline || 'Manage your jobs & earnings.';

    // Re-render lucide icons inside the card
    if (window.lucide) window.lucide.createIcons();
  }

  // --- LANDING VIEW RENDERING ---
  renderCategories() {
    const list = document.getElementById('categories-list');
    const clientList = document.getElementById('client-categories-list');
    
    const htmlContent = this.state.categories.map(cat => `
      <div class="category-card" onclick="app.quickSearch('${cat.id}')">
        <div class="category-icon" style="background: ${cat.bgGradient}">${this.getCategoryIcon(cat.id)}</div>
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
      </div>
    `).join('');

    if (list) list.innerHTML = htmlContent;
    if (clientList) clientList.innerHTML = htmlContent;
  }

  renderHomepageServices() {
    const list = document.getElementById('homepage-services-list');
    if (!list) return;

    // Collect all unique services from all providers
    const servicesMap = new Map();

    this.state.providers.forEach(pro => {
      pro.pricingList.forEach(srv => {
        const key = srv.name.trim();
        if (servicesMap.has(key)) {
          const existing = servicesMap.get(key);
          if (srv.price < existing.minPrice) {
            existing.minPrice = srv.price;
          }
        } else {
          servicesMap.set(key, {
            name: srv.name,
            category: pro.category,
            minPrice: srv.price,
            icon: this.getCategoryIcon(pro.category)
          });
        }
      });
    });

    const services = Array.from(servicesMap.values());

    if (services.length === 0) {
      list.innerHTML = `<p class="text-muted">No specialized services available.</p>`;
      return;
    }

    list.innerHTML = services.map(srv => `
      <div class="service-home-card" onclick="app.quickSearchService('${srv.name}')">
        <div class="service-home-icon-row">
          <span class="service-home-icon">${srv.icon}</span>
          <span class="service-home-badge">${srv.category}</span>
        </div>
        <h3 class="service-home-title">${srv.name}</h3>
        <div class="service-home-footer">
          <span class="service-home-lbl">Starting from</span>
          <strong class="service-home-price">₹${srv.minPrice}</strong>
        </div>
      </div>
    `).join('');
  }

  quickSearchService(serviceName) {
    this.state.activeSearchQuery = serviceName;
    this.state.activeFilterCategory = 'all';

    const exploreInput = document.getElementById('explore-search-input');
    if (exploreInput) exploreInput.value = serviceName;

    const filterCat = document.getElementById('filter-category');
    if (filterCat) filterCat.value = 'all';

    this.navigate('explore-view');
  }

  renderFeaturedProviders() {
    const container = document.getElementById('featured-providers');
    if (!container) return;

    // Grab top 3 rated providers
    const sorted = [...this.state.providers]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    container.innerHTML = sorted.map(pro => `
      <div class="provider-card-ui">
        <div class="provider-card-body">
          <div class="provider-card-header">
            <img src="${pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image') || pro.avatar.endsWith('.png')) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'}" alt="${pro.name}" class="provider-card-avatar">
            <div class="provider-card-title-block">
              <div class="provider-card-name-row">
                <span class="provider-card-name">${pro.name}</span>
                ${pro.isVerified ? `<span class="badge badge-verified"><i data-lucide="shield-check"></i></span>` : ''}
              </div>
              <span class="provider-card-category">${this.getCategoryIcon(pro.category)} ${pro.category}</span>
            </div>
          </div>
          
          <div class="provider-card-rating">
            <i data-lucide="star" class="star-filled"></i>
            <span>${pro.rating}</span>
            <span class="reviews-text">(${pro.reviewsCount} reviews)</span>
          </div>
          <p class="provider-card-tagline">${pro.tagline}</p>
          
          <div class="provider-card-footer">
            <span class="provider-card-price"><span class="price-value-bold">₹${pro.hourlyRate}</span>/hr</span>
            <button class="btn btn-primary btn-small" onclick="app.viewProviderDetail('${pro.id}')">View Profile</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  getCategoryIcon(catId) {
    const iconMap = {
      electrician: 'plug',
      carpenter: 'wrench',
      painter: 'brush',
      wallpaper: 'layers',
      plumber: 'droplets'
    };
    const name = iconMap[catId.toLowerCase()] || 'wrench';
    return `<i data-lucide="${name}" class="cat-svg-icon"></i>`;
  }

  // --- SEARCH & FILTERS (EXPLORE) ---
  renderCategoryFilterOptions() {
    const select = document.getElementById('filter-category');
    if (!select) return;
    
    // Clear and keep "All"
    select.innerHTML = '<option value="all">All Services</option>' + 
      this.state.categories.map(cat => `
        <option value="${cat.id}">${cat.name}</option>
      `).join('');
  }

  bindSearchAndFilters() {
    const headerInput = document.getElementById('header-search-input');
    const exploreInput = document.getElementById('explore-search-input');
    
    const filterCat = document.getElementById('filter-category');
    const filterPrice = document.getElementById('filter-price');
    const rangeVal = document.getElementById('range-value');
    const filterVerified = document.getElementById('filter-verified');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const sortSelect = document.getElementById('sort-select');

    // Header search bar listener (Dynamic redirect and sync to explore search)
    if (headerInput) {
      const handleHeaderSearch = () => {
        const query = headerInput.value.trim();
        this.state.activeSearchQuery = query;
        if (exploreInput) exploreInput.value = query;
        
        // If not already on explore, navigate there immediately
        if (this.state.currentView !== 'explore-view') {
          this.navigate('explore-view');
        } else {
          this.updateExploreResults();
        }
      };

      headerInput.addEventListener('input', handleHeaderSearch);
      headerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleHeaderSearch();
        }
      });
    }

    // Live explore search
    if (exploreInput) {
      exploreInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.state.activeSearchQuery = query;
        
        // Sync back to header search
        if (headerInput) headerInput.value = query;
        
        this.updateExploreResults();
      });
    }

    // Filters inputs
    if (filterCat) {
      filterCat.addEventListener('change', (e) => {
        this.state.activeFilterCategory = e.target.value;
        this.updateExploreResults();
      });
    }

    if (filterPrice) {
      filterPrice.addEventListener('input', (e) => {
        this.state.activeFilterPrice = parseInt(e.target.value);
        rangeVal.textContent = this.state.activeFilterPrice;
        this.updateExploreResults();
      });
    }

    // Minimum rating radio listeners
    document.querySelectorAll('input[name="filter-rating"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.state.activeFilterRating = e.target.value;
        this.updateExploreResults();
      });
    });

    if (filterVerified) {
      filterVerified.addEventListener('change', (e) => {
        this.state.activeFilterVerified = e.target.checked;
        this.updateExploreResults();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.updateExploreResults();
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.state.activeFilterCategory = 'all';
        this.state.activeFilterPrice = 100;
        this.state.activeFilterRating = 'all';
        this.state.activeFilterVerified = false;
        this.state.activeSearchQuery = '';
        
        // Reset inputs values
        if (headerInput) headerInput.value = '';
        if (exploreInput) exploreInput.value = '';
        if (filterCat) filterCat.value = 'all';
        if (filterPrice) {
          filterPrice.value = 100;
          rangeVal.textContent = '100';
        }
        if (filterVerified) filterVerified.checked = false;
        
        const defaultRadio = document.querySelector('input[name="filter-rating"][value="all"]');
        if (defaultRadio) defaultRadio.checked = true;

        this.updateExploreResults();
      });
    }
  }

  quickSearch(catId) {
    const modal = document.getElementById('category-contractors-modal');
    const title = document.getElementById('category-modal-title');
    const prosListContainer = document.getElementById('category-modal-pros-list');

    if (!modal || !prosListContainer) return;

    // Filter contractors matching category
    const matchingPros = this.state.providers.filter(p => p.category === catId);
    const categoryName = catId.charAt(0).toUpperCase() + catId.slice(1);
    
    if (title) title.textContent = `Available ${categoryName} Specialists`;
    modal.classList.remove('hidden');

    if (matchingPros.length === 0) {
      prosListContainer.innerHTML = `<p class="text-muted text-center py-4">No verified partners in this category at the moment.</p>`;
      return;
    }

    prosListContainer.innerHTML = matchingPros.map(pro => {
      // Build reviews HTML
      const reviewsHTML = pro.reviews && pro.reviews.length > 0
        ? pro.reviews.map(rev => `
            <div style="background: var(--bg-primary); border: 1px solid var(--border); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.5rem; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 0.25rem;">
                <span style="color: var(--text-primary);">${rev.author}</span>
                <span style="color: var(--accent);">⭐ ${rev.rating}</span>
              </div>
              <p style="margin: 0; color: var(--text-secondary); line-height: 1.4;">"${rev.text}"</p>
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">${rev.date}</span>
            </div>
          `).join('')
        : '<p class="text-muted" style="font-size: 0.85rem;">No customer reviews yet.</p>';

      return `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; box-shadow: var(--card-shadow);">
          <!-- Top: Info Row -->
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <img src="${pro.avatar}" alt="${pro.name}" style="width: 4rem; height: 4rem; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-light);">
            <div style="flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 1.15rem; margin: 0; font-weight: 700; color: var(--text-primary);">${pro.name}</h4>
                <span style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">₹${pro.hourlyRate}/hr</span>
              </div>
              <p class="text-muted" style="font-size: 0.85rem; margin: 0.15rem 0;">${pro.tagline}</p>
              <div style="display: flex; gap: 0.75rem; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem;">
                <span style="color: var(--accent);"><i data-lucide="star" style="display:inline; width:0.85rem; height:0.85rem; fill:var(--accent);"></i> ⭐ ${pro.rating} (${pro.reviewsCount} Reviews)</span>
                <span style="color: var(--text-secondary);"><i data-lucide="briefcase" style="display:inline; width:0.85rem; height:0.85rem;"></i> ${pro.experience} Years Exp</span>
              </div>
            </div>
          </div>

          <!-- Mid: Skills -->
          <div style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${pro.skills.map(s => `<span style="font-size: 0.75rem; background: var(--bg-offset); border: 1px solid var(--border); padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-weight: 500;">${s}</span>`).join('')}
          </div>

          <!-- Collapsible: Neighbor Comments -->
          <div style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
            <strong style="font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.5rem;"><i data-lucide="message-square" style="display:inline; width:0.85rem; height:0.85rem; color:var(--primary);"></i> Neighbor Comments & Reviews</strong>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 150px; overflow-y: auto; padding-right: 0.25rem;">
              ${reviewsHTML}
            </div>
          </div>

          <!-- Bottom: Expandable Request Form -->
          <div style="margin-top: 1.25rem; border-top: 1px dashed var(--border); padding-top: 1rem; text-align: right;">
            <button class="btn btn-primary btn-small" onclick="app.toggleRequestForm('${pro.id}')" id="btn-select-${pro.id}">
              Select Contractor
            </button>

            <!-- Slide-down Request Form Panel -->
            <div id="request-panel-${pro.id}" class="hidden text-left mt-3" style="background: var(--bg-offset); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border); animation: fadeIn 0.3s ease;">
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">Inspection Request details</h4>
              
              <div class="form-group mb-3">
                <label class="input-label-small" style="font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 0.25rem;">Your Address where inspection is held</label>
                <input type="text" id="req-address-${pro.id}" class="form-input-small" style="width: 100%;" value="Gokuldham Society, Building B, Room 402" required>
              </div>

              <div class="form-group mb-3">
                <label class="input-label-small" style="font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 0.25rem;">Describe the work/problem briefly</label>
                <textarea id="req-desc-${pro.id}" class="form-input-small" style="width: 100%; height: 3.5rem; resize: vertical;" placeholder="e.g. Bathroom basin pipe leakage, Ceiling fan short circuit..." required></textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" class="mb-4">
                <div class="form-group">
                  <label class="input-label-small" style="font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 0.25rem;">Inspection Date</label>
                  <input type="date" id="req-date-${pro.id}" class="form-input-small" style="width: 100%;" required>
                </div>
                <div class="form-group">
                  <label class="input-label-small" style="font-size: 0.8rem; font-weight: 600; display: block; margin-bottom: 0.25rem;">Inspection Time</label>
                  <input type="time" id="req-time-${pro.id}" class="form-input-small" style="width: 100%;" value="10:00" required>
                </div>
              </div>

              <button class="btn btn-primary btn-full" onclick="app.submitInspectionRequest('${pro.id}')" style="font-size: 0.9rem;">
                Send Inspection Request (120s timer starts)
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Pre-populate date pickers in modal form
    matchingPros.forEach(pro => {
      const dateInp = document.getElementById(`req-date-${pro.id}`);
      if (dateInp) {
        const today = new Date().toISOString().split('T')[0];
        dateInp.value = today;
        dateInp.min = today;
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  closeCategoryModal() {
    const modal = document.getElementById('category-contractors-modal');
    if (modal) modal.classList.add('hidden');
  }

  toggleRequestForm(proId) {
    const panel = document.getElementById(`request-panel-${proId}`);
    const btn = document.getElementById(`btn-select-${proId}`);
    if (panel) {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        btn.textContent = "Cancel Selection";
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-primary');
      } else {
        panel.classList.add('hidden');
        btn.textContent = "Select Contractor";
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      }
    }
  }

  async submitInspectionRequest(proId) {
    const address = document.getElementById(`req-address-${proId}`).value.trim();
    const desc = document.getElementById(`req-desc-${proId}`).value.trim();
    const dateVal = document.getElementById(`req-date-${proId}`).value;
    const timeVal = document.getElementById(`req-time-${proId}`).value;

    if (!address || !desc || !dateVal || !timeVal) {
      this.showToast("Please fill in all inspection details.");
      return;
    }

    // Login/Register Gate for Inspection Booking
    if (!this.state.currentUser) {
      this.state.pendingBookingDetails = {
        isInspection: true,
        providerId: proId,
        date: dateVal,
        time: timeVal,
        address: address,
        desc: desc
      };
      this.closeCategoryModal();
      this.showToast('Please sign in or register to complete your inspection request.');
      this.navigate('auth-view');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: proId,
          date: dateVal,
          time: timeVal,
          clientName: this.state.currentUserName,
          clientAddress: address,
          clientDescription: desc
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit inspection request.');
      }

      const newBooking = await response.json();
      this.state.bookings.unshift(newBooking);
    } catch (err) {
      console.warn('API error, falling back to local simulation request creation:', err);
      const pro = this.state.providers.find(p => p.id === proId);
      const newBooking = {
        id: 'b_' + Date.now(),
        providerId: proId,
        providerName: pro ? pro.name : 'Vetted Pro',
        providerCategory: pro ? pro.category : 'Electrician',
        providerAvatar: pro ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80',
        clientName: this.state.currentUserName,
        clientAddress: address,
        clientDescription: desc,
        date: dateVal,
        time: timeVal,
        servicesSelected: [{ name: 'On-site Inspection', price: 0 }],
        subtotalPrice: 0,
        serviceFee: 5.00,
        platformCommission: 0,
        workerPayout: 0,
        totalPrice: 5.00,
        status: 'pending',
        acknowledgmentTimer: 120,
        requestTimestamp: Date.now(),
        currentPhase: 0,
        phaseTimestamps: {},
        chatHistory: [
          {
            sender: 'provider',
            text: `Hi ${this.state.currentUserName}! I received your request for a ${pro ? pro.category : 'Electrician'} inspection. I have 120 seconds to accept this lead!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
      this.state.bookings.unshift(newBooking);
    }

    this.saveState();
    this.closeCategoryModal();
    this.showToast(`Request sent to contractor!`);
    
    // Jump to dashboard
    this.navigate('user-dashboard-view');
  }

  updateExploreResults() {
    const listContainer = document.getElementById('providers-list-container');
    const countValue = document.getElementById('count-value');
    if (!listContainer) return;

    // Perform filter
    let results = this.state.providers.filter(pro => {
      // 0. Society filter (Guests see all, customers see their specific society matches)
      if (this.state.currentUser && this.state.currentUser.role === 'customer' && this.state.selectedSociety !== 'all' && this.state.selectedSociety !== '') {
        if (!pro.societies || !pro.societies.includes(this.state.selectedSociety)) {
          return false;
        }
      }

      // 1. Category filter
      if (this.state.activeFilterCategory !== 'all' && pro.category !== this.state.activeFilterCategory) {
        return false;
      }
      
      // 2. Price filter
      if (pro.hourlyRate > this.state.activeFilterPrice) {
        return false;
      }
      
      // 3. Rating filter
      if (this.state.activeFilterRating !== 'all') {
        const minVal = parseFloat(this.state.activeFilterRating);
        if (pro.rating < minVal) return false;
      }

      // 4. Verified filter
      if (this.state.activeFilterVerified && !pro.isVerified) {
        return false;
      }

      // 5. Search query filter (matches name, category, tagline, skills, or offered services)
      if (this.state.activeSearchQuery) {
        const query = this.state.activeSearchQuery.toLowerCase();
        const matchesName = pro.name.toLowerCase().includes(query);
        const matchesCategory = pro.category.toLowerCase().includes(query);
        const matchesTagline = pro.tagline.toLowerCase().includes(query);
        const matchesSkills = pro.skills.some(skill => skill.toLowerCase().includes(query));
        const matchesServices = pro.pricingList && pro.pricingList.some(srv => srv.name.toLowerCase().includes(query));
        if (!matchesName && !matchesCategory && !matchesTagline && !matchesSkills && !matchesServices) return false;
      }

      return true;
    });

    // Sorting
    const sortVal = document.getElementById('sort-select')?.value || 'rating';
    if (sortVal === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (sortVal === 'experience') {
      results.sort((a, b) => b.experience - a.experience);
    } else if (sortVal === 'price-low') {
      results.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sortVal === 'price-high') {
      results.sort((a, b) => b.hourlyRate - a.hourlyRate);
    }

    countValue.textContent = results.length;

    if (results.length === 0) {
      listContainer.innerHTML = `
        <div class="chat-empty-state">
          <i data-lucide="search-x" class="huge-icon"></i>
          <p>No professionals matching your filter criteria.</p>
          <button class="btn btn-secondary mt-2" id="reset-quick-filters">Clear All Filters</button>
        </div>
      `;
      document.getElementById('reset-quick-filters')?.addEventListener('click', () => {
        document.getElementById('clear-filters-btn')?.click();
      });
      this.renderMapMarkers([]);
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    listContainer.innerHTML = results.map(pro => `
      <div class="provider-list-card-ui" onclick="app.viewProviderDetail('${pro.id}')">
        <div class="list-card-avatar-wrapper">
          <img src="${pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image') || pro.avatar.endsWith('.png')) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'}" alt="${pro.name}" class="list-card-avatar">
        </div>
        <div class="list-card-content">
          <div class="list-card-heading">
            <span class="list-card-name">
              ${pro.name}
              ${pro.isVerified ? `<span class="badge badge-verified"><i data-lucide="shield-check"></i> Verified</span>` : ''}
            </span>
            <div class="list-card-price-info">
              <span class="provider-card-price"><span class="price-value-bold">₹${pro.hourlyRate}</span>/hr</span>
            </div>
          </div>
          <span class="provider-card-category">${this.getCategoryIcon(pro.category)} ${pro.category}</span>
          <p class="list-card-tagline">${pro.tagline}</p>
          
          <div class="list-card-skills">
            ${pro.skills.map(s => `<span class="skill-pill">${s}</span>`).join('')}
          </div>
          
          <div class="list-card-stats">
            <span class="list-card-stats-item"><i data-lucide="star" class="star-filled"></i> <strong>${pro.rating}</strong> (${pro.reviewsCount} reviews)</span>
            <span class="list-card-stats-item"><i data-lucide="briefcase"></i> ${pro.experience} years exp</span>
            <span class="list-card-stats-item"><i data-lucide="map-pin"></i> ${pro.address || (pro.societies && pro.societies.length > 0 ? pro.societies.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'Gokuldham')}</span>
          </div>
        </div>
      </div>
    `).join('');

    this.renderMapMarkers(results);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Generate mock map markers to represent geolocation matches
  renderMapMarkers(providers) {
    const layer = document.getElementById('map-markers-layer');
    if (!layer) return;
    layer.innerHTML = '';

    // Fixed random-seed coordinates within boundaries
    providers.forEach((pro, idx) => {
      const top = 20 + ((idx * 17) % 60); // 20% to 80%
      const left = 20 + ((idx * 23) % 60); // 20% to 80%

      const marker = document.createElement('div');
      marker.className = 'map-marker';
      marker.style.top = `${top}%`;
      marker.style.left = `${left}%`;
      marker.textContent = pro.rating;
      marker.title = `${pro.name} (⭐ ${pro.rating})`;
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.viewProviderDetail(pro.id);
      });
      layer.appendChild(marker);
    });
  }

  // --- DETAIL VIEW & CHECKOUT ---
  viewProviderDetail(providerId) {
    this.state.selectedProviderId = providerId;
    const pro = this.state.providers.find(p => p.id === providerId);
    if (!pro) return;

    this.navigate('detail-view');

    // Banner & Avatar
    document.getElementById('detail-banner').src = (pro.banner && (pro.banner.startsWith('http') || pro.banner.startsWith('data:image') || pro.banner.endsWith('.png'))) ? pro.banner : 'servify_default.png';
    document.getElementById('detail-avatar').src = (pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image') || pro.avatar.endsWith('.png'))) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80';
    document.getElementById('detail-name').textContent = pro.name;
    document.getElementById('detail-tagline').textContent = pro.tagline;
    document.getElementById('detail-rating').textContent = pro.rating;
    document.getElementById('detail-reviews-count').textContent = pro.reviewsCount;
    document.getElementById('detail-experience').textContent = pro.experience;
    document.getElementById('detail-hourly').textContent = pro.hourlyRate;
    document.getElementById('detail-bio').textContent = pro.bio;
    document.getElementById('detail-big-rating').textContent = pro.rating;
    document.getElementById('detail-reviews-num').textContent = pro.reviewsCount;
    
    const detailAddress = document.getElementById('detail-address');
    if (detailAddress) {
      detailAddress.textContent = pro.address || (pro.societies && pro.societies.length > 0 ? pro.societies.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'Gokuldham Area');
    }

    // Phone Call display update
    const callLink = document.getElementById('detail-phone-link');
    const callDisplay = document.getElementById('detail-phone-display');
    if (callLink && callDisplay) {
      callLink.href = `tel:${pro.phone || ''}`;
      callDisplay.textContent = pro.phone || 'Contact support';
    }

    // Verified badge
    const verifiedBadge = document.getElementById('detail-verified-badge');
    if (pro.isVerified) {
      verifiedBadge.classList.remove('hidden');
    } else {
      verifiedBadge.classList.add('hidden');
    }

    // Skills
    const skillsContainer = document.getElementById('detail-skills');
    skillsContainer.innerHTML = pro.skills.map(s => `<span class="skill-pill">${s}</span>`).join('');

    // Generate big stars header
    const bigStars = document.getElementById('detail-big-stars');
    bigStars.innerHTML = '';
    const roundedStars = Math.round(pro.rating);
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('i');
      star.setAttribute('data-lucide', 'star');
      star.className = i <= roundedStars ? 'star-filled' : 'text-muted';
      bigStars.appendChild(star);
    }

    // Reviews list
    const reviewsContainer = document.getElementById('detail-reviews-list');
    if (pro.reviews && pro.reviews.length > 0) {
      reviewsContainer.innerHTML = pro.reviews.map(rev => `
        <div class="review-item">
          <div class="review-meta">
            <span class="review-author">${rev.author}</span>
            <span class="review-date">${rev.date}</span>
          </div>
          <div class="star-rating-row mb-4">
            ${Array.from({length: 5}, (_, i) => `
              <i data-lucide="star" class="${i < rev.rating ? 'star-filled' : 'text-muted'}"></i>
            `).join('')}
          </div>
          <p class="review-text">"${rev.text}"</p>
        </div>
      `).join('');
    } else {
      reviewsContainer.innerHTML = `<p class="text-muted">No reviews yet for this professional.</p>`;
    }

    // Booking prices list
    const servicesList = document.getElementById('booking-services-list');
    servicesList.innerHTML = pro.pricingList.map(srv => `
      <label class="service-check-row">
        <input type="checkbox" name="booking-service-item" value="${srv.id}" data-price="${srv.price}" data-name="${srv.name}">
        <div class="service-check-details">
          <span class="service-check-name">${srv.name}</span>
          <span class="service-check-price">₹${srv.price}</span>
        </div>
      </label>
    `).join('');

    // Date Picker: Block past dates
    const dateInput = document.getElementById('booking-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;

    // Mode toggle bindings
    const modeRadios = document.querySelectorAll('input[name="booking-mode"]');
    const standardPricingPanel = document.getElementById('booking-standard-pricing-panel');
    const customPricingPanel = document.getElementById('booking-custom-pricing-panel');
    
    // Set initial toggle state
    const customRadio = document.querySelector('input[name="booking-mode"][value="custom"]');
    if (customRadio) customRadio.checked = true;
    if (standardPricingPanel) standardPricingPanel.classList.add('hidden');
    if (customPricingPanel) customPricingPanel.classList.remove('hidden');

    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'standard') {
          standardPricingPanel.classList.remove('hidden');
          customPricingPanel.classList.add('hidden');
        } else {
          standardPricingPanel.classList.add('hidden');
          customPricingPanel.classList.remove('hidden');
        }
        this.calculateBookingPrice();
      });
    });

    // Custom price input bindings
    const customRateInput = document.getElementById('booking-custom-rate');
    customRateInput.value = '';
    customRateInput.addEventListener('input', () => this.calculateBookingPrice());

    // Reset pricing calculator
    this.calculateBookingPrice();

    // Re-bind change listeners to checkboxes
    document.querySelectorAll('input[name="booking-service-item"]').forEach(chk => {
      chk.addEventListener('change', () => this.calculateBookingPrice());
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  calculateBookingPrice() {
    const selectedMode = document.querySelector('input[name="booking-mode"]:checked')?.value || 'standard';
    let subtotal = 0;
    let isValid = false;

    if (selectedMode === 'standard') {
      const checkboxes = document.querySelectorAll('input[name="booking-service-item"]:checked');
      checkboxes.forEach(chk => {
        subtotal += parseFloat(chk.getAttribute('data-price'));
      });
      isValid = checkboxes.length > 0;
    } else {
      const customRateInput = document.getElementById('booking-custom-rate');
      subtotal = parseFloat(customRateInput.value) || 0;
      isValid = subtotal > 0;
    }

    const serviceFee = isValid ? 5.00 : 0.00;
    const total = isValid ? (subtotal + serviceFee) : 0.00;

    document.getElementById('booking-subtotal').textContent = subtotal.toFixed(2);
    const feeSpan = document.getElementById('booking-service-fee');
    if (feeSpan) feeSpan.textContent = serviceFee.toFixed(2);
    document.getElementById('booking-total-price').textContent = total.toFixed(2);

    // Disable booking button if invalid state
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.disabled = !isValid;
  }

  bindBookingEvents() {
    const submitBtn = document.getElementById('submit-booking-btn');
    submitBtn.addEventListener('click', async () => {
      const selectedPro = this.state.providers.find(p => p.id === this.state.selectedProviderId);
      if (!selectedPro) return;

      const selectedMode = document.querySelector('input[name="booking-mode"]:checked')?.value || 'standard';
      let selectedServices = [];
      let subtotal = 0;

      if (selectedMode === 'standard') {
        const checkedCheckboxes = document.querySelectorAll('input[name="booking-service-item"]:checked');
        selectedServices = Array.from(checkedCheckboxes).map(chk => ({
          name: chk.getAttribute('data-name'),
          price: parseFloat(chk.getAttribute('data-price'))
        }));
        selectedServices.forEach(s => subtotal += s.price);
      } else {
        const customRateInput = document.getElementById('booking-custom-rate');
        subtotal = parseFloat(customRateInput.value) || 0;
        selectedServices = [{ name: 'Agreed Phone Rate', price: subtotal }];
      }

      const bookingDate = document.getElementById('booking-date').value;
      const bookingTime = document.getElementById('booking-time').value;
      const serviceFee = 5.00;
      const totalPrice = subtotal + serviceFee;

      // Platform commission split (Direct/No markup)
      const platformCommission = 0;
      const workerPayout = subtotal;

      // Login Gate
      if (!this.state.currentUser) {
        this.state.pendingBookingDetails = {
          providerId: selectedPro.id,
          date: bookingDate,
          time: bookingTime,
          bookingMode: selectedMode,
          servicesSelected: selectedServices,
          customPrice: selectedMode === 'custom' ? subtotal : 0,
          subtotal: subtotal,
          totalPrice: totalPrice,
          platformCommission: platformCommission,
          workerPayout: workerPayout,
          serviceFee: serviceFee
        };
        this.showToast('Please sign in or register to complete your booking.');
        this.navigate('auth-view');
        return;
      }

      if (this.state.currentUser.role !== 'customer') {
        this.showToast('Please sign in as a Customer to book a professional.');
        return;
      }

      let newBooking;
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: selectedPro.id,
            date: bookingDate,
            time: bookingTime,
            bookingMode: selectedMode,
            servicesSelected: selectedMode === 'standard' ? selectedServices : [],
            customPrice: selectedMode === 'custom' ? subtotal : 0
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to submit booking');
        }

        newBooking = await response.json();
      } catch (err) {
        console.warn('API error, falling back to local simulation:', err);
        // Local simulation fallback
        newBooking = {
          id: 'b_' + Date.now(),
          providerId: selectedPro.id,
          providerName: selectedPro.name,
          providerCategory: selectedPro.category,
          providerAvatar: selectedPro.avatar,
          date: bookingDate,
          time: bookingTime,
          servicesSelected: selectedServices,
          subtotalPrice: subtotal,
          serviceFee: 0,
          platformCommission: 0,
          workerPayout: subtotal,
          totalPrice: totalPrice,
          status: 'pending',
          chatHistory: [
            { sender: 'provider', text: `Hi ${this.state.currentUser.name}! I received your booking request for ${bookingDate} at ${bookingTime}. Can you share a bit more detail about the work or attach any photos?`, time: 'Just now' }
          ]
        };
      }

      // Add to bookings state
      this.state.bookings.unshift(newBooking);
      this.saveState();
      
      this.showToast(`Booking request sent to ${selectedPro.name}!`);
      
      // Auto-jump to customer dashboard
      this.navigate('user-dashboard-view');
      
      // Trigger a visual update on the provider portal notifications
      this.renderProviderDashboard();
    });
  }

  // --- AUTHENTICATION & SESSION MANAGEMENT ---

  bindAuthEvents() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
    }
  }

  bindProfileDropdownEvents() {
    const badge = document.getElementById('header-user-badge');
    const menu = document.getElementById('profile-floating-menu');
    if (!badge || !menu) return;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('hidden')) {
        const isClickInside = badge.contains(e.target) || menu.contains(e.target);
        if (!isClickInside) {
          menu.classList.add('hidden');
        }
      }
    });

    const btnDashboard = document.getElementById('menu-item-dashboard');
    const btnProfile = document.getElementById('menu-item-profile');
    const btnLogout = document.getElementById('menu-item-logout');

    if (btnDashboard) {
      btnDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.add('hidden');
        if (this.state.currentUser) {
          this.navigate(this.state.currentUser.role === 'customer' ? 'user-dashboard-view' : 'provider-dashboard-view');
        }
      });
    }

    if (btnProfile) {
      btnProfile.addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.add('hidden');
        this.navigate('profile-details-view');
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.add('hidden');
        this.logout();
      });
    }
  }

  updateAuthHeaders() {
    const userBadge = document.getElementById('header-user-badge');
    const loginBtn = document.getElementById('header-login-btn');
    const registerBtn = document.getElementById('header-register-btn');
    const avatarImg = document.getElementById('header-avatar');
    const usernameSpan = document.getElementById('header-username');
    
    // Header select society toggle
    const headerSocietyWrapper = document.querySelector('.society-selector-wrapper');

    // Dashboard nav links
    const bookingsNav = document.getElementById('nav-bookings');
    const providerNav = document.getElementById('nav-provider-portal');

    if (this.state.currentUser) {
      const u = this.state.currentUser;
      
      // Update badge elements
      if (avatarImg) avatarImg.src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80';
      if (usernameSpan) usernameSpan.textContent = u.name;
      
      // Update floating dropdown elements
      const menuAvatar = document.getElementById('menu-avatar');
      const menuUsername = document.getElementById('menu-username');
      const menuRole = document.getElementById('menu-role');
      if (menuAvatar) menuAvatar.src = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80';
      if (menuUsername) menuUsername.textContent = u.name;
      if (menuRole) {
        menuRole.textContent = u.role === 'customer' ? 'Premium Client' : 'Verified Partner';
      }
      
      if (userBadge) userBadge.classList.remove('hidden');
      if (loginBtn) loginBtn.classList.add('hidden');
      if (registerBtn) registerBtn.classList.add('hidden');

      // Adjust dynamic headers based on role
      if (u.role === 'customer') {
        if (bookingsNav) bookingsNav.classList.remove('hidden');
        if (providerNav) providerNav.classList.add('hidden');
        
        const clientDashboardName = document.getElementById('client-dashboard-name');
        if (clientDashboardName) clientDashboardName.textContent = u.name;
        if (headerSocietyWrapper) {
          headerSocietyWrapper.classList.remove('hidden');
          // Match selected society
          if (u.society) {
            this.state.selectedSociety = u.society;
            const headerSelect = document.getElementById('header-society-select');
            const sidebarSelect = document.getElementById('filter-society');
            if (headerSelect) headerSelect.value = u.society;
            if (sidebarSelect) sidebarSelect.value = u.society;
            this.saveState();
          }
        }
      } else if (u.role === 'provider') {
        if (bookingsNav) bookingsNav.classList.add('hidden');
        if (providerNav) providerNav.classList.remove('hidden');
        if (headerSocietyWrapper) headerSocietyWrapper.classList.add('hidden');
      }
    } else {
      // Guest state
      if (userBadge) userBadge.classList.add('hidden');
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (registerBtn) registerBtn.classList.remove('hidden');
      if (bookingsNav) bookingsNav.classList.add('hidden');
      if (providerNav) providerNav.classList.add('hidden');
      if (headerSocietyWrapper) headerSocietyWrapper.classList.add('hidden');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  toggleRegisterRoleFields(role) {
    const providerFieldsGroup = document.getElementById('register-provider-fields-group');
    const customerSocietyGroup = document.getElementById('register-society-group');
    
    const customerCard = document.getElementById('role-card-customer');
    const providerCard = document.getElementById('role-card-provider');

    // Get input references
    const rateInp = document.getElementById('auth-prov-rate');
    const taglineInp = document.getElementById('auth-prov-tagline');
    const bioInp = document.getElementById('auth-prov-bio');

    const tabRegister = document.getElementById('tab-register');
    const isRegisterMode = tabRegister && tabRegister.classList.contains('active');

    if (role === 'provider') {
      if (providerFieldsGroup) providerFieldsGroup.classList.remove('hidden');
      if (customerSocietyGroup) customerSocietyGroup.classList.add('hidden');
      if (providerCard) providerCard.classList.add('active');
      if (customerCard) customerCard.classList.remove('active');
      
      // Update inputs inside providerCard
      const inputRoleProvider = providerCard ? providerCard.querySelector('input') : null;
      if (inputRoleProvider) inputRoleProvider.checked = true;

      // Set required fields for Provider only if in Register mode
      if (rateInp) rateInp.required = isRegisterMode;
      if (taglineInp) taglineInp.required = isRegisterMode;
      if (bioInp) bioInp.required = isRegisterMode;
    } else {
      if (providerFieldsGroup) providerFieldsGroup.classList.add('hidden');
      if (customerSocietyGroup) customerSocietyGroup.classList.remove('hidden');
      if (customerCard) customerCard.classList.add('active');
      if (providerCard) providerCard.classList.remove('active');
      
      // Update inputs inside customerCard
      const inputRoleCustomer = customerCard ? customerCard.querySelector('input') : null;
      if (inputRoleCustomer) inputRoleCustomer.checked = true;

      // Reset required fields for Provider
      if (rateInp) rateInp.required = false;
      if (taglineInp) taglineInp.required = false;
      if (bioInp) bioInp.required = false;
    }
  }

  switchAuthTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    
    // Dynamic groups to show/hide
    const nameGroup = document.getElementById('register-name-group');
    const phoneGroup = document.getElementById('register-phone-group');
    const roleSelectionGroup = document.getElementById('register-role-selection-group');
    const societyGroup = document.getElementById('register-society-group');
    const providerFieldsGroup = document.getElementById('register-provider-fields-group');

    // Input references
    const nameInp = document.getElementById('auth-name');
    const phoneInp = document.getElementById('auth-phone');
    const emailInp = document.getElementById('auth-email');
    const passwordInp = document.getElementById('auth-password');

    // Clear alert
    const errorAlert = document.getElementById('auth-error-alert');
    if (errorAlert) errorAlert.classList.add('hidden');

    if (tab === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      
      if (authTitle) authTitle.textContent = 'Create Account';
      if (authSubtitle) authSubtitle.textContent = 'Join Servify to book experts or offer services';
      if (submitBtn) submitBtn.textContent = 'Register Now';

      // Show Register fields
      if (nameGroup) nameGroup.classList.remove('hidden');
      if (phoneGroup) phoneGroup.classList.remove('hidden');
      if (roleSelectionGroup) roleSelectionGroup.classList.remove('hidden');
      
      // Set required
      if (nameInp) nameInp.required = true;
      if (phoneInp) phoneInp.required = true;
      if (emailInp) emailInp.required = true;
      if (passwordInp) passwordInp.required = true;

      // Check current role selector state to show appropriate fields
      const currentRole = document.querySelector('input[name="auth-role"]:checked')?.value || 'customer';
      this.toggleRegisterRoleFields(currentRole);
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      
      if (authTitle) authTitle.textContent = 'Welcome Back';
      if (authSubtitle) authSubtitle.textContent = 'Sign in to book pros and manage your schedules';
      if (submitBtn) submitBtn.textContent = 'Sign In';

      // Hide Register fields
      if (nameGroup) nameGroup.classList.add('hidden');
      if (phoneGroup) phoneGroup.classList.add('hidden');
      if (roleSelectionGroup) roleSelectionGroup.classList.add('hidden');
      if (societyGroup) societyGroup.classList.add('hidden');
      if (providerFieldsGroup) providerFieldsGroup.classList.add('hidden');

      // Clear required
      if (nameInp) nameInp.required = false;
      if (phoneInp) phoneInp.required = false;
      if (emailInp) emailInp.required = true;
      if (passwordInp) passwordInp.required = true;

      // Reset provider required fields
      const rateInp = document.getElementById('auth-prov-rate');
      const taglineInp = document.getElementById('auth-prov-tagline');
      const bioInp = document.getElementById('auth-prov-bio');
      if (rateInp) rateInp.required = false;
      if (taglineInp) taglineInp.required = false;
      if (bioInp) bioInp.required = false;
    }
    
    // Refresh dynamic icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('auth-password');
    const eyeIcon = document.getElementById('password-eye-icon');
    if (passwordInput && eyeIcon) {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.setAttribute('data-lucide', 'eye-off');
      } else {
        passwordInput.type = 'password';
        eyeIcon.setAttribute('data-lucide', 'eye');
      }
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  logout() {
    this.state.currentUser = null;
    localStorage.removeItem('servify_currentUser');
    this.updateAuthHeaders();
    this.showToast('You have successfully logged out.');
    this.navigate('landing-view');
  }

  async handleAuthSubmit(e) {
    e.preventDefault();
    const errorAlert = document.getElementById('auth-error-alert');
    const errorText = document.getElementById('auth-error-text');
    if (errorAlert) errorAlert.classList.add('hidden');

    const loginTab = document.getElementById('tab-login');
    const activeTab = loginTab && loginTab.classList.contains('active') ? 'login' : 'register';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (activeTab === 'login') {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Invalid email or password.');
        }

        const data = await response.json();
        if (data.success) {
          this.state.currentUser = data.user;
          localStorage.setItem('servify_currentUser', JSON.stringify(data.user));
          this.updateAuthHeaders();
          this.showToast(`Welcome back, ${data.user.name}!`);

          // Seamless booking checkout check
          if (this.state.pendingBookingDetails) {
            await this.submitPendingBooking();
          } else {
            // Navigate based on role
            if (data.user.role === 'customer') {
              this.navigate('user-dashboard-view');
            } else {
              this.navigate('provider-dashboard-view');
            }
          }
        }
      } catch (err) {
        if (errorAlert && errorText) {
          errorText.textContent = err.message;
          errorAlert.classList.remove('hidden');
        }
      }
    } else {
      // Register logic
      const name = document.getElementById('auth-name').value.trim();
      const phone = document.getElementById('auth-phone').value.trim();
      const role = document.querySelector('input[name="auth-role"]:checked')?.value || 'customer';
      const society = document.getElementById('auth-society').value.trim();

      // Provider details
      const providerCategory = document.getElementById('auth-prov-category')?.value || '';
      const providerHourlyRate = document.getElementById('auth-prov-rate')?.value || '';
      const providerTagline = document.getElementById('auth-prov-tagline')?.value?.trim() || '';
      const providerBio = document.getElementById('auth-prov-bio')?.value?.trim() || '';
      const providerExperience = document.getElementById('auth-prov-experience')?.value || '';
      const providerAvatar = document.getElementById('auth-prov-avatar')?.value?.trim() || '';
      const providerAddress = document.getElementById('auth-prov-address')?.value?.trim() || '';

      if (!name || !phone) {
        if (errorAlert && errorText) {
          errorText.textContent = 'Please fill in all mandatory fields (Name, Phone, Email, Password).';
          errorAlert.classList.remove('hidden');
        }
        return;
      }


      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name,
            role,
            phone,
            society,
            providerCategory,
            providerHourlyRate,
            providerTagline,
            providerBio,
            providerExperience,
            providerAvatar,
            providerAddress
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to register account.');
        }

        const data = await response.json();
        if (data.success) {
          // Dynamic auto-login after register!
          this.state.currentUser = data.user;
          localStorage.setItem('servify_currentUser', JSON.stringify(data.user));
          
          // Re-fetch dynamic providers so the newly registered provider is in the local state
          await this.loadState();

          this.updateAuthHeaders();
          this.showToast(`Account created! Welcome to Servify, ${data.user.name}!`);

          if (this.state.pendingBookingDetails) {
            await this.submitPendingBooking();
          } else {
            if (data.user.role === 'customer') {
              this.navigate('user-dashboard-view');
            } else {
              this.navigate('provider-dashboard-view');
            }
          }
        }
      } catch (err) {
        if (errorAlert && errorText) {
          errorText.textContent = err.message;
          errorAlert.classList.remove('hidden');
        }
      }
    }
  }

  async submitPendingBooking() {
    const details = this.state.pendingBookingDetails;
    if (!details) return;

    const selectedPro = this.state.providers.find(p => p.id === details.providerId);
    if (!selectedPro) {
      this.state.pendingBookingDetails = null;
      return;
    }

    let newBooking;

    if (details.isInspection) {
      try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: details.providerId,
            date: details.date,
            time: details.time,
            clientName: this.state.currentUser.name,
            clientAddress: details.address,
            clientDescription: details.desc
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to submit inspection request.');
        }

        newBooking = await response.json();
      } catch (err) {
        console.warn('API error, falling back to local simulation request creation:', err);
        newBooking = {
          id: 'b_' + Date.now(),
          providerId: details.providerId,
          providerName: selectedPro.name,
          providerCategory: selectedPro.category,
          providerAvatar: selectedPro.avatar,
          date: details.date,
          time: details.time,
          servicesSelected: [{ name: 'Home Site Inspection', price: 0 }],
          subtotalPrice: 0,
          serviceFee: 5.00,
          platformCommission: 0,
          workerPayout: 0,
          totalPrice: 5.00,
          status: 'pending',
          chatHistory: [
            { sender: 'provider', text: `Hi ${this.state.currentUser.name}! I received your inspection request for ${details.date} at ${details.time}. I will review the task details at ${details.address} and call you!`, time: 'Just now' }
          ]
        };
      }

      this.state.bookings.unshift(newBooking);
      this.saveState();
      this.state.pendingBookingDetails = null;
      this.showToast(`Inspection request sent to ${selectedPro.name}!`);
      this.navigate('user-dashboard-view');
      this.renderProviderDashboard();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: details.providerId,
          date: details.date,
          time: details.time,
          bookingMode: details.bookingMode,
          servicesSelected: details.bookingMode === 'standard' ? details.servicesSelected : [],
          customPrice: details.bookingMode === 'custom' ? details.subtotal : 0
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit booking');
      }

      newBooking = await response.json();
    } catch (err) {
      console.warn('API error, falling back to local simulation:', err);
      // Local simulation fallback
      newBooking = {
        id: 'b_' + Date.now(),
        providerId: selectedPro.id,
        providerName: selectedPro.name,
        providerCategory: selectedPro.category,
        providerAvatar: selectedPro.avatar,
        date: details.date,
        time: details.time,
        servicesSelected: details.servicesSelected,
        subtotalPrice: details.subtotal,
        serviceFee: details.serviceFee,
        platformCommission: details.platformCommission,
        workerPayout: details.workerPayout,
        totalPrice: details.totalPrice,
        status: 'pending',
        chatHistory: [
          { sender: 'provider', text: `Hi ${this.state.currentUser.name}! I received your booking request for ${details.date} at ${details.time}. Can you share a bit more detail about the work or attach any photos?`, time: 'Just now' }
        ]
      };
    }

    // Add to bookings state
    this.state.bookings.unshift(newBooking);
    this.saveState();
    
    this.state.pendingBookingDetails = null; // Clear queue
    this.showToast(`Booking request sent to ${selectedPro.name}!`);
    
    // Auto-jump to customer dashboard
    this.navigate('user-dashboard-view');
    
    // Trigger a visual update on the provider portal notifications
    this.renderProviderDashboard();
  }

  async loadDynamicData() {
    try {
      const providersRes = await fetch(`${API_BASE_URL}/providers`);
      const providersData = await providersRes.json();
      this.state.providers = providersData.providers;
      
      const bookingsRes = await fetch(`${API_BASE_URL}/bookings`);
      this.state.bookings = await bookingsRes.json();
    } catch (err) {
      console.warn('Error reloading dynamic providers/bookings:', err);
    }
  }
}

// Instantiate and start app on page load
const app = new ServifyApp();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
