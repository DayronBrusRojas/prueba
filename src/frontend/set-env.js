const fs = require('fs');
const path = require('path');

// Ruta del archivo de configuración de API en el frontend
const targetPath = path.join(__dirname, 'src', 'app', 'config', 'api.config.ts');

// Leer la variable de entorno de Vercel (o usar localhost por defecto para desarrollo local)
const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080/api';

const fileContent = `export const API_BASE_URL = '${apiUrl}';\n`;

try {
  fs.writeFileSync(targetPath, fileContent, 'utf8');
  console.log(`[set-env] API_BASE_URL escrita correctamente: ${apiUrl}`);
} catch (err) {
  console.error('[set-env] Error al escribir la configuración de la API:', err);
  process.exit(1);
}
