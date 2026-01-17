import { useState, useEffect } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function SaasDetailsStep() {
  const { wizardState, updateState, isSaving } = useSetupWizard();

  const [targetAudience, setTargetAudience] = useState(wizardState?.target_audience || []);
  const [audienceInput, setAudienceInput] = useState('');
  const [features, setFeatures] = useState(wizardState?.key_features || ['', '', '']);
  const [problemSolved, setProblemSolved] = useState(wizardState?.problem_solved || '');
  const [pricingDescriptions, setPricingDescriptions] = useState(
    wizardState?.pricing_tier_descriptions || { free: '', pro: '', enterprise: '' }
  );

  // Save on changes (debounced via blur)
  const saveState = async () => {
    await updateState({
      target_audience: targetAudience,
      key_features: features.filter(f => f.trim()),
      problem_solved: problemSolved,
      pricing_tier_descriptions: pricingDescriptions
    });
  };

  // Add audience tag
  const addAudience = () => {
    if (audienceInput.trim() && !targetAudience.includes(audienceInput.trim())) {
      setTargetAudience([...targetAudience, audienceInput.trim()]);
      setAudienceInput('');
    }
  };

  // Remove audience tag
  const removeAudience = (tag) => {
    setTargetAudience(targetAudience.filter(t => t !== tag));
  };

  // Update feature at index
  const updateFeature = (index, value) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  // Add new feature field (max 5)
  const addFeatureField = () => {
    if (features.length < 5) {
      setFeatures([...features, '']);
    }
  };

  // Remove feature field (min 3)
  const removeFeatureField = (index) => {
    if (features.length > 3) {
      const newFeatures = features.filter((_, i) => i !== index);
      setFeatures(newFeatures);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">SaaS Details</h2>
        <p className="text-slate-400">Help us understand your product so we can create compelling content.</p>
      </div>

      <div className="space-y-8">
        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Audience <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">Who is your product for? Add tags for each audience segment.</p>

          {/* Tags display */}
          <div className="flex flex-wrap gap-2 mb-3">
            {targetAudience.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => removeAudience(tag)}
                  className="hover:text-emerald-300"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Add tag input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={audienceInput}
              onChange={(e) => setAudienceInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAudience())}
              onBlur={saveState}
              placeholder="e.g., Startups, Freelancers, Small teams"
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={addAudience}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Key Features */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">
              Key Features <span className="text-red-400">*</span>
            </label>
            <span className="text-xs text-slate-500">{features.filter(f => f.trim()).length}/5 features</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">List 3-5 main features of your product.</p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex items-center justify-center w-8 h-10 bg-slate-800 rounded-lg text-slate-500 text-sm">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  onBlur={saveState}
                  placeholder={`Feature ${index + 1}`}
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {features.length > 3 && (
                  <button
                    onClick={() => removeFeatureField(index)}
                    className="px-3 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {features.length < 5 && (
            <button
              onClick={addFeatureField}
              className="mt-3 px-4 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add another feature
            </button>
          )}
        </div>

        {/* Problem Solved */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Problem Solved <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">What problem does your product solve? This helps create compelling marketing copy.</p>
          <textarea
            value={problemSolved}
            onChange={(e) => setProblemSolved(e.target.value)}
            onBlur={saveState}
            placeholder="e.g., Managing business metrics across multiple tools is time-consuming and error-prone. Our platform centralizes all your data in one place, saving hours of manual work each week."
            rows={4}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-slate-500">{problemSolved.length}/1000 characters</p>
        </div>

        {/* Pricing Tier Descriptions */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Pricing Tier Descriptions</label>
          <p className="text-xs text-slate-500 mb-3">Brief descriptions for each pricing tier.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Free Tier</label>
              <input
                type="text"
                value={pricingDescriptions.free}
                onChange={(e) => setPricingDescriptions({ ...pricingDescriptions, free: e.target.value })}
                onBlur={saveState}
                placeholder="e.g., Perfect for getting started"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pro Tier</label>
              <input
                type="text"
                value={pricingDescriptions.pro}
                onChange={(e) => setPricingDescriptions({ ...pricingDescriptions, pro: e.target.value })}
                onBlur={saveState}
                placeholder="e.g., For growing teams and businesses"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Enterprise Tier</label>
              <input
                type="text"
                value={pricingDescriptions.enterprise}
                onChange={(e) => setPricingDescriptions({ ...pricingDescriptions, enterprise: e.target.value })}
                onBlur={saveState}
                placeholder="e.g., Custom solutions at scale"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
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
