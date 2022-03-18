// 本页面用于设置反向代理，包括代理websocket

const { createProxyMiddleware } = require('http-proxy-middleware');


module.exports = function (app) {
    app.use(
        createProxyMiddleware('/account', { target: 'http://localhost:8081' }),
        createProxyMiddleware('/account/forget-password', { target: 'http://localhost:8081' }),
        createProxyMiddleware('/vote', { target: 'http://localhost:8081' }),
        createProxyMiddleware('/uploads', { target: 'http://localhost:8081' }),
        createProxyMiddleware('/realtime-voteinfo', { target: 'ws://localhost:8081', ws: true }),
    );
};
