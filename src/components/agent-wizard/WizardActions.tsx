// The step's navigation: while the step is taller than the viewport the bar
// clings to the bottom of the window, and once its end is reached it settles
// into place as the step card's footer — a long preset gallery or skill list
// must never put "Next" out of reach.
//
// `-bottom-6` rather than `bottom-0`: the sticky offset is measured against the
// content area of the scroll container, and the dashboard's <main> has p-6, so
// bottom-0 parks the bar 24px above the window edge and leaves the page's own
// text scrolling through that gap. The offset moves the resting point down by
// exactly that padding; pb-6 keeps air under the buttons either way. The
// background is fully opaque because content passes beneath it.
export default function WizardActions({
  left,
  children,
}: {
  // Leading slot (Back); the primary action goes in children, on the right.
  left?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky -bottom-6 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-surface px-6 pt-4 pb-6">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
