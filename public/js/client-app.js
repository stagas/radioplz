;(function ($){

$(function (){

var radios = getRadios()

// Init
var hash
  , title = document.title
  , hist = [], histPos = -1
  , checkHashInterval
  , meter = 5 * 1000
  
var stats = {}
  , totalWeight = 0

$.ajax({
  type: 'GET'
, url: '/s/'
, success: function(msg) {
    if (msg.length) stats = msg
    $.each(stats, function(k, v) {
      totalWeight += v.m
    })
    //log(stats)
  }
, dataType: 'json'
})

function logRadio() {
  if (typeof radios[current] !== 'undefined' && currentSound.readyState === 1)
    $.ajax({
      type: 'GET'
    , url: '/t/' + radios[current].id
    , async: true
    , success: function() {
        clearTimeout(logTimeout)
        logTimeout = setTimeout(function() { logRadio() }, meter)
      }
    , error: function() {
        clearTimeout(logTimeout)
        logTimeout = setTimeout(function() { logRadio() }, meter)
      }
    })  
}
var logTimeout

soundManager.onload = function() {
  checkHash()
}

soundManager.url = 'js/sm2/soundmanager2_flash9.swf'
soundManager.flashVersion = 9
soundManager.debugMode = false
/*
soundManager.defaultOptions.whileplaying = function() {
  var el = this.peakData.left
    , er = this.peakData.right
      
  updateEQ(el, er)
}
*/

var $style = $("#style")
  , $scale = $("#scale")
  , $opac = $("#opac")
  , $log = $("#log")

var clearMemActive = true

function showDetails() {
  if (typeof currentSound == 'undefined') return true
  
  var html = [ 'readyState: ' + (currentSound.readyState)
             , 'getMemoryUse(): ' + (soundManager.getMemoryUse()/1024/1024) + 'mb'
             , 'isBuffering: ' + ( (currentSound.isBuffering) ? 'true' : 'false' )
             ]
  //$log.html(html.join('<br />'))
  
  if (clearMemActive && currentSound.readyState == 1 && (soundManager.getMemoryUse()/1024/1024 > 50)) {
    clearMemActive = false
    var r = current
    stop()
    current = r
    play()
    //log('Cleared Memory')
    setTimeout(function() {
      clearMemActive = true
    }, 10 * 60 * 1000)
  }
}
setInterval(function() {
  showDetails()
}, 250)

var opacityStatus = 'transparent'
  , opacityCurrent = 0
  , opacityTimeout
  , keepOpacity = false

$("html")
  .bind('mousemove', function(e) {
    clearTimeout(opacityTimeout)
    
    if (opacityStatus === 'transparent') {
      opacityStatus = 'opaque'
      opacity(100,10,5)
    }
    
    if (!keepOpacity) {
      opacityTimeout = setTimeout(function() {
        opacityStatus = 'transparent'
        opacity(-10,100,5)
      }, 3000)
    }
  })

$("#toggleKeepOpacity").click(function() {
  keepOpacity = (keepOpacity) ? false : true
  
  if (keepOpacity)
    $(this)
      .text('^')
      .addClass('pressed')
  else 
    $(this)
      .text('keep')
      .removeClass('pressed')
      
  return false;
})

function updateEQ(el, er) {
  //log('wrote eq')
  $style.html('<style>.l{color:hsl('+(el*1800)+','+(el*100)+'%,'+(el*100)+'%);}.r{color:hsl('+(er*255)+',100%,50%);}</style>')
  //$style.html('<style>body{background:hsl('+(el*1800)+','+(el*100)+'%,'+(el*100)+'%);}</style>')
}

function doScale(rad, amnt) {
  scaleCurrent += amnt
  var sth = scaleCurrent/1000
  //log(rad)
  //$scale.html('<style>#' + rad + '{-moz-transform:scale(' + sth + ');-webkit-transform:scale(' + sth + ');text-shadow:'+ (Math.sqrt((sth-1)*285) + 2) +'px ' + (Math.sqrt((sth-1)*355) + 2) + 'px ' + (Math.sqrt((sth-1)*200)) + 'px #100;}</style>')
}

function doOpac(o) {
  opacityCurrent += o
  var oth = opacityCurrent/1000
  $opac.html('<style>.opac{opacity:'+ oth +'}</style>')
}

var scaleCurrent = 1000

function repeatFunc(f,t,s,callback) { 
  if (t>0)
    setTimeout(function() {
      f()
      t--
      repeatFunc(f,t,s,callback)
    }, s) 
  else
    try { 
      callback() 
    }
    catch(err) {
      //
    }
}

function scale(rad, amnt,t,s,callback) {
  if (callback) callback()
  //repeatFunc(function() { doScale(rad, amnt) }, t, s, callback) 
}
scale(0,1,0)

function opacity(amnt,t,s,callback) {
  repeatFunc(function() { doOpac(amnt) }, t, s, callback)
}

// General Functions

//if (typeof console == 'undefined') var console = { log: function() {} }

function log(msg) {
  console.log(msg)
}

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

// App

var current = -1
  , previous = -1
  , radid='nothing'
  , oldradid=''
  , currentSound

function play() {

  if (current !== previous) {
    clearTimeout(logTimeout)
    
    oldradid = radid
    
    bookmark()
    
    previous = current
    
    currentSound = soundManager.createSound({
      id: radios[current].id
    , url: radios[current].url
    , bufferTime: 1
    , volume: 100
    , usePeakData: true
    })

    soundManager.play(radios[current].id)
    
    logTimeout = setTimeout(function() { logRadio() }, meter)

    playStatus = true
    paintPlay()
    
    radid = radios[current].id.split('-').join('_')
    
    if (!noZoom) {
      if (oldradid !== 'nothing') {
        scale(oldradid,-20,10,1,function() {
          paintName()
          scrollToCurrent(800)
        })
      } else {
        paintName()
        scrollToCurrent(800)
      }
    }
    
  }
}

function paintName() {
  var viewW = $(document).width()

  document.title = title + ' - ' + radios[current].name
  
  if ($('#' + radid).length==0) {
    
    var lastX = $('.item:last').position().left
    
    $('<div class="item l s" id="'+ radid + '">' + radios[current].name + '</div>')
      .css('left', (lastX + viewW) + 'px')
      .appendTo("#name")
  }

  $(".item").css('width', viewW + 'px')
}

function scrollToCurrent(speed) {
  if (typeof radios[current] !== 'undefined') 
    try {
    
      var posX = $('#' + radid).position().left

      $("#namewrap").animate({scrollLeft: Math.floor(posX)}, speed, function() {
        if (speed) scale(radid,20,10,1)
      })
      
    } catch(err) {
      //
    }
}

function alignItems() {
  var viewW = $(document).width()
  var incr=0

  $(".item").css('width', viewW + 'px')
  
  $(".item").each(function() {
    incr++
    $(this).css('left', (viewW * incr) + 'px')
  })  
  
  scrollToCurrent(0)
}

var resizeTimeout

$(window).resize(function() {
  clearTimeout(resizeTimeout)
  
  resizeTimeout = setTimeout(function() { alignItems() }, 15)
})

function bookmark() {

  uncheckHash()
  
  hash = '#' + radios[current].id
  window.location.hash = radios[current].id
  
  checkHash()
  
  url = window.location.href

  /*
  $("#twitter").attr(
    'href', 
    'http://twitter.com/?status=Listening to ' + radios[current].name + ' on @Radio - ' + url
  )
  
  $("#facebook").attr(
    'href',
    'http://www.facebook.com/sharer.php?u=' + url + '&t=Radio - ' + radios[current].name
  )
  */
}

function paintPlay() {
  if (!noPaintPlay) 
    if (!playStatus)
      $("#playstop")
        .text('play')
        .addClass('pressed')
    else
      $("#playstop")
        .text('stop')
        .removeClass('pressed')    
}

function stop() {
  if (current >= 0) {
    soundManager.stopAll()
    currentSound.unload()
    currentSound.destruct()
    soundManager.destroySound(radios[current].id)
    clearTimeout(logTimeout)    
    previous = -1
    playStatus = false
    paintPlay()
  }
}

function another() {
  var r = 0
    , rlen = radios.length
    , rw = 0

  if (hist.length == rlen) r = hist.shift()
  else while (true) {
    r = -1
    if (totalWeight > 0) {
      rw = Math.floor(Math.random()*totalWeight)
      $.each(stats, function(k, v) {
        if (rw < v.m && r == -1) {
          for (var i=0, ilen = radios.length; i<ilen; i++) {
            if (radios[i].id == k && !hist.hasObject(i)) { 
              r = i
              break
            }
          }
        }
        if (r == -1) rw -= v.m
      })
    }
    //log(r + ' ' + rw)
    if (r == -1) {
      r = Math.floor(Math.random()*rlen)
    }
    if (!hist.hasObject(r)) break
  }
  histPos = hist.push(r)

  if (playStatus) noPaintPlay = true
  
  stop()
  current = r
  play()
  
  noPaintPlay = false
}

var playStatus = false
  , noPaintPlay = false
  , noZoom = false

$("#playstop").click(function() {
  noZoom = true
  if (!playStatus) {
    if (current >= 0) {
      play()
    } else {
      another()
    }
  } else {
    stop()
  }  
  noZoom = false
})

var $scan = $("#scan")
  , $html = $("html")
  
$scan.click(function(){
  another()
}).focus()

var blockKeys = false

$html.bind('keypress', function(e) {
  $scan.focus()
  
  if (blockKeys) return
  
  blockKeys = true
  
  //log(e.which)
  
  switch (e.which) {
    case 74:
    case 106:
      radioPrevious()
      break
    case 75:
    case 107:
      radioNext()
      break
  }
  
  setTimeout(function() {
    blockKeys = false
  }, 1500)
  
})

function radioPrevious() {
  if (histPos > 1) {
    histPos--
    stop()
    current = hist[histPos - 1]
    play()
  } else if (hist.length > 1) {
    histPos = hist.length
    stop()
    current = hist[hist.length - 1]
    play()
  }
}

function radioNext() {
  if (histPos < hist.length) {
    histPos++
    stop()
    current = hist[histPos - 1]
    play()
  } else if (hist.length > 1) {
    histPos = 1
    stop()
    current = hist[0]
    play()
  }
}

/* // deprecated functions

$("#play").click(function(){
  if (current >= 0) {
    play()
  } else {
    another()
  }
})

$("#stop").click(function(){
  stop()
})

$("#previous").click(function(){
  if (histPos > 1) {
    histPos--
    stop()
    current = hist[histPos - 1]
    play()
  }
})

$("#next").click(function(){
  if (histPos < hist.length) {
    histPos++
    stop()
    current = hist[histPos - 1]
    play()
  }
})

*/

function checkHash() {
  checkHashInterval = setInterval(function (){
    if (window.location.hash !== hash) {  
      hash = window.location.hash

      if (hash) {

        chash = hash.substr(1)
        
        for (var i=0, rlen=radios.length; i<rlen; i++) {
          if (radios[i].id === chash) {
            //log(hist)
            
            if (!hist.hasObject(i)) hist.push(i)
            histPos = hist.length
            
            stop()
            current = i
            play()
            break
          }
        }
        
      }

    }
  }, 200)
}

function uncheckHash() {
  clearInterval(checkHashInterval)
}

;(function() {
  var n1='gsta'
    , n2='gas'
    , a='gmail'
    , t='com'
    , s=[ '<a href="'
        , 'mail'
        , 'to:'
        , n1
        , n2
        , '@'
        , a
        , '.'
        , t
        , '">'
        , 'feedback'
        , '</a>'
        ].join('')

  $("#ml").html(s)
}())

}) // jquery document ready

}(jQuery)) // self-executable function