var _ = require('lodash')
var http = require('http');

var LastFmClient = require('lastfm-client').Client;
var RequestHandler = require('./request-handler');
var RequestHandlerFactory = require('./request-handler-factory');


var main = function () {
  var api = new LastFmClient({
    api_key: process.env['LASTFM_API_KEY'],
    secret: process.env['LASTFM_API_SECRET']
  });
  var requestHandlerFactory = new RequestHandlerFactory(api);
  var server = http.createServer();

  requestHandlerFactory.setResponders(require('../api/responders'));
  server.on('request', function (req, res) {
    var requestHandler = requestHandlerFactory.createRequestHandler(req, res);
    requestHandler.run();
  });

  var port = process.env['PORT'] || 80;
  server.listen(port, function () {
    console.log('==========');
    console.log('Server started (port = ' + port + ')');
    console.log('----------');
  });
};


module.exports = main;
