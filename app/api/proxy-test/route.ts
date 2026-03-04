import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test if Next.js can reach FastAPI
    const response = await fetch('http://localhost:8000/api/v1/accounts/ACC-0001');
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `FastAPI responded with ${response.status}`,
        message: await response.text(),
      }, { status: 500 });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Proxy working! Next.js can reach FastAPI',
      data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Next.js cannot reach FastAPI on localhost:8000',
    }, { status: 500 });
  }
}
