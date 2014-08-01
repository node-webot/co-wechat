var API = require('wechat').API;

exports.create = function (appid, appsecret, getToken, saveToken) {
  var api = new API(appid, appsecret, getToken, saveToken);
  return api;
};
