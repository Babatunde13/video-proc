#!/bin/bash
set -e

echo "Creating S3 bucket: my-video-bucket"
awslocal s3 mb s3://my-video-bucket || true

echo "Applying CORS config"
awslocal s3api put-bucket-cors \
  --bucket my-video-bucket \
  --cors-configuration file:///etc/localstack/init/ready.d/s3-cors.json
