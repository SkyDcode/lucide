// backend/scripts/generateSSL.js - Script de génération de certificats SSL
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script utilitaire pour générer des certificats SSL pour LUCIDE
 * Usage: npm run ssl:generate
 */

const CERT_DIR = path.join(__dirname, '../certificates');
const KEY_PATH = path.join(CERT_DIR, 'server.key');
const CERT_PATH = path.join(CERT_DIR, 'server.crt');
const CONFIG_PATH = path.join(CERT_DIR, 'openssl.conf');

/**
 * Créer la configuration OpenSSL
 */
function createOpenSSLConfig() {
  const config = `
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=France
L=Paris
O=Police Judiciaire
OU=OSINT Unit
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = ::1
IP.1 = 127.0.0.1
IP.2 = ::1
`;

  fs.writeFileSync(CONFIG_PATH, config.trim());
  console.log('✅ Configuration OpenSSL créée');
}

/**
 * Générer les certificats avec OpenSSL
 */
function generateWithOpenSSL() {
  try {
    console.log('🔧 Génération des certificats avec OpenSSL...');
    
    // Créer la clé privée
    execSync(`openssl genrsa -out "${KEY_PATH}" 4096`, { stdio: 'pipe' });
    console.log('✅ Clé privée générée');
    
    // Créer le certificat
    execSync(`openssl req -new -x509 -key "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -config "${CONFIG_PATH}"`, { stdio: 'pipe' });
    console.log('✅ Certificat généré');
    
    return true;
  } catch (error) {
    console.warn('⚠️  OpenSSL non disponible ou erreur:', error.message);
    return false;
  }
}

/**
 * Générer les certificats avec Node Forge (fallback)
 */
function generateWithNodeForge() {
  try {
    console.log('🔧 Génération des certificats avec Node Forge...');
    
    const forge = require('node-forge');
    
    // Générer une paire de clés RSA
    console.log('📝 Génération de la paire de clés RSA...');
    const keys = forge.pki.rsa.generateKeyPair(4096);
    
    // Créer le certificat
    console.log('📜 Création du certificat...');
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    // Attributs du certificat
    const attrs = [
      { name: 'countryName', value: 'FR' },
      { name: 'stateOrProvinceName', value: 'France' },
      { name: 'localityName', value: 'Paris' },
      { name: 'organizationName', value: 'Police Judiciaire' },
      { name: 'organizationalUnitName', value: 'OSINT Unit' },
      { name: 'commonName', value: 'localhost' }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Extensions
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
        clientAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '127.0.0.1' },
          { type: 2, value: '::1' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]);
    
    // Signer le certificat
    cert.sign(keys.privateKey);
    
    // Convertir en PEM
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);
    
    // Sauvegarder
    fs.writeFileSync(KEY_PATH, pemKey);
    fs.writeFileSync(CERT_PATH, pemCert);
    
    console.log('✅ Certificats générés avec Node Forge');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur avec Node Forge:', error.message);
    return false;
  }
}

/**
 * Afficher les informations du certificat
 */
function displayCertificateInfo() {
  try {
    const certContent = fs.readFileSync(CERT_PATH, 'utf8');
    const forge = require('node-forge');
    const cert = forge.pki.certificateFromPem(certContent);
    
    console.log('\n📋 INFORMATIONS DU CERTIFICAT :');
    console.log('================================');
    console.log('Sujet:', cert.subject.getField('CN').value);
    console.log('Émetteur:', cert.issuer.getField('CN').value);
    console.log('Valide du:', cert.validity.notBefore.toLocaleDateString('fr-FR'));
    console.log('Valide jusqu\'au:', cert.validity.notAfter.toLocaleDateString('fr-FR'));
    console.log('Numéro de série:', cert.serialNumber);
    
    // Extensions SAN
    const sanExt = cert.getExtension('subjectAltName');
    if (sanExt) {
      console.log('Noms alternatifs:');
      sanExt.altNames.forEach(alt => {
        if (alt.type === 2) console.log('  - DNS:', alt.value);
        if (alt.type === 7) console.log('  - IP:', alt.ip);
      });
    }
    
  } catch (error) {
    console.warn('⚠️  Impossible de lire les informations du certificat:', error.message);
  }
}

/**
 * Vérifier si les certificats existent déjà
 */
function checkExistingCertificates() {
  const keyExists = fs.existsSync(KEY_PATH);
  const certExists = fs.existsSync(CERT_PATH);
  
  if (keyExists && certExists) {
    console.log('📋 Certificats existants trouvés :');
    console.log('   Clé privée:', KEY_PATH);
    console.log('   Certificat:', CERT_PATH);
    
    const stats = fs.statSync(CERT_PATH);
    const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Âge: ${ageInDays} jour(s)`);
    
    return true;
  }
  
  return false;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔐 GÉNÉRATEUR DE CERTIFICATS SSL LUCIDE');
  console.log('=======================================\n');
  
  // Créer le dossier de certificats
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
    console.log('📁 Dossier certificates créé');
  }
  
  // Vérifier les certificats existants
  const hasExisting = checkExistingCertificates();
  
  if (hasExisting) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Voulez-vous régénérer les certificats ? (o/N): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'o' && answer.toLowerCase() !== 'oui') {
      console.log('🚫 Génération annulée');
      displayCertificateInfo();
      return;
    }
  }
  
  // Créer la configuration OpenSSL
  createOpenSSLConfig();
  
  // Essayer de générer avec OpenSSL en premier
  let success = generateWithOpenSSL();
  
  // Fallback sur Node Forge si OpenSSL échoue
  if (!success) {
    console.log('🔄 Tentative avec Node Forge...');
    success = generateWithNodeForge();
  }
  
  if (success) {
    console.log('\n🎉 CERTIFICATS GÉNÉRÉS AVEC SUCCÈS !');
    console.log('===================================');
    console.log('📁 Emplacement:', CERT_DIR);
    console.log('🔑 Clé privée:', path.basename(KEY_PATH));
    console.log('📜 Certificat:', path.basename(CERT_PATH));
    
    displayCertificateInfo();
    
    console.log('\n🚀 UTILISATION :');
    console.log('================');
    console.log('1. Démarrer le serveur HTTPS:');
    console.log('   npm run dev:https');
    console.log('');
    console.log('2. Accéder à l\'application:');
    console.log('   https://localhost:3443');
    console.log('');
    console.log('⚠️  IMPORTANT: Accepter l\'exception de sécurité dans le navigateur');
    console.log('   (certificat auto-signé pour développement)');
    
  } else {
    console.error('\n❌ ÉCHEC DE LA GÉNÉRATION');
    console.error('==========================');
    console.error('Impossible de générer les certificats.');
    console.error('Vérifiez que Node Forge est installé : npm install node-forge');
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = {
  generateWithOpenSSL,
  generateWithNodeForge,
  displayCertificateInfo,
  checkExistingCertificates
};