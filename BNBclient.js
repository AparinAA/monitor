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

module.exports = {
    getMarketBNB
}