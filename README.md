# SaaS CMS Platform

A comprehensive Content Management System built with Node.js and vanilla JavaScript (no TypeScript). Features separate admin and public views like WordPress, plus a customer dashboard for SaaS functionality.

## 🚀 Features

### Core Features
- **Content Management**: Create, edit, and manage pages with rich text editor
- **Role-Based Access Control**: Public, Customer, and Admin access levels
- **User Management**: Complete user registration, authentication, and role management
- **Subscription Management**: Integrated with Lemon Squeezy for payments
- **Blog System**: Full-featured blog with categories and tags
- **SEO Optimized**: Meta descriptions, sitemap generation, and search engine indexing
- **Responsive Design**: Modern UI built with Tailwind CSS

### Admin Features
- **Dashboard**: Comprehensive admin dashboard with analytics
- **Page Management**: Create, edit, delete, and organize pages
- **User Management**: Manage users, roles, and permissions
- **Plan Management**: Create and manage pricing plans
- **Analytics**: Track user engagement and content performance

### Customer Features
- **Customer Dashboard**: Personalized dashboard for subscribers
- **Exclusive Content**: Access to customer-only pages and features
- **Subscription Management**: View and manage subscription details
- **Support System**: Integrated support and help resources

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js with session management
- **Frontend**: EJS templates with Tailwind CSS
- **Payment**: Lemon Squeezy integration
- **Security**: Helmet, CORS, rate limiting, input validation
- **Content**: HTML sanitization with DOMPurify

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Quick Start

**Start everything with one command:**

```bash
npm run cms
```

This single command will:
- ✅ Install dependencies (if needed)
- ✅ Setup the database
- ✅ Start the backend server
- ✅ Open the frontend in your browser

## 🔑 Default Admin Access

- **Email:** `admin@example.com`
- **Password:** `admin123`

## 📍 Access URLs

After running `npm run cms`, you can access:

- **Frontend Home:** `file:///.../frontend/index.html`
- **Admin Panel:** `file:///.../frontend/admin/login.html`
- **Customer Portal:** `file:///.../frontend/customer/login.html`
- **Backend API:** `http://localhost:3000`

## 🎯 Features

### Admin Panel
- 📊 **Dashboard** - Overview with stats and quick actions
- 📄 **Pages Management** - Create/edit pages with HTML editor
- 📝 **Blog System** - Full blog management with posts, tags, categories
- 👥 **User Management** - Add/edit users with role-based access
- 📈 **Analytics** - Real-time metrics and performance tracking
- 🖼️ **Media Library** - File upload and management
- ⚙️ **Settings** - System configuration

### Public Site
- 🌐 **Dynamic Pages** - Renders admin-created content
- 📖 **Blog** - Public blog with search and categories
- 📱 **Responsive** - Mobile-friendly design
- 🔍 **SEO Optimized** - Proper meta tags and structure

### Customer Portal
- 👤 **Registration/Login** - Customer account system
- 📊 **Dashboard** - Subscription and account management
- 💳 **Billing** - Subscription and payment tracking
- ⚙️ **Profile** - Account settings and preferences

## 🛠️ Manual Setup (Alternative)

If you prefer to run commands separately:

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev --name init

# Start backend server
npm run dev

# Open frontend/index.html in your browser
```

## 📁 Project Structure

```
├── index.js                 # Backend server
├── start.js                 # Single-command startup script
├── package.json
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/
└── frontend/
    ├── index.html           # Main entry point
    ├── admin/               # Admin panel
    │   ├── login.html
    │   ├── dashboard.html
    │   ├── pages.html
    │   ├── blog.html
    │   ├── users.html
    │   └── analytics.html
    ├── public/              # Public website
    │   ├── index.html
    │   ├── page.html
    │   └── blog/
    ├── customer/            # Customer portal
    │   ├── login.html
    │   ├── register.html
    │   └── dashboard.html
    └── shared/              # Common assets
        ├── css/common.css
        └── js/api.js
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@saascms.com"
FRONTEND_URL="http://localhost:3001"
REDIS_URL="redis://localhost:6379"
```

## 🔧 Available Scripts

- `npm run cms` - **🚀 Start everything (recommended)**
- `npm start` - Start production server only
- `npm run dev` - Start development server with nodemon
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio

## 🗄️ Database Schema

### Core Models

- **User**: User accounts with roles (USER, CUSTOMER, ADMIN)
- **Page**: Content pages with types (PUBLIC, CUSTOMER)
- **Plan**: Pricing plans with features
- **Subscription**: User subscriptions linked to plans
- **BlogPost**: Blog articles with author relationships
- **Analytics**: Page view tracking and analytics

## 🔐 Security Features

- **Input Validation**: Express-validator for all form inputs
- **HTML Sanitization**: DOMPurify for XSS protection
- **Rate Limiting**: Express rate limiting for API endpoints
- **Helmet**: Security headers and CSP
- **CORS**: Cross-origin resource sharing configuration
- **Session Security**: Secure session configuration
- **Password Hashing**: bcrypt for password security

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Interface**: Clean, professional design
- **Interactive Elements**: Hover effects, transitions, and animations
- **Accessibility**: Semantic HTML and ARIA labels
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages

## 📱 Pages and Routes

### Public Pages
- `/` - Homepage
- `/pricing` - Pricing plans
- `/blog` - Blog listing
- `/page/:slug` - Dynamic page content
- `/login` - User login
- `/register` - User registration

### Customer Pages
- `/dashboard` - Customer dashboard
- `/page/:slug` - Customer-exclusive content

### Admin Pages
- `/admin` - Admin dashboard
- `/admin/pages` - Page management
- `/admin/pages/new` - Create new page
- `/admin/pages/:id/edit` - Edit page
- `/admin/users` - User management
- `/admin/plans` - Plan management
- `/admin/plans/new` - Create new plan

### API Endpoints
- `/api/pages/public` - Get public pages
- `/api/customer/dashboard` - Customer dashboard data
- `/api/admin/*` - Admin API endpoints
- `/auth/*` - Authentication endpoints

## 🔌 Integrations

### Lemon Squeezy
- Payment processing for subscriptions
- Webhook handling for subscription events
- Checkout URL integration

### Future Integrations
- Email service (SendGrid, Mailgun)
- Analytics (Google Analytics, Mixpanel)
- CDN (Cloudflare, AWS CloudFront)
- File storage (AWS S3, Cloudinary)

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="strong-secret-key"
NODE_ENV="production"
BASE_URL="https://yourdomain.com"
```

### Database Migration
```bash
npm run db:migrate
```

### Process Management
Use PM2 or similar process manager:

```bash
npm install -g pm2
pm2 start index.js --name "saas-cms"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates and Maintenance

- Regular security updates
- Feature enhancements
- Performance optimizations
- Bug fixes and improvements

---

Built with ❤️ for modern SaaS applications 