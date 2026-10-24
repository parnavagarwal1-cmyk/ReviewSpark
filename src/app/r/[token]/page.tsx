import type { Metadata } from 'next';
import ReviewFlowClient from './ReviewFlowClient';

interface ReviewPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/review/context?token=${token}`, {
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        title: `Review ${data.business_name} on Google`,
        description: `Scan to leave a Google review for ${data.business_name}. Takes just 30 seconds!`,
        robots: { index: false, follow: false },
      };
    }
  } catch {}

  return {
    title: 'Leave a Google Review',
    description: 'Help others by sharing your experience.',
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { token } = await params;
  return <ReviewFlowClient token={token} />;
}
