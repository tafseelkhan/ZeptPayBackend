// import Tesseract from 'tesseract.js';
// import { DetectedCardData } from '../types/ocrtypes';
// import { ImageUtils } from '../utils/ocrImageUtils';

// export class OcrService {
  
//   // Main OCR processing
//   async processImage(base64Image: string): Promise<DetectedCardData> {
//     let tempPath: string | null = null;
//     let processedPath: string | null = null;
    
//     try {
//       console.log('📸 Saving temp image...');
//       tempPath = await ImageUtils.saveBase64Image(base64Image);
      
//       console.log('🖼️ Preprocessing image...');
//       processedPath = await ImageUtils.preprocessImage(tempPath);
      
//       console.log('🔍 Running OCR...');
//       const { data: { text } } = await Tesseract.recognize(
//         processedPath,
//         'eng',
//         {
//           logger: (m) => {
//             if (m.status === 'recognizing text') {
//               console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
//             }
//           }
//         }
//       );
      
//       console.log('📝 Raw OCR Text:', text);
      
//       // Extract card details
//       const cardNumber = this.extractCardNumber(text);
//       const expiry = this.extractExpiry(text);
//       const name = this.extractCardholderName(text);
//       const cardType = this.detectCardType(cardNumber);
//       const isValid = this.validateLuhn(cardNumber) && this.validateExpiry(expiry);
      
//       return {
//         cardNumber: this.formatCardNumber(cardNumber),
//         expiry,
//         name,
//         cardType,
//         isValid
//       };
      
//     } catch (error) {
//       console.error('❌ OCR Processing Error:', error);
//       throw error;
//     } finally {
//       // Cleanup temp files
//       if (tempPath) await ImageUtils.cleanupFile(tempPath);
//       if (processedPath) await ImageUtils.cleanupFile(processedPath);
//     }
//   }
  
//   // ============== CARD DETAILS EXTRACTION ==============
  
//   private extractCardNumber(text: string): string {
//     const cleanText = text.replace(/\n/g, ' ');
    
//     const patterns = [
//       /\b(?:\d[ -]*?){13,19}\b/g,
//       /\b(?:\d{4}[ -]?){3,4}\d{0,4}\b/g,
//       /\b(?:4\d{3}[ -]?){3,4}\d{0,4}\b/g,
//       /\b(?:5[1-5]\d{2}[ -]?){3,4}\d{0,4}\b/g,
//       /\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g,
//     ];
    
//     for (const pattern of patterns) {
//       const matches = cleanText.match(pattern);
//       if (matches && matches.length > 0) {
//         const longestMatch = matches.sort((a, b) => b.length - a.length)[0];
//         const cleaned = longestMatch.replace(/[^\d]/g, '');
//         if (cleaned.length >= 13 && cleaned.length <= 19) {
//           return cleaned;
//         }
//       }
//     }
//     return '';
//   }
  
//   private extractExpiry(text: string): string {
//     const cleanText = text.replace(/\n/g, ' ');
    
//     const patterns = [
//       /\b(0[1-9]|1[0-2])\s*[\/\-]\s*([0-9]{2,4})\b/g,
//       /\b(0[1-9]|1[0-2])([0-9]{2})\b(?!\d)/g,
//       /(?:expires?|valid|thru?|good)\s*(?:thru?)?\s*(?:date)?\s*:?\s*(0[1-9]|1[0-2])[\/\-]\s*([0-9]{2,4})/gi,
//     ];
    
//     for (const pattern of patterns) {
//       const matches = cleanText.match(pattern);
//       if (matches && matches.length > 0) {
//         let expiry = matches[0].replace(/[^\d\/]/g, '');
        
//         if (expiry.includes('/')) {
//           const [month, year] = expiry.split('/');
//           return `${month.padStart(2, '0')}/${year.slice(-2)}`;
//         } else if (expiry.length === 4) {
//           return `${expiry.slice(0, 2)}/${expiry.slice(2, 4)}`;
//         } else if (expiry.length === 6) {
//           return `${expiry.slice(0, 2)}/${expiry.slice(4, 6)}`;
//         }
//       }
//     }
//     return '';
//   }
  
//   private extractCardholderName(text: string): string {
//     const cleanText = text.replace(/\n/g, ' ');
    
//     const falsePositives = [
//       'VALID', 'THRU', 'GOOD', 'CARD', 'MEMBER', 'SINCE',
//       'MONTH', 'YEAR', 'EXPIRES', 'EXPIRY', 'DATE', 'FROM',
//       'TO', 'UNTIL', 'AUTHORIZED', 'SIGNATURE', 'NOT VALID',
//       'VOID', 'SAMPLE', 'TEST', 'PLATINUM', 'GOLD', 'SILVER',
//       'BUSINESS', 'CORPORATE', 'CLASSIC', 'STANDARD'
//     ];
    
//     const nameRegex = /\b([A-Z]{2,}(?:\s+[A-Z]{2,})+)\b/g;
//     const matches = cleanText.match(nameRegex);
    
//     if (matches && matches.length > 0) {
//       const validNames = matches.filter(name => {
//         const words = name.split(/\s+/);
//         const hasFalsePositive = words.some(word =>
//           falsePositives.includes(word) ||
//           word.length < 2 ||
//           /^\d+$/.test(word)
//         );
//         const hasValidWordCount = words.length >= 2 && words.length <= 4;
//         return !hasFalsePositive && hasValidWordCount;
//       });
      
//       if (validNames.length > 0) {
//         const longestName = validNames.sort((a, b) => b.length - a.length)[0];
//         return longestName.trim();
//       }
//     }
//     return '';
//   }
  
//   private formatCardNumber(cardNumber: string): string {
//     const cleaned = cardNumber.replace(/\D/g, '');
//     const groups = [];
//     for (let i = 0; i < cleaned.length; i += 4) {
//       groups.push(cleaned.slice(i, i + 4));
//     }
//     return groups.join(' ');
//   }
  
//   private detectCardType(cardNumber: string): DetectedCardData['cardType'] {
//     const cleaned = cardNumber.replace(/\D/g, '');
//     if (!cleaned) return 'unknown';
    
//     if (/^4/.test(cleaned)) return 'visa';
//     if (/^5[1-5]/.test(cleaned) || /^2(2[2-9][1-9]|2[3-9]|[3-6]|7[0-1]|720)/.test(cleaned)) {
//       return 'mastercard';
//     }
//     if (/^(60|65|81|82|508)/.test(cleaned)) return 'rupay';
//     if (/^3[47]/.test(cleaned)) return 'amex';
//     if (/^(6011|65|64[4-9]|622)/.test(cleaned)) return 'discover';
    
//     return 'unknown';
//   }
  
//   private validateLuhn(cardNumber: string): boolean {
//     if (!cardNumber) return false;
//     const digits = cardNumber.replace(/\D/g, '');
//     if (digits.length < 13 || digits.length > 19) return false;
    
//     let sum = 0;
//     let isEven = false;
//     for (let i = digits.length - 1; i >= 0; i--) {
//       let digit = parseInt(digits.charAt(i));
//       if (isEven) {
//         digit *= 2;
//         if (digit > 9) digit -= 9;
//       }
//       sum += digit;
//       isEven = !isEven;
//     }
//     return sum % 10 === 0;
//   }
  
//   private validateExpiry(expiry: string): boolean {
//     if (!expiry || !expiry.includes('/')) return false;
    
//     const [month, year] = expiry.split('/');
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear() % 100;
//     const currentMonth = currentDate.getMonth() + 1;
    
//     const expMonth = parseInt(month, 10);
//     const expYear = parseInt(year, 10);
    
//     if (expMonth < 1 || expMonth > 12) return false;
//     if (expYear < currentYear) return false;
//     if (expYear === currentYear && expMonth < currentMonth) return false;
//     if (expYear > currentYear + 20) return false;
    
//     return true;
//   }
// }