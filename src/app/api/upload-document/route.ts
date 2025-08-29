import { NextRequest, NextResponse } from 'next/server';
import { documentUploadService } from '@/lib/services/documentUploadService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const documentType = formData.get('documentType') as 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';

    if (!file || !userId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, userId, documentType' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    let downloadURL: string;

    // Use appropriate upload method based on document type
    switch (documentType) {
      case 'profilePhoto':
        downloadURL = await documentUploadService.uploadProfilePhoto(userId, file);
        break;
      case 'aadhaarFront':
        downloadURL = await documentUploadService.uploadAadhaarFront(userId, file);
        break;
      case 'aadhaarBack':
        downloadURL = await documentUploadService.uploadAadhaarBack(userId, file);
        break;
      default:
        return NextResponse.json(
          { error: `Invalid document type: ${documentType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      url: downloadURL,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const documentType = searchParams.get('documentType') as 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';

    if (!userId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, documentType' },
        { status: 400 }
      );
    }

    await documentUploadService.deleteDocument(userId, documentType);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const documentType = formData.get('documentType') as 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';

    if (!file || !userId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, userId, documentType' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    const downloadURL = await documentUploadService.replaceDocument(userId, documentType, file);

    return NextResponse.json({
      success: true,
      url: downloadURL,
    });
  } catch (error) {
    console.error('Document replace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Replace failed' },
      { status: 500 }
    );
  }
}