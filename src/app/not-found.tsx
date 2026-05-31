import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <div className="text-center px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Không tìm thấy trang</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Trang bạn tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl font-semibold hover:shadow-lg transition-shadow"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
