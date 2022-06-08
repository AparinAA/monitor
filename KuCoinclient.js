
//get market Kucoin
function getTickersKuCoin(API, tickers){
    return API.rest.Market.Symbols.getAllTickers()
    .then(response => {
        const res = tickers.map( item => {
            const el = response.data.ticker.find(element => element.symbol === item.tickerLeft)
            return {
                'instId': el.symbol,
                'ask': el.sell,
                'bid': el.buy,
            }
        });
        return res;
        //console.info(res);
    }, (e) => {
        throw e;
    });
}

module.exports = {
    getTickersKuCoin,
}