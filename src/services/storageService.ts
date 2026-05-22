import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig } from '../config.js';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  }
});

/**
 * Generates a pre-signed URL for uploading a file to S3 (PUT).
 * Valid for 5 minutes.
 *
 * @param originalFilename - The original filename provided by the client
 * @param mimeType - The MIME type of the file (e.g. 'application/pdf')
 * @returns { uploadUrl, s3Key } — the signed PUT URL and the final key in the bucket
 */
export const generarPresignedPut = async (
  originalFilename: string,
  mimeType: string = 'application/pdf'
): Promise<{ uploadUrl: string; s3Key: string }> => {
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `cvs/${randomUUID()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: s3Key,
    ContentType: mimeType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min

  return { uploadUrl, s3Key };
};

/**
 * Generates a pre-signed URL for reading a file from S3 (GET).
 * Valid for 2 minutes.
 *
 * @param s3Key - The object key in the bucket
 * @returns The signed GET URL
 */
export const generarPresignedGet = async (s3Key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: s3Key
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 120 }); // 2 min
};
