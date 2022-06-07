require('dotenv').config();
const fs = require('fs');
/*
const {OKXclient} = require('./OKXclient');
const {FTXclient} = require('./FTXclient');

//Init secret api OKX
const secretDict_OKX = {
    'api_key': process.env.api_key,
    'secret_key': process.env.secret_key,
    'passphrase': process.env.passphrase,
};
const secretDict_FTX = {
    'api_key_1': process.env.ftx_api_key_1,
    'secret_key_1': process.env.ftx_api_secret_1,
    'api_key_2': process.env.ftx_api_key_2,
    'secret_key_2': process.env.ftx_api_secret_2,
};

const ftx = new FTXclient(secretDict_FTX.api_key_1, secretDict_FTX.secret_key_1);

const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);
*/

//get market Binance
function getMarketBNB(client, tickers) {
    return client.ticker24hr()
            .then(response => {
                const res = tickers.map( item => {
                    const el = response.data.find(element => element.symbol === item.tickerLeft)
                    return {
                        'instId': el.symbol,
                        'ask': el.askPrice,
                        'bid': el.bidPrice,
                    }
                });
                return res;
                //console.info(res);
            }, (e) => {
                throw e;
            });
}

function culcSpread(ex1, ex2) {
    if (!ex1?.ask || !ex2?.bid) {
        return false;
    }
    return 100 * (1 - ex1.ask / ex2.bid);
}

//let nsscrySpread = 0.2;

function promiseTickersWithSpread(exchanges, tickersAll, nsscrySpread) {
    const tickersBNB = tickersAll.tickers.filter( item => item.exchangeLeft === "Binance");
    return Promise.all([
        exchanges[0].getRequest('/api/v5/market/tickers?instType=SPOT'), //okx
        exchanges[1].getRequest('markets'), //ftx
        getMarketBNB(exchanges[2],tickersBNB)
    ])
    .then(response => {

        //info tickers of OKX
        const tickersOKX = response[0].data
        .map(item => {
            return {"instId": item.instId, "ask": Number(item.askPx), "bid": Number(item.bidPx), "vol24": Number(item.vol24h)};
        });

        //info tickers of FTX
        const tickersFTX = response[1].filter(item => (item.type === "spot" && item.quoteCurrency === "USD") )
        .map(item => {
            return {"instId": item.name, "ask": item.ask, "bid": item.bid, "vol24": item.quoteVolume24h}
        });
        
        //info tickers of Binance
        const tickersBNB = response[2];

        const allExchange = {
            "OKX": tickersOKX,
            "FTX": tickersFTX,
            "Binance": tickersBNB
        }

        let genVarTickets = [];
        tickersAll.tickers.forEach( item => {
            const nameLeft = item.nameLeft;
            const nameRight = item.nameRight;
            const instIdLeft = item.tickerLeft;
            const instIdRight = item.tickerRight;
            const exchangeLeft = item.exchangeLeft;
            const exchangeRight = item.exchangeRight;
            
            const leftPr = allExchange[exchangeLeft].find( element => element.instId === instIdLeft);
            const rightPr = allExchange[exchangeRight].find( element => element.instId === instIdRight);
            
            const spread_1 = culcSpread(leftPr,rightPr);
            const spread_2 = culcSpread(rightPr,leftPr);

            if ( (spread_1 > nsscrySpread) || (spread_2 > nsscrySpread) ) {
                genVarTickets.push(
                        {   
                            'name': nameRight,
                            'leftEx': {
                                'name': exchangeLeft,
                                'ask': [[leftPr.ask]],
                                'bid': [[leftPr.bid]]
                            },
                            'rightEx': {
                                'name': exchangeRight,
                                'ask': [[rightPr.ask]],
                                'bid': [[rightPr.bid]],
                            },
                            'spread': [spread_1, spread_2]
                        }
                )
            }


        });

        return genVarTickets;
    }, e => {
        console.info("error get tickets");
        return Promise.reject(e);
    })
    .catch( e => {
        console.info("! Error: ", e);
        return false;
    })
}

module.exports = {
    promiseTickersWithSpread,
}