'use client';

import { useMemo } from 'react';
import AssessmentRunner from '@/components/learning/AssessmentRunner';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress } from '@/lib/curriculum';

export default function CheckpointPage() {
  const progress = useAppStore((state) => state.progress);
  const learner = useMemo(() => getLearnerStageProgress(progress), [progress]);

  return (
    <AssessmentRunner
      kind="weekly-checkpoint"
      stageId={learner.stage.id}
      titleVi="Checkpoint lộ trình"
      subtitleVi="Bài kiểm tra này đo kỹ năng theo chặng hiện tại và lưu mastery vào DB để quyết định bé cần ôn gì tiếp."
      backHref="/roadmap"
    />
  );
}