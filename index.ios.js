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
                // TODO: Add code to testing fetching of data from API
                fetch('http://facebook.github.io/react-native/movies.json')
                    .then((response) => response.json())
                    .then((responseJson) => {
                        let stocks = responseJson.movies
                            .filter((i) => {
                                let t = i.title.toLowerCase();
                                let q = query.toLowerCase();
                                return t.indexOf(q) >= 0;
                            })
                            .map((i) => {
                                return {name: i.title};
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
