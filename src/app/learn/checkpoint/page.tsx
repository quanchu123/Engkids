'use client';

import { useEffect, useMemo, useState } from 'react';
import AssessmentRunner from '@/components/learning/AssessmentRunner';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress, type CurriculumStageId } from '@/lib/curriculum';

export default function CheckpointPage() {
  const progress = useAppStore((state) => state.progress);
  const learner = useMemo(() => getLearnerStageProgress(progress), [progress]);
  const [dbStageId, setDbStageId] = useState<CurriculumStageId | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.learnerState?.currentStageId) setDbStageId(data.learnerState.currentStageId);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <AssessmentRunner
      kind="weekly-checkpoint"
      stageId={dbStageId || learner.stage.id}
      titleVi="Checkpoint lộ trình"
      subtitleVi="Bài kiểm tra này đo kỹ năng theo chặng hiện tại và lưu mastery vào DB để quyết định bé cần ôn gì tiếp."
      backHref="/roadmap"
    />
  );
}
