const axios = require('axios');

let count = 0;
setInterval( () => {
    axios.get('http://195.133.1.56:8090/allspread')
    .then((d) => console.info("OK", count++, d.data[0].name))
    .catch(e => console.info(e));
}, 1)