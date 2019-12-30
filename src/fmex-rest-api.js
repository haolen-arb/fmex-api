const crypto = require('crypto')
const nodeFetch = require('node-fetch')

function fetch(url, config) {
    return nodeFetch(url, {
        timeout: 10000,
        ...config
    })
}

class fmex{
    constructor(obj){
        this.url = 'https://api.fmex.com'
        this.APIKey = obj.apiKey
        this.APISecret = obj.secret
    }

    // 参数排序
    _getQueryString (params) {
        let keys = []
        for (let i in params) {
            keys.push(i)
        }
        keys.sort();
        var p = []
        keys.forEach(item => {
            if (params[item]) {
                p.push(item + '=' + params[item])
            }
        })
        return p.join('&')
    }

    _tob64(str) {
        return new Buffer.from(str).toString('base64')
    }

    _secret(str) {
        str = this._tob64(str);
        // (str)
        str = crypto.createHmac('sha1', this.APISecret).update(str).digest().toString('base64');
        return str;
    }

    // 此 API 用于获取交易所当前所有交易对。
    async getSymbols () {
        return await fetch(`${this.url}/v2/public/contracts/symbols`, {
            method:'GET'
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    // 此 API 用于获取系统时间
    async getTime () {
        return await fetch(`${this.url}/v2/public/server-time`, {
            method:'GET'
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    /* 获取 ticker 数据
      GET https://api.fmex.com/v2/market/ticker/$symbol

      @parmas
           symbol 交易对

      @return
          "最新成交价",
          "最近一笔成交的成交量",
          "最大买一价",
          "最大买一量",
          "最小卖一价",
          "最小卖一量",
          "24小时前成交价",
          "24小时内最高价",
          "24小时内最低价",
          "24小时合约成交张数",
          "24小时合约成交BTC数量"
    */
    async getTicker (symbol='btcusd_p') {
        return await fetch(`${this.url}/v2/market/ticker/${symbol}`, {
            method:'GET'
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    /* 获取最新的成交明细
    GET https://api.fmex.com/v2/market/trades/$symbol

    @parmas
        before		查询某个 id 之前的 Trade
        limit		默认为 20 条
    */
    async getTrade (symbol='btcusd_p',before=0,limit=1000) {
        let str = ''
        if(before){
            str = `&before=${before}`
        }

        return await fetch(`${this.url}/v2/market/trades/${symbol}?limit=${limit}${str}`,{
            method:'GET',
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    /* 获取最新的深度明细
    GET https://api.fmex.com/v2/market/depth/$level/$symbol

    @parmas
        level
            L20	    20 档行情深度.
            L150	150 档行情深度.
        symbol 交易对
     */
    async getDepth (level='L20', symbol='btcusd_p') {
        return await fetch(`${this.url}/v2/market/depth/${level}/${symbol}`, {
            method:'GET'
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    // 查询当前用户账户余额
    // @return [可用余额, 订单冻结金额, 仓位保证金金额]
    async getAccount () {
        let time = new Date().getTime()
        let url = `${this.url}/v3/contracts/accounts`
        let sign = this._secret(`GET${url}${time}`)

        return await fetch(url, {
            method:'GET',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    /* 创建新的订单
    POST /v3/contracts/orders
    @parmas   Y N 是否必须
        symbol	Y	合约代码，例如"BTCUSD_P"
        type	Y	订单类型，参见OrderType
        direction	Y	订单方向，参见Direction
        source	""	订单来源标识，例如"WEB", "APP"，字母和数字组合
        price	仅限价单	限价单报价,只支持1位小数
        quantity	Y	订单数量，整数，最小为1
        trigger_on	N	止盈止损订单触发价格
        trigger_direction	N	止盈止损订单触发条件,"long","short"
        trailing_distance	N	追踪止损订单触发距离
        fill_or_kill	N	类型为string，是否设置FOK订单，全部成交或全部取消
        immediate_or_cancel	N	类型为string，是否设置IOC订单，立即成交或全部取消
        post_only	N	类型为string，是否设置post_only订单
        hidden	N	类型为string，是否设置隐藏订单
        reduce_only	N	类型为string，是否设置只减仓订单
     */
    // 报错超时有时也会成功下单
    async createOrder (parmas) {
        let time = new Date().getTime()
        let url = `${this.url}/v3/contracts/orders`
        let queryStr = this._getQueryString(parmas)
        let sign = this._secret(`POST${url}${time}${queryStr}`)
        return fetch(url, {
            method: 'POST',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify(parmas)
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    /* 取消订单
    POST /v3/contracts/orders/<order_id>/cancel
    */
    async cancelOrder (order_id) {
        let time = new Date().getTime()
        let url = `${this.url}/v3/contracts/orders/${order_id}/cancel`
        let sign = this._secret(`POST${url}${time}`)
        return fetch(url, {
            method: 'POST',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }).then(res => res.json()).then(res => {
            return res.data
        })
    }

    // 查询订单
    // GET /v3/contracts/orders/open
    async getOrders () {
        let time = new Date().getTime()
        let url = `${this.url}/v3/contracts/orders/open`
        let sign = this._secret(`GET${url}${time}`)

        return await fetch(url, {
            method:'GET',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }).then(res => res.json()).then(res => {
            return res.data.results
        })
    }

    // 获取仓位列表
    // GET /v3/broker/auth/contracts/positions
    async getPosition () {
        let time = new Date().getTime()
        let url = `${this.url}/v3/broker/auth/contracts/positions`
        let sign = this._secret(`GET${url}${time}`)

        return await fetch(url, {
            method:'GET',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }).then(res => res.json()).then(res => {
            return res.data.results
        })
    }

    // 查询订单成交历史
    // GET /v3/contracts/orders/<order_id>/matches
    async getMatches (order_id) {
        let time = new Date().getTime()
        let url = `${this.url}/v3/contracts/orders/${order_id}/matches`
        let sign = this._secret(`GET${url}${time}`)

        return await fetch(url, {
            method:'GET',
            headers: {
                'FC-ACCESS-KEY': this.APIKey,
                'FC-ACCESS-SIGNATURE': sign,
                'FC-ACCESS-TIMESTAMP': time,
                'Content-Type': 'application/json;charset=UTF-8'
            }
        }).then(res => res.json()).then(res => {
            return res.data.results
        })
    }
}

module.exports = fmex;
