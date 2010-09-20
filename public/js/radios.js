var getRadios

;(function() {

var radios = [
  {
    id: "deep-mix-moscow"
  , name: "Deep Mix Moscow"
  , url: "http://89.179.179.5:8040/;.mp3"
  }
  
, {
    id: "digitally-imported-minimal"
  , name: "Digitally Imported: Minimal"
  , url: "http://91.121.120.47:4100/;.mp3"
  }
  
, {
    id: "somafm-groove-salad"
  , name: "SomaFM - Groove Salad"
  , url: "http://streamer-dtc-aa01.somafm.com:80/stream/1018/;.mp3"
  }

, {
    id: "break-pirates"
  , name: "Break Pirates"
  , url: "http://butan180.server4you.de:3000/;.mp3"
  }
  
, {
    id: "frisky"
  , name: "Frisky"
  , url: "http://205.188.215.229:8008/;.mp3"
  }
  
, { name: "Slay"
  , id: "slay"
  , url: "http://relay1.slayradio.org:8000/;.mp3"
  }

, { name: "Rinse"
  , id: "rinse"
  , url: "http://typhoon.exequo.org:8000/rinseradio"
  }
  
, { name: "MurderCapital FM"
  , id: "murdercapital-fm"
  , url: "http://85.17.146.164:80/1"
  }
  
, { name: "Intergalactic Classix"
  , id: "intergalactic-classix"
  , url: "http://85.17.146.164:80/2"
  }

, { name: "The Movie Machine"
  , id: "the-movie-machine"
  , url: "http://85.17.146.164:80/3"
  }

, { name: "Cybernetic Broadcasting"
  , id: "cybernetic-broadcasting"
  , url: "http://85.17.146.164:80/4"
  }  
]

getRadios = function() {
  return radios
}

}())