

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

// Check if we should use local storage as fallback
const useLocalFallback = !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV === 'development';

export interface UploadResult {
  success: boolean;
  cloudStoragePath: string;
  publicUrl?: string;
  error?: string;
}

export async function uploadFile(buffer: Buffer, customFileName: string, contentType?: string): Promise<UploadResult> {
  try {
    // Use the provided filename directly (it should already be sanitized)
    let filename = customFileName;
    
    // If no extension is provided, try to extract from content type
    if (!filename.includes('.') && contentType) {
      const extension = contentType.split('/')[1];
      filename = `${filename}.${extension}`;
    }

    if (useLocalFallback) {
      // Use local storage as fallback
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Handle filename conflicts
      let finalFilename = filename;
      let counter = 1;
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      const extension = filename.split('.').pop() || '';
      
      while (existsSync(path.join(uploadsDir, finalFilename))) {
        finalFilename = `${nameWithoutExt}-${counter}.${extension}`;
        counter++;
      }

      const filePath = path.join(uploadsDir, finalFilename);
      await writeFile(filePath, buffer);

      return {
        success: true,
        cloudStoragePath: finalFilename, // Store just filename for local files
        publicUrl: `/api/files/${finalFilename}`,
      };
    } else {
      // Use S3 for production
      const key = `${folderPrefix}${filename}`;

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        // Make files publicly readable
        ACL: 'public-read' as const,
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      // Generate public URL
      const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

      return {
        success: true,
        cloudStoragePath: key,
        publicUrl: publicUrl,
      };
    }
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      cloudStoragePath: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function downloadFile(key: string): Promise<string> {
  try {
    if (useLocalFallback) {
      // For local files, just return the API URL
      return `/api/files/${key}`;
    } else {
      // For S3 files, generate signed URL
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // Generate a signed URL that expires in 1 hour
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    }
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  try {
    if (useLocalFallback) {
      // For local files, delete from filesystem
      const fs = await import('fs/promises');
      const filePath = path.join(process.cwd(), 'uploads', key);
      await fs.unlink(filePath);
      return true;
    } else {
      // For S3 files, delete from S3
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    }
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

export async function renameFile(oldKey: string, newKey: string): Promise<boolean> {
  try {
    if (useLocalFallback) {
      // For local files, rename in filesystem
      const fs = await import('fs/promises');
      const oldPath = path.join(process.cwd(), 'uploads', oldKey);
      const newPath = path.join(process.cwd(), 'uploads', newKey);
      await fs.rename(oldPath, newPath);
      return true;
    } else {
      // For S3 files, copy and delete
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldKey}`,
        Key: newKey,
      });

      await s3Client.send(copyCommand);

      // Delete original
      await deleteFile(oldKey);
      return true;
    }
  } catch (error) {
    console.error('Rename error:', error);
    return false;
  }
}

export function getPublicUrl(key: string): string {
  if (useLocalFallback) {
    return `/api/files/${key}`;
  } else {
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }
}
