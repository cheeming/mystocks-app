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
} from 'react-native';

import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';

import HTMLParser from 'fast-html-parser';
import URL from 'url-parse';

// Component to show list of stocks
class StockListView extends Component {
    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        let textInputHeight = 30;
        let fontSize = 18;
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <TextInput
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
                    dataSource={ds.cloneWithRows(this.props.stocks)}
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

                let firstLetter = query[0];
                fetch('http://ws.bursamalaysia.com/market/listed-companies/list-of-companies/list_of_companies_f.html?alphabet=' + firstLetter + '&market=main_market')
                    .then((response) => {
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
                    });
            },
            onSelectStock: (stock) => {
                ownProps.navigatorGoTo('stock_detail', stock)
            }
        }
    }
)(StockListView)

class MainView extends Component {
    render() {
        let iOSTopBarHeight = 10;
        let headerFontSize = 20;
        return (
            <View style={{
                    flex: 1, flexDirection: 'column',
                    paddingTop: iOSTopBarHeight,  // required for iOS
                }}>
                <View
                    style={{
                        padding: 10,
                    }}>
                    <Text style={{
                            textAlign: 'center', 
                            backgroundColor: 'white',
                            fontSize: headerFontSize,
                            fontWeight: 'bold',
                        }}>MyStocks</Text>
                </View>
                <StockListViewContainer
                    navigatorGoTo={this.props.navigatorGoTo} />
            </View>
        );
    }
}

class StockDetail extends Component {
    render() {
        return (
            <View><Text style={{fontSize: 12}}>StockDetail: { this.props.stock.name } { this.props.stock.stockCode }</Text></View>
        );
    }
}

// Main navigator component
const getRoute = (routeId, data) => {
    return {
        id: routeId,
        data: data,
    };
}

const renderScene = (route, navigator) => {
    var goTo = (routeId, data) => {
        navigator.push(getRoute(routeId, data));
    };

    switch (route.id) {
        case 'stock_detail':
            return <StockDetail stock={route.data} />;

        case 'main':
            return <MainView navigatorGoTo={goTo} />;
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

const myStocksApp = combineReducers({
    stocks,
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
