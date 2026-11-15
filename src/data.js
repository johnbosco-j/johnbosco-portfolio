// All portfolio content lives here. Edit this file to update what the TV shows.

export const profile = {
  name: 'Johnbosco J',
  fullName: 'Johnbosco J Elanjikal',
  tagline: 'I build clear software, and a company to ship it.',
  roles: ['Founder & Lead Engineer, Riven', 'Google Student Ambassador 2026', 'CSE undergrad, LICET Chennai'],
  location: 'Chennai, Tamil Nadu, India',
  about: [
    'Computer Science undergraduate at Loyola-ICAM College of Engineering and Technology (LICET), Chennai, and the founder of Riven, a studio that builds client websites and AI products.',
    'Full-stack developer and AI/ML engineer. Most days that means Next.js and TypeScript on the front, FastAPI and PostgreSQL behind it, and computer vision or retrieval wherever it earns its place.',
  ],
  stats: [
    { value: '610', label: 'GitHub contributions, last year' },
    { value: '25', label: 'repositories' },
    { value: '3', label: 'first prizes in 2026 competitions' },
    { value: '4', label: 'languages spoken' },
  ],
  skills: ['Full-Stack Development', 'Next.js', 'TypeScript', 'Computer Vision', 'FastAPI', 'PostgreSQL', 'Supabase', 'RAG', 'REST APIs', 'Kotlin', 'Swift', 'Python', 'three.js', 'MediaPipe'],
};

export const riven = {
  headline: 'Riven',
  sub: 'A technology studio working across AI, health, developer tools and education.',
  body: 'Riven builds its own products, and builds websites and AI systems for clients who need software done properly. Founded September 2026; the first live client website shipped within the first month.',
  products: [
    { name: 'Clareo', line: 'Private, on-device fatigue, eye-strain and posture coach for people who work at a screen all day.' },
    { name: 'Nijam', line: 'Multilingual AI scam checker for India. Before you pay, ask Nijam.' },
    { name: 'Riven TV', line: 'A calm, ad-free home screen for Android TV and Google TV.' },
    { name: 'WallLoop', line: 'Live video wallpapers for macOS, from your own videos.' },
  ],
  site: 'Company site built in Next.js 16, TypeScript, Tailwind CSS, Framer Motion and three.js, with a 3D gyroscope hero that follows mouse or phone tilt.',
};

export const projects = [
  {
    name: 'SAFER', tag: 'First Prize · IIT Madras', when: 'Nov 2026', role: 'Team SAFER (4 members)',
    line: 'Smart Allocation Framework for Emergency Response.',
    body: 'A decision-support research prototype for emergency response optimisation, built for PALS Think2Impact 2026 under an IT problem statement with the Naandi Foundation. It combines geospatial mapping, emergency response simulation, optimisation algorithms and a real-time-style command centre to improve how emergency resources are allocated.',
    stack: ['Python', 'Geospatial mapping', 'Optimisation', 'Simulation'], link: null,
  },
  {
    name: 'Riven TV', tag: 'Android TV launcher', when: 'Nov 2026', role: 'Founder & Lead Engineer',
    line: 'Your TV, calm again.',
    body: 'TV home screens have turned into ad billboards, so Riven replaced theirs. Riven TV is a free, open-source home screen for Android TV 8+ and Google TV: no ads, fast, with Riven\'s own Wi-Fi, Bluetooth and settings screens.',
    stack: ['Kotlin', 'Android Jetpack', 'Android TV'], link: 'https://github.com/johnbosco-j/riven-tv',
  },
  {
    name: 'WallLoop', tag: 'macOS app', when: 'Nov 2026', role: 'Founder & Lead Engineer',
    line: 'Your videos, alive on your desktop.',
    body: 'A free macOS app that turns your own videos into a live wallpaper on every display. Muted, looping, hardware-decoded and quiet on battery. It lives in your menu bar. MIT licensed.',
    stack: ['Swift', 'macOS', 'AVFoundation'], link: 'https://github.com/johnbosco-j/WallLoop',
  },
  {
    name: 'CarbonPass', tag: 'IEEE ClimateChain 2026', when: 'Oct 2026', role: 'Developer',
    line: 'Verifiable carbon passports for EU CBAM.',
    body: 'Since January 2026, steel and other goods entering the EU carry a carbon price under CBAM. CarbonPass issues verified embedded-emissions passports: AI-prepared evidence, post-quantum verifier attestations, and ERC-1155 tonnes that cannot be double counted.',
    stack: ['Next.js', 'TypeScript', 'Ethereum', 'Smart Contracts', 'Post-quantum'], link: 'https://github.com/johnbosco-j/carbonpass',
  },
  {
    name: 'LICET Things', tag: 'Department ERP', when: 'Mar – Oct 2026', role: 'Full-Stack Developer & Architect',
    line: 'I built an ERP for my own department.',
    body: 'The academic portal for the Department of Computer Science and Engineering at LICET: attendance, marks, leave and grievances in one place. Built on Next.js and Supabase with Row-Level Security. Built with Asen Castro.',
    stack: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Row-Level Security'], link: 'https://github.com/johnbosco-j/licetcseerp',
  },
  {
    name: 'Nijam', tag: 'Android + web app', when: 'Oct 2026', role: 'Founder & Lead Engineer',
    line: 'Before you pay, ask Nijam.',
    body: 'Scam messages in India do not arrive in one language. Nijam is on-device scam protection that works across Indian languages, as an Android app and on the web. A Riven product, built with Asen Castro.',
    stack: ['Python', 'NLP', 'Android', 'On-device AI'], link: null,
  },
  {
    name: 'Sous', tag: 'Amazon Developer Hackathon', when: 'Oct 2026', role: 'Solo Developer',
    line: 'An Alexa+ kitchen agent.',
    body: 'Every evening, millions of families ask the same question: what is for dinner? Sous is a kitchen agent built for the Alexa+ track of the Build, Ship, Shape Amazon Developer Hackathon.',
    stack: ['TypeScript', 'Amazon Bedrock', 'Model Context Protocol', 'Alexa+'], link: 'https://github.com/johnbosco-j/Sous',
  },
  {
    name: 'Clareo', tag: 'Web + desktop app', when: 'Jun – Sep 2026', role: 'Founder & Lead Engineer',
    line: 'A private eye and fatigue wellness coach.',
    body: 'Riven\'s first product: an on-device fatigue, eye-strain and posture coach for screen workers. It grew out of EyeGuard, a hackathon project that detected fatigue in real time with MediaPipe face mesh, EAR/MAR, PERCLOS and head pose over FastAPI and WebSockets.',
    stack: ['TypeScript', 'MediaPipe', 'Computer Vision', 'FastAPI'], link: null,
  },
  {
    name: 'NNDL Hub', tag: 'Class community', when: 'Sep 2026', role: 'Full-Stack Developer',
    line: 'A class community with a RAG assistant.',
    body: 'Course journal, Q&A forum, threads, library, calendar and Axon, a retrieval-augmented assistant, for the Neural Networks and Deep Learning course taken by III CSE-A and B at LICET.',
    stack: ['Next.js 15', 'Supabase', 'RAG'], link: null,
  },
  {
    name: 'oLearn', tag: 'E-learning platform', when: 'May 2026', role: 'Project Lead · Team of 4',
    line: 'A unified e-learning platform.',
    body: 'Built by a four-member team in a 14-day agile sprint, with a Spring Boot REST backend and a state machine driving the learning flow.',
    stack: ['Java', 'Spring Boot', 'REST API', 'JavaScript'], link: 'https://github.com/johnbosco-j/oLearn',
  },
  {
    name: '8086 Trainer', tag: 'Emulator', when: 'Mar 2026', role: 'Developer',
    line: 'A physical trainer kit, emulated.',
    body: 'A full-stack 8086 assembly emulator of a physical microprocessor trainer kit, with a Python backend for accurate registers, flags and 16-bit arithmetic.',
    stack: ['Python', '8086 Assembly', 'Emulation'], link: 'https://github.com/johnbosco-j/8086-trainer-emulator-ui',
  },
  {
    name: 'ROCK', tag: 'Navigation web app', when: 'Oct 2026', role: 'Developer',
    line: 'Road for Trucks.',
    body: 'A truck-aware navigation web app: routing that takes the truck into account, not just the road. Built as a PDL project by team The AfterMath.',
    stack: ['JavaScript', 'Maps', 'Routing'], link: 'https://github.com/johnbosco-j/rock-road-for-trucks',
  },
];

export const experience = [
  {
    title: 'Founder & Lead Engineer', org: 'Riven (RivenDevs)', when: 'Sep 2026 – Present', where: 'Chennai · Hybrid',
    points: ['Founded the studio and delivered the first live client website within the first month.', 'Designed and built the company website in Next.js 16, TypeScript, Tailwind CSS, Framer Motion and three.js.', 'Leading Clareo, Riven\'s first product.'],
  },
  {
    title: 'Campus Ambassador', org: 'Google', when: 'Nov 2026 – Present', where: 'Greater Chennai Area · Remote',
    points: ['Selected as a Google Student Ambassador for Semester 2, 2026, representing the Google Gemini ecosystem on campus.', 'Organising workshops, demonstrations and hands-on AI learning sessions for students.', 'Mission: help students move from using AI as a tool to building with it.'],
  },
  {
    title: 'Student Program Partner', org: 'Internshala', when: 'Nov 2026 – Present', where: 'India · Remote',
    points: ['Internshala Student Partner 2026 representing LICET, Chennai.', 'Connecting students with training, internships and career opportunities across campus.'],
  },
  {
    title: 'Workshop Trainer', org: 'LICET, Department of CSE', when: 'Oct 2026', where: 'Chennai · On-site',
    points: ['Designed and delivered a hands-on workshop for 30 first-year CSE students on building effective presentations with AI tools.', 'Covered storytelling and structure, visual design, and responsible use of AI in academic work.'],
  },
  {
    title: 'Web Lead Developer', org: 'Lincy\'s Makeover Artistry', when: 'Sep 2026', where: 'Freelance · Remote',
    points: ['Client project delivered through Riven for an internationally certified bridal and editorial makeup artist.', 'Six core modules: gallery, before/after, packages and pricing, bookings, WhatsApp enquiries and SEO.', 'Live at lincysmakeoverartistry.in'],
  },
  {
    title: 'Website Developer, XPLORE\'26', org: 'LICET', when: 'Aug 2026', where: 'Chennai · On-site',
    points: ['Part of the team that built the website for XPLORE\'26 – Into the Spider-Verse, the national-level technical symposium of LICET\'s CSE department.', 'Presented six events to participants from many institutions.'],
  },
  {
    title: 'Student Coordinator (CSE-A)', org: 'Entrepreneurship Development Cell, LICET', when: '2025 – 2026', where: 'Chennai · On-site',
    points: ['Represented the CSE-A class in LICET\'s Entrepreneurship Development Cell.', 'Point of contact for EDC activities, events and student participation.'],
  },
];

export const awards = [
  { place: '1st', title: 'PALS Think2Impact 2026', by: 'PALS, IIT Madras', when: 'Nov 2026', body: 'First Prize as part of Team SAFER, with a ₹5,000 team cash prize, for the Smart Allocation Framework for Emergency Response. Team: Johnbosco J, Joel Nitin M, Jeffrey Figo J and Joe Naren A.' },
  { place: '1st', title: 'General Knowledge & Technical Quiz', by: 'PALS, IIT Madras', when: 'Nov 2026', body: 'First Prize representing LICET alongside Bharanidharan, winning a ₹2,000 team cash prize in a short-notice competition.' },
  { place: '1st', title: 'Kranti 2026 – Logo Lock', by: 'Meenakshi Sundararajan Engineering College', when: 'Mar 2026', body: 'First place at a national-level technical symposium, with Jeffrey Figo J, held in association with the Computer Society of India, Chennai Chapter.' },
  { place: '1st', title: 'Spotlight (Acting)', by: 'Engenia 2026', when: 'Jan 2026', body: 'First prize in the Spotlight acting event at Engenia 2026.' },
  { place: 'Top 7', title: 'Ctrl + Alt + Hack 2.0', by: 'LICET EICON & Innovation Council', when: 'Mar 2026', body: 'Lead developer of team EyeGuard at a 3-day hackathon. Built a real-time fatigue-detection API with MediaPipe face mesh, EAR/MAR, PERCLOS and head pose, served over FastAPI REST and WebSockets.' },
  { place: '5th', title: 'Buildathon 3.0', by: 'Buildathon 3.0', when: 'Jan 2026', body: 'Key developer of EyeGuard, a real-time screen-health and fatigue-detection assistant using on-device computer vision. The project later grew into Clareo.' },
  { place: '2nd', title: 'Elementia 2025', by: 'Science Club, LICET', when: 'Apr 2025', body: 'Second prize at Elementia 2025, conducted by the LICET Science Club.' },
];

export const offClock = [
  { icon: 'car', title: 'Driving', body: 'Not just a car enthusiast, but someone who truly enjoys the art of driving. Long highway runs, new places, the open road.' },
  { icon: 'keys', title: 'Keyboard', body: 'Plays keyboard for Mass and religious events, from energetic celebrations to quiet moments of worship.' },
  { icon: 'mask', title: 'Stage', body: 'First prize in Spotlight, the acting event at Engenia 2026.' },
  { icon: 'chip', title: 'Hardware', body: 'Believes software engineers should get their hands on hardware at least once.' },
];

export const languages = [
  { name: 'Tamil', level: 'Native or bilingual' },
  { name: 'Malayalam', level: 'Native or bilingual' },
  { name: 'English', level: 'Full professional' },
  { name: 'Kannada', level: 'Elementary' },
];

export const contact = [
  { label: 'LinkedIn', value: 'linkedin.com/in/johnbosco-j', url: 'https://linkedin.com/in/johnbosco-j/' },
  { label: 'GitHub', value: 'github.com/johnbosco-j', url: 'https://github.com/johnbosco-j' },
  { label: 'Email', value: 'mailtojjohnbosco@gmail.com', url: 'mailto:mailtojjohnbosco@gmail.com' },
  { label: 'Website', value: 'johnbosco.vercel.app', url: 'https://johnbosco.vercel.app/' },
];

export const channels = [
  { id: 'about', name: 'About', accent: '#f5b84a', blurb: 'Who he is' },
  { id: 'riven', name: 'Riven', accent: '#a78bfa', blurb: 'The studio' },
  { id: 'projects', name: 'Projects', accent: '#5eead4', blurb: 'Twelve builds' },
  { id: 'experience', name: 'Experience', accent: '#7aa7ff', blurb: 'Roles so far' },
  { id: 'awards', name: 'Awards', accent: '#ffd166', blurb: 'Prizes won' },
  { id: 'offclock', name: 'Off the Clock', accent: '#ff8a7a', blurb: 'Away from the IDE' },
  { id: 'contact', name: 'Contact', accent: '#86efac', blurb: 'Say howdy' },
  { id: 'music', name: 'Music', accent: '#f472b6', blurb: 'Now playing' },
];

// Sites the studio laptop's browser is allowed to open. `frame: false` means the site
// refuses to be embedded, so the browser shows a summary and an "open in new tab" button.
export const sites = [
  { name: 'Riven', url: 'https://rivendevs-site.vercel.app/', note: 'Company site, Next.js 16 + three.js' },
  { name: 'Riven TV', url: 'https://rivendevs-site.vercel.app/tv', note: 'Android TV launcher product page' },
  { name: 'WallLoop', url: 'https://wallloop.vercel.app/', note: 'Live video wallpapers for macOS' },
  { name: 'Sous', url: 'https://sous-alexa.vercel.app/', note: 'Alexa+ kitchen agent' },
  { name: 'ROCK', url: 'https://rock-road-for-trucks.vercel.app/', note: 'Truck-aware navigation' },
  { name: "Lincy's", url: 'https://lincysmakeoverartistry.in/', note: 'Client site delivered through Riven' },
  { name: 'Earlier portfolio', url: 'https://johnbosco-portfolio-gules.vercel.app/', note: 'The Next.js portfolio that came before this house' },
  { name: 'CSE ERP', url: 'https://cseerp.vercel.app/', note: 'LICET Things. This site blocks embedding, so it opens in a new tab.', frame: false },
  { name: 'Excelsior', url: 'https://excelsior-live.vercel.app/', note: 'Excelsior ERP, behind a sign-in.', frame: false },
  { name: 'GitHub', url: 'https://github.com/johnbosco-j', note: 'Public repositories', github: 'johnbosco-j' },
];

// Who is guiding. Change the display names here.
export const guides = { sheriff: { name: 'Sheriff' }, ranger: { name: 'Buzz' } };

// Background music: shuffled, 20% volume, changeable from the TV's Music app.
// Files live in public/audio/music/. Only list tracks you have the right to publish.
export const music = [
  { file: 'track1.mp3', title: 'Ebenesare', by: 'Flute cover' },
  { file: 'track2.mp3', title: 'Ennil Adanga Sthothiram', by: 'The Menorah Orchestra · instrumental' },
  { file: 'track3.mp3', title: 'Oru Thaai Thetruvathupol', by: 'Flute Suresh · instrumental' },
  { file: 'track4.mp3', title: 'Tham Kirubai', by: 'ft. Jotham · online collaboration' },
];
