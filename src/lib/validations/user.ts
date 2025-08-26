import { z } from 'zod'
import {
  userRoleSchema,
  genderSchema,
  phoneSchema,
  emailSchema,
  paginationSchema,
  sortOrderSchema,
  verificationTypeSchema,
  verificationStatusSchema,
  uuidSchema,
} from './common'

// User creation/update schemas
export const createUserSchema = z.object({
  phone: phoneSchema,
  email: emailSchema,
  role: userRoleSchema.default('public'),
  languagePreference: z.string().max(10).optional().default('en'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderSchema.optional(),
  whatsappNumber: phoneSchema.optional(),
  instagramHandle: z.string().max(100).optional(),
  panchayat: z.string().max(100).optional(),
  taluk: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
})

export const updateUserSchema = createUserSchema.partial().extend({
  id: uuidSchema,
})

export const updateUserProfileSchema = z.object({
  id: uuidSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.coerce.date(),
  gender: genderSchema,
  whatsappNumber: phoneSchema.optional(),
  instagramHandle: z.string().max(100).optional(),
  panchayat: z.string().max(100),
  taluk: z.string().max(100),
  district: z.string().max(100),
  state: z.string().max(100),
  pincode: z.string().max(10).optional(),
})

// User verification schemas
export const createUserVerificationSchema = z.object({
  userId: uuidSchema,
  verificationType: verificationTypeSchema,
  status: verificationStatusSchema.default('pending'),
})

export const updateUserVerificationSchema = z.object({
  id: uuidSchema,
  status: verificationStatusSchema,
  verifiedBy: uuidSchema.optional(),
})

// User profile image schemas
export const uploadProfileImageSchema = z.object({
  userId: uuidSchema,
  profilePhotoPath: z.string().max(500).optional(),
  aadhaarFrontPath: z.string().max(500).optional(),
  aadhaarBackPath: z.string().max(500).optional(),
})

export const verifyProfileImagesSchema = z.object({
  userId: uuidSchema,
  verifiedBy: uuidSchema,
  approved: z.boolean(),
})

// Query schemas
export const getUserByIdSchema = z.object({
  id: uuidSchema,
})

export const getUserByPhoneSchema = z.object({
  phone: phoneSchema,
})

export const getUsersSchema = paginationSchema.extend({
  role: userRoleSchema.optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  verificationStatus: verificationStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'role']).default('createdAt'),
  sortOrder: sortOrderSchema,
})

export const getUserVerificationsSchema = z.object({
  userId: uuidSchema,
})

export const getPendingVerificationsSchema = paginationSchema.extend({
  verificationType: verificationTypeSchema.optional(),
  district: z.string().optional(),
  state: z.string().optional(),
})

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type CreateUserVerificationInput = z.infer<typeof createUserVerificationSchema>
export type UpdateUserVerificationInput = z.infer<typeof updateUserVerificationSchema>
export type UploadProfileImageInput = z.infer<typeof uploadProfileImageSchema>
export type VerifyProfileImagesInput = z.infer<typeof verifyProfileImagesSchema>
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>
export type GetUserByPhoneInput = z.infer<typeof getUserByPhoneSchema>
export type GetUsersInput = z.infer<typeof getUsersSchema>
export type GetUserVerificationsInput = z.infer<typeof getUserVerificationsSchema>
export type GetPendingVerificationsInput = z.infer<typeof getPendingVerificationsSchema>