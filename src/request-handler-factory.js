var _ = require('lodash')

var RequestHandler = require('./request-handler');


/**
 * @constructor
 */
var RequestHandlerFactory = function (api) {
  this.$api = api;

  this.responders_ = {};
};


_.assign(RequestHandlerFactory.prototype, {
  setResponders: function (responders) {
    this.responders_ = responders;
  },

  createRequestHandler: function (req, res) {
    var handler = new RequestHandler(req, res);

    var self = this;
    _.forEach(this.responders_, function (desc, methodName) {
      var options = { xmlRpc: desc.xmlRpc };
      var responder = desc.responder || desc;
      handler.addResponder(methodName, options, function (query, params, respond) {
        var request = {
          query: query,
          params: params
        };
        var services = {
          api: self.$api
        };

        responder(request, services, respond);
      });
    });

    return handler;
  }
});


module.exports = RequestHandlerFactory;
