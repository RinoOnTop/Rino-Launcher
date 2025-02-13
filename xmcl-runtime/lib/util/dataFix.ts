import { PersistedResource, ResourceDomain } from '@xmcl/runtime-api'
import { openFileSystem } from '@xmcl/system'
import { existsSync, readJSON, stat, unlink, writeJSON } from 'fs-extra'
import { basename, extname, join, relative } from 'path'
import { URL } from 'url'
import { RESOURCE_FILE_VERSION } from '../constant'
import { forgeModParser } from '../entities/resourceParsers/forgeMod'
import { ResourceService } from '../services/ResourceService'
import { isSystemError } from './error'
import { ENOENT_ERROR, fileType } from './fs'
import { Logger } from './log'
import { isNonnull } from './object'

/**
 * The helper function to fix old resource schema
 */
export async function fixResourceSchema({ log, warn }: Logger, filePath: string, schema: any, dataRoot: string) {
  let dirty = false
  if ('path' in schema && !schema.fileName) {
    const relativePath = relative(dataRoot, (schema as any).path)
    const ext = extname(relativePath)
    schema.fileName = basename(relativePath, ext)
    log(`Fix location ${schema.path} ${schema.fileName}`)
    dirty = true
  }
  if ('source' in (schema as any)) {
    const source = (schema as any).source
    schema.uri = source.uri
    schema.curseforge = source.uri
    schema.github = source.github
    schema.date = source.date
    dirty = true
  }

  if (schema.type === 'forge' && RESOURCE_FILE_VERSION < 1) {
    // fix forge metadata
    log(`Fix ${filePath} file version: ${schema.version} -> ${RESOURCE_FILE_VERSION}`)
    const fs = await openFileSystem(join(dataRoot, schema.location + schema.ext))
    const data = await forgeModParser.parseMetadata(fs, filePath)
    fs.close()
    schema.metadata = data
    schema.version = RESOURCE_FILE_VERSION
    log(`Re-parsed ${filePath} as forge mod`)
    await writeJSON(filePath, schema)
    dirty = true
  }

  if (RESOURCE_FILE_VERSION < 2 || !schema.fileName) {
    if (typeof schema.location === 'string') {
      schema.fileName = basename(schema.location)
      schema.version = RESOURCE_FILE_VERSION
    }
  }

  if (schema.tags instanceof Array) {
    schema.tags = schema.tags.map((v: string) => {
      if (v.startsWith('fabric:///')) {
        return v.replace('fabric:///', 'fabric:').replace('/', ':')
      } else if (v.startsWith('forge:///')) {
        return v.replace('forge:///', 'forge:').replace('/', ':')
      } else if (v.startsWith('mcbbs://modpack/')) {
        return v.replace('mcbbs://modpack/', 'mcbbs:modpack:').replace('/', ':')
      } else if (v.startsWith('modrinth://modpack/')) {
        return v.replace('modrinth://modpack/', 'modrinth:modpack:').replace('/', ':')
      } else if (v.startsWith('curseforge://name/')) {
        return v.replace('curseforge://name/', 'curseforge:modpack:').replace('/', ':')
      }
      return v
    })
  }
}

export async function migrateToDatabase(this: ResourceService, domain: ResourceDomain, files: string[]) {
  const loadMetadata = async (metadataPath: string) => {
    const resourceData = await readJSON(metadataPath) // this.resourceFile.readTo(filePath)
    await fixResourceSchema({ log: this.log, warn: this.warn, error: this.error }, metadataPath, resourceData, this.getPath())

    const ext = extname(metadataPath)
    let imagePath = metadataPath.substring(0, metadataPath.length - ext.length) + '.png'
    let urlPath = ''
    if (existsSync(imagePath)) {
      urlPath = await this.addImage(imagePath)
    }

    if (resourceData.iconUri) {
      if (resourceData.iconUri.startsWith('dataroot:')) {
        try {
          const u = new URL(resourceData.iconUri)
          imagePath = this.getPath(u.pathname)
          if (existsSync(imagePath)) {
            urlPath = await this.addImage(imagePath)
          }
        } catch (e) {

        }
      }
    }

    const resourceFilePath = this.getPath(resourceData.domain, resourceData.fileName) + resourceData.ext
    const { size, ino } = await stat(resourceFilePath)
    const resource: PersistedResource<any> = ({
      version: 1,
      fileName: resourceData.fileName + resourceData.ext,
      name: resourceData.name,
      domain: resourceData.domain,
      type: resourceData.type,
      metadata: resourceData.metadata,
      fileType: resourceData.fileType || await fileType(resourceFilePath),
      uri: resourceData.uri,
      tags: resourceData.tags,
      hash: resourceData.hash,
      path: resourceFilePath,
      storedPath: resourceFilePath,
      storedDate: resourceData.date,
      size,
      ino,
      curseforge: resourceData.curseforge,
      modrinth: resourceData.modrinth,
      github: resourceData.github,
      iconUrl: urlPath || (resourceData.iconUri ?? ''),
    })

    await unlink(metadataPath).catch(() => { })
    if (urlPath) {
      await unlink(imagePath).catch(() => { })
    }
    return resource
  }
  const processFile = async (file: string) => {
    if (!file.endsWith('.json')) return
    try {
      const resource = await loadMetadata(file)

      await this.storage.put(resource.hash, resource)
      return resource
    } catch (e) {
      if (isSystemError(e) && e.code === ENOENT_ERROR) {
        this.warn(`The resource file ${file} cannot be found! Try remove this resource record!`)
        unlink(file).catch(() => { })
      } else {
        this.error(`Cannot load resource ${file}`)
        this.error(e)
      }
    }
  }
  const result = await Promise.all(files.map(processFile).filter(isNonnull))
  this.log(`Load ${result.length} legacy resources in domain ${domain}`);
  (this as any).commitResources(result.filter(isNonnull))
}
