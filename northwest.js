const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let modalCallback = null;

// --- Funciones de Interfaz (Modales) ---
function abrirModal(titulo, callback = null, tipo = "text") {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-input");
    input.value = ""; input.type = tipo;
    document.getElementById("modal-error").textContent = "";
    input.style.display = callback ? "block" : "none";
    document.getElementById("modal").classList.add("active");
    modalCallback = callback;
}
function cerrarModal() { document.getElementById("modal").classList.remove("active"); }
function confirmarModal() {
    const input = document.getElementById("modal-input");
    if (input.style.display !== "none") {
        if (input.value.trim() === "") {
            document.getElementById("modal-error").textContent = "El campo no puede estar vacío."; return;
        }
        if (modalCallback && modalCallback(input.value.trim()) === false) return;
    }
    cerrarModal();
}

// --- Gestión de la Matriz ---
function generarMatrizUI(filasObj = null, colsObj = null, datosGuardados = null) {
    const container = document.getElementById("nw-container");
    let numFilas = filasObj || parseInt(document.getElementById("input-filas").value);
    let numCols = colsObj || parseInt(document.getElementById("input-cols").value);

    let html = '<table class="tabla-matriz" id="nw-table" style="margin: 0 auto; border-collapse: collapse;"><tr><th>Nodos</th>';
    for (let j = 0; j < numCols; j++) {
        let nCol = datosGuardados ? datosGuardados.nombresCols[j] : `Destino ${j + 1}`;
        html += `<th contenteditable="true" class="col-name" style="background-color:#abcbd3;">${nCol}</th>`;
    }
    html += '<th style="background-color:#ffc98d;">Oferta</th></tr>';

    for (let i = 0; i < numFilas; i++) {
        let nFila = datosGuardados ? datosGuardados.nombresFilas[i] : `Origen ${i + 1}`;
        html += `<tr><th contenteditable="true" class="row-name" style="background-color:#abcbd3;">${nFila}</th>`;
        for (let j = 0; j < numCols; j++) {
            let costo = datosGuardados ? datosGuardados.costos[i][j] : 0;
            html += `<td contenteditable="true" class="cell-cost" data-f="${i}" data-c="${j}">${costo}</td>`;
        }
        let oferta = datosGuardados ? datosGuardados.ofertas[i] : 10;
        html += `<td contenteditable="true" class="cell-oferta" style="background-color:#ffe8cc; font-weight:bold;">${oferta}</td></tr>`;
    }
    html += '<tr><th style="background-color:#ffc98d;">Demanda</th>';
    for (let j = 0; j < numCols; j++) {
        let demanda = datosGuardados ? datosGuardados.demandas[j] : 10;
        html += `<td contenteditable="true" class="cell-demanda" style="background-color:#ffe8cc; font-weight:bold;">${demanda}</td>`;
    }
    html += '<td style="background-color:#555; color:white;">-</td></tr></table>';
    container.innerHTML = html;
    document.getElementById("resultados-container").innerHTML = "";
}

function leerDatosTabla() {
    const tabla = document.getElementById("nw-table");
    if (!tabla) return null;
    let nombresFilas = Array.from(document.querySelectorAll(".row-name")).map(el => el.innerText.trim());
    let nombresCols = Array.from(document.querySelectorAll(".col-name")).map(el => el.innerText.trim());
    let costos = [], filasDOM = document.querySelectorAll(".cell-oferta");
    for (let i = 0; i < filasDOM.length; i++) {
        costos.push([]);
        for (let j = 0; j < nombresCols.length; j++) {
            costos[i].push(parseFloat(document.querySelector(`.cell-cost[data-f="${i}"][data-c="${j}"]`).innerText) || 0);
        }
    }
    let ofertas = Array.from(document.querySelectorAll(".cell-oferta")).map(el => parseFloat(el.innerText) || 0);
    let demandas = Array.from(document.querySelectorAll(".cell-demanda")).map(el => parseFloat(el.innerText) || 0);
    return { nombresFilas, nombresCols, costos, ofertas, demandas };
}



// --- ALGORITMO ESQUINA NOROESTE ---
function ejecutarNoroeste(datos) {
    let { ofertas, demandas, costos } = datos;
    let ofTemp = [...ofertas], demTemp = [...demandas];
    let nF = ofertas.length, nC = demandas.length;
    let asignaciones = Array.from({ length: nF }, () => Array(nC).fill(0));
    let i = 0, j = 0, costoTotal = 0, pasos = [];

    while (i < nF && j < nC) {
        let val = Math.min(ofTemp[i], demTemp[j]);
        asignaciones[i][j] = val;
        costoTotal += val * costos[i][j];

        pasos.push({ f: i, c: j, valor: val, ofRes: ofTemp[i] - val, demRes: demTemp[j] - val });

        ofTemp[i] -= val;
        demTemp[j] -= val;
        if (ofTemp[i] === 0 && demTemp[j] === 0) { i++; j++; }
        else if (ofTemp[i] === 0) i++;
        else j++;
    }
    return { asignaciones, costoTotal, pasos };
}

// --- LOGICA DE BALANCEO ---
function balancearProblema(datos) {
    let sumO = datos.ofertas.reduce((a, b) => a + b, 0);
    let sumD = datos.demandas.reduce((a, b) => a + b, 0);
    let mensaje = "";

    if (sumO > sumD) {
        // Falta demanda: Agregar Columna Ficticia
        let dif = sumO - sumD;
        datos.nombresCols.push("Ficticio (D)");
        datos.demandas.push(dif);
        for (let i = 0; i < datos.costos.length; i++) {
            datos.costos[i].push(0);
        }
        mensaje = `Se agregó un Destino Ficticio con demanda de ${dif} para igualar la oferta.`;
    } else if (sumD > sumO) {
        // Falta oferta: Agregar Fila Ficticia
        let dif = sumD - sumO;
        datos.nombresFilas.push("Ficticio (O)");
        datos.ofertas.push(dif);
        datos.costos.push(new Array(datos.demandas.length).fill(0));
        mensaje = `Se agregó un Origen Ficticio con oferta de ${dif} para igualar la demanda.`;
    }

    return { datos, mensaje };
}

// --- RENDERIZADO Y CONTROLADORES ---
function resolverNoroeste() {
    let datosTabla = leerDatosTabla();
    if (!datosTabla) return;

    // 1. Balancear y obtener el mensaje si lo hay
    let { datos, mensaje } = balancearProblema(datosTabla);

    // 2. Refrescar UI con la fila/columna ficticia si se agregó
    generarMatrizUI(datos.ofertas.length, datos.demandas.length, datos);

    // 3. Resolver
    const res = ejecutarNoroeste(datos);
    pintarResultadosFinales(res.asignaciones);

    document.getElementById("resultados-container").innerHTML = `Costo Total: ${res.costoTotal}`;

    // 4. Mostrar el modal si hubo balanceo
    if (mensaje) {
        abrirModal("Balanceo Automático", null, "text");
        document.getElementById("modal-error").textContent = mensaje;
    }
}

async function explicarPasoAPasoNW() {
    let datosTabla = leerDatosTabla();
    if (!datosTabla) return;

    let { datos, mensaje } = balancearProblema(datosTabla);
    generarMatrizUI(datos.ofertas.length, datos.demandas.length, datos);

    const res = ejecutarNoroeste(datos);
    const celdasOferta = document.querySelectorAll(".cell-oferta");
    const celdasDemanda = document.querySelectorAll(".cell-demanda");

    // Si hubo balanceo, mostramos el modal unos segundos antes de empezar
    if (mensaje) {
        abrirModal("Balanceo Automático", null, "text");
        document.getElementById("modal-error").textContent = mensaje;
        await sleep(3500);
        cerrarModal();
    }

    abrirModal("Inicio", null, "text");
    document.getElementById("modal-error").textContent = "Comenzando desde la esquina Noroeste...";
    await sleep(2000); cerrarModal();

    for (let p of res.pasos) {
        let celda = document.querySelector(`.cell-cost[data-f="${p.f}"][data-c="${p.c}"]`);
        celda.style.backgroundColor = "#ffc98d"; // Resaltar paso actual

        abrirModal("Paso", null, "text");
        document.getElementById("modal-error").textContent = `Asignamos ${p.valor} unidades en [${datos.nombresFilas[p.f]}, ${datos.nombresCols[p.c]}]`;
        await sleep(1500); cerrarModal();

        celda.classList.add("highlight-min");
        celda.innerHTML += `<div class='asignacion-badge' style='background:#2a9d8f; color:white; font-size:11px; border-radius:3px; margin-top:4px;'>Asignado: ${p.valor}</div>`;

        // Actualizar valores en la tabla
        celdasOferta[p.f].innerText = p.ofRes;
        celdasDemanda[p.c].innerText = p.demRes;
        await sleep(800);
        celda.style.backgroundColor = "";
    }

    document.getElementById("resultados-container").innerHTML = `Costo Total Final: ${res.costoTotal}`;

    abrirModal("¡Proceso Finalizado!", null, "text");
    document.getElementById("modal-error").textContent = "Se completaron todas las asignaciones posibles.";
    await sleep(3000); cerrarModal();
}

function pintarResultadosFinales(asignaciones) {
    const celdas = document.querySelectorAll(".cell-cost");
    celdas.forEach(celda => {
        let f = parseInt(celda.getAttribute("data-f"));
        let c = parseInt(celda.getAttribute("data-c"));
        if (asignaciones[f][c] > 0) {
            celda.classList.add("highlight-min");
            celda.innerHTML += `<div class='asignacion-badge' style='background:#2a9d8f; color:white; font-size:11px; border-radius:3px; margin-top:4px;'>Asignado: ${asignaciones[f][c]}</div>`;
        }
    });
}
// --- IMPORT / EXPORT ---
function exportarJSON() {
    const datos = leerDatosTabla();
    abrirModal("Nombre del archivo", (nombre) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: "application/json" }));
        a.download = (nombre || "noroeste") + ".json";
        a.click();
    });
}

function exportarPNG() {
    abrirModal("Nombre de la imagen", (nombre) => {
        html2canvas(document.getElementById("nw-container")).then(canvas => {
            const link = document.createElement("a");
            link.download = (nombre || "matriz") + ".png"; link.href = canvas.toDataURL(); link.click();
        });
    });
}

document.getElementById("importarJSON").addEventListener("change", function (e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const d = JSON.parse(ev.target.result);
        generarMatrizUI(d.ofertas.length, d.demandas.length, d);
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]);
});

function limpiarMatriz() {
    // Regresar las celdas a su valor por defecto (0 para costos, 10 para oferta/demanda)
    document.querySelectorAll(".cell-cost").forEach(celda => celda.innerText = "0");
    document.querySelectorAll(".cell-oferta").forEach(celda => celda.innerText = "10");
    document.querySelectorAll(".cell-demanda").forEach(celda => celda.innerText = "10");

    // Limpiar resultados visuales (colores y badges)
    document.querySelectorAll(".cell-cost").forEach(celda => {
        celda.classList.remove("highlight-min", "highlight-max");
        celda.style.backgroundColor = ""; // Limpiar cualquier color en línea
        let badge = celda.querySelector('.asignacion-badge');
        if (badge) badge.remove();
    });

    // Limpiar el texto de resultados finales
    document.getElementById("resultados-container").innerHTML = "";
}