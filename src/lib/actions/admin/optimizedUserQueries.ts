'use server'

import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

import type { Query, DocumentData } from 'firebase-admin/firestore';

const UserRoleEnum = z.enum([
  'admin',
  'captain',
  'player',
  'general_volunteer',
  'technical_volunteer',
  'verification_volunteer',
  'volunteer', // virtual aggregate (maps to the three volunteer roles)
  'all'
] as const);

const AdminUserFiltersSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),

  role: UserRoleEnum.default('all'),
  gender: z.enum(['M', 'F', 'O', 'all']).default('all'),
  district: z.string().optional(),
  panchayat: z.string().optional(),
  isVerified: z.enum(['all', 'verified', 'pending']).default('all'),
  isProfileComplete: z.enum(['all', 'true', 'false']).default('all'),

  searchQuery: z.string().max(100).optional(), // name/phone/email

  sortBy: z.enum(['createdAt', 'firstName', 'lastName', 'role', 'district']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export async function getAdminUsers(
  filters: z.infer<typeof AdminUserFiltersSchema>,
  requestingUserId: string
) {
  try {
    // Authorization: only admins
    const requesterDoc = await adminDb.collection('users').doc(requestingUserId).get();
    if (!requesterDoc.exists || requesterDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required', users: [] };
    }

    const validated = AdminUserFiltersSchema.parse(filters);

    let query: Query<DocumentData> = adminDb.collection('users');

    // Apply simple indexed filters first
    if (validated.gender !== 'all') {
      query = query.where('gender', '==', validated.gender);
    }

    // Role filter
    if (validated.role !== 'all') {
      if (validated.role === 'volunteer') {
        query = query.where('role', 'in', [
          'general_volunteer',
          'technical_volunteer',
          'verification_volunteer'
        ]);
      } else {
        query = query.where('role', '==', validated.role);
      }
    }

    if (validated.district) {
      query = query.where('district', '==', validated.district);
    }

    if (validated.panchayat) {
      query = query.where('panchayat', '==', validated.panchayat);
    }

    if (validated.isVerified !== 'all') {
      query = query.where('isVerified', '==', validated.isVerified === 'verified');
    }

    if (validated.isProfileComplete !== 'all') {
      query = query.where('isProfileComplete', '==', validated.isProfileComplete === 'true');
    }

    // Fetch with a buffer for client-side search/sort
    const queryLimit = Math.min(validated.limit * 3, 300);
    const snapshot = await query.limit(queryLimit).get();

    let users = snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        uid: data.uid ?? doc.id,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        phoneNumber: data.phoneNumber ?? '',
        email: data.email ?? '',
        role: data.role ?? 'player',
        gender: data.gender ?? 'O',
        panchayat: data.panchayat ?? data.village ?? '',
        district: data.district ?? '',
        state: data.state ?? '',
        isVerified: !!data.isVerified,
        isProfileComplete: !!data.isProfileComplete,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      } as any;
    });

    // Client-side search
    if (validated.searchQuery) {
      const q = validated.searchQuery.toLowerCase();
      users = users.filter((u: any) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.phoneNumber || '').toString().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    // Client-side sort
    users.sort((a: any, b: any) => {
      const { sortBy } = validated;
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];

      if (sortBy === 'createdAt') {
        aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });

    if (validated.sortOrder === 'desc') users.reverse();

    // Pagination slice
    const start = validated.offset;
    const end = start + validated.limit;
    const paginated = users.slice(start, end);

    return {
      success: true,
      users: paginated,
      pagination: {
        limit: validated.limit,
        offset: validated.offset,
        count: paginated.length,
        total: users.length,
        hasMore: end < users.length
      }
    };
  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation error', users: [] };
    }
    return { success: false, error: 'Failed to fetch users', users: [] };
  }
}
