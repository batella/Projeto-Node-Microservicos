const amqp = require('amqplib');

// Configuração do RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'shopping_events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;

/**
 * Conecta ao RabbitMQ e cria o canal
 */
async function connect() {
  try {
    if (connection && channel) {
      return channel;
    }

    console.log('[RabbitMQ] Conectando ao RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Garantir que o exchange existe
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true
    });
    
    console.log(`[RabbitMQ] Conectado! Exchange: ${EXCHANGE_NAME}`);
    
    // Handlers para reconexão
    connection.on('error', (err) => {
      console.error('[RabbitMQ] Erro na conexão:', err.message);
      connection = null;
      channel = null;
    });
    
    connection.on('close', () => {
      console.log('[RabbitMQ] Conexão fechada');
      connection = null;
      channel = null;
    });
    
    return channel;
  } catch (error) {
    console.error('[RabbitMQ] Erro ao conectar:', error.message);
    throw error;
  }
}

/**
 * Publica uma mensagem no exchange
 * @param {string} routingKey - Routing key para direcionar a mensagem
 * @param {object} message - Objeto da mensagem a ser enviada
 */
async function publishMessage(routingKey, message) {
  try {
    const ch = await connect();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const published = ch.publish(
      EXCHANGE_NAME,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now()
      }
    );
    
    if (published) {
      console.log(`[RabbitMQ] Mensagem publicada: ${routingKey}`);
      console.log(`[RabbitMQ] Payload:`, message);
    }
    
    return published;
  } catch (error) {
    console.error('[RabbitMQ] Erro ao publicar mensagem:', error.message);
    throw error;
  }
}

/**
 * Fecha a conexão com RabbitMQ
 */
async function close() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('[RabbitMQ] Conexão fechada com sucesso');
  } catch (error) {
    console.error('[RabbitMQ] Erro ao fechar conexão:', error.message);
  }
}

module.exports = {
  connect,
  publishMessage,
  close,
  EXCHANGE_NAME,
  EXCHANGE_TYPE
};
