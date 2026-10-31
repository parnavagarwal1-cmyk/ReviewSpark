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

  // If structured data was stored in custom_context
  if (data.custom_context && data.custom_context.startsWith('{')) {
    try {
      const parsed = JSON.parse(data.custom_context);
      if (parsed._is_structured) {
        data.city = data.city || parsed.city;
        data.nearby = data.nearby || parsed.nearby;
        data.street = data.street || parsed.street;
        data.phone = data.phone || parsed.phone;
        data.email = data.email || parsed.email;
        data.service_keywords = data.service_keywords || parsed.service_keywords;
        data.primary_language = data.primary_language || parsed.primary_language;
        data.secondary_language = data.secondary_language || parsed.secondary_language;
        data.aspects = data.aspects || parsed.aspects;
        data.rating_tags = data.rating_tags || parsed.rating_tags;
        if (parsed.show_aspects !== undefined) data.show_aspects = parsed.show_aspects;
        if (parsed.show_tags !== undefined) data.show_tags = parsed.show_tags;
        data.custom_context = parsed.custom_context;
      }
    } catch {
      // ignore
    }
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
      'city',
      'nearby',
      'street',
      'phone',
      'email',
      'category',
      'service_keywords',
      'primary_language',
      'secondary_language',
      'aspects',
      'rating_tags',
      'show_aspects',
      'show_tags',
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

    let { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // If new columns don't exist in Supabase yet, encode extra details in custom_context
    if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
      console.warn('[businesses PATCH] Schema columns missing, falling back to base columns + structured custom_context');

      const structuredContext = JSON.stringify({
        _is_structured: true,
        city: body.city,
        nearby: body.nearby,
        street: body.street,
        phone: body.phone,
        email: body.email,
        service_keywords: body.service_keywords,
        primary_language: body.primary_language,
        secondary_language: body.secondary_language,
        aspects: body.aspects,
        rating_tags: body.rating_tags,
        show_aspects: body.show_aspects,
        show_tags: body.show_tags,
        custom_context: body.custom_context,
      });

      const baseUpdate: Record<string, unknown> = {
        custom_context: structuredContext,
      };
      if (body.business_name !== undefined) baseUpdate.business_name = body.business_name;
      if (body.address !== undefined) baseUpdate.address = body.address;
      if (body.category !== undefined) baseUpdate.category = body.category;
      if (body.is_active !== undefined) baseUpdate.is_active = body.is_active;
      if (body.google_review_url !== undefined) baseUpdate.google_review_url = body.google_review_url;

      const fallbackRes = await supabase
        .from('businesses')
        .update(baseUpdate)
        .eq('id', id)
        .select()
        .single();

      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Business not found or update failed' },
        { status: 404 }
      );
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
