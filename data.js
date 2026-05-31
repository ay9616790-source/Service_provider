const SERVICES_DATA = {
  societies: [
    { id: 'gokuldham', name: 'Gokuldham Society' },
    { id: 'shanti_kunj', name: 'Shanti Kunj Heights' },
    { id: 'green_valley', name: 'Green Valley Apartments' },
    { id: 'royal_palms', name: 'Royal Palms Residency' }
  ],
  categories: [
    {
      id: 'electrician',
      name: 'Electrician',
      icon: '⚡',
      description: 'Fan installations, short circuits, home wiring & appliance repairs.',
      bgGradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
    },
    {
      id: 'carpenter',
      name: 'Carpenter',
      icon: '🪚',
      description: 'Furniture repair, custom cabinets, door fitting & wooden polishing.',
      bgGradient: 'linear-gradient(135deg, #abecd6 0%, #fbed96 100%)'
    },
    {
      id: 'painter',
      name: 'Painter',
      icon: '🎨',
      description: 'Interior & exterior painting, texture wall painting & touch-ups.',
      bgGradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
    },
    {
      id: 'wallpaper',
      name: 'Wallpaper Specialist',
      icon: '🖼️',
      description: 'Custom wallpaper installation, removal, and wall styling.',
      bgGradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
    },
    {
      id: 'plumber',
      name: 'Plumber',
      icon: '🚰',
      description: 'Leak detection, pipe repairs, tap installations & drain cleaning.',
      bgGradient: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)'
    }
  ],

  providers: [],

  // Prepopulated bookings to avoid empty state
  bookings: []
};
