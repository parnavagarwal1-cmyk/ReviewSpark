import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { generateQRPdf } from '@/lib/pdf';
import { buildReviewPageUrl } from '@/lib/qr';

// GET /api/qr/pdf?businessId=... — download print-ready A4 PDF
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('public_token, business_name, address')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const reviewPageUrl = buildReviewPageUrl(business.public_token);
  const pdfBuffer = await generateQRPdf({
    businessName: business.business_name,
    publicToken: business.public_token,
    reviewPageUrl,
    subtitle: business.address ?? undefined,
  });

  const safeName = business.business_name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-${safeName}-a4.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
