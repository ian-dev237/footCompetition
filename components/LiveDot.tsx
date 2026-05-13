export default function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-status-loss">
      <span className="h-1.5 w-1.5 rounded-full bg-status-loss animate-livepulse" />
      Live
    </span>
  );
}
