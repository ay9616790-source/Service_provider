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
      selectedSociety: 'all'
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
    this.initTheme();

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

    const alexMercer = this.state.providers.find(p => p.id === 'p1');
    if (alexMercer) {
      // Update portal header name dynamically
      const titleName = document.getElementById('provider-dashboard-title-name');
      if (titleName) {
        titleName.textContent = alexMercer.name || 'Alex Mercer';
      }

      // Pre-populate update profile form inputs
      const nameInput = document.getElementById('edit-pro-name');
      const phoneInput = document.getElementById('edit-pro-phone');
      const taglineInput = document.getElementById('edit-pro-tagline');
      const bioInput = document.getElementById('edit-pro-bio');

      if (nameInput && document.activeElement !== nameInput) nameInput.value = alexMercer.name || '';
      if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = alexMercer.phone || '';
      if (taglineInput && document.activeElement !== taglineInput) taglineInput.value = alexMercer.tagline || '';
      if (bioInput && document.activeElement !== bioInput) bioInput.value = alexMercer.bio || '';
    }

    // Filter requests matching the default logged-in provider (Alex Mercer, id: 'p1')
    const alexBookings = this.state.bookings.filter(b => b.providerId === 'p1');
    const pendingRequests = alexBookings.filter(b => b.status === 'pending');
    const acceptedJobs = alexBookings.filter(b => b.status === 'accepted');
    const completedJobs = alexBookings.filter(b => b.status === 'completed');

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
        
        const alex = this.state.providers.find(p => p.id === 'p1');
        if (alex && alex.pricingList[index]) {
          alex.pricingList[index].price = newPrice;
          this.saveState();

          // Sync with server
          try {
            await fetch(`${API_BASE_URL}/providers/p1/rates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pricingList: alex.pricingList })
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
        const alex = this.state.providers.find(p => p.id === 'p1');
        if (alex) {
          alex.name = nameVal;
          alex.phone = phoneVal;
          alex.tagline = taglineVal;
          alex.bio = bioVal;

          // Sync with customer bookings locally
          this.state.bookings.forEach(b => {
            if (b.providerId === 'p1') {
              b.providerName = nameVal;
            }
          });

          this.saveState();
        }

        // 2. Sync changes back to server database
        try {
          const response = await fetch(`${API_BASE_URL}/providers/p1/profile`, {
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
            const idx = this.state.providers.findIndex(p => p.id === 'p1');
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
