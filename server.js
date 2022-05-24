require('dotenv').config();
const http = require("http");
const axios = require('axios');
const {FTXclient} = require('./FTXclient');
const {OKXclient} = require('./OKXclient');

const secretDict_FTX = {
    'api_key_1': process.env.ftx_api_key_1,
    'secret_key_1': process.env.ftx_api_secret_1,
    'api_key_2': process.env.ftx_api_key_2,
    'secret_key_2': process.env.ftx_api_secret_2,
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
    }
    
}

const dictForWithdrawal = {
    'TON': {
        'okx': {
            "cur": "TON",
            'method': "TON-TON",
            'fee': 0.01,
            "address": "EQCzFTXpNNsFu8IgJnRnkDyBCL2ry8KgZYiDi3Jt31ie8EIQ",
            "tag": "56e66ef1-a404-4f85-a5da-06e9f5fbb7d8"
        },
        'ftx': {
            "cur": "TONCOIN",
            "method": "ton",
            "address": "EQBfAN7LfaUYgXZNw5Wc7GBgkEX2yhuJ5ka95J1JJwXXf4a8",
            "tag": "6000408"
        }
    },

    'USDT': {
        'okx': {
            "cur": "USDT",
            "method": "USDT-TRC20",
            "fee": 0.8,
            "address": "TJGHeAjMy18x8qJCRCYPAN8C5pZ2mJ1tio"
        },
        'ftx': {
            "cur": "USDT",
            "method": "trx",
            "address": "TEc85B1ASueQaNrQhyXqP6qTrdomJP3EuN"
        }
    },
    'ANC': {
        'okx': {
            "cur": "ANC",
            "method": "",
            "fee": ""
        },
        'ftx': {
            "cur": "ANC",
            "method": "terra",
            "address": "terra18edzsh55c4dtgnz5ress6ar0nufs67hazv8ly2"
        }
    },

}

const ftx_1 = new FTXclient(secretDict_FTX.api_key_1, secretDict_FTX.secret_key_1);
const ftx_2 = new FTXclient(secretDict_FTX.api_key_2, secretDict_FTX.secret_key_2);
const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);

//const mark = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': ''}}

//console.info(new URLSearchParams({'ex': 'ftx', 'cur': 'TON', 'sz':2}).toString())
const host = '195.133.1.56';//'localhost';
const port = 8090;

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const parametrsSpread = req.url.match(/(\/spread\?cur=[a-zA-Z0-9]+)/g);
    const parametrsWithdrawal = req.url.match(/(\/withdrawal\?ex=[a-zA-Z]+&cur=[a-zA-Z0-9]+&sz=[0-9]+)/g);

    let currency;
    let amount;
    let exchange;

    if (req.url === '/balance') {
        Promise.all([ftx_1.getBalance(), okx.getBalance()])
        .then(balance => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods': 'GET'
            });
            const filterFTX = balance[0].filter( item => item.avail > 0.000001);
            const filterOKX = balance[1].filter( item => item.avail > 0.000001)
            res.end(JSON.stringify([filterFTX,filterOKX], null, '\t'));
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
            
            Promise.all([okx.getMarket(dictTicker[currency].okx,1), ftx_2.getMarket(dictTicker[currency].ftx,1)])
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
    // withdrawal?ex=okx&cur=USDT&sz=2
    if(parametrsWithdrawal) {
        currency = parametrsWithdrawal[0].match(/cur=[a-zA-Z0-9]+/g)[0].split('=')[1]
        amount = parametrsWithdrawal[0].match(/sz=[0-9]+/g)[0].split('=')[1];
        exchange = parametrsWithdrawal[0].match(/ex=[a-zA-Z]+/g)[0].split('=')[1];

        res.writeHead(200, {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'GET'
        });
        
        const curBalance = exchange === 'ftx' ? ftx_1.getBalance() : okx.getBalance() 
        
        curBalance
        .then(balance => {
            //console.info(balance, exchange)
            if (!dictForWithdrawal[currency]) {
                return false;
            }
            
            const availbleAmount = balance.find( item => item.ccy === dictForWithdrawal[currency][exchange]?.cur )?.avail;
            
            if (Number(availbleAmount) > Number(amount)) {
                const _withdrawal = exchange === 'ftx' ?
                                ftx_1.withdrawalToAddress(dictForWithdrawal[currency].ftx.cur, amount, dictForWithdrawal[currency].ftx.method) :
                                okx.transferCurrAcc(dictForWithdrawal[currency].okx.cur, Number(amount) + Number(dictForWithdrawal[currency].okx.fee), "18", "6");
                return _withdrawal.then(() => {
                    return true;
                }).catch(() => {
                    return false;
                })
            }
            return false;
        })
        .then( subres => {
            if (exchange === 'okx' && subres) {
                return okx.withdrawalToAddress(dictForWithdrawal[currency].okx.cur, Number(amount), dictForWithdrawal[currency].okx.fee, dictForWithdrawal[currency].okx.method)
                    .then( () => {return true}, () => {
                        okx.transferCurrAcc(dictForWithdrawal[currency].okx.cur, Number(amount) + Number(dictForWithdrawal[currency].okx.fee), "6", "18")
                        return false
                    });
            } else {
                return subres;
            }
        })
        .then(result => {
            if (result) {
                res.end(JSON.stringify({'withdrawal': true}));
            } else {
                res.end(JSON.stringify({'withdrawal': false}));
            }
        })
        .catch((e) => {
            res.end(JSON.stringify({'withdrawal': false}));
        });
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