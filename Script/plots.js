const PACETIME = document.getElementById("paceTimePlot");

var frames = [];
var x;
var y;
var maxY;
var prevX = 0;

// initialize plot on simulation page
function plotPaceVsTime(stream, isTrkseg) {
  y = stream["velocity_smooth"]["data"];
  if (!isTrkseg) {
    // m/s to mph
    y = y.map(i => i * 2.237);
  }
  x = stream["time"]["data"];
  maxY = [0, Math.max.apply(Math, y)];
  Plotly.newPlot(
    PACETIME,
    [
      {
        //x: [x[0], x[1]],
        y: [],
        mode: "lines",
        fill: "tozeroy",
        type: "scatter",
        line: { color: "#80CAF6" }
      }
    ],
    {
      margin: { t: 0, r: 0, l: 50, b: 0 },
      height: 100,
      xaxis: {
        type: "seconds",
        range: [-1, x.length]
      },
      yaxis: {
        range: [0, maxY],
        title: "Veocity mph"
      }
    }
  );
}

//extend trace for simulation page after plot already created
function extendTrace(frameCount) {
  Plotly.extendTraces(
    PACETIME,
    {
      y: [y.slice(prevX, frameCount)]
    },
    [0]
  );
  prevX = frameCount;
}
//function after activity is clicked from single activity analysis page
function showMetaData(value) {
  const name = value["name"];
  const date = value["date"];
  const numKudos = value["numKudos"];
  const averageSpeed = value["averageSpeed"];
  const id = value["id"];
  document.getElementById("singleName").innerHTML = name;
  document.getElementById("numKudos").innerHTML = numKudos;
  document.getElementById("averageSpeed").innerHTML = averageSpeed;
  document.getElementById("date").innerHTML = date;
  //pacePlot(id);
}
//function after activity is clicked from single activity analysis page
function showRegPlotOptions(id) {
  keys =
    "distance,altitude,velocity_smooth,heartrate,cadence,watts,temp,grade_smooth";
  getStream(
    id,
    function(stream) {
      console.log(stream);
      const options = Object.keys(stream);
      document.getElementById("id").value = id;

      //populate drop down select list
      const elements = document.getElementsByClassName("plot-select");
      //for each of the 3 select drop downs
      for (var s = 0; s < elements.length; s++) {
        const select = elements.item(s);
        select.length = 1;
        //for each option in the available options
        for (var i = 0; i < options.length; i++) {
          var opt = options[i];
          var el = document.createElement("option");
          el.textContent = opt;
          el.value = opt;
          select.appendChild(el);
        }
      }
    },
    (keys = keys)
  );
}

//plots regression plot based on inputs and outputs selected on single acivity analysis page
function regPlot(id) {
  id = document.getElementById("id").value;
  const regPlotUrl = azureBaseUrl + "reg_plot";
  input1 = document.getElementById("input1").value;
  input2 = document.getElementById("input2").value;
  response = document.getElementById("response").value;
  fetch(
    regPlotUrl +
      `/${id}/${access_token}?input1=${input1}&input2=${input2}&response=${response}`
  )
    .then(res => res.text())
    .then(res => {
      document.getElementById("regPlot").innerHTML = res;
      var arr = document
        .getElementById("regPlot")
        .getElementsByTagName("script");
      for (var n = 0; n < arr.length; n++) eval(arr[n].innerHTML);
    });
}

// plots lat, lng, altitude, color coded by velocity; shown after activity selection
function pacePlot(id) {
  //id = document.getElementById("id").value;
  const pacePlotUrl = azureBaseUrl + "pace_plot";

  fetch(pacePlotUrl + `/${id}/${access_token}`)
    .then(res => res.text())
    .then(res => {
      document.getElementById("pacePlot").innerHTML = res;
      var arr = document
        .getElementById("pacePlot")
        .getElementsByTagName("script");
      for (var n = 0; n < arr.length; n++) eval(arr[n].innerHTML);
    });
}
