const axios = require('axios');
const fs = require('fs');


function getMarketKraken(setTickers = undefined) {
    axios.get("https://api.kraken.com/0/public/Assets")
    .then(r => console.info(r.data.result))
    .catch(e => console.info(e));
}

getMarketKraken();