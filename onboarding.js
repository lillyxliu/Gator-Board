const onboardingSteps = 3;
const stepLabel = document.querySelector(".onboarding-step");
const nextButton = document.querySelector("#onboarding-next");

function renderStep() {
  const match = window.location.hash.match(/^#step-([1-3])$/);
  const step = match ? Number(match[1]) : 1;

  stepLabel.textContent = `${step} of ${onboardingSteps}`;
  nextButton.textContent = step === onboardingSteps ? "Open Gator Board" : "Next";
  nextButton.href = step === onboardingSteps
    ? "index.html#home"
    : `#step-${step + 1}`;
}

window.addEventListener("hashchange", renderStep);
renderStep();
