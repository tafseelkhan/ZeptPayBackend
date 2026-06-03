// src/routes/apiKeyRoutes.ts
import express from 'express';
import { updateApiKeyPermissions, getUserApiKeys, toggleApiKeyStatus } from '../../controllers/tests/apiKey/updatePermissions';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

router.get('/user', authMiddleware, getUserApiKeys);
router.patch(
  '/:apiKeyId/toggle',
  authMiddleware,
  toggleApiKeyStatus
);
router.patch('/:apiKeyId/permissions', authMiddleware, updateApiKeyPermissions);

export default router;
