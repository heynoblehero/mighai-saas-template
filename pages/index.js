import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { injectPageFunctionality } from '../utils/reserved-page-injector';

export async function getServerSideProps() {
  // Check if there's a customized version of the landing page
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'landing-page.json');

    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);

      // Only serve customized version if it's been deployed
      if (reservedPage.html_code && reservedPage.deployed) {
        // Apply JavaScript injection for functionality
        const enhancedHtml = injectPageFunctionality(reservedPage.html_code, 'landing-page');

        // Serve the customized HTML with injected functionality
        return {
          props: {
            useCustomPage: true,
            customHtml: enhancedHtml
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized landing page:', error);
  }

  // Use default React component
  return {
    props: {
      useCustomPage: false
    }
  };
}

export default function Home({ useCustomPage, customHtml }) {
  // If we have a custom HTML version, render it directly
  if (useCustomPage && customHtml) {
    return (
      <div dangerouslySetInnerHTML={{ __html: customHtml }} />
    );
  }
  const [mounted, setMounted] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  // Only run on client side to prevent hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Auto-rotate features
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: "🚀",
      title: "Launch Your SaaS in Minutes",
      description: "Complete platform with backend design system, payments, and user management"
    },
    {
      icon: "⚡",
      title: "Lightning Fast Performance",
      description: "Optimized backend with real-time processing and analytics"
    },
    {
      icon: "💰",
      title: "Monetize Immediately",
      description: "Built-in subscription management and payment processing"
    }
  ];

  const stats = [
    { label: "SaaS Platforms", value: "50+", suffix: "launched" },
    { label: "API Calls", value: "1M+", suffix: "processed" },
    { label: "Revenue Generated", value: "$100K+", suffix: "for customers" },
    { label: "Uptime", value: "99.9%", suffix: "reliability" }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Founder, DataFlow AI",
      content: "Launched my AI SaaS in just 2 days. The platform handles everything - payments, user management, API processing. Incredible!",
      avatar: "👨‍💻"
    },
    {
      name: "Sarah Johnson",
      role: "CEO, QuickAnalytics",
      content: "From idea to $10K MRR in 3 months. This platform made it possible with zero technical headaches.",
      avatar: "👩‍💼"
    },
    {
      name: "Mike Rodriguez",
      role: "Solo Entrepreneur",
      content: "Finally, a SaaS platform that doesn't require a development team. Pure magic for indie hackers!",
      avatar: "🧑‍🚀"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "",
      features: ["5,000 API calls/month", "Basic analytics", "Email support", "1 SaaS project"],
      cta: "Start Free",
      popular: false,
      color: "from-gray-500 to-gray-600"
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      features: ["50,000 API calls/month", "Advanced analytics", "Priority support", "5 SaaS projects", "Custom branding"],
      cta: "Start Pro Trial",
      popular: true,
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      features: ["Unlimited API calls", "White-label solution", "24/7 phone support", "Unlimited projects", "Custom integrations"],
      cta: "Contact Sales",
      popular: false,
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🚀</div>
              <span className="text-xl font-bold text-gradient-primary">SaaS Builder</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="/blog" className="text-gray-700 hover:text-blue-600 transition-colors">Blog</a>
              <a href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
              <Link href="/login" className="btn btn-secondary">
                Login
              </Link>
              <Link href="/admin/login" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 pb-32">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Launch Your
              <span className="text-gradient-primary block">SaaS Platform</span>
              <span className="text-4xl md:text-6xl">in Minutes ⚡</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Complete SaaS infrastructure with backend design system, payment processing, 
              user management, and analytics. <strong>No coding required.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/admin/login" className="btn btn-primary btn-lg hover-glow">
                🚀 Start Building Now
              </Link>
              <Link href="#demo" className="btn btn-secondary btn-lg">
                👀 View Demo
              </Link>
            </div>

            {/* Trust Indicators */}
            <div>
              <p className="text-sm text-gray-500 mb-6">Trusted by 50+ successful SaaS founders</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                <div className="text-2xl">🏢 TechCorp</div>
                <div className="text-2xl">💼 StartupXYZ</div>
                <div className="text-2xl">🚀 InnovateLab</div>
                <div className="text-2xl">💡 IdeaFlow</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rotating Features */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div key={currentFeature} className="animate-fade-in">
                <div className="text-6xl mb-4">{features[currentFeature].icon}</div>
                <h3 className="text-3xl font-bold mb-4">{features[currentFeature].title}</h3>
                <p className="text-xl text-blue-100">{features[currentFeature].description}</p>
              </div>
              
              {/* Feature Dots */}
              <div className="flex justify-center space-x-2 mt-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentFeature === index ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-gradient-primary mb-2">{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
                <div className="text-sm text-gray-500">{stat.suffix}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Launch</h2>
            <p className="text-xl text-gray-600">Complete SaaS infrastructure out of the box</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "🔗", title: "Backend Design System", description: "Dual-mode architecture: traditional workers or conversational AI endpoint creation" },
              { icon: "💳", title: "Payment Processing", description: "Lemon Squeezy integration with subscription management and billing automation" },
              { icon: "👥", title: "User Management", description: "Complete authentication system with role-based access control" },
              { icon: "📊", title: "Analytics Dashboard", description: "Real-time metrics, user behavior tracking, and revenue analytics" },
              { icon: "🎨", title: "Page Builder", description: "Visual editor for creating landing pages and marketing content" },
              { icon: "🛠️", title: "Admin Panel", description: "Powerful admin interface for managing all aspects of your SaaS" },
              { icon: "📱", title: "Mobile Responsive", description: "Works perfectly on all devices with mobile-first design" },
              { icon: "🔒", title: "Security First", description: "Built-in security features and best practices implementation" },
              { icon: "⚡", title: "Real-time Updates", description: "Live notifications and real-time data synchronization" }
            ].map((feature, index) => (
              <div key={index} className="card card-body hover-lift">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loved by SaaS Founders</h2>
            <p className="text-xl text-gray-600">See what our customers are saying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card card-body hover-lift">
                <div className="text-4xl mb-4 text-center">{testimonial.avatar}</div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`card hover-lift relative overflow-hidden ${
                  plan.popular ? 'ring-2 ring-blue-500 scale-105 shadow-xl' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className={`card-body ${plan.popular ? 'pt-12' : ''}`}>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <svg className="w-4 h-4 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <Link
                      href="/admin/login"
                      className={`btn w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Launch Your SaaS?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of founders who have built successful SaaS platforms with our tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admin/login" className="btn bg-white text-blue-600 hover:bg-gray-100 btn-lg">
              🚀 Start Building Today
            </Link>
            <Link href="/contact" className="btn border-white text-white hover:bg-white hover:text-blue-600 btn-lg">
              💬 Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">🚀</div>
                <span className="text-xl font-bold">SaaS Builder</span>
              </div>
              <p className="text-gray-400 mb-6">
                The fastest way to launch your SaaS platform. 
                Everything you need in one powerful package.
              </p>
              <div className="flex space-x-4">
                <div className="text-2xl hover:text-blue-400 cursor-pointer">🐤</div>
                <div className="text-2xl hover:text-blue-400 cursor-pointer">📘</div>
                <div className="text-2xl hover:text-blue-400 cursor-pointer">📸</div>
                <div className="text-2xl hover:text-blue-400 cursor-pointer">💼</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/admin/login" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SaaS Builder. All rights reserved. Built with ❤️ for entrepreneurs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}