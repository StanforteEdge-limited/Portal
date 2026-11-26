export function PageSpinner({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div
        className={`${dims} rounded-full border-2 border-[#C2410C] border-t-transparent animate-spin`}
      />
    </div>
  );
}
