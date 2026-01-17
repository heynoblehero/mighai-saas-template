import { useState, useRef } from 'react';
import { useSetupWizard } from '../SetupWizardContext';

const COLOR_PRESETS = [
  { name: 'Emerald', primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  { name: 'Blue', primary: '#3B82F6', secondary: '#2563EB', accent: '#60A5FA' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
  { name: 'Rose', primary: '#F43F5E', secondary: '#E11D48', accent: '#FB7185' },
  { name: 'Orange', primary: '#F97316', secondary: '#EA580C', accent: '#FB923C' },
  { name: 'Cyan', primary: '#06B6D4', secondary: '#0891B2', accent: '#22D3EE' }
];

export default function BrandingStep() {
  const { wizardState, updateState, uploadFile, isSaving } = useSetupWizard();

  const [primaryColor, setPrimaryColor] = useState(wizardState?.primary_color || '#10B981');
  const [secondaryColor, setSecondaryColor] = useState(wizardState?.secondary_color || '#059669');
  const [accentColor, setAccentColor] = useState(wizardState?.accent_color || '#34D399');
  const [uploading, setUploading] = useState({ logo: false, favicon: false });

  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const handleColorChange = async (type, color) => {
    if (type === 'primary') setPrimaryColor(color);
    if (type === 'secondary') setSecondaryColor(color);
    if (type === 'accent') setAccentColor(color);

    await updateState({
      primary_color: type === 'primary' ? color : primaryColor,
      secondary_color: type === 'secondary' ? color : secondaryColor,
      accent_color: type === 'accent' ? color : accentColor
    });
  };

  const applyPreset = async (preset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
    await updateState({
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    });
  };

  const handleFileUpload = async (type) => {
    const inputRef = type === 'logo' ? logoInputRef : faviconInputRef;
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      await uploadFile(file, type);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Branding</h2>
        <p className="text-slate-400">Set up your visual identity with logos and brand colors.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Logo & Favicon */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Logo</label>
            <div
              className="relative border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => logoInputRef.current?.click()}
            >
              {wizardState?.logo_url ? (
                <div className="flex flex-col items-center">
                  <img
                    src={wizardState.logo_url}
                    alt="Logo"
                    className="h-20 w-auto object-contain mb-2"
                  />
                  <p className="text-xs text-slate-500">Click to change</p>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-400">Click to upload logo</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, SVG, or JPG (max 2MB)</p>
                </>
              )}
              {uploading.logo && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-xl">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => handleFileUpload('logo')}
            />
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Favicon</label>
            <div
              className="relative border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => faviconInputRef.current?.click()}
            >
              {wizardState?.favicon_url ? (
                <div className="flex items-center gap-3 justify-center">
                  <img
                    src={wizardState.favicon_url}
                    alt="Favicon"
                    className="h-8 w-8 object-contain"
                  />
                  <p className="text-xs text-slate-500">Click to change</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-slate-400">Upload favicon</p>
                    <p className="text-xs text-slate-500">32x32 ICO or PNG</p>
                  </div>
                </div>
              )}
              {uploading.favicon && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-xl">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*,.ico"
              className="hidden"
              onChange={() => handleFileUpload('favicon')}
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-6">
          {/* Color presets */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <div className="flex gap-1 mb-1">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }}></div>
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }}></div>
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }}></div>
                  </div>
                  <p className="text-xs text-slate-400">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom colors */}
          <div className="space-y-4">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Preview</p>
            <div className="flex gap-2 mb-3">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: secondaryColor }}
              >
                Secondary
              </button>
            </div>
            <p className="text-sm" style={{ color: accentColor }}>
              Accent text color example
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
