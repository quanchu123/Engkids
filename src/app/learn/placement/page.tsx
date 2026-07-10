import AssessmentRunner from '@/components/learning/AssessmentRunner';

type PlacementPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function PlacementPage({ searchParams }: PlacementPageProps) {
  const nextHref = typeof searchParams?.next === 'string' && searchParams.next.startsWith('/')
    ? searchParams.next
    : '/roadmap';

  return (
    <AssessmentRunner
      kind="placement"
      titleVi="Kiểm tra đầu vào"
      subtitleVi="Bài này xếp chặng học ban đầu và lưu kết quả vào DB để lộ trình, farm, pet và game dùng đúng độ khó."
      backHref={nextHref}
    />
  );
}
