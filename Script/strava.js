const url_string = window.location.href;
const url = new URL(url_string);
const code = url.searchParams.get("code");
const access_token = url.searchParams.get("access_token");
const name = url.searchParams.get("name");
const connected = url.searchParams.get("connected");
const stravaBaseUrl = "https://www.strava.com/api/v3/";
const azureBaseUrl = "https://activity-analyzer.azurewebsites.net/";
console.log(code);
if (access_token) {
    getActivities();
    document.getElementById("authorizeStrava").innerHTML = "Hello, " + name + "!";
} else if (code){
    //reAuthorize(); //exchange code for token (through javascript post)
    //const authUrl = "http://127.0.0.1:5000/auth/" + code;
    const authUrl = azureBaseUrl + "auth/" + code;
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
                
                const name = res["athlete"]["firstname"];
                const token = res.access_token;
                location.href = `/GPX.html?access_token=${token}&name=${name}`;
            })
                .catch((error) => {
                    alert("error: could not authenticate athlete \n" + error);
                    window.location.href = "/GPX.html";
                });
}

function getActivities() { 
    const after = "1542653603";
    const activitiesLink = stravaBaseUrl + `athlete/activities?access_token=${access_token}&per_page=70`
    fetch(activitiesLink)
        .then((res) => res.ok ? res.json() : new Error("could not get activities"))
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
                table.insertRow().innerHTML = `<td value='${id}' style="text-align:center">${name} <br> ${date}</td>`
            }
            const tableCells = table.getElementsByTagName("td")
            for (let i = 0; i < tableCells.length; i++) {
                tableCells[i].onclick = function () {
                    console.log(this);
                    const id = this.attributes["value"].value; //get value
                    getStream(id);
                }
            }
            document.getElementById("tableTitle").innerHTML = "Select an activity"
            document.getElementById("selectActivity").style.border = "5px solid olive"
        })
}

function getStream(id) {
    const keys = "latlng,altitude,time"
    const url = stravaBaseUrl + `activities/${id}/streams?keys=${keys}&key_by_type=true&access_token=${access_token}`
    fetch(url)
        .then((res) => res.json())
            .then((res) => {
                stop();
                createWorldFromStream(res)
            })
                    .catch((error) => {
                        alert(error)
                    })
}

document.getElementById("authorizeStrava").onclick = function () {
    const developmentUrl = 'https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://localhost:8000/GPX.html&scope=activity:read_all,read_all';
    const productionUrl = 'https://www.strava.com/oauth/authorize?client_id=56464&response_type=code&redirect_uri=http://dennyrich.github.io/GPX.html&scope=activity:read_all,read_all';
    location.href = productionUrl;
}
