import { z } from 'zod';

const NAME = z.string().trim().min(1, 'Required').max(80, 'Too long');
const PHONE = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid mobile number');
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const ID = z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]);

export const STUDENT_STATUSES = [
  'new_admission',
  'active',
  'promoted',
  'academic_year_renewed',
  'graduated',
  'transferred',
  'withdrawn',
  'suspended',
];

const guardianSchema = z.object({
  fullName: NAME,
  relationship: z.enum(['father', 'mother', 'guardian']).default('guardian'),
  mobile: PHONE,
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
  occupation: z.string().trim().max(80).optional(),
  addressLine: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(10).optional(),
  isPrimary: z.boolean().optional(),
});

export const admissionSchema = z.object({
  firstName: NAME,
  lastName: NAME,
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: DATE,
  bloodGroup: z.string().trim().max(5).optional().nullable(),
  admissionDate: DATE,
  previousSchool: z.string().trim().max(160).optional().nullable(),
  classId: ID,
  sectionId: ID,
  academicYearId: ID.optional(),
  rollNo: z.coerce.number().int().min(0).max(999).optional().nullable(),
  createLogin: z.boolean().optional(),
  parents: z.array(guardianSchema).min(1, 'Add at least one parent or guardian').max(3),
});

export const updateStudentSchema = z.object({
  firstName: NAME,
  lastName: NAME,
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: DATE,
  bloodGroup: z.string().trim().max(5).optional().nullable(),
  previousSchool: z.string().trim().max(160).optional().nullable(),
});

export const studentStatusSchema = z.object({
  status: z.enum(STUDENT_STATUSES),
  effectiveDate: DATE,
  remarks: z.string().trim().max(500).optional(),
});

export const documentTypesSchema = z.array(z.string().trim().max(60)).max(6).optional();

// ---------------------------------------------------------------------------

export const teacherSchema = z.object({
  firstName: NAME,
  lastName: NAME,
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: DATE.optional().nullable(),
  mobile: PHONE,
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  address: z.string().trim().max(240).optional().nullable(),
  qualification: z.string().trim().max(120).optional().nullable(),
  experienceYears: z.coerce.number().min(0).max(60).optional().nullable(),
  joiningDate: DATE,
  assignments: z
    .array(z.object({ classId: ID, subjectId: ID }))
    .max(60)
    .optional(),
});

export const updateTeacherSchema = teacherSchema
  .omit({ email: true, assignments: true })
  .extend({ status: z.enum(['active', 'on_leave', 'resigned']).optional() });

export const teacherStatusSchema = z.object({
  status: z.enum(['active', 'on_leave', 'resigned']),
});

export const assignmentsSchema = z.object({
  items: z.array(z.object({ classId: ID, subjectId: ID })).max(60),
});

export const classTeacherSchema = z.object({
  sectionId: ID,
  effectiveFrom: DATE,
});

// ---------------------------------------------------------------------------

export const classSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(40),
  levelOrder: z.coerce.number().int().min(0).max(30),
  isPrePrimary: z.boolean().optional(),
  strengthLimit: z.coerce.number().int().min(1).max(200).optional(),
});

export const sectionSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(10),
  capacity: z.coerce.number().int().min(1).max(200).optional(),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(60),
  code: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, digits and dashes only'),
  isPrePrimary: z.boolean().optional(),
});

export const classSubjectsSchema = z.object({
  subjectIds: z.array(ID).max(40),
});

export const academicYearSchema = z
  .object({
    name: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Use the 2026-2027 format'),
    startDate: DATE,
    endDate: DATE,
  })
  .refine((data) => data.startDate < data.endDate, {
    path: ['endDate'],
    message: 'The end date must be after the start date',
  });
