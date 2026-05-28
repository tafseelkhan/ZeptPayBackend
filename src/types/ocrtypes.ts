export interface DetectedCardData {
  cardNumber: string;
  expiry: string;
  name: string;
  cardType: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'discover' | 'unknown';
  isValid: boolean;
}

export interface OcrRequest {
  image: string; // base64 string
}

export interface OcrResponse {
  success: boolean;
  data: DetectedCardData;
  rawText?: string;
  error?: string;
}

export interface OcrUploadResponse {
  success: boolean;
  data: DetectedCardData;
  rawText?: string;
  error?: string;
}