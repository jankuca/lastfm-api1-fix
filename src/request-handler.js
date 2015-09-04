var _ = require('lodash')

var Url = require('url');
var XmlRpcDeserializer = require('xmlrpc/lib/deserializer');


/**
 * @constructor
 */
var RequestHandler = function (req, res) {
  this.req_ = req;
  this.res_ = res;

  this.url_ = Url.parse(this.req_.url, true);

  this.responders_ = {};
};

_.assign(RequestHandler.prototype, {
  addResponder: function (methodName, options, responder) {
    if (arguments.length === 2) {
      responder = arguments[1];
      options = {};
    } else {
      options = options || {};
    }

    if (typeof options.xmlRpc === 'boolean') {
      var xmlRpcValue = options.xmlRpc ? '1' : '0';
      this.responders_[methodName + '?xmlrpc=' + xmlRpcValue] = responder;
    } else {
      this.responders_[methodName] = responder;
    }
  },

  getResponder_: function (methodName, options) {
    options = options || {};

    var xmlRpcValue = options.xmlRpc ? '1' : '0';
    var responder = (
      this.responders_[methodName + '?xmlrpc=' + xmlRpcValue] ||
      this.responders_[methodName]
    );
    return responder;
  },

  run: function () {
    this.logRequest_(this.url_);

    var self = this;
    this.parseApiCall_(function (err, apiCall) {
      if (err) {
        return self.respond_(400, 'Invalid Api Call: ' + err);
      }

      console.log('- Method', apiCall.methodName);
      console.log('- Params', apiCall.params);

      var responder = self.getResponder_(apiCall.methodName, {
        xmlRpc: apiCall.xmlRpc
      });
      if (!responder) {
        return self.proxyToAudioscrobblerOrigin_(apiCall.rawData);
      }

      responder(apiCall.query, apiCall.params, self.respond_.bind(self));
    });
  },

  logRequest_: function () {
    console.log(this.req_.method, this.url_.path);
    console.log('- Query', this.url_.query);
    console.log('- Headers', this.req_.headers);
  },

  respond_: function (statusCode, body) {
    console.log('-> ' + statusCode);

    this.res_.writeHead(statusCode);
    if (body) {
      this.res_.write(body);
    }
    this.res_.end();
  },

  proxyToAudioscrobblerOrigin_: function (rawData) {
    console.log('-> 307 (special)');
    this.res_.writeHead(307, {
      'location': 'http://ws-origin.audioscrobbler.com' + this.req_.url
    });
    this.res_.end();
  },

  collectRequestData_: function (callback) {
    var req = this.req_;
    var data = new Buffer(0);

    var handleDataChunk = function (chunk) {
      data = Buffer.concat([ data, chunk ]);
    };
    var handleError = function (err) {
      req.removeListener('data', handleDataChunk);
      req.removeListener('end', handleEnd);
      callback(err, null);
    };
    var handleEnd = function () {
      req.removeListener('data', handleDataChunk);
      req.removeListener('error', handleError);
      callback(null, data);
    };

    req.on('data', handleDataChunk);
    req.once('error', handleError);
    req.once('end', handleEnd);
  },

  parseApiCall_: function (callback) {
    if (this.url_.pathname === '/1.0/rw/xmlrpc.php') {
      return this.parseXmlRpcApiCall_(callback);
    }

    var self = this;
    this.collectRequestData_(function (err, data) {
      self.parseNonXmlRpcApiCallData_(data, callback);
    });
  },

  parseXmlRpcApiCall_: function (callback) {
    var deserializer = new XmlRpcDeserializer();

    var self = this;
    deserializer.deserializeMethodCall(this.req_, function (err, methodName, params) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, {
        xmlRpc: true,
        methodName: methodName,
        query: self.url_.query,
        params: params
      });
    });
  },

  parseNonXmlRpcApiCallData_: function (data, callback) {
    var pathname = this.url_.pathname.substr(1).replace(/\.php$/, '');
    var nonXmlRpcMethodName = pathname.replace(/\/(\w)/g, function (match, letter) {
      return letter.toUpperCase();
    });

    return callback(null, {
      xmlRpc: false,
      methodName: nonXmlRpcMethodName,
      query: this.url_.query,
      params: []
    });
  }
});


module.exports = RequestHandler;
