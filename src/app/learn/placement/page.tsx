import AssessmentRunner from '@/components/learning/AssessmentRunner';

export default function PlacementPage() {
  return (
    <AssessmentRunner
      kind="placement"
      titleVi="Kiểm tra đầu vào"
      subtitleVi="Bài này xếp chặng học ban đầu và lưu kết quả vào DB để lộ trình, farm, pet và game dùng đúng độ khó."
      backHref="/roadmap"
    />
  );
}