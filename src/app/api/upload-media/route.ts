import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const venueId = formData.get('venueId') as string;

    if (!file || !userId || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, userId, entityType, entityId' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for media)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type (images and videos)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      );
    }

    // Get user and validate permissions
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!['admin', 'technical_volunteer'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only technical volunteers and admins can upload media' },
        { status: 403 }
      );
    }

    // For technical volunteers, validate venue assignment
    if (user.role === 'technical_volunteer' && venueId) {
      const assignment = await db.volunteerAssignment.findFirst({
        where: {
          volunteerId: userId,
          venueLevelMapping: {
            venueId: venueId
          }
        }
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this venue' },
          { status: 403 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${entityType}_${entityId}_${timestamp}.${extension}`;
    const filePath = `media/${entityType}/${fileName}`;

    // In a real implementation, you would upload to cloud storage (S3, etc.)
    // For now, we'll simulate the upload and store metadata
    
    // Create media record in database
    const media = await db.media.create({
      data: {
        fileName: fileName,
        filePath: filePath,
        fileType: file.type,
        fileSize: BigInt(file.size),
        entityType: entityType as any,
        entityId: entityId,
        uploadedBy: userId,
        status: 'approved', // Auto-approve for technical volunteers
      }
    });

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        fileName: media.fileName,
        filePath: media.filePath,
        fileType: media.fileType,
        fileSize: Number(media.fileSize),
        status: media.status,
      }
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('id');

  if (!mediaId) {
    return NextResponse.json(
      { error: 'Media ID is required' },
      { status: 400 }
    );
  }

  try {
    const media = await db.media.findUnique({
      where: { id: mediaId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      media: {
        id: media.id,
        fileName: media.fileName,
        filePath: media.filePath,
        fileType: media.fileType,
        fileSize: Number(media.fileSize),
        status: media.status,
        uploadedBy: media.uploadedByUser,
        createdAt: media.createdAt,
      }
    });

  } catch (error) {
    console.error('Get media error:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
