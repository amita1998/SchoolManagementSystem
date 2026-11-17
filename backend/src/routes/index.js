import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import studentRoutes from './students.routes.js';
import teacherRoutes from './teachers.routes.js';
import academicRoutes from './academics.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/academics', academicRoutes);

export default router;
