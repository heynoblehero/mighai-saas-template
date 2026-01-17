import { useState, useRef } from 'react';
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

// Page-specific screenshot uploader component
function PageScreenshotUploader({ pageId, screenshots, onScreenshotsChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - screenshots.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert('Maximum 3 screenshots per page');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach(f => formData.append('files', f));

      const response = await fetch(`/api/admin/setup-wizard/upload?type=reference&pageId=${pageId}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success && data.uploadedFiles) {
        onScreenshotsChange([...screenshots, ...data.uploadedFiles]);
      } else if (data.success && data.url) {
        onScreenshotsChange([...screenshots, data.url]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeScreenshot = (index) => {
    onScreenshotsChange(screenshots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Upload area */}
      <div
        className="border border-dashed border-slate-700 rounded-lg p-4 text-center hover:border-slate-600 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-slate-400">Uploading...</span>
          </div>
        ) : (
          <>
            <svg className="w-6 h-6 text-slate-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-400">Click to add screenshots ({screenshots.length}/3)</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Uploaded screenshots */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {screenshots.map((url, index) => (
            <div key={index} className="relative group w-20 h-20">
              <img
                src={url}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover rounded border border-slate-700"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeScreenshot(index);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageGenerationStep() {
  const { wizardState, generatePages, nextStep } = useSetupWizard();

  // All pages deselected by default
  const [selectedPages, setSelectedPages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});
  const [completed, setCompleted] = useState(false);
  const [expandedPage, setExpandedPage] = useState(null);

  // Per-page configuration state
  const [pageConfigs, setPageConfigs] = useState(() => {
    const configs = {};
    PAGES.forEach(page => {
      configs[page.id] = {
        customPrompt: '',
        screenshots: [],
        isDone: false
      };
    });
    return configs;
  });

  const generatedPages = wizardState?.generated_pages || {};

  const togglePage = (pageId) => {
    if (selectedPages.includes(pageId)) {
      setSelectedPages(selectedPages.filter(p => p !== pageId));
      // Collapse if deselected
      if (expandedPage === pageId) {
        setExpandedPage(null);
      }
    } else {
      setSelectedPages([...selectedPages, pageId]);
    }
  };

  const selectAll = () => setSelectedPages(PAGES.map(p => p.id));
  const deselectAll = () => {
    setSelectedPages([]);
    setExpandedPage(null);
  };

  // Update per-page configuration
  const updatePageConfig = (pageId, field, value) => {
    setPageConfigs(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [field]: value
      }
    }));
  };

  // Handle prompt change with auto-mark as done
  const handlePromptChange = (pageId, value) => {
    updatePageConfig(pageId, 'customPrompt', value);
    // Auto-mark done if has content
    if (value.trim() !== '') {
      updatePageConfig(pageId, 'isDone', true);
    }
  };

  // Handle screenshots change with auto-mark as done
  const handleScreenshotsChange = (pageId, screenshots) => {
    updatePageConfig(pageId, 'screenshots', screenshots);
    // Auto-mark done if has screenshots
    if (screenshots.length > 0) {
      updatePageConfig(pageId, 'isDone', true);
    }
  };

  // Mark page as done manually
  const markPageDone = (pageId) => {
    updatePageConfig(pageId, 'isDone', true);
  };

  // Get count of done pages among selected
  const getDoneCount = () => {
    return selectedPages.filter(pageId => pageConfigs[pageId]?.isDone).length;
  };

  // Check if all selected pages are done
  const allSelectedPagesDone = () => {
    if (selectedPages.length === 0) return false;
    return selectedPages.every(pageId => pageConfigs[pageId]?.isDone);
  };

  const handleGenerate = async () => {
    if (selectedPages.length === 0) {
      alert('Please select at least one page to generate');
      return;
    }

    if (!allSelectedPagesDone()) {
      alert('Please configure all selected pages before generating');
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
      // Build per-page configurations to send
      const pageConfigsToSend = {};
      selectedPages.forEach(pageId => {
        pageConfigsToSend[pageId] = {
          customPrompt: pageConfigs[pageId]?.customPrompt || '',
          screenshots: pageConfigs[pageId]?.screenshots || []
        };
      });

      const result = await generatePages(selectedPages, atob(apiKey), provider, null, pageConfigsToSend);

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
        <p className="text-slate-400">Select pages, add custom instructions, then generate with AI.</p>
      </div>

      <div className="space-y-6">
        {/* AI Provider notice */}
        {typeof window !== 'undefined' && !localStorage.getItem('ai_provider') && (
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
          <div className="text-sm text-slate-400">
            <span>{selectedPages.length} selected</span>
            {selectedPages.length > 0 && (
              <span className="ml-2">
                • {getDoneCount()} of {selectedPages.length} configured
              </span>
            )}
          </div>
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

        {/* Progress indicator */}
        {selectedPages.length > 0 && !allSelectedPagesDone() && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              Configure all selected pages before generating. Expand each page to add custom instructions or screenshots.
            </p>
          </div>
        )}

        {/* Pages accordion list */}
        <div className="space-y-3">
          {PAGES.map((page) => {
            const isSelected = selectedPages.includes(page.id);
            const config = pageConfigs[page.id];
            const isExpanded = expandedPage === page.id;
            const status = getPageStatus(page.id);
            const hasError = errors[page.id];

            return (
              <div
                key={page.id}
                className={`
                  bg-slate-800/50 rounded-xl border overflow-hidden transition-all
                  ${isSelected ? 'border-emerald-500/50' : 'border-slate-700'}
                `}
              >
                {/* Accordion Header */}
                <div className="flex items-center">
                  {/* Checkbox */}
                  <button
                    onClick={() => !generating && togglePage(page.id)}
                    disabled={generating}
                    className="p-4 flex-shrink-0"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-500'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Page info and expand button */}
                  <button
                    onClick={() => isSelected && setExpandedPage(isExpanded ? null : page.id)}
                    disabled={!isSelected}
                    className={`flex-1 py-4 pr-4 flex items-center justify-between ${
                      isSelected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white">{page.name}</h3>
                          {/* Done badge */}
                          {config?.isDone && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Configured
                            </span>
                          )}
                          {/* Generation status */}
                          {status === 'generating' && (
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          )}
                          {status === 'completed' && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                              Generated
                            </span>
                          )}
                          {status === 'error' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              Error
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{page.description}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {isSelected && isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-4">
                    {/* Custom prompt textarea */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">
                        Custom Instructions (optional)
                      </label>
                      <textarea
                        value={config?.customPrompt || ''}
                        onChange={(e) => handlePromptChange(page.id, e.target.value)}
                        placeholder="Add specific instructions for this page... e.g., 'Include a testimonials section with 3 customer quotes' or 'Make the hero section more minimalist'"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-y placeholder:text-slate-600"
                      />
                    </div>

                    {/* Page-specific screenshots */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">
                        Inspiration Screenshots (optional)
                      </label>
                      <PageScreenshotUploader
                        pageId={page.id}
                        screenshots={config?.screenshots || []}
                        onScreenshotsChange={(screenshots) => handleScreenshotsChange(page.id, screenshots)}
                      />
                    </div>

                    {/* Mark as done button (if not auto-marked) */}
                    {!config?.isDone && (
                      <button
                        onClick={() => markPageDone(page.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Mark as Configured
                      </button>
                    )}

                    {hasError && (
                      <p className="text-xs text-red-400">{hasError}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || selectedPages.length === 0 || !allSelectedPagesDone()}
          className="w-full px-4 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating pages... This may take a minute
            </>
          ) : !allSelectedPagesDone() && selectedPages.length > 0 ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
              Configure all selected pages first
            </>
          ) : selectedPages.length === 0 ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Select pages to generate
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
          <h4 className="text-sm font-medium text-slate-300 mb-2">How it works</h4>
          <ul className="text-sm text-slate-500 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">1.</span>
              Select the pages you want to generate
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">2.</span>
              Expand each page to add custom instructions or inspiration screenshots
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">3.</span>
              Mark each page as configured (or it auto-marks when you add content)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">4.</span>
              Click generate when all selected pages are configured
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
