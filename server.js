require('dotenv').config();
const http = require("http");
const axios = require('axios');
//const {Digifinex} = require('../typescript-arb/prod/index');
const { Spot } = require('@binance/connector'); //Binance SPOT api
const fs = require('fs'); 
const {promiseTickersWithSpread} = require('./getCurrencies');
const API = require('kucoin-node-sdk');
const { addSpreadList } = require('./addSpreadList');
const path = require('path');

const { startTrade } = require(path.resolve("../typescript-arb/prod/index"));
//const FTXclient = require(path.resolve("../typescript-arb/prod/FTXclient")).default;
//const OKXclient = require(path.resolve("../typescript-arb/prod/OKXclient")).default;

const OKXclient = require('okx-public-api').default;

//const host = 'localhost';
const host = '195.133.1.56';
const port = 8090;

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

//const digifinex = new Digifinex(digifinex_key, digifinex_secret);

const rawdata = fs.readFileSync('currencyInfo.json');
const tickersAll = JSON.parse(fs.readFileSync('tickers1.json', {"encoding": "utf-8"})); 
const dictCurrency = JSON.parse(rawdata);

const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);

//const mark = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': ''}}

//console.info(new URLSearchParams({'ex': 'ftx', 'cur': 'TON', 'sz':2}).toString())


const nullSpreadJson = [
    {
        'name': '',
        'idPair': 0,
        'leftEx': {
            'name': '',
            'url': '',
            'ask': [[0,0]], 
            'bid': [[0,0]],
            'vol24': 0
        },
        'rightEx': {
            'name': '',
            'url': '',
            'ask': [[0,0]],
            'bid': [[0,0]],
            'vol24': 0
        },
        'spread': [0, 0],
        'availTrade': false,
        'listSpread': [[0,0]]
    }
];

let allSpreadJson = nullSpreadJson;
const nsscrySpread = process.env.nsscrySpread;

promiseTickersWithSpread([okx, BNB, API, /* -digifinex  +huobi whitout api + gateio*/],  tickersAll, nsscrySpread)
.then(response => {
    allSpreadJson = response;
}, () => {
    console.info("error allspread");
    //return Promise.reject(false);
})
.catch( () => {
    console.info("error 2 allspread");
    allSpreadJson = nullSpreadJson;
});

setInterval( () => {
    promiseTickersWithSpread([okx, BNB, API, /*digifinex*/], tickersAll, nsscrySpread)
    .then(response => {
        if (!response) {
            return Promise.reject(false);
        }
        allSpreadJson = addSpreadList(allSpreadJson, response, 15);
        //console.info(allSpreadJson[0]);
    }, () => {
        console.info("error allspread");
        return Promise.reject(false);
    })
    .catch( () => {
        console.info("error 2 allspread");
    });
}, 15 * 1000)

//send res 200 on response in JSON
const toResJSON = (res, json) => {
    res.writeHead(200, {
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods': 'GET'
    });
    res.end(JSON.stringify(json, null, '\t'));
}

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    
    const parametrsSpread = req.url.match(/(\/spread\?cur=[a-zA-Z0-9]+)/g);
    const parametrsWithdrawal = req.url.match(/(\/withdrawal\?ex=[a-zA-Z]+&cur=[a-zA-Z0-9]+&sz=[0-9]+)/g);
    const parametrTrade = req.url.match(/(\/trade\?cur=[a-zA-Z0-9]+&ex1=[a-zA-Z0-9]+&ex2=[a-zA-Z0-9]+&it=[0-9]+)/g)

    let currency;
    let amount;
    let exchange;
    console.info("EEE");
    if (req.url === '/allspread') {
        console.info("!!!!");
        res.writeHead(200, {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'GET',
        });
        res.end(JSON.stringify(allSpreadJson, null, '\t'));
    }

    res.writeHead(200, {
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods': 'GET',
    });
    res.end();

    
    
    if (parametrTrade) {
        currency = parametrTrade[0].match(/cur=[a-zA-Z0-9]+/g)[0].split('=')[1]
        const iteration = +parametrTrade[0].match(/it=[0-9]+/g)[0].split('=')[1];
        const ex1 = parametrTrade[0].match(/ex1=[a-zA-Z0-9]+/g)[0].split('=')[1];
        const ex2 = parametrTrade[0].match(/ex2=[a-zA-Z0-9]+/g)[0].split('=')[1];

        if ( (currency === "TON" || currency === "ANC") && (ex1 + ex2 === "FTXOKX" || ex1 + ex2 === "OKXFTX")) {
            let resultTrade = []
            let countIt = 0;
            for (let i = 0; i < iteration; i++) {
                setTimeout( () => {                    
                    startTrade(currency, i)
                    .then( r => {
                        resultTrade.push( +(i+1) + (r ? " - true" : " - false") );
                        countIt++;
                        if (countIt === iteration) {
                            toResJSON(res, {"ready": resultTrade.join('\n')});
                        }
                    }, () => {
                        resultTrade.push( +(i+1) + " - false");
                        countIt++;
                        if (countIt === iteration) {
                            toResJSON(res, {"ready": resultTrade.join('\n')});
                        }
                    })
                    .catch( () => {
                        resultTrade.push( +(i+1) + " - false");
                        countIt++;
                        if (countIt === iteration) {
                            toResJSON(res, {"ready": resultTrade.join('\n')});
                        }
                    });
                    
                }, i * 1200 );
            }

        } else {
            toResJSON(res, {"error": "Unfortunately currency or exchange not trade."});
        }
        //
    }
    
    /*
    if (parametrsSpread) {
        currency = parametrsSpread[0].split('=').length > 1 ? parametrsSpread[0].split('=')[1] : false;
        
        if (dictCurrency[currency]) {
            
            Promise.all([okx.getMarket(dictCurrency[currency].okx.idName,1), ftx_2.getMarket(dictCurrency[currency].ftx.idName,1)])
            .then(market => {
                const spread_1 = 100 * (market[1].bid[0][0] - market[0].ask[0][0]) / market[1].bid[0][0];
                const spread_2 = 100 * (market[0].bid[0][0] - market[1].ask[0][0]) / market[0].bid[0][0];

                let buf1 = market[0];
                let buf2 = market[1];
                buf1['spread'] = [spread_1, spread_2];
                buf2['spread'] = [spread_1, spread_2];
                
                toResJSON(res, {'okx': buf1, 'ftx': buf2});
            }, e => Promise.reject(e))
            .catch(() => {
                toResJSON(res, {'okx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]},'ftx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]}});
            });
        }
    }
    */
    // withdrawal?ex=okx&cur=USDT&sz=2
    /*
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
    }*/


    
         
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});