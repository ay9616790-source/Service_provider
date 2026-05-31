const API_BASE_URL = '';

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
      currentUser: null
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
    this.bindAuthEvents();

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
    // Load local UI settings
    const savedState = localStorage.getItem('servify_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        this.state.theme = parsed.theme || 'light';
        this.state.selectedSociety = parsed.selectedSociety || 'all';
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
      const [categoriesRes, providersRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/providers`),
        fetch(`${API_BASE_URL}/bookings`)
      ]);
      this.state.categories = await categoriesRes.json();
      this.state.providers = await providersRes.json();
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
      selectedSociety: this.state.selectedSociety
    }));
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
        <div class="category-icon" style="background: ${cat.bgGradient}">${cat.icon}</div>
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
        <div class="provider-card-banner" style="background-image: url('${pro.banner && (pro.banner.startsWith('http') || pro.banner.startsWith('data:image')) ? pro.banner : 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=300&fit=crop&q=80'}')"></div>
        <div class="provider-card-body">
          <img src="${pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image')) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'}" alt="${pro.name}" class="provider-card-avatar">
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
              <span class="provider-card-price"><span class="price-value-bold">₹${pro.hourlyRate}</span>/hr</span>
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
    this.state.activeFilterCategory = catId;
    const filterCat = document.getElementById('filter-category');
    if (filterCat) filterCat.value = catId;
    this.navigate('explore-view');
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
          <img src="${pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image')) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80'}" alt="${pro.name}" class="list-card-avatar">
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
    this.state.tempBookingLocation = null; // Reset location for new booking
    const pro = this.state.providers.find(p => p.id === providerId);
    if (!pro) return;

    this.navigate('detail-view');

    // Banner & Avatar
    document.getElementById('detail-banner').src = (pro.banner && (pro.banner.startsWith('http') || pro.banner.startsWith('data:image'))) ? pro.banner : 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=300&fit=crop&q=80';
    document.getElementById('detail-avatar').src = (pro.avatar && (pro.avatar.startsWith('http') || pro.avatar.startsWith('data:image'))) ? pro.avatar : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&h=200&fit=crop&q=80';
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

  fetchCurrentLocation() {
    const statusDiv = document.getElementById('location-status');
    if (!statusDiv) return;
    
    statusDiv.classList.remove('hidden');
    statusDiv.textContent = "Fetching location...";
    statusDiv.className = "mt-2 text-sm text-center font-medium text-primary";

    if (!navigator.geolocation) {
      statusDiv.textContent = "Geolocation is not supported by your browser.";
      statusDiv.className = "mt-2 text-sm text-center font-medium text-red-500";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.state.tempBookingLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        statusDiv.textContent = "Location acquired ✅";
        statusDiv.className = "mt-2 text-sm text-center font-medium text-green-500";
        this.showToast("Location captured successfully!");
      },
      (error) => {
        statusDiv.textContent = "Failed to get location. Please allow permissions.";
        statusDiv.className = "mt-2 text-sm text-center font-medium text-red-500";
        console.warn('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      const serviceFee = 5.00;
      const totalPrice = subtotal + serviceFee;

      // Platform commission split
      const platformCommission = subtotal * 0.15; // 15% platform commission
      const workerPayout = subtotal * 0.85;       // 85% payout to worker/contractor

      // Login Gate
      if (!this.state.currentUser) {
        this.state.pendingBookingDetails = {
          providerId: selectedPro.id,
          date: bookingDate,
          time: bookingTime,
          lat: this.state.tempBookingLocation ? this.state.tempBookingLocation.lat : undefined,
          lng: this.state.tempBookingLocation ? this.state.tempBookingLocation.lng : undefined,
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
            lat: this.state.tempBookingLocation ? this.state.tempBookingLocation.lat : undefined,
            lng: this.state.tempBookingLocation ? this.state.tempBookingLocation.lng : undefined,
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
          lat: this.state.tempBookingLocation ? this.state.tempBookingLocation.lat : undefined,
          lng: this.state.tempBookingLocation ? this.state.tempBookingLocation.lng : undefined,
          servicesSelected: selectedServices,
          subtotalPrice: subtotal,
          serviceFee: serviceFee,
          platformCommission: platformCommission,
          workerPayout: workerPayout,
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

  updateAuthHeaders() {
    const userBadge = document.getElementById('header-user-badge');
    const loginBtn = document.getElementById('header-login-btn');
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
      
      if (userBadge) userBadge.classList.remove('hidden');
      if (loginBtn) loginBtn.classList.add('hidden');

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

    if (role === 'provider') {
      if (providerFieldsGroup) providerFieldsGroup.classList.remove('hidden');
      if (customerSocietyGroup) customerSocietyGroup.classList.add('hidden');
      if (providerCard) providerCard.classList.add('active');
      if (customerCard) customerCard.classList.remove('active');
      
      // Update inputs inside providerCard
      const inputRoleProvider = providerCard ? providerCard.querySelector('input') : null;
      if (inputRoleProvider) inputRoleProvider.checked = true;
    } else {
      if (providerFieldsGroup) providerFieldsGroup.classList.add('hidden');
      if (customerSocietyGroup) customerSocietyGroup.classList.remove('hidden');
      if (customerCard) customerCard.classList.add('active');
      if (providerCard) providerCard.classList.remove('active');
      
      // Update inputs inside customerCard
      const inputRoleCustomer = customerCard ? customerCard.querySelector('input') : null;
      if (inputRoleCustomer) inputRoleCustomer.checked = true;
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
        // Fetch by email only — compare password in JS to avoid URL-encoding issues
        // (passwords with @ or special chars break json-server query filter)
        const response = await fetch(
          `${API_BASE_URL}/users?email=${encodeURIComponent(email.toLowerCase())}`
        );
        const users = await response.json();

        if (!Array.isArray(users) || users.length === 0) {
          throw new Error('Invalid email or password.');
        }

        // Compare password client-side
        const user = users.find(u => u.password === password);
        if (!user) {
          throw new Error('Invalid email or password.');
        }

        // Fetch linked provider profile if role is provider
        if (user.role === 'provider' && user.providerId) {
          const provRes = await fetch(`${API_BASE_URL}/providers?id=${encodeURIComponent(user.providerId)}`);
          const provs = await provRes.json();
          user.providerProfile = provs[0] || null;
        }

        this.state.currentUser = user;
        localStorage.setItem('servify_currentUser', JSON.stringify(user));
        this.updateAuthHeaders();
        await this.loadDynamicData(); // Fetch the latest bookings and providers
        this.showToast(`Welcome back, ${user.name}!`);

        // Seamless booking checkout check
        if (this.state.pendingBookingDetails) {
          await this.submitPendingBooking();
        } else {
          if (user.role === 'customer') {
            this.navigate('user-dashboard-view');
          } else {
            this.navigate('provider-dashboard-view');
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
      const society = document.getElementById('auth-society').value;

      // Provider details
      const providerCategory = document.getElementById('auth-prov-category')?.value || '';
      const providerHourlyRate = document.getElementById('auth-prov-rate')?.value || '';
      const providerTagline = document.getElementById('auth-prov-tagline')?.value?.trim() || '';
      const providerBio = document.getElementById('auth-prov-bio')?.value?.trim() || '';
      const providerExperience = document.getElementById('auth-prov-experience')?.value || '';
      const providerAvatar = document.getElementById('auth-prov-avatar')?.value?.trim() || '';
      const providerAddress = document.getElementById('auth-prov-address')?.value?.trim() || '';

      if (!name) {
        if (errorAlert && errorText) {
          errorText.textContent = 'Please enter your full name.';
          errorAlert.classList.remove('hidden');
        }
        return;
      }

      try {
        // Check if email already exists
        const checkRes = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email.toLowerCase())}`);
        const existing = await checkRes.json();
        if (existing.length > 0) {
          throw new Error('Email is already registered.');
        }

        const userId = 'u_' + Date.now();
        let providerId = null;
        let providerProfile = null;

        // If registering as provider, create provider record first
        if (role === 'provider') {
          providerId = 'p_' + Date.now();
          const newProvider = {
            id: providerId,
            name: name,
            category: providerCategory || 'electrician',
            rating: 5.0,
            reviewsCount: 0,
            experience: parseInt(providerExperience) || 1,
            hourlyRate: parseInt(providerHourlyRate) || 40,
            avatar: providerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80',
            banner: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=300&fit=crop&q=80',
            tagline: providerTagline || 'Certified professional',
            isVerified: false,
            phone: phone || '',
            societies: society ? [society] : ['gokuldham'],
            address: providerAddress || '',
            bio: providerBio || 'Professional offering quality service.',
            skills: [providerCategory ? providerCategory.charAt(0).toUpperCase() + providerCategory.slice(1) : 'General'],
            pricingList: [{ id: 'srv_' + Date.now(), name: 'General Consultation & Repair', price: parseInt(providerHourlyRate) || 40 }],
            reviews: []
          };
          const provRes = await fetch(`${API_BASE_URL}/providers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProvider)
          });
          if (!provRes.ok) throw new Error('Failed to create provider profile.');
          providerProfile = await provRes.json();
        }

        // Create the user record
        const newUser = {
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
        };

        const userRes = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (!userRes.ok) throw new Error('Failed to create user account.');

        const createdUser = await userRes.json();
        if (providerProfile) createdUser.providerProfile = providerProfile;

        // Auto-login after register
        this.state.currentUser = createdUser;
        localStorage.setItem('servify_currentUser', JSON.stringify(createdUser));

        // Re-fetch dynamic providers so the newly registered provider is in local state
        await this.loadDynamicData();

        this.updateAuthHeaders();
        this.showToast(`Account created! Welcome to Servify, ${createdUser.name}!`);

        if (this.state.pendingBookingDetails) {
          await this.submitPendingBooking();
        } else {
          if (createdUser.role === 'customer') {
            this.navigate('user-dashboard-view');
          } else {
            this.navigate('provider-dashboard-view');
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

    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: details.providerId,
          date: details.date,
          time: details.time,
          lat: details.lat,
          lng: details.lng,
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
        lat: details.lat,
        lng: details.lng,
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
      const [providersRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/providers`),
        fetch(`${API_BASE_URL}/bookings`)
      ]);
      this.state.providers = await providersRes.json();
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
