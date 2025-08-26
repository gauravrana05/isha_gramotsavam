import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 10 chars):', supabaseKey?.substring(0, 10));

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase configuration',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }, { status: 400 });
    }

    const client = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection by listing buckets
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) {
      return NextResponse.json({ 
        error: 'Supabase connection failed',
        details: error.message,
        supabaseUrl,
        keyLength: supabaseKey.length
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bucketsCount: buckets?.length || 0,
      buckets: buckets?.map(b => b.name) || [],
      supabaseUrl,
      keyLength: supabaseKey.length
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}