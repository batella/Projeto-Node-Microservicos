const amqp = require('amqplib');

// Configuração do RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'shopping_events';
const QUEUE_NAME = 'log_console_queue';
const ROUTING_KEY = 'list.checkout.#';

/**
 * Consumer A: Log/Notification Service
 * Escuta mensagens de checkout e simula envio de comprovante
 */
async function startLogConsumer() {
  try {
    console.log('[Log Consumer] Iniciando Log/Notification Service...');
    
    // Conectar ao RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    console.log('[Log Consumer] Conectado ao RabbitMQ');
    
    // Garantir que o exchange existe
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
    // Garantir que a fila existe
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Bind da fila ao exchange com routing key
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    
    console.log(`[Log Consumer] Aguardando mensagens na fila: ${QUEUE_NAME}`);
    console.log(`[Log Consumer] Exchange: ${EXCHANGE_NAME}, Routing Key: ${ROUTING_KEY}`);
    console.log('=====================================');
    
    // Consumir mensagens
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          
          // Log formatado conforme especificação
          console.log('\n=====================================');
          console.log('[LOG/NOTIFICATION SERVICE]');
          console.log(`Enviando comprovante da lista [${content.listId}] para o usuário [${content.userEmail}]`);
          console.log('-------------------------------------');
          console.log(`Lista: ${content.listName}`);
          console.log(`Total de Itens: ${content.totalItems}`);
          console.log(`Total Gasto: R$ ${content.totalGasto.toFixed(2)}`);
          console.log(`Finalizado em: ${content.completedAt}`);
          console.log('=====================================\n');
          
          // Acknowledge da mensagem
          channel.ack(msg);
        } catch (error) {
          console.error('[Log Consumer] Erro ao processar mensagem:', error.message);
          // Reject e requeue em caso de erro
          channel.nack(msg, false, true);
        }
      }
    }, { noAck: false });
    
    // Handlers de erro
    connection.on('error', (err) => {
      console.error('[Log Consumer] ❌ Erro na conexão:', err.message);
    });
    
    connection.on('close', () => {
      console.log('[Log Consumer] Conexão fechada. Tentando reconectar em 5s...');
      setTimeout(() => startLogConsumer(), 5000);
    });
    
  } catch (error) {
    console.error('[Log Consumer] ❌ Erro ao iniciar consumer:', error.message);
    console.log('[Log Consumer] Tentando reconectar em 5s...');
    setTimeout(() => startLogConsumer(), 5000);
  }
}

// Iniciar consumer
startLogConsumer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Log Consumer] Encerrando...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Log Consumer] Encerrando...');
  process.exit(0);
});
