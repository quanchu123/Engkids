export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="text-6xl animate-bounce">📚</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/10 rounded-full blur-sm animate-pulse" />
        </div>
        <p className="text-gray-500 mt-4 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}
