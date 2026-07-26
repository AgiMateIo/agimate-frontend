// The step's navigation, pinned to the bottom of the viewport while the step is
// scrolled and settling into place as a footer once its end is reached — a long
// preset gallery or skill list must never put "Next" out of reach.
//
// It is the step card's last child and carries its own padding (the card has
// none, each step pads its own body): a sticky box must have no margins of its
// own, since the browser pins its *margin* box to the scrollport and a negative
// margin would leave a see-through band of that height underneath. The
// background is fully opaque for the same reason — content passes beneath it.
export default function WizardActions({
  left,
  children,
}: {
  // Leading slot (Back); the primary action goes in children, on the right.
  left?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-xl border-t border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
