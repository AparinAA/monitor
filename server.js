require('dotenv').config();
const http = require("http");
const axios = require('axios');
const {FTXclient} = require('./FTXclient');
const {OKXclient} = require('./OKXclient');

const secretDict_FTX = {
    'api_key': process.env.ftx_api_key,
    'secret_key': process.env.ftx_api_secret,
};

//Init secret api OKX
const secretDict_OKX = {
    'api_key': process.env.api_key,
    'passphrase': process.env.passphrase,
    'secret_key': process.env.secret_key,
};

const dictTicker = {
    'TON': {
        'okx': 'TON-USDT',
        'ftx': 'TONCOIN/USD',
    },
    'BTC': {
        'okx': 'BTC-USDT',
        'ftx': 'BTC/USDT',
    },
    'ETH': {
        'okx': 'ETH-USDT',
        'ftx': 'ETH/USDT',
    },
    'BTT': {
        'okx': 'BTT-USDT',
        'ftx': 'BTT/USD'
    },
    'ANC': {
        'okx': 'ANC-USDT',
        'ftx': 'ANC/USD'
    },
    'GOG': {
        'okx': 'GOG-USDT',
        'ftx': 'GOG/USD'
    },
    'BNT': {
        'okx': 'BNT-USDT',
        'ftx': 'BNT/USD'
    },
    'ALCX': {
        'okx': 'ALCX-USDT',
        'ftx': 'ALCX/USD'
    },
    'ALPHA': {
        'okx': 'ALPHA-USDT',
        'ftx': 'ALPHA/USD'
    },
    'GODS': {
        'okx': 'GODS-USDT',
        'ftx': 'GODS/USD'
    },
    'GMT': {
        'okx': 'GMT-USDT',
        'ftx': 'GMT/USD'
    },
    
}

const ftx = new FTXclient(secretDict_FTX.api_key, secretDict_FTX.secret_key);
const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);

const mark = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': ''}}


const host = '195.133.1.56';
const port = 8090;

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const parametrsSpread = req.url.match(/(\/spread\?cur=[a-zA-Z0-9]+)/g);
    let currency;
    if (req.url === '/balance') {
        Promise.all([ftx.getBalance(), okx.getBalance()])
        .then(balance => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods': 'GET'
            });
            res.end(JSON.stringify(balance, null, '\t'));
        })
        .catch(() => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods': 'GET'
            });
            res.end(JSON.stringify({'error': 'Error: not found balance'}));
        });
    }
    if (parametrsSpread) {
        currency = parametrsSpread[0].split('=').length > 1 ? parametrsSpread[0].split('=')[1] : false;
        if (dictTicker[currency]) {
            
            Promise.all([okx.getMarket(dictTicker[currency].okx,1), ftx.getMarket(dictTicker[currency].ftx,1)])
            .then(market => {
                const spread_1 = 100 * (market[1].bid[0][0] - market[0].ask[0][0]) / market[1].bid[0][0];
                const spread_2 = 100 * (market[0].bid[0][0] - market[1].ask[0][0]) / market[0].bid[0][0];

                res.writeHead(200, {
                    'Access-Control-Allow-Origin' : '*',
                    'Access-Control-Allow-Methods': 'GET'
                });
                let buf1 = market[0];
                let buf2 = market[1];
                buf1['spread'] = [spread_1, spread_2];
                buf2['spread'] = [spread_1, spread_2];
                res.end(JSON.stringify({'okx': buf1, 'ftx': buf2}, null, '\t'));
            })
            .catch(() => {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin' : '*',
                    'Access-Control-Allow-Methods': 'GET'
                });
                res.end(JSON.stringify({'okx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]},'ftx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]}}, null, '\t'));
            });
        }
    }


    
         
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

/*
ftx_api_key=gX2ts8O9WPq_1r-0ykDnQYATeowYce4O4DS-AJ7n
ftx_api_secret=-qHyMYGDoYCZ7X7Cr7U3CF1ss76trX9vq2e6Hh-K
*/