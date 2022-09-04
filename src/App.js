import './App.css';
import React from 'react';
import axios from 'axios';
import { Button, Form, Card, DropdownButton, Dropdown, Container, Row, Col, Spinner, CloseButton, Tabs, Tab } from 'react-bootstrap';
import { ArrowCounterclockwise, ChevronUp, ChevronDown } from 'react-bootstrap-icons';
import { truncated, positiveNumber, sortData} from './additionFunc';

//import { OfCansBalance } from './ViewBalanceCans';
import TradeCard from './TradeCard';
import Graphics from './ModelGraphics';
import { listAllExchanges, availListExchanges, emptyPrice} from './availVar';
//const OfCansBalance = React.lazy(() => import('./ViewBalanceCans'));


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

        const spreadInfo = <div className={"spread-value " + spreadColor}>
                            { 
                                (buyLeftEx || buyRightEx) ?
                                    `Buy ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                    (sellLeftEx || sellRightEx) ? 
                                        `Sell ` + (positiveNumber(positiveSpread) ? `+` : ``) + positiveSpread + `%` :
                                        `Not found spread`                                           
                            }
                      </div>;
        
        const trunceAsk = +this.props.price?.ask[0][0] > 100 ? +this.props.price?.ask[0][0] : truncated(this.props.price?.ask[0][0],6);
        const trunceBid = +this.props.price?.bid[0][0] > 100 ? +this.props.price?.bid[0][0] : truncated(this.props.price?.bid[0][0],6);
        const volume = Math.round(+this.props.price?.vol24);
        const url = this.props.price?.url;
        return (
            <div>
                <div><b><a href={url} target="_blank" rel="noreferrer" className='url-exchange-stock'>{this.props.exchange}</a></b></div>
                <div>{spreadInfo}</div>
                <div>
                    <div>Order price</div>
                    <div className='best-order-book'>    
                        <div className='ask'>Ask: {!trunceAsk ? Number(this.props.price?.ask[0][0]) : trunceAsk}</div>
                        <div className='bid'>Bid: {!trunceBid ? Number(this.props.price?.bid[0][0]) : trunceBid}</div>
                        <div className='vol24'>
                            <div className='vol24-title'>Volume USDT</div>
                            <div className='vol24-quote'>~{volume.toLocaleString('ru')}</div>
                        </div>
                    </div>
                </div>
            </div>
                
        );
    }
}

class BlockPairExchanges extends React.Component {
    
    constructor(props) {
        super(props);
        this.state = {
            tabActive: "stat",
            hiddenGraph: true,
            valueTrade: 3,
            resultTrade: [],
            spinner: false
        }
        this.selectStatOrGraph = this.selectStatOrGraph.bind(this);
        this.tradeStart = this.tradeStart.bind(this);
        this.onChangeValueTrade = this.onChangeValueTrade.bind(this);
    }

    selectStatOrGraph(eventKey) {

        this.setState({
            tabActive: eventKey,
            hiddenGraph: eventKey === "graph" ? false : true
        });
    }
    
    tradeStart(event) {
        const params = new URLSearchParams({
            'cur': this.props?.currency?.name,
            'ex1': this.props?.currency?.leftEx?.name,
            'ex2': this.props?.currency?.rightEx?.name,
            'it': this.state.valueTrade,
        }).toString();

        this.setState({ spinner: true});
        //axios.post('http://localhost:8090/trade1', { 'cur': this.props?.currency?.name,
        //  'ex1': this.props?.currency?.leftEx?.name,
        //  'ex2': this.props?.currency?.rightEx?.name,
        //  'it': this.state.valueTrade})
        //axios.get('http://localhost:8090/trade?'+params)
        axios.get('http://195.133.1.56:8090/trade?'+params)
        .then( res => {
            const result = res.data;
            this.setState({
                resultTrade: result?.error ? result?.error : result?.ready,
                spinner: false
            })
        }, () => {
            this.setState({
                resultTrade: "Ooops. Unknown error",
                spinner: false
            });
        })
        .catch( () => {
            this.setState({
                resultTrade: "Ooops. Unknown error",
                spinner: false
            });
        });

        event.preventDefault();
    }

    onChangeValueTrade(event) {
        if (+event.target.value > 0) {
            this.setState({ 
                valueTrade: +event.target.value,
            });
        }
    }

    render() {
        const genGraph = (gen, leftEx, rightEx) => {
            if (gen) {
                return  <Row>
                    <Graphics
                        listSpread={this.props?.currency?.listSpread}
                        exchange={leftEx}
                        side={"leftEx"}
                        id={this.props?.currency?.idPair}
                        url={this.props?.currency?.leftEx?.url}
                    />
                    <Graphics
                        listSpread={this.props?.currency?.listSpread}
                        exchange={rightEx}
                        side={"rightEx"}
                        id={this.props?.currency?.idPair}
                        url={this.props?.currency?.rightEx?.url}
                    />
                </Row>;
            }  
        }
        const tradeTab = (trade) => {
            if (trade) {
                return <Tab eventKey="trade" title="Trade">
                        <TradeCard
                            valueTrade={this.state.valueTrade}
                            onChangeValueTrade={this.onChangeValueTrade}
                            tradeStart={this.tradeStart}
                            resultTrade={this.state.resultTrade}
                            spinner={this.state.spinner}
                        />
                    </Tab>
            }
        }
        return (
            <Col xs={12} sm={6} md={6} lg={4} xl={4} xxl={3}>
                
                    <Tabs
                        id="tabs"
                        defaultActiveKey="stat"
                        variant="pills"
                        onSelect={this.selectStatOrGraph}
                    >   
                        <Tab disabled title={this.props?.currency?.name}></Tab>
                        <Tab eventKey="stat" title="Stat">
                            <Card>
                                <Card.Body bsPrefix={'class-body-new'}>
                                    <Row>
                                        <Col>
                                            <ExchangeInfo
                                                exchange={this.props?.currency?.leftEx?.name}
                                                price={this.props?.currency?.leftEx}
                                                spread={this.props?.currency?.spread}
                                                time={this.props?.timeRefresh}
                                                listSpread={this.props?.currency?.listSpread}
                                                side="leftEx"
                                            />
                                        </Col>                            
                                        <Col>
                                            <ExchangeInfo
                                                exchange={this.props?.currency?.rightEx?.name}
                                                price={this.props?.currency?.rightEx}
                                                spread={this.props?.currency?.spread}
                                                time={this.props?.timeRefresh}
                                                listSpread={this.props?.currency?.listSpread}
                                                side="rightEx"
                                            />
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Tab>
                        <Tab eventKey="graph" title="Graph">
                            <Card>
                                <Card.Body bsPrefix={'class-body-new'}>
                                    {genGraph(!this.state.hiddenGraph, this.props?.currency?.leftEx?.name, this.props?.currency?.rightEx?.name)}
                                </Card.Body>
                            </Card>
                        </Tab>

                        
                        {tradeTab(this.props?.currency?.availTrade)}
                    </Tabs>
                    
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
            <Row className='list-pair-spread'>
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

        const allExchanges = listAllExchanges
                            .map(item => <Form.Check
                                            onChange={this.props.checkboxExchange}
                                            checked={this.props.selectExchanges.has(item)}
                                            inline
                                            key={item}
                                            type='checkbox'
                                            label={item}
                                            name={item}
                                            id={`checkEx-${item}`}
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
            { name: 'Sort by sp. from high to low', value: '1', id: '1' },
            { name: 'Sort by sp. from low to high', value: '2', id: '2' },
            { name: 'Sort by vol. from high to low', value: '3', id: '3' },
            { name: 'Sort by vol. from low to high', value: '4', id: '4' },
        ];

        const listSort = radios.map( (radio) => 
                <Dropdown.Item eventKey={radio.value} key={'' + radio.id}>{radio.name}</Dropdown.Item>
        );

        const titleSort = radios.find(item => Number(item.value) === this.props.sortBy).name;
        
        const hiddenSymbol = this.props.hiddenFilter ? <ChevronDown /> : <ChevronUp />

        return (
            <div className="filter-menu">
                <Row style={{padding: "0 9px"}}>
                    <Col style={{width: "60px", padding: "0px"}} sm={1} xs={2}>
                        <Button  
                            className='btn btn-secondary'
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

                <Row hidden={this.props.hiddenFilter} style={{padding: "5px 9px"}}>
                    <Row style={{padding: "0", margin: "0"}} className="col-md-12">
                        
                        <Col md={4} sm={12} xs={12} className='p-1 position-relative'>
                            <Form.Control
                                type="text"
                                className="ms-auto"
                                onChange={this.props.filterChange}
                                placeholder="Cur1,Cur2,..."
                                aria-describedby="textForFindCurrency"
                                value={this.props.filter}
                                size='sm'
                            />
                            <CloseButton 
                                onClick={this.props.deleteCurs}
                                className="delete-close-curs"
                                hidden={this.props.filter.length === 0}
                            />
                            

                            <Form.Text style={{padding: "2px 3px"}} id="textForFindCurrency" muted>Tap name</Form.Text>
                            <Dropdown
                                onSelect={this.props.selectDropFilter}
                                style={{position: "absolute", zIndex: "1000"}}
                                size='sm'
                                show={flagShowDropMenu}
                                
                            >
                                <Dropdown.Menu
                                    show={flagShowDropMenu}
                                    size='sm'
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
                            
                    <Row style={{padding: "0", margin: "0"}} className="col-md-12">
                        <Form className='check-exchanges'>
                            {allExchanges}
                        </Form>
                    </Row>
                </Row>


                <Row style={{padding: "0", margin: "0"}} className="col-12">
                    <Button 
                        className='btn-close-exchange'
                        onClick={this.props.hiddenFilterHandler}
                    > 
                        {hiddenSymbol}
                    </Button>             
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
            selectExchanges: new Set(availListExchanges),
            allTickets: emptyPrice,
            hiddenFilter: false,
        }
        this.RefreshInfoSpreads = this.RefreshInfoSpreads.bind(this);
        this.checkSort = this.checkSort.bind(this);
        this.filterChange = this.filterChange.bind(this);
        this.selectDropFilter = this.selectDropFilter.bind(this);
        this.changeSpreadMin = this.changeSpreadMin.bind(this);
        this.changeSpreadMax = this.changeSpreadMax.bind(this);
        this.checkboxExchange = this.checkboxExchange.bind(this);
        this.deleteCurs = this.deleteCurs.bind(this);
        this.hiddenFilterHandler = this.hiddenFilterHandler.bind(this);
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
                allTickets: emptyPrice,
                loading: false
            })
        });
    }

    RefreshInfoSpreads(e) {
        this.setState({loading: true});
        setTimeout( () => this.timeIdAllCheckPrice(), 500);
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

    hiddenFilterHandler() {
        this.setState( state => ({
                hiddenFilter: !state.hiddenFilter
            })
        )
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
                    hiddenFilterHandler = {this.hiddenFilterHandler}
                    hiddenFilter = {this.state.hiddenFilter}
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




function App() {
//    <OfCansBalance />
    return (
        <div>
            <ScanerPlot />
        </div>
        
    )
}


export default App;