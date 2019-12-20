const FMEX = require('./src/fmex-rest-api')

const fmex = new FMEX({
    'apiKey':'',
    'secret':'',
});

(async () => {
    // console.log(await fmex.createOrder({symbol:'BTCUSD_P',type:'LIMIT',direction:'SHORT',price:19999,quantity:'2'}))
    console.log(await fmex.getSymbols())
})()
