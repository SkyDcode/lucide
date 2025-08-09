// backend/scripts/sslInfo.js - Script d'information sur les certificats SSL
const fs = require('fs');
const path = require('path');

/**
 * Script d'information sur les certificats SSL pour LUCIDE
 * Usage: npm run ssl:info
 */

const CERT_DIR = path.join(__dirname, '../certificates');
const KEY_PATH = path.join(CERT_DIR, 'server.key');
const CERT_PATH = path.join(CERT_DIR, 'server.crt');

/**
 * Analyser le certificat avec Node Forge
 */
function analyzeCertificate() {
  try {
    const forge = require('node-forge');
    const certContent = fs.readFileSync(CERT_PATH, 'utf8');
    const cert = forge.pki.certificateFromPem(certContent);
    
    // Informations de base
    const info = {
      subject: {},
      issuer: {},
      validity: {
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        isValid: new Date() >= cert.validity.notBefore && new Date() <= cert.validity.notAfter
      },
      serialNumber: cert.serialNumber,
      extensions: [],
      keyInfo: {
        size: cert.publicKey.n ? cert.publicKey.n.bitLength() : 'Unknown',
        algorithm: 'RSA'
      }
    };
    
    // Parser le sujet
    cert.subject.attributes.forEach(attr => {
      info.subject[attr.shortName || attr.name] = attr.value;
    });
    
    // Parser l'émetteur
    cert.issuer.attributes.forEach(attr => {
      info.issuer[attr.shortName || attr.name] = attr.value;
    });
    
    // Parser les extensions
    cert.extensions.forEach(ext => {
      const extension = {
        name: ext.name,
        critical: ext.critical || false
      };
      
      if (ext.name === 'subjectAltName') {
        extension.altNames = ext.altNames.map(alt => ({
          type: alt.type === 2 ? 'DNS' : alt.type === 7 ? 'IP' : 'Other',
          value: alt.value || alt.ip
        }));
      } else if (ext.name === 'keyUsage') {
        extension.usages = [];
        if (ext.digitalSignature) extension.usages.push('Digital Signature');
        if (ext.keyEncipherment) extension.usages.push('Key Encipherment');
        if (ext.dataEncipherment) extension.usages.push('Data Encipherment');
        if (ext.nonRepudiation) extension.usages.push('Non Repudiation');
      } else if (ext.name === 'extKeyUsage') {
        extension.usages = [];
        if (ext.serverAuth) extension.usages.push('TLS Web Server Authentication');
        if (ext.clientAuth) extension.usages.push('TLS Web Client Authentication');
      }
      
      info.extensions.push(extension);
    });
    
    return info;
    
  } catch (error) {
    throw new Error(`Erreur lors de l'analyse du certificat: ${error.message}`);
  }
}

/**
 * Vérifier la taille de la clé privée
 */
function analyzePrivateKey() {
  try {
    const forge = require('node-forge');
    const keyContent = fs.readFileSync(KEY_PATH, 'utf8');
    const privateKey = forge.pki.privateKeyFromPem(keyContent);
    
    return {
      size: privateKey.n ? privateKey.n.bitLength() : 'Unknown',
      algorithm: 'RSA'
    };
    
  } catch (error) {
    throw new Error(`Erreur lors de l'analyse de la clé privée: ${error.message}`);
  }
}

/**
 * Afficher les informations détaillées
 */
function displayDetailedInfo() {
  console.log('🔐 INFORMATIONS DÉTAILLÉES DES CERTIFICATS SSL');
  console.log('===============================================\n');
  
  // Vérifier l'existence des fichiers
  const keyExists = fs.existsSync(KEY_PATH);
  const certExists = fs.existsSync(CERT_PATH);
  
  console.log('📁 FICHIERS :');
  console.log(`   Clé privée: ${keyExists ? '✅' : '❌'} ${KEY_PATH}`);
  console.log(`   Certificat: ${certExists ? '✅' : '❌'} ${CERT_PATH}`);
  
  if (!keyExists || !certExists) {
    console.log('\n❌ Certificats manquants. Générez-les avec: npm run ssl:generate');
    return;
  }
  
  // Informations sur les fichiers
  const keyStats = fs.statSync(KEY_PATH);
  const certStats = fs.statSync(CERT_PATH);
  
  console.log(`   Clé créée le: ${keyStats.birthtime.toLocaleDateString('fr-FR')} à ${keyStats.birthtime.toLocaleTimeString('fr-FR')}`);
  console.log(`   Certificat créé le: ${certStats.birthtime.toLocaleDateString('fr-FR')} à ${certStats.birthtime.toLocaleTimeString('fr-FR')}`);
  console.log(`   Taille clé: ${(keyStats.size / 1024).toFixed(2)} KB`);
  console.log(`   Taille certificat: ${(certStats.size / 1024).toFixed(2)} KB`);
  
  try {
    // Analyser la clé privée
    const keyInfo = analyzePrivateKey();
    console.log('\n🔑 CLÉ PRIVÉE :');
    console.log(`   Algorithme: ${keyInfo.algorithm}`);
    console.log(`   Taille: ${keyInfo.size} bits`);
    
    // Analyser le certificat
    const certInfo = analyzeCertificate();
    
    console.log('\n📜 CERTIFICAT :');
    console.log(`   Numéro de série: ${certInfo.serialNumber}`);
    console.log(`   Algorithme de clé: ${certInfo.keyInfo.algorithm}`);
    console.log(`   Taille de clé: ${certInfo.keyInfo.size} bits`);
    
    console.log('\n👤 SUJET :');
    Object.entries(certInfo.subject).forEach(([key, value]) => {
      const labels = {
        'CN': 'Nom commun',
        'O': 'Organisation',
        'OU': 'Unité organisationnelle',
        'L': 'Localité',
        'ST': 'État/Province',
        'C': 'Pays'
      };
      console.log(`   ${labels[key] || key}: ${value}`);
    });
    
    console.log('\n🏢 ÉMETTEUR :');
    Object.entries(certInfo.issuer).forEach(([key, value]) => {
      const labels = {
        'CN': 'Nom commun',
        'O': 'Organisation',
        'OU': 'Unité organisationnelle',
        'L': 'Localité',
        'ST': 'État/Province',
        'C': 'Pays'
      };
      console.log(`   ${labels[key] || key}: ${value}`);
    });
    
    console.log('\n⏰ VALIDITÉ :');
    console.log(`   Valide du: ${certInfo.validity.notBefore.toLocaleDateString('fr-FR')} à ${certInfo.validity.notBefore.toLocaleTimeString('fr-FR')}`);
    console.log(`   Valide jusqu'au: ${certInfo.validity.notAfter.toLocaleDateString('fr-FR')} à ${certInfo.validity.notAfter.toLocaleTimeString('fr-FR')}`);
    console.log(`   Statut: ${certInfo.validity.isValid ? '✅ Valide' : '❌ Expiré'}`);
    
    const now = new Date();
    const daysUntilExpiry = Math.ceil((certInfo.validity.notAfter - now) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry > 0) {
      console.log(`   Expire dans: ${daysUntilExpiry} jour(s)`);
    } else {
      console.log(`   Expiré depuis: ${Math.abs(daysUntilExpiry)} jour(s)`);
    }
    
    console.log('\n🔧 EXTENSIONS :');
    certInfo.extensions.forEach(ext => {
      console.log(`   ${ext.name}${ext.critical ? ' (critique)' : ''}`);
      
      if (ext.altNames) {
        ext.altNames.forEach(alt => {
          console.log(`     - ${alt.type}: ${alt.value}`);
        });
      }
      
      if (ext.usages) {
        ext.usages.forEach(usage => {
          console.log(`     - ${usage}`);
        });
      }
    });
    
    console.log('\n🌐 CONFIGURATION SERVEUR :');
    console.log('   Protocoles supportés: TLS 1.2, TLS 1.3');
    console.log('   Chiffrement: AES-256-GCM, ChaCha20-Poly1305');
    console.log('   Exchange de clés: ECDHE, DHE');
    console.log('   Authentification: RSA, ECDSA');
    
    console.log('\n🚀 UTILISATION :');
    console.log('   Développement HTTPS: npm run dev:https');
    console.log('   URL: https://localhost:3443');
    console.log('   Health check: https://localhost:3443/health');
    
    if (!certInfo.validity.isValid) {
      console.log('\n⚠️  ATTENTION: Le certificat n\'est pas valide !');
      console.log('   Régénérez les certificats avec: npm run ssl:generate');
    } else if (daysUntilExpiry <= 30) {
      console.log('\n⚠️  ATTENTION: Le certificat expire bientôt !');
      console.log('   Considérez le renouvellement avec: npm run ssl:generate');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\nInstallez node-forge si nécessaire: npm install node-forge');
  }
}

/**
 * Test de connexion HTTPS
 */
function testHTTPSConnection() {
  console.log('\n🧪 TEST DE CONNEXION HTTPS');
  console.log('==========================');
  
  const https = require('https');
  const fs = require('fs');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3443,
      path: '/health',
      method: 'GET',
      rejectUnauthorized: false, // Accepter les certificats auto-signés
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH)
    };
    
    console.log('🔄 Test de connexion...');
    
    const req = https.request(options, (res) => {
      console.log(`✅ Statut: ${res.statusCode}`);
      console.log(`📋 Headers:`, Object.keys(res.headers).length);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📦 Réponse reçue:', data.length > 0 ? 'OK' : 'Vide');
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Erreur de connexion:', error.message);
      console.log('💡 Le serveur n\'est probablement pas démarré');
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ Timeout de connexion');
      req.destroy();
    });
    
    req.end();
    
  } catch (error) {
    console.log('❌ Erreur lors du test:', error.message);
  }
}

/**
 * Fonction principale
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    testHTTPSConnection();
  } else {
    displayDetailedInfo();
    
    if (args.includes('--with-test')) {
      testHTTPSConnection();
    }
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  analyzeCertificate,
  analyzePrivateKey,
  displayDetailedInfo,
  testHTTPSConnection
};