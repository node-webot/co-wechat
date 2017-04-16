require('should');

var request = require('supertest');
var template = require('./support').template;
var tail = require('./support').tail;

var Koa = require('koa');
var app = new Koa();
var wechat = require('../');
var session = require('koa-generic-session');

app.use(session());
app.use(wechat('some token').middleware(async (ctx) => {
  var info = ctx.weixin;
  if (info.Content === '=') {
    ctx.wxsession.text = ctx.wxsession.text || [];
    var exp = ctx.wxsession.text.join('');
    ctx.body = 'result: ' + eval(exp);
  } else if (info.Content === 'destroy') {
    ctx.wxsession = null;
    ctx.body = '销毁会话';
  } else {
    ctx.wxsession.text = ctx.wxsession.text || [];
    ctx.wxsession.text.push(info.Content);
    ctx.body = '收到' + info.Content;
  }
}));

app = app.callback();

xdescribe('wechat.js', function () {
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
