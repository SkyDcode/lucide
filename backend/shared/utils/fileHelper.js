// backend/shared/utils/fileHelper.js - Utilitaires pour la gestion des fichiers

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

// Promisifier les fonctions fs pour utilisation async/await
const fsAccess = promisify(fs.access);
const fsStat = promisify(fs.stat);
const fsReaddir = promisify(fs.readdir);
const fsUnlink = promisify(fs.unlink);
const fsMkdir = promisify(fs.mkdir);
const fsRmdir = promisify(fs.rmdir);

/**
 * Classe utilitaire pour la gestion des fichiers
 */
class FileHelper {

  /**
   * Vérifier si un fichier ou dossier existe
   * @param {string} filePath - Chemin du fichier/dossier
   * @returns {Promise<boolean>} True si existe
   */
  static async exists(filePath) {
    try {
      await fsAccess(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les informations d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<Object|null>} Informations du fichier ou null
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fsStat(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      return {
        path: filePath,
        name: path.basename(filePath),
        nameWithoutExt: path.basename(filePath, extension),
        extension: extension,
        directory: path.dirname(filePath),
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode,
        mimeType: this.getMimeTypeFromExtension(extension)
      };
    } catch (error) {
      console.error('Erreur lecture fichier:', error);
      return null;
    }
  }

  /**
   * Créer un dossier de manière récursive
   * @param {string} dirPath - Chemin du dossier
   * @param {Object} options - Options de création
   * @returns {Promise<boolean>} True si créé avec succès
   */
  static async createDirectory(dirPath, options = { recursive: true }) {
    try {
      await fsMkdir(dirPath, options);
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return true; // Le dossier existe déjà
      }
      console.error('Erreur création dossier:', error);
      return false;
    }
  }

  /**
   * Supprimer un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async deleteFile(filePath) {
    try {
      await fsUnlink(filePath);
      return true;
    } catch (error) {
      console.error('Erreur suppression fichier:', error);
      return false;
    }
  }

  /**
   * Supprimer un dossier (vide uniquement)
   * @param {string} dirPath - Chemin du dossier
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async deleteDirectory(dirPath) {
    try {
      await fsRmdir(dirPath);
      return true;
    } catch (error) {
      console.error('Erreur suppression dossier:', error);
      return false;
    }
  }

  /**
   * Supprimer un dossier et tout son contenu (récursif)
   * @param {string} dirPath - Chemin du dossier
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async deleteDirectoryRecursive(dirPath) {
    try {
      if (!(await this.exists(dirPath))) {
        return true; // Le dossier n'existe pas
      }

      const files = await fsReaddir(dirPath);
      
      // Supprimer tous les fichiers et sous-dossiers
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fsStat(filePath);
        
        if (stats.isDirectory()) {
          await this.deleteDirectoryRecursive(filePath);
        } else {
          await this.deleteFile(filePath);
        }
      }
      
      // Supprimer le dossier vide
      await this.deleteDirectory(dirPath);
      return true;
    } catch (error) {
      console.error('Erreur suppression récursive:', error);
      return false;
    }
  }

  /**
   * Lister le contenu d'un dossier
   * @param {string} dirPath - Chemin du dossier
   * @param {Object} options - Options de listage
   * @returns {Promise<Array>} Liste des fichiers/dossiers
   */
  static async listDirectory(dirPath, options = {}) {
    try {
      const {
        includeHidden = false,
        filesOnly = false,
        dirsOnly = false,
        withStats = false
      } = options;

      const items = await fsReaddir(dirPath);
      let filteredItems = items;

      // Filtrer les fichiers cachés
      if (!includeHidden) {
        filteredItems = filteredItems.filter(item => !item.startsWith('.'));
      }

      // Enrichir avec les statistiques si demandé
      if (withStats || filesOnly || dirsOnly) {
        const itemsWithStats = await Promise.all(
          filteredItems.map(async (item) => {
            const itemPath = path.join(dirPath, item);
            const stats = await fsStat(itemPath);
            
            return {
              name: item,
              path: itemPath,
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime,
              ...(withStats && { stats })
            };
          })
        );

        // Filtrer par type si demandé
        if (filesOnly) {
          return itemsWithStats.filter(item => item.isFile);
        }
        if (dirsOnly) {
          return itemsWithStats.filter(item => item.isDirectory);
        }

        return itemsWithStats;
      }

      return filteredItems.map(item => ({
        name: item,
        path: path.join(dirPath, item)
      }));

    } catch (error) {
      console.error('Erreur listage dossier:', error);
      return [];
    }
  }

  /**
   * Copier un fichier
   * @param {string} sourcePath - Chemin source
   * @param {string} destPath - Chemin destination
   * @returns {Promise<boolean>} True si copié avec succès
   */
  static async copyFile(sourcePath, destPath) {
    try {
      // Créer le dossier de destination si nécessaire
      const destDir = path.dirname(destPath);
      await this.createDirectory(destDir);

      // Utiliser fs.copyFile si disponible (Node.js 8.5+)
      if (fs.copyFile) {
        const fsCopyFile = promisify(fs.copyFile);
        await fsCopyFile(sourcePath, destPath);
      } else {
        // Fallback pour versions plus anciennes
        await this.copyFileStream(sourcePath, destPath);
      }

      return true;
    } catch (error) {
      console.error('Erreur copie fichier:', error);
      return false;
    }
  }

  /**
   * Copier un fichier en utilisant des streams (pour gros fichiers)
   * @param {string} sourcePath - Chemin source
   * @param {string} destPath - Chemin destination
   * @returns {Promise<boolean>} True si copié avec succès
   */
  static async copyFileStream(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(destPath);

      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', () => resolve(true));

      readStream.pipe(writeStream);
    });
  }

  /**
   * Déplacer un fichier
   * @param {string} sourcePath - Chemin source
   * @param {string} destPath - Chemin destination
   * @returns {Promise<boolean>} True si déplacé avec succès
   */
  static async moveFile(sourcePath, destPath) {
    try {
      // Créer le dossier de destination si nécessaire
      const destDir = path.dirname(destPath);
      await this.createDirectory(destDir);

      // Utiliser fs.rename si possible (même système de fichiers)
      const fsRename = promisify(fs.rename);
      await fsRename(sourcePath, destPath);
      
      return true;
    } catch (error) {
      // Si rename échoue, essayer copie + suppression
      try {
        const copied = await this.copyFile(sourcePath, destPath);
        if (copied) {
          await this.deleteFile(sourcePath);
          return true;
        }
      } catch (copyError) {
        console.error('Erreur déplacement fichier:', copyError);
      }
      return false;
    }
  }

  /**
   * Générer un nom de fichier unique
   * @param {string} originalName - Nom original
   * @param {string} directory - Dossier de destination
   * @returns {Promise<string>} Nom de fichier unique
   */
  static async generateUniqueFilename(originalName, directory) {
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    
    let counter = 0;
    let newName = originalName;
    
    while (await this.exists(path.join(directory, newName))) {
      counter++;
      newName = `${nameWithoutExt}_${counter}${extension}`;
    }
    
    return newName;
  }

  /**
   * Générer un hash de fichier
   * @param {string} filePath - Chemin du fichier
   * @param {string} algorithm - Algorithme de hash (md5, sha256, etc.)
   * @returns {Promise<string>} Hash du fichier
   */
  static async generateFileHash(filePath, algorithm = 'md5') {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Comparer deux fichiers par leur hash
   * @param {string} file1Path - Chemin du premier fichier
   * @param {string} file2Path - Chemin du second fichier
   * @returns {Promise<boolean>} True si les fichiers sont identiques
   */
  static async compareFiles(file1Path, file2Path) {
    try {
      const [hash1, hash2] = await Promise.all([
        this.generateFileHash(file1Path),
        this.generateFileHash(file2Path)
      ]);
      
      return hash1 === hash2;
    } catch (error) {
      console.error('Erreur comparaison fichiers:', error);
      return false;
    }
  }

  /**
   * Nettoyer un nom de fichier (supprimer caractères dangereux)
   * @param {string} filename - Nom de fichier à nettoyer
   * @returns {string} Nom de fichier nettoyé
   */
  static sanitizeFilename(filename) {
    // Supprimer/remplacer les caractères dangereux
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Caractères interdits Windows
      .replace(/^\.+/, '') // Points en début
      .replace(/\.+$/, '') // Points en fin
      .replace(/\s+/g, '_') // Espaces multiples
      .substring(0, 255) // Limite de longueur
      .toLowerCase();
  }

  /**
   * Obtenir le type MIME à partir de l'extension
   * @param {string} extension - Extension du fichier
   * @returns {string} Type MIME
   */
  static getMimeTypeFromExtension(extension) {
    const mimeTypes = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
      
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      
      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      
      // Vidéos
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Formater une taille de fichier en format lisible
   * @param {number} bytes - Taille en bytes
   * @returns {string} Taille formatée
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convertir une taille formatée en bytes
   * @param {string} sizeStr - Taille formatée (ex: "1.5 MB")
   * @returns {number} Taille en bytes
   */
  static parseFileSize(sizeStr) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    return Math.round(value * (units[unit] || 1));
  }

  /**
   * Valider qu'un fichier respecte les contraintes
   * @param {string} filePath - Chemin du fichier
   * @param {Object} constraints - Contraintes à valider
   * @returns {Promise<Object>} Résultat de validation
   */
  static async validateFile(filePath, constraints = {}) {
    try {
      const {
        maxSize = null,
        allowedExtensions = null,
        allowedMimeTypes = null,
        mustExist = true
      } = constraints;

      const errors = [];

      // Vérifier l'existence
      if (mustExist && !(await this.exists(filePath))) {
        errors.push('Le fichier n\'existe pas');
        return { valid: false, errors };
      }

      if (await this.exists(filePath)) {
        const fileInfo = await this.getFileInfo(filePath);
        
        if (!fileInfo) {
          errors.push('Impossible de lire les informations du fichier');
          return { valid: false, errors };
        }

        // Vérifier la taille
        if (maxSize && fileInfo.size > maxSize) {
          errors.push(`Fichier trop volumineux (${fileInfo.sizeFormatted} > ${this.formatFileSize(maxSize)})`);
        }

        // Vérifier l'extension
        if (allowedExtensions && !allowedExtensions.includes(fileInfo.extension)) {
          errors.push(`Extension non autorisée: ${fileInfo.extension}`);
        }

        // Vérifier le type MIME
        if (allowedMimeTypes && !allowedMimeTypes.includes(fileInfo.mimeType)) {
          errors.push(`Type MIME non autorisé: ${fileInfo.mimeType}`);
        }

        return {
          valid: errors.length === 0,
          errors,
          fileInfo
        };
      }

      return { valid: true, errors: [] };

    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur lors de la validation: ${error.message}`]
      };
    }
  }

  /**
   * Créer une structure de dossiers pour organiser les uploads
   * @param {string} basePath - Chemin de base
   * @param {Object} structure - Structure des dossiers
   * @returns {Promise<boolean>} True si créé avec succès
   */
  static async createUploadStructure(basePath, structure = {}) {
    try {
      const defaultStructure = {
        entities: {
          images: {},
          documents: {},
          videos: {},
          audio: {},
          archives: {},
          other: {}
        },
        temp: {},
        exports: {}
      };

      const finalStructure = { ...defaultStructure, ...structure };

      const createDirs = async (obj, currentPath) => {
        for (const [key, value] of Object.entries(obj)) {
          const dirPath = path.join(currentPath, key);
          await this.createDirectory(dirPath);
          
          if (typeof value === 'object' && value !== null) {
            await createDirs(value, dirPath);
          }
        }
      };

      await createDirs(finalStructure, basePath);
      return true;

    } catch (error) {
      console.error('Erreur création structure:', error);
      return false;
    }
  }

  /**
   * Nettoyer les fichiers temporaires anciens
   * @param {string} tempDir - Dossier temporaire
   * @param {number} maxAge - Âge maximum en millisecondes
   * @returns {Promise<number>} Nombre de fichiers supprimés
   */
  static async cleanupTempFiles(tempDir, maxAge = 24 * 60 * 60 * 1000) { // 24h par défaut
    try {
      if (!(await this.exists(tempDir))) {
        return 0;
      }

      const files = await this.listDirectory(tempDir, { withStats: true });
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const fileAge = now - file.modified.getTime();
        
        if (fileAge > maxAge) {
          const deleted = await this.deleteFile(file.path);
          if (deleted) {
            deletedCount++;
          }
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Erreur nettoyage fichiers temporaires:', error);
      return 0;
    }
  }

  /**
   * Calculer l'espace disque utilisé par un dossier
   * @param {string} dirPath - Chemin du dossier
   * @returns {Promise<Object>} Informations sur l'espace utilisé
   */
  static async calculateDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      let fileCount = 0;
      let dirCount = 0;

      const calculateSize = async (currentPath) => {
        const items = await this.listDirectory(currentPath, { withStats: true });
        
        for (const item of items) {
          if (item.isFile) {
            totalSize += item.size;
            fileCount++;
          } else if (item.isDirectory) {
            dirCount++;
            await calculateSize(item.path);
          }
        }
      };

      await calculateSize(dirPath);

      return {
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        fileCount,
        dirCount,
        avgFileSize: fileCount > 0 ? Math.round(totalSize / fileCount) : 0,
        avgFileSizeFormatted: fileCount > 0 ? this.formatFileSize(Math.round(totalSize / fileCount)) : '0 B'
      };

    } catch (error) {
      console.error('Erreur calcul taille dossier:', error);
      return {
        totalSize: 0,
        totalSizeFormatted: '0 B',
        fileCount: 0,
        dirCount: 0,
        avgFileSize: 0,
        avgFileSizeFormatted: '0 B'
      };
    }
  }

  /**
   * Créer un fichier de métadonnées pour un upload
   * @param {string} filePath - Chemin du fichier
   * @param {Object} metadata - Métadonnées supplémentaires
   * @returns {Promise<boolean>} True si créé avec succès
   */
  static async createMetadataFile(filePath, metadata = {}) {
    try {
      const fileInfo = await this.getFileInfo(filePath);
      if (!fileInfo) return false;

      const metadataPath = filePath + '.meta.json';
      const metadataContent = {
        originalFile: fileInfo,
        uploadedAt: new Date().toISOString(),
        hash: await this.generateFileHash(filePath),
        ...metadata
      };

      await fs.promises.writeFile(
        metadataPath, 
        JSON.stringify(metadataContent, null, 2), 
        'utf8'
      );

      return true;

    } catch (error) {
      console.error('Erreur création métadonnées:', error);
      return false;
    }
  }

  /**
   * Lire un fichier de métadonnées
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<Object|null>} Métadonnées ou null
   */
  static async readMetadataFile(filePath) {
    try {
      const metadataPath = filePath + '.meta.json';
      
      if (!(await this.exists(metadataPath))) {
        return null;
      }

      const content = await fs.promises.readFile(metadataPath, 'utf8');
      return JSON.parse(content);

    } catch (error) {
      console.error('Erreur lecture métadonnées:', error);
      return null;
    }
  }

  /**
   * Vérifier l'intégrité d'un fichier via son hash
   * @param {string} filePath - Chemin du fichier
   * @param {string} expectedHash - Hash attendu
   * @param {string} algorithm - Algorithme de hash
   * @returns {Promise<boolean>} True si l'intégrité est vérifiée
   */
  static async verifyFileIntegrity(filePath, expectedHash, algorithm = 'md5') {
    try {
      const currentHash = await this.generateFileHash(filePath, algorithm);
      return currentHash === expectedHash;
    } catch (error) {
      console.error('Erreur vérification intégrité:', error);
      return false;
    }
  }

  /**
   * Obtenir des statistiques globales sur les fichiers
   * @param {string} rootPath - Chemin racine à analyser
   * @returns {Promise<Object>} Statistiques détaillées
   */
  static async getFileStatistics(rootPath) {
    try {
      const stats = {
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        fileTypes: {},
        sizeBrackets: {
          'tiny': 0,     // < 1KB
          'small': 0,    // 1KB - 1MB
          'medium': 0,   // 1MB - 10MB
          'large': 0,    // 10MB - 100MB
          'huge': 0      // > 100MB
        },
        oldestFile: null,
        newestFile: null
      };

      const analyzeDirectory = async (dirPath) => {
        const items = await this.listDirectory(dirPath, { withStats: true });
        
        for (const item of items) {
          if (item.isFile) {
            stats.totalFiles++;
            stats.totalSize += item.size;

            // Analyser l'extension
            const ext = path.extname(item.name).toLowerCase();
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;

            // Catégoriser par taille
            if (item.size < 1024) stats.sizeBrackets.tiny++;
            else if (item.size < 1024 * 1024) stats.sizeBrackets.small++;
            else if (item.size < 10 * 1024 * 1024) stats.sizeBrackets.medium++;
            else if (item.size < 100 * 1024 * 1024) stats.sizeBrackets.large++;
            else stats.sizeBrackets.huge++;

            // Suivre les dates
            if (!stats.oldestFile || item.modified < stats.oldestFile.modified) {
              stats.oldestFile = item;
            }
            if (!stats.newestFile || item.modified > stats.newestFile.modified) {
              stats.newestFile = item;
            }

          } else if (item.isDirectory) {
            stats.totalDirectories++;
            await analyzeDirectory(item.path);
          }
        }
      };

      await analyzeDirectory(rootPath);

      // Enrichir les statistiques
      stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
      stats.avgFileSize = stats.totalFiles > 0 ? Math.round(stats.totalSize / stats.totalFiles) : 0;
      stats.avgFileSizeFormatted = this.formatFileSize(stats.avgFileSize);

      return stats;

    } catch (error) {
      console.error('Erreur statistiques fichiers:', error);
      return null;
    }
  }
}

module.exports = FileHelper;