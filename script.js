const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let nodos = [];
let aristas = [];
let modo = "nodo";
let nodoSeleccionado = null;
let radio = 30;
let nodoHover = null;
let nodoActivo = null;
let ultimoTipoJohnson = 'max';

let nodoArrastrado = null;
let dragHasMoved = false;

function oscurecerHex(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.max(0, Math.floor(r * (1 - factor)));
    g = Math.max(0, Math.floor(g * (1 - factor)));
    b = Math.max(0, Math.floor(b * (1 - factor)));

    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

let offsetLinea = 0;
let tiempoAnimacion = 0;

const animStyle = document.createElement('style');
animStyle.innerHTML = `
    @keyframes popInCell {
        0% { opacity: 0; transform: scale(0.3) translateY(15px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .celda-animada {
        opacity: 0;
        animation: popInCell 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
`;
document.head.appendChild(animStyle);

function animarFlujoCanvas() {
    offsetLinea += 0.6;
    tiempoAnimacion += 0.08;
    dibujar();
    requestAnimationFrame(animarFlujoCanvas);
}

requestAnimationFrame(animarFlujoCanvas);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generarColor() {
    const colores = [
        "#c8c29e", "#e99897", "#abcbd3", "#ffc98d",
        "#e1d3b6", "#c0a290", "#ffb284", "#2a9d8f", "#ff9f1c",
    ];
    return colores[Math.floor(Math.random() * colores.length)];
}

function cambiarModo(valor, boton) {
    modo = valor;
    nodoSeleccionado = null;
    nodoActivo = null;

    document.querySelectorAll(".modo-btn").forEach(btn => {
        btn.classList.remove("activo");
    });

    boton.classList.add("activo");
    dibujar();
}

canvas.addEventListener("mousedown", function (e) {
    if (modo !== "editar") return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    nodoArrastrado = obtenerNodo(x, y);
    if (nodoArrastrado) dragHasMoved = false;
});

canvas.addEventListener("mouseup", function () {
    if (nodoArrastrado) {
        nodoArrastrado = null;
        setTimeout(() => dragHasMoved = false, 100);
    }
});

canvas.addEventListener("click", function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodo = obtenerNodo(x, y);
    const arista = obtenerArista(x, y);

    if (modo === "nodo") {
        nodoActivo = null;
        abrirModal("Nombre del nodo", function (nombre) {
            if (!nombre) return;
            nodos.push({ x, y, nombre, temprano: null, tardio: null });
            dibujar();
        });
        return;
    }

    if (modo === "arista") {
        if (!nodo) return;

        nodoActivo = nodo;
        dibujar();

        if (!nodoSeleccionado) {
            nodoSeleccionado = nodo;
            return;
        }

        const yaExiste = aristas.some(a =>
            a.desde === nodoSeleccionado && a.hasta === nodo
        );

        if (yaExiste) {
            abrirModal("Advertencia", null, "text", false);
            document.getElementById("modal-error").textContent = "La arista ya existe.";
            nodoSeleccionado = null;
            nodoActivo = null;
            return;
        }

        abrirModal("Peso de la arista", function (peso) {
            if (isNaN(peso) || peso <= 0) {
                document.getElementById("modal-error").textContent = "Ingrese un número válido.";
                return false;
            }

            aristas.push({
                desde: nodoSeleccionado,
                hasta: nodo,
                peso: parseFloat(peso),
                dirigida: document.getElementById("modal-dirigida-check").checked,
                color: generarColor(),
                holgura: null,
                critica: false,
                enSolucion: false
            });

            nodoSeleccionado = null;
            nodoActivo = null;
            dibujar();
        }, "number", true, true);
    }

    if (modo === "borrar") {
        if (nodo) {
            aristas = aristas.filter(a => a.desde !== nodo && a.hasta !== nodo);
            nodos = nodos.filter(n => n !== nodo);
            dibujar();
            return;
        }
        if (arista) {
            aristas = aristas.filter(a => a !== arista);
            dibujar();
        }
        return;
    }

    if (modo === "editar") {
        if (nodo) {
            if (dragHasMoved) return;

            abrirModal("Nuevo nombre del nodo", function (nombre) {
                if (!nombre) return false;
                nodo.nombre = nombre;
                dibujar();
            });
            return;
        }

        if (arista) {
            abrirModal("Nuevo peso de la arista", function (peso) {
                if (isNaN(peso) || peso <= 0) {
                    document.getElementById("modal-error").textContent = "Ingrese un número válido.";
                    return false;
                }
                arista.peso = parseFloat(peso);
                dibujar();
            }, "number");
            return;
        }
    }
});

canvas.addEventListener("mousemove", function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (nodoArrastrado && modo === "editar") {
        nodoArrastrado.x = x;
        nodoArrastrado.y = y;
        dragHasMoved = true;
        dibujar();
        return;
    }

    nodoHover = obtenerNodo(x, y);

    if (modo === "editar" && nodoHover) {
        canvas.style.cursor = "grab";
    } else if (modo === "editar" && nodoArrastrado) {
        canvas.style.cursor = "grabbing";
    } else {
        canvas.style.cursor = nodoHover ? "pointer" : "default";
    }

    dibujar();
});


function obtenerNodo(x, y) {
    return nodos.find(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < radio);
}

function obtenerArista(x, y) {
    for (let arista of aristas) {
        const x1 = arista.desde.x;
        const y1 = arista.desde.y;
        const x2 = arista.hasta.x;
        const y2 = arista.hasta.y;

        if (arista.desde === arista.hasta) {
            const loopX = x1;
            const loopY = y1 - 50;
            const loopRadius = 30;
            const dx = x - loopX;
            const dy = y - loopY;
            const distancia = Math.sqrt(dx * dx + dy * dy);

            if (Math.abs(distancia - loopRadius) < 15) {
                return arista;
            }
            continue;
        }

        let offset = 0;
        const existeInversa = aristas.some(a =>
            a.desde === arista.hasta && a.hasta === arista.desde && a !== arista
        );

        if (existeInversa) offset = 40;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normX = dx / dist;
        const normY = dy / dist;

        const startX = x1 + normX * radio;
        const startY = y1 + normY * radio;
        const endX = x2 - normX * radio;
        const endY = y2 - normY * radio;

        const controlX = (startX + endX) / 2 - normY * offset;
        const controlY = (startY + endY) / 2 + normX * offset;

        for (let t = 0; t <= 1; t += 0.05) {
            const px = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
            const py = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
            const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (d < 15) return arista;
        }
    }
    return null;
}

function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    aristas.forEach(arista => dibujarArista(arista));
    nodos.forEach(nodo => dibujarNodo(nodo));
}

function dibujarNodo(nodo) {
    ctx.beginPath();

    let radioDinamico = radio;
    if (nodo === nodoActivo) {
        radioDinamico = radio + Math.sin(tiempoAnimacion) * 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#c75f2f";
    } else {
        ctx.shadowBlur = 0;
    }

    ctx.arc(nodo.x, nodo.y, radioDinamico, 0, Math.PI * 2);

    if (nodo !== nodoHover && nodo !== nodoActivo) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "#d9825b";
        ctx.lineWidth = 3;
    }

    if (nodo === nodoHover && nodo !== nodoActivo) {
        const gradient = ctx.createLinearGradient(nodo.x - radio, nodo.y - radio, nodo.x + radio, nodo.y + radio);
        gradient.addColorStop(0, "#f6b38a");
        gradient.addColorStop(1, "#e27d4f");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#d9825b";
        ctx.lineWidth = 3;
    }

    if (nodo === nodoActivo) {
        const gradient = ctx.createLinearGradient(nodo.x - radio, nodo.y - radio, nodo.x + radio, nodo.y + radio);
        gradient.addColorStop(0, "#e27d4f");
        gradient.addColorStop(1, "#c75f2f");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#b54c1f";
        ctx.lineWidth = 4;
    }

    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = nodo === nodoHover || nodo === nodoActivo ? "white" : "#d9825b";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(nodo.nombre, nodo.x, nodo.y);

    ctx.font = "12px Arial";
    ctx.fillStyle = "#333";

    if (nodo.temprano !== null) {
        ctx.textAlign = "right";
        ctx.fillText(nodo.temprano, nodo.x - radioDinamico - 10, nodo.y);
    }
    if (nodo.tardio !== null) {
        ctx.textAlign = "left";
        ctx.fillText(nodo.tardio, nodo.x + radioDinamico + 10, nodo.y);
    }
}
function dibujarArista(arista) {
    const desde = arista.desde;
    const hasta = arista.hasta;

    let color = arista.color;
    let grosor = 2;

    ctx.save();

    if (arista.critica) {
        color = "#e63946";
        grosor = 4;
        ctx.setLineDash([15, 10]);
        ctx.lineDashOffset = -offsetLinea;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
    } else if (arista.enSolucion) {
        color = "#e63946";
        grosor = 4;
        ctx.setLineDash([15, 10]);
        ctx.lineDashOffset = -offsetLinea;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
    } else {
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    if (desde === hasta) {
        const loopRadius = 30;
        const loopX = desde.x;
        const loopY = desde.y - 50;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = grosor;
        ctx.arc(loopX, loopY, loopRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";

        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(arista.peso, loopX, loopY - loopRadius - 10);

        ctx.fillStyle = oscurecerHex(color, 0.35);
        ctx.fillText(arista.peso, loopX, loopY - loopRadius - 10);

        if (arista.dirigida) {
            dibujarFlecha(loopX + loopRadius, loopY, Math.PI / 2, color);
        }
        ctx.restore();
        return;
    }

    let offset = 0;
    const existeInversa = aristas.some(a => a.desde === hasta && a.hasta === desde && a !== arista);
    if (existeInversa) offset = 40;

    const dx = hasta.x - desde.x;
    const dy = hasta.y - desde.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normX = dx / dist;
    const normY = dy / dist;

    const startX = desde.x + normX * radio;
    const startY = desde.y + normY * radio;
    const endX = hasta.x - normX * radio;
    const endY = hasta.y - normY * radio;

    const controlX = (startX + endX) / 2 - normY * offset;
    const controlY = (startY + endY) / 2 + normX * offset;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();

    if (arista.dirigida) {
        const angle = Math.atan2(endY - controlY, endX - controlX);
        dibujarFlecha(endX, endY, angle, color);
    }

    ctx.shadowBlur = 0;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText(arista.peso, controlX, controlY);

    ctx.fillStyle = oscurecerHex(color, 0.45);
    ctx.fillText(arista.peso, controlX, controlY);

    if (arista.holgura !== null) {
        ctx.font = "12px Arial";
        ctx.fillStyle = "#444";
        ctx.fillText("H=" + arista.holgura, controlX, controlY + 16);
    }

    ctx.restore();
}

function dibujarFlecha(x, y, angle, color) {
    const size = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - size * Math.cos(angle - Math.PI / 6),
        y - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x - size * Math.cos(angle + Math.PI / 6),
        y - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function limpiarGrafo() {
    nodos = [];
    aristas = [];
    nodoSeleccionado = null;
    document.getElementById("matriz-container").innerHTML = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

let modalCallback = null;
function abrirModal(titulo, callback = null, tipo = "text", mostrarInput = true, mostrarDirigida = false) {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-input");
    const error = document.getElementById("modal-error");
    const dirigidaLabel = document.getElementById("modal-dirigida");
    const dirigidaCheck = document.getElementById("modal-dirigida-check");

    input.value = "";
    input.type = tipo;
    error.textContent = "";

    input.style.display = mostrarInput ? "block" : "none";
    dirigidaLabel.style.display = mostrarDirigida ? "block" : "none";
    dirigidaCheck.checked = false;

    document.getElementById("modal").classList.add("active");
    modalCallback = callback;
}

function cerrarModal() {
    document.getElementById("modal").classList.remove("active");
}

function confirmarModal() {
    const input = document.getElementById("modal-input");
    const valor = input.value.trim();

    if (input.style.display !== "none") {
        if (valor === "") {
            document.getElementById("modal-error").textContent = "El campo no puede estar vacío.";
            return;
        }
        if (modalCallback) {
            const resultado = modalCallback(valor);
            if (resultado === false) return;
        }
    }
    cerrarModal();
}

function animarNodo() {
    let animando = true;
    function frame() {
        animando = false;
        nodos.forEach(n => {
            if (n.scale < 1) {
                n.scale += 0.08;
                animando = true;
            }
        });
        dibujar();
        if (animando) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function generarMatriz() {
    if (nodos.length === 0) return;
    const container = document.getElementById("matriz-container");
    container.innerHTML = "";
    const n = nodos.length;

    let matriz = Array.from({ length: n }, () => Array(n).fill(0));

    aristas.forEach(arista => {
        const i = nodos.indexOf(arista.desde);
        const j = nodos.indexOf(arista.hasta);
        matriz[i][j] += arista.peso;
        if (!arista.dirigida) {
            matriz[j][i] += arista.peso;
        }
    });

    const tabla = document.createElement("table");
    let sumColumnas = Array(n).fill(0);
    let countColumnas = Array(n).fill(0);
    let sumFilas = [];
    let countFilas = [];

    const header = document.createElement("tr");
    header.appendChild(document.createElement("th"));

    nodos.forEach(nodo => {
        const th = document.createElement("th");
        th.textContent = nodo.nombre;
        header.appendChild(th);
    });

    header.appendChild(Object.assign(document.createElement("th"), { textContent: "Suma Fila" }));
    header.appendChild(Object.assign(document.createElement("th"), { textContent: "Count" }));
    tabla.appendChild(header);

    matriz.forEach((fila, i) => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = nodos[i].nombre;
        tr.appendChild(th);

        let sumaFila = 0;
        let countFila = 0;

        fila.forEach((valor, j) => {
            const td = document.createElement("td");
            td.textContent = valor === 0 ? "" : valor;
            td.classList.add("matriz-cell");
            tr.appendChild(td);

            sumaFila += valor;
            if (valor !== 0) {
                countFila++;
                countColumnas[j]++;
            }
            sumColumnas[j] += valor;
        });

        sumFilas.push(sumaFila);
        countFilas.push(countFila);

        const tdSum = document.createElement("td");
        tdSum.textContent = sumaFila;
        tdSum.classList.add("suma-cell");
        tr.appendChild(tdSum);

        const tdCount = document.createElement("td");
        tdCount.textContent = countFila;
        tdCount.classList.add("count-cell");
        tr.appendChild(tdCount);

        tabla.appendChild(tr);
    });

    const trSumCol = document.createElement("tr");
    trSumCol.appendChild(Object.assign(document.createElement("th"), { textContent: "Suma Col" }));
    sumColumnas.forEach(valor => {
        const td = document.createElement("td");
        td.textContent = valor;
        td.classList.add("suma-cell");
        trSumCol.appendChild(td);
    });
    trSumCol.appendChild(document.createElement("td"));
    trSumCol.appendChild(document.createElement("td"));
    tabla.appendChild(trSumCol);

    const trCountCol = document.createElement("tr");
    trCountCol.appendChild(Object.assign(document.createElement("th"), { textContent: "Count Col" }));
    countColumnas.forEach(valor => {
        const td = document.createElement("td");
        td.textContent = valor;
        td.classList.add("count-cell");
        trCountCol.appendChild(td);
    });
    trCountCol.appendChild(document.createElement("td"));
    trCountCol.appendChild(document.createElement("td"));
    tabla.appendChild(trCountCol);

    container.appendChild(tabla);

    const maxSumaFila = Math.max(...sumFilas);
    const maxSumaCol = Math.max(...sumColumnas);
    const maxCountFila = Math.max(...countFilas);
    const maxCountCol = Math.max(...countColumnas);

    const info = document.createElement("div");
    info.style.marginTop = "15px";
    info.innerHTML = `
        <p>Máximo Suma Fila: ${maxSumaFila}</p>
        <p>Máximo Suma Columna: ${maxSumaCol}</p>
        <p>Máximo Count Fila: ${maxCountFila}</p>
        <p>Máximo Count Columna: ${maxCountCol}</p>
    `;
    container.appendChild(info);
}

function abrirHelp() {
    document.getElementById("help-modal").classList.add("active");
}

function cerrarHelp() {
    document.getElementById("help-modal").classList.remove("active");
}

function exportarJSON() {
    abrirModal("Nombre del archivo", function (nombre) {
        if (!nombre) nombre = "mi_grafo";

        const grafo = {
            ultimoTipoJohnson: ultimoTipoJohnson,
            nodos: nodos.map(n => ({
                x: n.x,
                y: n.y,
                nombre: n.nombre,
                temprano: n.temprano,
                tardio: n.tardio
            })),
            aristas: aristas.map(a => ({
                desde: nodos.indexOf(a.desde),
                hasta: nodos.indexOf(a.hasta),
                peso: a.peso,
                dirigida: a.dirigida,
                color: a.color,
                holgura: a.holgura,
                critica: a.critica,
                enSolucion: a.enSolucion || false
            }))
        };

        const dataStr = JSON.stringify(grafo, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = nombre + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

document.getElementById("importarJSON").addEventListener("change", function (e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();

    lector.onload = function (event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.ultimoTipoJohnson) {
                ultimoTipoJohnson = data.ultimoTipoJohnson;
            } else {
                ultimoTipoJohnson = 'max';
            }

            nodos = data.nodos.map(n => ({
                x: n.x,
                y: n.y,
                nombre: n.nombre,
                temprano: n.temprano !== undefined ? n.temprano : null,
                tardio: n.tardio !== undefined ? n.tardio : null
            }));

            aristas = data.aristas.map(a => ({
                desde: nodos[a.desde],
                hasta: nodos[a.hasta],
                peso: a.peso,
                dirigida: a.dirigida,
                color: a.color || generarColor(),
                holgura: a.holgura !== undefined ? a.holgura : null,
                critica: a.critica || false,
                enSolucion: a.enSolucion || false
            }));

            e.target.value = "";
            dibujar();
        } catch (error) {
            console.error("Error al analizar el JSON:", error);
            alert("El archivo JSON no es válido o está corrupto.");
        }
    };
    lector.readAsText(archivo);
});

function exportarPNG() {
    abrirModal("Nombre de la imagen", function (nombre) {
        const link = document.createElement("a");
        link.download = nombre + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

function ordenTopologico() {
    let visitados = new Set();
    let orden = [];

    function dfs(nodo) {
        if (visitados.has(nodo)) return;
        visitados.add(nodo);
        aristas.forEach(a => {
            if (a.desde === nodo) {
                dfs(a.hasta);
            }
        });
        orden.unshift(nodo);
    }
    nodos.forEach(n => dfs(n));
    return orden;
}

function resolverJohnson() {
    ultimoTipoJohnson = 'max';
    if (nodos.length === 0) return;

    nodos.forEach(n => {
        n.temprano = 0;
        n.tardio = Infinity;
    });
    // Limpiamos las aristas para que no queden rastros de asignación u otros resultados
    aristas.forEach(a => { a.critica = false; a.enSolucion = false; });

    let orden = ordenTopologico();
    if (orden.length > 0) orden[0].temprano = 0;

    orden.forEach(nodo => {
        aristas.forEach(a => {
            if (a.desde === nodo) {
                let tiempo = nodo.temprano + a.peso;
                if (tiempo > a.hasta.temprano) {
                    a.hasta.temprano = tiempo;
                }
            }
        });
    });

    let duracionProyecto = Math.max(...nodos.map(n => n.temprano));
    nodos.forEach(n => {
        const tieneSalida = aristas.some(a => a.desde === n);
        if (!tieneSalida) n.tardio = duracionProyecto;
    });

    [...orden].reverse().forEach(nodo => {
        aristas.forEach(a => {
            if (a.desde === nodo) {
                let tiempo = a.hasta.tardio - a.peso;
                if (tiempo < nodo.tardio) {
                    nodo.tardio = tiempo;
                }
            }
        });
    });

    aristas.forEach(a => {
        a.holgura = a.hasta.tardio - a.desde.temprano - a.peso;
        if (Math.abs(a.holgura) < 0.01 &&
            a.desde.temprano === a.desde.tardio &&
            a.hasta.temprano === a.hasta.tardio) {
            a.critica = true;
        }
    });
    dibujar();
}

function resolverJohnsonMinimo() {
    ultimoTipoJohnson = 'min';
    if (nodos.length === 0) return;

    nodos.forEach(n => {
        n.temprano = Infinity;
        n.tardio = -Infinity;
    });

    // Limpiamos
    aristas.forEach(a => {
        a.critica = false;
        a.holgura = null;
        a.enSolucion = false;
    });

    let orden = ordenTopologico();
    if (orden.length > 0) orden[0].temprano = 0;

    orden.forEach(nodo => {
        aristas.forEach(a => {
            if (a.desde === nodo && nodo.temprano !== Infinity) {
                let tiempo = nodo.temprano + a.peso;
                if (tiempo < a.hasta.temprano) {
                    a.hasta.temprano = tiempo;
                }
            }
        });
    });

    nodos.forEach(n => {
        const tieneSalida = aristas.some(a => a.desde === n);
        if (!tieneSalida) {
            n.tardio = (n.temprano !== Infinity) ? n.temprano : 0;
        }
    });

    [...orden].reverse().forEach(nodo => {
        aristas.forEach(a => {
            if (a.desde === nodo && a.hasta.tardio !== -Infinity) {
                let tiempo = a.hasta.tardio - a.peso;
                if (tiempo > nodo.tardio) {
                    nodo.tardio = tiempo;
                }
            }
        });
    });

    aristas.forEach(a => {
        a.holgura = a.hasta.tardio - a.desde.temprano - a.peso;
        if (Math.abs(a.holgura) < 0.01 &&
            a.desde.temprano === a.desde.tardio &&
            a.hasta.temprano === a.hasta.tardio) {
            a.critica = true;
        }
    });
    dibujar();
}

async function explicarPasoAPaso() {
    if (nodos.length === 0) return;

    nodos.forEach(n => {
        n.temprano = ultimoTipoJohnson === 'max' ? 0 : Infinity;
        n.tardio = ultimoTipoJohnson === 'max' ? null : -Infinity;
    });
    aristas.forEach(a => { a.holgura = null; a.critica = false; a.enSolucion = false; });
    dibujar();

    abrirModal("Paso 1: Cálculo de Ida", null, "text", false);
    document.getElementById("modal-error").textContent =
        ultimoTipoJohnson === 'max'
            ? "Calculando los valores buscando el MÁXIMO (Early Start)."
            : "Calculando los valores buscando la RUTA MÁS CORTA (mínimo).";
    await sleep(3000);
    cerrarModal();

    let orden = ordenTopologico();
    if (orden.length > 0) orden[0].temprano = 0;

    for (let nodo of orden) {
        nodoActivo = nodo;
        dibujar();

        aristas.forEach(a => {
            if (a.desde === nodo && (ultimoTipoJohnson === 'max' || nodo.temprano !== Infinity)) {
                let nuevo = nodo.temprano + a.peso;

                if (ultimoTipoJohnson === 'max') {
                    if (nuevo > a.hasta.temprano) a.hasta.temprano = nuevo;
                } else {
                    if (nuevo < a.hasta.temprano) a.hasta.temprano = nuevo;
                }
            }
        });
        await sleep(1000);
    }
    nodoActivo = null;
    dibujar();

    abrirModal("Paso 2: Cálculo de Vuelta", null, "text", false);
    document.getElementById("modal-error").textContent =
        ultimoTipoJohnson === 'max'
            ? "Calculando los valores desde el final buscando el MENOR posible"
            : "Calculando los valores desde el final buscando el MAYOR posible para las holguras.";
    await sleep(3500);
    cerrarModal();

    if (ultimoTipoJohnson === 'max') {
        let duracionMax = Math.max(...nodos.map(n => n.temprano));
        nodos.forEach(n => n.tardio = duracionMax);
    } else {
        nodos.forEach(n => {
            const tieneSalida = aristas.some(a => a.desde === n);
            if (!tieneSalida) n.tardio = (n.temprano !== Infinity) ? n.temprano : 0;
        });
    }

    for (let nodo of [...orden].reverse()) {
        nodoActivo = nodo;
        dibujar();

        aristas.forEach(a => {
            if (a.desde === nodo) {
                if (ultimoTipoJohnson === 'max') {
                    let nuevo = a.hasta.tardio - a.peso;
                    if (nuevo < nodo.tardio) nodo.tardio = nuevo;
                } else {
                    if (a.hasta.tardio !== -Infinity) {
                        let nuevo = a.hasta.tardio - a.peso;
                        if (nuevo > nodo.tardio) nodo.tardio = nuevo;
                    }
                }
            }
        });
        await sleep(1000);
    }
    nodoActivo = null;
    dibujar();

    abrirModal("Paso 3: Holguras", null, "text", false);
    document.getElementById("modal-error").textContent = "Determinando la Holgura de cada arista";
    await sleep(3000);
    cerrarModal();

    for (let a of aristas) {
        a.holgura = a.hasta.tardio - a.desde.temprano - a.peso;
        dibujar();
        await sleep(500);
    }

    abrirModal("Paso 4: Resultados", null, "text", false);
    document.getElementById("modal-error").textContent =
        ultimoTipoJohnson === 'max'
            ? "Pintando de rojo la Ruta Crítica del proyecto."
            : "Pintando de rojo la ruta con la menor distancia.";
    await sleep(3000);
    cerrarModal();

    for (let a of aristas) {
        if (Math.abs(a.holgura) < 0.01 &&
            a.desde.temprano === a.desde.tardio &&
            a.hasta.temprano === a.hasta.tardio) {
            a.critica = true;
            dibujar();
            await sleep(800);
        }
    }

    abrirModal("¡Proceso Finalizado!", null, "text", false);
    document.getElementById("modal-error").textContent = "El grafo ha sido resuelto completamente.";
}

function generarMatrizHTML(tipo) {
    const container = document.getElementById("matriz-container");

    if (!container) {
        alert("Falta el div 'matriz-container' en tu HTML.");
        return;
    }

    if (nodos.length === 0 || aristas.length === 0) {
        container.innerHTML = "<p style='color: red; text-align: center;'>Dibuja un grafo con conexiones primero.</p>";
        return;
    }

    let nodosOrigen = nodos.filter(n => aristas.some(a => a.desde === n) && !aristas.some(a => a.hasta === n));
    let nodosDestino = nodos.filter(n => aristas.some(a => a.hasta === n) && !aristas.some(a => a.desde === n));

    if (nodosOrigen.length === 0 || nodosDestino.length === 0) {
        nodosOrigen = [];
        nodosDestino = [];
        aristas.forEach(a => {
            if (!nodosOrigen.includes(a.desde)) nodosOrigen.push(a.desde);
            if (!nodosDestino.includes(a.hasta)) nodosDestino.push(a.hasta);
        });
    }

    let matriz = Array.from({ length: nodosOrigen.length }, () => Array(nodosDestino.length).fill(null));

    aristas.forEach(a => {
        const i = nodosOrigen.indexOf(a.desde);
        const j = nodosDestino.indexOf(a.hasta);
        if (i !== -1 && j !== -1) {
            matriz[i][j] = a.peso;
        }
    });

    let mejorSuma = tipo === 'max' ? -Infinity : Infinity;
    let celdasSeleccionadas = [];

    function buscarCombinaciones(fila, columnasUsadas, sumaActual, asignacionActual) {
        if (fila === nodosOrigen.length) {
            if ((tipo === 'max' && sumaActual > mejorSuma) ||
                (tipo === 'min' && sumaActual < mejorSuma)) {
                mejorSuma = sumaActual;
                celdasSeleccionadas = [...asignacionActual];
            }
            return;
        }

        let tieneOpciones = false;

        for (let col = 0; col < nodosDestino.length; col++) {
            if (!columnasUsadas[col] && matriz[fila][col] !== null) {
                tieneOpciones = true;

                columnasUsadas[col] = true;
                asignacionActual.push({ fila: fila, columna: col });

                buscarCombinaciones(fila + 1, columnasUsadas, sumaActual + matriz[fila][col], asignacionActual);

                asignacionActual.pop();
                columnasUsadas[col] = false;
            }
        }

        if (!tieneOpciones) {
            buscarCombinaciones(fila + 1, columnasUsadas, sumaActual, asignacionActual);
        }
    }

    buscarCombinaciones(0, Array(nodosDestino.length).fill(false), 0, []);

    // NUEVO: Resaltar aristas en el lienzo
    aristas.forEach(a => a.enSolucion = false);

    celdasSeleccionadas.forEach(celda => {
        const nOrigen = nodosOrigen[celda.fila];
        const nDestino = nodosDestino[celda.columna];
        const aristaSolucion = aristas.find(a => a.desde === nOrigen && a.hasta === nDestino);
        if (aristaSolucion) {
            aristaSolucion.enSolucion = true;
        }
    });
    dibujar();

    let html = `<h3>Matriz de Adyacencia (Asignación ${tipo === 'max' ? 'Maximizada' : 'Minimizada'} Óptima)</h3>`;
    html += `<p style="text-align:center; color:#d9825b; font-weight:bold;">Suma Óptima Total: ${mejorSuma}</p>`;
    html += '<table class="tabla-matriz" style="margin: 0 auto;">';

    html += '<tr><th>Nodos</th>';
    nodosDestino.forEach(nodo => html += `<th>${nodo.nombre}</th>`);
    html += '</tr>';

    for (let i = 0; i < nodosOrigen.length; i++) {
        html += `<tr><th>${nodosOrigen[i].nombre}</th>`;

        for (let j = 0; j < nodosDestino.length; j++) {
            let valor = matriz[i][j];
            let claseDestacado = '';

            const esSeleccionada = celdasSeleccionadas.some(c => c.fila === i && c.columna === j);

            if (esSeleccionada) {
                claseDestacado = tipo === 'max' ? 'highlight-max' : 'highlight-min';
            }

            let texto = valor !== null ? valor : '-';
            html += `<td class="${claseDestacado}">${texto}</td>`;
        }
        html += '</tr>';
    }

    html += '</table>';

    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

let ultimoTipoAsignacion = 'min';

function resolverMinimo() {
    ultimoTipoAsignacion = 'min';
    generarMatrizHTML('min');
}

function resolverMaximo() {
    ultimoTipoAsignacion = 'max';
    generarMatrizHTML('max');
}

async function explicarPasoAsignacion() {
    const container = document.getElementById("matriz-container");

    if (nodos.length === 0 || aristas.length === 0) {
        alert("Dibuja un grafo con conexiones primero.");
        return;
    }

    let nodosOrigen = nodos.filter(n => aristas.some(a => a.desde === n) && !aristas.some(a => a.hasta === n));
    let nodosDestino = nodos.filter(n => aristas.some(a => a.hasta === n) && !aristas.some(a => a.desde === n));

    if (nodosOrigen.length === 0 || nodosDestino.length === 0) {
        nodosOrigen = []; nodosDestino = [];
        aristas.forEach(a => {
            if (!nodosOrigen.includes(a.desde)) nodosOrigen.push(a.desde);
            if (!nodosDestino.includes(a.hasta)) nodosDestino.push(a.hasta);
        });
    }

    let matriz = Array.from({ length: nodosOrigen.length }, () => Array(nodosDestino.length).fill(null));
    aristas.forEach(a => {
        const i = nodosOrigen.indexOf(a.desde);
        const j = nodosDestino.indexOf(a.hasta);
        if (i !== -1 && j !== -1) matriz[i][j] = a.peso;
    });

    let mejorSuma = ultimoTipoAsignacion === 'max' ? -Infinity : Infinity;
    let celdasSeleccionadas = [];

    function buscarCerosMagicos(fila, columnasUsadas, sumaActual, asignacionActual) {
        if (fila === nodosOrigen.length) {
            if ((ultimoTipoAsignacion === 'max' && sumaActual > mejorSuma) ||
                (ultimoTipoAsignacion === 'min' && sumaActual < mejorSuma)) {
                mejorSuma = sumaActual;
                celdasSeleccionadas = [...asignacionActual];
            }
            return;
        }
        let tieneOpciones = false;
        for (let col = 0; col < nodosDestino.length; col++) {
            if (!columnasUsadas[col] && matriz[fila][col] !== null) {
                tieneOpciones = true;
                columnasUsadas[col] = true;
                asignacionActual.push({ fila: fila, columna: col });
                buscarCerosMagicos(fila + 1, columnasUsadas, sumaActual + matriz[fila][col], asignacionActual);
                asignacionActual.pop();
                columnasUsadas[col] = false;
            }
        }
        if (!tieneOpciones) buscarCerosMagicos(fila + 1, columnasUsadas, sumaActual, asignacionActual);
    }
    buscarCerosMagicos(0, Array(nodosDestino.length).fill(false), 0, []);

    function dibujarPasoTemporal(titulo, mensaje, matrizMostrar, celdasResaltadas, claseResaltado) {
        let html = `<h3>${titulo}</h3>`;
        html += `<p style="font-weight: bold; color: #4a4a4a; background-color: #fce8db; padding: 15px; border-radius: 8px; width: 80%; margin: 10px auto; border: 2px dashed #d9825b;">
                    <strong>Explicación:</strong> ${mensaje}
                </p>`;

        html += '<table class="tabla-matriz" style="margin: 0 auto;"><tr><th>Nodos</th>';
        nodosDestino.forEach(n => html += `<th>${n.nombre}</th>`);
        html += '</tr>';

        for (let i = 0; i < nodosOrigen.length; i++) {
            html += `<tr><th>${nodosOrigen[i].nombre}</th>`;
            for (let j = 0; j < nodosDestino.length; j++) {
                let val = matrizMostrar[i][j];
                let clase = celdasResaltadas.some(c => c.fila === i && c.columna === j) ? claseResaltado : '';
                html += `<td class="${clase}">${val !== null ? val : '-'}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        container.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth' });
    }

    let btnExplicar = document.querySelector("button[onclick='explicarPasoAsignacion()']");
    if (btnExplicar) btnExplicar.disabled = true;

    let matrizReducida = JSON.parse(JSON.stringify(matriz));
    let palabra = ultimoTipoAsignacion === 'max' ? 'máximos' : 'mínimos';

    dibujarPasoTemporal("Paso 1: Matriz Original", "Formamos la matriz con los pesos de las aristas y los nombres de los nodos.", matriz, [], "");
    await sleep(3500);

    let celdasPivoteColumna = [];
    for (let j = 0; j < nodosDestino.length; j++) {
        let valoresCol = [];
        for (let i = 0; i < nodosOrigen.length; i++) {
            if (matrizReducida[i][j] !== null) valoresCol.push(matrizReducida[i][j]);
        }
        if (valoresCol.length === 0) continue;

        let pivoteCol = ultimoTipoAsignacion === 'max' ? Math.max(...valoresCol) : Math.min(...valoresCol);
        let filaPivote = -1;
        for (let i = 0; i < nodosOrigen.length; i++) {
            if (matrizReducida[i][j] === pivoteCol) { filaPivote = i; break; }
        }
        celdasPivoteColumna.push({ fila: filaPivote, columna: j });

        for (let i = 0; i < nodosOrigen.length; i++) {
            if (matrizReducida[i][j] !== null) {
                if (ultimoTipoAsignacion === 'max') {
                    matrizReducida[i][j] = pivoteCol - matrizReducida[i][j];
                } else {
                    matrizReducida[i][j] = matrizReducida[i][j] - pivoteCol;
                }
            }
        }
    }

    dibujarPasoTemporal(
        "Paso 2: Localizar los " + palabra + " por columna",
        `Encontramos los valores ${palabra} de cada columna para poder restarlos y crear los primeros ceros.`,
        matriz, celdasPivoteColumna, "highlight-min"
    );
    await sleep(4000);

    dibujarPasoTemporal(
        "Paso 3: Matriz reducida por Columnas",
        "Aplicamos la resta. Ahora repetiremos el proceso pero de forma horizontal, evaluando las filas.",
        matrizReducida, [], ""
    );
    await sleep(4000);

    let celdasPivoteFila = [];
    for (let i = 0; i < nodosOrigen.length; i++) {
        let valoresFila = matrizReducida[i].filter(v => v !== null);
        if (valoresFila.length === 0) continue;

        let pivote = Math.min(...valoresFila);
        let colPivote = matrizReducida[i].indexOf(pivote);
        if (pivote > 0) celdasPivoteFila.push({ fila: i, columna: colPivote });

        for (let j = 0; j < nodosDestino.length; j++) {
            if (matrizReducida[i][j] !== null) {
                matrizReducida[i][j] = matrizReducida[i][j] - pivote;
            }
        }
    }

    dibujarPasoTemporal(
        "Paso 4: Reducción por Filas",
        "Buscamos el número menor de cada fila y se lo restamos a toda esa fila para obtener las posibles soluciones.",
        matrizReducida, celdasPivoteFila, "highlight-min"
    );
    await sleep(4500);

    let claseCSS = ultimoTipoAsignacion === 'max' ? 'highlight-max' : 'highlight-min';
    dibujarPasoTemporal(
        "Paso 5: Asignación de Ceros",
        "Seleccionamos los ceros que no coincidan en la misma fila ni columna. Estas coordenadas indican la respuesta óptima.",
        matrizReducida, celdasSeleccionadas, claseCSS
    );
    await sleep(5500);

    // NUEVO: PINTAR ARISTAS
    aristas.forEach(a => a.enSolucion = false);
    celdasSeleccionadas.forEach(celda => {
        const nOrigen = nodosOrigen[celda.fila];
        const nDestino = nodosDestino[celda.columna];
        const aristaSolucion = aristas.find(a => a.desde === nOrigen && a.hasta === nDestino);
        if (aristaSolucion) {
            aristaSolucion.enSolucion = true;
        }
    });
    dibujar();

    abrirModal("¡Asignación Finalizada!", null, "text", false);
    document.getElementById("modal-error").textContent = "Las aristas óptimas se han resaltado en el lienzo.";
    await sleep(3500);
    cerrarModal();

    if (btnExplicar) btnExplicar.disabled = false;
    generarMatrizHTML(ultimoTipoAsignacion);
}


function abrirHelpA() {
    document.getElementById("help-modal").classList.add("active");
}

function cerrarHelA() {
    document.getElementById("help-modal").classList.remove("active");
}

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