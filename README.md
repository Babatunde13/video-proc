# 🚀 Video Proc

Welcome to the Video Proc, a robust and scalable solution for managing, streaming, and transcoding user-uploaded video content. Built with NestJS, this server leverages S3 for efficient storage, BullMQ for background processing, and HLS for adaptive bitrate streaming, all documented via Swagger.

Welcome to the Video Stream Server, a robust and scalable solution for managing, streaming, and transcoding user-uploaded video content. Built with NestJS and React, this server leverages S3 for efficient storage, BullMQ for background processing, and HLS for adaptive bitrate streaming, all documented via Swagger.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [Background Workers (BullMQ)](#background-workers-bullmq)
- [Database](#database)
- [Environment Variables](#environment-variables)

## Overview
The Video Proc provides a complete workflow for users to upload large video files, which are then processed, transcoded, and made available for adaptive bitrate streaming. It handles multi-part uploads to S3, manages video metadata in PostgreSQL, and uses a dedicated worker system for CPU-intensive tasks like video transcoding. It provides a simple frontend UI to test the uploading and streaming of large videos

## Features
- **Large File Uploads**: Supports efficient multi-part uploads for large video files directly to S3.

- **Pre-signed URLs**: Securely provides pre-signed URLs for clients to upload individual parts of a video directly to S3.

- **Background Transcoding**: Utilizes FFmpeg to transcode uploaded videos into HLS (HTTP Live Streaming) format for adaptive bitrate delivery.

- **Adaptive Bitrate Streaming**: Serves HLS manifest and segment files for smooth streaming across various network conditions and devices.

- **Video Metadata Management**: Stores and retrieves video metadata (ID, title, description, thumbnail, etc.) in a PostgreSQL database.

- **Asynchronous Processing**: Leverages Redis and BullMQ for robust, scalable background job processing.

- **API Documentation**: Comprehensive and interactive API documentation powered by Swagger.

## Architecture
The server adopts a microservice-oriented design principle, with clear separation of concerns:

- **NestJS API Server**: Handles all client-facing API requests, authentication, and orchestration of upload workflows.

- **AWS S3**: Primary storage for raw video uploads and transcoded HLS segments, in this project, localstack is used for AWS services.

- **PostgreSQL**: Relational database for storing video metadata, user information, and upload session details.

- **Redis**: Used as a message broker for BullMQ queues.

- **BullMQ Worker**: Dedicated background processes that pick up and execute CPU-intensive tasks like video transcoding (using FFmpeg).

- **Swagger**: Provides interactive API documentation for easy understanding and testing of endpoints.

## Getting Started
Follow these instructions to set up and run the Video Proc locally.

### Prerequisites
Before you begin, ensure you have the following installed:

- Docker & Docker Compose

### Installation
1. Clone the repository:


```bash
git clone https://github.com/Babatunde13/video-proc.git
cd video-proc
```
### Running the Application
You can edit the env file and change the values of the JWT secret key and expiration to any value of your choice. This will start all the dependencies, db, redis cache, localstack for local AWS access and a minimal hls web client to test the api. After the upload is done the front end is redirected to a page where all user uploaded videos are listed and if the hls transcoding isn't done the view button is disable otherwise it's enable and user can start streaming the video.

1. Run the container

```bash
docker-compose up
```

The API server will be accessible at http://localhost:PORT (default 3000).

## API Documentation (Swagger)
The API documentation is automatically generated using Swagger and is accessible at:
http://localhost:PORT/api/v1/docs (e.g., http://localhost:3000/api/v1/docs)

This interactive interface allows you to explore all available endpoints, their expected request/response schemas, and even test them directly from your browser.

## Background Workers (BullMQ)
The system uses BullMQ with Redis to manage a queue of background jobs, primarily for video transcoding.

Queue Name: `transcode`

Worker Functionality:

1. Downloads the raw video from S3.

2. Uses FFmpeg to transcode the video into various HLS renditions (different bitrates and resolutions).

3. Uploads the generated HLS manifest and segment files back to S3.

4. Updates the video's status in the PostgreSQL database (e.g., UPLOADED -> READY).

5. Handles errors and retries for failed jobs.

## Database
1. **Database**: PostgreSQL

2. **Schema Management**: Prisma

  - Prisma is used to define the database schema, and manage migrations.

  - Schema file: prisma/schema.prisma

3. **Query Builder**: Knex.js

## Environment Variables
All sensitive configurations are managed via environment variables. Refer to the .env.example file for a comprehensive list. Key variables include:

- `PORT`: Port the API server listens on.

- `DATABASE_URL`: Connection string for PostgreSQL.

- `REDIS_HOST`, `REDIS_PORT`: Connection details for Redis.

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ENDPOINT`(for localstack): AWS credentials for S3 interaction.

- `AWS_S3_BUCKET`: S3 bucket for storing all videos(uploaded and processed).

- `JWT_SECRET`: Secret key for JWT authentication.

- `JWT_EXPIRES`: JWT token expiration
- `VITE_API_URL`: Backend API URL

The docker compose correctly sets the default environment variables.