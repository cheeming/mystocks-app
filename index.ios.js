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
} from 'react-native';

import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';

import HTMLParser from 'fast-html-parser';

// Component to show list of stocks
class StockListView extends Component {
    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        return (
            <View>
                <TextInput
                    onSubmitEditing={(e) => {
                        let query = e.nativeEvent.text;
                        if (typeof this.props.onSearch !== 'undefined') {
                            this.props.onSearch(query);
                        }
                    }}
                    style={{
                        height: 20,
                        borderColor: 'gray',
                        borderWidth: 1
                    }}
                    />
                <ListView
                    dataSource={ds.cloneWithRows(this.props.stocks)}
                    renderRow={(stock) => {
                        return <Text>{stock.name}</Text>
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
    (dispatch) => {
        return {
            onSearch: (query) => {
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
                                    stocks.push({
                                        name: a.text
                                    })
                                }
                            }
                        });
                        dispatch(getActionItem('STOCKS_LOAD', stocks));
                    });
            }
        }
    }
)(StockListView)

// Main navigator component
const getRoute = (routeId) => {
    return {
        id: routeId
    };
}

const renderScene = (route, navigator) => {
    return (
        <View style={{
                paddingTop: 10,  // required for iOS
            }}>
            <View
                style={{
                    padding: 6,
                }}>
                <Text style={{textAlign: 'center', backgroundColor: 'white'}}>MyStocks</Text>
            </View>
            <StockListViewContainer />
        </View>
    );
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
