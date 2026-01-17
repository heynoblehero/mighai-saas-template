import { useSetupWizard, WIZARD_STEPS } from './SetupWizardContext';

export default function SetupWizardProgress() {
  const { currentStep, goToStep } = useSetupWizard();

  // Group steps for display
  const stepGroups = [
    { name: 'Setup', steps: [0, 1, 2, 3, 4] },
    { name: 'Integrations', steps: [5, 6, 7, 8] },
    { name: 'Launch', steps: [9, 10] }
  ];

  return (
    <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && goToStep(index)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center group
                ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
            >
              {/* Step dot */}
              <div
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${isCompleted ? 'bg-emerald-500' : ''}
                  ${isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-slate-600' : ''}
                `}
              />

              {/* Step name tooltip */}
              <div
                className={`
                  absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap
                  px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100
                  transition-opacity pointer-events-none z-10 border border-slate-700
                  ${isCurrent ? 'text-emerald-400' : 'text-slate-400'}
                `}
              >
                {step.name}
                {step.skippable && <span className="text-slate-500 ml-1">(optional)</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current step name */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Step {currentStep + 1} of {WIZARD_STEPS.length}
        </span>
        <span className="text-white font-medium">
          {WIZARD_STEPS[currentStep]?.name}
        </span>
      </div>
    </div>
  );
}
