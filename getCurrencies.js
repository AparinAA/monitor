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

function culcSpread(ex1, ex2) {
    if (!ex1?.ask || !ex2?.bid) {
        return false;
    }
    return 100 * (1 - ex1.ask / ex2.bid);
}

//let nsscrySpread = 0.2;

function promiseTickersWithSpread(okx, ftx, tickersAll, nsscrySpread) {
    return Promise.all([okx.getRequest('/api/v5/market/tickers?instType=SPOT'), ftx.getRequest('markets')])
    .then(response => {

        
        const tickersOKX = response[0].data
        .map(item => {
            return {"instId": item.instId, "ask": Number(item.askPx), "bid": Number(item.bidPx), "vol24": Number(item.vol24h)};
        });

        
        const tickersFTX = response[1].filter(item => (item.type === "spot" && item.quoteCurrency === "USD") )
        .map(item => {
            return {"instId": item.name, "ask": item.ask, "bid": item.bid, "vol24": item.quoteVolume24h}
        });
        
        let genVarTickets = [];
        tickersAll.tickers.forEach( item => {
            const nameFTX = item.nameFTX;
            const nameOKX = item.nameOKX;
            const instIdFTX = item.FTX;
            const instIdOKX = item.OKX;

            const ftxPr = tickersFTX.find( element => element.instId === instIdFTX);
            const okxPr = tickersOKX.find( element => element.instId === instIdOKX);
            
            const spread_1 = culcSpread(okxPr,ftxPr);
            const spread_2 = culcSpread(ftxPr,okxPr);

            if ( (spread_1 > nsscrySpread) || (spread_2 > nsscrySpread) ) {
                genVarTickets.push(
                        {   
                            'name': nameOKX,
                            'okx': {'ask': [[okxPr.ask]], 'bid': [[okxPr.bid]]},
                            'ftx': {'ask': [[ftxPr.ask]], 'bid': [[ftxPr.bid]]},
                            'spread': [spread_1,spread_2]
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