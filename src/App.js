import './App.css';
import React from 'react';
import axios from 'axios';
import {Button, Form, InputGroup, ListGroup, Card,DropdownButton, Dropdown, Offcanvas, Container, Row, Col, Spinner, Stack} from 'react-bootstrap';
import { ArrowCounterclockwise, ChevronRight } from 'react-bootstrap-icons';

//округление до знака decimalPlaces после запятой
function truncated(num, decimalPlaces) {    
    var numPowerConverter = Math.pow(10, decimalPlaces); 
    return ~~(num * numPowerConverter)/numPowerConverter;
}

function positiveNumber(number) {
    return number > 0.00000000000000001;
}

function sortData(data, sortType) {
    if(Number(sortType) === 1) {
        return data.sort( (prev,next) => {
            const spreadMaxNext = next.spread[0] > next.spread[1] ? next.spread[0] : next.spread[1]
            const spreadMaxPrev = prev.spread[0] > prev.spread[1] ? prev.spread[0] : prev.spread[1]
            return spreadMaxNext - spreadMaxPrev;
        })
    }

    if(Number(sortType) === 2) {
        return data.sort( (prev,next) => {
            const spreadMaxNext = next.spread[0] > next.spread[1] ? next.spread[0] : next.spread[1];
            const spreadMaxPrev = prev.spread[0] > prev.spread[1] ? prev.spread[0] : prev.spread[1];
            return spreadMaxPrev - spreadMaxNext;
        })
    }

    return data;
}

class CheckPrice extends React.Component {

    render() {
        const spread_1 = truncated(this.props.spread[0],2);
        const spread_2 = truncated(this.props.spread[1],2);

        const buyLeftEx = this.props.side === 'leftEx' && positiveNumber(spread_1);
        const buyRightEx = this.props.side === 'rightEx' && positiveNumber(spread_2);
        const sellLeftEx = this.props.side === 'leftEx' && positiveNumber(spread_2);
        const sellRightEx = this.props.side === 'rightEx' && positiveNumber(spread_1);
        const positiveSpread = positiveNumber(spread_1) ? spread_1 : (positiveNumber(spread_2) ? spread_2 : 0);

        const spreadColor = (buyLeftEx || buyRightEx) ? 
                            `triger-spread-green` : 
                            (sellLeftEx || sellRightEx) ? `triger-spread-red` : ``

        const element = <div className={"spread-value " + spreadColor}>
                            { 
                                (buyLeftEx || buyRightEx) ?
                                    `Buy: ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                    (sellLeftEx || sellRightEx) ? 
                                        `Sell: ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                        `Not found spread`                                           
                            }
                      </div>;
        
        return (
            <div>
                <div><b>Exc. {this.props.exchange}</b></div>
                <div>{element}</div>
                <div>
                    <div>Order price</div>
                    <div className='best-order-book'>    
                        <div className='ask'>Ask: {truncated(this.props.price?.ask[0][0],6)}</div>
                        <div className='bid'>Bid: {truncated(this.props.price?.bid[0][0],6)}</div>
                    </div>
                </div>
            </div>
                
        );
    }
}

let listCurrency = [
    'ANC',
    'TON',
    'SOL',
    'BTC',
    'ETH',
    'GMT',
    'JOE',
    'NEAR',
    'WAVES',
    'AVAX',
    'TRX'
]

class ViewExchange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currency: this.props?.currency?.name || "ANC",
            price: {
                    'leftEx': this.props?.currency?.leftEx || {'nane': '', 'ask': [['-']], 'bid': [['-']]},
                    'rightEx': this.props?.currency?.rightEx || {'nane': '', 'ask': [['-']], 'bid': [['-']]},
                    'spread': this.props?.currency?.spread || [0, 0],
            },
            curParams: new URLSearchParams({'cur': this.props?.currency?.name || "ANC"}),
        }
        //this.handleChangeCurrency = this.handleChangeCurrency.bind(this);
    }

    /*
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
    */
    render() {
        /*
        let options = listCurrency.map( item => 
            <Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
        )
        
        
        <DropdownButton title={this.state.currency} onSelect={this.handleChangeCurrency} variant='secondary' size='sm'>
            {options}
        </DropdownButton>
        */
        return (
            <Col xs={12} sm={6} md={6} lg={4} xl={4} xxl={3}>
                <Card>
                    <Card.Header><b>{this.state.currency}</b></Card.Header>
                    <Card.Body bsPrefix={'class-body-new'}>
                        <Row>
                            <Col>
                                <CheckPrice
                                    exchange={this.state.price.leftEx.name}
                                    price={this.state.price.leftEx}
                                    spread={this.state.price.spread}
                                    time={this.state.timeRefresh}
                                    side="leftEx"
                                />
                            </Col>                            
                            <Col>
                                <CheckPrice
                                    exchange={this.state.price.rightEx.name}
                                    price={this.state.price.rightEx}
                                    spread={this.state.price.spread}
                                    time={this.state.timeRefresh}
                                    side="rightEx"
                                />
                            </Col>
                            
                        </Row>
                        
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
            loading: false,
            countScan: 1,
            allTickets: [{'name': '','leftEx': {'name': '','ask': [['-']], 'bid': [['-']]},'rightEx': {'name': '','ask': [['-']],'bid': [['-']]},'spread': [0, 0]}],
            sortBy: 1,
            timeRefresh: Date.now()

        }
        //this.AddScanEvent = this.AddScanEvent.bind(this);
        //this.DeleteScanEvent = this.DeleteScanEvent.bind(this);
        this.RefreshInfoSpreads = this.RefreshInfoSpreads.bind(this);
        this.checkSort = this.checkSort.bind(this);
    }


    componentDidMount() {
        this.timeIdAllCheckPrice();
    }

    checkSort(event) {
        if(event) {
            this.setState( state => ({
                    sortBy: Number(event),
                    allTickets: sortData(state.allTickets, Number(event)),
                    timeRefresh: Date.now()
                })
            );
        }        
    }

    timeIdAllCheckPrice() {
        this.setState({loading: true});
        //axios.get(`http://localhost:8090/allspread`)
        axios.get(`http://195.133.1.56:8090/allspread`)
        .then( res => {
            
            this.setState( state => ({
                    allTickets: res.data,
                    loading: false,
                    timeRefresh: Date.now()
                })
            );
        })
        .catch((e) => {
            this.setState({
                allTickets: [{'name': '','leftEx': {'name': '','ask': [['-']], 'bid': [['-']]},'rightEx': {'name': '','ask': [['-']],'bid': [['-']]},'spread': [0, 0]}],
                loading: false
            })
        });
    }

    RefreshInfoSpreads() {
        this.timeIdAllCheckPrice();
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
        //let tableScan = [];
        let tableScanAll = [];

        let allTickets = sortData(this.state.allTickets, this.state.sortBy);
        
        let keyId;
        allTickets.forEach( item => {
            keyId = item.name + item.leftEx.name + item.rightEx.name + this.state.sortBy + this.state.timeRefresh;
            tableScanAll.push(<ViewExchange
                key={"key-" + keyId}
                currency={item}
            />)
        });

        const foundScan = ((tableScanAll.length === 0) || (allTickets[0]?.name === '')) ?
                        <div className="not-found-window">
                            <span>
                                Not found cryptocurrencies and pairs exchange with spread 😔  Repeat refreshed for check spreads
                            </span>
                        </div> :
                        tableScanAll;

        const renderTooltip = () => (
            <span>
                Refresh available once every 15 sec
            </span>
        );

        const spinnerOrButtron = () => {
            if (this.state.loading) {
                return  <Spinner animation="border" aria-hidden="true" size='sm'/>
            }
            return <b><ArrowCounterclockwise/></b>
        }
        /*
        for (let i = 0; i < this.state.countScan; i++) {
            tableScan.push(<ViewExchange key={i}/>);
        }
        <Col>
            <Button onClick={this.AddScanEvent} size='sm' style={{margin: "5px 5px 5px 0"}}> <b><PlusCircle size={12}/></b> Add </Button>
            <Button onClick={this.DeleteScanEvent} size='sm' style={{margin: "5px 5px 5px 0"}}> <b><DashCircle size={12}/></b> Delete</Button>
        </Col>
        */

        const radios = [
            { name: 'Sort by spread from high to low', value: '1', id: '1' },
            { name: 'Sort by spread from low to high', value: '2', id: '2' },
        ];

        const listSort = radios.map( (radio) => 
                <Dropdown.Item eventKey={radio.value} key={'' + radio.id}>{radio.name}</Dropdown.Item>
        );

        const titleSort = radios.find(item => Number(item.value) === this.state.sortBy).name;
        return (
            <Container className='table-scaner' fluid={true}>
                    
                    <Stack direction="horizontal" gap={3}>
                        <div style={{width: "60px"}}>
                            <Button onClick={this.RefreshInfoSpreads} size='sm' style={{margin: "5px 5px 5px 0"}} md={12}>
                                {spinnerOrButtron()}
                            </Button>
                        </div>
                        
                        <div className='d-none d-md-block'>
                            {renderTooltip()}
                        </div>
                        
                        <div className='ms-auto'>
                            <DropdownButton onSelect={this.checkSort} title={titleSort} variant="secondary" style={{}}>
                                {listSort}
                            </DropdownButton>
                        </div>
                        
                    </Stack>
                    
                    
                    <Row>
                        {foundScan}
                    </Row>
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
            amount: this.props.exchange === 'ftx' ? "" : "",
            spinner: 'primary',
            validated: false
        }
        this.handleWithdrawal = this.handleWithdrawal.bind(this);
        this.onChangeCurWithdrawal = this.onChangeCurWithdrawal.bind(this);
        this.onChangeAmount = this.onChangeAmount.bind(this);
    }

    onChangeCurWithdrawal(event) {
        this.setState({currencyWithdrawal: event});
    }
    
    onChangeAmount(event) {
        if( (event.target.value === "") || !Number(event.target.value)) {
            this.setState({validated: false});
        } else {
            this.setState({validated: true});
        }
        this.setState({amount: event.target.value});
    }

    handleWithdrawal(event) {
        
        if ((this.state.amount === "") || !Number(this.state.amount) ) {
            this.setState({validated: false});
            event.stopPropagation();
        } else {
            const params = new URLSearchParams({
                'ex': this.props.exchange,
                'cur': this.state.currencyWithdrawal,
                'sz': this.state.amount
            }).toString();
            
            this.setState({spinner: 'spinner'});
            axios.get('http://195.133.1.56:8090/withdrawal?'+params)
            .then( result => {
                if(result.data.withdrawal) {
                    this.setState({validated: true});
                    this.setState({spinner: "success"});
                } else {
                    this.setState({validated: false});  
                    this.setState({spinner: "danger"});
                }
            }, () => {
                this.setState({validated: false});
                this.setState({spinner: "danger"});
            })
            .catch(() => {
                this.setState({validated: false});
                this.setState({spinner: "danger"});
            });       
        }
       
        event.preventDefault();
    }

    

    render() {
        const listBalance = this.state.balance.map( item => 
            <ListGroup.Item key={this.props.exchange + item.ccy}><b>{item.ccy}</b> - {truncated(item.avail,3)} ({truncated(item.eqUsd,2)} USD)</ListGroup.Item>
        );
        const spinner = this.state.spinner;
                
        const input = (spinner) => {
            if (spinner === 'spinner') {
                return <Button type="submit" id={"withdrawal_"+this.props.exchange} size="sm">Loading...</Button>;    
            }
            return <Button type="submit" id={"withdrawal_"+this.props.exchange} size="sm" variant={spinner}>Withdrawal</Button>;
        };

        const listTikers = listCurrency.map( (item, i) => 
            <Dropdown.Item eventKey={item} key={'' + item}>{item}</Dropdown.Item>
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
                                <Dropdown.Item eventKey={"USDT"} key={"USDT0-1"}>USDT</Dropdown.Item>
                                {listTikers}
                            </DropdownButton>
                            <Form.Control
                                required
                                isValid={this.state.validated}
                                type="text"
                                placeholder="Amount"
                                value={this.state.amount}
                                onChange={this.onChangeAmount}
                            />
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
                
                <Button onClick={this.handleOpen} size='sm' className='show-balance'><ChevronRight/>Show balance</Button>

                <Offcanvas show={open} onHide={this.handleClose} backdrop={true} scroll={true}>
                    <Offcanvas.Header closeButton closeVariant={'white'}>
                        <Offcanvas.Title>Balance exchanges</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <div className='balance-free-float'>Free float {truncated(floatUSD,2)} USD</div>
                        <ViewBalanceExchange exchange="okx" key={"okx"} balance={balanceOKX}/>
                        <ViewBalanceExchange exchange="ftx" key={"ftx"} balance={balanceFTX}/>                        
                    </Offcanvas.Body>
                </Offcanvas>
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
