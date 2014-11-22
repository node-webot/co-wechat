require('should');

var request = require('supertest');
var template = require('./support').template;
var tail = require('./support').tail;

var app = require('koa')();
var wechat = require('../');
var session = require('koa-generic-session');

app.use(session());
app.use(wechat('some token').middleware(function *(){
  var info = this.weixin;
  if (info.Content === '=') {
    this.wxsession.text = this.wxsession.text || [];
    var exp = this.wxsession.text.join('');
    this.body = 'result: ' + eval(exp);
  } else if (info.Content === 'destroy') {
    this.wxsession = null;
    this.body = '销毁会话';
  } else {
    this.wxsession.text = this.wxsession.text || [];
    this.wxsession.text.push(info.Content);
    this.body = '收到' + info.Content;
  }
}));

app = app.callback();
describe('wechat.js', function () {
  describe('session', function () {
    it('should ok', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '1'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        var body = res.text.toString();
        body.should.include('<Content><![CDATA[收到1]]></Content>');
        done();
      });
    });

    it('should ok', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '+'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        var body = res.text.toString();
        body.should.include('<Content><![CDATA[收到+]]></Content>');
        done();
      });
    });

    it('should ok', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '1'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        var body = res.text.toString();
        body.should.include('<Content><![CDATA[收到1]]></Content>');
        done();
      });
    });

    it('should ok', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '='
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        var body = res.text.toString();
        body.should.include('<Content><![CDATA[result: 2]]></Content>');
        done();
      });
    });

    it('should destroy session', function (done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: 'destroy'
      };

      request(app)
      .post('/wechat' + tail())
      .send(template(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err);
        var body = res.text.toString();
        body.should.include('<Content><![CDATA[销毁会话]]></Content>');
        var info = {
          sp: 'nvshen',
          user: 'diaosi',
          type: 'text',
          text: '='
        };

        request(app)
        .post('/wechat' + tail())
        .send(template(info))
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          var body = res.text.toString();
          body.should.include('<Content><![CDATA[result: undefined]]></Content>');
          done();
        });
      });
    });
  });
});
