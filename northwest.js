const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let modalCallback = null;
let tipoObjetivoGlobal = 'min';

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

function generarMatrizUI(filasObj = null, colsObj = null, datosGuardados = null) {
    const container = document.getElementById("nw-container");

    let numFilas = datosGuardados ? datosGuardados.nombresFilas.length : (filasObj || parseInt(document.getElementById("input-filas").value));
    let numCols = datosGuardados ? datosGuardados.nombresCols.length : (colsObj || parseInt(document.getElementById("input-cols").value));

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
            let costo = (datosGuardados && datosGuardados.costos[i] && datosGuardados.costos[i][j] !== undefined) ? datosGuardados.costos[i][j] : 0;
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
    let costos = [], ofertas = [], demandas = [];
    document.querySelectorAll(".cell-oferta").forEach(el => ofertas.push(parseFloat(el.innerText) || 0));
    document.querySelectorAll(".cell-demanda").forEach(el => demandas.push(parseFloat(el.innerText) || 0));
    for (let i = 0; i < ofertas.length; i++) {
        let fila = [];
        for (let j = 0; j < demandas.length; j++) {
            let celda = document.querySelector(`.cell-cost[data-f="${i}"][data-c="${j}"]`);
            let valor = celda.getAttribute("data-original") ? parseFloat(celda.getAttribute("data-original")) : parseFloat(celda.innerText);
            fila.push(valor || 0);
        }
        costos.push(fila);
    }
    return { nombresFilas, nombresCols, costos, ofertas, demandas };
}

function balancearProblema(datosOriginales) {
    let d = JSON.parse(JSON.stringify(datosOriginales));
    let sumO = d.ofertas.reduce((a, b) => a + b, 0);
    let sumD = d.demandas.reduce((a, b) => a + b, 0);
    let msg = "";
    if (Math.abs(sumO - sumD) < 0.01) return { datos: d, mensaje: "" };
    if (sumO > sumD) {
        let dif = sumO - sumD;
        d.nombresCols.push("Ficticio"); d.demandas.push(dif);
        for (let i = 0; i < d.costos.length; i++) d.costos[i].push(0);
        msg = `Balanceo: Se agregó Destino Ficticio con ${dif}.`;
    } else {
        let dif = sumD - sumO;
        d.nombresFilas.push("Ficticio"); d.ofertas.push(dif);
        d.costos.push(new Array(d.demandas.length).fill(0));
        msg = `Balanceo: Se agregó Origen Ficticio con ${dif}.`;
    }
    return { datos: d, mensaje: msg };
}

function findCiclo(basicas, start) {
    let nodos = [...basicas, start], path = [];
    function dfs(curr, isRow, goal) {
        path.push(curr);
        if (path.length >= 4 && path.length % 2 === 0) {
            if (isRow && curr.r === goal.r) return true;
            if (!isRow && curr.c === goal.c) return true;
        }
        for (let n of nodos) {
            if (n.r === curr.r && n.c === curr.c) continue;
            if (path.some(p => p.r === n.r && p.c === n.c)) continue;
            if (isRow && n.r === curr.r) { if (dfs(n, false, goal)) return true; }
            else if (!isRow && n.c === curr.c) { if (dfs(n, true, goal)) return true; }
        }
        path.pop(); return false;
    }
    return dfs(start, true, start) ? path : [];
}


function optimizarCompleto(datos, tipoObj) {
    let nF = datos.ofertas.length, nC = datos.demandas.length;
    let asig = Array.from({ length: nF }, () => Array(nC).fill(0));
    let of = [...datos.ofertas], dem = [...datos.demandas];

    let basicasPersistentes = [];
    let i = 0, j = 0;
    while (i < nF && j < nC) {
        let v = Math.min(of[i], dem[j]);
        asig[i][j] = v;
        basicasPersistentes.push({ r: i, c: j });
        of[i] -= v; dem[j] -= v;


        if (tipoObj === 'max' && of[i] === 0 && dem[j] === 0 && (i < nF - 1 || j < nC - 1)) {
            i++;
        } else if (of[i] === 0) {
            i++;
        } else {
            j++;
        }
    }

    let historial = [];
    let iter = 1;
    while (iter <= 30) {
        let u = Array(nF).fill(null), v = Array(nC).fill(null);


        let basicas = [];
        if (tipoObj === 'min') {
            for (let r = 0; r < nF; r++) for (let c = 0; c < nC; c++) if (asig[r][c] > 0) basicas.push({ r, c });
        } else {
            basicas = [...basicasPersistentes];
        }

        if (basicas.length === 0) break;

        let minC = Infinity;
        for (let b of basicas) if (datos.costos[b.r][b.c] < minC && datos.costos[b.r][b.c] !== 0) minC = datos.costos[b.r][b.c];
        u[basicas[0].r] = (minC === Infinity) ? 0 : minC;

        let l = 0;
        while ((u.includes(null) || v.includes(null)) && l < 100) {
            for (let b of basicas) {
                if (u[b.r] !== null && v[b.c] === null) v[b.c] = datos.costos[b.r][b.c] - u[b.r];
                else if (v[b.c] !== null && u[b.r] === null) u[b.r] = datos.costos[b.r][b.c] - v[b.c];
            }
            l++;
        }
        for (let k = 0; k < nF; k++) if (u[k] === null) u[k] = 0;
        for (let k = 0; k < nC; k++) if (v[k] === null) v[k] = 0;

        let mGen = Array.from({ length: nF }, () => Array(nC).fill(0));
        let mRes = Array.from({ length: nF }, () => Array(nC).fill(0));
        let mejorVal = tipoObj === 'min' ? -Infinity : Infinity;
        let celdaE = null;

        for (let r = 0; r < nF; r++) {
            for (let c = 0; c < nC; c++) {
                mGen[r][c] = u[r] + v[c];
                mRes[r][c] = mGen[r][c] - datos.costos[r][c];
                if (!basicas.some(b => b.r === r && b.c === c)) {
                    if (tipoObj === 'min' && mRes[r][c] > mejorVal && mRes[r][c] > 0) { mejorVal = mRes[r][c]; celdaE = { r, c }; }
                    else if (tipoObj === 'max' && mRes[r][c] < mejorVal && mRes[r][c] < 0) { mejorVal = mRes[r][c]; celdaE = { r, c }; }
                }
            }
        }

        let suma = 0, opStr = "";

        for (let r = 0; r < nF; r++) for (let c = 0; c < nC; c++) if (asig[r][c] > 0) {
            suma += asig[r][c] * datos.costos[r][c];
            opStr += `(${asig[r][c]}×${datos.costos[r][c]}) + `;
        }

        let paso = {
            iteracion: iter, asigActual: asig.map(r => [...r]), mGen, mRes, celdaE, u: [...u], v: [...v],
            costoTotal: suma, calculoTexto: opStr ? opStr.slice(0, -3) : "0"
        };

        if (!celdaE) { historial.push(paso); break; }

        let path = findCiclo(basicas, celdaE);
        if (path.length === 0) { historial.push(paso); break; }

        let omega = Infinity;
        let celdaSalida = null;
        for (let k = 1; k < path.length; k += 2) {
            if (asig[path[k].r][path[k].c] < omega) {
                omega = asig[path[k].r][path[k].c];
                celdaSalida = { r: path[k].r, c: path[k].c };
            }
        }

        if (omega === Infinity) { historial.push(paso); break; }

        paso.omegaVal = omega;
        paso.omegaPath = path;
        historial.push(paso);

        for (let k = 0; k < path.length; k++) {
            if (k % 2 === 0) asig[path[k].r][path[k].c] += omega;
            else asig[path[k].r][path[k].c] -= omega;
        }


        if (tipoObj === 'max') {
            basicasPersistentes.push(celdaE);
            if (celdaSalida) {
                basicasPersistentes = basicasPersistentes.filter(b => !(b.r === celdaSalida.r && b.c === celdaSalida.c));
            }
        }

        iter++;
    }
    return historial;
}

function crearTablaBloque(matriz, titulo, u = null, v = null, resaltado = null, path = null) {
    let html = `<div style="display:inline-block; margin: 10px; vertical-align: top;">
                <h5 style="margin-bottom:8px; color:#d9825b; font-weight: 600;">${titulo}</h5>
                <table style="border-collapse:collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">`;
    for (let i = 0; i < matriz.length; i++) {
        html += `<tr>`;
        for (let j = 0; j < matriz[i].length; j++) {
            let cellStyle = "padding:8px; min-width:35px; border: 1px solid #f0f0f0;";
            let content = matriz[i][j];
            if (resaltado && resaltado.r === i && resaltado.c === j) cellStyle += "background:#d9825b; color:white; font-weight:bold;";
            if (path) {
                let idx = path.findIndex(p => p.r === i && p.c === j);
                if (idx !== -1) {
                    cellStyle += "border: 2px solid #e8a16c; background:#fffbf9;";
                    content += idx % 2 === 0 ? " (+ω)" : " (-ω)";
                }
            }
            html += `<td style="${cellStyle}">${content}</td>`;
        }
        if (u) html += `<td style="background: #e8a16c; color: white; font-weight: bold; padding: 8px; border-left: 2px solid white;">${u[i]}</td>`;
        html += `</tr>`;
    }
    if (v) {
        html += `<tr>`;
        for (let val of v) html += `<td style="background: #e8a16c; color: white; font-weight: bold; padding: 8px; border-top: 2px solid white;">${val}</td>`;
        if (u) html += `<td style="background:white;"></td>`;
        html += `</tr>`;
    }
    html += `</table></div>`;
    return html;
}

async function explicarPasoAPasoNW() {
    let d = leerDatosTabla(); if (!d) return;
    let { datos, mensaje } = balancearProblema(d);

    if (mensaje) {
        generarMatrizUI(datos.ofertas.length, datos.demandas.length, datos);
    }

    let historial = optimizarCompleto(datos, tipoObjetivoGlobal);
    let animBox = document.getElementById("animacion-container");
    if (!animBox) return;

    animBox.innerHTML = `<h2 style="color:#d9825b; margin: 40px 0 20px; text-align:center; font-weight: 700;">Desglose del Método</h2>`;
    if (mensaje) animBox.innerHTML += `<p style="color:#d9534f; text-align:center;">⚠ ${mensaje}</p>`;

    for (let p of historial) {
        let card = document.createElement("div");
        card.className = "card";
        card.style.marginBottom = "30px"; card.style.width = "100%";

        let htmlContent = `<summary>Iteración ${p.iteracion}</summary>
            <div class="contenido-card">
                <div style="display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom: 25px;">
                    ${crearTablaBloque(p.asigActual, "Asignación Actual")}
                    <div style="font-size: 24px; color: #d9825b;">➔</div>
                    ${crearTablaBloque(p.mGen, "Matriz (U+V)", p.u, p.v)}
                    <div style="font-size: 24px; color: #d9825b;">-</div>
                    ${crearTablaBloque(datos.costos, "Original")}
                    <div style="font-size: 24px; color: #d9825b;">=</div>
                    ${crearTablaBloque(p.mRes, "Resta (Índices)", null, null, p.celdaE)}
                </div>`;

        if (p.celdaE && p.omegaPath) {
            htmlContent += `<div style="padding:15px; border-left: 4px solid #e8a16c; background: #fffbf9; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin:0; font-weight:600;">Fase Omega (ω)</p>
                <div style="display:flex; justify-content:center; align-items:center; gap:20px; flex-wrap: wrap; margin-top:10px;">
                    ${crearTablaBloque(p.asigActual, "Camino", null, null, null, p.omegaPath)}
                    <div style="text-align:left; font-size: 14px; color: #666;">
                        <p>• <b>ω:</b> ${p.omegaVal}</p>
                    </div>
                </div>
            </div>`;
        }

        htmlContent += `<div style="background: #fff4e6; color: #d9825b; padding: 15px; border-radius: 12px; font-family: monospace; font-size: 14px; border: 1px solid #f2e1d0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); margin-top: 15px;">
            <p style="margin:0; color: #8c5a44; font-weight: bold; margin-bottom: 5px;">Cálculo del Costo Total:</p>
            ${p.calculoTexto} = <b style="font-size: 19px; color: #d9825b;">${p.costoTotal}</b>
        </div></div>`;

        card.innerHTML = htmlContent;
        animBox.appendChild(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
        await sleep(3500);
    }
    let finalCard = document.createElement("div");
    finalCard.className = "card"; finalCard.style.textAlign = "center";
    finalCard.style.background = "#d9825b"; finalCard.style.color = "white";
    finalCard.innerHTML = `<h3 style="margin:0;">MÉTODO FINALIZADO, SOLUCIÓN ÓPTIMA ALCANZADA</h3>`;
    animBox.appendChild(finalCard);
    finalCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

async function resolverNoroesteObj(tipo) {
    tipoObjetivoGlobal = tipo;
    let d = leerDatosTabla(); if (!d) return;

    document.querySelectorAll(".cell-cost").forEach(celda => {
        celda.style.backgroundColor = "transparent";
        celda.style.color = "#333";
        celda.style.fontWeight = "normal";
        if (celda.getAttribute("data-original")) celda.innerText = celda.getAttribute("data-original");
    });

    let { datos, mensaje } = balancearProblema(d);

    generarMatrizUI(datos.ofertas.length, datos.demandas.length, datos);

    document.querySelectorAll(".cell-cost").forEach(celda => {
        if (!celda.getAttribute("data-original")) celda.setAttribute("data-original", celda.innerText);
    });

    let h = optimizarCompleto(datos, tipo);
    let final = h[h.length - 1];

    const celdas = document.querySelectorAll(".cell-cost");
    for (let c of celdas) {
        let f = parseInt(c.dataset.f);
        let col = parseInt(c.dataset.c);
        let v = (final.asigActual[f] && final.asigActual[f][col] !== undefined) ? final.asigActual[f][col] : 0;


        if (v > 0) {
            await sleep(250);
            c.style.transition = "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            c.style.backgroundColor = "#d9825b";
            c.style.color = "white";
            c.style.fontWeight = "bold";
            c.innerText = v;
            c.style.transform = "scale(1.1)";
            setTimeout(() => { c.style.transform = "scale(1)"; }, 250);
        } else {
            c.innerText = "0";
        }
    }

    let resultadoHTML = `<div class="card" style="padding:15px; text-align:center; color: #d9825b; font-weight: bold;">Resultado: ${final.costoTotal}</div>`;
    if (mensaje) {
        resultadoHTML += `<div style="text-align:center; color:#d9534f; margin-top:10px; font-weight:bold;">⚠ ${mensaje}</div>`;
    }
    document.getElementById("resultados-container").innerHTML = resultadoHTML;
}

function limpiarMatriz() {
    document.querySelectorAll(".cell-cost").forEach(c => {
        c.innerText = "0";
        c.removeAttribute("data-original");
        c.style.backgroundColor = "transparent";
        c.style.color = "#333";
        c.style.fontWeight = "normal";
    });
    document.querySelectorAll(".cell-oferta").forEach(el => el.innerText = "0");
    document.querySelectorAll(".cell-demanda").forEach(el => el.innerText = "0");
    document.getElementById("resultados-container").innerHTML = "";
    if (document.getElementById("animacion-container")) document.getElementById("animacion-container").innerHTML = "";
}

function exportarJSON() {
    let datos = leerDatosTabla();

    let indexFilaFicticia = datos.nombresFilas.indexOf("Ficticio");
    if (indexFilaFicticia !== -1) {
        datos.nombresFilas.splice(indexFilaFicticia, 1);
        datos.ofertas.splice(indexFilaFicticia, 1);
        datos.costos.splice(indexFilaFicticia, 1);
    }

    let indexColFicticia = datos.nombresCols.indexOf("Ficticio");
    if (indexColFicticia !== -1) {
        datos.nombresCols.splice(indexColFicticia, 1);
        datos.demandas.splice(indexColFicticia, 1);
        for (let i = 0; i < datos.costos.length; i++) {
            datos.costos[i].splice(indexColFicticia, 1);
        }
    }

    abrirModal("Nombre del archivo", (n) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: "application/json" }));
        a.download = (n || "transporte_laris") + ".json";
        a.click();
    });
}

function exportarPNG() {
    abrirModal("Nombre de la imagen", (n) => {
        html2canvas(document.getElementById("nw-container")).then(canvas => {
            const link = document.createElement("a");
            link.download = (n || "matriz") + ".png"; link.href = canvas.toDataURL(); link.click();
        });
    });
}

document.getElementById("importarJSON").addEventListener("change", function (e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const d = JSON.parse(ev.target.result);
            generarMatrizUI(d.ofertas.length, d.demandas.length, d);
            e.target.value = "";
        } catch (err) {
            alert("Error al leer el archivo JSON");
            e.target.value = "";
        }
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]);
});

function abrirHelp() {
    document.getElementById("help-modal").classList.add("active");
}

function cerrarHelp() {
    document.getElementById("help-modal").classList.remove("active");
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes saltito {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}`;
document.head.appendChild(style);


function abrirModalA(titulo, callback = null, tipo = "text") {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-input");
    input.value = "";
    input.type = tipo;
    document.getElementById("modal-error").textContent = "";
    input.style.display = callback ? "block" : "none";
    document.getElementById("modal").classList.add("active");
    modalCallback = callback;
    if (callback) input.focus();
}

function cerrarModalA() {
    document.getElementById("modal").classList.remove("active");
}

function confirmarModalA() {
    const input = document.getElementById("modal-input");
    if (input.style.display !== "none") {
        if (input.value.trim() === "") {
            document.getElementById("modal-error").textContent = "El campo no puede estar vacío.";
            return;
        }
        if (modalCallback && modalCallback(input.value.trim()) === false) return;
    }
    cerrarModalA();
}