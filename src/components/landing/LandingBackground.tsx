// The landing/auth backdrop: a static base gradient with three soft elliptical
// layers turning over it, so the colour keeps flowing instead of sitting still.
// The layers deliberately overhang the viewport on every side — a gradient whose
// edge is visible reads as a shape, and the point here is a field with no edges.
// Motion, tint, the base gradient and the reduced-motion opt-out live in
// globals.css; its colours come from the backdrop tokens.
export default function LandingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="landing-backdrop absolute inset-0" />
      <div className="aurora-layer animate-aurora-1 -left-[20%] -top-[25%] h-[80vh] w-[80vw]" />
      <div className="aurora-layer animate-aurora-2 -right-[25%] -top-[10%] h-[95vh] w-[70vw]" />
      <div className="aurora-layer animate-aurora-3 -bottom-[30%] -left-[15%] h-[85vh] w-[85vw]" />
    </div>
  );
}
