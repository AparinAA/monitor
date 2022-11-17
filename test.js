const axios = require('axios');

let count = 0;
axios('http://195.133.1.56:8090/allspread')
.then((d) => console.info(d.data,"NORM"))
.catch(e => console.info(e));
