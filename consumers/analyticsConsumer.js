const amqp = require('amqplib');

// Configuração do RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'shopping_events';
const QUEUE_NAME = 'analytics_queue';
const ROUTING_KEY = 'list.checkout.#';

const analyticsData = {
  totalCheckouts: 0,
  totalRevenue: 0,
  totalItems: 0,
  checkoutHistory: []
};

/**
 * Consumer B: Analytics Service
 * Escuta mensagens de checkout e atualiza estatísticas do dashboard
 */
async function startAnalyticsConsumer() {
  try {
    console.log('[Analytics Consumer] Iniciando Analytics Service...');
    
    // Conectar ao RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    console.log('[Analytics Consumer] Conectado ao RabbitMQ');
    
    // Garantir que o exchange existe
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // Garantir que a fila existe
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Bind da fila ao exchange com routing key
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    
    console.log(`[Analytics Consumer] Aguardando mensagens na fila: ${QUEUE_NAME}`);
    console.log(`[Analytics Consumer] Exchange: ${EXCHANGE_NAME}, Routing Key: ${ROUTING_KEY}`);
    console.log('=====================================');
    
    // Consumir mensagens
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          
          // Atualizar estatísticas
          analyticsData.totalCheckouts++;
          analyticsData.totalRevenue += content.totalGasto || 0;
          analyticsData.totalItems += content.totalItems || 0;
          
          // Adicionar ao histórico (mantém últimos 10)
          analyticsData.checkoutHistory.unshift({
            listId: content.listId,
            userName: content.userName,
            totalGasto: content.totalGasto,
            totalItems: content.totalItems,
            completedAt: content.completedAt
          });
          
          if (analyticsData.checkoutHistory.length > 10) {
            analyticsData.checkoutHistory.pop();
          }
          
          // Log formatado do analytics
          console.log('\n=====================================');
          console.log('[ANALYTICS SERVICE]');
          console.log('Dashboard atualizado com nova compra:');
          console.log('-------------------------------------');
          console.log(`Lista: ${content.listName} (${content.listId})`);
          console.log(`Valor: R$ ${content.totalGasto.toFixed(2)}`);
          console.log(`Itens: ${content.totalItems}`);
          console.log('-------------------------------------');
          console.log('ESTATÍSTICAS GERAIS:');
          console.log(`Total de Checkouts: ${analyticsData.totalCheckouts}`);
          console.log(`Receita Total: R$ ${analyticsData.totalRevenue.toFixed(2)}`);
          console.log(`Total de Itens Vendidos: ${analyticsData.totalItems}`);
          console.log(`Ticket Médio: R$ ${(analyticsData.totalRevenue / analyticsData.totalCheckouts).toFixed(2)}`);
          console.log('=====================================\n');
          
          // Acknowledge da mensagem
          channel.ack(msg);
        } catch (error) {
          console.error('[Analytics Consumer] Erro ao processar mensagem:', error.message);
          // Reject e requeue em caso de erro
          channel.nack(msg, false, true);
        }
      }
    }, { noAck: false });
    
    // Handlers de erro
    connection.on('error', (err) => {
      console.error('[Analytics Consumer] ❌ Erro na conexão:', err.message);
    });
    
    connection.on('close', () => {
      console.log('[Analytics Consumer] Conexão fechada. Tentando reconectar em 5s...');
      setTimeout(() => startAnalyticsConsumer(), 5000);
    });
    
  } catch (error) {
    console.error('[Analytics Consumer] ❌ Erro ao iniciar consumer:', error.message);
    console.log('[Analytics Consumer] Tentando reconectar em 5s...');
    setTimeout(() => startAnalyticsConsumer(), 5000);
  }
}

// Endpoint HTTP simples para consultar estatísticas (opcional)
const express = require('express');
const app = express();
const PORT = 3005;

app.get('/analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalCheckouts: analyticsData.totalCheckouts,
        totalRevenue: analyticsData.totalRevenue,
        totalItems: analyticsData.totalItems,
        averageTicket: analyticsData.totalCheckouts > 0 
          ? analyticsData.totalRevenue / analyticsData.totalCheckouts 
          : 0
      },
      recentCheckouts: analyticsData.checkoutHistory
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-consumer' });
});

app.listen(PORT, () => {
  console.log(`[Analytics Consumer] API rodando na porta ${PORT}`);
  console.log(`[Analytics Consumer] Dashboard: http://localhost:${PORT}/analytics`);
});

// Iniciar consumer
startAnalyticsConsumer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Analytics Consumer] Encerrando...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Analytics Consumer] Encerrando...');
  process.exit(0);
});
