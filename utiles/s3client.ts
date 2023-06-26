import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  credentials: {
    accessKeyId: String(process.env.ACCESS_KEY),
    secretAccessKey: String(process.env.SECRET_ACCESS_KEY),
  },
  region: String(process.env.BUCKET_REGION),
});

export { s3 };
