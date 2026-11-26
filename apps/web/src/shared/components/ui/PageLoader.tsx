export function PageLoader({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div
        className={`${dim} rounded-full border-2 border-[#C2410C] border-t-transparent animate-spin`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
