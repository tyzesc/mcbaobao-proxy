var Thin = require('./lib/thin.js');
var gunzip = require('zlib').createGunzip();
var request = require('request');

var proxy = new Thin;

function dateString(obj) {
    let yyyy = obj.toLocaleDateString().slice(0, 4)
    let MM = (obj.getMonth() + 1 < 10 ? '0' : '') + (obj.getMonth() + 1);
    let dd = (obj.getDate() < 10 ? '0' : '') + obj.getDate();
    let h = (obj.getHours() < 10 ? '0' : '') + obj.getHours();
    let m = (obj.getMinutes() < 10 ? '0' : '') + obj.getMinutes();
    let s = (obj.getSeconds() < 10 ? '0' : '') + obj.getSeconds();
    return yyyy + '/' + MM + '/' + dd + ' ' + h + ':' + m + ':' + s;
}

let d = new Date();
var datetime = dateString(d);
var redeemtime = datetime;

function coupon(id) {
    let pic_id = id.toString();
    while (pic_id.length < 3)
        pic_id = "0" + pic_id;
    let date = new Date();
    date.setDate(d.getDate() + 2);
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
//var available = "11,12,14,15,16,17,18,19,20,21,23,24,25,26,32,33,34,35,36,37,38,39,42,43,44,45,46,47,48,49,50,51,52,53,56,57,58,61,65,66,69,70,71,72,77,78,81,83,89,90,93,94,95,96,97,98,99,100,106,107,108,109,110,111,112,113,114,115,116,119,120,123,124,126,127,128,129,130,131,132,133,134,136,138,139,140,141,142,143,144,201".split(',');

var coupons = [];
var available = "66,65,53,48,44,43,42,39,37,24,21,20,19,17,15".split(',');

function updateCoupons(coupons, list) {
    coupons.splice(0, 10000);
    list.map((elem, i) => {
        let obj = coupon(elem);
        obj.coupon_id = i;
        //console.log(obj.object_info.image.url);
        coupons.push(obj);
        //console.log("[*] 載入優惠券：" + i + " " + obj.object_info.title);
    });
    console.log("[*] 刷新優惠券");
}

updateCoupons(coupons, available);

let a = 0;
proxy.use(function(req, res, next) {
    if (['/coupon/get_detail', '/coupon/redeem', '/coupon/get_list'].indexOf(req.url) == -1)
        next();
    if (req.url === '/coupon/get_detail') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // convert Buffer to string
        });
        req.on('end', () => {
            let json = JSON.parse(body);
            let id = json.coupon_id;
            console.log("[*] 編號：" + id + " " + coupons[id].object_info.title + " 被開啟。");
            let ret = {
                "rc": 1,
                "rm": "成功",
                "results": {
                    "coupon": coupons[id],
                    "current_datetime": datetime
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
            console.log("[*] 編號：" + id + " " + coupons[id].object_info.title + " 被兌換。");
            coupons[id].status = 2;
            setTimeout(function(){
                coupons[id].status = 1;
            }, 1000 * 60);

            let ret = {
                "rc": 1,
                "rm": "成功",
                "results": {
                    "coupon": coupons[id],
                    "redeem_datetime": redeemtime
                },
                "current_datetime": datetime
            }

            return res.end(JSON.stringify(ret));
        });
    }
    if (req.url === '/coupon/get_list') {
        let json = {
            "rc": 1,
            "rm": "成功",
            "results": {
                "coupons": coupons,
                "current_datetime": datetime
            }
        }
        return res.end(JSON.stringify(json));
    }

});

var port = process.env.PORT || 8081;
var ip = "0.0.0.0" || process.env.LOCALHOST || "localhost";
proxy.listen(port, ip, function(err) {
    // .. error handling code ..
});

console.log("APP is on " + ip + " " + port);
console.log('[*] 麥當勞真的爆爆～～');