if (process.argv.length < 3) {

  console.log("\nPlease specify a valid lj-user name as command line argument.\n");
  return;

}

// caution: setting less than 1 sec interval can cause a ban of your IP address by LJ server! 
var WEB_ACCESS_INTERVAL = 2000; // millisec; 

var TOP_CNT             = 20;

var BASE_USER          = process.argv[2];

var BASE_USER_FRIENDS = {};
var CANDIDATES        = {};

var 
  http       = require('http'),
  async      = require('async'),
  und        = require('underscore');

console.log("\nGetting base friend list for " + BASE_USER + " ...");

async.waterfall([

    function(callback) {

      getFriends(BASE_USER, callback, true);
      
    },

    function(callback) {
        
      var cnt = 0;
      var baseFriends = und.keys(BASE_USER_FRIENDS);

      async.eachSeries(baseFriends, 

        function(x, next) {

          cnt += 1;
          console.log("Processing user '" + x + "' (#" + cnt + " of " + baseFriends.length + ")");
          setTimeout(function() { getFriends(x, next); }, WEB_ACCESS_INTERVAL);

        }, 

        function(err){
          if( err ) {
            console.log(err);
          } 
          callback(null);
        }

      );

    },

], function (err, result) {
    
    if (err) {
      console.error(err);
    } else {
      console.log("Done.");
    }

});


function getFriends(user, callback, isBaseUser) {

  var options = { 
        host: "www.livejournal.com", 
        port: 80, 
        path: "/misc/fdata.bml?user=" + user
      };


  http.get(options, function(response) {
    
    // console.log('http status: ' + response.statusCode)
    // console.log(JSON.stringify(response.headers));

    if (response.statusCode == 200) {
      var responseParts = [];
      response.setEncoding('utf8');
      response.on("data", function(chunk) {
        responseParts.push(chunk);
      });
      response.on("end", function() {
        var payload = responseParts.join('');

        if (payload.substr(0,1) == "!") {

          callback("Livejournal server replies: " + payload);

        } else {

          var ar = payload.split("\n");
          ar = und.map(ar, function(x) { return x.trim(); });
          ar = und.filter(ar, function(x) { return x.substr(0,1) == ">"; } );

          console.log("Got list of " + user + "'s  friends: " + ar.length + " users");

          und.each(ar, function(x) {

            var friendName = x.substr(1).trim();

            if (isBaseUser) {

              BASE_USER_FRIENDS[friendName] = 1;

            } else {

              if ( !(friendName in BASE_USER_FRIENDS) ) {

                if (friendName in CANDIDATES) {
                  CANDIDATES[friendName] += 1;
                } else {
                  CANDIDATES[friendName] = 1;
                }
              } 

            } // end if isBaseUser
                          

          });

          var pairs = und.pairs(CANDIDATES);
          pairs.sort(function(a,b) { return b[1] - a[1];});
          var top = und.map( pairs.slice(0, TOP_CNT), function(x) { return x[0] + "(" + x[1] + ")"; });
          if (top.length > 0) {
            console.log("So far, top missing users are:\n" + top.join(", ") + "\n\n");
          }

          callback(null);
        }
       
      }).on('error', function(err) {

        callback(err);

      });

    } else {

      callback("got bad HTTP code in response: " + response.statusCode);

    }
                      
  }).on('error', function(err) {
    callback("friends error:" + JSON.stringify(err));
  });   

}









