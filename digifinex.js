const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();


class Digifinex {
    constructor(api_key, api_secret) {
        this.instance = axios.create({
            baseURL: 'https://openapi.digifinex.com/v3',
            timeout: 5000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17',
                'ACCESS-KEY': api_key,
            }
        });

        this.instance.interceptors.request.use(config => {
            const now = parseInt(Date.now() / 1000);
            const method = config.method.toUpperCase();
            let { data, params } = config;
            
            const sign = crypto.createHmac('sha256', api_secret).update(JSON.stringify(data) || JSON.stringify(params)).digest('hex');

            config.headers['ACCESS-TIMESTAMP'] = now;

            params = new URLSearchParams(params).toString();

            config.headers['ACCESS-SIGN'] = sign;
            return config;
        }, error => Promise.reject(error) )
    }

    //GET request 
    getRequest(endpoint, params = {}) {
        return this.instance.get(endpoint, { params })
            .then(result => {
                return result.data;
            }, e => {
                throw {"error": "bad GET request: ", 'msg': e};
            });
    }

    //POST request
    postRequest(endpoint, data = {}) {
        return this.instance.post(endpoint, data).catch(e => Promise.reject({"error": e}));
    }

    getMarket(tickers = undefined) {
        return this.getRequest('/ticker').then(response => {
            
            if (tickers) {
                return response.ticker
                .filter( item => tickers.has(item.symbol.toUpperCase()))
                .map(item => (
                    {
                        'instId': item.symbol.toUpperCase(),
                        'ask': item.sell,
                        'bid': item.buy,
                        'base_vol': item.base_vol
                    }
                ))
            } else {
                return response.ticker.map(item => (
                    {
                        'instId': item.symbol.toUpperCase(),
                        'ask': item.sell,
                        'bid': item.buy,
                        'base_vol': item.base_vol
                    }
                ))
            }
            
        });
    }
}

/*
const digifinex_secret = process.env.digifinex_api_secret;
const digifinex_key = process.env.digifinex_api_key;
const dig = new Digifinex(digifinex_key, digifinex_secret);

dig.getMarket(new Set(['PKOIN_USDT']))
.then( r => {
    console.info(r);
})
.catch(e => console.info(e))
*/
module.exports = {
    Digifinex,
}