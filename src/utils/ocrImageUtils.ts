import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class ImageUtils {
  static async preprocessImage(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.jpg$/, '_processed.jpg');
    
    await sharp(inputPath)
      .resize(1200, null, { fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(outputPath);
    
    return outputPath;
  }

  static async saveBase64Image(base64Data: string): Promise<string> {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `temp_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);
    
    // Remove data:image prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.includes('base64,')) {
      cleanBase64 = base64Data.split('base64,')[1];
    }
    
    fs.writeFileSync(filePath, cleanBase64, 'base64');
    return filePath;
  }

  static async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}