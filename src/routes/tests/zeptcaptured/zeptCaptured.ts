import { authMiddleware } from '../../../middleware/authMiddleware';
import express from "express";
import { createDeveloper } from "../../../controllers/tests/zeptcaptured/zeptCaptured";

const router = express.Router();

router.post("/create", authMiddleware, createDeveloper);

export default router;
