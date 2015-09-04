var _ = require('lodash');

var XmlRpcSerializer = require('xmlrpc/lib/serializer');


var respondWithXml = function (data, respond) {
  var xml = XmlRpcSerializer.serializeMethodResponse(data);
  return respond(200, xml);
};


module.exports = {
  'pwcheck': {
    xmlRpc: false,
    responder: function (request, services, respond) {
      return respond(200, 'OK-8');
    }
  },

  'radioHandshake': {
    xmlRpc: false,
    responder: function (request, services, respond) {
      return respond(501);
    }
  },

  'ping': function (request, services, respond) {
    return respond(200);
  },

  'artistMetadata': function (request, services, respond) {
    var params = {
      'artist': request.params[0],
      'lang': request.params[1]
    };
    services.api.get('artist.getInfo', params, function (err, response) {
      if (err) {
        console.log(err);
        return respond(500);
      }

      var artistInfo = response['artist'];
      var data = {
        'artistName': artistInfo['name'],
        'artistPageUrl': artistInfo['url'],
        'artistTags': artistInfo['tags']['tag'].map(function (tag) {
          return tag['name'];
        }),
        'numListeners': artistInfo['stats']['listeners'],
        // 'numPlays': artistInfo['stats']['plays'],
        'picture': artistInfo['image'][2]['#text'],
        'similar': artistInfo['similar']['artist'].map(function (artist) {
          return artist['name'];
        }),
        'topFans': [],
        'wikiPageUrl': artistInfo['url'] + '/+wiki',
        'wikiText': artistInfo['bio']['summary']
      };

      respondWithXml(data, respond);
    });
  },

  'trackMetadata': function (request, services, respond) {
    var params = {
      'artist': request.params[0],
      'track': request.params[1]
    };
    services.api.get('track.getInfo', params, function (err, response) {
      if (err) {
        console.log(err);
        return respond(500);
      }

      var trackInfo = response['track'];
      var data = {
        'trackTitle': trackInfo['name'],
        'trackUrl': trackInfo['url'],
        'trackTags': trackInfo['toptags']['tag'].map(function (tag) {
          return tag['name'];
        }),

        'artistName': trackInfo['artist']['name']
      };

      if (trackInfo['album']) {
        _.assign(data, {
          'albumCover': trackInfo['album']['image'][2]['#text'],
          'albumName': trackInfo['album']['name'],
          'albumUrl': trackInfo['album']['url']
        });
      }

      respondWithXml(data, respond);
    });
  }
};
