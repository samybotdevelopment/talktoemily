import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createWebsiteSchema = z.object({
  domain: z.string().min(1),
  display_name: z.string().min(1),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  icon_url: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createWebsiteSchema.parse(body);

    // Get user's organization
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (!memberships) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    // Check website limit
    const { count } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id);

    if (count && count >= org.max_websites) {
      return NextResponse.json(
        { error: `Website limit reached (${org.max_websites})` },
        { status: 403 }
      );
    }

    // Create website
    const { data: website, error } = await supabase
      .from('websites')
      .insert({
        org_id: org.id,
        domain: validatedData.domain,
        display_name: validatedData.display_name,
        primary_color: validatedData.primary_color,
        icon_url: validatedData.icon_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create website:', error);
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 } as any);
    }

    return NextResponse.json({ data: website }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    console.error('Error creating website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organizations
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const orgIds = memberships.map((m: any) => m.org_id);

    // Get websites
    const { data: websites, error } = await supabase
      .from('websites')
      .select('*')
      .in('org_id', orgIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch websites:', error);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    return NextResponse.json({ data: websites });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
