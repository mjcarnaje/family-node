export function SectionDivider() {
  return (
    <div className="w-full py-8 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-7xl px-4 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/40" />
        <div className="w-2 h-2 rounded-full bg-primary/40 rotate-45" />
        <div className="flex-1 h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
      </div>
    </div>
  );
}

