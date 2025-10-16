// Urban Mobility Data Explorer - Backend Server

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const logger = require('./config/logger');
const { testConnection, closePool } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8000;
        this.host = process.env.HOST || 'localhost';
        
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
        this.initializeRateLimiting();
    }

    /**
     * Initialize middleware
     */
    initializeMiddlewares() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Compression middleware
        this.app.use(compression());

        // Request logging
        this.app.use(morgan('combined', { stream: logger.stream }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID middleware
        this.app.use((req, res, next) => {
            req.id = Math.random().toString(36).substr(2, 9);
            res.setHeader('X-Request-ID', req.id);
            next();
        });

        logger.info('Middlewares initialized');
    }

    /**
     * Initialize rate limiting
     */
    initializeRateLimiting() {
        const rateLimiter = new RateLimiterMemory({
            keyPrefix: 'middleware',
            points: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
            duration: process.env.RATE_LIMIT_WINDOW_MS ? 
                     parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 : 900
        });

        this.app.use(async (req, res, next) => {
            try {
                await rateLimiter.consume(req.ip);
                next();
            } catch (rej) {
                logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
                res.status(429).json({
                    success: false,
                    message: 'Too many requests, please try again later'
                });
            }
        });

        logger.info('Rate limiting initialized');
    }

    /**
     * Initialize routes
     */
    initializeRoutes() {
        // API routes
        this.app.use('/api', routes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'Urban Mobility Data Explorer API',
                version: '1.0.0',
                documentation: '/api/docs',
                health: '/api/health',
                timestamp: new Date().toISOString()
            });
        });

        logger.info('Routes initialized');
    }

    /**
     * Initialize error handling
     */
    initializeErrorHandling() {
        // 404 handler
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);

        logger.info('Error handling initialized');
    }

    /**
     * Start the server
     */
    async start() {
        try {
            // Test database connection
            const dbConnected = await testConnection();
            if (!dbConnected) {
                logger.error('Failed to connect to database. Server will not start.');
                process.exit(1);
            }

            // Start server
            this.server = this.app.listen(this.port, this.host, () => {
                logger.info(`Server running on http://${this.host}:${this.port}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`API Documentation: http://${this.host}:${this.port}/api/docs`);
            });

            // Graceful shutdown handlers
            this.setupGracefulShutdown();

        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}. Starting graceful shutdown...`);
            
            // Close server
            if (this.server) {
                this.server.close(async () => {
                    logger.info('HTTP server closed');
                    
                    // Close database connections
                    await closePool();
                    
                    logger.info('Graceful shutdown completed');
                    process.exit(0);
                });
            }
        };

        // Handle different termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }
}

// Create and start server
const server = new Server();
server.start();

module.exports = server;
