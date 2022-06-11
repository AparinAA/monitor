require('dotenv').config();
const http = require("http");
const axios = require('axios');
const {FTXclient} = require('./FTXclient');
const {OKXclient} = require('./OKXclient');
const {Digifinex} = require('./digifinex');
const { Spot } = require('@binance/connector'); //Binance SPOT api
const fs = require('fs'); 
const {promiseTickersWithSpread} = require('./getCurrencies');
const API = require('kucoin-node-sdk');


//const host = 'localhost';
const host = '195.133.1.56';
const port = 8090;

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

//Init Binance api
const BNB = new Spot(process.env.binance_api_key, process.env.binance_api_secret);

//Init KuCoin api
const kucoin_secret = {
    baseUrl: 'https://api.kucoin.com',
    apiAuth: {
      key: process.env.kucoin_api_key, // KC-API-KEY
      secret: process.env.kucoin_api_secret, // API-Secret
      passphrase: process.env.kucoin_api_pass, // KC-API-PASSPHRASE
    },
    authVersion: 2, // KC-API-KEY-VERSION. Notice: for v2 API-KEY, not required for v1 version.
}
API.init(kucoin_secret);

//Init Digifinex API
const digifinex_secret = process.env.digifinex_api_secret;
const digifinex_key = process.env.digifinex_api_key;

const digifinex = new Digifinex(digifinex_key, digifinex_secret);


const rawdata = fs.readFileSync('currencyInfo.json');
const tickersAll = JSON.parse(fs.readFileSync('tickers1.json', {"encoding": "utf-8"})); 
const dictCurrency = JSON.parse(rawdata);
const https = require('node:https');

const options = {
    key: fs.readFileSync('195.133.1.56-key.pem'),
    cert: fs.readFileSync('195.133.1.56.pem')
};


const ftx_1 = new FTXclient(secretDict_FTX.api_key_1, secretDict_FTX.secret_key_1);
const ftx_2 = new FTXclient(secretDict_FTX.api_key_2, secretDict_FTX.secret_key_2);
const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);

//const mark = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': ''}}

//console.info(new URLSearchParams({'ex': 'ftx', 'cur': 'TON', 'sz':2}).toString())


const nullSpreadJson = [
    {
        'name': '',
        'leftEx': {
            'name': '',
            'ask': [['-']], 
            'bid': [['-']]
        },
        'rightEx': {
            'name': '',
            'ask': [['-']],
            'bid': [['-']]
        },
        'spread': [0, 0],
    }
];

let allSpreadJson = nullSpreadJson;
const nsscrySpread = process.env.nsscrySpread;

promiseTickersWithSpread([okx, ftx_1, BNB, API, /* -digifinex  +huobi whitout api + gateio*/],  tickersAll, nsscrySpread)
.then(response => {
    allSpreadJson = response
}, e => {
    console.info("error allspread", e);
    return Promise.reject(e);
})
.catch( e => {
    console.info("error 2 allspread");
    allSpreadJson = nullSpreadJson;
});

setInterval( () => {
    promiseTickersWithSpread([okx, ftx_1, BNB, API, /*digifinex*/], tickersAll, nsscrySpread)
    .then(response => {
        allSpreadJson = response
    }, e => {
        console.info("error allspread", e);
        return Promise.reject(e);
    })
    .catch( e => {
        console.info("error 2 allspread");
    });
}, 15000)

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const parametrsSpread = req.url.match(/(\/spread\?cur=[a-zA-Z0-9]+)/g);
    const parametrsWithdrawal = req.url.match(/(\/withdrawal\?ex=[a-zA-Z]+&cur=[a-zA-Z0-9]+&sz=[0-9]+)/g);
    
    let currency;
    let amount;
    let exchange;
    if (req.url === '/allspread') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'GET'
        });
        res.end(JSON.stringify(allSpreadJson, null, '\t'));
    }

    if (req.url === '/balance') {
        Promise.all([ftx_1.getBalance(), okx.getBalance()])
        .then(balance => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods': 'GET'
            });
            const filterFTX = balance[0]?.filter( item => item.avail > 0.000001);
            const filterOKX = balance[1]?.filter( item => item.avail > 0.000001)
            if (!filterFTX || !filterOKX) {
                throw "Error. Balance empty";
            }
            res.end(JSON.stringify([filterFTX,filterOKX], null, '\t'));
        }, e => Promise.reject(e))
        .catch(() => {
            res.writeHead(200, {
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Methods': 'GET'
            });
            res.end(JSON.stringify([[{"ccy": "", "avail": 0, "eqUsd": 0}], [{"ccy": "", "avail": 0, "eqUsd": 0}]]));
        });
    }
    if (parametrsSpread) {
        currency = parametrsSpread[0].split('=').length > 1 ? parametrsSpread[0].split('=')[1] : false;
        
        if (dictCurrency[currency]) {
            
            Promise.all([okx.getMarket(dictCurrency[currency].okx.idName,1), ftx_2.getMarket(dictCurrency[currency].ftx.idName,1)])
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
            }, e => Promise.reject(e))
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
            if (!dictCurrency[currency]) {
                return false;
            }
            
            const availbleAmount = balance.find( item => item.ccy === dictCurrency[currency][exchange]?.name )?.avail;
            if (Number(availbleAmount) > Number(amount)) {
                const _withdrawal = exchange === 'ftx' ?
                                ftx_1.withdrawalToAddress(
                                    dictCurrency[currency].ftx.name,
                                    amount,
                                    dictCurrency[currency].ftx.method,
                                    dictCurrency[currency].okx.address,
                                    dictCurrency[currency].okx.tag
                                ) : 
                                okx.transferCurrAcc(
                                    dictCurrency[currency].okx.name,
                                    Number(amount) + Number(dictCurrency[currency].okx.fee),
                                    "18", 
                                    "6"
                                );
                return _withdrawal.then(() => {
                    return true;
                }, e => Promise.reject(e))
                .catch((e) => {
                    return false;
                })
            }
            return false;
        }, e => Promise.reject(e))
        .then( subres => {
            if (exchange === 'okx' && subres) {

                //при выводе с OKX адрес записывается как "address:tag"
                const addrWithFromOKX = dictCurrency[currency].ftx.tag ? 
                                        dictCurrency[currency].ftx.address + ":" + dictCurrency[currency].ftx.tag :
                                        dictCurrency[currency].ftx.address;
                
                const withokx = okx.withdrawalToAddress(
                                    dictCurrency[currency].okx.name,
                                    Number(amount),
                                    dictCurrency[currency].okx.fee,
                                    dictCurrency[currency].okx.method,
                                    addrWithFromOKX
                                );
                    
                return withokx.then( (r) => {
                    if (r.data.code != '0') {
                        
                        //не получилось вывести, ждем 0.5 сек и возвращаем обратно на торговый акк
                        setTimeout(() => {
                            okx.transferCurrAcc(
                                dictCurrency[currency].okx.name,
                                Number(amount) + Number(dictCurrency[currency].okx.fee),
                                "6",
                                "18"
                            )
                            .then(() => {
                                return false;
                            }, e => Promise.reject(e))
                            .catch(() => {
                                return false;
                            });
                        }, 500);
                        return false;
                    }
                    return true;
                }, e => Promise.reject(e))
                .catch( (e) => {
                    return false;
                });
            } else {
                return subres;
            }
        }, e => Promise.reject(e))
        .then(result => {
            if (result) {
                res.end(JSON.stringify({'withdrawal': true}));
            } else {
                res.end(JSON.stringify({'withdrawal': false}));
            }
        }, e => Promise.reject(e))
        .catch((e) => {
            res.end(JSON.stringify({'withdrawal': false}));
        });
    }


    
         
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});