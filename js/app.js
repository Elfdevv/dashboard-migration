async function loadData() {
    const url = encodeURI("https://downloader.disk.yandex.ru/disk/12afd6dd3da932e47e130f6598aab076cfea3652f68d1288f59980413210548f/6a370b94/8lfkAcRSkLFh6OIUOOHfWLNuVZhFDF6RLgmOa3zukL2AcsxprLG9IJHcfZikZNvKCNep_1lx7f9hrfHKcH2Ylg%3D%3D?uid=0&filename=main_data%2B_words_data.csv&disposition=attachment&hash=247a0LwcHjG1lUWVZxkvDWklHFYUaeEd6vVOIhwzN0D39h4DRDLdREpOq8YXehn2q/J6bpmRyOJonT3VoXnDag%3D%3D%3A&limit=0&content_type=text%2Fplain&owner_uid=549705275&fsize=143231798&hid=03764fb6cc0ce18c64219fca5bb74147&media_type=data&tknv=v3&is_direct_zip_experiment=1");

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
