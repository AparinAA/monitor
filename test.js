const axios = require('axios');

let count = 0;
setInterval( () => {
    axios.get('http://195.133.1.56:8090/allspread')
    .then(() => console.info("OK", count++))
    .catch(e => console.info(e));
}, 100)