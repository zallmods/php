// Import required modules
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure servers
const servers = [
    { name: 'Server 1', url: 'http://server1.example.com/index.php' },
    { name: 'Server 2', url: 'http://server2.example.com/index.php' },
    { name: 'Server 3', url: 'http://server3.example.com/index.php' }
    // Add more servers as needed
];

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API endpoint to get list of servers
app.get('/api/servers', (req, res) => {
    const serverList = servers.map(server => ({
        name: server.name,
        url: server.url
    }));
    res.json(serverList);
});

// API endpoint to send command to a specific server
app.post('/api/execute', async (req, res) => {
    const { serverIndex, command } = req.body;
    
    if (serverIndex === undefined || !command) {
        return res.status(400).json({ status: 'error', message: 'Server index and command are required' });
    }
    
    if (serverIndex >= servers.length || serverIndex < 0) {
        return res.status(404).json({ status: 'error', message: 'Server not found' });
    }
    
    try {
        const server = servers[serverIndex];
        const response = await axios.post(server.url, {
            command: command
        });
        
        res.json({
            status: 'success',
            server: server.name,
            command: command,
            result: response.data
        });
    } catch (error) {
        console.error(`Error executing command on server: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: `Failed to execute command: ${error.message}`
        });
    }
});

// API endpoint to send command to all servers
app.post('/api/broadcast', async (req, res) => {
    const { command } = req.body;
    
    if (!command) {
        return res.status(400).json({ status: 'error', message: 'Command is required' });
    }
    
    try {
        const results = [];
        
        for (const server of servers) {
            try {
                const response = await axios.post(server.url, {
                    command: command
                });
                
                results.push({
                    server: server.name,
                    status: 'success',
                    result: response.data
                });
            } catch (error) {
                results.push({
                    server: server.name,
                    status: 'error',
                    message: error.message
                });
            }
        }
        
        res.json({
            status: 'complete',
            command: command,
            results: results
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Failed to broadcast command: ${error.message}`
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server control panel running on port ${PORT}`);
});
