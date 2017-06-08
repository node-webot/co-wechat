'use strict';

const getRawBody = require('raw-body');
const xml2js = require('xml2js');
const crypto = require('crypto');
const ejs = require('ejs');
const WXBizMsgCrypt = require('wechat-crypto');

function getSignature (timestamp, nonce, token) {
  var shasum = crypto.createHash('sha1');
  var arr = [token, timestamp, nonce].sort();
  shasum.update(arr.join(''));

  return shasum.digest('hex');
}

function parseXML (xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, {trim: true}, function (err, obj) {
      if (err) {
        return reject(err);
      }

      resolve(obj);
    });
  });
}

/*!
 * 将xml2js解析出来的对象转换成直接可访问的对象
 */
function formatMessage (result) {
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
        message[key] = result[key].map(function (item) {
          return formatMessage(item);
        });
      }
    }
  }
  return message;
}

/*!
 * 响应模版
 */
/* eslint-disable indent */
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
        '<PicUrl><![CDATA[<%-item.picUrl || item.picurl || item.pic || item.thumb_url %>]]></PicUrl>',
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
/* eslint-enable indent */

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

function reply2CustomerService (fromUsername, toUsername, kfAccount) {
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
}

/*!
 * 将内容回复给微信的封装方法
 */
function reply (content, fromUsername, toUsername) {
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
}

class Wechat {
  constructor(config) {
    if (typeof config === 'string') {
      this.token = config;
    } else if (typeof config === 'object' && config.token) {
      this.token = config.token;
      this.appid = config.appid || '';
      this.encodingAESKey = config.encodingAESKey || '';
    } else {
      throw new TypeError('please check your config');
    }
  }

  middleware(handle) {

    if (this.encodingAESKey) {
      this.cryptor = new WXBizMsgCrypt(this.token, this.encodingAESKey, this.appid);
    }

    return async (ctx, next) => {
      const query = ctx.query;
      // 加密模式
      const encrypted = !!(query.encrypt_type && query.encrypt_type === 'aes' && query.msg_signature);
      const timestamp = query.timestamp;
      const nonce = query.nonce;
      const echostr = query.echostr;
      const method = ctx.method;

      if (method === 'GET') {
        var valid = false;
        if (encrypted) {
          var signature = query.msg_signature;
          valid = signature === this.cryptor.getSignature(timestamp, nonce, echostr);
        } else {
          // 校验
          valid = query.signature === getSignature(timestamp, nonce, this.token);
        }

        if (!valid) {
          ctx.status = 401;
          ctx.body = 'Invalid signature';
        } else {
          if (encrypted) {
            var decrypted = this.cryptor.decrypt(echostr);
            // TODO 检查appId的正确性
            ctx.body = decrypted.message;
          } else {
            ctx.body = echostr;
          }
        }
      } else if (method === 'POST') {
        if (!encrypted) {
          // 校验
          if (query.signature !== getSignature(timestamp, nonce, this.token)) {
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

        // 保存原始xml
        ctx.weixin_xml = xml;
        // 解析xml
        var result = await parseXML(xml);
        var formatted = formatMessage(result.xml);
        if (encrypted) {
          var encryptMessage = formatted.Encrypt;
          if (query.msg_signature !== this.cryptor.getSignature(timestamp, nonce, encryptMessage)) {
            ctx.status = 401;
            ctx.body = 'Invalid signature';
            return;
          }
          var decryptedXML = this.cryptor.decrypt(encryptMessage);
          var messageWrapXml = decryptedXML.message;
          if (messageWrapXml === '') {
            ctx.status = 401;
            ctx.body = 'Invalid signature';
            return;
          }
          var decodedXML = await parseXML(messageWrapXml);
          formatted = formatMessage(decodedXML.xml);
        }

        // 业务逻辑处理
        const body = await handle(formatted);

        /*
         * 假如服务器无法保证在五秒内处理并回复，可以直接回复空串。
         * 微信服务器不会对此作任何处理，并且不会发起重试。
         */
        if (body === '') {
          ctx.body = '';
          return;
        }
		/**
		 * 全网发布时component_verify_ticket需要回复success
		 */
		if (body === 'success') {
          ctx.body = 'success';
          return;
        }

        var replyMessageXml = reply(body, formatted.ToUserName, formatted.FromUserName);

        if (!query.encrypt_type || query.encrypt_type === 'raw') {
          ctx.body = replyMessageXml;
        } else {
          var wrap = {};
          wrap.encrypt = this.cryptor.encrypt(replyMessageXml);
          wrap.nonce = parseInt((Math.random() * 100000000000), 10);
          wrap.timestamp = new Date().getTime();
          wrap.signature = this.cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt);
          ctx.body = encryptWrap(wrap);
        }

        ctx.type = 'application/xml';

      } else {
        ctx.status = 501;
        ctx.body = 'Not Implemented';
      }
    };
  }
}

module.exports = function (config) {
  return new Wechat(config);
};
