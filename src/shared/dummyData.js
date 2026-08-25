
export const PROVIDERS = [
  {
    id: 'p1',
    name: 'Elena Rodriguez',
    role: 'Senior Interior Designer',
    location: 'Los Angeles, CA',
    languages: 'English, Spanish',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    coverImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    isVerified: true,
    rating: 4.9,
    reviewCount: 124,
    yearsExp: '8+',
    projectCount: 342,
    category: 'interior',
    skills: ['Interior Design', '3D Modeling', 'Sustainable Design', 'Space Planning'],
    priceFrom: '$85/hr',
    bio: "With nearly a decade of experience, I specialize in creating functional yet breathtaking spaces that reflect my clients' unique personalities. My approach blends sustainable practices with high-end modern aesthetics.",
    serviceIds: ['s1', 's2', 's3'],
  },
  {
    id: 'p2',
    name: 'Marcus Sterling',
    role: 'Master Sanitation Expert',
    location: 'Beverly Hills, CA',
    languages: 'English',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
    isVerified: true,
    rating: 4.95,
    reviewCount: 210,
    yearsExp: '8+',
    projectCount: 1200,
    category: 'home',
    skills: ['Deep Cleaning', 'Sanitation', 'Kitchen Detailing', 'Floor Sterilization'],
    priceFrom: '$149',
    bio: 'I transform homes into pristine sanctuaries using hospital-grade protocols. Specializing in deep cleaning and restoration, my team delivers results that speak for themselves.',
    serviceIds: ['s4', 's5', 's6'],
  },
  {
    id: 'p3',
    name: 'Sarah Chen',
    role: 'Personal Fitness Trainer',
    location: 'New York, NY',
    languages: 'English, Mandarin',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    isVerified: true,
    rating: 4.9,
    reviewCount: 88,
    yearsExp: '6+',
    projectCount: 520,
    category: 'fitness',
    skills: ['Strength Training', 'HIIT', 'Nutrition', 'Yoga'],
    priceFrom: '$85/session',
    bio: 'Certified personal trainer with 6+ years helping clients achieve their fitness goals. I create tailored programs combining strength, cardio, and nutrition for lasting results.',
    serviceIds: ['s7', 's8'],
  },
  {
    id: 'p4',
    name: 'Alex Rivera',
    role: 'Brand & Graphic Designer',
    location: 'Austin, TX',
    languages: 'English, Spanish',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80',
    isVerified: true,
    rating: 4.8,
    reviewCount: 124,
    yearsExp: '7+',
    projectCount: 430,
    category: 'design',
    skills: ['Brand Identity', 'UI/UX', 'Motion Graphics', 'Print Design'],
    priceFrom: '$299',
    bio: 'Award-winning brand designer helping startups and established companies craft identities that resonate. From logo to full brand system, I make your vision tangible.',
    serviceIds: ['s9', 's10'],
  },
  {
    id: 'p5',
    name: 'Elena Soft',
    role: 'Yoga & Wellness Coach',
    location: 'Miami, FL',
    languages: 'English, Portuguese',
    avatar: 'https://randomuser.me/api/portraits/women/79.jpg',
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    isVerified: true,
    rating: 5.0,
    reviewCount: 212,
    yearsExp: '10+',
    projectCount: 890,
    category: 'fitness',
    skills: ['Yoga', 'Meditation', 'Breathwork', 'Wellness'],
    priceFrom: '$60/session',
    bio: 'Holistic wellness practitioner with a decade of experience guiding people to physical and mental balance. My sessions blend traditional yoga with modern mindfulness techniques.',
    serviceIds: ['s11', 's12'],
  },
];

export const SERVICES = [
  // Elena Rodriguez (p1)
  {
    id: 's1',
    providerId: 'p1',
    category: 'DESIGN',
    categoryColor: '#7C3AED',
    title: 'Full Room Transformation',
    rating: 5.0,
    reviewCount: 64,
    price: '$150/hr',
    priceNote: 'Starting price',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=80',
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80',
    ],
    description:
      'Complete transformation of any room from concept to completion. Includes mood boarding, space planning, furniture sourcing, and final styling. I handle everything so you can walk into a finished space.',
    includes: [
      'Initial consultation & mood board',
      'Space planning & 3D rendering',
      'Furniture & material sourcing',
      'Installation oversight',
    ],
    reviews: [
      {id: 'r1', user: 'Jonathan D.', initials: 'JD', avatar: null, date: '2 days ago', rating: 5, text: 'Elena completely transformed our living room. The attention to detail was incredible and everything was done on time.'},
      {id: 'r2', user: 'Sarah M.', initials: 'SM', avatar: null, date: '1 week ago', rating: 5, text: 'Absolutely stunning results. I still get compliments every time someone visits.'},
    ],
    similarServiceIds: ['s2', 's3'],
  },
  {
    id: 's2',
    providerId: 'p1',
    category: 'CONSULTING',
    categoryColor: '#7C3AED',
    title: 'Color & Material Selection',
    rating: 4.9,
    reviewCount: 42,
    price: '$85/hr',
    priceNote: 'Per session',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80',
    ],
    description:
      'Expert guidance on color palettes, textures, and material combinations that bring harmony to your space. Perfect for DIY renovators who want professional direction.',
    includes: [
      'Color palette creation',
      'Material sample curation',
      'Paint & finish recommendations',
      'Digital mood board delivery',
    ],
    reviews: [
      {id: 'r3', user: 'Lisa K.', initials: 'LK', avatar: null, date: '3 days ago', rating: 5, text: 'The color consultation saved me from making so many mistakes. Worth every penny.'},
    ],
    similarServiceIds: ['s1', 's3'],
  },
  {
    id: 's3',
    providerId: 'p1',
    category: 'DESIGN',
    categoryColor: '#7C3AED',
    title: 'Home Office Setup',
    rating: 4.8,
    reviewCount: 18,
    price: '$120/hr',
    priceNote: 'Starting price',
    image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    ],
    description:
      'Design a productive and inspiring home office tailored to your workflow. Ergonomics, aesthetics, and smart storage combined for the perfect work-from-home setup.',
    includes: [
      'Ergonomic layout planning',
      'Desk & storage solutions',
      'Lighting recommendations',
      'Cable management design',
    ],
    reviews: [
      {id: 'r4', user: 'Tom B.', initials: 'TB', avatar: null, date: '5 days ago', rating: 5, text: 'My productivity has doubled since Elena redesigned my home office. Incredible transformation.'},
    ],
    similarServiceIds: ['s1', 's2'],
  },

  // Marcus Sterling (p2)
  {
    id: 's4',
    providerId: 'p2',
    category: 'HOME',
    title: 'Premium Deep Kitchen Cleaning',
    rating: 4.9,
    reviewCount: 124,
    price: '$149',
    priceNote: 'Flat rate',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80',
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80',
    ],
    description:
      'Transform your kitchen into a pristine sanctuary with our comprehensive deep cleaning protocol. We don\'t just clean; we restore. Our specialized team uses hospital-grade products to eliminate grease, bacteria, and grime.',
    includes: [
      'Industrial hood & vent degreasing',
      'Full interior & exterior appliance detailing',
      'Backsplash & countertop steam cleaning',
      'Baseboard & floor sterilization',
    ],
    reviews: [
      {id: 'r5', user: 'Jonathan D.', initials: 'JD', avatar: null, date: '2 days ago', rating: 5, text: 'Marcus and his team did an incredible job. My kitchen looks better than the day I moved in. Truly professional and worth every penny.'},
      {id: 'r6', user: 'Amanda R.', initials: 'AR', avatar: null, date: '4 days ago', rating: 5, text: 'Absolutely spotless. I had no idea a kitchen could look this clean!'},
    ],
    similarServiceIds: ['s5', 's6'],
  },
  {
    id: 's5',
    providerId: 'p2',
    category: 'HOME',
    title: 'Upholstery Revival',
    rating: 4.8,
    reviewCount: 56,
    price: '$149',
    priceNote: 'Flat rate',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80',
    ],
    description:
      'Professional upholstery deep cleaning using steam extraction and enzyme treatments. Restores sofas, chairs, and mattresses to like-new condition.',
    includes: [
      'Pre-treatment stain inspection',
      'Hot water extraction',
      'Enzyme-based deodorizing',
      'Fabric protection coating',
    ],
    reviews: [
      {id: 'r7', user: 'Mark L.', initials: 'ML', avatar: null, date: '1 week ago', rating: 5, text: 'My sofa looks brand new! Amazing results.'},
    ],
    similarServiceIds: ['s4', 's6'],
  },
  {
    id: 's6',
    providerId: 'p2',
    category: 'HOME',
    categoryColor: '#0891B2',
    title: 'Floor Polishing & Sealing',
    rating: 4.7,
    reviewCount: 30,
    price: '$199',
    priceNote: 'Starting price',
    image: 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=600&q=80',
    portfolioImages: [],
    description:
      'Professional floor polishing and sealing for hardwood, marble, and tile surfaces. Brings back the original shine and protects against future damage.',
    includes: [
      'Deep cleaning & prep',
      'Machine buffing & polishing',
      'Sealant application',
      '48hr cure time advisory',
    ],
    reviews: [],
    similarServiceIds: ['s4', 's5'],
  },

  // Sarah Chen (p3)
  {
    id: 's7',
    providerId: 'p3',
    category: 'FITNESS',
    title: 'Personal Training',
    rating: 4.9,
    reviewCount: 88,
    price: '$85/session',
    priceNote: 'Per session',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1486218119243-13301edd484d?w=400&q=80',
    ],
    description:
      'Personalized 1-on-1 training sessions designed around your goals, fitness level, and schedule. Strength, cardio, and mobility — all in one program.',
    includes: [
      'Fitness assessment & goal setting',
      'Custom workout programming',
      'Nutrition guidance',
      'Weekly progress tracking',
    ],
    reviews: [
      {id: 'r8', user: 'Chris P.', initials: 'CP', avatar: null, date: '3 days ago', rating: 5, text: 'Sarah is an incredible trainer. I\'ve lost 12kg in 3 months and feel stronger than ever.'},
    ],
    similarServiceIds: ['s8', 's11'],
  },
  {
    id: 's8',
    providerId: 'p3',
    category: 'FITNESS',
    title: 'HIIT Boot Camp',
    rating: 4.8,
    reviewCount: 44,
    price: '$60/session',
    priceNote: 'Per session',
    image: 'https://images.unsplash.com/photo-1486218119243-13301edd484d?w=600&q=80',
    portfolioImages: [],
    description:
      'High-intensity interval training sessions that torch calories and build endurance fast. Group or private options available.',
    includes: [
      'Warm-up & mobility prep',
      'HIIT circuit training',
      'Cool-down & stretching',
      'Post-session nutrition tips',
    ],
    reviews: [],
    similarServiceIds: ['s7', 's11'],
  },

  // Alex Rivera (p4)
  {
    id: 's9',
    providerId: 'p4',
    category: 'DESIGN',
    categoryColor: '#7C3AED',
    title: 'Brand Identity Pack',
    rating: 4.8,
    reviewCount: 124,
    price: '$299',
    priceNote: 'Full package',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
    ],
    description:
      'Complete brand identity creation from concept to delivery. Logo, typography, color system, and brand guidelines that make your business unforgettable.',
    includes: [
      'Logo design (3 concepts)',
      'Color & typography system',
      'Business card & letterhead',
      'Brand guidelines PDF',
    ],
    reviews: [
      {id: 'r9', user: 'Diana W.', initials: 'DW', avatar: null, date: '1 week ago', rating: 5, text: 'Alex nailed our brand identity on the first round. Exceptional taste and professionalism.'},
    ],
    similarServiceIds: ['s10'],
  },
  {
    id: 's10',
    providerId: 'p4',
    category: 'DESIGN',
    categoryColor: '#7C3AED',
    title: 'UI/UX App Design',
    rating: 4.9,
    reviewCount: 62,
    price: '$450',
    priceNote: 'Per screen set',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80',
    portfolioImages: [],
    description:
      'End-to-end mobile and web app UI/UX design. User research, wireframes, and pixel-perfect Figma deliverables ready for your dev team.',
    includes: [
      'User flow mapping',
      'Low & high fidelity wireframes',
      'Figma component library',
      'Developer handoff notes',
    ],
    reviews: [],
    similarServiceIds: ['s9'],
  },

  // Elena Soft (p5)
  {
    id: 's11',
    providerId: 'p5',
    category: 'FITNESS',
    title: 'Yoga & Wellness',
    rating: 5.0,
    reviewCount: 212,
    price: '$60/session',
    priceNote: 'Per session',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    portfolioImages: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    ],
    description:
      'Holistic yoga and wellness sessions blending traditional asana practice with breathwork and guided meditation. Suitable for all levels.',
    includes: [
      'Personalized asana sequence',
      'Pranayama breathwork',
      'Guided meditation',
      'Weekly wellness check-in',
    ],
    reviews: [
      {id: 'r10', user: 'Priya K.', initials: 'PK', avatar: null, date: '1 day ago', rating: 5, text: 'Elena Soft\'s sessions are genuinely life-changing. I feel calmer and stronger every week.'},
    ],
    similarServiceIds: ['s12', 's7'],
  },
  {
    id: 's12',
    providerId: 'p5',
    category: 'FITNESS',
    title: 'Meditation Masterclass',
    rating: 4.9,
    reviewCount: 88,
    price: '$45/session',
    priceNote: 'Per session',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    portfolioImages: [],
    description:
      'Deep-dive meditation practice covering mindfulness, visualization, and body scan techniques for stress relief and mental clarity.',
    includes: [
      'Guided body scan',
      'Visualization techniques',
      'Stress-release breathwork',
      'Daily practice toolkit',
    ],
    reviews: [],
    similarServiceIds: ['s11', 's7'],
  },
];

// Helper functions
export const getProviderById = id => PROVIDERS.find(p => p.id === id);
export const getServiceById = id => SERVICES.find(s => s.id === id);
export const getServicesByProvider = providerId =>
  SERVICES.filter(s => s.providerId === providerId);
export const getSimilarServices = similarIds =>
  similarIds.map(id => SERVICES.find(s => s.id === id)).filter(Boolean);

// Featured items for ServicesScreen
export const FEATURED_SERVICES = [SERVICES[0], SERVICES[3], SERVICES[6]];
export const RECENT_SERVICES = [SERVICES[8], SERVICES[6], SERVICES[3], SERVICES[10]];

export const SERVICE_CATEGORIES = [
  {id: 'all', label: 'Services'},
  {id: 'food', label: 'Food'},
  {id: 'education', label: 'Education'},
  {id: 'fitness', label: 'Fitness'},
  {id: 'design', label: 'Design'},
  {id: 'home', label: 'Home'},
];

// Default logged-in user (for preview)
export const CURRENT_USER = {
  firstName: 'Julian',
  lastName: 'Alexander',
  name: 'Julian Alexander',
  bio: 'Design Strategist & Pet Enthusiast',
  email: 'julian.alexander@premium.com',
  phone: '+1 (555) 347-2810',
  location: 'Los Angeles, California',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  savedServiceIds: ['s1', 's3', 's6', 's9'],
  address1: '4120 Sunset Boulevard',
  address2: 'Apt 8B',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90028',
  memberSince: '2023',
  completedJobs: 24,
  savedCount: 12,
  rating: 4.8,
  accountId: '#CU-2023-2847',
};

// ─── New: Secretary & Test Users ──────────────────────────────────────────────

export const SECRETARY = {
  id: 'sec1',
  name: 'Linda Martinez',
  role: 'secretary',
  email: 'secretary@test.com',
  password: 'secret123',   // only for testing
  avatar: 'https://randomuser.me/api/portraits/women/63.jpg',
  bio: 'Dedicated community secretary, managing all service requests and provider coordination.',
  // Additional fields (optional)
  location: 'Los Angeles, CA',
  phone: '+1 (555) 234-5678',
  communityHandle: '@uchiha_commun',
  // Secretary-specific: list of managed provider IDs (for demonstration)
  managedProviders: ['p1', 'p2', 'p3'],
};

// A provider user (based on Elena Rodriguez, but with login credentials)
export const PROVIDER_USER = {
  ...PROVIDERS[0], // inherits all fields from Elena
  email: 'provider@test.com',
  password: 'provider123',
  role: 'provider',
};

// Array of all test users for fake authentication
export const USERS = [
  {
    email: PROVIDER_USER.email,
    password: PROVIDER_USER.password,
    role: 'provider',
    profile: PROVIDER_USER,
  },
  {
    email: SECRETARY.email,
    password: SECRETARY.password,
    role: 'secretary',
    profile: SECRETARY,
  },
];

// Helper to find a user by email/password
export const findUser = (email, password) =>
  USERS.find(u => u.email === email && u.password === password);

// Featured providers (first 3)
export const FEATURED_PROVIDERS_LIST = PROVIDERS.slice(0, 3);
export const ALL_PROVIDERS_LIST = PROVIDERS;

// ─── New: Community Members (for Members management screen) ──────────────────

export const COMMUNITY_MEMBERS = [
  {
    id: 'm1',
    name: 'Deepak Singh',
    type: 'provider', // 'provider' | 'member'
    status: 'approved', // 'approved' | 'pending' | 'rejected'
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    email: 'dskvg2004@gmail.com',
    phone: '7973204554',
    joinedDate: 'Jun 16, 2026',
  },
  {
    id: 'm2',
    name: 'Priya Sharma',
    type: 'member',
    status: 'pending',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    email: 'priya.s@gmail.com',
    phone: '9876543210',
    joinedDate: 'Jul 02, 2026',
  },
  {
    id: 'm3',
    name: 'Rahul Verma',
    type: 'provider',
    status: 'approved',
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    email: 'r.verma@outlook.com',
    phone: '8800112233',
    joinedDate: 'May 20, 2026',
  },
  {
    id: 'm4',
    name: 'Anita Das',
    type: 'member',
    status: 'rejected',
    avatar: 'https://randomuser.me/api/portraits/women/85.jpg',
    email: 'anita.das@domain.com',
    phone: null,
    joinedDate: 'Apr 12, 2026',
  },
];

export const getCommunityMemberById = id =>
  COMMUNITY_MEMBERS.find(m => m.id === id);

// ─── New: Broadcasts (for Broadcast Message screen) ───────────────────────────

export const BROADCASTS = [
  {
    id: 'b1',
    title: 'Annual Maintenance',
    preview: 'Scheduled water tank cleaning on...',
    status: 'sent', // 'sent' | 'draft' | 'scheduled'
    date: 'Oct 24, 2023',
  },
  {
    id: 'b2',
    title: 'Community Meetup',
    preview: 'Join us for a neighborhood coffee...',
    status: 'sent',
    date: 'Oct 20, 2023',
  },
];

// ─── New: Pending Provider Requests (for Approve Providers screen) ────────────

export const PENDING_PROVIDER_REQUESTS = [
  {
    id: 'req1',
    name: 'Arjun Sharma',
    category: 'Home Maintenance',
    avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    description:
      'Experienced electrician specializing in modern smart home installations with 10+ years of local experience.',
  },
  {
    id: 'req2',
    name: 'Elena Rodriguez',
    category: 'Academic Tutor',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    description:
      'Masters in Mathematics, offering K-12 tutoring for local residents. Focused on simplified learning.',
  },
  {
    id: 'req3',
    name: 'Marcus Chen',
    category: 'Pet Grooming',
    avatar: null,
    description:
      'Certified professional pet groomer providing mobile premium pet care services to your doorstep.',
  },
];

// ─── New: Community Events (for Events screen) ────────────────────────────────

export const COMMUNITY_EVENTS = [];