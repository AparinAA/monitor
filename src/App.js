import './App.css';
import React from 'react';
import axios from 'axios';
import Spinner from 'react-bootstrap/Spinner';
import {Button, Form, InputGroup, ListGroup, Card,DropdownButton, Dropdown, CardGroup} from 'react-bootstrap';

//округление до знака decimalPlaces после запятой
function truncated(num, decimalPlaces) {    
    var numPowerConverter = Math.pow(10, decimalPlaces); 
    return ~~(num * numPowerConverter)/numPowerConverter;
}

function positiveNumber(number) {
    return number > 0.00000000000000001;
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
    }

    componentWillUnmount() {
        clearInterval(this.timeId);
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
        
        return (
            <Card style={{ width: '15rem' }}>
                <Card.Header>Биржа {this.props.exchange === 'ftx' ? "FTX" : "OKEX"}</Card.Header>
                <Card.Body className='data-exchange'>
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
                </Card.Body>
            </Card>
        );
    }
}

let listCurrency = [
    'ANC',
    'TON',
    'BTC',
    'ETH',
    'GOG',
    'GODS',
    'GMT'
]

class ViewExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currency: "ANC"
        }
        this.handleChangeCurrency = this.handleChangeCurrency.bind(this);
    }

    handleChangeCurrency(event) {
        this.setState({currency: event});
    }

    render() {
        let options = listCurrency.map( item => 
            <Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
        )
        return (
            <Card>
                
                <DropdownButton title={this.state.currency} onSelect={this.handleChangeCurrency} variant='secondary' size='sm'>
                    {options}
                </DropdownButton>
            
                <CardGroup>
                    <CheckPrice exchange="okx" currency={this.state.currency} />
                    <CheckPrice exchange="ftx" currency={this.state.currency} />
                </CardGroup>
            </Card>
            
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
                <div>
                    {tableScan}
                </div>
                <div>
                    <Button onClick={this.AddScanEvent} size='sm' variant='secondary'> Добавить скан </Button>
                    <Button onClick={this.DeleteScanEvent} size='sm' variant='secondary'>Удалить скан</Button>
                </div>
            </div>
            
        );
    }
}

class ViewBalanceExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            balance: ['not found'],
            currencyWithdrawal: this.props.exchange === 'ftx' ? "TON" : "USDT",
            amount: this.props.exchange === 'ftx' ? "450" : "751",
            spinner: 'secondary',
        }
        this.handleWithdrawal = this.handleWithdrawal.bind(this);
        this.onChangeCurWithdrawal = this.onChangeCurWithdrawal.bind(this);
        this.onChangeAmount = this.onChangeAmount.bind(this);
    }
    
    componentDidMount() {
        this.getReq();
    }
    
    onChangeCurWithdrawal(event) {
        this.setState({currencyWithdrawal: event});
    }
    
    onChangeAmount(event) {
        this.setState({amount: event.target.value});
    }

    handleWithdrawal(event) {
        const params = new URLSearchParams({
            'ex': this.props.exchange,
            'cur': this.state.currencyWithdrawal,
            'sz': this.state.amount
        }).toString();
        
        this.setState({spinner: 'spinner'});
        axios.get('http://195.133.1.56:8090/withdrawal?'+params)
        .then( result => {
            
            //const buttonWithdrawl = document.getElementById("withdrawal_"+this.props.exchange);
            if(result.data.withdrawal == true) {
                this.setState({spinner: "success"});
            } else {
                this.setState({spinner: "danger"});
            }
        })
        .catch((e) => {
            console.info(e);
        });
                
        event.preventDefault();
    }

    getReq() {
        axios.get('http://195.133.1.56:8090/balance')
        .then( res => {
            this.setState({balance: this.props.exchange === 'ftx' ? res.data[0] : res.data[1]});
        })
        .catch(() => this.setState({balance: ['not connect']}));
    }

    render() {
        const listBalance = this.state.balance.map( item => 
            <ListGroup.Item key={this.props.exchange + item.ccy}>{item.ccy} - {truncated(item.avail,2)} ({truncated(item.eqUsd,2)} USD)</ListGroup.Item>
        );
        const spinner = this.state.spinner;
                
        const input = (spinner) => {
            if (spinner === 'spinner') {
                return <Spinner animation='grow' />;
            } else {
                return <Button type="submit" id={"withdrawal_"+this.props.exchange} size="sm" variant={spinner}>Withdrawal</Button>;
            }
        };
        return (
            <Card style={{ width: '16rem' }}>
                <Card.Header>Баланс биржы {this.props.exchange === 'ftx' ? "FTX" : "OKX"}</Card.Header>
                <ListGroup variant="flush">
                    {listBalance}
                </ListGroup>
                Withdrawal from {this.props.exchange === 'ftx' ? "FTX" : "OKX"} to {this.props.exchange === 'ftx' ? "OKX" : "FTX"}
                
                <Form onSubmit={this.handleWithdrawal}>
                    <InputGroup size='sm'>
                        <DropdownButton onSelect={this.onChangeCurWithdrawal} title={this.state.currencyWithdrawal} variant='secondary'>
                            <Dropdown.Item eventKey="TON" >TON</Dropdown.Item>
                            <Dropdown.Item eventKey="USDT" >USDT</Dropdown.Item>
                            <Dropdown.Item eventKey="ANC" >ANC</Dropdown.Item>
                        </DropdownButton>
                        <Form.Control  type="text" placeholder="Amount" value={this.state.amount} onChange={this.onChangeAmount}/>
                        {input(spinner)}
                    </InputGroup>
                </Form>
                
            </Card>
            
        );
    }

}


function App() {
    return (
        <div>
            <div className='list-balance-exchange'>
                <ViewBalanceExchange exchange="okx" />
                <ViewBalanceExchange exchange="ftx" />
            </div>
            <AddScan />
        </div>
        
    )
}


export default App;
