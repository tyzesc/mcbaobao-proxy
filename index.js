var Thin = require('./lib/thin.js');
var fs = require('fs');

Date = (()=>{
    var origin = Date;
    return function(){
        var d = new origin();
        var offset = d.getTimezoneOffset() + 480;
        d.setMinutes(d.getMinutes() + offset);
        return d;
    }
})();

function dateString(obj) {
    let yyyy = obj.toLocaleDateString().slice(0, 4)
    let MM = (obj.getMonth() + 1 < 10 ? '0' : '') + (obj.getMonth() + 1);
    let dd = (obj.getDate() < 10 ? '0' : '') + obj.getDate();
    let h = (obj.getHours() < 10 ? '0' : '') + obj.getHours();
    let m = (obj.getMinutes() < 10 ? '0' : '') + obj.getMinutes();
    let s = (obj.getSeconds() < 10 ? '0' : '') + obj.getSeconds();
    return yyyy + '/' + MM + '/' + dd + ' ' + h + ':' + m + ':' + s;
}

function coupon(id, offset) {
    let pic_id = id.toString();
    while (pic_id.length < 3)
        pic_id = "0" + pic_id;

    let date = new Date();
    date.setDate( date.getDate() + parseInt(offset) + 2);
    date.setHours(23);
    date.setMinutes(59);
    date.setSeconds(59);
    let e = dateString(date);

    let c = {
        "coupon_id": 0,
        "type": "coupon",
        "status": 1,
        "object_info": {
            "object_id": 130,
            "image": {
                "url": "http://mcdapp1.azureedge.net/P_G" + pic_id + ".jpg",
                "width": 1080,
                "height": 1920
            },
            "title": "優惠券",
            "redeem_end_datetime": e
        }
    }

    return c;
}

var Server = function(port, str) {
    var self = this;
    self.thin = new Thin;
    self.proxy = new Thin();
    self.str = str;
    self.port = port;
    self.timeout = null;
    self.coupons = [];

    self.d = new Date();
    self.datetime = dateString(self.d);

    self.updateCoupons = function() {
        list = self.str.split(',');
        self.coupons.splice(0, 10000);
        list.map((elem, i) => {
            let offset = elem.split('#')[1] || 0;
            let obj = coupon(elem.split('#')[0], offset);
            obj.coupon_id = i;
            self.coupons.push(obj);
        });
        self.d = new Date();
        self.datetime = dateString(self.d);
        console.log("[*] 刷新 " + self.port + " 優惠券");
    }

    self.refreshAfterFiveMinute = function(){
        //console.log("兌換優惠券 將在30秒後更新");
        if(self.timeout){
            console.log("delete origin timeout");
            clearTimeout( self.timeout );
        }

        self.timeout = setTimeout( ()=>{
            self.updateCoupons();
            self.timeout = null;
        }, 1000 * 60 * 5);
    }

    self.updateCoupons();

    setInterval(()=>{
        if(!self.timeout)
            self.updateCoupons();
        else
            console.log("有timeout");
    }, 1000 * 60 * 10);
    
    self.proxy.use((req, res, next) => {
        if (['/coupon/get_detail', '/coupon/redeem', '/coupon/get_list'].indexOf(req.url) == -1)
            next();

        self.d = new Date();
        self.datetime = dateString(self.d);

        if (req.url === '/coupon/get_detail') {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString(); // convert Buffer to string
            });

            req.on('end', () => {
                let json = JSON.parse(body);
                let id = json.coupon_id;
                // console.log("[*] 編號：" + id + " " + self.coupons[id].object_info.title + " 被開啟。");
                let ret = {
                    "rc": 1,
                    "rm": "成功",
                    "results": {
                        "coupon": self.coupons[id],
                        "current_datetime": self.datetime
                    }
                }
                return res.end(JSON.stringify(ret));
            });
        }
        if (req.url === '/coupon/redeem') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                let json = JSON.parse(body);
                let id = json.coupon_id;
                // console.log("[*] 編號：" + id + " " + self.coupons[id].object_info.title + " 被兌換。");
                self.coupons[id].status = 2;

                self.refreshAfterFiveMinute();

                let ret = JSON.stringify({
                    "rc": 1,
                    "rm": "成功",
                    "results": {
                        "coupon": self.coupons[id],
                        "redeem_datetime": self.datetime
                    },
                    "current_datetime": self.datetime
                });

                self.coupons[id].redeem_datetime = self.datetime;
                return res.end(ret);
            });
        }
        if (req.url === '/coupon/get_list') {
            let json = {
                "rc": 1,
                "rm": "成功",
                "results": {
                    "coupons": self.coupons,
                    "current_datetime": self.datetime
                }
            }
            return res.end(JSON.stringify(json));
        }
    });

    self.proxy.listen(port, '0.0.0.0', function(err) {});
    console.log("[*] Server is on " + '0.0.0.0' + ":" + port);
    return self;
}

var rout = {};

fs.readFile('config.json', 'utf8', (err, data) => {
    if (err) {
        console.log("config.json open failed.");
        process.exit(1);
    }
    let json = JSON.parse(data);
    let routers = json.routers;
    for (let port in routers) {
        let str = routers[port];
        rout[port] = new Server(port, str);
    }
});