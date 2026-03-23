interface VideoUploadProgressProps {
  status: string;
  progress: number;
}

export default function VideoUploadProgress({ status, progress }: VideoUploadProgressProps) {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">{status}</span>
        <span className="text-sm font-bold text-blue-600">{progress}%</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
