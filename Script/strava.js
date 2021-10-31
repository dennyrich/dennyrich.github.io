const url_string = window.location.href;
const url = new URL(url_string);
const code = url.searchParams.get("code");
const access_token = url.searchParams.get("t");
const name = url.searchParams.get("name");
const stravaBaseUrl = "https://www.strava.com/api/v3/";
const azureBaseUrl = "https://activity-analyzer.azurewebsites.net/";
//const azureBaseUrl = "http://127.0.0.1:5000/";
console.log(code);

//get access token from code and use access token to get activities on page load
if (access_token) {
  getActivities();
  document.getElementById("authorizeStrava").innerHTML = "Hello, " + name + "!";
} else if (code) {
  const authUrl = azureBaseUrl + "auth/" + code;
  document.getElementById("loading").innerHTML =
    "connecting... this may take a while";
  document.getElementById("authorizeStrava").innerHTML = "connecting...";
  fetch(authUrl, {
    method: "GET"
  })
    .then(res => {
      console.log(res);
      if (!res.ok) {
        throw new Error(
          "could not get access token and authenticate. This may happen if you reload page with parameters in url."
        );
      }
      return res.json();
    })
    .then(res => {
      if (res.errors) {
        throw new Error("access token expired");
      }

      const name = res["athlete"]["firstname"];
      const token = res.access_token;
      location.href = `/GPX.html?t=${token}&name=${name}` + location.hash;
    })
    .catch(error => {
      alert("error: could not authenticate athlete \n" + error);
      window.location.href = "/GPX.html";
    });
}

//populates activities table
async function getActivities() {
  const page = document.getElementById("loadMore").value;
  const activitiesLink =
    stravaBaseUrl +
    `athlete/activities?access_token=${access_token}&per_page=30&page=` +
    page;
  console.log(activitiesLink);
  fetch(activitiesLink)
    .then(res => (res.ok ? res.json() : new Error("could not get activities")))
    .then(res => {
      document.getElementById("loading").innerHTML = "";
      document.getElementById("loadMore").value =
        parseInt(document.getElementById("loadMore").value) + 1;
      const table = document.getElementById("activitiesTable");
      var id;
      var date;
      var name;
      var pLine;
      const encoder = google.maps.geometry.encoding;
      const desiredCanvasDim = 100;
      var deltaLat,
        deltaLng,
        scale,
        cell,
        canvas,
        ctx,
        minLon,
        maxLon,
        minLat,
        maxLat;

      //build table with activity image and name
      for (let i = 0; i < res.length; i++) {
        var row = document.createElement("div");
        row.setAttribute("class", "row");
        var col1 = document.createElement("div");
        col1.setAttribute("class", "col-6");
        col1.style.textAlign = "right";
        var col2 = document.createElement("div");
        col2.setAttribute("class", "col-6");
        pLine = encoder.decodePath(res[i]["map"]["summary_polyline"]);
        lats = [];
        lons = [];
        for (let j = 0; j < pLine.length; j++) {
          lats.push(parseFloat(pLine[j]["lat"]()));
          lons.push(parseFloat(pLine[j]["lng"]()));
        }
        console.log(lats);
        maxLat = Math.max.apply(Math, lats);
        minLat = Math.min.apply(Math, lats);
        maxLon = Math.max.apply(Math, lons);
        minLon = Math.min.apply(Math, lons);
        deltaLat = maxLat - minLat;
        deltaLng = maxLon - minLon;
        //desired canvas height and width = canvas width
        //max(deltaLat, deltaLng) * scale = canvas width
        scale = desiredCanvasDim / Math.max(deltaLat, deltaLng);

        new_lons = lons.map(l => {
          //scale
          l = l * scale;
          //shift
          return l - minLon * scale;
        });
        new_lats = lats.map(l => {
          //scale
          l = l * scale;
          //shift and negate to make topmost as 0 and grow down
          return maxLat * scale - l;
        });

        cell = table.insertRow();
        cellContent = cell.insertCell();
        cellContent.appendChild(row);
        row.appendChild(col1);
        row.appendChild(col2);
        const id = res[i]["id"];
        const name = res[i]["name"];
        const date = res[i]["start_date"].substring(0, 10);
        const activityValue = JSON.stringify({
          id: id,
          name: name,
          date: date,
          averageSpeed: res[i]["average_speed"],
          numKudos: res[i]["kudos_count"]
        });
        cellContent.setAttribute("value", activityValue);
        row.children[0].innerHTML = name + "<br>" + date;
        canvas = document.createElement("canvas");
        canvas.setAttribute("id", id + "canvas");

        canvas.style.height = desiredCanvasDim + "px";
        canvas.style.width = desiredCanvasDim + "px";
        ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "black";
        ctx.moveTo(new_lons[0], new_lats[0]);
        for (let i = 1; i < lats.length; i++) {
          ctx.lineTo(new_lons[i], new_lats[i]);
        }
        ctx.stroke();
        row.children[1].appendChild(canvas);
      }
      // attach event listener after activitiy is clicked on
      const tableCells = table.getElementsByTagName("td");
      for (let i = 0; i < tableCells.length; i++) {
        tableCells[i].onclick = function() {
          document.getElementById("singleMetaData").style.display = "block";
          const value = JSON.parse(this.attributes["value"].value);
          const id = value["id"];
          //const id = this.attributes["value"].value; //get value
          if (
            location.hash == "#simulation" ||
            location.hash == "#singleGraph"
          ) {
            getStream(id, (callback = setUpNextSimulation));
            showMetaData(value);
            showRegPlotOptions(id);
            pacePlot(id);
          }

          $("#activities").modal("hide");
        };
      }
      document.getElementById("tableTitle").innerHTML = "Select an activity";
      document.getElementById("selectActivity").style.border =
        "5px solid olive";
    });
}

// gets activity stream and then executes callback if given
async function getStream(
  id,
  callback,
  keys = "latlng,altitude,time,velocity_smooth"
) {
  const url =
    stravaBaseUrl +
    `activities/${id}/streams?keys=${keys}&key_by_type=true&access_token=${access_token}`;
  stream = fetch(url)
    .then(res => res.json())
    .then(res => {
      if (callback) {
        callback(res);
      }
    })
    .catch(error => {
      alert(error);
    });
}

//redirects to oath page
document.getElementById("authorizeStrava").onclick = function() {
  const developmentUrl =
    "https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://localhost:8000/GPX.html&scope=activity:read_all,read_all";
  const productionUrl =
    "https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://dennyrich.github.io/GPX.html&scope=activity:read_all,read_all";
  location.href = productionUrl;
};
