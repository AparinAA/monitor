require('dotenv').config();
const hmacSHA256 = require('crypto-js/hmac-sha256')
const sha256 = require('crypto-js/sha256')
const Hex = require('crypto-js/enc-hex');
const axios = require('axios');
const crypto = require('crypto');

//in order to create new OKXclient(api_key, api_secret_key, passphrase)
class OKXclient {
    constructor(api_key, api_secret, passphrase) {
        this.instance = axios.create({
            baseURL: 'https://www.okex.com',
            timeout: 5000,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json; utf-8',
                "OK-ACCESS-KEY": api_key,
                "OK-ACCESS-PASSPHRASE": passphrase,
            }
        });

        this.instance.interceptors.request.use(config => {
            const now = new Date().toISOString();
            const method = config.method.toUpperCase();
            let { data, params } = config;
            let sign;
            
            if (!data) {
                data = '';
            } else {
                data = JSON.stringify(data);
            }
            
            params = new URLSearchParams(params).toString();

            sign = crypto.createHmac("sha256", api_secret)
                    .update(now + method.toUpperCase() + `${config.url}` + (method === 'GET' ? (params ? `?${params}` : ``) : `${data}`))
                    .digest('base64');
            
            config.headers['OK-ACCESS-TIMESTAMP'] = now;

            config.headers['OK-ACCESS-SIGN'] = sign

            return config;
        }, error => Promise.reject(error) );
    }

    //GET request 
    getRequest(endpoint, params = {}) {
        return this.instance.get(endpoint, { params })
            .then(result => {
                return result.data;
            });
    }

    //POST request
    postRequest(endpoint, data = {}) {
        return this.instance.post(endpoint, data);
    }

    //Get balance account
    //return list of object [ {'ccy': ccy, 'avail': amountAvailble, 'eqUsd', equelUsd} ]
    getBalance() {
        return this.getRequest('/api/v5/account/balance')
            .then( balance => {
                return balance.data[0].details.map(element => {
                    return {
                        'ccy': element.ccy,
                        'avail': element.availBal,
                        'eqUsd': element.eqUsd

                    }
                })
            });
    }

    /*Get market price with any depth < 400
      instId='TON-USDT', depth=int
      return object 
      {
        'ask': [[priceAsk1, amountAsk1], [priceAsk2, amountAsk2], ...],
        'bid': [[priceBid1, amountBid1], [priceBid2, amountBid2], ...]
      }
    */
    getMarket(instId, sz = null) {
        return this.getRequest(`/api/v5/market/books`, { instId, sz })
            .then(result => {
                return {
                    'ask': result.data[0].asks.map( item => item.splice(0,2)),
                    'bid': result.data[0].bids.map( item => item.splice(0,2)),
                }
            });
    }

    //put orders buy/sell
    //market - 'TON-USDT'
    //markets = {'buy': {'name': 'ftx', 'price': { 'countOrd': 2, 'orders': [[1, 1], [1.1, 1]] }}, 'sell': {'name': 'okx', 'price': [[1, 1]]}}
    //'countOrd' - need 2 orders
    //'orders' - [[priceOrder1, amountOrder1], [priceOrder2, amountOrder2] , ...]
    putOrders(market, result) {
        const endpoint = "/api/v5/trade/batch-orders";

        let order = [];

        let count;

        if (result.buy.name === 'okx') {
            count = result.buy.price.countOrd;
            result.buy.price.orders.forEach( (item, i) => {
                if (i < count) {
                    order.push( {
                        "instId": market,
                        "tdMode": "cash",
                        "side": "buy",
                        "ordType": "limit",
                        "px": item[0],
                        "sz": item[1],
                    })
                }
            })
        } else {
            count = result.sell.price.countOrd;
            result.sell.price.orders.forEach( (item, i) => {
                if (i < count) {
                    order.push( {
                        "instId": market,
                        "tdMode": "cash",
                        "side": "sell",
                        "ordType": "limit",
                        "px": item[0],
                        "sz": item[1],
                    })
                }
            })
        }

        return this.postRequest(endpoint, order);
    }

    //Transfer within account
    //curryncy - 'TON' , amount - amount (+fee if to main + withdrawal)
    //TradeAcc = "18"
    //MainAcc = "6"
    transferCurrAcc(currency, amount, from, to) {
        //body for transfer within account
        const body_transfer = {
            "ccy": currency,
            "amt": amount,
            "from": from,
            "to": to
        }
        return this.postRequest("/api/v5/asset/transfer", body_transfer);
    }
    //Withdrawal from FTX to address
    //currency - 'TON'
    //amount - 130
    //chain - 'TON-TON' (for each currency his own)
    //address - address for withdrawal (+:tag)
    //fee - (for each currency his own)
    withdrawalToAddress (currency, amount, fee, chain, address) {

        //body for withdrawal
        const body_withdrawal = {
            "amt": "" + amount,
            "fee": fee,
            "dest": "4",
            "ccy": currency,
            "chain": chain,
            "toAddr": address
        }
        return this.postRequest('/api/v5/asset/withdrawal', body_withdrawal);
    }

}

/*
//Init secret api OKX
const secretDict_OKX = {
    'api_key': process.env.api_key,
    'passphrase': process.env.passphrase,
    'secret_key': process.env.secret_key,
};

const okx = new OKXclient(secretDict_OKX.api_key, secretDict_OKX.secret_key, secretDict_OKX.passphrase);
okx.getMarket('TON-USDT',1)
.then(res => console.info(res))
.catch(e => console.info(e));

*/
module.exports = {
    OKXclient
}