const hmacSHA256 = require('crypto-js/hmac-sha256')
const sha256 = require('crypto-js/sha256')
const Hex = require('crypto-js/enc-hex');
const axios = require('axios');

//in order to create new FTXclient(api_key, api_secret_key)
class FTXclient {
    constructor(api_key, api_secret) {
        this.instance = axios.create({
            baseURL: 'https://ftx.com/api',
            timeout: 5000,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json; utf-8',
                'FTX-KEY': api_key,
            }
        });

        this.instance.interceptors.request.use(config => {
            const now = Date.now();
            const method = config.method.toUpperCase();
            let { data, params } = config;
            
            let sign = now + method + `/api/${config.url}`;

            config.headers['FTX-TS'] = now;

            params = new URLSearchParams(params).toString();

            sign += method === 'GET' ? (params ? `?${params}` : ``) : `${JSON.stringify(data)}`

            config.headers['FTX-SIGN'] = hmacSHA256(sign, api_secret).toString(Hex);
            return config;
        }, error => Promise.reject(error) )
    }

    //GET request 
    getRequest(endpoint, params = {}) {
        return this.instance.get(endpoint, { params })
            .then(result => {
                return result.data.result;
            }, e => {
                return Promise.reject(e);
            })
            .catch(e => {
                return Promise.reject(e);
            });
    }

    //POST request
    postRequest(endpoint, data = {}) {
        return this.instance.post(endpoint, data).catch(e => Promise.reject({"error": e}));
    }

    //Get balance account
    //return list of object [ {'ccy': ccy, 'avail': amountAvailble, 'eqUsd', equelUsd} ]
    getBalance() {
        return this.getRequest('wallet/balances')
            .then( balance => {
                if (balance?.error) {
                    return Promise.reject(balance?.error)
                }

                return balance.map(element => {
                    return {
                        'ccy': element.coin,
                        'avail': element.free,
                        'availableForWithdrawal': element.availableForWithdrawal,
                        'eqUsd': element.usdValue

                    }
                })
            }, e => {
                return Promise.reject(e);
            })
            .catch(e => {
                return Promise.reject({"error": e});
            })
    }

    /*
      Get market price with any depth < 400
      market='TONCOIN/USD', depth=int
      return object 
      {
        'ask': [[priceAsk1, amountAsk1], [priceAsk2, amountAsk2], ...],
        'bid': [[priceBid1, amountBid1], [priceBid2, amountBid2], ...]
      }
    */
    getMarket(market, depth = null) {
        return this.getRequest(`markets/${market}/orderbook`, { depth })
            .then(result => {
                if (result?.error) {
                    return Promise.reject(result?.error);
                }

                return {
                    'ask': result.asks,
                    'bid': result.bids,
                }
            }, e => {
                return Promise.reject(e)
            })
            .catch(e => {
                return Promise.reject({"error": e})
            })
    }

    //put orders buy/sell
    //market - 'TONCOIN/USD'
    //result = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': [[1, 1]]}}
    //'countOrd' - need 2 orders
    //'orders' - [[priceOrder1, amountOrder1], [priceOrder2, amountOrder2] , ...]
    putOrders(market, result) {

        let orders = [];
        let count;
        let promises;

        if (result.buy.name === 'ftx') {
            count = result.buy.price.countOrd;
            result.buy.price.orders.forEach( (item, i) => {
                if (i < count) {
                    orders.push( {
                        "market": market,
                        "side": "buy",
                        "price": item[0],
                        "type": "limit",
                        "size": item[1],
                    })
                }
            });
        } else {
            count = result.sell.price.countOrd;
            result.sell.price.orders.forEach( (item, i) => {
                if (i < count) {
                    orders.push( {
                        "market": market,
                        "side": "sell",
                        "price": item[0],
                        "type": "limit",
                        "size": item[1],
                    })
                }
            });
        }
        
        promises = orders.map( item => {
            this.postRequest('orders', item ).catch(e => Promise.reject({"error": e}));
        });

        return Promise.all(promises).catch(e => Promise.reject({"error": e}));
    }

    //Withdrawal from FTX to address
    //currency - 'TONCOIN'
    //amount - 130
    //method - 'ton' (for each currency his own)
    //address - address for withdrawal
    //tag - memo
    withdrawalToAddress (currency, amount, method, address, tag = null) {

        //body for withdrawal
        const body_withdrawal = {
            "coin": currency,
            "size": amount,
            "address": address,
            "tag": tag,
            "password": "123511",
            "method": method,
        }
        return this.postRequest('wallet/withdrawals', body_withdrawal).catch(e => Promise.reject({"error": e}));
    }

    //Get deposit address
    //coin - 'TONCOIN'
    //method - 'ton'
    getDepositAdrr(coin, method) {
        return this.getRequest(`wallet/deposit_address/${coin}`, { method }).catch(e => Promise.reject({"error": e}));
    }


}

module.exports = {
    FTXclient,
}


/*
const ftx_api_key="gX2ts8O9WPq_1r-0ykDnQYATeowYce4O4DS-AJ7n";
const ftx_api_secret="-qHyMYGDoYCZ7X7Cr7U3CF1ss76trX9vq2e6Hh-K";

const ftx = new FTXclient(ftx_api_key,ftx_api_secret);

ftx.withdrawalToAddress("TONCOIN",1.2, 'ton', "EQCzFTXpNNsFu8IgJnRnkDyBCL2ry8KgZYiDi3Jt31ie8EIQ","54d6f6b3-5224-4f06-b290-eda94e1d07b8");
*/