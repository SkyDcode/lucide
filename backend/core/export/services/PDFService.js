// backend/core/export/services/PDFService.js - Service génération PDF avec Puppeteer
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError } = require('../../../shared/middleware/errorHandler');

/**
 * Service de génération de PDF à partir de HTML
 * Utilise Puppeteer pour convertir les templates HTML en PDF professionnels
 */
class PDFService {

  /**
   * Configuration par défaut pour la génération PDF
   */
  static get defaultConfig() {
    return {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 10px; color: #666; text-align: center; width: 100%;"><span class="title"></span></div>',
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 5px;">
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
          <span style="float: right;">LUCIDE - Confidentiel</span>
        </div>
      `,
      timeout: 30000,
      waitForSelector: 'body',
      emulateMediaType: 'print'
    };
  }

  /**
   * Initialiser le service PDF
   */
  static async initialize() {
    try {
      // Tester la disponibilité de Puppeteer
      const browser = await this.createBrowser();
      await browser.close();
      
      logger.info('PDFService initialized successfully');
      return true;
    } catch (error) {
      logger.error('PDFService initialization failed', { error: error.message });
      throw new Error(`Impossible d'initialiser le service PDF: ${error.message}`);
    }
  }

  /**
   * Créer une instance de navigateur Puppeteer
   * @param {Object} options - Options du navigateur
   * @returns {Promise<Browser>} Instance du navigateur
   */
  static async createBrowser(options = {}) {
    const defaultOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check'
      ],
      timeout: 30000
    };

    const browserOptions = { ...defaultOptions, ...options };

    try {
      const browser = await puppeteer.launch(browserOptions);
      logger.debug('Browser instance created', { 
        options: Object.keys(browserOptions),
        pid: browser.process()?.pid 
      });
      return browser;
    } catch (error) {
      logger.error('Failed to create browser instance', { error: error.message });
      throw new ValidationError(`Erreur création navigateur: ${error.message}`);
    }
  }

  /**
   * Générer un PDF à partir de HTML
   * @param {string} htmlContent - Contenu HTML à convertir
   * @param {Object} options - Options de génération PDF
   * @returns {Promise<Buffer>} Buffer du PDF généré
   */
  static async generatePDFFromHTML(htmlContent, options = {}) {
    const startTime = Date.now();
    let browser = null;
    let page = null;

    try {
      // Valider le contenu HTML
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new ValidationError('Contenu HTML invalide ou manquant');
      }

      // Fusionner avec la configuration par défaut
      const pdfConfig = { ...this.defaultConfig, ...options };
      
      logger.info('Starting PDF generation', { 
        htmlLength: htmlContent.length,
        config: pdfConfig
      });

      // Créer le navigateur
      browser = await this.createBrowser(options.browserOptions);
      
      // Créer une nouvelle page
      page = await browser.newPage();

      // Configurer la page
      await this.configurePage(page, pdfConfig);

      // Charger le contenu HTML
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: pdfConfig.timeout
      });

      // Attendre que le contenu soit prêt
      if (pdfConfig.waitForSelector) {
        await page.waitForSelector(pdfConfig.waitForSelector, {
          timeout: pdfConfig.timeout
        });
      }

      // Attendre un délai supplémentaire pour les animations/styles
      if (pdfConfig.waitDelay) {
        await page.waitForTimeout(pdfConfig.waitDelay);
      }

      // Générer le PDF
      const pdfBuffer = await page.pdf({
        format: pdfConfig.format,
        margin: pdfConfig.margin,
        printBackground: pdfConfig.printBackground,
        preferCSSPageSize: pdfConfig.preferCSSPageSize,
        displayHeaderFooter: pdfConfig.displayHeaderFooter,
        headerTemplate: pdfConfig.headerTemplate,
        footerTemplate: pdfConfig.footerTemplate
      });

      const generationTime = Date.now() - startTime;
      
      logger.success('PDF generated successfully', {
        size: pdfBuffer.length,
        generationTime: `${generationTime}ms`,
        pages: await this.countPDFPages(pdfBuffer)
      });

      return pdfBuffer;

    } catch (error) {
      const generationTime = Date.now() - startTime;
      logger.error('PDF generation failed', {
        error: error.message,
        generationTime: `${generationTime}ms`,
        htmlLength: htmlContent?.length
      });
      throw error;
    } finally {
      // Nettoyer les ressources
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          logger.warn('Error closing page', { error: closeError.message });
        }
      }
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.warn('Error closing browser', { error: closeError.message });
        }
      }
    }
  }

  /**
   * Configurer la page Puppeteer
   * @param {Page} page - Instance de la page
   * @param {Object} config - Configuration
   */
  static async configurePage(page, config) {
    try {
      // Définir la taille de la viewport
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      });

      // Émuler le media type pour l'impression
      if (config.emulateMediaType) {
        await page.emulateMediaType(config.emulateMediaType);
      }

      // Intercepter et optimiser les ressources
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        
        // Bloquer les ressources inutiles pour accélérer le rendu
        if (['image', 'font'].includes(resourceType)) {
          const url = request.url();
          
          // Autoriser les images data: et les polices système
          if (url.startsWith('data:') || url.includes('fonts.googleapis.com')) {
            request.continue();
          } else {
            request.abort();
          }
        } else {
          request.continue();
        }
      });

      // Ajouter des styles CSS pour l'impression
      await page.addStyleTag({
        content: `
          @media print {
            body { 
              -webkit-print-color-adjust: exact !important; 
              color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .page-break-avoid { page-break-inside: avoid; }
          }
        `
      });

      logger.debug('Page configured for PDF generation');
    } catch (error) {
      logger.error('Error configuring page', { error: error.message });
      throw error;
    }
  }

  /**
   * Générer un PDF avec filigrane
   * @param {string} htmlContent - Contenu HTML
   * @param {string} watermarkText - Texte du filigrane
   * @param {Object} options - Options de génération
   * @returns {Promise<Buffer>} Buffer du PDF avec filigrane
   */
  static async generatePDFWithWatermark(htmlContent, watermarkText = 'CONFIDENTIEL', options = {}) {
    try {
      // Ajouter le CSS pour le filigrane au HTML
      const watermarkCSS = `
        <style>
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            color: rgba(0, 0, 0, 0.1);
            font-weight: bold;
            font-family: Arial, sans-serif;
            z-index: 9999;
            pointer-events: none;
            text-transform: uppercase;
            letter-spacing: 5px;
          }
          @media print {
            .watermark {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        </style>
      `;

      const watermarkHTML = `<div class="watermark">${watermarkText}</div>`;
      
      // Injecter le filigrane dans le HTML
      const htmlWithWatermark = htmlContent.replace(
        '</body>',
        `${watermarkHTML}</body>`
      ).replace(
        '</head>',
        `${watermarkCSS}</head>`
      );

      logger.info('Generating PDF with watermark', { watermarkText });
      
      return await this.generatePDFFromHTML(htmlWithWatermark, options);
    } catch (error) {
      logger.error('Error generating PDF with watermark', { 
        watermarkText, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Générer un PDF à partir d'une URL
   * @param {string} url - URL à convertir en PDF
   * @param {Object} options - Options de génération
   * @returns {Promise<Buffer>} Buffer du PDF
   */
  static async generatePDFFromURL(url, options = {}) {
    let browser = null;
    let page = null;

    try {
      if (!url || typeof url !== 'string') {
        throw new ValidationError('URL invalide ou manquante');
      }

      const pdfConfig = { ...this.defaultConfig, ...options };
      
      logger.info('Generating PDF from URL', { url });

      browser = await this.createBrowser(options.browserOptions);
      page = await browser.newPage();

      await this.configurePage(page, pdfConfig);

      // Naviguer vers l'URL
      await page.goto(url, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: pdfConfig.timeout
      });

      // Attendre que le contenu soit prêt
      if (pdfConfig.waitForSelector) {
        await page.waitForSelector(pdfConfig.waitForSelector, {
          timeout: pdfConfig.timeout
        });
      }

      // Générer le PDF
      const pdfBuffer = await page.pdf({
        format: pdfConfig.format,
        margin: pdfConfig.margin,
        printBackground: pdfConfig.printBackground,
        preferCSSPageSize: pdfConfig.preferCSSPageSize,
        displayHeaderFooter: pdfConfig.displayHeaderFooter,
        headerTemplate: pdfConfig.headerTemplate,
        footerTemplate: pdfConfig.footerTemplate
      });

      logger.success('PDF generated from URL successfully', {
        url,
        size: pdfBuffer.length
      });

      return pdfBuffer;

    } catch (error) {
      logger.error('PDF generation from URL failed', {
        url,
        error: error.message
      });
      throw error;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Sauvegarder un PDF sur le disque
   * @param {Buffer} pdfBuffer - Buffer du PDF
   * @param {string} filePath - Chemin de sauvegarde
   * @returns {Promise<string>} Chemin du fichier sauvé
   */
  static async savePDFToFile(pdfBuffer, filePath) {
    try {
      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new ValidationError('Buffer PDF invalide');
      }

      if (!filePath || typeof filePath !== 'string') {
        throw new ValidationError('Chemin de fichier invalide');
      }

      // Créer le dossier parent si nécessaire
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Sauvegarder le fichier
      await fs.writeFile(filePath, pdfBuffer);

      logger.success('PDF saved to file', {
        filePath,
        size: pdfBuffer.length
      });

      return filePath;
    } catch (error) {
      logger.error('Error saving PDF to file', {
        filePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Générer un PDF multi-pages à partir de plusieurs HTML
   * @param {Array} htmlContents - Array de contenus HTML
   * @param {Object} options - Options de génération
   * @returns {Promise<Buffer>} Buffer du PDF combiné
   */
  static async generateMultiPagePDF(htmlContents, options = {}) {
    try {
      if (!Array.isArray(htmlContents) || htmlContents.length === 0) {
        throw new ValidationError('Array de contenus HTML invalide');
      }

      logger.info('Generating multi-page PDF', { 
        pageCount: htmlContents.length 
      });

      // Combiner tous les HTML avec des sauts de page
      const combinedHTML = htmlContents
        .map((html, index) => {
          if (index === 0) return html;
          
          // Ajouter un saut de page avant chaque nouveau contenu
          return html.replace(
            '<body',
            '<body style="page-break-before: always;"'
          );
        })
        .join('');

      return await this.generatePDFFromHTML(combinedHTML, options);
    } catch (error) {
      logger.error('Error generating multi-page PDF', {
        pageCount: htmlContents?.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Optimiser un PDF (réduire la taille)
   * @param {Buffer} pdfBuffer - Buffer du PDF original
   * @param {Object} options - Options d'optimisation
   * @returns {Promise<Buffer>} Buffer du PDF optimisé
   */
  static async optimizePDF(pdfBuffer, options = {}) {
    try {
      const {
        quality = 0.8,
        format = 'A4',
        margin = { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      } = options;

      logger.info('Optimizing PDF', { 
        originalSize: pdfBuffer.length,
        quality
      });

      // Pour l'optimisation, on pourrait utiliser une bibliothèque spécialisée
      // Ici, on retourne le PDF original car l'optimisation avancée nécessite
      // des outils externes comme Ghostscript
      
      // TODO: Implémenter l'optimisation avec des outils externes si nécessaire
      
      logger.info('PDF optimization completed', {
        originalSize: pdfBuffer.length,
        optimizedSize: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Error optimizing PDF', { error: error.message });
      throw error;
    }
  }

  /**
   * Ajouter des métadonnées au PDF
   * @param {Buffer} pdfBuffer - Buffer du PDF
   * @param {Object} metadata - Métadonnées à ajouter
   * @returns {Promise<Buffer>} Buffer du PDF avec métadonnées
   */
  static async addMetadataToPDF(pdfBuffer, metadata = {}) {
    try {
      const {
        title = 'Document LUCIDE',
        author = 'Police Judiciaire',
        subject = 'Rapport OSINT',
        keywords = 'OSINT, Investigation, Police',
        creator = 'LUCIDE Application',
        producer = 'LUCIDE PDF Service'
      } = metadata;

      // Note: L'ajout de métadonnées nécessite une bibliothèque PDF spécialisée
      // comme PDF-lib. Pour le moment, on retourne le PDF original.
      
      logger.info('PDF metadata would be added', { metadata });
      
      // TODO: Implémenter l'ajout de métadonnées avec PDF-lib si nécessaire
      
      return pdfBuffer;
    } catch (error) {
      logger.error('Error adding metadata to PDF', { error: error.message });
      throw error;
    }
  }

  /**
   * Compter le nombre de pages d'un PDF
   * @param {Buffer} pdfBuffer - Buffer du PDF
   * @returns {Promise<number>} Nombre de pages
   */
  static async countPDFPages(pdfBuffer) {
    try {
      // Méthode simple pour estimer le nombre de pages
      // basée sur la taille du fichier et les occurrences de mots-clés PDF
      const pdfString = pdfBuffer.toString();
      const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
      const pageCount = pageMatches ? pageMatches.length : 1;
      
      return Math.max(1, pageCount);
    } catch (error) {
      logger.warn('Error counting PDF pages', { error: error.message });
      return 1; // Valeur par défaut
    }
  }

  /**
   * Valider qu'un buffer est un PDF valide
   * @param {Buffer} pdfBuffer - Buffer à valider
   * @returns {boolean} True si le buffer est un PDF valide
   */
  static validatePDFBuffer(pdfBuffer) {
    try {
      if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
        return false;
      }

      // Vérifier la signature PDF
      const signature = pdfBuffer.slice(0, 4).toString();
      return signature === '%PDF';
    } catch (error) {
      logger.warn('Error validating PDF buffer', { error: error.message });
      return false;
    }
  }

  /**
   * Obtenir les informations d'un PDF
   * @param {Buffer} pdfBuffer - Buffer du PDF
   * @returns {Promise<Object>} Informations du PDF
   */
  static async getPDFInfo(pdfBuffer) {
    try {
      if (!this.validatePDFBuffer(pdfBuffer)) {
        throw new ValidationError('Buffer PDF invalide');
      }

      const pageCount = await this.countPDFPages(pdfBuffer);
      const size = pdfBuffer.length;
      const sizeFormatted = this.formatFileSize(size);

      const info = {
        valid: true,
        size,
        sizeFormatted,
        pageCount,
        type: 'application/pdf',
        created: new Date().toISOString()
      };

      logger.info('PDF info extracted', info);
      return info;
    } catch (error) {
      logger.error('Error getting PDF info', { error: error.message });
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Formater une taille de fichier en format lisible
   * @param {number} bytes - Taille en bytes
   * @returns {string} Taille formatée
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Nettoyer les ressources et optimiser la mémoire
   */
  static async cleanup() {
    try {
      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }
      
      logger.info('PDFService cleanup completed');
    } catch (error) {
      logger.warn('Error during PDFService cleanup', { error: error.message });
    }
  }

  /**
   * Obtenir les statistiques du service PDF
   * @returns {Object} Statistiques
   */
  static getStats() {
    return {
      service: 'PDFService',
      version: '1.0.0',
      engine: 'Puppeteer',
      defaultFormat: this.defaultConfig.format,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Tester la fonctionnalité du service PDF
   * @returns {Promise<boolean>} True si le test réussit
   */
  static async testService() {
    try {
      logger.info('Testing PDFService functionality...');

      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Test PDF Generation</h1>
          <p>Ceci est un test de génération PDF avec LUCIDE.</p>
          <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
        </body>
        </html>
      `;

      const pdfBuffer = await this.generatePDFFromHTML(testHTML, {
        format: 'A4',
        timeout: 10000
      });

      const isValid = this.validatePDFBuffer(pdfBuffer);
      
      if (isValid) {
        logger.success('PDFService test completed successfully', {
          pdfSize: pdfBuffer.length
        });
        return true;
      } else {
        logger.error('PDFService test failed - invalid PDF generated');
        return false;
      }
    } catch (error) {
      logger.error('PDFService test failed', { error: error.message });
      return false;
    }
  }
}

module.exports = PDFService;