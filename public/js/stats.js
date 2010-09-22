;(function() {

$(function (){

// Quick and dirty way of getting some listening stats :P

var radios = getRadios()
  , $stats = $("#stats")

function statSort(a,b) {
  return b[0]-a[0]
}

function getStats() {  
  var stats = {}
    , statsMax = -1
    , statsToSort = []
    , statsBody = []

  $.ajax({
    type: 'GET'
  , url: '/s/details'
  , success: function(msg) {
      if (msg) stats = msg

      $.each(stats, function(k, v) {
        if (v.m > statsMax) statsMax = v.m
      })

      var rlen = radios.length
      
      $.each(stats, function(k, v) {
        for (var r=0; r<rlen; r++) {
          if (k === radios[r].id) {
            statsToSort.push([v.m, '<div class="stat"><div class="name"><a href="/#' + radios[r].id + '" target="_blank">'+ radios[r].name +'</a></div><div class="bar" style="width:' + ((v.m / statsMax) * 59) + '%;">'+ v.l +'</div></div>'])
          }
        }
      })

      statsToSort.sort(statSort)

      for (var i=0, ilen=statsToSort.length; i<ilen; i++) {
        statsBody.push(statsToSort[i][1])
      }

      $stats.html(statsBody.join(''))
      setTimeout(function() { getStats() }, 5000)
    }
  , dataType: 'json'
  })
}

getStats()

}) // jQuery

}())

