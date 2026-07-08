Aprendé cómo usar Afip SDK con Node.js.

Requisitos previos
Para poder seguir esta guía, primero necesitarás:

Obtener un access_token de Afip SDK

1. Instalación
Agregá la librería de Afip SDK en Node.js.

npm
yarn
pnpm

Copiar
npm install @afipsdk/afip.js
2. Crear una instancia de la clase Afip
Para usar los Web Services de ARCA se necesita un certificado digital, pero con Afip SDK podés empezar en modo desarrollo usando el CUIT 20-40937847-2 sin necesidad de uno. 

Si preferís usar tu propio certificado, al final te mostramos cómo.

server.ts

Copiar
import Afip from '@afipsdk/afip.js';

const afip = new Afip({ 
    CUIT: 20409378472,
    access_token: 'TU_ACCESS_TOKEN' // Obtenido de https://app.afipsdk.com
});
3. Llamar al método del Web Service que necesites
Con la instancia creada ya podés realizar las llamadas a los Web Services que necesites.

Web services
Si el Web Service que necesitás no se encuentra en la lista de la documentación, podés llamarlo siguiendo esta guía:

Otro web service
Podés usar la referencia de la API para obtener ejemplos de cómo usar los métodos de todos los web services de ARCA.

Logo
Referencia de API
afipsdk.com
También podés usar las guías del blog de Afip SDK para JavaScript:

Logo
Javascript | Blog
afipsdk.com
Usar tu propio certificado (Opcional)
Primero, obtenemos el certificado siguiendo esta guía.

Logo
Obtener el certificado para conectar tu sistema con los web services de ARCA
afipsdk.com
Y luego lo agregamos a la instancia de la clase Afip.

server.ts

Copiar
import fs from 'fs';
import Afip from '@afipsdk/afip.js';

// Certificado (Puede estar guardado en archivos, DB, etc)
const cert = fs.readFileSync('ruta/a/certificado.crt', {encoding: 'utf8'});

// Key (Puede estar guardado en archivos, DB, etc)
const key = fs.readFileSync('ruta/a/key.key', {encoding: 'utf8'});

// CUIT del certificado
const CUIT = 20111111112;

const afip = new Afip({ 
    cert, 
    key, 
    CUIT,
    access_token: 'TU_ACCESS_TOKEN' // Obtenido de https://app.afipsdk.com
});
Última actualización hace 2 días