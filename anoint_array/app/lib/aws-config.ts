

import { S3Client } from '@aws-sdk/client-s3';

interface BucketConfig {
  bucketName: string;
  folderPrefix: string;
}

export function getBucketConfig(): BucketConfig {
  return {
    bucketName: process.env.AWS_BUCKET_NAME || 'anoint-product-images',
    folderPrefix: process.env.AWS_FOLDER_PREFIX || 'products/',
  };
}

export function createS3Client(): S3Client {
  // For development, we'll use LocalStack or MinIO if available
  // For production, this will use AWS credentials from environment
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    } : undefined,
    // Allow custom endpoint for local development (LocalStack/MinIO)
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: !!process.env.AWS_ENDPOINT_URL, // Required for local S3 services
  });
}
