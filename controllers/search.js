import Inventory from '../models/inventory';

export const searchInventory = async (req, res) => {
  try {
    const { 
      skip = 0, 
      limit = 20,
      ...filters 
    } = req.query;

    // Procesar filtros
    const query = {};
    
    for (const key in filters) {
      if (filters[key] === '' || filters[key] === undefined) continue;
      
      // Manejar campos con regex
      if (key.endsWith('[regex]')) {
        const fieldName = key.replace('[regex]', '');
        const options = filters[`${fieldName}[options]`] || 'i';
        query[fieldName] = { $regex: filters[key], $options: options };
      } 
      // Manejar campos booleanos
      else if (key === 'facturado') {
        query[key] = filters[key] === 'true';
      }
      // Manejar otros campos
      else if (!key.includes('[options]')) {
        query[key] = filters[key];
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