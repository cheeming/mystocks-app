/**
 * A simple app to track data about Malaysian stocks
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  ListView,
  Navigator,
  View,
  Dimensions,
  TouchableHighlight,
  ActivityIndicator,
} from 'react-native';

import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';

import HTMLParser from 'fast-html-parser';
import URL from 'url-parse';

// Component to show list of stocks

const DS = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

class StockListView extends Component {
    render() {
        let textInputHeight = 30;
        let fontSize = 18;
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <TextInput
                    placeholder="Enter Company Name..."
                    onSubmitEditing={(e) => {
                        let query = e.nativeEvent.text;
                        if (typeof this.props.onSearch !== 'undefined') {
                            this.props.onSearch(query);
                        }
                    }}
                    style={{
                        height: textInputHeight,
                        borderColor: 'gray',
                        borderWidth: 1,
                        padding: 4,
                        fontSize
                    }}
                    />
                <ListView
                    dataSource={DS.cloneWithRows(this.props.stocks)}
                    initialListSize={20}
                    renderRow={(stock) => {
                        return (
                            <TouchableHighlight onPress={() => { this.props.onSelectStock(stock); }}>
                                <Text
                                    style={{
                                        height: 30,
                                        padding: 4,
                                        fontSize
                                    }}>
                                    {stock.name}
                                </Text>
                            </TouchableHighlight>
                        );
                    }}
                    style={{
                        flex: 1,
                        backgroundColor: '#eeeeee',
                    }} />

            </View>
        );
    }
}


// Component used to show details for stocks
class BaseView extends Component {
    constructor(props) {
        super(props);
        props.enableProgress = this.enableProgress
        this.state = {
            showProgress: false,
        }
    }

    enableProgress(flag) {
        this.setState({showProgress: flag});
    }

    render() {
        let iOSTopBarHeight = 20;
        let headerFontSize = 20;

        // setup progress box
        let { width, height } = Dimensions.get('window');
        let progressBoxWidth = 100;
        let progressBoxHeight = 100;
        let progressBox = null
        if (this.state.showProgress) {
            progressBox = (
                <ActivityIndicator
                    style={{
                            position: 'absolute',
                            top: (height/2) - (progressBoxHeight/2),
                            left: (width/2) - (progressBoxWidth/2),
                            width: progressBoxWidth, height: progressBoxHeight,
                            borderRadius: 20,
                            backgroundColor: '#ffffffee',
                            }}
                    animating={this.state.showProgress} />
            );
        }

        // NOTE: Implement the following to customise your view
        let title = this.getTitle();
        let content = this.getContent();

        return (
            <View style={{
                    flex: 1, flexDirection: 'column',
                    paddingTop: iOSTopBarHeight,  // required for iOS
                    backgroundColor: 'white',
                }}>
                <View>
                    <Text style={{
                            padding: 10,
                            textAlign: 'center',
                            fontSize: headerFontSize,
                            fontWeight: 'bold',
                        }}>{title}</Text>
                </View>

                {content}

                {progressBox}
            </View>
        );
    }
}


class StockDetail extends BaseView {
    constructor(props) {
        super(props);
    }

    componentWillMount() {
        if (typeof this.props.onLoadData === 'function') {
            this.props.onLoadData(this.props.stockCode, this)
        }
    }

    getTitle() {
        return this.props.stockName;
    }

    getContent() {
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <View style={{flex: 0, flexDirection: 'column', alignItems: 'center' }}>
                    <Text style={{fontSize: 12, margin: 2}}>Stock Code: { this.props.stockCode }</Text>
                </View>
                <AnnouncementList announcements={this.props.announcements} />
            </View>
        );
    }
}


class AnnouncementList extends Component {
    render() {
        let announcements = this.props.announcements;
        if (typeof announcements === 'undefined') {
            announcements = [];
        }
        return (
            <ListView
                dataSource={DS.cloneWithRows(announcements)}
                initialListSize={20}
                renderRow={(announcement) => {
                    return (
                        <View style={{flex: 0, flexDirection: 'row', margin: 4}}>
                            <View style={{width: 100, alignItems: 'center' }}><Text>{announcement.date}</Text></View>
                            <View style={{flex: 1}}><Text>{announcement.title}</Text></View>
                        </View>
                    );
                }}
                style={{
                    flex: 1,
                    backgroundColor: '#eeeeee',
                }} />
        );
    }
}


class StockList extends BaseView {
    getTitle() {
        return 'MyStocks';
    }

    getContent() {
        return (
            <StockListViewContainer
                navigatorGoTo={this.props.navigatorGoTo}
                enableProgress={this.enableProgress.bind(this)} />
        );
    }
}


// Redux Containers
const StockListViewContainer = connect(
    (state) => {
        return {
            stocks: state.stocks
        }
    },
    (dispatch, ownProps) => {
        return {
            onSearch: (query) => {
                if (query.length <= 0) {
                    console.log('WARNING: no query, so skip...');
                    return;
                }
                query = query.trim();

                let firstLetter = query[0];
                ownProps.enableProgress(true);
                fetch('http://ws.bursamalaysia.com/market/listed-companies/list-of-companies/list_of_companies_f.html?alphabet=' + firstLetter + '&market=main_market')
                    .then((response) => {
                        ownProps.enableProgress(false);
                        return response.json();
                    })
                    .then((responseJson) => {
                        let htmlRoot = HTMLParser.parse(responseJson.html);
                        let tdList = htmlRoot.querySelectorAll('table.bm_dataTable tr td');
                        let stocks = []
                        tdList.forEach((o) => {
                            let a = o.querySelector('a');
                            if (a) {
                                // check if it is the link to the stock code page
                                if (a.attributes.href.indexOf('stock_code=') >= 0) {
                                    let companyName = a.text.toUpperCase();
                                    if (companyName.indexOf(query.toUpperCase()) >= 0) {
                                        let url = new URL(a.attributes.href);
                                        let query = URL.qs.parse(url.query);
                                        stocks.push({
                                            name: companyName,
                                            stockCode: query.stock_code,
                                        })
                                    }
                                }
                            }
                        });
                        dispatch(getActionItem('STOCKS_LOAD', stocks));
                    })
                    .catch((error) => {
                        ownProps.enableProgress(false);
                    });
            },
            onSelectStock: (stock) => {
                dispatch(getActionItem('STOCK_DETAIL_INIT', Object.assign({}, stock)));
                ownProps.navigatorGoTo('stock_detail');
            }
        }
    }
)(StockListView)


const StockDetailContainer = connect(
    (state) => {
        return {
            stockName: state.stockDetail.name,
            stockCode: state.stockDetail.stockCode,
            announcements: state.stockDetail.announcements,
        }
    },
    (dispatch, ownProps) => {
        return {
            onLoadData: (stockCode, component) => {
                // load the stock detail data
                component.enableProgress(true);
                fetchDataWithHtml('http://ws.bursamalaysia.com/market/listed-companies/company-announcements/announcements_listing_f.html?company=' + stockCode)
                    .then((htmlRoot) => {
                        component.enableProgress(false);
                        let announcements = []
                        let trList = htmlRoot.querySelectorAll('table.bm_dataTable tr');
                        trList.forEach((tr) => {
                            let tdList = tr.querySelectorAll('td');
                            if (tdList.length === 4) {
                                let date = tdList[1].text.trim();
                                let title = tdList[3].text.replace('  ', ' ').trim();
                                announcements.push({
                                    date: date,
                                    title: title,
                                })
                            }
                        });
                        dispatch(
                            getActionItem('STOCK_DETAIL_LOAD', {
                                announcements: announcements,
                            })
                        );
                    })
                    .catch((error) => {
                        component.enableProgress(false);
                    });
            }
        }
    }
)(StockDetail)


// Networking Utilities
function fetchDataWithHtml(url) {
    return new Promise(function(resolve, reject) {
        console.log('FETCHING: ', url);
        fetch(url)
            .then((response) => {
                console.log('DONE: ', url);
                return response.json();
            })
            .then((responseJson) => {
                let htmlRoot = HTMLParser.parse(responseJson.html);
                resolve(htmlRoot);
            })
            .catch((error) => {
                console.log('ERROR: ', url, error);
                reject(error);
            });
    });
}


// Main navigator component
const getRoute = (routeId) => {
    return {
        id: routeId,
    };
}

const renderScene = (route, navigator) => {
    let goTo = (routeId) => {
        navigator.push(getRoute(routeId));
    };

    switch (route.id) {
        case 'stock_detail':
            return <StockDetailContainer />;

        case 'main':
            return <StockList navigatorGoTo={goTo} />;
    }
}

// Reducers
const getActionItem = (type, data) => {
    return {
        type,
        data
    }
}

const stocks = (state=[], action) => {
    switch (action.type) {
        case 'STOCKS_LOAD':
            return action.data;
        default:
            return state;
    }
}

const stockDetail = (state={}, action) => {
    switch (action.type) {
        case 'STOCK_DETAIL_INIT':
            return action.data;
        case 'STOCK_DETAIL_LOAD':
            state = Object.assign({announcements: action.data.announcements}, state);
            return state;
        default:
            return state;
    }
}


const myStocksApp = combineReducers({
    stocks,
    stockDetail,
});

// The main entry point
let store = createStore(myStocksApp);

class MyStocks extends Component {
    render() {
        return (
            <Provider store={store}>
                <Navigator
                    initialRoute={getRoute('main')}
                    renderScene={renderScene} />
            </Provider>
        );
    }
}

AppRegistry.registerComponent('MyStocks', () => MyStocks);
