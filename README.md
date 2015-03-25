co-wechat [![NPM version](https://badge.fury.io/js/co-wechat.png)](http://badge.fury.io/js/co-wechat) [![Build Status](https://travis-ci.org/node-webot/co-wechat.png?branch=master)](https://travis-ci.org/node-webot/co-wechat) [![Dependencies Status](https://david-dm.org/node-webot/co-wechat.png)](https://david-dm.org/node-webot/co-wechat) [![Coverage Status](https://coveralls.io/repos/node-webot/co-wechat/badge.png)](https://coveralls.io/r/node-webot/co-wechat)
======

微信公众平台消息接口服务中间件与API SDK

## 功能列表
- 自动回复（文本、图片、语音、视频、音乐、图文）
- 会话支持（创新功能）

## Installation

```sh
$ npm install co-wechat
```

## Use with koa

```js
var wechat = require('co-wechat');

app.use(wechat('some token').middleware(function *() {
  // 微信输入信息都在this.weixin上
  var message = this.weixin;
  if (message.FromUserName === 'diaosi') {
    // 回复屌丝(普通回复)
    this.body = 'hehe';
  } else if (message.FromUserName === 'text') {
    //你也可以这样回复text类型的信息
    this.body = {
      content: 'text object',
      type: 'text'
    };
  } else if (message.FromUserName === 'hehe') {
    // 回复一段音乐
    this.body = {
      type: "music",
      content: {
        title: "来段音乐吧",
        description: "一无所有",
        musicUrl: "http://mp3.com/xx.mp3",
        hqMusicUrl: "http://mp3.com/xx.mp3"
      }
    };
  } else if (message.FromUserName === 'kf') {
    // 转发到客服接口
    this.body = {
      type: "customerService",
      kfAccount: "test1@test"
    };
  } else {
    // 回复高富帅(图文回复)
    this.body = [
      {
        title: '你来我家接我吧',
        description: '这是女神与高富帅之间的对话',
        picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
        url: 'http://nodeapi.cloudfoundry.com/'
      }
    ];
  }
}));
```
备注：token在微信平台的开发者中心申请

### 回复消息
当用户发送消息到微信公众账号，自动回复一条消息。这条消息可以是文本、图片、语音、视频、音乐、图文。详见：[官方文档](http://mp.weixin.qq.com/wiki/index.php?title=发送被动响应消息)

#### 回复文本
```js
this.body = 'Hello world!';
// 或者
this.body = {type: "text", content: 'Hello world!'};
```
#### 回复图片
```js
this.body = {
  type: "image",
  content: {
    mediaId: 'mediaId'
  }
};
```
#### 回复语音
```js
this.body = {
  type: "voice",
  content: {
    mediaId: 'mediaId'
  }
};
```
#### 回复视频
```js
this.body = {
  type: "video",
  content: {
    mediaId: 'mediaId',
    thumbMediaId: 'thumbMediaId'
  }
};
```
#### 回复音乐
```js
this.body = {
  title: "来段音乐吧",
  description: "一无所有",
  musicUrl: "http://mp3.com/xx.mp3",
  hqMusicUrl: "http://mp3.com/xx.mp3"
};
```
#### 回复图文
```js
this.body = [
  {
    title: '你来我家接我吧',
    description: '这是女神与高富帅之间的对话',
    picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
    url: 'http://nodeapi.cloudfoundry.com/'
  }
];
```

#### 回复空串
```js
this.body = '';
```

#### 转发到客服接口
```js
this.body = {
  type: "customerService",
  kfAccount: "test1@test" //可选
};
```

### WXSession支持
由于公共平台应用的客户端实际上是微信，所以采用传统的Cookie来实现会话并不现实，为此中间件模块在openid的基础上添加了Session支持。一旦服务端启用了`koa-generic-session`中间件，在业务中就可以访问`this.wxsession`属性。这个属性与`this.session`行为类似。

```js
var session = require('koa-generic-session');
app.use(session());
app.use(wechat('some token').middleware(function *() {
  var info = this.weixin;
  if (info.Content === '=') {
    var exp = this.wxsession.text.join('');
    this.wxsession.text = '';
    this.body = exp;
  } else {
    this.wxsession.text = this.wxsession.text || [];
    this.wxsession.text.push(info.Content);
    this.body = '收到' + info.Content;
  }
}));
```

`this.wxsession`与`this.session`采用相同的存储引擎，这意味着如果采用redis作为存储，这样`wxsession`可以实现跨进程共享。

## Show cases
### Node.js API自动回复

![Node.js API自动回复机器人](http://nodeapi.diveintonode.org/assets/qrcode.jpg)

欢迎关注。

代码：<https://github.com/JacksonTian/api-doc-service>

你可以在[CloudFoundry](http://www.cloudfoundry.com/)、[appfog](https://www.appfog.com/)、[BAE](http://developer.baidu.com/wiki/index.php?title=docs/cplat/rt/node.js)等搭建自己的机器人。

## 详细API
原始API文档请参见：[消息接口指南](http://mp.weixin.qq.com/wiki/index.php?title=消息接口指南)。

## 交流群
QQ群：157964097，使用疑问，开发，贡献代码请加群。

## 捐赠
如果您觉得Wechat对您有帮助，欢迎请作者一杯咖啡

![捐赠wechat](https://cloud.githubusercontent.com/assets/327019/2941591/2b9e5e58-d9a7-11e3-9e80-c25aba0a48a1.png)

或者[![](http://img.shields.io/gratipay/JacksonTian.svg)](https://www.gittip.com/JacksonTian/)

## License
The MIT license.

## Contributors

```
 project  : co-wechat
 repo age : 4 months
 active   : 9 days
 commits  : 19
 files    : 11
 authors  :
    13  Jackson Tian  68.4%
     6  ifeiteng      31.6%
```
