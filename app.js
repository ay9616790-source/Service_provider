const API_BASE_URL = 'http://localhost:5000/api';

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
      selectedSociety: 'all',
      
      // Dynamic Role Sessions
      currentUserRole: 'client', // 'client' or 'contractor'
      currentUserId: 'c1', // e.g. 'c1', 'p1'
      currentUserName: 'Abhishek K.',
      currentUserAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80'
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
    this.bindProviderDashboardEvents();
    this.bindReviewEvents();
    this.initTheme();
    this.initUserRoles(); // Init custom role features
    this.startBackgroundLoops(); // Init live timer ticking loops

    // 4. Perform Initial Renders
    this.renderCategories();
    this.renderSocietyOptions();
    this.checkQRSociety();
    this.renderFeaturedProviders();
    this.renderHomepageServices();
    this.renderCategoryFilterOptions();
    this.updateExploreResults();
    this.renderUserBookings();
    this.renderProviderDashboard();

    // Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- STATE PERSISTENCE ---
  async loadState() {
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

    const optionsHTML = SERVICES_DATA.societies.map(s => `
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
        const found = SERVICES_DATA.societies.find(s => s.id === val);
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

    headerSelect.addEventListener('change', (e) => handleSocietyChange(e.target.value));
    sidebarSelect.addEventListener('change', (e) => handleSocietyChange(e.target.value));
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

  navigate(viewId) {
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
    }

    // Refresh icons on navigate
    if (window.lucide) {
      window.lucide.createIcons();
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

  // --- LANDING VIEW RENDERING ---
  renderCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;

    list.innerHTML = this.state.categories.map(cat => `
      <div class="category-card" onclick="app.quickSearch('${cat.id}')">
        <div class="category-icon" style="background: ${cat.bgGradient}">${cat.icon}</div>
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
      </div>
    `).join('');
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
          <strong class="service-home-price">$${srv.minPrice}</strong>
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
        <div class="provider-card-banner" style="background-image: url('${pro.banner}')"></div>
        <div class="provider-card-body">
          <img src="${pro.avatar}" alt="${pro.name}" class="provider-card-avatar">
          <div class="provider-card-info">
            <div class="provider-card-name-row">
              <span class="provider-card-name">${pro.name}</span>
              ${pro.isVerified ? `<span class="badge badge-verified"><i data-lucide="shield-check"></i></span>` : ''}
            </div>
            <span class="provider-card-category">${this.getCategoryIcon(pro.category)} ${pro.category}</span>
            
            <div class="provider-card-rating">
              <i data-lucide="star" class="star-filled"></i>
              <span>${pro.rating}</span>
              <span class="reviews-text">(${pro.reviewsCount} reviews)</span>
            </div>
            <p class="provider-card-tagline">${pro.tagline}</p>
            
            <div class="provider-card-footer">
              <span class="provider-card-price"><span class="price-value-bold">$${pro.hourlyRate}</span>/hr</span>
              <button class="btn btn-primary btn-small" onclick="app.viewProviderDetail('${pro.id}')">View Profile</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  getCategoryIcon(catId) {
    const found = this.state.categories.find(c => c.id === catId);
    return found ? found.icon : '🛠️';
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
    const landingInput = document.getElementById('landing-search-input');
    const landingBtn = document.getElementById('landing-search-btn');
    const exploreInput = document.getElementById('explore-search-input');
    
    const filterCat = document.getElementById('filter-category');
    const filterPrice = document.getElementById('filter-price');
    const rangeVal = document.getElementById('range-value');
    const filterVerified = document.getElementById('filter-verified');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const sortSelect = document.getElementById('sort-select');

    // Hero search
    if (landingBtn && landingInput) {
      landingBtn.addEventListener('click', () => {
        this.state.activeSearchQuery = landingInput.value.trim();
        exploreInput.value = this.state.activeSearchQuery;
        this.navigate('explore-view');
      });
      landingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.state.activeSearchQuery = landingInput.value.trim();
          exploreInput.value = this.state.activeSearchQuery;
          this.navigate('explore-view');
        }
      });
    }

    // Live explore search
    if (exploreInput) {
      exploreInput.addEventListener('input', (e) => {
        this.state.activeSearchQuery = e.target.value.trim();
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
                <span style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">$${pro.hourlyRate}/hr</span>
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
      // 0. Society filter
      if (this.state.selectedSociety !== 'all') {
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

      // 5. Search query filter (matches name, tagline, skills, or offered services)
      if (this.state.activeSearchQuery) {
        const query = this.state.activeSearchQuery.toLowerCase();
        const matchesName = pro.name.toLowerCase().includes(query);
        const matchesTagline = pro.tagline.toLowerCase().includes(query);
        const matchesSkills = pro.skills.some(skill => skill.toLowerCase().includes(query));
        const matchesServices = pro.pricingList && pro.pricingList.some(srv => srv.name.toLowerCase().includes(query));
        if (!matchesName && !matchesTagline && !matchesSkills && !matchesServices) return false;
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
          <img src="${pro.avatar}" alt="${pro.name}" class="list-card-avatar">
        </div>
        <div class="list-card-content">
          <div class="list-card-heading">
            <span class="list-card-name">
              ${pro.name}
              ${pro.isVerified ? `<span class="badge badge-verified"><i data-lucide="shield-check"></i> Verified</span>` : ''}
            </span>
            <div class="list-card-price-info">
              <span class="provider-card-price"><span class="price-value-bold">$${pro.hourlyRate}</span>/hr</span>
            </div>
          </div>
          <span class="provider-card-category">${this.getCategoryIcon(pro.category)} ${pro.category}</span>
          <p class="list-card-tagline">${pro.tagline}</p>
          
          <div class="list-card-skills">
            ${pro.skills.map(s => `<span class="skill-pill">${s}</span>`).join('')}
          </div>
          
          <div class="list-card-stats">
            <span class="list-card-stats-item"><i data-lucide="star" class="star-filled"></i> <strong>${pro.rating}</strong> (${pro.reviewsCount} reviews)</span>
            <span class="list-card-stats-item"><i data-lucide="briefcase"></i> ${pro.experience} years experience</span>
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
    document.getElementById('detail-banner').src = pro.banner;
    document.getElementById('detail-avatar').src = pro.avatar;
    document.getElementById('detail-name').textContent = pro.name;
    document.getElementById('detail-tagline').textContent = pro.tagline;
    document.getElementById('detail-rating').textContent = pro.rating;
    document.getElementById('detail-reviews-count').textContent = pro.reviewsCount;
    document.getElementById('detail-experience').textContent = pro.experience;
    document.getElementById('detail-hourly').textContent = pro.hourlyRate;
    document.getElementById('detail-bio').textContent = pro.bio;
    document.getElementById('detail-big-rating').textContent = pro.rating;
    document.getElementById('detail-reviews-num').textContent = pro.reviewsCount;

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
          <span class="service-check-price">$${srv.price}</span>
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

    const serviceFee = 5.00;
    const total = subtotal + serviceFee;

    document.getElementById('booking-subtotal').textContent = subtotal.toFixed(2);
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
      const totalPrice = subtotal;

      // Platform commission split (Direct/No markup)
      const platformCommission = 0;
      const workerPayout = subtotal;

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
            { sender: 'provider', text: `Hi Abhishek! I received your booking request for ${bookingDate} at ${bookingTime}. Can you share a bit more detail about the work or attach any photos?`, time: 'Just now' }
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

  // --- CUSTOMER DASHBOARD & MOCK CHAT ---
  renderUserBookings() {
    const container = document.getElementById('user-bookings-container');
    if (!container) return;

    // Filter bookings relevant to active user session
    // If logged in as client, show their bookings. If logged in as contractor, show bookings assigned to them!
    const activeBookings = this.state.bookings.filter(b => {
      if (this.state.currentUserRole === 'client') {
        // Show client's bookings (filter out based on client session in real life, or show all for testing Abhishek)
        return true; 
      } else {
        // Contractor: only show bookings assigned to active contractor ID
        return b.providerId === this.state.currentUserId;
      }
    });

    if (activeBookings.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <i data-lucide="calendar-x" class="huge-icon"></i>
          <p>No bookings or active projects scheduled.</p>
          ${this.state.currentUserRole === 'client' ? `
            <button class="btn btn-primary mt-2" onclick="app.navigate('explore-view')">Explore Professionals</button>
          ` : '<p class="text-muted" style="font-size:0.85rem;">Incoming requests will trigger live alert popups here.</p>'}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = activeBookings.map(b => {
      let badgeClass = 'badge-pending';
      if (b.status === 'acknowledged') badgeClass = 'badge-accepted';
      if (b.status === 'quoted') badgeClass = 'badge-accepted';
      if (b.status === 'hired') badgeClass = 'badge-accepted';
      if (b.status === 'payment_pending') badgeClass = 'badge-pending';
      if (b.status === 'completed') badgeClass = 'badge-completed';
      if (b.status === 'cancelled') badgeClass = 'badge-cancelled';

      // Custom rendering block depending on multi-stage status
      let workflowHTML = '';

      if (b.status === 'pending') {
        // Client sees "Awaiting Acknowledgment"
        workflowHTML = `
          <div style="background: var(--primary-light); border: 1px dashed var(--primary); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
            <div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;"><span class="pulse-indicator"></span> Awaiting Lead Acknowledgment</span>
              <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Waiting for the contractor to review and accept the inspection request.</p>
            </div>
          </div>
        `;
      } else if (b.status === 'acknowledged') {
        // Client sees "Acknowledged - Inspection In Progress"
        workflowHTML = `
          <div style="background: var(--info-light); border: 1px dashed var(--info); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--info); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">🔍 Inspection in Progress</span>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Contractor accepted the lead! Performing physical inspection at: <br><strong style="color: var(--text-primary);">${b.clientAddress}</strong></p>
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 0.5rem;"><i data-lucide="loader" style="width:0.8rem; height:0.8rem; display:inline; animation: logo-pulse 1.5s infinite;"></i> Awaiting detailed quotation upload...</span>
          </div>
        `;
      } else if (b.status === 'quoted') {
        // Client sees "Quote Received" with direct flat invoice breakdown
        const labor = b.contractorQuote || 0;
        const total = b.totalPrice || labor;

        workflowHTML = `
          <div style="background: var(--bg-offset); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--success); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">📝 Detailed Quotation Received</span>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Scope: ${b.servicesSelected[0].name}</p>
              </div>
              <div class="text-right">
                <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Labor Force</span>
                <strong style="font-size: 0.9rem; color: var(--text-primary);">${b.workerCount} Employees • ${b.estimatedHours} Hours</strong>
              </div>
            </div>
            
            <!-- Invoice Breakdown Table -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">
                <span>Total Project Quotation:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>

            <!-- Client Action -->
            ${this.state.currentUserRole === 'client' ? `
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn btn-primary btn-small" onclick="app.hireContractor('${b.id}')" style="background: var(--success);"><i data-lucide="check-circle" style="width:0.85rem; height:0.85rem;"></i> Hire Contractor (Start Project)</button>
                <button class="btn btn-secondary btn-small text-red" onclick="app.cancelBooking('${b.id}')" style="color:var(--danger); border-color:var(--danger-light);">Reject & Cancel</button>
              </div>
            ` : '<span style="font-size:0.8rem; color:var(--text-muted);"><i data-lucide="loader" style="width:0.8rem; height:0.8rem; display:inline;"></i> Awaiting Client approval (Hire request)...</span>'}
          </div>
        `;
      } else if (b.status === 'hired') {
        // Client sees the beautiful 4-Phase Progress Timeline Tracker!
        const totalEstimatedHours = b.estimatedHours || 4;
        const totalEstimatedSeconds = totalEstimatedHours * 60; // 1h = 60s for demo
        const secondsPerPhase = Math.max(15, Math.floor(totalEstimatedSeconds / 4));
        const activePercentage = b.currentPhase * 25; // Phase 1 = 25%, Phase 2 = 50%, Phase 3 = 75%, Phase 4 = 100%

        workflowHTML = `
          <div style="background: var(--bg-offset); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; display: block;"><span class="pulse-indicator"></span> Active Work Progress: Phase ${b.currentPhase}/4</span>
            </div>

            <!-- Custom CSS Progress Bar Fill -->
            <div style="width: 100%; height: 0.5rem; background: var(--border); border-radius: 9999px; margin-bottom: 1rem; overflow: hidden; position: relative;">
              <div style="height: 100%; width: ${activePercentage}%; background: linear-gradient(90deg, var(--primary) 0%, var(--success) 100%); border-radius: 9999px; transition: width 0.5s ease;"></div>
            </div>

            <!-- Linear Phase Markers -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.5rem; text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">
              <span style="${b.currentPhase >= 1 ? 'color: var(--primary); font-weight: 700;' : ''}">1. Initiated</span>
              <span style="${b.currentPhase >= 2 ? 'color: var(--primary); font-weight: 700;' : ''}">2. Initial Phase</span>
              <span style="${b.currentPhase >= 3 ? 'color: var(--primary); font-weight: 700;' : ''}">3. Middle Phase</span>
              <span style="${b.currentPhase >= 4 ? 'color: var(--success); font-weight: 700;' : ''}">4. Finished</span>
            </div>

            <!-- Contractor manual controls -->
            ${this.state.currentUserRole === 'contractor' ? `
              <div style="margin-top: 1rem; text-align: right;">
                <button class="btn btn-primary btn-small" onclick="app.advanceProjectPhase('${b.id}')" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                  <i data-lucide="chevron-right" style="width:0.85rem; height:0.85rem;"></i> Transition to Next Phase
                </button>
              </div>
            ` : ''}
          </div>
        `;
      } else if (b.status === 'payment_pending') {
        // Client sees the invoice checkout card and payment buttons
        workflowHTML = `
          <div style="background: var(--accent-light); border: 1px dashed var(--accent); padding: 1.25rem; border-radius: 0.75rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">🏁 Work Completed Successfully</span>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">All 4 phases finished. Awaiting payment settlement confirmation.</p>
              </div>
              <strong style="font-size: 1.2rem; color: var(--text-primary);">$${b.totalPrice.toFixed(2)}</strong>
            </div>

            ${this.state.currentUserRole === 'client' ? `
              <div style="text-align: right; margin-top: 1rem;">
                <button class="btn btn-primary btn-small" onclick="app.openPaymentModal('${b.id}')" style="background: var(--accent); border-color: var(--accent);">🏁 Confirm Direct Payment</button>
              </div>
            ` : '<span style="font-size: 0.8rem; color: var(--text-muted);"><i data-lucide="loader" style="width:0.8rem; height:0.8rem; display:inline;"></i> Awaiting Client payment settlement...</span>'}
          </div>
        `;
      } else if (b.status === 'completed') {
        // Completed state with invoice review indicator
        workflowHTML = `
          <div style="background: var(--success-light); border: 1px solid var(--success); padding: 0.85rem 1.25rem; border-radius: 0.75rem; margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; color: #065f46;">
            <span>🛡️ <strong>Insured Payment Secured!</strong> $${b.totalPrice.toFixed(2)} fully paid via ${b.paymentMode === 'online' ? 'Online Card Transfer' : 'Cash Payout'}. Work protected by 30-Day Workmanship Warranty.</span>
          </div>
        `;
      }

      return `
        <div class="booking-item-card" id="card-${b.id}" style="box-shadow: var(--card-shadow); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column;">
          <!-- Top: Detail row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            
            <div style="display: flex; gap: 1rem; align-items: center;">
              <img src="${b.providerAvatar}" alt="${b.providerName}" class="booking-pro-avatar" style="width: 3.5rem; height: 3.5rem; border-radius: 50%; object-fit: cover;">
              <div class="booking-details-txt">
                <h3 style="font-size: 1.15rem; margin: 0; font-weight: 700; color: var(--text-primary);">${b.providerName}</h3>
                <span class="provider-card-category" style="font-size: 0.8rem; text-transform: capitalize; color: var(--text-secondary);">${this.getCategoryIcon(b.providerCategory)} ${b.providerCategory}</span>
                <div class="booking-meta-row" style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 0.75rem; margin-top: 0.25rem;">
                  <span><i data-lucide="calendar" style="width:0.8rem; height:0.8rem; display:inline;"></i> ${b.date}</span>
                  <span><i data-lucide="clock" style="width:0.8rem; height:0.8rem; display:inline;"></i> ${b.time}</span>
                </div>
              </div>
            </div>

            <div class="text-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
              <span class="badge ${badgeClass}" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; border-radius: 0.35rem;">${b.status}</span>
              <span class="booking-price-tag" style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">$${b.totalPrice.toFixed(2)}</span>
            </div>

          </div>

          <!-- Description / Work address detail -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem; font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.75rem;">
            <strong>Job Location address:</strong> ${b.clientAddress}<br>
            <strong>Problem Description:</strong> "${b.clientDescription}"
          </div>

          <!-- Middle: Workflow Status Panels -->
          ${workflowHTML}

          <!-- Bottom: Standard Chat / cancel actions -->
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
            <button class="btn btn-secondary btn-small" onclick="app.openChatFromBooking('${b.id}')"><i data-lucide="message-square"></i> Live Chat</button>
            ${b.status === 'pending' && this.state.currentUserRole === 'client' ? `
              <button class="btn btn-secondary btn-small text-red" onclick="app.cancelBooking('${b.id}')" style="color: var(--danger); border-color: var(--danger-light);">Cancel Request</button>
            ` : ''}
            ${b.status === 'completed' ? (
              b.isReviewed ? `
                <span class="badge" style="background-color: var(--primary-light); color: var(--primary); text-transform: none; font-size: 0.8rem; padding: 0.4rem 0.65rem; border-radius: 0.35rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="star" style="width:0.85rem; height:0.85rem; fill:var(--primary); display:inline;"></i> Rated</span>
              ` : this.state.currentUserRole === 'client' ? `
                <button class="btn btn-primary btn-small" onclick="app.openReviewModal('${b.id}')"><i data-lucide="star"></i> Rate Professional</button>
              ` : ''
            ) : ''}
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

    // Load matching contractor profile from state
    const currentProId = this.state.currentUserId;
    const currentPro = this.state.providers.find(p => p.id === currentProId);
    
    if (currentPro) {
      // Update portal header name dynamically
      const titleName = document.getElementById('provider-dashboard-title-name');
      if (titleName) {
        titleName.textContent = currentPro.name;
      }

      // Pre-populate update profile form inputs
      const nameInput = document.getElementById('edit-pro-name');
      const phoneInput = document.getElementById('edit-pro-phone');
      const taglineInput = document.getElementById('edit-pro-tagline');
      const bioInput = document.getElementById('edit-pro-bio');

      if (nameInput && document.activeElement !== nameInput) nameInput.value = currentPro.name || '';
      if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = currentPro.phone || '';
      if (taglineInput && document.activeElement !== taglineInput) taglineInput.value = currentPro.tagline || '';
      if (bioInput && document.activeElement !== bioInput) bioInput.value = currentPro.bio || '';
    }

    // Filter bookings assigned to active contractor ID
    const assignedBookings = this.state.bookings.filter(b => b.providerId === currentProId);
    
    const pendingRequests = assignedBookings.filter(b => b.status === 'pending');
    const activeJobs = assignedBookings.filter(b => ['acknowledged', 'quoted', 'hired', 'payment_pending'].includes(b.status));
    const completedJobs = assignedBookings.filter(b => b.status === 'completed');

    // Compute earnings
    let baseGross = 0;
    let baseCommission = 0;
    let baseNet = 0;

    completedJobs.forEach(j => {
      const labor = j.contractorQuote || (j.totalPrice - 5.00);
      const commission = j.platformCommission !== undefined ? j.platformCommission : (labor * 0.15);
      const net = j.workerPayout !== undefined ? j.workerPayout : labor;

      baseGross += labor;
      baseCommission += commission;
      baseNet += net;
    });

    if (netPayoutValue) netPayoutValue.textContent = `$${baseNet.toFixed(2)}`;
    if (grossBillingsValue) grossBillingsValue.textContent = `$${baseGross.toFixed(2)}`;
    if (commissionDeductedValue) commissionDeductedValue.textContent = `$${baseCommission.toFixed(2)}`;
    if (completedCountValue) completedCountValue.textContent = completedJobs.length;

    // 1. Render Pending Requests - Glowing Acknowledgment Alerts (Uber/Rapido style)
    if (pendingRequests.length === 0) {
      requestsContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <p>No pending job requests.</p>
          <span style="font-size:0.75rem;">New inspection matches will trigger high-priority alerts here.</span>
        </div>
      `;
    } else {
      requestsContainer.innerHTML = pendingRequests.map(req => {
        return `
          <div class="job-request-item" id="req-${req.id}" data-id="${req.id}" style="border: 1px solid var(--border); background: var(--bg-secondary); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--card-shadow); animation: fadeIn 0.4s ease;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div>
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.15rem;">New Inspection Request</span>
                <strong style="font-size: 1.1rem; color: var(--text-primary);">Client: ${req.clientName}</strong>
              </div>
            </div>

            <div style="background: var(--bg-primary); border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 1rem;">
              <strong>Category:</strong> ${req.providerCategory.toUpperCase()}<br>
              <strong>Description:</strong> "${req.clientDescription}"
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-primary btn-small flex-grow-1" onclick="app.acknowledgeLeadRequest('${req.id}')" style="font-size:0.85rem;"><i data-lucide="check" style="width:0.85rem; height:0.85rem; display:inline;"></i> Accept & Inspect</button>
              <button class="btn btn-secondary btn-small text-red" onclick="app.declineJobRequest('${req.id}')" style="font-size:0.85rem; color: var(--danger)">Decline</button>
            </div>

          </div>
        `;
      }).join('');
    }

    // 2. Render Active Schedule & Project Status Tracker (Quotations + Phase controls)
    if (activeJobs.length === 0) {
      scheduleContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <p>No active jobs or quotations scheduled.</p>
          <span style="font-size:0.75rem;">Accept lead alerts to populate active projects here.</span>
        </div>
      `;
    } else {
      scheduleContainer.innerHTML = activeJobs.map(job => {
        let workflowHTML = '';

        if (job.status === 'acknowledged') {
          // Contractor must upload detailed quotation
          workflowHTML = `
            <div style="background: var(--info-light); border: 1px dashed var(--info); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--info); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.25rem;">Address Unlocked: ${job.clientAddress}</span>
                <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">Perform the site inspection and upload a detailed labor quote to the client.</p>
              </div>
              <button class="btn btn-primary btn-small" onclick="app.openQuoteModal('${job.id}')" style="background: var(--info); border-color: var(--info); white-space: nowrap;"><i data-lucide="upload-cloud" style="width:0.85rem; height:0.85rem;"></i> Upload Quote</button>
            </div>
          `;
        } else if (job.status === 'quoted') {
          // Waiting for client hire response
          workflowHTML = `
            <div style="background: var(--bg-primary); border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
              <span>📝 <strong>Quotation Uploaded!</strong> Cost: $${job.contractorQuote.toFixed(2)} (${job.workerCount} workers, ${job.estimatedHours} hours). Awaiting client decision (Hire request)...</span>
            </div>
          `;
        } else if (job.status === 'hired') {
          // Work in Progress - contractor has phase transition options!
          const activePercentage = job.currentPhase * 25;

          workflowHTML = `
            <div style="background: var(--primary-light); border: 1px solid var(--primary); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;"><span class="pulse-indicator"></span> Active Progress: Phase ${job.currentPhase}/4</span>
              </div>
              
              <div style="width: 100%; height: 0.4rem; background: var(--border); border-radius: 9999px; overflow: hidden; margin-bottom: 0.75rem;">
                <div style="height: 100%; width: ${activePercentage}%; background: var(--primary); border-radius: 9999px; transition: width 0.3s ease;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Address: <strong>${job.clientAddress}</strong></span>
                <button class="btn btn-primary btn-small" onclick="app.advanceProjectPhase('${job.id}')" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;">
                  ${job.currentPhase === 3 ? 'Mark Completed' : 'Transition Phase'} <i data-lucide="chevron-right" style="width:0.8rem; height:0.8rem; display:inline;"></i>
                </button>
              </div>
            </div>
          `;
        } else if (job.status === 'payment_pending') {
          // Waiting for payment
          workflowHTML = `
            <div style="background: var(--accent-light); border: 1px dashed var(--accent); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              <div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; display: block;">🏁 Work Completed Successfully</span>
                <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">Invoice of $${job.totalPrice.toFixed(2)} sent. Awaiting client direct payment confirmation...</p>
              </div>
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent);"><i data-lucide="loader" style="width:0.8rem; height:0.8rem; display:inline;"></i> Awaiting Payment</span>
            </div>
          `;
        }

        // Calendar block date calculations
        const dateObj = new Date(job.date);
        const day = dateObj.getDate() || '28';
        const month = dateObj.toLocaleString('en-US', { month: 'short' }) || 'May';

        return `
          <div class="schedule-item" style="background: var(--bg-secondary); border: 1px solid var(--border); padding: 1.25rem; border-radius: 0.75rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: var(--card-shadow);">
            
            <div style="display: flex; gap: 1rem; align-items: center;">
              <div class="schedule-date-box" style="background: var(--primary-light); color: var(--primary); text-align: center; padding: 0.5rem; border-radius: 0.5rem; width: 3.2rem; min-width: 3.2rem; font-family: 'Outfit';">
                <span class="day" style="display: block; font-size: 1.25rem; font-weight: 800; line-height: 1;">${day}</span>
                <span class="mo" style="display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; margin-top: 0.15rem;">${month}</span>
              </div>
              <div style="flex-grow: 1;">
                <h4 style="font-size: 1.05rem; margin: 0; font-weight: 700; color: var(--text-primary);">${job.servicesSelected[0].name}</h4>
                <p style="margin: 0.15rem 0; font-size: 0.85rem; color: var(--text-secondary);">Client: <strong>${job.clientName}</strong> • Schedule: ${job.time}</p>
              </div>
              <span class="badge ${job.status === 'completed' ? 'badge-completed' : 'badge-accepted'}" style="font-size:0.7rem; border-radius: 0.25rem; text-transform: uppercase;">${job.status}</span>
            </div>

            <!-- Workflow status block -->
            ${workflowHTML}

          </div>
        `;
      }).join('');
    }

    // 3. Render Custom Rates Editor (for contractor index ID)
    if (currentPro) {
      ratesContainer.innerHTML = currentPro.pricingList.map((srv, index) => `
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

  async acknowledgeLeadRequest(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/acknowledge`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('API acknowledge failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation acknowledge:', err);
      booking.status = 'acknowledged';
      booking.chatHistory.push({
        sender: 'provider',
        text: "Lead Acknowledged! I have secured your request and unlocked your address. I will now perform the site inspection to prepare your detailed quotation.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.saveState();
    this.showToast('Lead request acknowledged!');
    this.renderProviderDashboard();
    this.renderUserBookings();
  }

  // Acknowledgment decline
  async declineJobRequest(bookingId) {
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
      console.warn('API error, falling back to local simulation decline:', err);
      booking.status = 'cancelled';
    }

    this.saveState();
    this.showToast('Lead request declined.');
    this.renderProviderDashboard();
    this.renderUserBookings();
  }

  // --- QUOTATION MODAL HANDLING ---
  openQuoteModal(bookingId) {
    this.state.activeQuoteBookingId = bookingId;
    const modal = document.getElementById('contractor-quote-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Bind submission specifically for this form
      const form = document.getElementById('quote-submission-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          this.submitDetailedQuotation();
        };
      }
    }
  }

  closeQuoteModal() {
    const modal = document.getElementById('contractor-quote-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activeQuoteBookingId = null;
  }

  async submitDetailedQuotation() {
    const bookingId = this.state.activeQuoteBookingId;
    if (!bookingId) return;

    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const quoteVal = parseFloat(document.getElementById('quote-labor-cost').value);
    const workerCount = parseInt(document.getElementById('quote-worker-count').value);
    const estHours = parseInt(document.getElementById('quote-est-hours').value);
    const details = document.getElementById('quote-details').value.trim();

    if (isNaN(quoteVal) || quoteVal <= 0 || isNaN(workerCount) || isNaN(estHours) || !details) {
      this.showToast('Please enter valid quotation details.');
      return;
    }

    const markup = 0;
    const total = quoteVal;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorQuote: quoteVal,
          workerCount,
          estimatedHours: estHours,
          quoteDetails: details
        })
      });

      if (!response.ok) throw new Error('API quotation upload failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.contractorQuote = updated.contractorQuote;
      booking.subtotalPrice = updated.subtotalPrice;
      booking.platformMarkup = updated.platformMarkup;
      booking.platformCommission = updated.platformCommission;
      booking.workerPayout = updated.workerPayout;
      booking.workerCount = updated.workerCount;
      booking.estimatedHours = updated.estimatedHours;
      booking.totalPrice = updated.totalPrice;
      booking.servicesSelected = updated.servicesSelected;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation quote upload:', err);
      booking.status = 'quoted';
      booking.contractorQuote = quoteVal;
      booking.subtotalPrice = quoteVal;
      booking.platformMarkup = 0;
      booking.platformCommission = 0;
      booking.workerPayout = quoteVal;
      booking.workerCount = workerCount;
      booking.estimatedHours = estHours;
      booking.totalPrice = total;
      booking.servicesSelected = [{ name: details, price: quoteVal }];
      booking.chatHistory.push({
        sender: 'provider',
        text: `Quotation uploaded: $${quoteVal.toFixed(2)} Total. Estimated completion time is ${estHours} hours using ${workerCount} employees. Please click Hire to initiate work!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.saveState();
    this.closeQuoteModal();
    this.showToast('Quotation uploaded and sent to client!');
    this.renderProviderDashboard();
    this.renderUserBookings();

    // Reset inputs
    document.getElementById('quote-labor-cost').value = '';
    document.getElementById('quote-worker-count').value = '1';
    document.getElementById('quote-est-hours').value = '';
    document.getElementById('quote-details').value = '';
  }

  // --- CLIENT HIRE DECISION ---
  async hireContractor(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/hire`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('API hire failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.currentPhase = updated.currentPhase;
      booking.phaseTimestamps = updated.phaseTimestamps;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation hiring:', err);
      booking.status = 'hired';
      booking.currentPhase = 1;
      booking.phaseTimestamps = {
        phase1_start: Date.now()
      };
      booking.chatHistory.push({
        sender: 'system',
        text: "Project officially HIRED and LAUNCHED! Progress phase set to Phase 1: Work Initiated.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.saveState();
    this.showToast('Contractor hired! Work has started.');
    this.renderUserBookings();
    this.renderProviderDashboard();
  }

  // --- PROGRESS PHASE ADVANCEMENT ---
  async advanceProjectPhase(bookingId) {
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const nextPhase = (booking.currentPhase || 1) + 1;
    if (nextPhase > 4) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: nextPhase })
      });
      if (!response.ok) throw new Error('API progress update failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.currentPhase = updated.currentPhase;
      booking.phaseTimestamps = updated.phaseTimestamps;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation progress transition:', err);
      booking.currentPhase = nextPhase;
      booking.phaseTimestamps = booking.phaseTimestamps || {};
      booking.phaseTimestamps[`phase${nextPhase}_start`] = Date.now();

      let textMsg = "";
      if (nextPhase === 2) textMsg = "Progress Update: Initial Phase (Phase 2) initiated.";
      else if (nextPhase === 3) textMsg = "Progress Update: Middle Phase (Phase 3) initiated.";
      else if (nextPhase === 4) {
        booking.status = 'payment_pending';
        booking.phaseTimestamps.phase4_end = Date.now();
        textMsg = "Progress Update: Job Finished! Awaiting client checkout payment.";
      }

      booking.chatHistory.push({
        sender: 'system',
        text: textMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.saveState();
    this.showToast(`Job transitioned to Phase ${nextPhase}`);
    this.renderProviderDashboard();
    this.renderUserBookings();
  }

  // --- PAYMENT MODAL & GATEWAY ---
  openPaymentModal(bookingId) {
    this.state.activePaymentBookingId = bookingId;
    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('client-payment-modal');
    if (!modal) return;

    const total = booking.totalPrice || booking.contractorQuote || 0;

    // Populate billing costs
    document.getElementById('pay-total-cost').textContent = total.toFixed(2);

    modal.classList.remove('hidden');

    // Bind payment form submit
    const form = document.getElementById('payment-checkout-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.processCheckoutPayment();
      };
    }
  }

  closePaymentModal() {
    const modal = document.getElementById('client-payment-modal');
    if (modal) modal.classList.add('hidden');
    this.state.activePaymentBookingId = null;
  }

  togglePayModeInputs(mode) {
    // Left empty since complex card forms were simplified
  }

  async processCheckoutPayment() {
    const bookingId = this.state.activePaymentBookingId;
    if (!bookingId) return;

    const booking = this.state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMode: 'direct'
        })
      });

      if (!response.ok) throw new Error('API payment failed');
      const updated = await response.json();
      booking.status = updated.status;
      booking.paymentCompleted = updated.paymentCompleted;
      booking.paymentMode = updated.paymentMode;
      booking.chatHistory = updated.chatHistory;
    } catch (err) {
      console.warn('API error, falling back to local simulation payment:', err);
      booking.status = 'completed';
      booking.paymentCompleted = true;
      booking.paymentMode = 'direct';

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
    }

    this.saveState();
    this.closePaymentModal();
    this.showToast('Payment confirmed successfully!');
    this.renderUserBookings();
    this.renderProviderDashboard();
    
    // Auto-prompt rating scorecard reviews instantly
    this.openReviewModal(bookingId);
  }

  bindProviderDashboardEvents() {
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
            const payout = val;
            const fee = val * 0.15;
            const total = val + fee + 5.00;
            
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
        
        const activePro = this.state.providers.find(p => p.id === this.state.currentUserId);
        if (activePro && activePro.pricingList[index]) {
          activePro.pricingList[index].price = newPrice;
          this.saveState();

          // Sync with server
          try {
            await fetch(`${API_BASE_URL}/providers/${this.state.currentUserId}/rates`, {
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

        // 1. Update local state
        const activePro = this.state.providers.find(p => p.id === this.state.currentUserId);
        if (activePro) {
          activePro.name = nameVal;
          activePro.phone = phoneVal;
          activePro.tagline = taglineVal;
          activePro.bio = bioVal;

          // Sync with customer bookings locally
          this.state.bookings.forEach(b => {
            if (b.providerId === this.state.currentUserId) {
              b.providerName = nameVal;
            }
          });

          this.saveState();
        }

        // 2. Sync changes back to server database
        try {
          const response = await fetch(`${API_BASE_URL}/providers/${this.state.currentUserId}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameVal,
              phone: phoneVal,
              tagline: taglineVal,
              bio: bioVal
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
            const idx = this.state.providers.findIndex(p => p.id === this.state.currentUserId);
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

// Instantiate and start app on page load
const app = new ServifyApp();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
