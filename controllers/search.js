import Inventory from '../models/inventory';

export const searchInventory = async (req, res) => {
  try {
    const { 
      skip = 0, 
      limit = 20,
      ...filters 
    } = req.query;

    // Procesar filtros
let searchQuery = {};

for (const key in queryParams) {
  if (key === 'facturado') {
    searchQuery[key] = queryParams[key] === 'true';
  } else if (!key.endsWith('[regex]')) {
    searchQuery[key] = queryParams[key];
  }
}

// Filtrar por regex
for (const key in queryParams) {
  if (key.endsWith('[regex]')) {
    const fieldName = key.replace('[regex]', '');
    const options = queryParams[`${fieldName}[options]`] || 'i';
    searchQuery[fieldName] = { $regex: queryParams[key], $options: options };
  }
}



    // Ejecutar consulta
    const items = await Inventory.find(query)
      .skip(Number(skip))
      .limit(Number(limit));

    const totalItems = await Inventory.countDocuments(query);

    res.json({
      success: true,
      items,
      totalItems,
      hasMore: skip + items.length < totalItems
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};