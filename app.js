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

  // --- CUSTOMER DASHBOARD & MOCK CHAT ---
  renderUserBookings() {
    const container = document.getElementById('user-bookings-container');
    if (!container) return;

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
                ${b.servicesSelected.map(s => `<span class="booking-service-tag">${s.name} ($${s.price})</span>`).join('')}
              </div>
              <div class="booking-price-breakdown-row mt-2" style="font-size: 0.8rem; color: var(--text-secondary); display: flex; gap: 0.5rem; flex-wrap: wrap; opacity: 0.85;">
                <span>Subtotal: $${(b.subtotalPrice || (b.totalPrice - 5.00)).toFixed(2)}</span>
                <span>•</span>
                <span>Platform Fee: $${(b.serviceFee || 5.00).toFixed(2)}</span>
                <span>•</span>
                <strong style="color: var(--text-primary);">Total: $${b.totalPrice.toFixed(2)}</strong>
              </div>
            </div>
          </div>
          
          <div class="booking-item-right">
            <span class="badge ${badgeClass}">${b.status}</span>
            <div class="text-right">
              <span class="booking-price-tag">$${b.totalPrice.toFixed(2)}</span>
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

        // 2. Sync changes back to server database
        try {
          const response = await fetch(`${API_BASE_URL}/providers/${providerId}/profile`, {
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
              this.navigate('explore-view');
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
      const society = document.getElementById('auth-society').value;

      // Provider details
      const providerCategory = document.getElementById('auth-prov-category').value;
      const providerHourlyRate = document.getElementById('auth-prov-rate').value;
      const providerTagline = document.getElementById('auth-prov-tagline').value.trim();
      const providerBio = document.getElementById('auth-prov-bio').value.trim();

      if (!name) {
        if (errorAlert && errorText) {
          errorText.textContent = 'Please enter your full name.';
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
            providerBio
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
          await this.loadDynamicData();

          this.updateAuthHeaders();
          this.showToast(`Account created! Welcome to Servify, ${data.user.name}!`);

          if (this.state.pendingBookingDetails) {
            await this.submitPendingBooking();
          } else {
            if (data.user.role === 'customer') {
              this.navigate('explore-view');
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
