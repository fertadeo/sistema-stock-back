import { Router } from 'express';

interface SearchArea {
    name: string;
    viewbox: string;
    bounded: number;
}

interface GeocodeResult {
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    importance: number;
    formatted_address?: string;
}

const router = Router();

// Área de búsqueda para Río Cuarto
const RIO_CUARTO_AREA: SearchArea = {
    name: 'Río Cuarto',
    viewbox: '-64.4,-33.2,-64.2,-33.0', // Aproximadamente Río Cuarto
    bounded: 1
};

router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                error: 'El parámetro query es requerido y debe ser una cadena de texto'
            });
        }

        // Limpiamos y preparamos el término de búsqueda
        const cleanQuery = query.trim().toLowerCase();
        
        // Realizamos múltiples búsquedas con diferentes variaciones
        const searchTerms = [
            cleanQuery, // Búsqueda original
            cleanQuery.replace(/[áéíóúÁÉÍÓÚ]/g, (match: string) => {
                const accents: { [key: string]: string } = {
                    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
                    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U'
                };
                return accents[match] || match;
            }), // Sin acentos
            cleanQuery.replace(/^(pasaje|pje|calle|av|avenida|ruta)\s+/i, ''), // Sin prefijos comunes
            cleanQuery.split(/\s+/).join(' '), // Normalizar espacios
            cleanQuery.replace(/[^a-zA-Z0-9\s]/g, '') // Solo letras, números y espacios
        ];

        // Realizamos todas las búsquedas
        const allResults = await Promise.all(
            searchTerms.map(term => searchLocation(term, RIO_CUARTO_AREA))
        );

        // Combinamos y eliminamos duplicados
        const uniqueResults = new Map();
        allResults.flat().forEach(result => {
            const key = `${result.lat},${result.lon}`;
            if (!uniqueResults.has(key)) {
                uniqueResults.set(key, result);
            }
        });

        // Convertimos a array y filtramos por coincidencia
        const results = Array.from(uniqueResults.values());
        const searchWords = cleanQuery.split(/\s+/);
        
        // Filtramos los resultados que contengan todas las palabras de búsqueda y sean de Río Cuarto
        const filteredResults = results.filter(result => {
            const displayName = result.display_name.toLowerCase();
            const isInRioCuarto = displayName.includes('río cuarto') || 
                                 displayName.includes('rio cuarto') ||
                                 displayName.includes('municipio de río cuarto');
            
            return isInRioCuarto && searchWords.every(word => displayName.includes(word));
        }).map(result => ({
            ...result,
            formatted_address: formatAddress(result.display_name)
        }));

        // Ordenamos por importancia y limitamos a 10 resultados
        const finalResults = filteredResults
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 10);

        res.json(finalResults);
    } catch (error) {
        console.error('Error en geocoding:', error);
        res.status(500).json({
            error: 'Error al procesar la solicitud de geocoding'
        });
    }
});

async function searchLocation(query: string, area: SearchArea): Promise<GeocodeResult[]> {
    const searchParams = new URLSearchParams({
        q: `${query} ${area.name}`,
        format: 'json',
        limit: '50', // Aumentamos el límite para tener más resultados para filtrar
        viewbox: area.viewbox,
        bounded: '1', // Forzamos que los resultados estén dentro del viewbox
        addressdetails: '1',
        'accept-language': 'es',
        countrycodes: 'ar', // Limitamos a Argentina
        featuretype: 'street,residential,house,place' // Incluimos más tipos de lugares
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`, {
        headers: {
            'User-Agent': 'SoderiaApp/1.0',
            'Accept-Language': 'es'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en la respuesta de Nominatim: ${response.status}`);
    }

    const data = await response.json();
    return data.map((result: any) => ({
        display_name: result.display_name,
        lat: result.lat,
        lon: result.lon,
        type: result.type,
        importance: result.importance
    }));
}

function formatAddress(displayName: string): string {
    // Dividimos la dirección en partes
    const parts = displayName.split(',');
    
    // Buscamos el número de calle (si existe)
    const streetNumber = parts[0].match(/\d+/)?.[0] || '';
    
    // Buscamos el nombre de la calle
    const streetName = parts[0].replace(/\d+/g, '').trim();
    
    // Buscamos Río Cuarto en las partes
    const city = parts.find(part => 
        part.toLowerCase().includes('río cuarto') || 
        part.toLowerCase().includes('rio cuarto')
    )?.trim() || 'Río Cuarto';

    // Construimos la dirección formateada
    return `${streetName} ${streetNumber}, ${city}`.trim();
}

export default router; 