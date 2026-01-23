import { useState, useEffect } from 'react';
import { SetupWizardProvider, useSetupWizard, WIZARD_STEPS } from './SetupWizardContext';
import SetupWizardProgress from './SetupWizardProgress';

// Step components
import WelcomeStep from './steps/WelcomeStep';
import SiteIdentityStep from './steps/SiteIdentityStep';
import BrandingStep from './steps/BrandingStep';
import SaasDetailsStep from './steps/SaasDetailsStep';
import ReferenceImagesStep from './steps/ReferenceImagesStep';
import AIKeysStep from './steps/AIKeysStep';
import EmailKeysStep from './steps/EmailKeysStep';
import PaymentKeysStep from './steps/PaymentKeysStep';
import PageGenerationStep from './steps/PageGenerationStep';
import ReviewCompleteStep from './steps/ReviewCompleteStep';

const STEP_COMPONENTS = {
  0: WelcomeStep,
  1: SiteIdentityStep,
  2: BrandingStep,
  3: SaasDetailsStep,
  4: ReferenceImagesStep,
  5: AIKeysStep,
  6: EmailKeysStep,
  7: PaymentKeysStep,
  8: PageGenerationStep,
  9: ReviewCompleteStep
};

function WizardContent({ onClose }) {
  const {
    wizardState,
    isLoading,
    isSaving,
    error,
    setError,
    currentStep,
    currentStepConfig,
    isMinimized,
    minimizeWizard,
    restoreWizard,
    dismissWizard,
    nextStep,
    prevStep,
    skipStep
  } = useSetupWizard();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading wizard...</p>
        </div>
      </div>
    );
  }

  // Minimized state - show floating button
  if (isMinimized) {
    return (
      <button
        onClick={restoreWizard}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-5 py-3 rounded-full shadow-lg hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center gap-3 group"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-medium">Continue Setup</span>
        <span className="bg-white/20 px-2.5 py-1 rounded-full text-sm">
          {currentStep + 1}/{WIZARD_STEPS.length}
        </span>
      </button>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];
  const canGoBack = currentStep > 0;
  const canSkip = currentStepConfig?.skippable;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Setup Wizard</h2>
              <p className="text-sm text-slate-400">Build your SaaS in 5 minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={minimizeWizard}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Minimize"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={dismissWizard}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Skip wizard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <SetupWizardProgress />

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {StepComponent && <StepComponent />}
        </div>

        {/* Footer navigation - hidden on Page Generation step (step 8) which has its own navigation */}
        {currentStep !== 8 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3">
              {canGoBack && (
                <button
                  onClick={prevStep}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {canSkip && (
                <button
                  onClick={skipStep}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
              {!isLastStep && (
                <button
                  onClick={nextStep}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupWizard({ onClose }) {
  return (
    <SetupWizardProvider>
      <WizardContent onClose={onClose} />
    </SetupWizardProvider>
  );
}
