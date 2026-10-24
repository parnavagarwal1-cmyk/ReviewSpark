import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { generateQRCode, buildReviewPageUrl } from '@/lib/qr';

type Params = { params: Promise<{ id: string }> };

// GET /api/businesses/[id]/qr — download QR code as PNG
export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const { data: business, error } = await supabase
    .from('businesses')
    .select('public_token, business_name')
    .eq('id', id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const size = Math.min(2048, Math.max(128, parseInt(searchParams.get('size') ?? '512')));

  const reviewPageUrl = buildReviewPageUrl(business.public_token);
  const { pngBuffer } = await generateQRCode({
    url: reviewPageUrl,
    size,
    margin: 3,
  });

  const safeName = business.business_name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);

  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${safeName}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
