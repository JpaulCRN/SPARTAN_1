const actionLabels = {
    0: 'Maintain Position',
    1: 'Move Closer',
    2: 'Move Away'
};

let map;
let uavPositions = [];
let targetPosition = { lat: 39.8138, lng: -84.0500 };  // Approximate center of Wright-Patterson AFB
const canvas = document.getElementById('movementMap');
const ctx = canvas.getContext('2d');

let fetchInterval;
const rewardData = {
    labels: [],
    datasets: [{
        label: 'Reward',
        backgroundColor: 'rgba(0, 188, 212, 0.2)',
        borderColor: '#00bcd4',
        data: []
    }]
};

const rewardChartCtx = document.getElementById('rewardChart').getContext('2d');
const rewardChart = new Chart(rewardChartCtx, {
    type: 'line',
    data: rewardData,
    options: {
        scales: {
            x: { display: true, title: { display: true, text: 'Time' }},
            y: { display: true, title: { display: true, text: 'Reward' }}
        }
    }
});

// Initialize Google Map API
function initializeMap() {
    console.log("Initializing Google Map...");

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: targetPosition,
    });

    // Set canvas size to match map size once the map is ready
    google.maps.event.addListenerOnce(map, 'idle', () => {
        canvas.width = map.getDiv().offsetWidth;
        canvas.height = map.getDiv().offsetHeight;
        console.log(`Canvas width: ${canvas.width}, height: ${canvas.height}`);
    });
}

// Updated projectToCanvas function to project coordinates within canvas dimensions
function projectToCanvas(lat, lng) {
    if (!map || !map.getBounds()) {
        console.warn("Map bounds not available, retrying...");
        setTimeout(() => projectToCanvas(lat, lng), 50); // Retry in 50ms
        return { x: -1000, y: -1000 }; // Temporary off-screen position
    }

    // Get the visible bounds of the map
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Calculate normalized position within bounds (0 to 1 range)
    const latPercent = (lat - sw.lat()) / (ne.lat() - sw.lat());
    const lngPercent = (lng - sw.lng()) / (ne.lng() - sw.lng());

    // Map normalized position to canvas dimensions
    const x = Math.floor(lngPercent * canvas.width);
    const y = Math.floor((1 - latPercent) * canvas.height); // Flip y to match canvas coordinates

    console.log(`projectToCanvas - Lat: ${lat}, Lng: ${lng} -> Canvas X: ${x}, Y: ${y}`);
    
    return { x, y };
}

function drawMap(uavPosition) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw target marker
    const targetCanvasPos = projectToCanvas(targetPosition.lat, targetPosition.lng);
    if (targetCanvasPos.x >= 0 && targetCanvasPos.y >= 0) {
        console.log(`Drawing target at Canvas X: ${targetCanvasPos.x}, Y: ${targetCanvasPos.y}`);
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(targetCanvasPos.x, targetCanvasPos.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw UAV marker
    const uavCanvasPos = projectToCanvas(uavPosition.lat, uavPosition.lng);
    if (uavCanvasPos.x >= 0 && uavCanvasPos.y >= 0) {
        console.log(`Drawing UAV at Canvas X: ${uavCanvasPos.x}, Y: ${uavCanvasPos.y}`);
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(uavCanvasPos.x, uavCanvasPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateUAVPosition(state) {
    const uavLat = state[0];
    const uavLng = state[1];
    const uavPosition = { lat: uavLat, lng: uavLng };

    console.log(`updateUAVPosition - UAV Lat: ${uavLat}, Lng: ${uavLng}`);
    
    uavPositions.push(uavPosition);
    if (uavPositions.length > 20) uavPositions.shift();

    drawMap(uavPosition);
}

function updateRewardChart(reward) {
    const time = new Date().toLocaleTimeString();
    rewardData.labels.push(time);
    rewardData.datasets[0].data.push(reward);

    if (rewardData.labels.length > 20) {
        rewardData.labels.shift();
        rewardData.datasets[0].data.shift();
    }
    rewardChart.update();
}

// Function to add an entry to the event log
function addEventLog(state, action, reward) {
    const logList = document.getElementById('event-log');
    const logItem = document.createElement('li');
    logItem.textContent = `State: [${state.join(", ")}], Action: ${action}, Reward: ${reward.toFixed(2)}`;
    logList.prepend(logItem); // Adds to the top of the list
    if (logList.childElementCount > 10) logList.removeChild(logList.lastChild); // Limit to 10 entries
}

function fetchData() {
    fetch('http://127.0.0.1:5000/api/status')
        .then(response => response.json())
        .then(data => {
            console.log("Data received from backend:", data);  // Log full data
            document.getElementById('state').innerText = data.state.join(", ");
            document.getElementById('action').innerText = actionLabels[data.action] || 'Undefined';
            document.getElementById('reward').innerText = data.reward.toFixed(2);

            targetPosition = { lat: data.target_position[0], lng: data.target_position[1] };
            updateUAVPosition(data.state);
            updateRewardChart(data.reward);

            addEventLog(data.state, actionLabels[data.action] || 'Undefined', data.reward);
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Define initializeMap globally so Google Maps API can call it
window.initializeMap = initializeMap;

document.getElementById('start-btn').addEventListener('click', () => {
    if (!fetchInterval) fetchInterval = setInterval(fetchData, 2000);
});

document.getElementById('pause-btn').addEventListener('click', () => clearInterval(fetchInterval));

document.getElementById('reset-btn').addEventListener('click', () => {
    clearInterval(fetchInterval);
    fetchInterval = null;
    uavPositions = [];
    rewardData.labels = [];
    rewardData.datasets[0].data = [];
    rewardChart.update();
    document.getElementById('event-log').innerHTML = "<li>Loading events...</li>";
    fetchData();
});
