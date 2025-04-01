import Inventory from '../models/inventory';

export const searchInventory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'fechaCreacion', 
      sortOrder = 'desc',
      ...filters 
    } = req.query;

    // Procesar filtros de regex
    const processedFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (key.endsWith('[regex]')) {
        const fieldName = key.replace('[regex]', '');
        const options = filters[`${fieldName}[options]`] || 'i';
        processedFilters[fieldName] = { $regex: value, $options: options };
      } else if (!key.includes('[options]')) {
        processedFilters[key] = value;
      }
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const items = await Inventory.find(processedFilters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalItems = await Inventory.countDocuments(processedFilters);

    res.json({
      success: true,
      items,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Error al buscar en el inventario'
    });
  }
};