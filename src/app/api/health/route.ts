/**
 * Health check API endpoint for connection quality testing
 * Used by OfflineContext to determine network quality and latency
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeRedisOperation } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Test basic server response
    const serverTime = new Date().toISOString();
    const processingTime = Date.now() - startTime;
    
    // Optionally test Redis connection if available
    let redisStatus = 'unavailable';
    let redisLatency = -1;
    
    const redisStartTime = Date.now();
    const redisResult = await safeRedisOperation(
      async (redis) => {
        await redis.ping();
        return 'connected';
      },
      async () => 'unavailable'
    );
    
    if (redisResult === 'connected') {
      redisLatency = Date.now() - redisStartTime;
      redisStatus = 'connected';
    } else {
      redisStatus = 'unavailable';
    }

    const response = {
      status: 'healthy',
      timestamp: serverTime,
      server: {
        processingTime,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      redis: {
        status: redisStatus,
        latency: redisLatency,
      },
      network: {
        userAgent: request.headers.get('user-agent'),
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        country: request.geo?.country || 'unknown',
        region: request.geo?.region || 'unknown',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        server: {
          processingTime,
        },
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

export async function HEAD(request: NextRequest) {
  // Lightweight endpoint for connection testing
  try {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Health-Status': 'ok',
        'X-Response-Time': Date.now().toString(),
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-Health-Status': 'error',
        'X-Response-Time': Date.now().toString(),
      },
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}