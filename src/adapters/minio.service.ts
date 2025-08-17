import { randomUUID } from 'node:crypto'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface ArvoxMinioConfig {
  bucketName?: string
  baseUrl?: string
  accessKey?: string
  secretKey?: string
  region?: string
  forcePathStyle?: boolean
  nodeEnv?: string
}

export class ArvoxMinioService {
  private s3Client: S3Client
  private bucketName: string
  private baseUrl: string

  constructor(config: ArvoxMinioConfig = {}) {
    this.bucketName = config.bucketName || process.env.MINIO_BUCKET_NAME || 'images'
    this.baseUrl = config.baseUrl || process.env.MINIO_API_URL || 'http://localhost:9000'
    const accessKey = config.accessKey || process.env.MINIO_ACCESS_KEY || 'minioadmin'
    const secretKey = config.secretKey || process.env.MINIO_SECRET_KEY || 'minioadmin'
    const region = config.region || 'us-east-1'
    const forcePathStyle = config.forcePathStyle ?? true
    const isProduction = (config.nodeEnv || process.env.NODE_ENV) === 'production'

    this.s3Client = new S3Client({
      endpoint: this.baseUrl,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      },
      forcePathStyle,
      maxAttempts: 3,
      ...(isProduction
        ? {}
        : {
            requestHandler: {
              requestTimeout: 60000,
              httpsAgent: { rejectUnauthorized: false }
            }
          })
    })
  }

  async uploadFile(file: File, folder: string): Promise<{ id: string; url: string }> {
    const id = randomUUID()
    const extension = this.getFileExtension(file.type)
    const fileName = `${folder}/${id}.${extension}`
    const buffer = await file.arrayBuffer()

    const commandOptions: any = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
      ContentLength: file.size
    }

    // ZIP/Archive
    if (file.type.includes('zip') || file.name.endsWith('.zip')) {
      commandOptions.ContentType = 'application/zip'
      commandOptions.ContentDisposition = 'attachment'
      commandOptions.ContentEncoding = 'identity'
      commandOptions.Metadata = {
        'original-type': file.type,
        'file-category': 'archive'
      }
    }
    // HTML/Text
    if ((file.type.includes('html') || file.type.includes('text')) && folder === 'games') {
      commandOptions.ContentType = 'application/octet-stream'
      commandOptions.ContentDisposition = 'attachment'
      commandOptions.Metadata = {
        'original-type': file.type,
        'file-category': 'game-content'
      }
    }

    const command = new PutObjectCommand(commandOptions)
    await this.s3Client.send(command)
    return { id, url: `${this.baseUrl}/${this.bucketName}/${fileName}` }
  }

  async deleteFile(folder: string, fileId: string, extension: string): Promise<boolean> {
    try {
      const fileName = `${folder}/${fileId}.${extension}`
      const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: fileName })
      await this.s3Client.send(command)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(folder: string, fileId: string, extension: string, expiresIn: number = 3600): Promise<string> {
    const fileName = `${folder}/${fileId}.${extension}`
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: fileName })
    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async fileExists(folder: string, fileId: string, extension: string): Promise<boolean> {
    try {
      const fileName = `${folder}/${fileId}.${extension}`
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: fileName })
      await this.s3Client.send(command)
      return true
    } catch {
      return false
    }
  }

  async downloadFile(folder: string, fileId: string, extension: string): Promise<ArrayBuffer> {
    const fileName = `${folder}/${fileId}.${extension}`
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: fileName })
    const response = await this.s3Client.send(command)
    if (!response.Body) throw new Error('File not found or empty')
    const chunks: Uint8Array[] = []
    const reader = response.Body.transformToWebStream().getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    reader.releaseLock()
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result.buffer
  }

  getPublicUrl(folder: string, fileId: string, extension: string): string {
    return `${this.baseUrl}/${this.bucketName}/${folder}/${fileId}.${extension}`
  }

  private getFileExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/zip': 'zip',
      'text/html': 'html',
      'application/javascript': 'js',
      'application/json': 'json',
      'application/x-shockwave-flash': 'swf'
    }
    return mimeToExt[mimeType] || 'bin'
  }
}
