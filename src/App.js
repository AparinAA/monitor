import './App.css';
import React from 'react';
import axios from 'axios';

//округление до знака decimalPlaces после запятой
function truncated(num, decimalPlaces) {    
    var numPowerConverter = Math.pow(10, decimalPlaces); 
    return ~~(num * numPowerConverter)/numPowerConverter;
}

function positiveNumber(number) {
    return number > 0.00000000000000001;
}


const currency = {
    USD: {name: 'USDT', price: 1},
    TON: {name: 'TONCOIN', price: 1.85},
    BTC: {name: 'BITCOIN', price: 36834.2},
    ETH: {name: 'ETHEREUM', price: 2832.1},
};

let listTicket = Object.keys(currency);

class InputValue extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handlerTicker = this.handlerTicker.bind(this);
    }

    handleChange(e) {
        this.props.onCurrencyChange(e.target.value);
    }
    handlerTicker(e){
        this.props.onChangeTicker(e.target.value);
    }

    render() {
        const price = this.props.value;
        const ticker = this.props.ticker
        const from = this.props.from;

        let options = listTicket.map( (element) => 
            <option key={element + from} value={element}>{element}</option>
        );
        return (
            <fieldset>
                <select value={ticker} onChange={this.handlerTicker}>
                    {options}
                </select>
                <label>{currency[ticker].name}</label>
                <input value={price} onChange={this.handleChange} />
            </fieldset>
        );
    }
}

class ConvertCurrency extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            from: {ticker: 'TON', amount: 1, from: true},
            to: {ticker: 'USD', amount: currency.TON.price, from: true}
        };
        this.handleChangeFrom = this.handleChangeFrom.bind(this);
        this.handleChangeTo = this.handleChangeTo.bind(this);
        this.handleChangeTickerFrom = this.handleChangeTickerFrom.bind(this);
        this.handleChangeTickerTo = this.handleChangeTickerTo.bind(this);

    }

    handleChangeFrom(amount) {
        this.setState( (state) => ({
            from: {
                ticker: state.from.ticker,
                amount: amount,
                from: true,
            },
            to: {
                ticker: state.to.ticker,
                amount: amount,
                from: true,
            }
        }));
    }

    handleChangeTo(amount) {
        this.setState( (state) => ({
            from: {
                ticker: state.from.ticker,
                amount: amount,
                from: false,
            },
            to: {
                ticker: state.to.ticker,
                amount: amount,
                from: false,
            }
        }));
    }

    handleChangeTickerFrom(ticker) {
        this.setState( (state) => ({
            from: {
                ticker: ticker,
                amount: state.from.amount,
                from: true,
            },
            to: {
                ticker: state.to.ticker,
                amount: tryConvert2(
                    {
                        price: currency[ticker].price, amount: state.from.amount
                    },
                    currency[state.to.ticker].price
                ),
                from: true,
            }
        }));
    }

    handleChangeTickerTo(ticker) {
        this.setState( (state) => ({
            from: {
                ticker: state.from.ticker,
                amount: state.from.amount,
                from: false,
            },
            to: {
                ticker: ticker,
                amount: tryConvert2(
                    {
                        price: currency[state.from.ticker].price,
                        amount: state.from.amount
                    },
                    currency[ticker].price
                ),
                from: false,
            }
        }));
    }

    render() {
        const currentPrice = this.props.currentprice;
        const from = this.state.from.from;
        
        let priceFrom = 0;
        let priceTo = 0;

        if (from) {
            priceFrom = this.state.from.amount;
            priceTo = tryConvert2(
                {
                    price: currency[this.state.from.ticker].price,
                    amount: this.state.from.amount,
                },
                currency[this.state.to.ticker].price,
            );
        } else {
            priceTo = this.state.to.amount;
            priceFrom = tryConvert2(
                {
                    price: currency[this.state.to.ticker].price,
                    amount: this.state.to.amount,
                },
                currency[this.state.from.ticker].price,
            );
        }


        return (
            <div>
                <p>Current price 1 TON = {currentPrice} USD</p>
                <InputValue
                    ticker={this.state.from.ticker}
                    value={priceFrom}
                    onCurrencyChange={this.handleChangeFrom}
                    onChangeTicker={this.handleChangeTickerFrom} />
                <InputValue
                    ticker={this.state.to.ticker}
                    value={priceTo}
                    onCurrencyChange={this.handleChangeTo}
                    onChangeTicker={this.handleChangeTickerTo} />
            </div>
        );
    }
}

//функция рандом +-0.01 к цене
function getRandomIntInclusive(min=0, max=1) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor((Math.random() + 0.1) * (max - min + 1)) + min; //Максимум и минимум включаются
}

//компонента для обновления цены
class UpdateCurrentPrice extends React.Component {
    constructor(props) {
        super(props);
        this.state = { currentPrice: 1.85};
    }

    componentDidMount() {
        this.timeId = setInterval(
            () => this.tick1(),
            5000
        );

    }

    componentWillUnmount() {
        clearInterval(this.timeId);
    }

    tick1() {
        //выводить рандомное число
        this.setState( (state) => ({
            currentPrice: state.currentPrice + (getRandomIntInclusive() ? 1 : -1) * Math.random() *0.01
        }));
    }

    render() {
        return (
            <div>
                <ConvertCurrency currentprice={this.state.currentPrice} />
            </div>
           
        );
    }
    
}

//конвертирование from={price: , amount: } to currency2
function tryConvert2(from, to) {
    if(isNaN(from.amount)) {
        return "0";
    }
    return (to > 0 && from.amount > 0? (from.price * from.amount / to) : 0).toString();
}


class CheckPrice extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            price: {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]},
            balance: ['not connect'],
            currency: new URLSearchParams({'cur': this.props.currency}).toString(),
        };
    }
    
    componentDidMount() {
        this.timeId = setInterval(
            () => this.price(),
            1000
        );
        //this.getReq();
        
    }

    componentWillUnmount() {
        clearInterval(this.timeId);
    }

    getReq() {
        axios.get('http://195.133.1.56:8090/balance')
        .then( res => {
            this.setState({balance: this.props.exchange === 'ftx' ? res.data[0] : res.data[1]});
        })
        .catch(() => this.setState({balance: ['not connect']}));
    }

    price() {
        this.setState({currency: new URLSearchParams({'cur': this.props.currency}).toString()});

        axios.get(`http://195.133.1.56:8090/spread?${this.state.currency}`)
        .then( res => {
            this.setState({price: res.data[this.props.exchange]});
        })
        .catch(() => this.setState({price: {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]}}));
    }

    render() {
        const spread_1 = truncated(this.state.price.spread[0],4);
        const spread_2 = truncated(this.state.price.spread[1],4);

        const buyOKX = this.props.exchange === 'okx' && positiveNumber(spread_1);
        const buyFTX = this.props.exchange === 'ftx' && positiveNumber(spread_2);
        const sellOKX = this.props.exchange === 'okx' && positiveNumber(spread_2);
        const sellFTX = this.props.exchange === 'ftx' && positiveNumber(spread_1);
        const positiveSpread = positiveNumber(spread_1) ? spread_1 : (positiveNumber(spread_2) ? spread_2 : 0);

        let element = <div className={ (buyOKX || buyFTX) ? 
                                        `triger-spread-green` : 
                                        (sellOKX || sellFTX) ? `triger-spread-red` : ``
                                        }>
                            { 
                                (buyOKX || buyFTX) ?
                                    `Buy. Spread: ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                    (sellOKX || sellFTX) ? 
                                        `Sell. Spread: ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                        `Not found spread`                                           
                            }
                      </div>;
        
        const listBalance = this.state.balance.map( item => 
            <div key={item.ccy + `_${this.props.exchange}`}>
                {item.ccy} - {item.avail}
            </div>
        );
        return (
            <div>
                <div>Биржа {this.props.exchange === 'ftx' ? "FTX" : "OKEX"}</div>
                <div className='data-exchange'>
                    
                    <div>
                        <div>Лучшая цена в стакане</div>
                        <div>
                            <div>Ask:</div>
                            <div className='best-order-book ask'>
                                <div className='price'>{this.state.price?.ask[0][0]}</div>
                                <div className='size'>{this.state.price?.ask[0][1]}</div>
                            </div>
                        </div>
                        <div>
                            <div>Bid:</div>
                            <div className='best-order-book bid'>
                                <div className='price'>{this.state.price?.bid[0][0]}</div>
                                <div className='size'>{this.state.price?.bid[0][1]}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div>
                            Спред между биржами
                        </div>
                        {element}
                    </div>
    
                </div>
            </div>
        );
    }
}

let listCurrency = [
    'TON',
    'BTC',
    'ETH',
    'BTT',
    'ANC',
    'GOG',
    'BNT',
    'ALCX',
    'ALPHA',
    'GODS',
    'GMT'
]

class ViewExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currency: "TON"
        }
        this.handleChangeCurrency = this.handleChangeCurrency.bind(this);
    }

    handleChangeCurrency(event) {
        this.setState({currency: event.target.value});
    }

    render() {
        let options = listCurrency.map( item => 
            <option key={item} value={item}>{item}</option>
        )
        return (
            <div className='curruncy-spread'>
                
                <fieldset>
                    <select value={this.state.currency} onChange={this.handleChangeCurrency}>
                        {options}
                    </select>
                </fieldset>
                

                <div className='list-exchange'>
                    <CheckPrice exchange="okx" currency={this.state.currency} />
                    <CheckPrice exchange="ftx" currency={this.state.currency} />
                </div>
            </div>
            
        );
    }

}

class AddScan extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            countScan: 1,
        }
        this.AddScanEvent = this.AddScanEvent.bind(this);
        this.DeleteScanEvent = this.DeleteScanEvent.bind(this);
    }

    AddScanEvent() {
        this.setState( (state) => ({
            countScan: state.countScan + 1
        }));
    }

    DeleteScanEvent() {
        this.setState( (state) => ({
            countScan: state.countScan - 1
        }));
    }

    render() {
        let tableScan = [];
        for (let i = 0; i < this.state.countScan; i++) {
            tableScan.push(<ViewExchange key={i}/>);
        }
        return (
            <div>
                <div className='list-currency-spread'>
                    {tableScan}
                </div>
                <div>
                    <button onClick={this.AddScanEvent}> Добавить скан </button>
                    <button onClick={this.DeleteScanEvent}>Удалить скан</button>
                </div>
            </div>
            
        );
    }
}

function App() {
    return (
        <div>
            <AddScan />
        </div>
        
    )
}


export default App;
