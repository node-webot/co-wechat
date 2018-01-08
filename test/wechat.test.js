'use strict';

const querystring = require('querystring');

const Koa = require('koa');
const expect = require('expect.js');
const request = require('supertest');

const { template, tail } = require('./support');

const wechat = require('../');

var app = new Koa();

app.use(wechat('some token').middleware(async (message) => {
  // 回复屌丝(普通回复)
  if (message.FromUserName === 'diaosi') {
    return 'hehe';
  } else if (message.FromUserName === 'test') {
    return {
      content: 'text object',
      type: 'text'
    };
  } else if (message.FromUserName === 'hehe') {
    return {
      title: '来段音乐吧<',
      description: '一无所有>',
      musicUrl: 'http://mp3.com/xx.mp3?a=b&c=d',
      hqMusicUrl: 'http://mp3.com/xx.mp3?foo=bar'
    };
  } else if (message.FromUserName === 'cs') {
    return {
      type: 'customerService'
    };
  } else if (message.FromUserName === 'kf') {
    return {
      type: 'customerService',
      kfAccount: 'test1@test'
    };
  } else if (message.FromUserName === 'ls') {
    return message.SendLocationInfo.EventKey;
  } else if (message.FromUserName === 'pic_weixin') {
    return message.SendPicsInfo.EventKey;
  } else if (message.FromUserName === 'web') {
    return 'web message ok';
  }
    // 回复高富帅(图文回复)
  return [
    {
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
      url: 'http://nodeapi.cloudfoundry.com/'
    }
  ];
}));

app = app.callback();

describe('wechat.js', function () {

  describe('valid GET', function () {
    it('should 401', function (done) {
      request(app)
      .get('/wechat')
      .expect(401)
      .expect('Invalid signature', done);
    });

    it('should 200', function (done) {
      var q = {
        timestamp: Date.now(),
        nonce: parseInt((Math.random() * 10e10), 10)
      };
      var s = ['some token', q.timestamp, q.nonce].sort().join('');
      q.signature = require('crypto').createHash('sha1').update(s).digest('hex');
      q.echostr = 'hehe';
      request(app)
      .get('/wechat?' + querystring.stringify(q))
      .expect(200)
      .expect('hehe', done);
    });

    it('should 401 invalid signature', function (done) {
      var q = {
        timestamp: Date.now(),
        nonce: parseInt((Math.random() * 10e10), 10)
      };
      q.signature = 'invalid_signature';
      q.echostr = 'hehe';
      request(app)
      .get('/wechat?' + querystring.stringify(q))
      .expect(401)
      .expect('Invalid signature', done);
    });
  });

  describe('valid POST', function () {
    it('should 401', function (done) {
      request(app)
      .post('/wechat')
      .expect(401)
      .expect('Invalid signature', done);
    });

    it('should 401 invalid signature', function (done) {
      var q = {
        timestamp: Date.now(),
        nonce: parseInt((Math.random() * 10e10), 10)
      };
      q.signature = 'invalid_signature';
      q.echostr = 'hehe';
      request(app)
      .post('/wechat?' + querystring.stringify(q))
      .expect(401)
      .expect('Invalid signature', done);
    });
  });

  describe('valid other method', function () {
    it('should 200', function (done) {
      var q = {
        timestamp: Date.now(),
        nonce: parseInt((Math.random() * 10e10), 10)
      };
      var s = ['some token', q.timestamp, q.nonce].sort().join('');
      q.signature = require('crypto').createHash('sha1').update(s).digest('hex');
      q.echostr = 'hehe';
      request(app)
      .head('/wechat?' + querystring.stringify(q))
      .expect(501, done);
    });
  });

  describe('respond', function () {
    it('should ok', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();

        expect(body).to.contain('<ToUserName><![CDATA[diaosi]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
        expect(body).to.contain('<Content><![CDATA[hehe]]></Content>');
        done();
      });
    });

    it('should ok with text type object', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'test',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[test]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
        expect(body).to.contain('<Content><![CDATA[text object]]></Content>');
        done();
      });
    });

    it('should ok with news', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'gaofushuai',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[gaofushuai]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[news]]></MsgType>');
        expect(body).to.contain('<ArticleCount>1</ArticleCount>');
        expect(body).to.contain('<Title><![CDATA[你来我家接我吧]]></Title>');
        expect(body).to.contain('<Description><![CDATA[这是女神与高富帅之间的对话]]></Description>');
        expect(body).to.contain('<PicUrl><![CDATA[http://nodeapi.cloudfoundry.com/qrcode.jpg]]></PicUrl>');
        expect(body).to.contain('<Url><![CDATA[http://nodeapi.cloudfoundry.com/]]></Url>');
        done();
      });
    });

    it('should ok with music', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'hehe',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[hehe]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[music]]></MsgType>');
        expect(body).to.contain('<Music>');
        expect(body).to.contain('</Music>');
        expect(body).to.contain('<Title><![CDATA[来段音乐吧<]]></Title>');
        expect(body).to.contain('<Description><![CDATA[一无所有>]]></Description>');
        expect(body).to.contain('<MusicUrl><![CDATA[http://mp3.com/xx.mp3?a=b&c=d]]></MusicUrl>');
        expect(body).to.contain('<HQMusicUrl><![CDATA[http://mp3.com/xx.mp3?foo=bar]]></HQMusicUrl>');
        done();
      });
    });

    it('should ok with event location_select', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'ls',
        type: 'event',
        xPos: '80',
        yPos: '70',
        label: 'alibaba',
        event: 'location_select',
        eventKey: 'sendLocation',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[ls]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
        expect(body).to.contain('<Content><![CDATA[sendLocation]]></Content>');
        done();
      });
    });

    it('should ok with event pic_weixin', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'pic_weixin',
        type: 'event',
        event: 'pic_weixin',
        eventKey: 'sendPic',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[pic_weixin]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
        expect(body).to.contain('<Content><![CDATA[sendPic]]></Content>');
        done();
      });
    });

    it('should ok with customer service', function (done) {
      var info = {
        sp: 'gaofushuai',
        user: 'cs',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[cs]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[gaofushuai]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[transfer_customer_service]]></MsgType>');
        done();
      });
    });


    it('should ok with transfer info to kfAccount', function(done) {
      var info = {
        sp: 'zhong',
        user: 'kf',
        type: 'text',
        text: '测试中'
      };
      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res) {
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[kf]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[zhong]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[transfer_customer_service]]></MsgType>');
        expect(body).to.contain('<KfAccount><![CDATA[test1@test]]></KfAccount>');
        done();
      });
    });

    it('should ok with web wechat message', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'web',
        type: 'text',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[web]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[text]]></MsgType>');
        expect(body).to.contain('<Content><![CDATA[web message ok]]></Content>');
        done();
      });
    });

    it('should pass to next', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'hehe',
        type: 'next',
        text: '测试中'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) {return done(err);}
        var body = res.text.toString();
        expect(body).to.contain('<ToUserName><![CDATA[hehe]]></ToUserName>');
        expect(body).to.contain('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/);
        expect(body).to.contain('<MsgType><![CDATA[music]]></MsgType>');
        expect(body).to.contain('<Music>');
        expect(body).to.contain('</Music>');
        expect(body).to.contain('<Title><![CDATA[来段音乐吧<]]></Title>');
        expect(body).to.contain('<Description><![CDATA[一无所有>]]></Description>');
        expect(body).to.contain('<MusicUrl><![CDATA[http://mp3.com/xx.mp3?a=b&c=d]]></MusicUrl>');
        expect(body).to.contain('<HQMusicUrl><![CDATA[http://mp3.com/xx.mp3?foo=bar]]></HQMusicUrl>');
        done();
      });
    });
  });

  describe('exception', function () {
    var xml = '<xml><ToUserName><![CDATA[gh_d3e07d51b513]]></ToUserName>\
      <FromUserName><![CDATA[diaosi]]></FromUserName>\
      <CreateTime>1362161914</CreateTime>\
      <MsgType><![CDATA[location]]></MsgType>\
      <Location_X>30.283878</Location_X>\
      <Location_Y>120.063370</Location_Y>\
      <Scale>15</Scale>\
      <Label><![CDATA[]]></Label>\
      <MsgId>5850440872586764820</MsgId>\
      </xml>';
    it('should ok', function (done) {
      request(app)
      .post('/wechat' + tail())
      .send(xml)
      .expect(200)
      .end(function(err, res){
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
});
