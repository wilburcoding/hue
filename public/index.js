/** @type {HTMLCanvasElement} */
const imageCanvas = document.getElementById("image-canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = imageCanvas.getContext("2d")
ctx.imageSmoothingEnabled = false;
ctx.willReadFrequently = true;
let socket = io();
let image = null;
let imageData = null;
let colorlist = {};
let selected = [];
let needsRender = true;
let gameTimer = null;
let targetColor = null;
let leaderboard = [];
let count = 5;

$("#newgame").hide();

function startRenderLoop() {
    const loop = () => {
        if (needsRender) {
            renderCanvas()
            needsRender = false;
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

startRenderLoop()


function renderCanvas() {
    ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

    if (!image) return
    ctx.drawImage(image, 0, 0)
}

/**
 * @param {MouseEvent} e
 * @returns {{ x: number, y: number }}
 */
function getMousePos(e) {
    const rect = imageCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }
}

/**
 * @param {MouseEvent} e
 * @returns {{ col: number, row: number } | null}
 */
function getPixelCoordinates(e) {
    if (!image) return null;

    const { x: mx, y: my } = getMousePos(e);

    const col = Math.floor(mx);
    const row = Math.floor(my);

    if (col < 0 || row < 0 || col >= image.width || row >= image.height)
        return null;

    return { col, row };
}

/** @param {HTMLImageElement} img */
function loadImage(img) {
    ctx.drawImage(img, 0, 0);
    imageData = ctx.getImageData(0, 0, img.width, img.height);
    image = img;
}

/**
 * @param {{ r: number, g: number, b: number }} color1
 * @param {{ r: number, g: number, b: number }} color2
 */
function calculateScore(color) {
    if (!color) return 10000; // If either color is null, return a high score
    return Math.sqrt(
        Math.pow(targetColor.r - color[0], 2) +
        Math.pow(targetColor.g - color[1], 2) +
        Math.pow(targetColor.b - color[2], 2)
    );
}

imageCanvas.addEventListener("click", (e) => {
    const coords = getPixelCoordinates(e);
    if (!coords) return;

    const { col, row } = coords;
    const { data } = ctx.getImageData(col, row, 1, 1);
    const [r, g, b] = data;
    console.log(r, g, b);
    if (Object.keys(colorlist).length >= 20) {
        return
    }
    if (Object.keys(colorlist).includes(`${r},${g},${b}`)) {
        console.log("Color already selected");
        return;
    }
    colorlist[`${r},${g},${b}`] = calculateScore([r, g, b]);
    $(".bottom-container").append(`<div class="colorbox" id="${r}-${g}-${b}" style="background-color: rgb(${r}, ${g}, ${b})"><p>(${r}, ${g}, ${b})</p></div>`)
    function handleRightClick(e) {
        e.preventDefault();
        const id = $(this).attr("id");
        const r = Number(id.split("-")[0]);
        const g = Number(id.split("-")[1]);
        const b = Number(id.split("-")[2]);
        delete colorlist[`${r},${g},${b}`];
        $("#count-text").text(Object.keys(colorlist).length + "/20");
        if (Object.keys(colorlist).length == 20) {
            $("#count-text").css("color", "#FF7C61");
        } else {
            $("#count-text").css("color", "black");
        }

        $(`#${id}`).remove();
        if (selected.length == 1) {
            if (selected[0][0] == r && selected[0][1] == g && selected[0][2] == b) {
                selected = [];
            }
        }
        let sortedKeys = Object.keys(colorlist).sort(function (a, b) { return colorlist[a] - colorlist[b] })
        if (!$("#best").hasClass("colorbox")) {
            $("#best").addClass("colorbox");
        }
        if (sortedKeys.length == 0) {
            $("#best").removeClass("colorbox");
            $("#bestscore").text("Best")
            $("#best").css("background-color", "transparent");
            socket.emit("color-change", { "color": null });
        } else {

            let bestcolor = sortedKeys[0].split(",");
            $("#best").css("background-color", `rgb(${bestcolor[0]}, ${bestcolor[1]}, ${bestcolor[2]})`);
            $("#best").html(`<p>(${bestcolor[0]},${bestcolor[1]},${bestcolor[2]})</p>`)
            $("#bestscore").text("Best (" + Math.round(colorlist[sortedKeys[0]]) + ")");
            socket.emit("color-change", { "color": { r: bestcolor[0], g: bestcolor[1], b: bestcolor[2] } });
        }

    }
    function handleclick() {
        const id = $(this).attr("id");
        const r = Number(id.split("-")[0]);
        const g = Number(id.split("-")[1]);
        const b = Number(id.split("-")[2]);
        if (selected.length == 1) {
            const fitem = selected[0];
            $(`#${fitem[0]}-${fitem[1]}-${fitem[2]}`).removeClass("selected");
            selected = [];
            const newcolor = [Math.round((r + fitem[0]) / 2), Math.round((g + fitem[1]) / 2), Math.round((b + fitem[2]) / 2)];
            if (!Object.keys(colorlist).includes(`${newcolor[0]},${newcolor[1]},${newcolor[2]}`) && Object.keys(colorlist).length < 20) {
                $(".bottom-container").append(`<div class="colorbox" id="${newcolor[0]}-${newcolor[1]}-${newcolor[2]}" style="background-color: rgb(${newcolor[0]}, ${newcolor[1]}, ${newcolor[2]})"><p>(${newcolor[0]},${newcolor[1]},${newcolor[2]})</p></div>`)
                $(`#${newcolor[0]}-${newcolor[1]}-${newcolor[2]}`).on("click", handleclick);
                $(`#${newcolor[0]}-${newcolor[1]}-${newcolor[2]}`).on("contextmenu", handleRightClick);
                colorlist[(`${newcolor[0]},${newcolor[1]},${newcolor[2]}`)] = calculateScore(newcolor);
            } else {
                $(`#${r}-${g}-${b}`).effect("shake", { times: 2, distance: 5 }, 500);
            }
            $("#count-text").text(Object.keys(colorlist).length + "/20");
            if (Object.keys(colorlist).length == 20) {
                $("#count-text").css("color", "#FF7C61");
            } else {
                $("#count-text").css("color", "black");
            }
            let sortedKeys = Object.keys(colorlist).sort(function (a, b) { return colorlist[a] - colorlist[b] })
            if (!$("#best").hasClass("colorbox")) {
                $("#best").addClass("colorbox");
            }
            let bestcolor = sortedKeys[0].split(",");
            $("#best").css("background-color", `rgb(${bestcolor[0]}, ${bestcolor[1]}, ${bestcolor[2]})`);
            $("#best").html(`<p>(${bestcolor[0]},${bestcolor[1]},${bestcolor[2]})</p>`)
            $("#bestscore").text("Best (" + Math.round(colorlist[sortedKeys[0]]) + ")");
            socket.emit("color-change", { "color": { r: bestcolor[0], g: bestcolor[1], b: bestcolor[2] } });



        } else {
            selected.push([r, g, b]);
            $(`#${r}-${g}-${b}`).addClass("selected");
        }
    }
    let sortedKeys = Object.keys(colorlist).sort(function (a, b) { return colorlist[a] - colorlist[b] })
    if (!$("#best").hasClass("colorbox")) {
        $("#best").addClass("colorbox");
    }
    let bestcolor = sortedKeys[0].split(",");
    $("#best").css("background-color", `rgb(${bestcolor[0]}, ${bestcolor[1]}, ${bestcolor[2]})`);
    $("#best").html(`<p>(${bestcolor[0]},${bestcolor[1]},${bestcolor[2]})</p>`)
    $("#bestscore").text("Best (" + Math.round(colorlist[sortedKeys[0]]) + ")");
    socket.emit("color-change", { "color": { r: bestcolor[0], g: bestcolor[1], b: bestcolor[2] } });
    $(`#${r}-${g}-${b}`).on("click", handleclick);
    $(`#${r}-${g}-${b}`).on("contextmenu", handleRightClick);
    $("#count-text").text(Object.keys(colorlist).length + "/20");
    if (Object.keys(colorlist).length == 20) {
        $("#count-text").css("color", "#FF7C61");
    } else {
        $("#count-text").css("color", "black");
    }
    needsRender = true;
})
if (localStorage.getItem("name") != undefined) {
    $("#username").val(localStorage.getItem("name"));
}

function joinGame() {
    const name = $("#username").val();
    if (String(name).length < 2) {
        $("#info").text("Username must be at least 2 characters long");

    } else {
        localStorage.setItem("name", name);
        socket.emit("join", { "name": name });

        $("#join").hide();
        $("#username").attr("disabled", true)
        $("#info").text("Connected! Waiting for players...")
    }

}
$("#join").click(joinGame)
$("#username").on("keydown", function (e) {
    if (e.key === "Enter") {
        joinGame();
    }
});

function processImage(imageUrl) {
    const image = new Image();
    image.src = imageUrl;
    $("#image-canvas").css("opacity", 0)

    image.onload = () => {
        imageCanvas.height = image.height;
        imageCanvas.width = image.width;
        loadImage(image);
    };
}

function startGameTimer(endTime) {
    if (gameTimer) return;
    let count = Math.ceil((endTime - Date.now()) / 1000);
    gameTimer = setInterval(() => {
        $("#info").text("Game ends in " + count);
        count--;
        if (count === -1) {
            clearInterval(gameTimer);
            $("#info").text("Game ended!");
        }
    }, 1000);
}

$("#newgame").click(function () {
    window.location.reload();
})
// load image on game-start pls - yes ok

socket.on("game-start", (data) => {
    $("#target").html("")

    image = {};
    processImage(data.imageUrl)

    count = data.countdown;
    targetColor = data.targetColor;
    $("#target").addClass("colorbox");
    $("#target").css("background-color", `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`);
    const interval = setInterval(() => {
        $("#info").text("Game starting in " + count);
        count--;
        if (count === -1) {
            clearInterval(interval);
            $("#image-canvas").css("opacity", 1);
            $("#info").text("Game started!");
            startGameTimer(data.endTime)
        }
    }, 1000);
});

socket.on("game-update", (data) => {
    $("#target").html("")
    if (image == null) {
        processImage(data.imageUrl);
        count = -1
        $("#info").text("Game joined!");
        $("#image-canvas").css("opacity", 1);
    }
    targetColor = data.targetColor;
    $("#target").addClass("colorbox");
    $("#target").css("background-color", `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`);
    if (count == -1) {
        startGameTimer(data.endTime)
        $("#image-canvas").css("opacity", 1);

    }
    leaderboard = data.leaderboard
    if (leaderboard.length > 10) {
        leaderboard = leaderboard.slice(0, 10);
    }
    console.log(leaderboard)
    $("#l-container").css("opacity", 1);
    $("#info-container").css("opacity", 1);
    $("#count").css("opacity", 1);
    $("#leaderboard").html("")
    for (let i = 0; i < leaderboard.length; i++) {
        $("#leaderboard").append(`
            <div class="l-entry">
            <p>${leaderboard[i].name}</p>
            <p>${(Math.round(leaderboard[i].points) == 10000 ? "-" : Math.round(leaderboard[i].points * 10) / 10)}</p>
            </div>`)
    }
});

socket.on("game-end", (data) => {
    $("#image-canvas").css("pointer-events", "none");
    $(".content-container").css("cursor", "not-allowed");
    $(".content-container").css("opacity", 0.7);
    $("#newgame").show();

    $("#info").text("Game ended!");
    $("#target").html("<p>(" + targetColor.r + "," + targetColor.g + "," + targetColor.b + ")</p>");
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
});