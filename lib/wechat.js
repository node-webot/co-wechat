var getRawBody = require('raw-body');
var xml2js = require('xml2js');
var crypto = require('crypto');
var API = require('wechat').API;

exports.create = function (appid, appsecret, getToken, saveToken) {
  var api = new API(appid, appsecret, getToken, saveToken);
  return api;
};

var wechat = function (config) {
  if (!(this instanceof wechat)) {
    return new wechat(config);
  }
  this.setToken(config);
};

var getSignature = function (timestamp, nonce, token) {
  var shasum = crypto.createHash('sha1');
  var arr = [token, timestamp, nonce].sort();
  shasum.update(arr.join(''));

  return shasum.digest('hex');
};

var parseXML = function (xml) {
  return function (done) {
    xml2js.parseString(xml, {trim: true}, done);
  };
};

/*!
 * 将xml2js解析出来的对象转换成直接可访问的对象
 */
var formatMessage = function (result) {
  var message = {};
  if (typeof result === 'object') {
    for (var key in result) {
      if (!(result[key] instanceof Array) || result[key].length === 0) {
        continue;
      }
      if (result[key].length === 1) {
        var val = result[key][0];
        if (typeof val === 'object') {
          message[key] = formatMessage(val);
        } else {
          message[key] = (val || '').trim();
        }
      } else {
        message[key] = [];
        result[key].forEach(function (item) {
          message[key].push(formatMessage(item));
        });
      }
    }
  }
  return message;
};

wechat.prototype.middleware = function (handle) {
  var that = this;
  that.setHandle(handle);

  return function* (next) {
    var query = this.query;
    // 加密模式
    var encrypted = !!(query.encrypt_type && query.msg_signature);
    var timestamp = query.timestamp;
    var nonce = query.nonce;
    var echostr = query.echostr;
    var method = this.method;

    if (method === 'GET') {
      var valid = false;
      if (encrypted) {
        var signature = query.msg_signature;
        valid = signature === that.cryptor.getSignature(timestamp, nonce, echostr);
      } else {
        // 校验
        valid = query.signature === getSignature(timestamp, nonce, that.token);
      }
      if (!valid) {
        this.status = 401;
        this.body = 'Invalid signature';
      } else {
        if (encrypted) {
          var decrypted = that.cryptor.decrypt(echostr);
          // TODO 检查appId的正确性
          this.body = decrypted.message;
        } else {
          this.body = echostr;
        }
      }
    } else if (method === 'POST') {
      if (!encrypted) {
        // 校验
        if (query.signature !== getSignature(timestamp, nonce, that.token)) {
          this.status = 401;
          this.body = 'Invalid signature';
          return;
        }
      }
      // 取原始数据
      var xml = yield getRawBody(this.req, {
        length: this.length,
        limit: '1mb',
        encoding: this.charset
      });

      this.weixin_xml = xml;
      // 解析xml
      var result = yield parseXML(xml);
      var formated = formatMessage(result.xml);
      if (encrypted) {
        var encryptMessage = xml.Encrypt;
        if (query.msg_signature !== that.cryptor.getSignature(timestamp, nonce, encryptMessage)) {
          this.status = 401;
          this.body = 'Invalid signature';
          return;
        }
        var decryptedXML = that.cryptor.decrypt(encryptMessage);
        var messageWrapXml = decryptedXML.message;
        if (messageWrapXml === '') {
          this.status = 401;
          this.body = 'Invalid signature';
          return;
        }
        var decodedXML = yield parseXML(messageWrapXml);
        formated = formatMessage(decodedXML.xml);
      }
      yield* that.handle(this, formated);
    } else {
      this.status = 501;
      this.body = 'Not Implemented';
    }
  };
};
