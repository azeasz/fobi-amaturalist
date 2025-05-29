const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

const server = http.createServer(app);


const wss = new WebSocket.Server({ 
    server: server,  
    path: '/ws'      
});

// Simpan koneksi cok
const connections = new Map();

// Log
wss.on('listening', () => {
    console.log('WebSocket server is listening');
});

// Log setiap error di server
wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Handle koneksi baru
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection attempt');
    
    try {
        // Parse URL parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clientId = url.searchParams.get('clientId');
        const checklistId = url.searchParams.get('checklistId');

        if (!clientId || !checklistId) {
            console.log('Missing required parameters');
            ws.close(1002, 'Missing required parameters');
            return;
        }

        console.log(`Client connected - ID: ${clientId}, Checklist: ${checklistId}`);

        // Set properties
        ws.isAlive = true;
        ws.clientId = clientId;
        ws.checklistId = checklistId;

        // Store connection
        if (!connections.has(checklistId)) {
            connections.set(checklistId, new Set());
        }
        connections.get(checklistId).add(ws);

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'CONNECTION_SUCCESS',
            message: 'Connected to WebSocket server'
        }));

        // Heartbeat
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Handle messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('Received message:', message);

                // Broadcast to all clients in same checklist
                const clients = connections.get(checklistId);
                if (clients) {
                    clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN && client !== ws) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log(`Client disconnected: ${clientId}`);
            if (connections.has(checklistId)) {
                connections.get(checklistId).delete(ws);
                if (connections.get(checklistId).size === 0) {
                    connections.delete(checklistId);
                }
            }
        });

    } catch (error) {
        console.error('Error in connection handler:', error);
        ws.close(1011, 'Internal server error');
    }
});

// Heartbeat interval
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log(`Terminating inactive client: ${ws.clientId}`);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        connections: wss.clients.size
    });
});

// Start server
const PORT = process.env.PORT || 3000; 
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
