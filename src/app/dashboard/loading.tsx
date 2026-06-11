import DashboardLayout from '@/components/layout/DashboardLayout';
import { CommonPageSkeleton } from '@/components/ui/SkeletonLoader';

export default function Loading() {
  return (
    <DashboardLayout>
      <CommonPageSkeleton />
    </DashboardLayout>
  );
}
