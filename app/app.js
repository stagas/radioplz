// Fetch modules
require.paths.unshift('/usr/local/lib/node')
var sys = require('sys')
  , path = require('path')
  , querystring = require('querystring')
  , net = require('net')
  , http = require('http')
  , connect = require('connect')
  , meryl = require('meryl')
  , crypto = require('crypto')
  , colors = require('colors')  
  , db = require('chaos')(path.join(path.dirname(__filename), '../radios'))

var DEBUG = 3

var log = function() {
  if (DEBUG) {
    var msgarr = Array.prototype.slice.call(arguments).join(' ')
    if (DEBUG>1) {
      try {
        throw new Error()
      } catch(e) {
        var line = e.stack.split('\n')[3].split(':')[1]
        sys.print('    '.slice(line.length) + line.cyan + ' ')
      }
    }
    sys.print(
      ('[' + (new Date).toUTCString() + '] ')
    )
    console.log(msgarr)
  }
}

var logg = function() {
  var msgarr = Array.prototype.slice.call(arguments)
    , url = msgarr.shift().url
    
  msgarr = msgarr.join(' ')
  log(url.magenta + ':'.magenta, msgarr)
}

var logs = function() {
  var msgarr = Array.prototype.slice.call(arguments).join(' ')  
  log('S:'.green, msgarr)
}

var logws = function() {
  var msgarr = Array.prototype.slice.call(arguments).join(' ')  
  log('WS:'.red, msgarr)
}

process.on('uncaughtException', function (err) {
  log('Caught exception: '.red, err.message)
  var s = err.stack.split('\n')
  s.shift()
  console.log(s)
})
  log(sys.inspect(db.__hash('radios')))

// Configuration
DEBUG = true 
var HOST = process.env.POLLA_HOST || 'localhost'
  , PORT = process.env.POLLA_PORT || 8080
  , PUBLIC = path.join(path.dirname(__filename), '../public')
  , SITENAME = 'Radioplz.com'
  , ADMINIP = '127.0.0.1'
  , banTime = 1 * 10 * 1000
  , minDiff = 5 * 1000
  , maxDiff = 20 * 1000
  , meter = 5 * 1000
  
// Init DB
var radios = {}
  , suggest = []

db.getorsetget('radios', radios, function(err, data) {
  try {
    radios = JSON.parse(data)
  } catch(e) {
    radios = {}
  }
})

db.getorsetget('suggest', suggest, function(err, data) {
  try {
    suggest = JSON.parse(data)
  } catch(e) {
    suggest = []
  }
})

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

users = {}
stats = []

// Init web framework
meryl

.h('GET /removesuggest/<radio>', function(req, res) {
  var ip = req.headers.ip || req.connection.remoteAddress
    , radio = req.params.radio
    
  if (ip == ADMINIP) {
    if (typeof suggest[radio] !== 'undefined') {
      delete suggest[radio]
      log('Removed item ' + radio)
      log(suggest)
      res.send('OK done')
    } else {
      res.statusCode = 404
      res.send('Doesn\'t exist')
    }
  } else {
    res.statusCode = 404
    res.send('<h1>Not Found</h1><p>The URL you requested could not be found</p>')
  }
})

.h('GET /voteup/<radio>', function(req, res) {
  var ip = req.headers.ip || req.connection.remoteAddress
    , radio = req.params.radio
    
  if (typeof suggest[radio].voted !== 'undefined') {
    suggest[radio].voted = []
  }
  if (!suggest[radio].voted.hasObject(ip)) {
    suggest[radio].voted.push(ip)
    suggest[radio].votes++
    fs.writeFile(suggestFile, JSON.stringify(suggest))
    var json = JSON.stringify({success: true})
    res.send(json)
  } else {
    var json = JSON.stringify({success: false, info: 'Already voted'})
    res.send(json)        
  }
})

.h('GET /suggest/', function(req, res) {
  var ip = req.headers.ip || req.connection.remoteAddress

  var newdocs = []

  var v
  
  for (var i=0; i<suggest.length; i++) {
    v = suggest[i]
    newdocs.push({ key: i
                 , station: v.station
                 , url: v.url
                 , nick: v.nick
                 , votes: v.votes
                 , voted: (v.voted.hasObject(ip)) ? true : false
                 })
  }

  var json = JSON.stringify(newdocs)

  res.send(json)

})
    
.h('POST /suggest/', function(req, res) {
  var formData = querystring.parse(req.body)
    , formSuccess = false
    , formInfo = []
    , formErrors = []
    , ip = req.headers.ip || req.connection.remoteAddress
    , nick = ''
    , stationName = ''
    , email = ''
    , url = ''
  
  function sendReply() {
    var json = JSON.stringify({success: formSuccess, errors: formErrors, info: formInfo})
    res.send(json)
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
    var docs = []
    var v
    
    for (var i=0; i<suggest.length; i++) {
      v = suggest[i]
      if (ip === v.ip || email === v.email) docs.push(v)
    }

    if (docs.length < 3) {        
      suggest.push({station: stationName, url: url, nick: nick, email: email, votes: 1, ip: ip, voted: [ip]})
      try {
        fs.writeFile(suggestFile, JSON.stringify(suggest))
      } catch(e) {}
      formInfo.push('Thank you for helping us find more quality radio stations! You can suggest ' + (3 - docs.length - 1) + ' more if you want!')
      formSuccess = true
      sendReply()
    } else {            
      formInfo.push('Thank you for your interest in '+ SITENAME +'! You already suggested 3 stations, which is the maximum.')
      sendReply()              
    }
    
  } else {
  
    sendReply()
  
  }
  
})

.h('GET /t/<radio>', function(req, res) {  
  var ip = req.headers.ip || req.connection.remoteAddress
  
  radio = req.params.radio
  
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
    res.send('')
    
    logip(ip, 'Flooder detected: ' + radio)
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
    logip(ip, 'Tuned to: ' + radio)
    var current = radio
    if (current.length >= 3 && current.length <= 50) {
      if (typeof radios[current] === 'undefined') radios[current] = { m:1, l:0 }
      
      radios[current].m += Math.floor(dateDiff / meter)

      db.set('radios', JSON.stringify(radios))
    
      res.send('')
      users[ip].l = dateNow
      users[ip].c = current

    } else {
      logip(ip, 'Not good size: ' + radio)
      res.statusCode = 500
      res.send('')
      users[ip].l = dateNow          
    }
  } else {
    logip(ip, 'Attempted early connect: ' + radio)
    res.statusCode = 500
    res.send('')
    users[ip].f++
    users[ip].l = dateNow        
  }
})
    
.h('GET /s/<radio>', function (req, res) {
  var radio = req.params.radio
  
  if (radio == 'details') {
    var dateNow = new Date()
    
    for (var k in radios) {
      radios[k].l = 0
      for (ip in users) {
        if (users[ip].c == k && dateNow - users[ip].l < maxDiff) {
          radios[k].l++
        }
      }
    }
  }
  console.log(radios)
  var json = JSON.stringify(radios)
  res.send(json)
})
  
.p('GET *', connect.staticProvider(PUBLIC))
  
var server = connect.createServer(
  connect.logger({ format: 
    '[:date] '
  + ':remote-addr '.magenta
  + ':method '.yellow
  + ':status '.white
  + ':url '.green
  + ':user-agent :referrer :http-version'.grey 
  })
  //, connect.conditionalGet()
  //, assets
  , connect.bodyDecoder()
  //, connect.gzip()
  , meryl.cgi()
)

server.listen(PORT, HOST)

log('Server started http://' + HOST + ':' + PORT + '/')

function logip(ip,msg) {
  var str = [ip]
  if (typeof users[ip] !== 'undefined') str.push('F:' + users[ip].f)
  str.push('\n' + msg)
  log(str.join(' '))
}

// soft kill
process.on('SIGINT', function() {
  console.log('Killing me softly')
  server.close()
  process.exit()
})

log('Server started: '.green
  + HOST.white
  + ' | Port: '
  + PORT.toString().yellow
  + '\n-----------------------------------------------------------------------------------------'.grey
)
