// The step's navigation, pinned to the bottom of the viewport while the step is
// scrolled and settling into place as a footer once its end is reached — a long
// preset gallery or skill list must never put "Next" out of reach.
// Negative margins cancel the step card's p-6 so the bar spans its full width.
export default function WizardActions({
  left,
  children,
}: {
  // Leading slot (Back); the primary action goes in children, on the right.
  left?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-surface/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
