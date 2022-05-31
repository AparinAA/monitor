import './App.css';
import React from 'react';
import axios from 'axios';
import Spinner from 'react-bootstrap/Spinner';
import {Button, Form, InputGroup, ListGroup, Card,DropdownButton, Dropdown, Offcanvas, Container, Row, Col} from 'react-bootstrap';

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
    }

    render() {
        const spread_1 = truncated(this.props.price.spread[0],2);
        const spread_2 = truncated(this.props.price.spread[1],2);

        const buyOKX = this.props.exchange === 'okx' && positiveNumber(spread_1);
        const buyFTX = this.props.exchange === 'ftx' && positiveNumber(spread_2);
        const sellOKX = this.props.exchange === 'okx' && positiveNumber(spread_2);
        const sellFTX = this.props.exchange === 'ftx' && positiveNumber(spread_1);
        const positiveSpread = positiveNumber(spread_1) ? spread_1 : (positiveNumber(spread_2) ? spread_2 : 0);

        let element = <span className={ (buyOKX || buyFTX) ? 
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
                      </span>;
        
        return (
            <div>
                <div><b>Биржа {this.props.exchange === 'ftx' ? "FTX" : "OKEX"}</b></div>
                <div>{element}</div>
                <div>
                    <div>Order price</div>
                    <div className='best-order-book'>    
                        <div className='ask'>Ask: {this.props.price?.ask[0][0]}</div>
                        <div className='bid'>Bid: {this.props.price?.bid[0][0]}</div>
                    </div>
                </div>
            </div>
                
        );
    }
}

let listCurrency = [
    'ANC',
    'TON',
    'BTC',
    'ETH',
    'GMT',
    'JOE',
    'NEAR',
    'WAVES',
]

class ViewExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currency: "ANC",
            price: {
                'okx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]},
                'ftx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]}
            },
            curParams: new URLSearchParams({'cur': "ANC"})
        }
        this.handleChangeCurrency = this.handleChangeCurrency.bind(this);
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
        axios.get(`http://195.133.1.56:8090/spread?${this.state.curParams}`)
        .then( res => {
            this.setState({price: res.data});
        })
        .catch(() => this.setState({
            price: {
                'okx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]},
                'ftx': {'ask': [['-']], 'bid': [['-']], 'spread': [0, 0]}
            }
        }));
    }


    handleChangeCurrency(event) {
        this.setState({
            currency: event,
            curParams: new URLSearchParams({'cur': event})
        });
    }

    render() {
        let options = listCurrency.map( item => 
            <Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
        )
        const Line = () => (
            <hr 
                style={{
                    padding: 0,
                    margin: 0,
                }}
            />
        );
        return (
            <Col xs={12} sm={4} md={3} xl={2}>
                <Card bg={'light'}>
                    <DropdownButton title={this.state.currency} onSelect={this.handleChangeCurrency} variant='secondary' size='sm'>
                        {options}
                    </DropdownButton>
                    <Card.Header><b>{this.state.currency}</b></Card.Header>
                    <Card.Body bsPrefix={'class-body-new'}>
                        <CheckPrice exchange="okx" price={this.state.price.okx} />
                        <Line/>
                        <CheckPrice exchange="ftx" price={this.state.price.ftx} />
                    </Card.Body>
                    
                </Card>
            </Col>
            
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
            <Container className='table-scaner' fluid={true}>
                    <Row>
                        {tableScan}
                    </Row>
                <div>
                    <Button onClick={this.AddScanEvent} size='sm' > Добавить скан </Button>
                    <Button onClick={this.DeleteScanEvent} size='sm' >Удалить скан</Button>
                </div>
            </Container>
            
        );
    }
}

class ViewBalanceExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            balance: this.props.balance,
            currencyWithdrawal: this.props.exchange === 'ftx' ? "TON" : "USDT",
            amount: this.props.exchange === 'ftx' ? "0" : "0",
            spinner: 'secondary',
        }
        this.handleWithdrawal = this.handleWithdrawal.bind(this);
        this.onChangeCurWithdrawal = this.onChangeCurWithdrawal.bind(this);
        this.onChangeAmount = this.onChangeAmount.bind(this);
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

    

    render() {
        const listBalance = this.state.balance.map( item => 
            <ListGroup.Item key={this.props.exchange + item.ccy}><b>{item.ccy}</b> - {truncated(item.avail,3)} ({truncated(item.eqUsd,2)} USD)</ListGroup.Item>
        );
        const spinner = this.state.spinner;
                
        const input = (spinner) => {
            if (spinner === 'spinner') {
                return <Spinner animation='grow' />;
            } else {
                return <Button type="submit" id={"withdrawal_"+this.props.exchange} size="sm" variant={spinner}>Withdrawal</Button>;
            }
        };

        const listTikers = listCurrency.map( (item, i) => 
            <Dropdown.Item eventKey={item} key={'' + item + i}>{item}</Dropdown.Item>
        );
        return (
            <Card style={{ width: '100%', margin: "10px 0 15px" }}>
                <Card.Header>Balance exchange {this.props.exchange === 'ftx' ? "FTX" : "OKX"}</Card.Header>
                <ListGroup variant="flush">
                    {listBalance}
                </ListGroup>
                <Card.Footer>
                    Withdrawal from {this.props.exchange === 'ftx' ? "FTX" : "OKX"} to {this.props.exchange === 'ftx' ? "OKX" : "FTX"}
                    <Form onSubmit={this.handleWithdrawal}>
                        <InputGroup size='sm'>
                            <DropdownButton onSelect={this.onChangeCurWithdrawal} title={this.state.currencyWithdrawal} variant='secondary'>
                                {listTikers}
                            </DropdownButton>
                            <Form.Control  type="text" placeholder="Amount" value={this.state.amount} onChange={this.onChangeAmount}/>
                            {input(spinner)}
                        </InputGroup>
                    </Form>
                </Card.Footer>    
            </Card>
            
        );
    }

}

class OfCansBalance extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "open": false,
            "close": false,
            "balance": [ [{"ccy": "", "avail": 0, "eqUsd": 0}], [{"ccy": "", "avail": 0, "eqUsd": 0}]]
        };
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        
    }

    componentDidMount() {
        this.getReq();
    }
    
    getReq() {
        axios.get('http://195.133.1.56:8090/balance')
        .then( res => {
            this.setState({balance: res.data});
        })
        .catch(() => this.setState({balance: [[{"ccy": "", "avail": 0, "eqUsd": 0}], [{"ccy": "", "avail": 0, "eqUsd": 0}]]}));
    }

    handleOpen() {
        this.setState({"open": true});
    }

    handleClose() {
        this.setState({"open": false});
    }

    render() {
        const open = this.state.open;
        const balanceFTX = this.state.balance[0];
        const balanceOKX = this.state.balance[1];
        let floatUSD = 0;
        floatUSD = balanceFTX?.reduce( (acc, element) => {
                return acc + (((element.ccy === "USDT") || (element.ccy === "USD")) ? Number(element.eqUsd) : 0);
        },0);
        floatUSD = balanceOKX?.reduce( (acc, element) => {
            return acc + (((element.ccy === "USDT") || (element.ccy === "USD")) ? Number(element.eqUsd) : 0);
        }, floatUSD);
        return (
            <div className='list-balance-exchange'>
                
                <Button variant="outline-secondary" onClick={this.handleOpen} size='sm'>Show balance</Button>

                <Offcanvas show={open} onHide={this.handleClose} backdrop={true} scroll={true}>
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Balance exchanges</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <div className='balance-free-float'>Free float {truncated(floatUSD,2)} USD</div>
                        <ViewBalanceExchange exchange="okx" key={"okx"} balance={balanceOKX}/>
                        <ViewBalanceExchange exchange="ftx" key={"ftx"} balance={balanceFTX}/>                        
                    </Offcanvas.Body>
                </Offcanvas>`
            </div>
            
        );
    }

}

function App() {
    return (
        <div>
            <OfCansBalance />
            <AddScan />
        </div>
        
    )
}


export default App;
