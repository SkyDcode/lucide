const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: err.message
    });
  }

  // Erreur SQLite
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Erreur base de données',
      code: err.code
    });
  }

  // Erreur générique
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
