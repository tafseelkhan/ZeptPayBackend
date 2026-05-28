import express from 'express';
import { getCountryData } from '../../../controllers/Test/Payment/countryController';

const router = express.Router();

// Single API endpoint
router.post('/get-country', getCountryData);

export default router;