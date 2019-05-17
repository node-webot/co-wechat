co-wechat [![NPM version](https://badge.fury.io/js/co-wechat.png)](http://badge.fury.io/js/co-wechat) [![Build Status](https://travis-ci.org/node-webot/co-wechat.png?branch=master)](https://travis-ci.org/node-webot/co-wechat) [![Dependencies Status](https://david-dm.org/node-webot/co-wechat.png)](https://david-dm.org/node-webot/co-wechat) [![Coverage Status](https://coveralls.io/repos/node-webot/co-wechat/badge.png)](https://coveralls.io/r/node-webot/co-wechat)
======

微信公众平台消息接口服务中间件

## 升级注意事项

### 支持 Koa2

如果仍然使用 Koa1，请使用co-wechat@1.x。

### middleware 方法变更

middleware() 方法接受一个 async function 作为参数。

```js
app.use(wechat(config).middleware(async (message, ctx) => {
  // TODO
}));
```

### 上下文与返回值变更

现在的上下文不再是原始的 请求上下文，而仅仅是 message 对象。

业务的返回值现在直接返回即可，无需关注上下文。比如：

```js
async (message, ctx) => {
  return 'Hello world!';
}
```

### 取消 session 的支持

不再支持 session 的功能。如需使用 session 功能，建议使用 redis 自行处理逻辑，取 message.FromUserName 作为 key，取一个合适的 ttl 时间即可。

## 功能列表

- 自动回复（文本、图片、语音、视频、音乐、图文）

## Installation

```sh
$ npm install co-wechat
```

## Use with koa2

```js
const wechat = require('co-wechat');

const config = {
  token: 'THE TOKEN',
  appid: 'THE APPID',
  encodingAESKey: 'THE ENCODING AES KEY'
};

app.use(wechat(config).middleware(async (message, ctx) => {
  // 微信输入信息就是这个 message
  if (message.FromUserName === 'diaosi') {
    // 回复屌丝(普通回复)
    return 'hehe';
  } else if (message.FromUserName === 'text') {
    //你也可以这样回复text类型的信息
    return {
      content: 'text object',
      type: 'text'
    };
  } else if (message.FromUserName === 'hehe') {
    // 回复一段音乐
    return {
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
    return {
      type: "customerService",
      kfAccount: "test1@test"
    };
  } else {
    // 回复高富帅(图文回复)
    return [
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

> 备注：token 在微信平台的开发者中心申请

## 开启调试模式（用于[微信公众平台接口调试工具](https://mp.weixin.qq.com/debug/cgi-bin/apiinfo)调试)
```js
//构造函数的第二个函数isDebug参数，为true或别的正值时表示开启，推荐用配置或是环境变量的方式传参
wechat(config, true)
```

配置成debug模式后，用微信公众平台接口调试工具发送POST请求(比如消息接口调试-文本消息)时返回结果不会提示Invalid signature

### 回复消息

当用户发送消息到微信公众账号，自动回复一条消息。这条消息可以是文本、图片、语音、视频、音乐、图文。详见：[官方文档](http://mp.weixin.qq.com/wiki/index.php?title=发送被动响应消息)

#### 回复文本
```js
async (message, ctx) => {
  return 'Hello world!';
}
// 或者
async (message, ctx) => {
  return {type: "text", content: 'Hello world!'};
}
```
#### 回复图片

```js
async (message, ctx) => {
  return {
    type: "image",
    content: {
      mediaId: 'mediaId'
    }
  };
}
```
#### 回复语音

```js
async (message, ctx) => {
  return {
    type: "voice",
    content: {
      mediaId: 'mediaId'
    }
  };
}
```
#### 回复视频
```js
async (message, ctx) => {
  return {
    type: "video",
    content: {
      mediaId: 'mediaId',
      thumbMediaId: 'thumbMediaId'
    }
  };
}
```
#### 回复音乐
```js
async (message, ctx) => {
  return {
    title: "来段音乐吧",
    description: "一无所有",
    musicUrl: "http://mp3.com/xx.mp3",
    hqMusicUrl: "http://mp3.com/xx.mp3"
  };
}
```
#### 回复图文
```js
async (message, ctx) => {
  return [
    {
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
      url: 'http://nodeapi.cloudfoundry.com/'
    }
  ];
}
```

#### 回复空串
```js
async (message, ctx) => {
  return '';
}
```

#### 转发到客服接口
```js
async (message, ctx) => {
  return {
    type: "customerService",
    kfAccount: "test1@test" //可选
  };
}
```

## 集成到 Egg.js

路由设置
```js
// app/router.js
'use strict';

module.exports = app => {
  // 将 get/post 请求都转给 home.wechat
  app.all('/', 'home.wechat');
};
```

控制器

```js
'use strict';

const wechat = require('co-wechat');

module.exports = app => {
  class HomeController extends app.Controller {}

  // 因为 Egg 需要用类的形式来组织，而 wechat 是通过 middleware 方法来生成中间件
  HomeController.prototype.wechat = wechat({
    token: 'token',
    appid: 'appid',
    encodingAESKey: ''
  }).middleware(async (message, ctx) => {
    // TODO
  });

  return HomeController;
};
```

### 相同路由支持多账号

```js
// app/router.js
'use strict';

module.exports = app => {
  // 将 get/post 请求都转给 home.wechat
  app.all('/wechat/:appid', 'home.prehandle', 'home.wechat');
};
```

在前置中间件中预先设置 ctx.wx_token 或 ctx.wx_cryptor：

```js
'use strict';

const WXBizMsgCrypt = require('wechat-crypto');
const wechat = require('co-wechat');

module.exports = app => {
  class HomeController extends app.Controller {
    async prehandle(ctx, next) {
      const appid = ctx.params.appid;
      const token = getTokenByAppid(appid);
      ctx.wx_token = token
      // 或者
      const encodingAESKey = getEncodingAESKeyByAppid(appid);

      ctx.wx_cryptor = new WXBizMsgCrypt(token, encodingAESKey, appid);
      await next();
    }
  }

  HomeController.prototype.wechat = wechat({
    // 当有前置中间件设置 ctx.wx_token 和 ctx.wx_cryptor 时，这里配置随意填写
    // token: 'token',
    // appid: 'appid',
    // encodingAESKey: ''
  }).middleware(async (message, ctx) => {
    // TODO
  });

  return HomeController;
};
```

> 注意，上述的 getTokenByAppid 和 getEncodingAESKeyByAppid 方法根据自己情况请自行提供。

## Show cases
### Node.js API 自动回复

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
 repo age : 3 years, 1 month
 active   : 21 days
 commits  : 59
 files    : 10
 authors  :
    46  Jackson Tian  78.0%
     6  ifeiteng      10.2%
     3  lixiaojun     5.1%
     2  Andrew Lyu    3.4%
     1  Jealee3000    1.7%
     1  fancyoung     1.7%

```
