// Fetch modules
require.paths.unshift('/usr/local/lib/node')
var sys = require('sys')
  , path = require('path')
  , querystring = require('querystring')
  , net = require('net')
  , http = require('http')
  , scylla = require('scylla')  
  , paperboy = require('paperboy')
  , nStore = require('./nstore/lib/nstore')

// Configuration
DEBUG = true 
var HOST = process.env.POLLA_HOST || 'localhost'
  , PORT = process.env.POLLA_PORT || 80
  , PUBLIC = path.join(path.dirname(__filename), '../public')
  , SITENAME = 'Radio'
  , banTime = 1 * 10 * 1000
  , minDiff = 5 * 1000
  , maxDiff = 20 * 1000
  , meter = 5 * 1000
  
// Init DB
var radios = nStore(path.join(path.dirname(__filename), 'radios.db'))
  , suggest = nStore(path.join(path.dirname(__filename), 'suggest.db'))

// Initialize Variables
var uid = 0

// Validation functions
function isValidURL(s) {
  var regexp = /^(([\w]+:)?\/\/)?(([\d\w]|%[a-fA-f\d]{2,2})+(:([\d\w]|%[a-fA-f\d]{2,2})+)?@)?([\d\w][-\d\w]{0,253}[\d\w]\.)+[\w]{2,4}(:[\d]+)?(\/([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)*(\?(&?([-+_~.\d\w]|%[a-fA-f\d]{2,2})=?)*)?(#([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)?$/
  return (regexp.test(s) && s.length<=200) ? true : false
}

function isValidEmail(s) {
  var regexp = /^((([a-z]|[0-9]|!|#|$|%|&|'|\*|\+|\-|\/|=|\?|\^|_|`|\{|\||\}|~)+(\.([a-z]|[0-9]|!|#|$|%|&|'|\*|\+|\-|\/|=|\?|\^|_|`|\{|\||\}|~)+)*)@((((([a-z]|[0-9])([a-z]|[0-9]|\-){0,61}([a-z]|[0-9])\.))*([a-z]|[0-9])([a-z]|[0-9]|\-){0,61}([a-z]|[0-9])\.)[\w]{2,4}|(((([0-9]){1,3}\.){3}([0-9]){1,3}))|(\[((([0-9]){1,3}\.){3}([0-9]){1,3})\])))$/
  return (regexp.test(s) && s.length<=200) ? true : false
}

function isValidNick(s) {
  var regexp = /^([a-zA-Z]{1}[a-zA-Z0-9_]+)/
  return (regexp.test(s) && s.length>=4 && s.length<=20) ? true : false
}

function isValidStationName(s) {
  var regexp = /^([a-zA-Z]{1}[a-zA-Z0-9 _'!#]+)/
  return (regexp.test(s) && s.length>=3 && s.length<=30) ? true : false
}

// Misc functions

// .hasObject by roosteronacid
Array.prototype.hasObject = (
  !Array.indexOf ? function (o)
  {
    var l = this.length + 1
    while (l -= 1)
    {
        if (this[l - 1] === o)
        {
            return true
        }
    }
    return false
  } : function (o)
  {
    return (this.indexOf(o) !== -1)
  }
)

// WebServer constructor
function WebServer() {
  scylla.Base.call(this)
}

users = {}
stats = []

// WebServer handlers
WebServer.prototype = scylla.beget(
  {
    'GET /removesuggest/(.*)': function(req, res, matches) {
      var ip = req.headers.ip    
        , allowed = '79.107.123.157'
        
      if (ip == allowed) {
        suggest.remove(matches[1], function(err, docs, meta) {
          if (err) { 
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Doesnt exist')
          }
          log('Removed item ' + matches[1])
          log(docs)
          log(meta)
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('OK done')
        })
      } else {
        var statCode = 404
        res.writeHead(statCode, {'Content-Type': 'text/html'})
        res.end('<h1>Not Found</h1><p>The URL you requested could not be found</p>')
      }
    }
  , 'GET /voteup/(.*)': function(req, res, matches) {
      var ip = req.headers.ip
      log(matches[1])
      suggest.get(matches[1], function(err, doc, meta) {
        if (err) { throw err }
        if (typeof doc.voted == 'undefined') doc.voted = []
        if (!doc.voted.hasObject(ip)) {
          doc.voted.push(ip)
          doc.votes++
          suggest.save(matches[1], doc, function(err) {
            if (err) { throw err }
            var json = JSON.stringify({success: true})
            res.writeHead(200, { 'Content-Type': 'application/json'
                               , 'Content-Length': json.length
                               })
            res.end(json)
          })
        } else {
          var json = JSON.stringify({success: false, info: 'Already voted'})
          res.writeHead(200, { 'Content-Type': 'application/json'
                             , 'Content-Length': json.length
                             })
          res.end(json)          
        }
      })
    }
  , 'GET /suggest/': function(req, res) {
      var ip = req.headers.ip  
      suggest.all(function(doc, meta) {
        return true       
      }, function(err, docs, metas) {
        if (err) throw err
        
        var newdocs = []

        for (var i=0, ilen = docs.length; i<ilen; i++) {
          newdocs.push({ key: metas[i].key
                       , station: docs[i].station
                       , url: docs[i].url
                       , nick: docs[i].nick
                       , votes: docs[i].votes
                       , voted: (docs[i].voted.hasObject(ip)) ? true : false
                       })
        }

        var json = JSON.stringify(newdocs)
        res.writeHead(200, { 'Content-Type': 'application/json'
                           , 'Content-Length': json.length
                           })
        res.end(json)
      })
    }
    
  , 'POST /suggest/': function(req, res) {
      req.content = ''
      req.on('data', function(data) {
        req.content += data
      })
      req.on('end', function() {
        var formData = querystring.parse(req.content)
          , formSuccess = false
          , formInfo = []
          , formErrors = []
          , ip = req.headers.ip
          , nick = ''
          , stationName = ''
          , email = ''
          , url = ''
        
        function sendReply() {
          var json = JSON.stringify({success: formSuccess, errors: formErrors, info: formInfo})
          res.writeHead(200, { 'Content-Type': 'application/json'
                             , 'Content-Length': json.length
                             })
          res.end(json)
        }
        
        if (!isValidEmail(formData.email)) {
          formErrors.push('email_not_valid')
        } else {
          email = formData.email
        }
    
        if (!isValidURL(formData.url)) {
          formErrors.push('url_not_valid')
        } else {
          url = formData.url
        }
        
        if (!isValidStationName(formData.stationName)) {
          formErrors.push('name_not_valid')
        } else {
          stationName = formData.stationName
        }
        
        if (!isValidNick(formData.nick)) {
          formErrors.push('nick_not_valid')
        } else {
          nick = formData.nick
        }
        
        if (email.length && url.length && stationName.length && nick.length) {

          suggest.all(function(doc, meta) {
            return (doc.ip == ip || doc.email == email)
            
          }, function(err, docs, metas) {
            if (err) throw err
            
            if (docs.length < 3) {        
              suggest.save(null, {station: stationName, url: url, nick: nick, email: email, votes: 1, ip: ip, voted: [ip]}, function(err) {
                if (err) { throw err }
                formInfo.push('Thank you for helping us find more quality radio stations! You can suggest ' + (3 - docs.length - 1) + ' more if you want!')
                formSuccess = true
                sendReply()
              })
            } else {            
              formInfo.push('Thank you for your interest in '+ SITENAME +'! You already suggested 3 stations, which is the maximum.')
              sendReply()              
            }
            
          })
          
        } else {
        
          sendReply()
        
        }
        
      })
     }
    
  , 'GET /t/(.*)': function(req, res, matches) {  
      var ip = req.headers.ip
      
      if (typeof users[ip] == 'undefined') {
        var dat = new Date()
        users[ip] = { l: dat - minDiff, f: 0, t: -1, c: '', st: -1 }
      }

      // Session timeout
      clearTimeout(users[ip].st)
      users[ip].st = setTimeout(function() {
        delete users[ip]
      }, 30 * 60 * 1000)
      
      if (users[ip].f > 10) {
        res.writeHead(403, { 'Content-Type': 'text/plain'
                           , 'Content-Length': 0
                           , 'Connection': 'close'
                           })
        res.end('')
        
        logip(ip, 'Flooder detected: ' + matches[1])
        logip(ip, 'Banned for 10 minutes')

        clearTimeout(users[ip].t)

        users[ip].t = setTimeout(function() {
          users[ip].f = 0
        }, banTime)
        
        return
      }

      var dateNow = new Date()
      var dateDiff = dateNow - users[ip].l
      if (dateDiff > maxDiff) dateDiff = meter
      if (dateDiff >= minDiff) {
        users[ip].f = 0
        logip(ip, 'Tuned to: ' + matches[1])
        var current = matches[1]
        if (current.length >= 4 && current.length <= 50) {
          radios.get(current, function(err, doc, meta) {
            if (err) {
              radios.save(current, {r: current, m: 1}, function(err) {
                if (err) { throw err }
                res.writeHead(200, { 'Content-Type': 'text/plain'
                                   , 'Content-Length': 0
                                   , 'Connection': 'close'
                                   })
                res.end('')
                users[ip].l = dateNow
                users[ip].c = current
              })
            } else {
              doc.m += Math.floor(dateDiff / meter)
              log('New m: ' + doc.m + ' (added ' + Math.floor(dateDiff / meter) + ')')
              radios.save(current, {r: current, m: doc.m}, function(err) {
                if (err) { throw err }
                res.writeHead(200, { 'Content-Type': 'text/plain'
                                   , 'Content-Length': 0
                                   , 'Connection': 'close'
                                   })
                res.end('')
                users[ip].l = dateNow
                users[ip].c = current
              })
            }
          })
        } else {
          logip(ip, 'Not good size: ' + matches[1])
          res.writeHead(500, { 'Content-Type': 'text/plain'
                             , 'Connection': 'close'
                             , 'Content-Length': 0
                             })
          res.end('')
          users[ip].l = dateNow          
        }
      } else {
        logip(ip, 'Attempted early connect: ' + matches[1])
        res.writeHead(500, { 'Content-Type': 'text/plain'
                           , 'Connection': 'close'
                           , 'Content-Length': 0
                           })
        res.end('')
        users[ip].f++
        users[ip].l = dateNow        
      }
    }
    
  , 'GET /s/(.*)': function (req, res, matches) {
      radios.all(function(doc, meta) {
        return true
      }, function(err, docs, metas) {
        if (err) throw err
        
        if (matches[1] == 'details') {
          var dr
            , dateNow = new Date()
          
          for (var i=0, ilen=docs.length; i<ilen; i++) {
            dr = docs[i].r
            docs[i].l = 0
            for (ip in users) {
              if (users[ip].c == dr && dateNow - users[ip].l < maxDiff) {
                docs[i].l++
              }
            }
          }
        }
        
        var json = JSON.stringify(docs)
        res.writeHead(200, { 'Content-Type': 'application/json'
                           , 'Content-Length': json.length
                           })
        res.end(json)
      })
    }
  
    // Paperboy serving static files
  , 'GET /(.*)': function (req, res) {
      var ip = req.headers.ip
      logs(req.headers)
      
      paperboy
        .deliver(PUBLIC, req, res)
        .addHeader('Expires', 1000)
        .addHeader('X-PaperRoute', 'Node')
        .before(function (){
          log('Received Request')
        })
        .after(function (statCode){
          log('Delivered: ' + req.url)
          logp(statCode, req.url, ip)
        })
        .error(function (statCode, msg){
          res.writeHead(statCode, {'Content-Type': 'text/html'})
          res.end('Error: ' + statCode)
          logp(statCode, req.url, ip, msg)
        })
        .otherwise(function (err){
          var statCode = 404
          res.writeHead(statCode, {'Content-Type': 'text/html'})
          res.end('<h1>Not Found</h1><p>The URL you requested could not be found</p>')
          logp(statCode, req.url, ip, err)
        })
    }
  
  }
)

// Create our server with Scylla
var httpServer = http.createServer(
  new WebServer().adapter('nodejs')
)

// Init HTTP Server
httpServer.listen(PORT, HOST)

log('Server started http://' + HOST + ':' + PORT + '/')

// Log
function log(msg) {
  console.log(msg)
}

function logs(msg) {
  sys.log(sys.inspect(msg))
}

function logip(ip,msg) {
  var str = [ip]
  if (typeof users[ip] !== 'undefined') str.push('F:' + users[ip].f)
  str.push('\n' + msg)
  log(str.join(' '))
}

// Paperboy log to console function
function logp(statCode, url, ip, err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip
  if (err)
    logStr += ' - ' + err
  console.log(logStr)
}
