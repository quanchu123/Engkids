# ComicLingua Kids - Interactive English Learning Platform

**Version:** 2.0  
**Last Updated:** January 15, 2026  
**Status:** ✅ Production Ready

---

## 📚 Overview

ComicLingua Kids is an interactive web platform for children (ages 5-10) to learn English through:
- **Comic-style stories** with bilingual subtitles
- **Video lessons** with clickable word learning
- **Click-to-learn** dictionary integration
- **Vocabulary flashcards** and mini-games
- **Progress tracking** with gamification

### Key Features
✅ **Story Reader** - Interactive comic panels with click-to-learn words  
✅ **Video Learning** - Bilingual video platform (like FluentU/Language Reactor)  
✅ **Dictionary API** - Real-time word definitions & pronunciation  
✅ **Translation API** - Vietnamese translations  
✅ **Vocabulary System** - Save words & flashcards  
✅ **Mini Games** - Memory match & quiz games  
✅ **Admin Panel** - Content management for stories & videos  
✅ **Bunny.net Stream** - Professional video hosting with TUS upload  

---

## 🚀 Tech Stack

### Frontend
- **Next.js 14.2.35** - React framework with App Router
- **React 18.2.0** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management

### Backend & Services
- **Supabase** - PostgreSQL database & authentication
- **Bunny.net Stream** - Video hosting & streaming
- **Dictionary API** - Word definitions
- **MyMemory Translation API** - English-Vietnamese translation
- **TUS Protocol** - Resumable video uploads

### Architecture
- Server-side rendering (SSR) for SEO
- Client-side interactivity with React hooks
- RESTful API routes for CRUD operations
- Responsive design (mobile-first)

---

## 📦 Project Structure

```
comic-lingua-kids/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   ├── stories/             # Story reader
│   │   │   ├── page.tsx         # Story list
│   │   │   └── [id]/            # Story detail
│   │   │       ├── page.tsx     # Story reader
│   │   │       ├── vocab/       # Vocabulary page
│   │   │       └── games/       # Mini games
│   │   ├── videos/              # Video learning
│   │   │   ├── page.tsx         # Video list
│   │   │   └── [id]/            # Video player
│   │   ├── progress/            # User progress
│   │   ├── admin/               # Admin panel
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── stories/         # Story management
│   │   │   │   ├── new/         # Create story
│   │   │   │   └── [id]/        # Edit story
│   │   │   └── videos/          # Video management
│   │   │       ├── new/         # Upload video
│   │   │       └── [id]/        # Edit video
│   │   └── api/                 # API routes
│   │       └── videos/          # Video CRUD
│   ├── components/              # React components
│   │   ├── layout/              # Layout components
│   │   │   ├── Header.tsx       # Main navigation
│   │   │   └── AdminSidebar.tsx # Admin sidebar
│   │   └── video/               # Video components
│   │       ├── VideoUploader.tsx       # TUS upload
│   │       ├── SubtitleEditor.tsx      # Subtitle editor
│   │       └── VideoLearningPlayer.tsx # Video player
│   ├── services/                # External services
  │   ├── bunny.ts            # Bunny.net Stream API
│   │   ├── dictionary.ts       # Dictionary API
│   │   ├── translate.ts        # Translation API
│   │   ├── image.ts            # Image generation
│   │   └── supabase.ts         # Supabase client
│   ├── store/                   # State management
│   │   └── useAppStore.ts      # Zustand store
│   ├── types/                   # TypeScript types
│   │   └── index.ts            # Type definitions
│   └── data/                    # Static data
│       └── stories.ts          # Sample stories
├── supabase/                    # Database
│   └── migrations/              # SQL migrations
│       └── 001_init.sql        # Initial schema
├── .env.local                   # Environment variables
├── next.config.js              # Next.js config
├── tailwind.config.js          # Tailwind config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

---

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Bunny.net Stream account

### 1. Clone Repository
```bash
git clone <repository-url>
cd comic-lingua-kids
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Bunny.net Stream
BUNNY_API_KEY=your_bunny_api_key
BUNNY_LIBRARY_ID=your_library_id
NEXT_PUBLIC_BUNNY_LIBRARY_ID=your_library_id
BUNNY_CDN_HOSTNAME=your_cdn_hostname.b-cdn.net

# Optional: Image Generation
OPENAI_API_KEY=your_openai_key
```

### 4. Database Setup
Run Supabase migration:
```sql
-- Copy content from supabase/migrations/001_init.sql
-- Run in Supabase SQL Editor
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎯 Core Features

### 1. Story Reader
- **Comic-style panels** with images
- **Bilingual text** (English + Vietnamese)
- **Click any word** to see:
  - Vietnamese translation
  - IPA pronunciation
  - Definitions & examples
  - Audio pronunciation
- **Save words** for later review
- Navigate panels with Prev/Next buttons

### 2. Video Learning Platform
- **Netflix-style UI** with featured hero section
- **Category rows** by difficulty level
- **Bunny.net Stream** video hosting
- **Interactive subtitles:**
  - Click any English word in subtitles
  - Get instant definitions & translations
  - Jump to any subtitle timestamp
- **Playback controls:**
  - Speed adjustment (0.5x - 1.5x)
  - Play/Pause controls
  - Subtitle sidebar with click-to-jump

### 3. Vocabulary System
- **Auto-save words** clicked during stories/videos
- **Flashcards** with flip animation
- **Review mode** with audio
- **Progress tracking** per story

### 4. Mini Games
- **Memory Match** - Match English-Vietnamese pairs
- **Quiz Game** - Fill-in-the-blank exercises
- **Immediate feedback** with animations

### 5. Progress Tracking
- Stories completed
- Words learned
- Time spent
- Achievement streaks

### 6. Admin Panel
- **Story Management:**
  - Create/edit/delete stories
  - Upload panel images
  - Add vocabulary with translations
  - Preview before publishing
- **Video Management:**
  - Upload videos to Bunny.net Stream
  - Edit bilingual subtitles (VTT/SRT)
  - Set difficulty levels
  - Manage thumbnails

---

## 🎨 Design System

### Color Palette
- **Primary:** Purple-Pink-Blue gradients
- **Accent:** Yellow for highlights
- **Background:** Pastel gradients (green-yellow-pink)
- **Text:** Dark gray on light backgrounds, white on dark

### Typography
- **Font:** Nunito (Google Fonts)
- **Sizes:** Responsive from text-xs to text-6xl
- **Weight:** 400 (regular), 600 (semibold), 700 (bold), 800 (black)

### Components
- **Rounded corners** (rounded-lg, rounded-full)
- **Soft shadows** (shadow-sm, shadow-md)
- **Smooth transitions** (hover:scale-105)
- **Backdrop blur** effects on overlays
- **Gradient buttons** with hover effects

### Responsive Design
- **Mobile-first** approach
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly** button sizes (min 44px)
- **Readable fonts** for children

---

## 📚 Database Schema

### Tables

#### `stories`
```sql
- id: text (primary key)
- title_en: text
- title_vi: text
- level: text (Beginner, Elementary, Intermediate)
- cover: text (emoji or URL)
- minutes: integer
- topics: text[]
- panels: jsonb[] (panel data)
```

#### `videos`
```sql
- id: uuid (primary key)
- title: text
- title_vi: text
- description: text
- level: text
- bunny_video_id: text
- thumbnail_url: text
- duration: integer
- created_at: timestamp
- updated_at: timestamp
```

#### `video_subtitles`
```sql
- id: uuid (primary key)
- video_id: uuid (foreign key)
- start_time: real
- end_time: real
- text_en: text
- text_vi: text
- created_at: timestamp
```

#### `user_progress` (LocalStorage for MVP)
```typescript
{
  completedStories: string[],
  savedWords: SavedWord[],
  viewedPanels: { [storyId]: number[] },
  stars: number
}
```

---

## 🔌 API Integration

### Dictionary API
**Endpoint:** `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

**Response:**
- Word definitions
- IPA pronunciation
- Audio URLs
- Examples

### Translation API (MyMemory)
**Endpoint:** `https://api.mymemory.translated.net/get`

**Parameters:**
- `q`: text to translate
- `langpair`: en|vi

**Response:**
- Vietnamese translation
- Match quality score

### Bunny.net Stream API
**Base URL:** `https://video.bunnycdn.com/library/{library_id}`

**Operations:**
- Create video
- Get video status
- Delete video
- TUS upload for large files
- HLS/DASH streaming

---

## 🚀 Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Environment Variables on Vercel
1. Go to project settings
2. Add environment variables from `.env.local`
3. Redeploy

### Database Migration
1. Copy SQL from `supabase/migrations/001_init.sql`
2. Run in Supabase SQL Editor
3. Verify tables created

---

## 🧪 Testing

### Manual Testing Checklist

#### Story Reader
- [ ] Click word shows popup
- [ ] Audio pronunciation works
- [ ] Save word persists
- [ ] Navigation works
- [ ] Vietnamese toggle works

#### Video Player
- [ ] Video loads from Bunny.net
- [ ] Subtitles display correctly
- [ ] Click subtitle word shows definition
- [ ] Playback speed changes
- [ ] Jump to subtitle works

#### Admin Panel
- [ ] Create story saves correctly
- [ ] Upload video to Bunny.net
- [ ] Edit subtitles updates
- [ ] Delete operations work

---

## 📈 Performance Optimization

### Implemented
- ✅ Image lazy loading
- ✅ WebP format for images
- ✅ Code splitting with Next.js
- ✅ Server-side rendering for SEO
- ✅ Bunny.net CDN for videos
- ✅ TUS resumable uploads

### Recommended
- [ ] Implement service worker for offline
- [ ] Add image CDN (Cloudinary/imgix)
- [ ] Enable response caching
- [ ] Optimize bundle size
- [ ] Implement virtual scrolling for large lists

---

## 🐛 Troubleshooting

### Common Issues

#### Videos not loading
- Check Bunny.net API Key in `.env.local`
- Verify Library ID is correct
- Check video status in Bunny.net dashboard

#### Dictionary API fails
- API has rate limits (free tier)
- Implement caching for frequent words
- Add fallback to local dictionary

#### Translation slow
- MyMemory API can be slow
- Consider caching translations
- Add loading states

#### TUS upload fails
- Check file size < 5GB
- Verify Bunny.net API key
- Check network connection
- Upload resumes automatically

---

## 🔐 Security

### Best Practices
- ✅ Environment variables for secrets
- ✅ API keys not exposed to client
- ✅ Supabase Row Level Security (RLS)
- ✅ Input sanitization for user content
- ✅ HTTPS only in production

### Recommendations
- [ ] Add authentication (Supabase Auth)
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Content moderation for admin inputs
- [ ] Regular dependency updates

---

## 📱 Browser Support

### Tested Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 8+)

### Required Features
- ES2017 JavaScript
- CSS Grid & Flexbox
- Web Audio API (for TTS)
- Fetch API
- LocalStorage

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test locally
4. Create pull request
5. Review & merge

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier for formatting
- Component-based architecture
- Meaningful variable names

---

## 📄 License

MIT License - Feel free to use for educational purposes

---

## 📞 Support

For issues or questions:
- Check troubleshooting section
- Review error logs in browser console
- Check Supabase logs
- Verify environment variables

---

## 🎯 Roadmap

### v2.1 (Next Release)
- [ ] User authentication
- [ ] Parent dashboard
- [ ] More mini games
- [ ] Offline mode
- [ ] Mobile app (React Native)

### v2.2 (Future)
- [ ] AI-generated stories
- [ ] Voice recognition practice
- [ ] Social features (share progress)
- [ ] Premium content
- [ ] Teacher dashboard

---

## 🐛 Bug Fixes (v2.0)

### Fixed Issues
- ✅ TypeScript compilation errors in VideoUploader
- ✅ Type mismatch in VideoLearningPlayer
- ✅ CSS module import error
- ✅ Null pointer exceptions in word lookup
- ✅ Missing properties in WordInfo interface
- ✅ Drag and drop type conversion issues

### Code Quality
- ✅ All TypeScript errors resolved
- ✅ Type safety improved
- ✅ Error handling enhanced
- ✅ Loading states added
- ✅ Responsive design optimized

---

**Last Updated:** January 15, 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready with All TypeScript Errors Fixed
