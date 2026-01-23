import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SetupWizardContext = createContext(null);

export const WIZARD_STEPS = [
  { id: 0, name: 'Welcome', skippable: false },
  { id: 1, name: 'Site Identity', skippable: false },
  { id: 2, name: 'Branding', skippable: true },
  { id: 3, name: 'SaaS Details', skippable: false },
  { id: 4, name: 'Reference Images', skippable: true },
  { id: 5, name: 'AI API Keys', skippable: true },
  { id: 6, name: 'Email Setup', skippable: true },
  { id: 7, name: 'Payment & Plans', skippable: true }, // Combined Payment + Plans
  { id: 8, name: 'Page Generation', skippable: false },
  { id: 9, name: 'Complete', skippable: false }
];

export function SetupWizardProvider({ children }) {
  const [wizardState, setWizardState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial wizard state
  const fetchWizardState = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/setup-wizard');
      const data = await response.json();

      if (data.success) {
        setWizardState(data.wizardState);
      } else {
        setError(data.error || 'Failed to load wizard state');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching wizard state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWizardState();
  }, [fetchWizardState]);

  // Update wizard state (partial update)
  const updateState = useCallback(async (updates) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/setup-wizard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        setWizardState(data.wizardState);
        return data.wizardState;
      } else {
        setError(data.error || 'Failed to update');
        return null;
      }
    } catch (err) {
      setError('Failed to save changes');
      console.error('Error updating wizard state:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Navigate to next step
  const nextStep = useCallback(async () => {
    if (!wizardState) return;
    const nextStepNum = Math.min(wizardState.current_step + 1, WIZARD_STEPS.length - 1);
    return updateState({ current_step: nextStepNum });
  }, [wizardState, updateState]);

  // Navigate to previous step
  const prevStep = useCallback(async () => {
    if (!wizardState) return;
    const prevStepNum = Math.max(wizardState.current_step - 1, 0);
    return updateState({ current_step: prevStepNum });
  }, [wizardState, updateState]);

  // Go to specific step
  const goToStep = useCallback(async (stepNumber) => {
    if (stepNumber >= 0 && stepNumber < WIZARD_STEPS.length) {
      return updateState({ current_step: stepNumber });
    }
  }, [updateState]);

  // Skip current step
  const skipStep = useCallback(async () => {
    const currentStepConfig = WIZARD_STEPS[wizardState?.current_step];
    if (currentStepConfig?.skippable) {
      return nextStep();
    }
  }, [wizardState, nextStep]);

  // Dismiss wizard
  const dismissWizard = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/setup-wizard/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      });

      const data = await response.json();
      if (data.success) {
        setWizardState(data.wizardState);
      }
    } catch (err) {
      console.error('Error dismissing wizard:', err);
    }
  }, []);

  // Minimize wizard
  const minimizeWizard = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/setup-wizard/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'minimize' })
      });

      const data = await response.json();
      if (data.success) {
        setWizardState(data.wizardState);
      }
    } catch (err) {
      console.error('Error minimizing wizard:', err);
    }
  }, []);

  // Restore wizard from minimized state
  const restoreWizard = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/setup-wizard/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      });

      const data = await response.json();
      if (data.success) {
        setWizardState(data.wizardState);
      }
    } catch (err) {
      console.error('Error restoring wizard:', err);
    }
  }, []);

  // Complete wizard
  const completeWizard = useCallback(async () => {
    return updateState({ is_completed: true, completed_at: new Date().toISOString() });
  }, [updateState]);

  // Upload file
  const uploadFile = useCallback(async (file, type) => {
    const formData = new FormData();

    if (type === 'reference') {
      // For reference images, expect array of files
      const files = Array.isArray(file) ? file : [file];
      files.forEach(f => formData.append('files', f));
    } else {
      formData.append('file', file);
    }

    try {
      const response = await fetch(`/api/admin/setup-wizard/upload?type=${type}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setWizardState(data.wizardState);
        return data.uploadedFiles;
      } else {
        setError(data.error || 'Upload failed');
        return null;
      }
    } catch (err) {
      setError('Failed to upload file');
      console.error('Error uploading:', err);
      return null;
    }
  }, []);

  // Generate pages - provider defaults to 'claude' now, not 'gemini'
  const generatePages = useCallback(async (pages, apiKey, provider = 'claude', model, pageConfigs = {}) => {
    try {
      const response = await fetch('/api/admin/setup-wizard/generate-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, apiKey, provider, model, pageConfigs })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh wizard state to get updated generated_pages
        await fetchWizardState();
      }

      return data;
    } catch (err) {
      console.error('Error generating pages:', err);
      return { success: false, error: 'Failed to generate pages' };
    }
  }, [fetchWizardState]);

  const currentStep = wizardState?.current_step ?? 0;
  const currentStepConfig = WIZARD_STEPS[currentStep];
  const isMinimized = wizardState?.is_minimized ?? false;
  const isCompleted = wizardState?.is_completed ?? false;
  const isDismissed = wizardState?.is_dismissed ?? false;
  const shouldShow = !isCompleted && !isDismissed;

  const value = {
    wizardState,
    setWizardState,
    isLoading,
    isSaving,
    error,
    setError,
    currentStep,
    currentStepConfig,
    steps: WIZARD_STEPS,
    isMinimized,
    isCompleted,
    isDismissed,
    shouldShow,
    updateState,
    nextStep,
    prevStep,
    goToStep,
    skipStep,
    dismissWizard,
    minimizeWizard,
    restoreWizard,
    completeWizard,
    uploadFile,
    generatePages,
    fetchWizardState
  };

  return (
    <SetupWizardContext.Provider value={value}>
      {children}
    </SetupWizardContext.Provider>
  );
}

export function useSetupWizard() {
  const context = useContext(SetupWizardContext);
  if (!context) {
    throw new Error('useSetupWizard must be used within a SetupWizardProvider');
  }
  return context;
}

export default SetupWizardContext;
