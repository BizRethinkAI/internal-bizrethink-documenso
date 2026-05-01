import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import slugify from '@sindresorhus/slugify';
import path from 'node:path';

import { env } from '@documenso/lib/utils/env';

import { ONE_HOUR, ONE_SECOND } from '../../constants/time';
import { alphaid } from '../id';

export const getPresignPostUrl = async (fileName: string, contentType: string, userId?: number) => {
  const { client, bucket } = await getS3Client();

  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  // Get the basename and extension for the file
  const { name, ext } = path.parse(fileName);

  let slugified = slugify(name);

  // If the slugified name is empty or too long, generate a random string instead
  //
  // This is fine since we don't really need the filename in s3 since we store it
  // in the database and can always get the original filename from there.
  //
  // The slugified name can be empty when a string contains only CJK or other
  // special characters.
  if (slugified.length === 0 || slugified.length > 100) {
    slugified = alphaid(8);
  }

  let key = `${alphaid(12)}/${slugified}${ext}`;

  if (userId) {
    key = `${userId}/${key}`;
  }

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, putObjectCommand, {
    expiresIn: ONE_HOUR / ONE_SECOND,
  });

  return { key, url };
};

export const getAbsolutePresignPostUrl = async (key: string) => {
  const { client, bucket } = await getS3Client();

  const { getSignedUrl: getS3SignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getS3SignedUrl(client, putObjectCommand, {
    expiresIn: ONE_HOUR / ONE_SECOND,
  });

  return { key, url };
};

export const getPresignGetUrl = async (key: string) => {
  // MODIFIED for BizRethink (overlay 013): distribution settings come from
  // BizrethinkInstanceStorageConfig first, with env fallback.
  const settings = await resolveStorageSettings();

  if (settings.distributionDomain) {
    const distributionUrl = new URL(key, settings.distributionDomain);

    const { getSignedUrl: getCloudfrontSignedUrl } = await import('@aws-sdk/cloudfront-signer');

    const url = getCloudfrontSignedUrl({
      url: distributionUrl.toString(),
      keyPairId: `${settings.distributionKeyId}`,
      privateKey: `${settings.distributionKeyPem}`,
      dateLessThan: new Date(Date.now() + ONE_HOUR).toISOString(),
    });

    return { key, url };
  }

  const { client, bucket } = await getS3Client();

  const { getSignedUrl: getS3SignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const getObjectCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getS3SignedUrl(client, getObjectCommand, {
    expiresIn: ONE_HOUR / ONE_SECOND,
  });

  return { key, url };
};

/**
 * Uploads a file to S3.
 */
export const uploadS3File = async (file: File) => {
  const { client, bucket } = await getS3Client();

  // Get the basename and extension for the file
  const { name, ext } = path.parse(file.name);

  const key = `${alphaid(12)}/${slugify(name)}${ext}`;

  const fileBuffer = await file.arrayBuffer();

  const response = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type,
    }),
  );

  return { key, response };
};

export const deleteS3File = async (key: string) => {
  const { client, bucket } = await getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};

// MODIFIED for BizRethink (overlay 013): resolved settings come from
// BizrethinkInstanceStorageConfig singleton row first, with env fallback.
type ResolvedStorageSettings = {
  bucket: string | undefined;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  region: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  distributionDomain: string | undefined;
  distributionKeyId: string | undefined;
  distributionKeyPem: string | undefined;
};

const resolveStorageSettings = async (): Promise<ResolvedStorageSettings> => {
  const { getInstanceStorageConfig } = await import(
    '@bizrethink/customizations/server-only/instance-storage-config'
  );
  const db = await getInstanceStorageConfig();

  return {
    bucket: db?.s3Bucket ?? env('NEXT_PRIVATE_UPLOAD_BUCKET'),
    endpoint: db?.s3Endpoint ?? env('NEXT_PRIVATE_UPLOAD_ENDPOINT') ?? undefined,
    forcePathStyle: db?.s3ForcePathStyle ?? env('NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE') === 'true',
    region: db?.s3Region ?? env('NEXT_PRIVATE_UPLOAD_REGION') ?? 'us-east-1',
    accessKeyId: db?.s3AccessKeyId ?? env('NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID'),
    secretAccessKey: db?.s3SecretAccessKey ?? env('NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY'),
    distributionDomain: db?.s3DistributionDomain ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_DOMAIN'),
    distributionKeyId: db?.s3DistributionKeyId ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID'),
    distributionKeyPem:
      db?.s3DistributionKeyPem ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS'),
  };
};

const getS3Client = async (): Promise<{ client: S3Client; bucket: string | undefined }> => {
  const settings = await resolveStorageSettings();

  const hasCredentials = settings.accessKeyId && settings.secretAccessKey;

  const client = new S3Client({
    endpoint: settings.endpoint,
    forcePathStyle: settings.forcePathStyle,
    region: settings.region,
    credentials: hasCredentials
      ? {
          accessKeyId: String(settings.accessKeyId),
          secretAccessKey: String(settings.secretAccessKey),
        }
      : undefined,
  });

  return { client, bucket: settings.bucket };
};
