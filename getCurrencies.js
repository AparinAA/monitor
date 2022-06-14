require('dotenv').config();
const fs = require('fs');
const {getTickersKuCoin} = require('./KuCoinclient');
const {getMarketBNB} = require('./BNBclient');
const {getMarketHuobi} = require('./huobi');
const {getMarketGateio} =require('./gateio');
const {getMarketMexc} = require('./mexc');
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

function promiseTickersWithSpread(exchanges, tickersAll, nsscrySpread) {

    const tickersBNB = tickersAll.tickers.filter( item => ((item.exchangeLeft === "Binance") || (item.exchangeRight === "Binance")) );
    const tickersKuCoin = tickersAll.tickers.filter( item => ((item.exchangeLeft === "KuCoin") || (item.exchangeRight === "KuCoin")) );
    //const tickersDigifinex = tickersAll.tickers.filter( item => ((item.exchangeLeft === "Digifinex") || (item.exchangeRight === "Digifinex")) );
    const tickersHuobi = tickersAll.tickers.filter( item => ((item.exchangeLeft === "Huobi") || (item.exchangeRight === "Huobi")) )
        .map(item => (item.exchangeLeft === "Huobi" ? item.tickerLeft : item.tickerRight) )
    const tickersGateio = tickersAll.tickers.filter( item => ((item.exchangeLeft === "Gateio") || (item.exchangeRight === "Gateio")) )
        .map(item => (item.exchangeLeft === "Gateio" ? item.tickerLeft : item.tickerRight) )
    const tickersMexc = tickersAll.tickers.filter( item => ((item.exchangeLeft === "Mexc") || (item.exchangeRight === "Mexc")) )
        .map(item => (item.exchangeLeft === "Mexc" ? item.tickerLeft : item.tickerRight) )
    
    /*
    const nameListDigifinex = tickersDigifinex.map(item => {
        if (item.exchangeLeft === 'Digifinex') {
            return item.tickerLeft
        }
        if (item.exchangeRight === 'Digifinex') {
            return item.tickerRight
        }
    })
    */
    return Promise.all([
        exchanges[0].getRequest('/api/v5/market/tickers?instType=SPOT'), //okx
        exchanges[1].getRequest('markets'), //ftx
        getMarketBNB(exchanges[2],tickersBNB), //Binance
        getTickersKuCoin(exchanges[3], tickersKuCoin), //KuCoin
        //exchanges[4].getMarket(new Set(nameListDigifinex)), //Digifinex
        getMarketHuobi(new Set(tickersHuobi)), //Huobi 
        getMarketGateio(Array.from(new Set(tickersGateio))), //Gateio
        getMarketMexc(new Set(tickersMexc)), //Mexc
    ])
    .then(response => {

        //info tickers of OKX
        const tickersOKX = response[0].data
        .map(item => {
            return {"instId": item.instId, "ask": +item.askPx, "bid": +item.bidPx, "base_vol": +item.volCcy24h};
        });

        //info tickers of FTX
        const tickersFTX = response[1].filter(item => (item.type === "spot" && item.quoteCurrency === "USD") )
        .map(item => {
            return {"instId": item.name, "ask": +item.ask, "bid": +item.bid, "base_vol": +item.quoteVolume24h}
        });
        
        //info tickers of Binance
        const tickersBNB = response[2];

        //info tickers of KuCoin
        const tickersKuCoin = response[3];

        //info tickers of Digifinex
        //const tickersDigifinex = response[4];

        //info tickers of Huobi
        const tickersHuobi = response[4];

        //info tickers of Gate.io
        const tickersGateio = response[5];

        //info tickers of Mexc
        const tickersMexc = response[6];

        const allExchange = {
            "OKX": tickersOKX,
            "FTX": tickersFTX,
            "Binance": tickersBNB,
            "KuCoin": tickersKuCoin,
            //"Digifinex": tickersDigifinex,
            "Huobi": tickersHuobi,
            "Gateio": tickersGateio,
            "Mexc": tickersMexc,
        }

        let genVarTickets = [];
        tickersAll.tickers.forEach( item => {
            const nameRight = item.nameRight;
            const instIdLeft = item.tickerLeft;
            const instIdRight = item.tickerRight;
            const exchangeLeft = item.exchangeLeft;
            const exchangeRight = item.exchangeRight;
            const urlLeft = item.urlLeft;
            const urlRight = item.urlRight;

            if(exchangeLeft === 'Digifinex' || exchangeRight === 'Digifinex') {
                return;
            }
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
                                'url': urlLeft,
                                'ask': [[leftPr.ask]],
                                'bid': [[leftPr.bid]],
                                'vol24': leftPr.base_vol,
                            },
                            'rightEx': {
                                'name': exchangeRight,
                                'url': urlRight,
                                'ask': [[rightPr.ask]],
                                'bid': [[rightPr.bid]],
                                'vol24': rightPr.base_vol,
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