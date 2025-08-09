// backend/config/https.js - Configuration HTTPS pour LUCIDE
const https = require('https');
const fs = require('fs');
const path = require('path');
const { logger } = require('../shared/middleware/logging');

/**
 * Configuration HTTPS pour LUCIDE
 * Support développement (certificats auto-signés) et production
 */

/**
 * Générer un certificat auto-signé pour le développement
 * Utilise OpenSSL si disponible, sinon utilise node-forge
 */
async function generateSelfSignedCert() {
  const certDir = path.join(__dirname, '../certificates');
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.crt');

  // Créer le dossier si nécessaire
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Vérifier si les certificats existent déjà
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    logger.info('Using existing SSL certificates');
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  }

  try {
    // Essayer d'utiliser OpenSSL (si disponible sur le système)
    const { execSync } = require('child_process');
    
    logger.info('Generating self-signed SSL certificate with OpenSSL...');
    
    const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=FR/ST=France/L=Paris/O=Police Judiciaire/OU=OSINT/CN=localhost"`;
    
    execSync(opensslCmd, { stdio: 'pipe' });
    
    logger.success('SSL certificate generated successfully with OpenSSL');
    
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };

  } catch (opensslError) {
    logger.warn('OpenSSL not available, using node-forge fallback...');
    
    try {
      // Fallback: utiliser node-forge pour générer le certificat
      const forge = require('node-forge');
      
      // Générer une paire de clés RSA
      logger.info('Generating RSA key pair...');
      const keys = forge.pki.rsa.generateKeyPair(2048);
      
      // Créer le certificat
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
      
      // Définir les attributs du certificat
      const attrs = [
        { name: 'countryName', value: 'FR' },
        { name: 'stateOrProvinceName', value: 'France' },
        { name: 'localityName', value: 'Paris' },
        { name: 'organizationName', value: 'Police Judiciaire' },
        { name: 'organizationalUnitName', value: 'OSINT' },
        { name: 'commonName', value: 'localhost' }
      ];
      
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      
      // Extensions pour development
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: false
        },
        {
          name: 'keyUsage',
          keyCertSign: false,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: false,
          emailProtection: false,
          timeStamping: false
        },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 2, value: '127.0.0.1' },
            { type: 2, value: '::1' }
          ]
        }
      ]);
      
      // Signer le certificat
      cert.sign(keys.privateKey);
      
      // Convertir en PEM
      const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
      const pemCert = forge.pki.certificateToPem(cert);
      
      // Sauvegarder
      fs.writeFileSync(keyPath, pemKey);
      fs.writeFileSync(certPath, pemCert);
      
      logger.success('SSL certificate generated successfully with node-forge');
      
      return {
        key: pemKey,
        cert: pemCert
      };
      
    } catch (forgeError) {
      logger.error('Failed to generate SSL certificate', { 
        opensslError: opensslError.message,
        forgeError: forgeError.message 
      });
      throw new Error('Could not generate SSL certificate. Install OpenSSL or node-forge.');
    }
  }
}

/**
 * Charger les certificats SSL
 */
async function loadSSLCertificates() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Développement : utiliser certificats auto-signés
    logger.info('Loading SSL certificates for development environment');
    return await generateSelfSignedCert();
  } else {
    // Production : utiliser certificats réels
    logger.info('Loading SSL certificates for production environment');
    
    const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/lucide.key';
    const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/lucide.crt';
    const caPath = process.env.SSL_CA_PATH; // Optionnel
    
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error(`SSL certificates not found. Key: ${keyPath}, Cert: ${certPath}`);
    }
    
    const credentials = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    
    // Ajouter la chaîne CA si disponible
    if (caPath && fs.existsSync(caPath)) {
      credentials.ca = fs.readFileSync(caPath);
    }
    
    return credentials;
  }
}

/**
 * Créer le serveur HTTPS
 */
async function createHTTPSServer(app) {
  try {
    const credentials = await loadSSLCertificates();
    
    // Options HTTPS sécurisées
    const httpsOptions = {
      ...credentials,
      // Protocoles sécurisés uniquement
      secureProtocol: 'TLSv1_2_method',
      // Ciphers sécurisés
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384'
      ].join(':'),
      honorCipherOrder: true
    };
    
    const httpsServer = https.createServer(httpsOptions, app);
    
    logger.success('HTTPS server created successfully');
    return httpsServer;
    
  } catch (error) {
    logger.error('Failed to create HTTPS server', { error: error.message });
    throw error;
  }
}

/**
 * Middleware de redirection HTTP vers HTTPS
 */
function httpsRedirect() {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
      logger.info('Redirecting HTTP to HTTPS', { 
        originalUrl: req.originalUrl,
        userAgent: req.get('User-Agent') 
      });
      
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  };
}

/**
 * Configuration des headers de sécurité HTTPS
 */
function securityHeaders() {
  return (req, res, next) => {
    // Strict Transport Security (HSTS)
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Autres headers de sécurité
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CSP adapté pour LUCIDE
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Pour React en dev
      "style-src 'self' 'unsafe-inline'", // Pour CSS dynamique
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', cspPolicy);
    
    next();
  };
}

/**
 * Obtenir la configuration HTTPS selon l'environnement
 */
function getHTTPSConfig() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    enabled: process.env.HTTPS_ENABLED !== 'false', // Activé par défaut
    port: process.env.HTTPS_PORT || (isDevelopment ? 3443 : 443),
    redirectHTTP: process.env.REDIRECT_HTTP !== 'false', // Activé par défaut en production
    development: {
      selfSigned: true,
      rejectUnauthorized: false // Pour les tests automatisés
    },
    production: {
      selfSigned: false,
      rejectUnauthorized: true,
      keyPath: process.env.SSL_KEY_PATH,
      certPath: process.env.SSL_CERT_PATH,
      caPath: process.env.SSL_CA_PATH
    }
  };
}

/**
 * Valider la configuration SSL
 */
async function validateSSLConfig() {
  const config = getHTTPSConfig();
  
  if (!config.enabled) {
    logger.warn('HTTPS is disabled - not recommended for production');
    return false;
  }
  
  try {
    await loadSSLCertificates();
    logger.success('SSL configuration validated successfully');
    return true;
  } catch (error) {
    logger.error('SSL configuration validation failed', { error: error.message });
    return false;
  }
}

module.exports = {
  createHTTPSServer,
  httpsRedirect,
  securityHeaders,
  getHTTPSConfig,
  validateSSLConfig,
  loadSSLCertificates
};