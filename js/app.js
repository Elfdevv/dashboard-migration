async function loadData() {
    const url = "https://github.com/Elfdevv/dashboard-migration/releases/download/v1.0.0/main_data+_words_data.csv";

    console.log("Загружаю CSV...");

    const response = await fetch(url);
    const text = await response.text();

    const parsed = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    console.log("Готово. Строк:", parsed.data.length);
    return parsed.data;
}

function drawMap(data) {
    // Берём только строки с координатами
    const filtered = data.filter(row =>
        row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)
    );

    const trace = {
        type: "scattermapbox",
        lat: filtered.map(r => r.lat),
        lon: filtered.map(r => r.lon),
        mode: "markers",
        marker: {
            size: 6,
            color: filtered.map(r => r.comfort || 0),
            colorscale: "YlOrRd",
            cmin: 0,
            cmax: 5,
            colorbar: { title: "Комфорт" }
        },
        text: filtered.map(r => r.name || "")
    };

    const layout = {
        mapbox: {
            style: "open-street-map",
            center: { lat: 52.286, lon: 104.305 },
            zoom: 10
        },
        margin: { t: 0, b: 0 }
    };

    Plotly.newPlot("map", [trace], layout);
}

async function main() {
    const data = await loadData();
    drawMap(data);
}

main();
