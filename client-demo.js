const axios = require('axios');
class MicroservicesClient {
	// Criar lista (requer autenticação)
	async createList(listData) {
		try {
			console.log('\nCriando lista...');
			if (!this.authToken) {
				throw new Error('Token de autenticação necessário');
			}
			const response = await this.api.post('/api/lists', listData);
			if (response.data && response.data.id) {
				console.log('Lista criada:', response.data.name);
				return response.data;
			} else {
				throw new Error('Falha na criação da lista');
			}
		} catch (error) {
			const message = error.response?.data?.message || error.message;
			console.log('Erro ao criar lista:', message);
			throw error;
		}
	}

	// Adicionar item à lista
	async addItemToList(listId, itemData) {
		try {
			console.log(`\nAdicionando item à lista ${listId}...`);
			if (!this.authToken) {
				throw new Error('Token de autenticação necessário');
			}
			const response = await this.api.post(`/api/lists/${listId}/items`, itemData);
			if (response.data && response.data.id) {
				console.log('Item adicionado à lista:', itemData.itemId);
				return response.data;
			} else {
				throw new Error('Falha ao adicionar item à lista');
			}
		} catch (error) {
			const message = error.response?.data?.message || error.message;
			console.log('Erro ao adicionar item à lista:', message);
			throw error;
		}
	}

	// Visualizar listas do usuário
	async getLists() {
		try {
			console.log('\nBuscando listas do usuário...');
			if (!this.authToken) {
				throw new Error('Token de autenticação necessário');
			}
			const response = await this.api.get('/api/lists');
			if (Array.isArray(response.data)) {
				console.log(`Encontradas ${response.data.length} listas`);
				response.data.forEach((list, idx) => {
					console.log(` ${idx + 1}. ${list.name} (${list.id}) - ${list.items.length} itens`);
				});
				return response.data;
			} else {
				throw new Error('Falha ao buscar listas');
			}
		} catch (error) {
			const message = error.response?.data?.message || error.message;
			console.log('Erro ao buscar listas:', message);
			throw error;
		}
	}
constructor(gatewayUrl = 'http://127.0.0.1:3000') {
this.gatewayUrl = gatewayUrl;
this.authToken = null;
this.user = null;
// Configurar axios
this.api = axios.create({
baseURL: gatewayUrl,
timeout: 10000,
family: 4 // Forçar IPv4
});
// Interceptor para adicionar token automaticamente
this.api.interceptors.request.use(config => {
if (this.authToken) {
config.headers.Authorization = `Bearer ${this.authToken}`;
}
return config;
});
// Interceptor para log de erros
this.api.interceptors.response.use(
response => response,
error => {
console.error('Erro na requisição:', {
url: error.config?.url,
method: error.config?.method,
status: error.response?.status,
message: error.response?.data?.message || error.message
});
return Promise.reject(error);
}
);
}
// Registrar usuário
async register(userData) {
try {
console.log('\nRegistrando usuário...');
const response = await this.api.post('/api/users/auth/register',
userData);
if (response.data.success) {
this.authToken = response.data.data.token;
this.user = response.data.data.user;
console.log('Usuário registrado:', this.user.username);
return response.data;
} else {
throw new Error(response.data.message || 'Falha no registro');
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro no registro:', message);
throw error;
}
}
// Fazer login
async login(credentials) {
try {
console.log('\nFazendo login...');
const response = await this.api.post('/api/users/auth/login',
credentials);
if (response.data.success) {
this.authToken = response.data.data.token;
this.user = response.data.data.user;
console.log('Login realizado:', this.user.username);
return response.data;
} else {
throw new Error(response.data.message || 'Falha no login');
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro no login:', message);
throw error;
}
}
// Buscar produtos
async getProducts(filters = {}) {
try {
console.log('\nBuscando produtos...');
const response = await this.api.get('/api/products', { params:
filters });
if (response.data.success) {
const products = response.data.data;
console.log(`Encontrados ${products.length} produtos`);
products.forEach((product, index) => {
const tags = product.tags ? ` [${product.tags.join(', ')}]` :
'';
console.log(` ${index + 1}. ${product.name} - R$ $
{product.price} (Estoque: ${product.stock})${tags}`);
});
return response.data;
} else {
console.log('Resposta inválida do servidor');
return { data: [] };
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro ao buscar produtos:', message);
return { data: [] };
}
}
// Criar produto (requer autenticação)
async createProduct(productData) {
try {
console.log('\nCriando produto...');
if (!this.authToken) {
throw new Error('Token de autenticação necessário');
}
const response = await this.api.post('/api/products', productData);
if (response.data.success) {
console.log('Produto criado:', response.data.data.name);
return response.data;
} else {
throw new Error(response.data.message || 'Falha na criação do produto');
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro ao criar produto:', message);
throw error;
}
}
// Buscar categorias
async getCategories() {
try {
console.log('\nBuscando categorias...');
const response = await this.api.get('/api/products/categories');
if (response.data.success) {
const categories = response.data.data;
console.log(`Encontradas ${categories.length} categorias`);
categories.forEach((category, index) => {
	console.log(` ${index + 1}. ${category.name} - ${category.productCount} produtos`);
});
return response.data;
} else {
console.log('Resposta inválida do servidor');
return { data: [] };
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro ao buscar categorias:', message);
return { data: [] };
}
}
// Dashboard agregado
async getDashboard() {
try {
console.log('\nBuscando dashboard...');
if (!this.authToken) {
throw new Error('Token de autenticação necessário para o dashboard');
}
const response = await this.api.get('/api/dashboard');
if (response.data.success) {
const dashboard = response.data.data;
console.log('Dashboard carregado:');
console.log(` Timestamp: ${dashboard.timestamp}`);
console.log(` Arquitetura: ${dashboard.architecture}`);
console.log(` Banco de Dados: ${dashboard.database_approach}`);
console.log(` Status dos Serviços:`);
if (dashboard.services_status) {
Object.entries(dashboard.services_status).forEach(([serviceName, serviceInfo]) => {
const status = serviceInfo.healthy ? 'SAUDÁVEL' :
'INDISPONÍVEL';
	console.log(` ${serviceName}: ${status} (${serviceInfo.url})`);
});
}
	console.log(` Usuários disponíveis: ${dashboard.data?.users?.available ? 'Sim' : 'Não'}`);
	console.log(` Produtos disponíveis: ${dashboard.data?.products?.available ? 'Sim' : 'Não'}`);
	console.log(` Categorias disponíveis: ${dashboard.data?.categories?.available ? 'Sim' : 'Não'}`);
return response.data;
} else {
throw new Error(response.data.message || 'Falha ao carregar dashboard');
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro ao buscar dashboard:', message);
throw error;
}
}
// Busca global
async search(query) {
try {
console.log(`\nBuscando por: "${query}"`);
const response = await this.api.get('/api/search', { params: { q: query
} });
if (response.data.success) {
const results = response.data.data;
console.log(`Resultados para "${results.query}":`);
if (results.products?.available) {
console.log(` Produtos encontrados: ${results.products.results.length}`);
results.products.results.forEach((product, index) => {
console.log(` ${index + 1}. ${product.name} - R$ ${product.price}`);
});
} else {
console.log(' Serviço de produtos indisponível');
}
if (results.users?.available) {
console.log(` Usuários encontrados: ${results.users.results.length}`);
results.users.results.forEach((user, index) => {
console.log(` ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
});
} else if (results.users?.error) {
console.log(' Busca de usuários requer autenticação');
}
return response.data;
} else {
throw new Error(response.data.message || 'Falha na busca');
}
} catch (error) {
const message = error.response?.data?.message || error.message;
console.log('Erro na busca:', message);
throw error;
}
}
// Verificar saúde dos serviços
async checkHealth() {
try {
console.log('\nVerificando saúde dos serviços...');
const [gatewayHealth, registryInfo] = await Promise.allSettled([
this.api.get('/health'),
this.api.get('/registry')
]);
if (gatewayHealth.status === 'fulfilled') {
const health = gatewayHealth.value.data;
console.log('API Gateway: healthy');
console.log(`Arquitetura: ${health.architecture}`);
if (registryInfo.status === 'fulfilled') {
const services = registryInfo.value.data.services;
console.log('Serviços registrados:');
Object.entries(services).forEach(([name, info]) => {
const status = info.healthy ? 'SAUDÁVEL' : 'INDISPONÍVEL';
const uptime = Math.floor(info.uptime / 1000);
console.log(` ${name}: ${status} (${info.url}) - uptime:
${uptime}s`);
});
} else {
console.log(' Erro ao buscar registry:',
registryInfo.reason?.message);
}
} else {
console.log('API Gateway indisponível:',
gatewayHealth.reason?.message);
}
return { gatewayHealth, registryInfo };
} catch (error) {
console.log('Erro ao verificar saúde:', error.message);
throw error;
}
}
// Demonstração completa
async runDemo() {
console.log('=====================================');
console.log('Demo: Microsserviços com NoSQL');
console.log('=====================================');
try {
		// 1. Verificar saúde dos serviços
		await this.checkHealth();
		await this.delay(2000);
		// 2. Registrar usuário
		const uniqueId = Date.now();
		const userData = {
			email: `demo${uniqueId}@microservices.com`,
			username: `demo${uniqueId}`,
			password: 'demo123456',
			firstName: 'Demo',
			lastName: 'User'
		};
		let authSuccessful = false;
		try {
			await this.register(userData);
			authSuccessful = true;
		} catch (error) {
			// Se registro falhar, tentar login com admin
			console.log('\nTentando login com usuário admin...');
			try {
				await this.login({
					identifier: 'admin@microservices.com',
					password: 'admin123'
				});
				authSuccessful = true;
			} catch (loginError) {
				console.log('Login com admin falhou, continuando sem autenticação...');
				authSuccessful = false;
			}
		}
		await this.delay(1000);
		// 3. Buscar produtos
		const productsResp = await this.getProducts({ limit: 5 });
		await this.delay(1000);
		// 4. Buscar categorias
		await this.getCategories();
		await this.delay(1000);
		// 5. Fazer busca
		await this.search('smartphone');
		await this.delay(1000);
		// 6. Criar lista e adicionar itens
		if (authSuccessful && this.authToken) {
			// Criar lista de teste
			const listData = {
				name: 'Lista Demo',
				description: 'Lista criada via client-demo',
				items: []
			};
			const list = await this.createList(listData);
			await this.delay(1000);
			// Adicionar dois itens à lista (usando os dois primeiros produtos)
			if (productsResp && productsResp.data && productsResp.data.length >= 2) {
				const prod1 = productsResp.data[0];
				const prod2 = productsResp.data[1];
				await this.addItemToList(list.id, { itemId: prod1.id, quantity: 2 });
				await this.delay(500);
				await this.addItemToList(list.id, { itemId: prod2.id, quantity: 1 });
				await this.delay(500);
			}
			// Visualizar listas do usuário
			await this.getLists();
			await this.delay(1000);
			// Visualizar dashboard
			try {
				await this.getDashboard();
				await this.delay(1000);
			} catch (error) {
				console.log('Dashboard não disponível:', error.message);
			}
		} else {
			console.log('\nOperações autenticadas puladas (sem token válido)');
		}
		console.log('\n=====================================');
		console.log('Demonstração concluída com sucesso!');
		console.log('=====================================');
		console.log('Padrões demonstrados:');
		console.log(' Service Discovery via Registry');
		console.log(' API Gateway com roteamento');
		console.log(' Circuit Breaker pattern');
		console.log(' Comunicação inter-service');
		console.log(' Aggregated endpoints');
		console.log(' Health checks distribuídos');
		console.log(' Database per Service (NoSQL)');
		console.log(' JSON-based document storage');
		console.log(' Full-text search capabilities');
		console.log(' Schema flexível com documentos aninhados');
	} catch (error) {
		console.error('Erro na demonstração:', error.message);
		console.log('\nVerifique se todos os serviços estão rodando:');
		console.log(' User Service: http://127.0.0.1:3001/health');
		console.log(' Product Service: http://127.0.0.1:3003/health');
			console.log(' API Gateway: http://127.0.0.1:3000/health');
		}
	}
}

// Função utilitária para delay
MicroservicesClient.prototype.delay = function (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
};

// Bloco principal para executar a demonstração
async function main() {
	const client = new MicroservicesClient();
	await client.runDemo();
}

if (require.main === module) {
	main();
}