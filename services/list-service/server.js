const express = require('express');
const bodyParser = require('body-parser');
const JsonDatabase = require('../../shared/JsonDatabase');
const axios = require('axios');
const app = express();
const PORT = 3004;

app.use(bodyParser.json());
// Logging de requisições
const morgan = require('morgan');
app.use(morgan('combined'));
// Headers informativos
app.use((req, res, next) => {
  res.setHeader('X-Service', 'list-service');
  res.setHeader('X-Service-Version', '1.0.0');
  res.setHeader('X-Database', 'JSON-NoSQL');
  next();
});

// Banco de dados
const db = new JsonDatabase(__dirname + '/database', 'lists');

// Função para atualizar o summary da lista
function updateListSummary(list) {
  const totalItems = list.items.length;
  const purchasedItems = list.items.filter(item => item.purchased).length;
  const estimatedTotal = list.items.reduce((sum, item) => sum + (item.estimatedPrice || 0) * (item.quantity || 1), 0);
  list.summary = {
    totalItems,
    purchasedItems,
    estimatedTotal
  };
}

// Middleware de autenticação JWT (simples, igual aos outros serviços)
// Auth middleware (valida token com User Service)
const serviceRegistry = require('../../shared/serviceRegistry');
async function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization') || req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token obrigatório'
    });
  }
  try {
    // Descobrir User Service
    const userService = serviceRegistry.discover('user-service');
    // Validar token com User Service
    const response = await axios.post(`${userService.url}/auth/validate`, {
      token: authHeader.replace('Bearer ', '')
    }, { timeout: 5000 });
    if (response.data.success) {
      req.user = response.data.data.user;
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  } catch (error) {
    console.error('Erro na validação do token:', error.message);
    res.status(503).json({
      success: false,
      message: 'Serviço de autenticação indisponível'
    });
  }
}

// CRUD de listas
// GET /lists - listar todas as listas do usuário
app.get('/lists', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`[List Service] GET /lists - userId: ${userId}`);
  const lists = await db.find({ userId });
  res.json(lists);
});

// POST /lists - criar nova lista
app.post('/lists', authenticateToken, async (req, res) => {
  console.log('[List Service] POST /lists - Criando nova lista');
  const userId = req.user.id;
  const { name, description, items } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da lista obrigatório' });
  let processedItems = [];
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      if (!item.itemId || !item.quantity) continue;
      try {
        const productServiceUrl = 'http://127.0.0.1:3003/products/' + item.itemId;
          const response = await axios.get(productServiceUrl);
          const product = response.data.data;
          processedItems.push({
            itemId: item.itemId,
            itemName: product?.name || '',
            quantity: item.quantity,
            unit: item.unit || (product?.unit || ''),
            estimatedPrice: product?.price || 0,
            purchased: item.purchased || false,
            notes: item.notes || '',
            addedAt: new Date().toISOString()
          });
      } catch (err) {
        // Produto não encontrado, ignora ou adiciona vazio
        processedItems.push({
          itemId: item.itemId,
          itemName: '',
          quantity: item.quantity,
          unit: item.unit || '',
          estimatedPrice: 0,
          purchased: item.purchased || false,
          notes: item.notes || '',
          addedAt: new Date().toISOString()
        });
      }
    }
  }
  const newList = {
    id: require('uuid').v4(),
    userId,
    name,
    description: description || '',
    status: 'active',
    items: processedItems,
    summary: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  updateListSummary(newList);
  await db.create(newList);
  res.status(201).json(newList);
});

// GET /lists/:id - obter uma lista específica
app.get('/lists/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`[List Service] GET /lists/${req.params.id} - userId: ${userId}`);
  const list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  res.json(list);
});

// PUT /lists/:id - atualizar lista
app.put('/lists/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`[List Service] PUT /lists/${req.params.id} - userId: ${userId}`);
  const { name, description, status, items } = req.body;
  let list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  if (name !== undefined) list.name = name;
  if (description !== undefined) list.description = description;
  if (status !== undefined) list.status = status;
  if (items !== undefined && Array.isArray(items)) {
    // Enriquecer cada item com nome e preço do produto
    const enrichedItems = [];
    for (const item of items) {
      if (!item.itemId || !item.quantity) continue;
      try {
        const productServiceUrl = 'http://127.0.0.1:3003/products/' + item.itemId;
        const response = await require('axios').get(productServiceUrl);
        const product = response.data.data;
        enrichedItems.push({
          itemId: item.itemId,
          itemName: product?.name || '',
          quantity: item.quantity,
          unit: item.unit || (product?.unit || ''),
          estimatedPrice: product?.price || 0,
          purchased: item.purchased || false,
          notes: item.notes || '',
          addedAt: item.addedAt || new Date().toISOString()
        });
      } catch (err) {
        console.log(` Produto não encontrado: ${item.itemId}`);
        enrichedItems.push({
          itemId: item.itemId,
          itemName: '',
          quantity: item.quantity,
          unit: item.unit || '',
          estimatedPrice: 0,
          purchased: item.purchased || false,
          notes: item.notes || '',
          addedAt: item.addedAt || new Date().toISOString()
        });
      }
    }
    list.items = enrichedItems;
  }
  updateListSummary(list);
  list.updatedAt = new Date().toISOString();
  await db.update(list.id, list);
  res.json(list);
});

// DELETE /lists/:id - remover lista
app.delete('/lists/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`[List Service] DELETE /lists/${req.params.id} - userId: ${userId}`);
  const list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  await db.delete(list.id);
  res.json({ success: true });
});

// POST /lists/:id/products - adicionar produto à lista
// Adicionar item à lista: busca nome e preço do produto automaticamente
//const axios = require('axios');
app.post('/lists/:id/items', authenticateToken, async (req, res) => {
  console.log(`[List Service] POST /lists/${req.params.id}/items - userId: ${req.user.id}`);
  const userId = req.user.id;
  const { itemId, quantity, unit, notes } = req.body;
  let list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  if (!itemId || !quantity) return res.status(400).json({ error: 'Campos obrigatórios: itemId, quantity' });
  // Regra: não duplicar item na lista
  if (list.items.find(item => item.itemId === itemId)) {
    return res.status(400).json({ error: 'Item já está na lista' });
  }
  // Buscar nome e preço do produto no Product Service
  try {
    const productServiceUrl = 'http://127.0.0.1:3003/products/' + itemId;
    const response = await axios.get(productServiceUrl);
    const product = response.data;
    const newItem = {
      itemId,
      itemName: product.name || '',
      quantity,
      unit: unit || (product.unit || ''),
      estimatedPrice: product.price || 0,
      purchased: false,
      notes: notes || '',
      addedAt: new Date().toISOString()
    };
    list.items.push(newItem);
    updateListSummary(list);
    await db.update(list.id, list);
    res.json(list);
  } catch (err) {
    return res.status(404).json({ error: 'Produto não encontrado no Product Service' });
  }
});


// Atualizar item da lista
app.put('/lists/:id/items/:itemId', authenticateToken, async (req, res) => {
  console.log(`[List Service] PUT /lists/${req.params.id}/items/${req.params.itemId} - userId: ${req.user.id}`);
  const userId = req.user.id;
  let list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  const idx = list.items.findIndex(item => item.itemId === req.params.itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item não está na lista' });
  const item = list.items[idx];
  // Atualizar campos permitidos
  const { itemName, quantity, unit, estimatedPrice, purchased, notes } = req.body;
  if (itemName !== undefined) item.itemName = itemName;
  if (quantity !== undefined) item.quantity = quantity;
  if (unit !== undefined) item.unit = unit;
  if (estimatedPrice !== undefined) item.estimatedPrice = estimatedPrice;
  if (purchased !== undefined) item.purchased = purchased;
  if (notes !== undefined) item.notes = notes;
  updateListSummary(list);
  await db.update(list.id, list);
  res.json(list);
});

// Remover item da lista
app.delete('/lists/:id/items/:itemId', authenticateToken, async (req, res) => {
  console.log(`[List Service] DELETE /lists/${req.params.id}/items/${req.params.itemId} - userId: ${req.user.id}`);
  const userId = req.user.id;
  let list = await db.findOne({ id: req.params.id, userId });
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  const idx = list.items.findIndex(item => item.itemId === req.params.itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item não está na lista' });
  list.items.splice(idx, 1);
  updateListSummary(list);
  await db.update(list.id, list);
  res.json(list);
});

app.get('/health', (req, res) => {
  console.log('[List Service] Health check solicitado');
  res.status(200).json({ status: 'ok' });
});


app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  serviceRegistry.register('list-service', {
    url,
    host: 'localhost',
    port: PORT,
    protocol: 'http'
  });
  console.log('=====================================');
  console.log(`List Service iniciado na porta ${PORT}`);
  console.log(`URL: ${url}`);
  console.log(`Health: ${url}/health`);
  console.log(`Database: JSON-NoSQL`);
  console.log('=====================================');
});
