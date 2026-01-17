import { useState, useRef } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

export default function ReferenceImagesStep() {
  const { wizardState, updateState, uploadFile, isSaving } = useSetupWizard();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const referenceImages = wizardState?.reference_images || [];
  const styleAnalysis = wizardState?.style_analysis || '';

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 total images
    const remainingSlots = 5 - referenceImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert('Maximum 5 reference images allowed');
      return;
    }

    setUploading(true);
    try {
      await uploadFile(filesToUpload, 'reference');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index) => {
    const newImages = referenceImages.filter((_, i) => i !== index);
    await updateState({ reference_images: newImages });
  };

  const analyzeImages = async () => {
    if (referenceImages.length === 0) {
      alert('Please upload at least one reference image first');
      return;
    }

    setAnalyzing(true);
    try {
      // This would call an API to analyze images with AI
      // For now, we'll set a placeholder analysis
      const analysisText = `Based on the ${referenceImages.length} reference image(s) provided:
- Modern, clean design aesthetic
- Professional color palette with good contrast
- Clear visual hierarchy and spacing
- Mobile-responsive layout patterns
- Focus on readability and user experience`;

      await updateState({ style_analysis: analysisText });
    } catch (error) {
      console.error('Error analyzing images:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Reference Images</h2>
        <p className="text-slate-400">Upload screenshots of sites you like. We'll use these for style inspiration.</p>
      </div>

      <div className="space-y-6">
        {/* Upload area */}
        <div
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-400">Uploading...</p>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-300 mb-1">Drop images here or click to browse</p>
              <p className="text-sm text-slate-500">PNG, JPG, or WebP (max 5 images, 10MB each)</p>
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

        {/* Uploaded images grid */}
        {referenceImages.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Uploaded Images ({referenceImages.length}/5)</h3>
              <button
                onClick={analyzeImages}
                disabled={analyzing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analyze Style
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {referenceImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-slate-700"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Style analysis result */}
        {styleAnalysis && (
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-sm font-medium text-slate-300">Style Analysis</h3>
            </div>
            <p className="text-slate-400 text-sm whitespace-pre-line">{styleAnalysis}</p>
          </div>
        )}

        {/* Tips */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Tips for best results</h4>
          <ul className="text-sm text-slate-500 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              Upload screenshots of landing pages or SaaS sites you admire
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              Include examples of color schemes, layouts, or typography you like
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-1">-</span>
              Mix different styles to get a unique blend
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
