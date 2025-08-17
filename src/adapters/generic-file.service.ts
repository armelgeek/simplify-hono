import { ArvoxMinioService } from './minio.service'

export interface ArvoxFileServiceOptions {
  folder: string
  allowedMimeTypes?: string[]
  maxSize?: number
  possibleExtensions?: string[]
}

export class ArvoxFileService {
  private readonly minioService: ArvoxMinioService
  private readonly folder: string
  private readonly allowedMimeTypes: string[]
  private readonly maxSize: number
  private readonly possibleExtensions: string[]

  constructor(options: ArvoxFileServiceOptions, minioService?: ArvoxMinioService) {
    this.folder = options.folder
    this.allowedMimeTypes = options.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    this.maxSize = options.maxSize || 10 * 1024 * 1024 // 10MB par défaut
    this.possibleExtensions = options.possibleExtensions || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    this.minioService = minioService || new ArvoxMinioService()
  }

  async upload(file: File): Promise<{ id: string; url: string }> {
    if (!this.allowedMimeTypes.includes(file.type)) {
      throw new Error('Type de fichier non autorisé')
    }
    if (file.size > this.maxSize) {
      throw new Error(`La taille du fichier ne doit pas dépasser ${this.maxSize / 1024 / 1024}MB`)
    }
    return await this.minioService.uploadFile(file, this.folder)
  }

  async delete(id: string): Promise<boolean> {
    for (const ext of this.possibleExtensions) {
      const exists = await this.minioService.fileExists(this.folder, id, ext)
      if (exists) {
        return await this.minioService.deleteFile(this.folder, id, ext)
      }
    }
    return false
  }

  async exists(id: string): Promise<boolean> {
    for (const ext of this.possibleExtensions) {
      const exists = await this.minioService.fileExists(this.folder, id, ext)
      if (exists) {
        return true
      }
    }
    return false
  }

  getPublicUrl(id: string, extension: string): string {
    return this.minioService.getPublicUrl(this.folder, id, extension)
  }

  async getSignedUrl(id: string, extension: string): Promise<string> {
    return await this.minioService.getSignedUrl(this.folder, id, extension)
  }
}
