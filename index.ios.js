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
  Linking,
  Alert,
  WebView,
} from 'react-native';

import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import DeviceInfo from 'react-native-device-info';

import HTMLParser from 'fast-html-parser';
import URL from 'url-parse';

import * as storage from 'redux-storage';
import createEngine from 'redux-storage-engine-reactnativeasyncstorage';
import filter from 'redux-storage-decorator-filter';


// Constants
const BURSA_WEBSITE_LOC = 'https://www.bursamalaysia.com';


// Component to show list of stocks

const DS = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

class StockListView extends Component {
    componentDidMount() {
        if (typeof this.props.onLoadData === 'function') {
            this.props.onEnableProgress(true);
            this.props.onLoadData.bind(this)()
                .then(() => {
                    this.props.onEnableProgress(false);
                })
                .catch(() => {
                    this.props.onEnableProgress(false);
                });
        }
    }

    render() {
        let textInputHeight = 30;
        let fontSize = 18;
        let listViewComponent = (
            <View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8}}>
                <Text style={{color: '#cccccc'}}>{DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})</Text>
            </View>
        );
        if (Array.isArray(this.props.stocks)) {
            listViewComponent = (
                <ListView
                    enableEmptySections={true}
                    dataSource={DS.cloneWithRows(this.props.stocks)}
                    initialListSize={20}
                    renderRow={(stock) => {
                        return (
                            <TouchableHighlight
                                underlayColor='#dddddd'
                                onPress={() => { this.props.onSelectStock(stock); }}>
                                <Text
                                    style={{
                                        height: 30,
                                        padding: 4,
                                        fontSize
                                    }}>
                                    {stock.stockCode}: {stock.name}
                                </Text>
                            </TouchableHighlight>
                        );
                    }}
                    style={{
                        flex: 1,
                        backgroundColor: '#eeeeee',
                    }} />
            );
        }
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <TextInput
                    autoCorrect={false}
                    defaultValue={this.props.query}
                    placeholder="Enter Company Name..."
                    onSubmitEditing={(e) => {
                        let query = e.nativeEvent.text;
                        if (typeof this.props.onSearch === 'function') {
                            this.props.onEnableProgress(true);
                            this.props.onSearch(query, this.props.allStocks)
                                .then(() => {
                                    this.props.onEnableProgress(false);
                                })
                                .catch(() => {
                                    this.props.onEnableProgress(false);
                                });
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

                {listViewComponent}

            </View>
        );
    }
}


// Component used to show details for stocks
class BaseView extends Component {
    componentDidMount() {
        if (typeof this.props.onLoadData === 'function') {
            this.props.onEnableProgress(true);
            this.props.onLoadData.bind(this)()
                .then(() => {
                    this.props.onEnableProgress(false);
                })
                .catch(() => {
                    this.props.onEnableProgress(false);
                });
        }
    }

    render() {
        let iOSTopBarHeight = 20;
        let headerFontSize = 20;

        // setup progress box
        let { width, height } = Dimensions.get('window');
        let progressBoxWidth = 100;
        let progressBoxHeight = 100;
        let progressBox = null
        if (this.props.showProgress) {
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
                    animating={this.props.showProgress} />
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
    getTitle() {
        return this.props.stockName;
    }

    getContent() {
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <View style={{flex: 0, flexDirection: 'column', alignItems: 'center' }}>
                    <Text style={{fontSize: 12, margin: 2}}>Stock Code: { this.props.stockCode }</Text>
                </View>
                <AnnouncementList
                    announcements={this.props.announcements}
                    onViewDetail={this.props.onViewAnnouncementDetail} />
            </View>
        );
    }
}


class AnnouncementList extends Component {
    onViewDetail(announcement) {
        this.props.onViewDetail(announcement);
    }

    render() {
        let announcements = this.props.announcements;
        if (typeof announcements === 'undefined') {
            announcements = [];
        }
        return (
            <ListView
                enableEmptySections={true}
                dataSource={DS.cloneWithRows(announcements)}
                initialListSize={20}
                renderRow={(announcement) => {
                    return (
                        <TouchableHighlight
                            underlayColor='#dddddd'
                            onPress={() => { this.onViewDetail(announcement); }}>
                            <View style={{flex: 0, flexDirection: 'row', margin: 4}}>
                                <View style={{width: 100, alignItems: 'center' }}><Text>{announcement.date}</Text></View>
                                <View style={{flex: 1}}><Text>{announcement.title}</Text></View>
                            </View>
                        </TouchableHighlight>
                    );
                }}
                style={{
                    flex: 1,
                    backgroundColor: '#eeeeee',
                }} />
        );
    }
}


class AnnouncementDetail extends BaseView {
    getTitle() {
        return this.props.stockName;
    }

    getContent() {
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <View style={{flex: 0, flexDirection: 'column', alignItems: 'center' }}>
                    <Text style={{fontSize: 12, margin: 2}}>{this.props.date}</Text>
                </View>
                <View style={{
                    flex: 0, flexDirection: 'row',
                    borderWidth: 1, borderColor: '#cccccc',
                    borderTopColor: '#999999',
                    backgroundColor: '#cccccc'}}>
                    <TouchableHighlight
                        onPress={() => { this.refs.webview.goBack(); }}
                        style={{
                            flex: 1,
                            height: 22,
                            justifyContent: 'center',
                            marginLeft: 4,
                        }}
                        underlayColor='#cccccc'>
                        <Text
                            style={{
                                color: '#555555',
                                fontWeight: 'bold',
                                alignItems: 'center',
                            }}>
                            &lt; Back
                        </Text>
                    </TouchableHighlight>

                    <TouchableHighlight
                        onPress={this.onOpenAnnouncementUrl.bind(this)}
                        style={{
                            flex: 1,
                            height: 22,
                            marginRight: 4,
                            justifyContent: 'center',
                        }}
                        underlayColor='#cccccc'>
                        <Text
                            style={{
                                backgroundColor: '#cccccc',
                                color: '#0645AD',
                                textDecorationLine: 'underline',
                                fontSize: 12,
                                textAlign: 'right',
                            }}>
                            Open in Browser
                        </Text>
                    </TouchableHighlight>
                </View>
                <WebView style={{
                        flex: 1,
                        backgroundColor: '#cccccc',
                    }}
                    contentInset={{
                        left: 2, top: 2,
                        right: 2, bottom: 2,
                    }}
                    source={{uri: this.props.detailUrl}}
                    scalesPageToFit={true}
                    ref='webview'
                    />
            </View>
        );
    }

    onOpenAnnouncementUrl() {
        Linking.openURL(this.props.url)
            .catch((error) => Alert.alert('Error opening link', error));
    }

}


class StockList extends BaseView {
    getTitle() {
        return 'MY Stocks';
    }

    getContent() {
        return (
            <StockListViewContainer
                navigatorGoTo={this.props.navigatorGoTo}
                onEnableProgress={this.props.onEnableProgress.bind(this)} />
        );
    }
}


// Reusable utils for Redux Containers
const commonMapStateToProps = (name, state) => {
    return {
        showProgress: state.base['showProgress_' + name],
    };
}

const commonMapDispatchToProps = (name, dispatch, ownProps) => {
    return {
        onEnableProgress: (flag) => {
            dispatch(getActionItem('ENABLE_PROGRESS', {name, flag}));
        }
    };
}

// Redux Containers
const StockListContainer = connect(
    (state) => {
        return commonMapStateToProps('main', state);
    },
    (dispatch, ownProps) => {
        return commonMapDispatchToProps('main', dispatch, ownProps);
    }
)(StockList);

const StockListViewContainer = connect(
    (state) => {
        return {
            stocks: state.stocks,
            query: state.query,
            dataLoaded: state.base.loaded,
            allStocks: state.allStocks,
        }
    },
    (dispatch, ownProps) => {
        return {
            onLoadData: () => {
                return new Promise((resolve, reject) => {
                    let url = BURSA_WEBSITE_LOC + '/searchbox_data.json';
                    fetch(url)
                        .then((response) => {
                            return response.json();
                        })
                        .then((responseJson) => {
                            let allStocksInfo = responseJson[0];
                            let allStocks = allStocksInfo.map((o) => {
                                return {
                                    name: o.full_name,
                                    stockCode: o.id,
                                };
                            });
                            dispatch(getActionItem('ALL_STOCKS_LOAD', {ALL: allStocks}));

                            resolve();
                        })
                        .catch((error) => {
                            console.log('ERROR: ', url, error);
                            reject();
                        });
                });
            },
            onSearch: (query, allStocksCached) => {
                return new Promise((resolve, reject) => {
                    if (query.length <= 0) {
                        console.log('WARNING: no query, so skip...');
                        reject();
                        return;
                    }
                    query = query.trim();
                    dispatch(getActionItem('STOCK_SEARCH', query));

                    // search from cache first
                    if (allStocksCached.hasOwnProperty('ALL')) {
                        // show only results that match query
                        let stocks = allStocksCached.ALL.filter((stockInfo) => {
                            return stockInfo.name.indexOf(query.toUpperCase()) >= 0;
                        });
                        dispatch(getActionItem('STOCKS_LOAD', stocks));
                        resolve();
                        return;
                    } else {
                        console.log('WARNING: No cached data...');
                        reject();
                        return;
                    }
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
            ...commonMapStateToProps('stock_detail', state),

            stockName: state.stockDetail.name,
            stockCode: state.stockDetail.stockCode,
            announcements: state.stockDetail.announcements,
        }
    },
    (dispatch, ownProps) => {
        return {
            ...commonMapDispatchToProps('stock_detail', dispatch, ownProps),

            onLoadData: function() {
                return new Promise( (resolve, reject) => {
                    // load the stock detail data
                    fetchDataWithHtml('http://ws.bursamalaysia.com/market/listed-companies/company-announcements/announcements_listing_f.html?company=' + this.props.stockCode)
                        .then((htmlRoot) => {
                            let announcements = []
                            let trList = htmlRoot.querySelectorAll('table.bm_dataTable tr');
                            trList.forEach((tr) => {
                                let tdList = tr.querySelectorAll('td');
                                if (tdList.length === 4) {
                                    let date = tdList[1].text.trim();
                                    let title = tdList[3].text.replace('  ', ' ').trim();
                                    let a = tdList[3].querySelector('a');
                                    let announcementUrl = BURSA_WEBSITE_LOC + a.attributes.href;
                                    announcements.push({date, title, url: announcementUrl});
                                }
                            });
                            dispatch(
                                getActionItem('STOCK_DETAIL_LOAD', {
                                    announcements: announcements,
                                })
                            );
                            resolve();
                        })
                        .catch((error) => {
                            reject();
                        });
                });
            },

            onViewAnnouncementDetail: function(announcement) {
                dispatch(getActionItem('ANNOUNCEMENT_DETAIL_INIT', announcement));

                ownProps.navigatorGoTo('announcement_detail');
            },
        }
    }
)(StockDetail);


const AnnouncementDetailContainer = connect(
    (state) => {
        let announcementDetail = state.announcementDetail;
        return {
            ...commonMapStateToProps('announcement_detail', state),

            stockName: state.stockDetail.name,

            ...announcementDetail,
        }
    },
    (dispatch, ownProps) => {
        return {
            ...commonMapDispatchToProps('announcement_detail', dispatch, ownProps),

            onLoadData: function() {
                return new Promise((resolve, reject) => {
                    fetchHtml(this.props.url)
                        .then((htmlRoot) => {
                            let iframes = htmlRoot.querySelectorAll('iframe');
                            if (iframes.length > 0) {
                                let detailUrl = iframes[0].attributes.src;
                                dispatch(getActionItem('ANNOUNCEMENT_DETAIL_LOAD', {detailUrl: detailUrl}));
                            }

                            resolve();
                        })
                        .catch((error) => {
                            reject();
                        });
                });
            }
        }
    }
)(AnnouncementDetail);


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

function fetchHtml(url) {
    return new Promise(function(resolve, reject) {
        console.log('FETCHING: ', url);
        fetch(url)
            .then((response) => {
                console.log('DONE: ', url);
                return response.text();
            })
            .then((responseText) => {
                let htmlRoot = HTMLParser.parse(responseText);
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

    store.dispatch(getActionItem('CURRENT_ROUTE', route.id));
    let commonComponentParams = {
        routeId: route.id,
    };
    switch (route.id) {
        case 'stock_detail':
            return <StockDetailContainer
                        navigatorGoTo={goTo}
                        {...commonComponentParams} />;

        case 'announcement_detail':
            return <AnnouncementDetailContainer
                        {...commonComponentParams} />;

        case 'main':
            return <StockListContainer
                        navigatorGoTo={goTo}
                        {...commonComponentParams} />;
    }
}

// Reducers
const getActionItem = (type, data) => {
    return {
        type,
        data
    }
}

const query = (state='', action) => {
    switch (action.type) {
        case 'STOCK_SEARCH':
            return action.data;
        default:
            return state;
    }
}

const stocks = (state={}, action) => {
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
            state = Object.assign({}, state, {announcements: action.data.announcements});
            return state;
        default:
            return state;
    }
}

let announcementDetailDefault = {
    date: '',
    title: '',
    url: '',
};

const announcementDetail = (state=Object.assign({}, announcementDetailDefault), action) => {
    switch (action.type) {
        case 'ANNOUNCEMENT_DETAIL_INIT':
            return Object.assign({}, action.data);
        case 'ANNOUNCEMENT_DETAIL_LOAD':
            return Object.assign({}, state, action.data);
        default:
            return state;
    }
}

const allStocks = (state={}, action) => {
    switch (action.type) {
        case 'ALL_STOCKS_LOAD':
            var newState = {
                ...state,
                ...action.data,
            };
            return newState;
        default:
            return state;
    }
}

const base = (state = {loaded: false, currentRoute: null}, action) => {
    switch (action.type) {
        case storage.LOAD:
            console.log('LOAD triggered...');

            return { ...state, loaded: true, showProgress_main: false };

        case storage.SAVE:
            console.log('SAVE triggered...');
            return state;

        case 'ENABLE_PROGRESS':
            let newState = {};
            newState['showProgress_' + action.data.name] = action.data.flag;
            return {...state, ...newState};

        case 'CURRENT_ROUTE':
            return {...state, currentRoute: action.data};

        default:
            return state;
    }
}

const myStocksApp = storage.reducer(combineReducers({
    base,
    query,
    stocks,
    stockDetail,
    announcementDetail,
    allStocks,
}));

// setup persistance for store
const engine = filter(createEngine('my-stocks-app'), [
    'allStocks',
]);
const middleware = storage.createMiddleware(engine, [], [
    'ALL_STOCKS_LOAD',
]);
const createStoreWithMiddleware = applyMiddleware(middleware)(createStore);
const store = createStoreWithMiddleware(myStocksApp);


// The main entry point
class MyStocks extends Component {
    constructor(props) {
        super(props);

        // trigger progress box,
        // since there will be some loading and such happening
        // WARNING: Not sure where is the best place to trigger this event
        store.dispatch(getActionItem('ENABLE_PROGRESS', {name: 'main', flag: true}));
    }

    componentDidMount() {
        // NOTE: Put this code here to test if the load() can be done later,
        // so that we can show progress, if load() takes time
        const load = storage.createLoader(engine);
        load(store);
    }

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
