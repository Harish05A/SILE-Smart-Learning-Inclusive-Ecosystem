import React from 'react';

export interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export const LessonCardSkeleton: React.FC = () => (
  <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-subtle space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <Skeleton className="h-5 w-16 rounded-lg" />
    </div>
    <Skeleton className="h-6 w-3/4 rounded-lg" />
    <Skeleton className="h-4 w-full rounded-md" />
    <Skeleton className="h-4 w-5/6 rounded-md" />
    <div className="pt-2 flex items-center justify-between">
      <Skeleton className="h-4 w-20 rounded-md" />
      <Skeleton className="h-9 w-28 rounded-xl" />
    </div>
  </div>
);

export const NextStepHeroSkeleton: React.FC = () => (
  <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-card space-y-4">
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-32 rounded-full" />
    </div>
    <Skeleton className="h-8 w-2/3 rounded-xl" />
    <Skeleton className="h-4 w-4/5 rounded-lg" />
    <div className="pt-4 flex flex-wrap gap-3">
      <Skeleton className="h-11 w-40 rounded-xl" />
      <Skeleton className="h-11 w-32 rounded-xl" />
    </div>
  </div>
);
