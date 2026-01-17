import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function SiteIdentityStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [siteName, setSiteName] = useState(wizardState?.site_name || '');
  const [tagline, setTagline] = useState(wizardState?.site_tagline || '');
  const [description, setDescription] = useState(wizardState?.site_description || '');

  // Auto-save on blur
  const handleBlur = async () => {
    if (siteName || tagline || description) {
      await updateState({
        site_name: siteName,
        site_tagline: tagline,
        site_description: description
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Site Identity</h2>
        <p className="text-slate-400">Tell us about your SaaS. This information will be used across your site.</p>
      </div>

      <div className="space-y-6">
        {/* Site Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Site Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g., Acme Analytics"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-slate-500">{siteName.length}/50 characters</p>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tagline <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g., Analytics made simple for growing teams"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            maxLength={100}
          />
          <p className="mt-1 text-xs text-slate-500">{tagline.length}/100 characters</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlur}
            placeholder="Describe what your SaaS does and who it's for. This will be used in your landing page and meta descriptions."
            rows={4}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-slate-500">{description.length}/500 characters</p>
        </div>

        {/* Preview card */}
        {(siteName || tagline) && (
          <div className="mt-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Preview</p>
            <h3 className="text-xl font-bold text-white mb-1">{siteName || 'Your Site Name'}</h3>
            <p className="text-emerald-400 text-sm mb-2">{tagline || 'Your tagline here'}</p>
            {description && (
              <p className="text-slate-400 text-sm line-clamp-2">{description}</p>
            )}
          </div>
        )}
      </div>

      {isSaving && (
        <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
}
