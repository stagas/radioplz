;(function() {

$(function (){

var $suggestForm = $("#suggestForm")
  , $suggestList = $("#suggestList")

function suggestSort(a,b) {
  return b[0]-a[0]
}

function getSuggest() {  
  var suggest = {}
    , votesMax = -1
    , suggestToSort = []
    , suggestBody = []
    
  $.ajax({
    type: 'GET'
  , url: '/suggest/'
  , success: function(msg) {
      if (msg.length) suggest = msg

      $.each(suggest, function(k, v) {
        if (v.votes > votesMax) votesMax = v.votes
      })

      $.each(suggest, function(k, v) {
        suggestToSort.push([v.votes, '<div class="station"><div class="vote"><span class="votes' + ((v.voted) ? ' voted' : '') + '">'+ v.votes +'</span><br /><button id="' + v.key + '" class="voteup"' + ((v.voted) ? ' disabled="disabled"' : '') + '>vote up</button></div><div class="info"><span class="lbl">Station</span><span class="val">' + v.station + '</span><span class="lbl">Website</span><span class="val">'+ v.url +'</span><span class="by">suggested by '+ v.nick +'</span></div></div>'])
      })

      suggestToSort.sort(suggestSort)

      for (var i=0, ilen=suggestToSort.length; i<ilen; i++) {
        suggestBody.push(suggestToSort[i][1])
      }

      $suggestList.html(suggestBody.join(''))
    }
  , dataType: 'json'
  })
}

$(".voteup").live('click', function(e) {
  e.preventDefault()
  
  var sid = $(this).attr('id')
    , $this = $(this)
    , $votes = $(this).parent().find('.votes')
    , votes = parseInt($votes.text())
    
  $votes.text(votes + 1).addClass('voted')

  $.ajax({
    type: 'GET'
  , url: '/voteup/' + sid
  , dataType: 'json'
  , success: function(msg) {
      if (msg && msg.success) {
        $this.attr('disabled', true)
      } else {
        $votes.text(votes)
        $this.attr('disabled', true)
      }
    }
  })

  return false
})

$("#suggestForm,#formSubmit").bind('submit', function(e) {
  e.preventDefault()

  var post = { stationName: $("#stationName").val()
             , url: $("#url").val()
             , nick: $("#nick").val()
             , email: $("#email").val()
             }

  $(".formError").animate({'opacity': 0.0}, 'fast')
 
  $.ajax({
    type: 'POST'
  , url: '/suggest/'
  , data: post
  , dataType: 'json'
  , success: function(e) {
      //console.log(e)
      $.each(e.errors, function(k, v) {
        $('#' + v).animate({'opacity': 1.0}, 'slow')
      })

      if (e.success) {
        $("#suggest").slideUp()
        getSuggest()        
      }

      $("#suggestInfo").html('')

      if (e.info.length) 
        $.each(e.info, function(k, v) {
          $("#suggestInfo").append(v)
        })
        
    }
  })
  
  return false
})

$("#openSuggest").click(function(e) {
  e.preventDefault()

  $("#openSuggestContainer").hide('fast')
  $("#suggest").slideDown('slow')

  return false
})

getSuggest()

}) // jQuery

}())

