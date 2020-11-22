const url_string = window.location.href;
const url = new URL(url_string);
const code = url.searchParams.get("code");
var access_token;
console.log(code);
if (code && !access_token){
    //reAuthorize(); //exchange code for token (through javascript post)
    //const authUrl = "http://127.0.0.1:5000/auth/" + code;
    const authUrl = "https://activity-analyzer.azurewebsites.net/auth/" + code;
    fetch(authUrl, {
        method : "GET"
    })
        .then((res) => {
            console.log(res);
            if (!res.ok) {
                throw new Error("could not get access token and authenticate. This may happen if you reload page with parameters in url.");
            }
            return res.json();
        })
            .then((res) => {
                if (res.errors) {
                    throw new Error("access token expired");
                }
                document.getElementById("authorizeStrava").innerHTML = "Hello, " + res["athlete"]["firstname"] + "!";
                access_token = res.access_token;
                
                getActivities(res);
            })
                .catch((error) => {
                    alert("error: could not authenticate athlete");
                    window.location.href = "/GPX.html";
                });
}

function getActivities(res) { 
    const after = "1542653603";
    const token = res.access_token;
    const activitiesLink = `https://www.strava.com/api/v3/athlete/activities?access_token=${token}&after=${after}&per_page=70`
    fetch(activitiesLink)
        .then((res) => res.json())
            .then((res) => {
            const table = document.getElementById("activitiesTable");
            var id;
            var date;
            var name;
            for (let i = 0; i < res.length; i++) {
                id = res[i]["id"];
                date = res[i]["start_date"].substring(0, 10);
                name = res[i]["name"];
                console.log(name);
                table.insertRow().innerHTML = `<td value='${id}' style="text-align:center">${name} ${date}</td>`
            }
            const tableCells = table.getElementsByTagName("td")
            for (let i = 0; i < tableCells.length; i++) {
                tableCells[i].onclick = function () {
                    console.log(this);
                    const id = this.attributes["value"].value; //get value
                    getStream(id);
                    //getActitiyGPX(id);
                }
            }
            document.getElementById("tableTitle").innerHTML = "Select an activity";
            document.getElementById("selectActivity").style.border = "5px solid olive"
        })
            .catch((error) => {alert("Sorry, strava API no setup yet. Please upload file")});
}

// function reAuthorize(id) {
//     const auth_link = "https://www.strava.com/oauth/token"
//     fetch(auth_link, {
//         method : 'post',
//         headers : {
//             'Accept': 'application/json, text/plain, */*',
//             'Content-Type' : 'application/json'
//         },
//         body : JSON.stringify({
//                 client_id : '56464',
//                 client_secret : 'c69c6b35d9596089e00980379f82b1e3b16d0283',
//                 grant_type : 'authorization_code',
//                 code : code
//             })
        
//     }).then(res => res.json())
//         .then(res =>getActivities(res))
// }

function getActitiyGPX(id) {
    const url = `https://www.strava.com/api/v3/routes/${id}/export_gpx?access_token=${access_token}`;
    fetch(url)
        .then((res) => console.log(res))
            .catch((error) => alert("could not get activity right now; id: " + id));
    
    
}

function getStream(id) {
    const keys = "latlng,altitude,time"
    const url = `https://www.strava.com/api/v3/activities/${id}/streams?keys=${keys}&key_by_type=true&access_token=${access_token}`
    fetch(url)
        .then((res) => res.json())
            .then((res) => createLatLonElevTimeStream(res))
                .catch((error) => {
                    alert(error)
                })
}


function getAthlete(res) {
    const token = res.access_token;
    const athleteUrl = `https://www.strava.com/api/v3/athlete?access_token=${token}`
    fetch(athleteUrl).then(res => res.json())
        .then(res => document.getElementById("athleteName").innerHTML = "hello, " + res.firstname)
            .catch((error) => alert("cannot get activity with id " +id))
}

document.getElementById("authorizeStrava").onclick = function () {
    productionUrl = 'https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://localhost:8000/GPX.html&scope=activity:read_all,read_all';
    url = 'https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://dennyrich.github.io/GPX.html&scope=activity:read_all,read_all';
    location.href = 'https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://localhost:8000/GPX.html&scope=activity:read_all,read_all'
}

