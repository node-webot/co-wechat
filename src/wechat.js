var getRawBody = require('raw-body');
import xml2js from 'xml2js';
var crypto = require('crypto');
var ejs = require('ejs');
var WXBizMsgCrypt = require('wechat-crypto');

var wechat = function (config) {
  if (!(this instanceof wechat)) {
    return new wechat(config);
  }
  this.setToken(config);
};

wechat.prototype.setToken = function (config) {
  if (typeof config === 'string') {
    this.token = config;
  } else if (typeof config === 'object' && config.token) {
    this.token = config.token;
    this.appid = config.appid || '';
    this.encodingAESKey = config.encodingAESKey || '';
  } else {
    throw new Error('please check your config');
  }
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

var parseXML2 = function (xml) {
  return new Promise(function (resolve, reject) {
    xml2js.parseString(xml, {trim: true}, function (err, res) {
      if (err) return reject(err);
      if (arguments.length > 2) res = slice.call(arguments, 1);
      resolve(res);
    });
  });
}

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

/*!
 * 响应模版
 */
var tpl = ['<xml>',
    '<ToUserName><![CDATA[<%-toUsername%>]]></ToUserName>',
    '<FromUserName><![CDATA[<%-fromUsername%>]]></FromUserName>',
    '<CreateTime><%=createTime%></CreateTime>',
    '<MsgType><![CDATA[<%=msgType%>]]></MsgType>',
  '<% if (msgType === "news") { %>',
    '<ArticleCount><%=content.length%></ArticleCount>',
    '<Articles>',
    '<% content.forEach(function(item){ %>',
      '<item>',
        '<Title><![CDATA[<%-item.title%>]]></Title>',
        '<Description><![CDATA[<%-item.description%>]]></Description>',
        '<PicUrl><![CDATA[<%-item.picUrl || item.picurl || item.pic %>]]></PicUrl>',
        '<Url><![CDATA[<%-item.url%>]]></Url>',
      '</item>',
    '<% }); %>',
    '</Articles>',
  '<% } else if (msgType === "music") { %>',
    '<Music>',
      '<Title><![CDATA[<%-content.title%>]]></Title>',
      '<Description><![CDATA[<%-content.description%>]]></Description>',
      '<MusicUrl><![CDATA[<%-content.musicUrl || content.url %>]]></MusicUrl>',
      '<HQMusicUrl><![CDATA[<%-content.hqMusicUrl || content.hqUrl %>]]></HQMusicUrl>',
    '</Music>',
  '<% } else if (msgType === "voice") { %>',
    '<Voice>',
      '<MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>',
    '</Voice>',
  '<% } else if (msgType === "image") { %>',
    '<Image>',
      '<MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>',
    '</Image>',
  '<% } else if (msgType === "video") { %>',
    '<Video>',
      '<MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>',
      '<Title><![CDATA[<%-content.title%>]]></Title>',
      '<Description><![CDATA[<%-content.description%>]]></Description>',
    '</Video>',
  '<% } else if (msgType === "transfer_customer_service") { %>',
    '<% if (content && content.kfAccount) { %>',
      '<TransInfo>',
        '<KfAccount><![CDATA[<%-content.kfAccount%>]]></KfAccount>',
      '</TransInfo>',
    '<% } %>',
  '<% } else { %>',
    '<Content><![CDATA[<%-content%>]]></Content>',
  '<% } %>',
  '</xml>'].join('');

/*!
 * 编译过后的模版
 */
var compiled = ejs.compile(tpl);

var wrapTpl = '<xml>' +
  '<Encrypt><![CDATA[<%-encrypt%>]]></Encrypt>' +
  '<MsgSignature><![CDATA[<%-signature%>]]></MsgSignature>' +
  '<TimeStamp><%-timestamp%></TimeStamp>' +
  '<Nonce><![CDATA[<%-nonce%>]]></Nonce>' +
'</xml>';

var encryptWrap = ejs.compile(wrapTpl);

/*!
 * 将内容回复给微信的封装方法
 */
var reply = function (content, fromUsername, toUsername) {
  var info = {};
  var type = 'text';
  info.content = content || '';
  if (Array.isArray(content)) {
    type = 'news';
  } else if (typeof content === 'object') {
    if (content.hasOwnProperty('type')) {
      if (content.type === 'customerService') {
        return reply2CustomerService(fromUsername, toUsername, content.kfAccount);
      }
      type = content.type;
      info.content = content.content;
    } else {
      type = 'music';
    }
  }
  info.msgType = type;
  info.createTime = new Date().getTime();
  info.toUsername = toUsername;
  info.fromUsername = fromUsername;
  return compiled(info);
};

var reply2CustomerService = function (fromUsername, toUsername, kfAccount) {
  var info = {};
  info.msgType = 'transfer_customer_service';
  info.createTime = new Date().getTime();
  info.toUsername = toUsername;
  info.fromUsername = fromUsername;
  info.content = {};
  if (typeof kfAccount === 'string') {
    info.content.kfAccount = kfAccount;
  }
  return compiled(info);
};

wechat.prototype.middleware = function (handle) {
  var that = this;
  if (this.encodingAESKey) {
    that.cryptor = new WXBizMsgCrypt(this.token, this.encodingAESKey, this.appid);
  }
  return function* (next) {
    var query = this.query;
    // 加密模式
    var encrypted = !!(query.encrypt_type && query.encrypt_type === 'aes' && query.msg_signature);
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
        var encryptMessage = formated.Encrypt;
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

      // 挂载处理后的微信消息
      this.weixin = formated;

      // 取session数据
      if (this.sessionStore) {
        this.wxSessionId = formated.FromUserName;
        this.wxsession = yield this.sessionStore.get(this.wxSessionId);
        if (!this.wxsession) {
          this.wxsession = {};
          this.wxsession.cookie = this.session.cookie;
        }
      }

      // 业务逻辑处理
      yield* handle.call(this);

      // 更新session
      if (this.sessionStore) {
        if (!this.wxsession) {
          if (this.wxSessionId) {
            yield this.sessionStore.destroy(this.wxSessionId);
          }
        } else {
          yield this.sessionStore.set(this.wxSessionId, this.wxsession);
        }
      }

      /*
       * 假如服务器无法保证在五秒内处理并回复，可以直接回复空串。
       * 微信服务器不会对此作任何处理，并且不会发起重试。
       */
      if (this.body === '') {
        return;
      }

      var replyMessageXml = reply(this.body, formated.ToUserName, formated.FromUserName);

      if (!query.encrypt_type || query.encrypt_type === 'raw') {
        this.body = replyMessageXml;
      } else {
        var wrap = {};
        wrap.encrypt = that.cryptor.encrypt(replyMessageXml);
        wrap.nonce = parseInt((Math.random() * 100000000000), 10);
        wrap.timestamp = new Date().getTime();
        wrap.signature = that.cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt);
        this.body = encryptWrap(wrap);
      }

      this.type = 'application/xml';

    } else {
      this.status = 501;
      this.body = 'Not Implemented';
    }
  };
};

wechat.prototype.middleware2 = function (handle) {
  var that = this;
  if (this.encodingAESKey) {
    that.cryptor = new WXBizMsgCrypt(this.token, this.encodingAESKey, this.appid);
  }
  return async function (ctx, next) {
    var query = ctx.query;
    // 加密模式
    var encrypted = !!(query.encrypt_type && query.encrypt_type === 'aes' && query.msg_signature);
    var timestamp = query.timestamp;
    var nonce = query.nonce;
    var echostr = query.echostr;
    var method = ctx.method;

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
        ctx.status = 401;
        ctx.body = 'Invalid signature';
      } else {
        if (encrypted) {
          var decrypted = that.cryptor.decrypt(echostr);
          // TODO 检查appId的正确性
          ctx.body = decrypted.message;
        } else {
          ctx.body = echostr;
        }
      }
    } else if (method === 'POST') {
      if (!encrypted) {
        // 校验
        if (query.signature !== getSignature(timestamp, nonce, that.token)) {
          ctx.status = 401;
          ctx.body = 'Invalid signature';
          return;
        }
      }
      // 取原始数据
      var xml = await getRawBody(ctx.req, {
        length: ctx.length,
        limit: '1mb',
        encoding: ctx.charset
      });

      ctx.weixin_xml = xml;
      // 解析xml
      var result = await parseXML2(xml);
      var formated = formatMessage(result.xml);
      if (encrypted) {
        var encryptMessage = formated.Encrypt;
        if (query.msg_signature !== that.cryptor.getSignature(timestamp, nonce, encryptMessage)) {
          ctx.status = 401;
          ctx.body = 'Invalid signature';
          return;
        }
        var decryptedXML = that.cryptor.decrypt(encryptMessage);
        var messageWrapXml = decryptedXML.message;
        if (messageWrapXml === '') {
          ctx.status = 401;
          ctx.body = 'Invalid signature';
          return;
        }
        //var decodedXML = yield parseXML(messageWrapXml);
        var decodedXML = await parseXML2(messageWrapXml);
        formated = formatMessage(decodedXML.xml);
      }

      // 挂载处理后的微信消息
      ctx.weixin = formated;
        await handle(ctx, next);
/*
      // 取session数据
      if (ctx.sessionStore) {
        ctx.wxSessionId = formated.FromUserName;
        ctx.wxsession = yield ctx.sessionStore.get(ctx.wxSessionId);
        if (!ctx.wxsession) {
          ctx.wxsession = {};
          ctx.wxsession.cookie = ctx.session.cookie;
        }
      }

      // 业务逻辑处理
      yield* handle.call(ctx);

      // 更新session
      if (ctx.sessionStore) {
        if (!ctx.wxsession) {
          if (ctx.wxSessionId) {
            yield ctx.sessionStore.destroy(ctx.wxSessionId);
          }
        } else {
          yield ctx.sessionStore.set(ctx.wxSessionId, ctx.wxsession);
        }
      }
*/
      /*
       * 假如服务器无法保证在五秒内处理并回复，可以直接回复空串。
       * 微信服务器不会对此作任何处理，并且不会发起重试。
       */
      if (ctx.body === '') {
        return;
      }

      var replyMessageXml = reply(ctx.body, formated.ToUserName, formated.FromUserName);

      if (!query.encrypt_type || query.encrypt_type === 'raw') {
        ctx.body = replyMessageXml;
      } else {
        var wrap = {};
        wrap.encrypt = that.cryptor.encrypt(replyMessageXml);
        wrap.nonce = parseInt((Math.random() * 100000000000), 10);
        wrap.timestamp = new Date().getTime();
        wrap.signature = that.cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt);
        ctx.body = encryptWrap(wrap);
      }

      ctx.type = 'application/xml';

    } else {
      ctx.status = 501;
      ctx.body = 'Not Implemented';
    }
  };
};

module.exports = wechat;
