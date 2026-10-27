import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { UpdateBusinessInput } from '@/types';

type Params = { params: Promise<{ id: string }> };

// GET /api/businesses/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from('businesses')
    .select('*, scan_events(event_type, created_at, rating)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/businesses/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = (await request.json()) as UpdateBusinessInput;

    // Whitelist of updatable fields
    const allowedFields: (keyof UpdateBusinessInput)[] = [
      'business_name',
      'address',
      'category',
      'is_active',
      'google_review_url',
      'custom_context',
    ];

    const updateData: Partial<UpdateBusinessInput> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Business not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/businesses/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase.from('businesses').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
