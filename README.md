# Documentação do Projeto: Microsserviços com NoSQL

## Visão Geral
Este projeto é uma arquitetura de microsserviços para um sistema de gerenciamento de produtos, listas de compras e usuários, utilizando bancos de dados NoSQL baseados em arquivos JSON. O sistema é composto por múltiplos serviços independentes, comunicando-se via API Gateway e Service Registry.

## Tecnologias Utilizadas
- **Node.js**
- **Express.js**
- **Axios** (comunicação entre serviços)
- **Morgan** (logs de requisições)
- **Helmet** (segurança HTTP)
- **CORS** (controle de acesso)
- **UUID** (identificadores únicos)
- **fs-extra** (manipulação de arquivos)
- **Banco de dados NoSQL**: arquivos JSON

## Estrutura de Pastas
```
lab03-microservices-nosql/
├── api-gateway/
│   └── server.js
├── services/
│   ├── product-service/
│   │   ├── server.js
│   │   └── database/
│   │       ├── products.json
│   │       └── products_index.json
│   ├── user-service/
│   │   ├── server.js
│   │   └── database/
│   │       ├── users.json
│   │       └── users_index.json
│   └── list-service/
│       ├── server.js
│       └── database/
│           ├── lists.json
│           └── lists_index.json
├── shared/
│   ├── JsonDatabase.js
│   ├── serviceRegistry.js
│   └── services-registry.json
├── client-demo.js
└── package.json
```

## Funcionalidades Principais
- Cadastro, autenticação e gerenciamento de usuários
- Cadastro, busca, atualização e remoção de produtos
- Criação e gerenciamento de listas de compras
- Busca global (produtos, usuários)
- Dashboard agregado com status dos serviços
- Service Discovery via Registry
- API Gateway para roteamento e proxy
- Health checks distribuídos
- Banco de dados por serviço (NoSQL)
- Armazenamento flexível em JSON

## Endpoints dos Serviços

### API Gateway
- `/api/products` - Proxy para Product Service
- `/api/products/:id` - Proxy para Product Service
- `/api/products/categories` - Proxy para Product Service
- `/api/users/auth/register` - Proxy para User Service
- `/api/users/auth/login` - Proxy para User Service
- `/api/lists` - Proxy para List Service
- `/api/lists/:id` - Proxy para List Service
- `/api/lists/:id/items` - Proxy para List Service
- `/api/dashboard` - Dashboard agregado
- `/api/search` - Busca global

### Product Service
- `GET /products` - Listar produtos (filtros: categoria, preço, destaque, ativo)
- `GET /products/:id` - Buscar produto por ID
- `POST /products` - Criar produto (requer autenticação)
- `PUT /products/:id` - Atualizar produto (requer autenticação)
- `DELETE /products/:id` - Remover produto (soft delete, requer autenticação)
- `PUT /products/:id/stock` - Atualizar estoque (requer autenticação)
- `GET /products/categories` - Listar categorias extraídas dos produtos
- `GET /search` - Busca full-text de produtos
- `GET /health` - Health check do serviço

### User Service
- `POST /users/auth/register` - Registrar usuário
- `POST /users/auth/login` - Login de usuário
- `POST /users/auth/validate` - Validar token JWT
- `GET /users/:id` - Buscar usuário por ID
- `GET /health` - Health check do serviço

### List Service
- `GET /lists` - Listar listas do usuário (requer autenticação)
- `POST /lists` - Criar lista (requer autenticação)
- `GET /lists/:id` - Buscar lista por ID
- `PUT /lists/:id` - Atualizar lista
- `DELETE /lists/:id` - Remover lista
- `POST /lists/:id/items` - Adicionar item à lista
- `DELETE /lists/:id/items/:itemId` - Remover item da lista
- `GET /health` - Health check do serviço

## Autenticação
- JWT (JSON Web Token) gerado pelo User Service
- Endpoints protegidos exigem header `Authorization: Bearer <token>`

## Exemplos de Uso
### Cadastro de Produto
```bash
curl --location 'http://localhost:3000/api/products' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Arroz Integral",
  "description": "Pacote de arroz integral 1kg",
  "price": 8.99,
  "stock": 20,
  "brand": "Camil",
  "category": { "name": "Alimentos", "slug": "alimentos" },
  "tags": ["arroz", "grãos"]
}'
```

### Buscar Produtos Ativos
```bash
curl --location 'http://localhost:3000/api/products?active=true'
```

### Criar Lista de Compras
```bash
curl --location 'http://localhost:3000/api/lists' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "name": "Lista do Mês",
  "description": "Compras mensais",
  "items": []
}'
```

## Observações
- Todos os serviços podem ser executados separadamente.
- O API Gateway faz o roteamento e proxy das requisições para os serviços corretos.
- O Service Registry permite descoberta dinâmica dos serviços e health check.
- O client-demo.js automatiza o fluxo de testes e demonstração do sistema.

## Autor
Caio Batella

Projeto acadêmico desenvolvido para disciplina de Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas.

---
