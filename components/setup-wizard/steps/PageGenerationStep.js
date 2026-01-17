import { useState } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

const PAGES = [
  { id: 'landing-page', name: 'Landing Page', description: 'Homepage with hero, features, and CTA' },
  { id: 'pricing-page', name: 'Pricing Page', description: 'Pricing tiers with checkout links' },
  { id: 'about-page', name: 'About Page', description: 'Company story and mission' },
  { id: 'contact-page', name: 'Contact Page', description: 'Contact form and info' },
  { id: 'customer-login', name: 'Login Page', description: 'Customer authentication' },
  { id: 'customer-signup', name: 'Signup Page', description: 'Customer registration with OTP' },
  { id: 'customer-dashboard', name: 'Dashboard', description: 'Customer portal main page' },
  { id: 'blog-homepage', name: 'Blog Homepage', description: 'Blog listing page' }
];

export default function PageGenerationStep() {
  const { wizardState, generatePages, nextStep } = useSetupWizard();

  const [selectedPages, setSelectedPages] = useState(PAGES.map(p => p.id));
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});
  const [completed, setCompleted] = useState(false);

  const generatedPages = wizardState?.generated_pages || {};

  const togglePage = (pageId) => {
    if (selectedPages.includes(pageId)) {
      setSelectedPages(selectedPages.filter(p => p !== pageId));
    } else {
      setSelectedPages([...selectedPages, pageId]);
    }
  };

  const selectAll = () => setSelectedPages(PAGES.map(p => p.id));
  const deselectAll = () => setSelectedPages([]);

  const handleGenerate = async () => {
    if (selectedPages.length === 0) {
      alert('Please select at least one page to generate');
      return;
    }

    // Get API key from localStorage
    const provider = localStorage.getItem('ai_provider') || 'gemini';
    const apiKey = localStorage.getItem(`${provider}_api_key`);

    if (!apiKey) {
      alert('Please configure an AI API key first (Step 5)');
      return;
    }

    setGenerating(true);
    setErrors({});
    setProgress({});

    // Mark all as generating
    selectedPages.forEach(p => setProgress(prev => ({ ...prev, [p]: 'generating' })));

    try {
      const result = await generatePages(selectedPages, atob(apiKey), provider);

      if (result.success) {
        // Update progress based on results
        Object.keys(result.results || {}).forEach(pageId => {
          setProgress(prev => ({ ...prev, [pageId]: 'completed' }));
        });

        Object.keys(result.errors || {}).forEach(pageId => {
          setProgress(prev => ({ ...prev, [pageId]: 'error' }));
          setErrors(prev => ({ ...prev, [pageId]: result.errors[pageId] }));
        });

        if (result.generatedCount > 0) {
          setCompleted(true);
        }
      } else {
        selectedPages.forEach(p => {
          setProgress(prev => ({ ...prev, [p]: 'error' }));
          setErrors(prev => ({ ...prev, [p]: result.error || 'Generation failed' }));
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      selectedPages.forEach(p => {
        setProgress(prev => ({ ...prev, [p]: 'error' }));
        setErrors(prev => ({ ...prev, [p]: 'Generation failed' }));
      });
    } finally {
      setGenerating(false);
    }
  };

  const getPageStatus = (pageId) => {
    if (progress[pageId]) return progress[pageId];
    if (generatedPages[pageId]?.generated) return 'completed';
    return 'pending';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Generate Pages</h2>
        <p className="text-slate-400">AI will create your pages using the info you provided.</p>
      </div>

      <div className="space-y-6">
        {/* AI Provider notice */}
        {!localStorage.getItem('ai_provider') && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-yellow-400 font-medium">AI API key required</p>
              <p className="text-sm text-slate-400 mt-1">Go back to Step 5 to configure your AI provider.</p>
            </div>
          </div>
        )}

        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">{selectedPages.length} of {PAGES.length} selected</span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Select all
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* Pages grid */}
        <div className="grid grid-cols-2 gap-3">
          {PAGES.map((page) => {
            const status = getPageStatus(page.id);
            const isSelected = selectedPages.includes(page.id);
            const hasError = errors[page.id];

            return (
              <button
                key={page.id}
                onClick={() => !generating && togglePage(page.id)}
                disabled={generating}
                className={`
                  p-4 rounded-xl border text-left transition-all relative
                  ${isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }
                  ${generating ? 'cursor-not-allowed opacity-75' : ''}
                `}
              >
                {/* Status indicator */}
                <div className="absolute top-3 right-3">
                  {status === 'generating' && (
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {status === 'completed' && (
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {status === 'error' && (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>

                {/* Checkbox */}
                <div className={`w-5 h-5 rounded border mb-3 flex items-center justify-center ${
                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <h3 className="font-medium text-white mb-1">{page.name}</h3>
                <p className="text-xs text-slate-500">{page.description}</p>

                {hasError && (
                  <p className="text-xs text-red-400 mt-2">{hasError}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || selectedPages.length === 0}
          className="w-full px-4 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating pages... This may take a minute
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
            </>
          )}
        </button>

        {/* Completion message */}
        {completed && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-medium text-emerald-400">Pages generated successfully!</h3>
            </div>
            <p className="text-sm text-slate-400">
              Your pages have been created and saved. You can edit them anytime from the Admin panel.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300 mb-2">What happens next?</h4>
          <ul className="text-sm text-slate-500 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              Pages are generated based on your site info, branding, and features
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              You can edit any page later from the Admin panel
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              Pages are saved but not deployed until you review them
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
