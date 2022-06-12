import './App.css';
import React from 'react';
import axios from 'axios';
import {Button, Form, InputGroup, ListGroup, Card,DropdownButton, Dropdown, Offcanvas, Container, Row, Col, Spinner, CloseButton} from 'react-bootstrap';
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


class ExchangeInfo extends React.Component {
    
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
        
        const trunceAsk = this.props.price?.ask[0][0] > 100 ? this.props.price?.ask[0][0] : truncated(this.props.price?.ask[0][0],6);
        const trunceBid = this.props.price?.bid[0][0] > 100 ? this.props.price?.bid[0][0] : truncated(this.props.price?.bid[0][0],6);
        
        return (
            <div>
                <div><b>{this.props.exchange}</b></div>
                <div>{element}</div>
                <div>
                    <div>Order price</div>
                    <div className='best-order-book'>    
                        <div className='ask'>Ask: {!trunceAsk ? Number(this.props.price?.ask[0][0]) : trunceAsk}</div>
                        <div className='bid'>Bid: {!trunceBid ? Number(this.props.price?.bid[0][0]) : trunceBid}</div>
                    </div>
                </div>
            </div>
                
        );
    }
}

class BlockPairExchanges extends React.Component {
    
    render() {
        return (
            <Col xs={12} sm={6} md={6} lg={4} xl={4} xxl={3}>
                <Card>
                    <Card.Header><b>{this.props?.currency?.name}</b></Card.Header>
                    <Card.Body bsPrefix={'class-body-new'}>
                        <Row>
                            <Col>
                                <ExchangeInfo
                                    exchange={this.props?.currency?.leftEx?.name}
                                    price={this.props?.currency?.leftEx}
                                    spread={this.props?.currency?.spread}
                                    time={this.props?.timeRefresh}
                                    side="leftEx"
                                />
                            </Col>                            
                            <Col>
                                <ExchangeInfo
                                    exchange={this.props?.currency?.rightEx?.name}
                                    price={this.props?.currency?.rightEx}
                                    spread={this.props?.currency?.spread}
                                    time={this.props?.timeRefresh}
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

class TablePairExchanges extends React.Component {

    render() {
        const filter = this.props.filter.split(',');
        const len = filter.length;
        let tableScanAll = [];
        const spreadMin = this.props.spreadMin;
        const spreadMax = this.props.spreadMax;

        let allTickets = sortData(
                                this.props.allTickets,
                                this.props.sortBy
                            )
                            .filter(item => {
                                for(let i = 0; i < len; i++ ){
                                    if (item.name.indexOf(filter[i]) !== -1) {
                                        return true;
                                    }
                                }
                                return false;
                                
                            })
                            .filter(item => {
                                if ( 
                                    (item.spread[0] >= spreadMin && item.spread[0] <= spreadMax) ||
                                    (item.spread[1] >= spreadMin && item.spread[1] <= spreadMax)
                                ) {
                                    return true;
                                }
                                return false;
                            })
                            .filter(item => (this.props.selectExchanges.has(item.leftEx.name) && this.props.selectExchanges.has(item.rightEx.name)) );
                
        allTickets.forEach( item => {
            const keyId = item.name + item.leftEx.name + item.rightEx.name + this.props.sortBy + this.props.timeRefresh;
            tableScanAll.push(
                <BlockPairExchanges
                    key={"key-" + keyId}
                    currency={item}
                />
            )
        });

        const foundScan = ((tableScanAll.length === 0) || (allTickets[0]?.name === '')) ?
                        <div className="not-found-window">
                            <span>
                                Not found cryptocurrencies and pairs exchange with spread 😔  Repeat refreshed for check spreads
                            </span>
                        </div> :
                        tableScanAll;


        return (
            <Row>
                {foundScan}
            </Row>
        );
        
    }
}

class SearchTable extends React.Component {

    render() {
        const filter = this.props.filter.split(',');
        
        const setTickets = Array.from(new Set(this.props.allTickets
                                .map(element => element.name)
                                .filter(item => item.indexOf(filter[filter.length-1]) !== -1)
                                .sort()
                            ));

        const allExchanges = ["OKX","FTX","Binance","KuCoin","Huobi","Gateio","Mexc"]
                            .map(item => <Form.Check
                                            onChange={this.props.checkboxExchange}
                                            checked={this.props.selectExchanges.has(item)}
                                            inline
                                            key={item}
                                            type='checkbox'
                                            label={item}
                                            name={item}
                                            id={`checkEx+${item}`}
                                        />
                            )
                            
        
        const flagShowDropMenu = setTickets.length && this.props.showMenuSelectTickers ? true : false;
        
        
        const dropTickers = setTickets.map( item => <Dropdown.Item eventKey={item} key={item}>{item}</Dropdown.Item>);

        const renderTooltip = () => (
            <span>
                Refresh available once every 15 sec
            </span>
        );

        const spinnerOrButtron = () => {
            if (this.props.loading) {
                return  <Spinner animation="border" aria-hidden="true" size='sm'/>
            }
            return <b><ArrowCounterclockwise/></b>
        }

        const radios = [
            { name: 'Sort by spread from high to low', value: '1', id: '1' },
            { name: 'Sort by spread from low to high', value: '2', id: '2' },
        ];

        const listSort = radios.map( (radio) => 
                <Dropdown.Item eventKey={radio.value} key={'' + radio.id}>{radio.name}</Dropdown.Item>
        );

        const titleSort = radios.find(item => Number(item.value) === this.props.sortBy).name;
        

        return (
            <div className="filter-menu">
                <Row style={{padding: "0 9px"}}>
                    <Col style={{width: "60px", padding: "0px"}} sm={1} xs={2}>
                        <Button 
                            onClick={this.props.RefreshInfoSpreads}
                            size='sm'
                            style={{margin: "5px 5px 5px 0"}}
                            md={12}
                            disabled={this.props.loading}
                        >
                            {spinnerOrButtron()}
                        </Button>
                    </Col>
                    
                    <Col className='d-none d-md-block set-text-refresh'>
                        {renderTooltip()}
                    </Col>

                    <Col className='d-block d-md-none sort-position'>
                        <DropdownButton
                            onSelect={this.props.checkSort}
                            title={titleSort}
                            variant="secondary"
                            size='sm'
                            className='sort-position-drop'
                        >
                            {listSort}
                        </DropdownButton>
                    </Col>
                    
                </Row>
                        
                <Row style={{padding: "5px 9px 0"}} className="col-md-12" >
                    
                    <Col md={4} sm={12} xs={12} className='p-1 position-relative'>
                        <Form.Control
                            type="text"
                            className="ms-auto"
                            onChange={this.props.filterChange}
                            placeholder="Cur1,Cur2,..."
                            aria-describedby="textForFindCurrency"
                            value={this.props.filter}
                            size='sm'
                        /><CloseButton onClick={this.props.deleteCurs} className="delete-close-curs"/>
                        

                        <Form.Text style={{padding: "2px 3px"}} id="textForFindCurrency" muted>Tap name</Form.Text>
                        <Dropdown
                            onSelect={this.props.selectDropFilter}
                            style={{position: "absolute", zIndex: "1000"}}
                            show={flagShowDropMenu}
                            size='sm'
                            
                        >
                            <Dropdown.Menu
                                show={flagShowDropMenu} size='sm'
                            >
                                {dropTickers}
                            </Dropdown.Menu>
                        </Dropdown>
                        
                    </Col>
                    <Col md={2} sm={6} xs={6} className='p-1'>
                        <Form.Control
                            type="text"
                            onChange={this.props.changeSpreadMin}
                            placeholder="Filter Min"
                            aria-describedby="textForMinSpread"
                            size='sm'
                        />
                        <Form.Text style={{padding: "0 0 0 3px"}} id="textForMinSpread" muted>Tap min spread</Form.Text>
                    </Col>
                    <Col md={2} sm={6} xs={6} className='p-1'>
                        <Form.Control
                            type="text"
                            onChange={this.props.changeSpreadMax}
                            placeholder="Filter Max"
                            aria-describedby="textForMaxSpread"
                            size='sm'
                        />
                        <Form.Text style={{padding: "0"}} id="textForMaxSpread" muted>Tap max spread</Form.Text>
                    </Col>
                    
                    <div className='d-none d-md-block col-md-4 p-1 sort-position'>
                        <DropdownButton 
                            onSelect={this.props.checkSort}
                            title={titleSort}
                            variant="secondary"
                            size='sm'
                        >
                            {listSort}
                        </DropdownButton>
                    </div>
                </Row>
                        
                <Row style={{padding: "5px 9px"}} className="col-md-12">
                    <Form>
                        {allExchanges}
                    </Form>
                </Row>
            </div>                  
            
        );
    }
}

class ScanerPlot extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            sortBy: 1,
            timeRefresh: Date.now(),
            filter: '',
            spreadMin: 0.01,
            spreadMax: 1000,
            showMenuSelectTickers: false,
            selectExchanges: new Set(["OKX","FTX","Binance","KuCoin","Gateio","Mexc"]),
            allTickets: [{'name': '','leftEx': {'name': '','ask': [['-']], 'bid': [['-']]},'rightEx': {'name': '','ask': [['-']],'bid': [['-']]},'spread': [0, 0]}],
        }
        this.RefreshInfoSpreads = this.RefreshInfoSpreads.bind(this);
        this.checkSort = this.checkSort.bind(this);
        this.filterChange = this.filterChange.bind(this);
        this.selectDropFilter = this.selectDropFilter.bind(this);
        this.changeSpreadMin = this.changeSpreadMin.bind(this);
        this.changeSpreadMax = this.changeSpreadMax.bind(this);
        this.checkboxExchange = this.checkboxExchange.bind(this);
        this.deleteCurs = this.deleteCurs.bind(this);
        
    }

    componentDidMount() {
        this.timeIdAllCheckPrice();
    }
    
    timeIdAllCheckPrice() {
        this.setState({loading: true});
        //axios.get(`http://localhost:8090/allspread`)
        axios.get(`http://195.133.1.56:8090/allspread`)
        .then( res => {
            
            this.setState({
                allTickets: res.data,
                loading: false,
                timeRefresh: Date.now()
            })
        })
        .catch( () => {
            this.setState({
                allTickets: [{'name': '','leftEx': {'name': '','ask': [['-']], 'bid': [['-']]},'rightEx': {'name': '','ask': [['-']],'bid': [['-']]},'spread': [0, 0]}],
                loading: false
            })
        });
    }

    RefreshInfoSpreads() {
        this.setState({loading: true});
        setTimeout( () => this.timeIdAllCheckPrice(), 1000);
        
    }

    //======================================================
    //Обработчики изменения фильтра
    filterChange(event) {
        const e = event.target.value.toUpperCase();
        const len = this.state.filter.length 
        
        if (e.length !== 0) {
            if (e[e.length - 1] !== this.state.filter[len - 1]) {
                this.setState({
                    filter: e,
                    showMenuSelectTickers: true
                })
            }
        } else {
            this.setState({
                filter: e,
                showMenuSelectTickers: false
            });
        }
        this.setState({
            filter: e
        })
        
    }

    changeSpreadMin(event) {
        if(Number(event.target.value) > 0) {
            this.setState({spreadMin: Number(event.target.value)});
        } else if (event.target.value === '') {
            this.setState({spreadMin: 0});
        }
    }
    changeSpreadMax(event) {
        if(Number(event.target.value) > 0) {
            this.setState({spreadMax: Number(event.target.value)});
        }else if (event.target.value === '') {
            this.setState({spreadMax: 1000});
        }
    }

    selectDropFilter(event) {
        this.setState( state => {
                const len = state.filter.split(',').length;
                if(len === 1) {
                    return {
                        filter: event,
                        showMenuSelectTickers: false
                    }
                } else {
                    return {
                        filter: state.filter.split(',').slice(0,-1).join(',') + "," + event,
                        showMenuSelectTickers: false
                    }
                }
            }
        )
    }
    checkboxExchange(event) {
        const check = event.target.checked;
        const exchange = event.target.name;
        if (check) {
            this.setState( state => ({
                    selectExchanges: state.selectExchanges.add(exchange)
                })
            )
        } else {
            this.setState( state => {
                    const buf = state.selectExchanges;
                    buf.delete(exchange);
                    return {
                        selectExchanges: buf
                    }
                }
            )
        }

    }

    deleteCurs() {
        this.setState({
            filter: '',
            showMenuSelectTickers: false
        });
    }
    //======================================================

    //Обработчки сортировки
    //======================================================
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
    //======================================================
    render() {
        return (
            <Container className='table-scaner' fluid={true}>
                <SearchTable
                    loading={this.state.loading}
                    sortBy={this.state.sortBy}
                    timeRefresh={this.state.timeRefresh}
                    filter={this.state.filter}
                    spreadMin={this.state.spreadMin}
                    spreadMax={this.state.spreadMax}
                    showMenuSelectTickers={this.state.showMenuSelectTickers}
                    selectExchanges={this.state.selectExchanges}
                    allTickets={this.state.allTickets}
                    RefreshInfoSpreads={this.RefreshInfoSpreads}
                    checkSort = {this.checkSort}
                    filterChange = {this.filterChange}
                    selectDropFilter = {this.selectDropFilter}
                    changeSpreadMin = {this.changeSpreadMin}
                    changeSpreadMax = {this.changeSpreadMax}
                    checkboxExchange = {this.checkboxExchange}
                    deleteCurs = {this.deleteCurs}
                /> 
                <TablePairExchanges 
                    sortBy={this.state.sortBy}
                    timeRefresh={this.state.timeRefresh}
                    filter={this.state.filter}
                    spreadMin={this.state.spreadMin}
                    spreadMax={this.state.spreadMax}
                    showMenuSelectTickers={this.state.showMenuSelectTickers}
                    selectExchanges={this.state.selectExchanges}
                    allTickets={this.state.allTickets}
                />
            </Container>
        );
        
    }
}


//======================================================
//View balance 

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

        const listCurrency = [
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
                
                <Button onClick={this.handleOpen} size='sm' className='show-balance'>
                    <ChevronRight/>
                    Show balance
                </Button>

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
            <ScanerPlot />
        </div>
        
    )
}


export default App;