'use strict';

require('should');

const Koa = require('koa');
const querystring = require('querystring');
const request = require('supertest');
const template = require('./support').template;
const tail = require('./support').tail;

const wechat = require('../');

var app = new Koa();

app.use(wechat('some token').middleware(async (message) => {
  // 回复屌丝(普通回复)
  if (message.Content === 'diaosi') {
    return 'hehe';
  } else if (message.Content === 'test') {
    return {
      content: 'text object',
      type: 'text'
    };
  } else if (message.Content === 'hehe') {
    return {
      title: '来段音乐吧<',
      description: '一无所有>',
      musicUrl: 'http://mp3.com/xx.mp3?a=b&c=d',
      hqMusicUrl: 'http://mp3.com/xx.mp3?foo=bar'
    };
  } else if (message.Content === 'cs') {
    return {
      type: 'customerService'
    };
  } else if (message.Content === 'kf') {
    return {
      type: 'customerService',
      kfAccount: 'test1@test'
    };
  } else if (message.Content === 'ls') {
    return message.SendLocationInfo.EventKey;
  } else if (message.Content === 'pic_weixin') {
    return message.SendPicsInfo.EventKey;
  } else if (message.Content === 'web') {
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
        timestamp: new Date().getTime(),
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
        timestamp: new Date().getTime(),
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
        timestamp: new Date().getTime(),
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
        timestamp: new Date().getTime(),
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
        body.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[text]]></MsgType>');
        body.should.include('<Content><![CDATA[hehe]]></Content>');
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
        body.should.include('<ToUserName><![CDATA[test]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[text]]></MsgType>');
        body.should.include('<Content><![CDATA[text object]]></Content>');
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
        body.should.include('<ToUserName><![CDATA[gaofushuai]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[news]]></MsgType>');
        body.should.include('<ArticleCount>1</ArticleCount>');
        body.should.include('<Title><![CDATA[你来我家接我吧]]></Title>');
        body.should.include('<Description><![CDATA[这是女神与高富帅之间的对话]]></Description>');
        body.should.include('<PicUrl><![CDATA[http://nodeapi.cloudfoundry.com/qrcode.jpg]]></PicUrl>');
        body.should.include('<Url><![CDATA[http://nodeapi.cloudfoundry.com/]]></Url>');
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
        body.should.include('<ToUserName><![CDATA[hehe]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[music]]></MsgType>');
        body.should.include('<Music>');
        body.should.include('</Music>');
        body.should.include('<Title><![CDATA[来段音乐吧<]]></Title>');
        body.should.include('<Description><![CDATA[一无所有>]]></Description>');
        body.should.include('<MusicUrl><![CDATA[http://mp3.com/xx.mp3?a=b&c=d]]></MusicUrl>');
        body.should.include('<HQMusicUrl><![CDATA[http://mp3.com/xx.mp3?foo=bar]]></HQMusicUrl>');
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
        body.should.include('<ToUserName><![CDATA[ls]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[text]]></MsgType>');
        body.should.include('<Content><![CDATA[sendLocation]]></Content>');
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
        body.should.include('<ToUserName><![CDATA[pic_weixin]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[text]]></MsgType>');
        body.should.include('<Content><![CDATA[sendPic]]></Content>');
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
        body.should.include('<ToUserName><![CDATA[cs]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[gaofushuai]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[transfer_customer_service]]></MsgType>');
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
        body.should.include('<ToUserName><![CDATA[kf]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[zhong]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[transfer_customer_service]]></MsgType>');
        body.should.include('<KfAccount><![CDATA[test1@test]]></KfAccount>');
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
        body.should.include('<ToUserName><![CDATA[web]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[text]]></MsgType>');
        body.should.include('<Content><![CDATA[web message ok]]></Content>');
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
        body.should.include('<ToUserName><![CDATA[hehe]]></ToUserName>');
        body.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
        body.should.include('<MsgType><![CDATA[music]]></MsgType>');
        body.should.include('<Music>');
        body.should.include('</Music>');
        body.should.include('<Title><![CDATA[来段音乐吧<]]></Title>');
        body.should.include('<Description><![CDATA[一无所有>]]></Description>');
        body.should.include('<MusicUrl><![CDATA[http://mp3.com/xx.mp3?a=b&c=d]]></MusicUrl>');
        body.should.include('<HQMusicUrl><![CDATA[http://mp3.com/xx.mp3?foo=bar]]></HQMusicUrl>');
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
