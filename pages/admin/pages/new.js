import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewEnhancedPage() {
  const [mode, setMode] = useState('ai'); // 'visual', 'ai', 'code'
  const [currentView, setCurrentView] = useState('split'); // 'preview', 'code', 'split'
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [generationPlan, setGenerationPlan] = useState(null);

  const [pageData, setPageData] = useState({
    title: '',
    slug: '',
    meta_description: '',
    html_content: '',
    css_content: '',
    js_content: '',
    is_published: true,
    access_level: 'public'
  });

  // Visual Builder State
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedPageSlug, setSavedPageSlug] = useState(null);
  const router = useRouter();

  const previewRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Component Templates
  const componentTemplates = {
    hero: {
      name: 'Hero Section',
      icon: '🎯',
      html: `<section class="hero-section">
  <div class="container">
    <h1>Your Amazing Headline</h1>
    <p class="subtitle">Your compelling subtitle goes here</p>
    <button class="cta-button">Get Started</button>
  </div>
</section>`,
      css: `.hero-section {
  padding: 100px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.hero-section h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: bold;
}
.hero-section .subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}
.cta-button {
  background: white;
  color: #667eea;
  padding: 15px 40px;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.cta-button:hover {
  transform: scale(1.05);
}`
    },
    features: {
      name: 'Features Grid',
      icon: '✨',
      html: `<section class="features-section">
  <div class="container">
    <h2>Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>Fast</h3>
        <p>Lightning fast performance</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Beautiful</h3>
        <p>Stunning design out of the box</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure</h3>
        <p>Enterprise-grade security</p>
      </div>
    </div>
  </div>
</section>`,
      css: `.features-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.features-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}
.feature-card:hover {
  transform: translateY(-5px);
}
.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.feature-card p {
  color: #666;
}`
    },
    pricing: {
      name: 'Pricing Cards',
      icon: '💰',
      html: `<section class="pricing-section">
  <div class="container">
    <h2>Pricing Plans</h2>
    <div class="pricing-grid">
      <div class="pricing-card">
        <h3>Starter</h3>
        <div class="price">$9<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Feature 1</li>
          <li>✓ Feature 2</li>
          <li>✓ Feature 3</li>
        </ul>
        <button class="plan-button">Get Started</button>
      </div>
      <div class="pricing-card featured">
        <div class="badge">Popular</div>
        <h3>Pro</h3>
        <div class="price">$29<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Everything in Starter</li>
          <li>✓ Advanced Feature 1</li>
          <li>✓ Advanced Feature 2</li>
        </ul>
        <button class="plan-button">Get Started</button>
      </div>
      <div class="pricing-card">
        <h3>Enterprise</h3>
        <div class="price">$99<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Everything in Pro</li>
          <li>✓ Premium Feature 1</li>
          <li>✓ Premium Feature 2</li>
        </ul>
        <button class="plan-button">Contact Sales</button>
      </div>
    </div>
  </div>
</section>`,
      css: `.pricing-section {
  padding: 80px 20px;
}
.pricing-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.pricing-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
  text-align: center;
  position: relative;
  transition: all 0.3s;
}
.pricing-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.pricing-card.featured {
  border-color: #667eea;
  transform: scale(1.05);
}
.badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #667eea;
  color: white;
  padding: 5px 20px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}
.pricing-card h3 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}
.price {
  font-size: 3rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 1.5rem;
}
.price span {
  font-size: 1.25rem;
  color: #666;
}
.features-list {
  list-style: none;
  padding: 0;
  margin: 2rem 0;
  text-align: left;
}
.features-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}
.plan-button {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.plan-button:hover {
  background: #5568d3;
}`
    },
    contact: {
      name: 'Contact Form',
      icon: '📧',
      html: `<section class="contact-section">
  <div class="container">
    <h2>Get In Touch</h2>
    <form class="contact-form" onsubmit="return false;">
      <div class="form-row">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
      </div>
      <textarea placeholder="Your Message" rows="5" required></textarea>
      <button type="submit" class="submit-button">Send Message</button>
    </form>
  </div>
</section>`,
      css: `.contact-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.contact-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.contact-form {
  max-width: 600px;
  margin: 0 auto;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}
.contact-form input:focus,
.contact-form textarea:focus {
  outline: none;
  border-color: #667eea;
}
.submit-button {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 15px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.submit-button:hover {
  background: #5568d3;
}`
    },
    testimonials: {
      name: 'Testimonials',
      icon: '⭐',
      html: `<section class="testimonials-section">
  <div class="container">
    <h2>What Our Customers Say</h2>
    <div class="testimonials-grid">
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"This product changed my life! Highly recommend to everyone."</p>
        <div class="author">
          <strong>John Doe</strong>
          <span>CEO, Company Inc</span>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"Amazing service and support. Worth every penny!"</p>
        <div class="author">
          <strong>Jane Smith</strong>
          <span>Founder, Startup Co</span>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"Best decision we made for our business this year."</p>
        <div class="author">
          <strong>Mike Johnson</strong>
          <span>CTO, Tech Corp</span>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.testimonials-section {
  padding: 80px 20px;
}
.testimonials-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.testimonial-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.stars {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}
.quote {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  color: #333;
  font-style: italic;
}
.author {
  display: flex;
  flex-direction: column;
}
.author strong {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}
.author span {
  color: #666;
  font-size: 0.9rem;
}`
    },
    footer: {
      name: 'Footer',
      icon: '🔽',
      html: `<footer class="footer-section">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="#">About</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <ul>
          <li><a href="#">Features</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Documentation</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Security</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</footer>`,
      css: `.footer-section {
  background: #1a1a1a;
  color: white;
  padding: 60px 20px 20px;
}
.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto 2rem;
}
.footer-col h4 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}
.footer-col ul {
  list-style: none;
  padding: 0;
}
.footer-col li {
  margin-bottom: 0.75rem;
}
.footer-col a {
  color: #999;
  text-decoration: none;
  transition: color 0.2s;
}
.footer-col a:hover {
  color: white;
}
.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #333;
  color: #999;
}`
    },
    navbar: {
      name: 'Navigation Bar',
      icon: '🧭',
      html: `<nav class="navbar">
  <div class="nav-container">
    <div class="nav-logo">Brand</div>
    <ul class="nav-menu">
      <li><a href="#home">Home</a></li>
      <li><a href="#features">Features</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
    <button class="nav-cta">Get Started</button>
  </div>
</nav>`,
      css: `.navbar {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
  z-index: 1000;
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.nav-logo {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
  margin: 0;
  padding: 0;
}
.nav-menu a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.2s;
}
.nav-menu a:hover {
  color: #667eea;
}
.nav-cta {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 10px 24px;
  border: none;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.nav-cta:hover {
  transform: scale(1.05);
}`
    },
    stats: {
      name: 'Stats Counter',
      icon: '📊',
      html: `<section class="stats-section">
  <div class="container">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">10M+</div>
        <div class="stat-label">Active Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">50K+</div>
        <div class="stat-label">Companies</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">99.9%</div>
        <div class="stat-label">Uptime</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">24/7</div>
        <div class="stat-label">Support</div>
      </div>
    </div>
  </div>
</section>`,
      css: `.stats-section {
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
}
.stat-card {
  text-align: center;
}
.stat-number {
  font-size: 3.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  background: rgba(255,255,255,0.2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(255,255,255,0.5);
}
.stat-label {
  font-size: 1.1rem;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}`
    },
    cta: {
      name: 'Call to Action',
      icon: '🎯',
      html: `<section class="cta-section">
  <div class="cta-container">
    <h2>Ready to Get Started?</h2>
    <p>Join thousands of satisfied customers today</p>
    <div class="cta-buttons">
      <button class="btn-primary">Start Free Trial</button>
      <button class="btn-secondary">Schedule Demo</button>
    </div>
  </div>
</section>`,
      css: `.cta-section {
  padding: 100px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}
.cta-section::before {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  top: -250px;
  right: -250px;
}
.cta-container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  color: white;
  position: relative;
  z-index: 1;
}
.cta-container h2 {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.cta-container p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}
.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-primary, .btn-secondary {
  padding: 15px 40px;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-primary {
  background: white;
  color: #667eea;
}
.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}
.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}
.btn-secondary:hover {
  background: white;
  color: #667eea;
}`
    },
    timeline: {
      name: 'Timeline',
      icon: '📅',
      html: `<section class="timeline-section">
  <div class="container">
    <h2>Our Journey</h2>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3>2020 - Founded</h3>
          <p>Started with a vision to revolutionize the industry</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3>2021 - First Product</h3>
          <p>Launched our flagship product to great success</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3>2023 - Global Expansion</h3>
          <p>Expanded operations to 50+ countries worldwide</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3>2024 - Market Leader</h3>
          <p>Became the #1 choice in our category</p>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.timeline-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.timeline-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 4rem;
}
.timeline {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  padding-left: 40px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #667eea, #764ba2);
}
.timeline-item {
  position: relative;
  margin-bottom: 3rem;
}
.timeline-dot {
  position: absolute;
  left: -31px;
  top: 8px;
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 0 4px #667eea;
}
.timeline-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  margin-left: 20px;
}
.timeline-content h3 {
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}
.timeline-content p {
  color: #666;
  line-height: 1.6;
}`
    },
    team: {
      name: 'Team Grid',
      icon: '👥',
      html: `<section class="team-section">
  <div class="container">
    <h2>Meet Our Team</h2>
    <div class="team-grid">
      <div class="team-member">
        <div class="member-image">👨‍💼</div>
        <h3>John Doe</h3>
        <p class="role">CEO & Founder</p>
        <div class="social-links">
          <a href="#">💼</a>
          <a href="#">🐦</a>
          <a href="#">📧</a>
        </div>
      </div>
      <div class="team-member">
        <div class="member-image">👩‍💼</div>
        <h3>Jane Smith</h3>
        <p class="role">CTO</p>
        <div class="social-links">
          <a href="#">💼</a>
          <a href="#">🐦</a>
          <a href="#">📧</a>
        </div>
      </div>
      <div class="team-member">
        <div class="member-image">👨‍💻</div>
        <h3>Mike Johnson</h3>
        <p class="role">Lead Developer</p>
        <div class="social-links">
          <a href="#">💼</a>
          <a href="#">🐦</a>
          <a href="#">📧</a>
        </div>
      </div>
      <div class="team-member">
        <div class="member-image">👩‍🎨</div>
        <h3>Sarah Williams</h3>
        <p class="role">Design Lead</p>
        <div class="social-links">
          <a href="#">💼</a>
          <a href="#">🐦</a>
          <a href="#">📧</a>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.team-section {
  padding: 80px 20px;
}
.team-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
.team-member {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}
.team-member:hover {
  transform: translateY(-10px);
}
.member-image {
  font-size: 5rem;
  margin-bottom: 1rem;
  filter: grayscale(20%);
}
.team-member h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.role {
  color: #667eea;
  font-weight: 600;
  margin-bottom: 1rem;
}
.social-links {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.social-links a {
  font-size: 1.5rem;
  text-decoration: none;
  transition: transform 0.2s;
}
.social-links a:hover {
  transform: scale(1.2);
}`
    },
    faq: {
      name: 'FAQ Accordion',
      icon: '❓',
      html: `<section class="faq-section">
  <div class="container">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-list">
      <div class="faq-item">
        <div class="faq-question">How do I get started?</div>
        <div class="faq-answer">Simply sign up for a free account and follow our quick onboarding guide. You'll be up and running in minutes!</div>
      </div>
      <div class="faq-item">
        <div class="faq-question">What payment methods do you accept?</div>
        <div class="faq-answer">We accept all major credit cards, PayPal, and bank transfers for enterprise customers.</div>
      </div>
      <div class="faq-item">
        <div class="faq-question">Is there a free trial?</div>
        <div class="faq-answer">Yes! We offer a 14-day free trial with full access to all features. No credit card required.</div>
      </div>
      <div class="faq-item">
        <div class="faq-question">Can I cancel anytime?</div>
        <div class="faq-answer">Absolutely. You can cancel your subscription at any time with no cancellation fees.</div>
      </div>
    </div>
  </div>
</section>`,
      css: `.faq-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.faq-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.faq-list {
  max-width: 800px;
  margin: 0 auto;
}
.faq-item {
  background: white;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.faq-question {
  padding: 1.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.faq-question:hover {
  background: #f8f9fa;
}
.faq-question::after {
  content: '+';
  position: absolute;
  right: 1.5rem;
  font-size: 1.5rem;
  color: #667eea;
}
.faq-answer {
  padding: 0 1.5rem 1.5rem;
  color: #666;
  line-height: 1.6;
}`
    },
    newsletter: {
      name: 'Newsletter Signup',
      icon: '📬',
      html: `<section class="newsletter-section">
  <div class="newsletter-container">
    <h2>Stay Updated</h2>
    <p>Subscribe to our newsletter for the latest updates and exclusive offers</p>
    <form class="newsletter-form">
      <input type="email" placeholder="Enter your email" required>
      <button type="submit">Subscribe</button>
    </form>
    <p class="newsletter-disclaimer">We respect your privacy. Unsubscribe at any time.</p>
  </div>
</section>`,
      css: `.newsletter-section {
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.newsletter-container {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}
.newsletter-container h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.newsletter-container > p {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}
.newsletter-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.newsletter-form input {
  flex: 1;
  padding: 15px 20px;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
}
.newsletter-form input:focus {
  outline: none;
}
.newsletter-form button {
  padding: 15px 30px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: 2px solid white;
  border-radius: 50px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.newsletter-form button:hover {
  background: white;
  color: #667eea;
}
.newsletter-disclaimer {
  font-size: 0.875rem;
  opacity: 0.7;
}`
    },
    gallery: {
      name: 'Image Gallery',
      icon: '🖼️',
      html: `<section class="gallery-section">
  <div class="container">
    <h2>Gallery</h2>
    <div class="gallery-grid">
      <div class="gallery-item">
        <div class="gallery-placeholder">🏞️</div>
        <div class="gallery-overlay">
          <h3>Project Title 1</h3>
          <p>Description</p>
        </div>
      </div>
      <div class="gallery-item">
        <div class="gallery-placeholder">🌄</div>
        <div class="gallery-overlay">
          <h3>Project Title 2</h3>
          <p>Description</p>
        </div>
      </div>
      <div class="gallery-item">
        <div class="gallery-placeholder">🌅</div>
        <div class="gallery-overlay">
          <h3>Project Title 3</h3>
          <p>Description</p>
        </div>
      </div>
      <div class="gallery-item">
        <div class="gallery-placeholder">🌇</div>
        <div class="gallery-overlay">
          <h3>Project Title 4</h3>
          <p>Description</p>
        </div>
      </div>
      <div class="gallery-item">
        <div class="gallery-placeholder">🌆</div>
        <div class="gallery-overlay">
          <h3>Project Title 5</h3>
          <p>Description</p>
        </div>
      </div>
      <div class="gallery-item">
        <div class="gallery-placeholder">🏙️</div>
        <div class="gallery-overlay">
          <h3>Project Title 6</h3>
          <p>Description</p>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.gallery-section {
  padding: 80px 20px;
}
.gallery-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
.gallery-item {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
}
.gallery-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.gallery-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
  padding: 2rem;
}
.gallery-item:hover .gallery-overlay {
  opacity: 1;
}
.gallery-overlay h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.gallery-overlay p {
  opacity: 0.9;
}`
    },
    blog: {
      name: 'Blog Cards',
      icon: '📝',
      html: `<section class="blog-section">
  <div class="container">
    <h2>Latest Articles</h2>
    <div class="blog-grid">
      <article class="blog-card">
        <div class="blog-image">📰</div>
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date">May 15, 2024</span>
            <span class="blog-category">Technology</span>
          </div>
          <h3>10 Tips for Better Web Design</h3>
          <p>Discover essential techniques to create stunning websites that convert visitors into customers.</p>
          <a href="#" class="blog-link">Read More →</a>
        </div>
      </article>
      <article class="blog-card">
        <div class="blog-image">🚀</div>
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date">May 12, 2024</span>
            <span class="blog-category">Marketing</span>
          </div>
          <h3>Growing Your Business Online</h3>
          <p>Learn proven strategies to scale your online presence and reach more customers effectively.</p>
          <a href="#" class="blog-link">Read More →</a>
        </div>
      </article>
      <article class="blog-card">
        <div class="blog-image">💡</div>
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date">May 10, 2024</span>
            <span class="blog-category">Innovation</span>
          </div>
          <h3>The Future of Digital Products</h3>
          <p>Explore upcoming trends and innovations shaping the future of digital product development.</p>
          <a href="#" class="blog-link">Read More →</a>
        </div>
      </article>
    </div>
  </div>
</section>`,
      css: `.blog-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.blog-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.blog-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}
.blog-card:hover {
  transform: translateY(-10px);
}
.blog-image {
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
}
.blog-content {
  padding: 1.5rem;
}
.blog-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}
.blog-date {
  color: #999;
}
.blog-category {
  color: #667eea;
  font-weight: 600;
}
.blog-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: #333;
}
.blog-card p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}
.blog-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}
.blog-link:hover {
  color: #5568d3;
}`
    },
    glassmorphism: {
      name: 'Glassmorphism Card',
      icon: '💎',
      html: `<section class="glass-section">
  <div class="glass-container">
    <div class="glass-card">
      <h2>Glassmorphism Design</h2>
      <p>Experience the modern frosted glass aesthetic with backdrop filters and transparency effects.</p>
      <button class="glass-btn">Explore More</button>
    </div>
  </div>
</section>`,
      css: `.glass-section {
  padding: 100px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}
.glass-section::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  top: -100px;
  right: 10%;
  animation: float 6s ease-in-out infinite;
}
.glass-section::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  bottom: -50px;
  left: 15%;
  animation: float 8s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(20px); }
}
.glass-container {
  max-width: 600px;
  margin: 0 auto;
}
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
  color: white;
}
.glass-card h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.glass-card p {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  line-height: 1.6;
}
.glass-btn {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 15px 40px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.glass-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}`
    }
  };

  const addSection = (templateKey) => {
    const template = componentTemplates[templateKey];
    const newSection = {
      id: Date.now(),
      type: templateKey,
      name: template.name,
      html: template.html,
      css: template.css,
      js: ''
    };
    setSections(prev => [...prev, newSection]);
    updatePageData([...sections, newSection]);
  };

  const removeSection = (id) => {
    const updatedSections = sections.filter(s => s.id !== id);
    setSections(updatedSections);
    updatePageData(updatedSections);
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index-1], newSections[index]] = [newSections[index], newSections[index-1]];
    setSections(newSections);
    updatePageData(newSections);
  };

  const moveSectionDown = (index) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index+1]] = [newSections[index+1], newSections[index]];
    setSections(newSections);
    updatePageData(newSections);
  };

  const updatePageData = (currentSections) => {
    const html = currentSections.map(s => s.html).join('\n\n');
    const css = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

${currentSections.map(s => s.css).join('\n\n')}
`;
    const js = currentSections.map(s => s.js).filter(Boolean).join('\n\n');

    setPageData(prev => ({
      ...prev,
      html_content: html,
      css_content: css,
      js_content: js
    }));
    setPreviewKey(p => p + 1);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload-layout-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadedImage(data);

        // Auto-analyze the image
        setIsAnalyzingImage(true);
        const analysisResponse = await fetch('/api/ai/analyze-layout-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagePath: data.path,
            userPrompt: currentPrompt
          })
        });

        const analysisData = await analysisResponse.json();
        if (analysisData.success) {
          setImageAnalysis(analysisData.analysis);

          const analysisMessage = {
            id: Date.now(),
            type: 'system',
            content: `📷 Image analyzed successfully! I can see the layout structure. Ready to generate based on this design.`,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, analysisMessage]);
        }
        setIsAnalyzingImage(false);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setError('Failed to upload or analyze image');
      setIsAnalyzingImage(false);
    }
  };

  const generateWithAI = async (prompt, isModification = false) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // Use the comprehensive AI generation endpoint
      const response = await fetch('/api/ai/generate-comprehensive-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: prompt,
          layoutAnalysis: imageAnalysis,
          imagePath: uploadedImage?.path,
          iteration_type: isModification ? 'modify' : 'new',
          context: isModification ? {
            html: pageData.html_content,
            css: pageData.css_content,
            js: pageData.js_content
          } : null
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show the AI's plan
        if (data.plan) {
          setGenerationPlan(data.plan);
          const planMessage = {
            id: Date.now() + 1,
            type: 'plan',
            content: `🧠 My Plan:\n\n${data.plan}`,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, planMessage]);
        }

        setPageData(prev => ({
          ...prev,
          html_content: data.html_code || '',
          css_content: data.css_code || '',
          js_content: data.js_code || ''
        }));
        setPreviewKey(prev => prev + 1);

        const aiMessage = {
          id: Date.now() + 2,
          type: 'ai',
          content: data.message || '✅ Page generated successfully with comprehensive planning!',
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, aiMessage]);

        if (!isModification && !pageData.title) {
          const titleMatch = data.html_code?.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          const extractedTitle = titleMatch?.[1] || prompt.slice(0, 50);

          setPageData(prev => ({
            ...prev,
            title: extractedTitle,
            slug: generateSlug(extractedTitle)
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to generate page');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setError(error.message);

      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: '❌ Failed to generate page: ' + error.message,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setCurrentPrompt('');
    }
  };

  const handleAISubmit = (e) => {
    e.preventDefault();
    if (currentPrompt.trim() && !isGenerating) {
      const isModification = chatHistory.length > 0 && (pageData.html_content || pageData.css_content);
      generateWithAI(currentPrompt, isModification);
    }
  };

  const savePage = async () => {
    if (!pageData.title || !pageData.html_content) {
      setError('Please add a title and content before saving');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedPageSlug(pageData.slug || generateSlug(pageData.title));

        // Show success message and give user option to view or continue editing
        const successMessage = {
          id: Date.now(),
          type: 'system',
          content: `✅ Page saved successfully! You can now view it live or continue editing.`,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, successMessage]);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const getPreviewContent = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageData.title || 'Preview'}</title>
  <style>${pageData.css_content}</style>
</head>
<body>
  ${pageData.html_content}
  <script>${pageData.js_content}</script>
</body>
</html>`;
  };

  return (
    <AdminLayout title="Create Enhanced Page">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Create New Page</h1>
            <p className="text-slate-400 mt-1">🚀 Build complete, professional pages with Comprehensive AI (upload layouts, describe your vision), Visual Builder, or Custom Code</p>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setMode('visual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'visual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🎨 Visual
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'ai' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🤖 AI
            </button>
            <button
              onClick={() => setMode('code')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'code' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              💻 Code
            </button>
          </div>
        </div>

        {/* Visual Builder Mode */}
        {mode === 'visual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Components Library */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Components</h3>
              <div className="space-y-2">
                {Object.entries(componentTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => addSection(key)}
                    className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors flex items-center space-x-3"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-slate-200 font-medium">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sections List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Sections</h3>
              {sections.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm">No sections yet. Add components from the left.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div key={section.id} className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium">{section.name}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => moveSectionUp(index)}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSectionDown(index)}
                            disabled={index === sections.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeSection(section.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">Preview</h3>
              </div>
              <div className="h-[600px] bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">👀</div>
                      <p>Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* AI Chat */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">🤖 Comprehensive AI Assistant</h3>
                <p className="text-sm text-slate-400 mt-1">Upload a layout image or describe your page - I'll create a complete, professional page with all sections, animations, and styling</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎨✨</div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">Ready to create something amazing!</h3>
                    <p className="text-slate-400 text-sm mb-4">I can:</p>
                    <ul className="text-slate-400 text-sm space-y-2 text-left max-w-md mx-auto">
                      <li>📷 Analyze layout images and recreate the design</li>
                      <li>🎯 Generate complete pages with all needed sections</li>
                      <li>🎨 Create beautiful themes, colors, and animations</li>
                      <li>✨ Add professional typography and spacing</li>
                      <li>🚀 Build responsive, modern designs</li>
                    </ul>

                    {/* Image Upload Section */}
                    <div className="mt-6 p-6 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
                      <input
                        type="file"
                        id="layoutImage"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isAnalyzingImage}
                      />
                      <label
                        htmlFor="layoutImage"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="text-5xl mb-3">📸</div>
                        <div className="text-slate-200 font-medium mb-1">Upload Layout Image (Optional)</div>
                        <div className="text-slate-400 text-xs">Click to upload a screenshot or design</div>
                      </label>
                    </div>
                  </div>
                )}

                {uploadedImage && (
                  <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                    <div className="flex items-center space-x-3">
                      <img
                        src={uploadedImage.url}
                        alt="Uploaded layout"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-slate-200 font-medium">Layout Reference</p>
                        <p className="text-xs text-slate-400">{uploadedImage.filename}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedImage(null);
                          setImageAnalysis(null);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {chatHistory.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-emerald-600 text-white'
                        : message.type === 'error'
                        ? 'bg-red-900/20 border border-red-600/30 text-red-300'
                        : message.type === 'plan'
                        ? 'bg-purple-900/20 border border-purple-600/30 text-purple-200'
                        : message.type === 'system'
                        ? 'bg-blue-900/20 border border-blue-600/30 text-blue-200'
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isAnalyzingImage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-blue-900/20 border border-blue-600/30 text-blue-200 rounded-lg px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span className="text-sm">Analyzing layout image...</span>
                      </div>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-slate-700 text-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                        <span className="text-sm">🧠 Planning and building your comprehensive page...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-slate-700 p-4">
                {/* Image Upload Button */}
                {chatHistory.length > 0 && !uploadedImage && (
                  <div className="mb-3">
                    <input
                      type="file"
                      id="layoutImageChat"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isAnalyzingImage}
                    />
                    <label
                      htmlFor="layoutImageChat"
                      className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 text-sm transition-colors"
                    >
                      <span>📷</span>
                      <span>Upload Layout Image</span>
                    </label>
                  </div>
                )}

                <form onSubmit={handleAISubmit} className="flex space-x-3">
                  <input
                    type="text"
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    placeholder="Describe your page in detail..."
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isGenerating || isAnalyzingImage}
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || isAnalyzingImage || !currentPrompt.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? '⏳' : '🚀'}
                  </button>
                </form>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">👁️ Live Preview</h3>
              </div>
              <div className="flex-1 bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <p>Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Code Mode */}
        {mode === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Code Editors */}
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">HTML</h4>
                </div>
                <textarea
                  value={pageData.html_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, html_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter HTML here..."
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">CSS</h4>
                </div>
                <textarea
                  value={pageData.css_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, css_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter CSS here..."
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">JavaScript</h4>
                </div>
                <textarea
                  value={pageData.js_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, js_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter JavaScript here..."
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">👁️ Preview</h3>
              </div>
              <div className="h-[800px] bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <p>Start coding to see preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Settings & Actions */}
        <div className="mt-6 space-y-4">
          {(pageData.html_content || sections.length > 0) && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Page Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageData.title}
                    onChange={(e) => setPageData(prev => ({
                      ...prev,
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter page title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={pageData.slug}
                    onChange={(e) => setPageData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="page-url-slug"
                  />
                  <p className="text-sm text-slate-400 mt-1">/{pageData.slug}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={pageData.meta_description}
                    onChange={(e) => setPageData(prev => ({ ...prev, meta_description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                    placeholder="SEO description"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={pageData.is_published}
                      onChange={(e) => setPageData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-300">Publish immediately</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Access Level</label>
                  <select
                    value={pageData.access_level}
                    onChange={(e) => setPageData(prev => ({ ...prev, access_level: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="public">Public</option>
                    <option value="subscriber">Subscriber Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            {(pageData.html_content || sections.length > 0) && (
              <button
                onClick={savePage}
                disabled={saving || !pageData.title}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save Page'}
              </button>
            )}

            {savedPageSlug && (
              <a
                href={`/${savedPageSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                🌐 View Page
              </a>
            )}

            <button
              onClick={() => router.push('/admin/pages')}
              className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
