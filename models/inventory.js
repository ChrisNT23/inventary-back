import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
  nParte: { 
    type: String, 
    required: true,
    trim: true,
    uppercase: true
  },
  descripcion: { 
    type: String, 
    required: true,
    trim: true
  },
  serial: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['HW', 'SW'], // Solo permite estos valores
    uppercase: true
  },
  cliente: {
    type: String,
    required: true,
    trim: true
  },
  oc: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Por entregar', 'En progreso', 'Enviado', 'Entregado'], // Valores actualizados
    default: 'Por entregar'
  },
  facturado: {
    type: Boolean,
    required: true,
    default: false
  },
  numeroFactura: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Solo validar si facturado es true
        if (this.facturado) {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Número de factura es requerido cuando el item está facturado'
    }
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  ultimaModificacion: { 
    type: Date, 
    default: Date.now 
  }
}, {
  versionKey: false // Elimina el campo __v
});

// Actualizar fecha de modificación antes de guardar
InventorySchema.pre('save', function(next) {
  this.ultimaModificacion = new Date();
  next();
});

// Middleware para validar antes de actualizar
InventorySchema.pre('findOneAndUpdate', function(next) {
  this.set({ ultimaModificacion: new Date() });
  next();
});

// Método estático para búsqueda con filtros
InventorySchema.statics.search = async function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = { fechaCreacion: -1 },
    populate = 'creadoPor'
  } = options;

  // Construir query de búsqueda
  const query = {};
  
  // Filtros de texto (búsqueda por coincidencia parcial)
  const textFilters = ['nParte', 'descripcion', 'serial', 'cliente', 'oc', 'numeroFactura'];
  textFilters.forEach(field => {
    if (filters[field]) {
      query[field] = { $regex: filters[field], $options: 'i' };
    }
  });

  // Filtros exactos
  if (filters.tipo) query.tipo = filters.tipo;
  if (filters.status) query.status = filters.status;
  if (typeof filters.facturado !== 'undefined') {
    query.facturado = filters.facturado === 'true' || filters.facturado === true;
  }

  // Filtros por fecha
  if (filters.fechaDesde || filters.fechaHasta) {
    query.fechaCreacion = {};
    if (filters.fechaDesde) query.fechaCreacion.$gte = new Date(filters.fechaDesde);
    if (filters.fechaHasta) query.fechaCreacion.$lte = new Date(filters.fechaHasta);
  }

  // Ejecutar consulta con paginación
  const results = await this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(populate)
    .lean()
    .exec();

  // Contar total de documentos para paginación
  const total = await this.countDocuments(query);

  return {
    results,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Índices para mejorar performance de búsquedas
InventorySchema.index({ nParte: 1 });
InventorySchema.index({ serial: 1 });
InventorySchema.index({ cliente: 1 });
InventorySchema.index({ oc: 1 });
InventorySchema.index({ status: 1 });
InventorySchema.index({ facturado: 1 });
InventorySchema.index({ fechaCreacion: -1 });


export default mongoose.model('Inventory', InventorySchema);