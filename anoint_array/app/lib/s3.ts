

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
// Avoid hard dependency on database-backed config for simple file writes.
// We will use WRITABLE_DIR when present, otherwise fall back to /tmp.
// If database config is available at runtime, we read it dynamically.

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

function shouldUseLocalFallback() {
  return (
    !process.env.AWS_ACCESS_KEY_ID ||
    process.env.NODE_ENV === 'development' ||
    process.env.FORCE_LOCAL_UPLOADS === '1'
  );
}

// Backwards/compat constant for areas of this module that check a variable
// rather than a function. Keeps TypeScript happy during builds.
const useLocalFallback = shouldUseLocalFallback();

async function getLocalBaseDir() {
  // Prefer a repo-local uploads directory when writable (ideal for local/dev).
  const repoUploads = path.join(process.cwd(), 'uploads');
  try {
    if (!existsSync(repoUploads)) await mkdir(repoUploads, { recursive: true });
    return repoUploads;
  } catch {
    // read-only filesystem (e.g., Vercel); fall back below
  }

  let writable = process.env.WRITABLE_DIR || '/tmp';
  try {
    const mod = await import('@/lib/app-config');
    if (typeof mod.getConfig === 'function') {
      const cfg = await (mod.getConfig as any)('generator-config');
      writable = process.env.WRITABLE_DIR || cfg?.system?.writableDir || '/tmp';
    }
  } catch {
    // ignore — use env/default
  }
  const base = path.join(writable, 'uploads');
  if (!existsSync(base)) await mkdir(base, { recursive: true });
  return base;
}

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

    if (shouldUseLocalFallback()) {
      // Use local storage as fallback
      const uploadsDir = await getLocalBaseDir();

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
        cloudStoragePath: `uploads/${finalFilename}`,
        publicUrl: `/api/files/uploads/${finalFilename}`,
      };
    } else {
      // Use S3 for production, but gracefully fall back to local on credential errors
      const key = `${folderPrefix}${filename}`;

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        // Make files publicly readable
        ACL: 'public-read' as const,
      };

      try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Generate public URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

        return {
          success: true,
          cloudStoragePath: key,
          publicUrl,
        };
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        const code = String(err?.name || err?.Code || '');
        // If AWS credentials are invalid or unavailable, transparently write to local storage
        if (/InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|UnknownEndpoint|CredentialsError/i.test(msg + code)) {
          try {
            const uploadsDir = await getLocalBaseDir();

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
              cloudStoragePath: `uploads/${finalFilename}`,
              publicUrl: `/api/files/uploads/${finalFilename}`,
            };
          } catch (localErr: any) {
            return { success: false, cloudStoragePath: '', error: String(localErr?.message || localErr) };
          }
        }
        // For other errors, bubble up
        return { success: false, cloudStoragePath: '', error: msg || 'S3 upload failed' };
      }
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
    if (shouldUseLocalFallback()) {
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
      const base = await getLocalBaseDir();
      const filePath = path.join(base, key.replace(/^uploads\//, ''));
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
      const base = await getLocalBaseDir();
      const oldPath = path.join(base, oldKey.replace(/^uploads\//, ''));
      const newPath = path.join(base, newKey.replace(/^uploads\//, ''));
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
  if (shouldUseLocalFallback()) {
    return `/api/files/${key}`;
  } else {
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }
}
