
const http = require('http')



const server = http.createServer()

server.on('request', (req, res) => {
    res.end('好勒好勒好勒')
})


server.listen(8082, () => {
    console.log('正在监听服务', 8082);
})